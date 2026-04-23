/**
 * Improved Sheet Music Generator — Direct LLM ABC Generation
 *
 * Instead of asking the LLM for JSON structure then building melody programmatically,
 * we ask the LLM to generate complete ABC notation directly. The LLM has deep
 * knowledge of music theory and can produce far more musical results than any
 * algorithmic approach.
 *
 * Fallback: if the LLM output fails validation, we use the comprehensive
 * fallback generator which now uses proper melodic patterns.
 */

import { invokeLLM } from "./_core/llm";
import { extractLLMText } from "./llmHelpers";
import { sanitiseAbc, validateAbc } from "./backgroundSheetMusic";

// ─── Enhanced System Prompt ─────────────────────────────────────────────────

const ENHANCED_SHEET_MUSIC_PROMPT = `You are a professional Christian music arranger and sheet music engraver with 20+ years of experience writing worship songs, hymns, and contemporary Christian music.

Generate valid ABC notation for a lead sheet. The output must be MUSICALLY EXCELLENT — not a scale exercise.

═══ REQUIRED ABC HEADERS (each on its own line, in this order) ═══
X: 1
T: <song title>
M: <time signature>
L: 1/8
Q: 1/4=<tempo>
K: <key>

═══ CRITICAL ANTI-REPETITION RULES ═══
Your #1 priority is to write a REAL melody, not a scale or arpeggio exercise.

FORBIDDEN patterns (these sound mechanical and robotic):
- Sequential scale runs: C D E F G A B c (ascending scales)
- Cycling through notes in order: A2 c2 D2 F2 | B2 C2 E2 G2 (skipping by thirds up the scale)
- Repeating the same rhythmic pattern in every measure
- Using only one note duration throughout (e.g., all quarter notes)
- Melody that just follows chord roots: "C"C2 "Am"A2 "F"F2 "G"G2

REQUIRED musical qualities:
- Melodic contour: phrases should rise and fall like speech, with a climax point
- Stepwise motion mixed with occasional leaps (3rds, 4ths, 5ths)
- Rhythmic variety: mix eighth notes, quarter notes, dotted quarters, half notes
- Rests for breathing: include z (eighth rest) and z2 (quarter rest) between phrases
- Repetition with variation: repeat melodic motifs but change them slightly each time
- The chorus melody should be distinctly different from the verse (higher energy, higher range)
- The bridge should introduce new melodic material

═══ SONG STRUCTURE ═══
Generate at least 32 measures with clear sections:
% Intro (2-4 measures — instrumental, sparse)
% Verse 1 (8 measures — moderate range, storytelling feel)
% Chorus (8 measures — higher energy, memorable hook)
% Verse 2 (8 measures — same melody as Verse 1 with slight variation)
% Chorus (repeat)
% Bridge (4-8 measures — contrasting melody and harmony)
% Chorus (final, can add variation)
% Outro (2-4 measures — resolve to tonic)

═══ CHORD SYMBOLS ═══
- Place chords in double quotes before the note: "C"E2 "Am"c2
- Change chords every 1-2 measures minimum
- Use genre-appropriate progressions (I-V-vi-IV, I-IV-V, ii-V-I, etc.)
- Include some secondary dominants or borrowed chords for color

═══ LYRICS (w: lines) ═══
- Every music line with vocals MUST be followed by a w: line
- Use hyphens for syllable splits: w: A-ma-zing grace how sweet
- Use asterisks to skip instrumental notes: w: * * Hold on
- Align w: bar pipes | with music bar lines

═══ NOTATION RULES ═══
- Use proper bar lines | at every measure boundary
- Use repeat signs |: and :| for repeated sections
- Section labels as comments: % Verse 1, % Chorus, etc.
- NO dynamics (!p!, !mf!, !f!), NO decorations (!fermata!, !accent!)
- NO V: voice directives, NO %%staves
- K: must be the LAST header line before music begins
- NO blank line between K: and the first music line

═══ EXAMPLE OF GOOD MELODY (key of G, worship style) ═══
% Verse
"G"B2 d2 "D/F#"d2 B2 | "Em"G4 "C"E2 G2 | "G"B,2 D2 G2 B2 | "D"A4 z2 A2 |
w: Lord I come be-fore You now | hum-bly at Your | throne of end-less grace | and I
"Em"G2 B2 "C"c2 A2 | "G"B4 "D"A2 F2 | "C"E4 G2 E2 | "D"D4 z4 |
w: lift my hands in wor-ship to | Your ho-ly name | for-ev-er-more |
% Chorus
"G"d4 "B7"^d2 e2 | "Em"e4 "C"c2 B2 | "G"B2 d2 "D"A2 B2 | "C"G4 z2 G2 |
w: You are wor-thy of all | praise and glo-ry | Je-sus name a-bove all | names You

Notice how the melody:
- Uses steps AND leaps (B→d is a 3rd, d→G is a 5th)
- Has rhythmic variety (quarter notes, half notes, rests)
- Includes breathing space (z2, z4)
- The chorus is higher in range than the verse
- Chord symbols align with strong beats

═══ OUTPUT ═══
Output ONLY valid ABC notation. No markdown fences, no explanations, no JSON.`;

/**
 * Main function: Generate complete sheet music using enhanced LLM prompt
 */
export async function generateSheetMusicImproved(
  title: string,
  genre: string,
  key: string,
  timeSignature: string,
  tempo: number,
  lyrics: string
): Promise<string> {
  const MAX_ATTEMPTS = 2;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      console.log(`[ImprovedGenerator] Attempt ${attempt}/${MAX_ATTEMPTS} for "${title}"`);

      // Build the user prompt with song context
      const userPrompt = buildUserPrompt(title, genre, key, timeSignature, tempo, lyrics);

      const response = await invokeLLM({
        messages: [
          { role: "system", content: ENHANCED_SHEET_MUSIC_PROMPT },
          { role: "user", content: userPrompt },
        ],
      });

      const rawAbc = extractLLMText(response.choices?.[0]?.message?.content);
      if (!rawAbc) {
        throw new Error("LLM returned empty content");
      }

      // Sanitise and validate
      const cleanAbc = sanitiseAbc(rawAbc);
      const validationError = validateAbc(cleanAbc);
      if (validationError) {
        console.warn(`[ImprovedGenerator] Validation failed (attempt ${attempt}): ${validationError}`);
        console.warn(`[ImprovedGenerator] Raw ABC (first 500 chars): ${rawAbc.substring(0, 500)}`);

        // Check for repetition — if the LLM produced a repetitive melody, retry
        if (isRepetitive(cleanAbc)) {
          console.warn(`[ImprovedGenerator] Detected repetitive melody, retrying...`);
          throw new Error("Repetitive melody detected");
        }

        throw new Error("Validation failed: " + validationError);
      }

      // Check for repetition even if validation passed
      if (isRepetitive(cleanAbc)) {
        console.warn(`[ImprovedGenerator] Detected repetitive melody despite valid ABC, retrying...`);
        if (attempt < MAX_ATTEMPTS) {
          throw new Error("Repetitive melody detected");
        }
        // On last attempt, accept it but log the warning
        console.warn(`[ImprovedGenerator] Accepting repetitive melody on final attempt`);
      }

      console.log(`[ImprovedGenerator] Successfully generated ${cleanAbc.length} chars of ABC`);
      return cleanAbc;
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[ImprovedGenerator] Attempt ${attempt} failed: ${lastError.message}`);
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }

  throw lastError || new Error("Sheet music generation failed");
}

/**
 * Build the user prompt with all available song context
 */
function buildUserPrompt(
  title: string,
  genre: string,
  key: string,
  timeSignature: string,
  tempo: number,
  lyrics: string
): string {
  const parts: string[] = [];

  parts.push(`Generate a professional lead sheet in ABC notation for this song:`);
  parts.push(``);
  parts.push(`Title: ${title}`);
  parts.push(`Genre: ${genre || "Christian Contemporary"}`);
  parts.push(`Key: ${key || "C"}`);
  parts.push(`Time Signature: ${timeSignature || "4/4"}`);
  parts.push(`Tempo: ${tempo || 120} BPM`);

  if (lyrics && lyrics.trim().length > 10) {
    parts.push(``);
    parts.push(`Lyrics:`);
    parts.push(lyrics.trim());
    parts.push(``);
    parts.push(`IMPORTANT: Align the melody to these lyrics using w: lines after each music line.`);
    parts.push(`The melody should match the emotional arc of the lyrics — build intensity toward the chorus.`);
  } else {
    parts.push(``);
    parts.push(`This is an instrumental piece. Write a memorable, singable melody with clear sections.`);
    parts.push(`Include chord symbols throughout. Make the melody interesting with varied rhythm and contour.`);
  }

  // Genre-specific guidance
  const genreLower = (genre || "").toLowerCase();
  if (genreLower.includes("worship") || genreLower.includes("christian") || genreLower.includes("gospel")) {
    parts.push(``);
    parts.push(`Style guidance: This is a worship/Christian song. Use warm, uplifting chord progressions.`);
    parts.push(`Common worship progressions: I-V-vi-IV, I-IV-vi-V, vi-IV-I-V.`);
    parts.push(`The melody should be singable by a congregation — keep the range within an octave.`);
    parts.push(`Build from intimate verses to powerful, anthemic choruses.`);
  } else if (genreLower.includes("hymn")) {
    parts.push(``);
    parts.push(`Style guidance: Traditional hymn style. Use four-part harmony feel.`);
    parts.push(`Strong, steady rhythm. Classic progressions: I-IV-V-I, I-vi-IV-V.`);
    parts.push(`Melody should be dignified and singable, with clear phrase structure.`);
  } else if (genreLower.includes("pop") || genreLower.includes("modern")) {
    parts.push(``);
    parts.push(`Style guidance: Modern pop/CCM style. Catchy, hook-driven melody.`);
    parts.push(`Use syncopation and rhythmic interest. Build to a memorable chorus hook.`);
    parts.push(`Common pop progressions: I-V-vi-IV, vi-IV-I-V, I-IV-I-V.`);
  }

  parts.push(``);
  parts.push(`Remember: Write a REAL melody with musical phrasing, NOT a scale exercise.`);
  parts.push(`The melody must have contour (rise and fall), rhythmic variety, and breathing space.`);

  return parts.join("\n");
}

/**
 * Detect if ABC notation contains overly repetitive patterns.
 * Returns true if the melody appears mechanical/repetitive.
 */
function isRepetitive(abc: string): boolean {
  const lines = abc.split("\n");
  const musicLines = lines.filter((l) => {
    const t = l.trim();
    if (!t || t.startsWith("%") || /^[A-Z]:/.test(t) || t.startsWith("w:") || t.startsWith("W:")) return false;
    return /[A-Ga-g]/.test(t);
  });

  if (musicLines.length < 4) return false;

  // Check 1: Are more than 60% of music lines identical?
  const lineFreq: Record<string, number> = {};
  for (const line of musicLines) {
    // Normalize: remove chord symbols and extra spaces for comparison
    const normalized = line.replace(/"[^"]*"/g, "").replace(/\s+/g, " ").trim();
    lineFreq[normalized] = (lineFreq[normalized] || 0) + 1;
  }
  const maxFreq = Math.max(...Object.values(lineFreq));
  if (maxFreq / musicLines.length > 0.6) {
    console.warn(`[RepetitionCheck] ${maxFreq}/${musicLines.length} lines are identical`);
    return true;
  }

  // Check 2: Extract all note names and check for sequential scale patterns
  const allNotes = abc.replace(/"[^"]*"/g, "") // remove chord symbols
    .replace(/w:.*$/gm, "") // remove lyrics
    .replace(/%.*$/gm, "") // remove comments
    .replace(/[^A-Ga-gz,'^_=\s|]/g, "") // keep only notes
    .match(/[A-Ga-g][,']*/g) || [];

  if (allNotes.length < 16) return false;

  // Check for ascending/descending scale runs of 6+ notes
  const noteValues: Record<string, number> = {
    "C": 0, "D": 1, "E": 2, "F": 3, "G": 4, "A": 5, "B": 6,
    "c": 7, "d": 8, "e": 9, "f": 10, "g": 11, "a": 12, "b": 13,
  };

  let consecutiveSteps = 0;
  let maxConsecutiveSteps = 0;
  for (let i = 1; i < allNotes.length; i++) {
    const prev = noteValues[allNotes[i - 1]] ?? -1;
    const curr = noteValues[allNotes[i]] ?? -1;
    if (prev >= 0 && curr >= 0 && Math.abs(curr - prev) === 1) {
      consecutiveSteps++;
      maxConsecutiveSteps = Math.max(maxConsecutiveSteps, consecutiveSteps);
    } else {
      consecutiveSteps = 0;
    }
  }

  if (maxConsecutiveSteps >= 7) {
    console.warn(`[RepetitionCheck] Found ${maxConsecutiveSteps} consecutive scale steps`);
    return true;
  }

  // Check 3: Are notes cycling through the same small pattern?
  // Take groups of 8 notes and check if they repeat
  const noteGroups: string[] = [];
  for (let i = 0; i + 7 < allNotes.length; i += 8) {
    noteGroups.push(allNotes.slice(i, i + 8).join(""));
  }
  if (noteGroups.length >= 4) {
    const groupFreq: Record<string, number> = {};
    for (const g of noteGroups) {
      groupFreq[g] = (groupFreq[g] || 0) + 1;
    }
    const maxGroupFreq = Math.max(...Object.values(groupFreq));
    if (maxGroupFreq / noteGroups.length > 0.5) {
      console.warn(`[RepetitionCheck] ${maxGroupFreq}/${noteGroups.length} 8-note groups are identical`);
      return true;
    }
  }

  return false;
}
