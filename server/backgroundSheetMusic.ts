/**
 * Background sheet music generation.
 *
 * Call generateSheetMusicInBackground(songId) fire-and-forget after a song is
 * created. The function fetches the song, calls the LLM to produce ABC
 * notation, sanitises the output, and persists the result. Errors are logged
 * but never propagated so they cannot break the main request flow.
 */

import { invokeLLM } from "./_core/llm";
import { getSongById, updateSongSheetMusic, updateSongSheetMusicStatus } from "./db";
import { extractLLMText } from "./llmHelpers";

// ─── Key Signature Accidentals Map ───────────────────────────────────────────
// Maps key names to the set of notes that are sharped or flatted by default.
// Used by validation and could be exported for the player.
export const KEY_ACCIDENTALS: Record<string, Record<string, number>> = {
  // Major keys
  "C": {},
  "G": { F: 1 },
  "D": { F: 1, C: 1 },
  "A": { F: 1, C: 1, G: 1 },
  "E": { F: 1, C: 1, G: 1, D: 1 },
  "B": { F: 1, C: 1, G: 1, D: 1, A: 1 },
  "F#": { F: 1, C: 1, G: 1, D: 1, A: 1, E: 1 },
  "C#": { F: 1, C: 1, G: 1, D: 1, A: 1, E: 1, B: 1 },
  "F": { B: -1 },
  "Bb": { B: -1, E: -1 },
  "Eb": { B: -1, E: -1, A: -1 },
  "Ab": { B: -1, E: -1, A: -1, D: -1 },
  "Db": { B: -1, E: -1, A: -1, D: -1, G: -1 },
  "Gb": { B: -1, E: -1, A: -1, D: -1, G: -1, C: -1 },
  "Cb": { B: -1, E: -1, A: -1, D: -1, G: -1, C: -1, F: -1 },
  // Minor keys (same accidentals as their relative major)
  "Am": {},
  "Em": { F: 1 },
  "Bm": { F: 1, C: 1 },
  "F#m": { F: 1, C: 1, G: 1 },
  "C#m": { F: 1, C: 1, G: 1, D: 1 },
  "G#m": { F: 1, C: 1, G: 1, D: 1, A: 1 },
  "D#m": { F: 1, C: 1, G: 1, D: 1, A: 1, E: 1 },
  "A#m": { F: 1, C: 1, G: 1, D: 1, A: 1, E: 1, B: 1 },
  "Dm": { B: -1 },
  "Gm": { B: -1, E: -1 },
  "Cm": { B: -1, E: -1, A: -1 },
  "Fm": { B: -1, E: -1, A: -1, D: -1 },
  "Bbm": { B: -1, E: -1, A: -1, D: -1, G: -1 },
  "Ebm": { B: -1, E: -1, A: -1, D: -1, G: -1, C: -1 },
  "Abm": { B: -1, E: -1, A: -1, D: -1, G: -1, C: -1, F: -1 },
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SHEET_MUSIC_SYSTEM_PROMPT = [
  "You are a professional music arranger and sheet music engraver.",
  "Generate valid ABC notation for a lead sheet based on the song information provided.",
  "",
  "REQUIRED HEADERS (must all be present, each on its own line):",
  "- X: 1",
  "- T: title of the song",
  "- C: composer/artist if known, otherwise omit",
  "- M: time signature (e.g., 4/4, 3/4, 6/8)",
  "- L: default note length (e.g., 1/8)",
  "- Q: tempo marking (e.g., 1/4=120)",
  "- K: key signature (e.g., C, Am, F#m) — must be the LAST header line",
  "",
  "STRICT FORMAT RULES:",
  "- Output ONLY valid ABC notation text, nothing else",
  "- Do NOT wrap the output in markdown code fences or backticks",
  "- Do NOT include any JSON, XML, or other structured data formats",
  "- Do NOT include any explanatory text before or after the notation",
  "- Do NOT use V: (voice) directives — write a single-voice lead sheet only",
  "- Do NOT use %%staves or multi-staff directives",
  "- The K: header MUST be the last header line before the music body begins",
  "",
  "CHORD SYMBOL RULES:",
  '- Place chord symbols in double quotes directly before the note they align with',
  '- Example: "Am"A2 "G"B2 "F"c2 "E"B2 — the chord name is in quotes, the note follows immediately',
  '- Do NOT repeat the chord root as the melody note — write the actual melody',
  '- Example of CORRECT usage: "C"E2 "Am"c2 "F"A2 "G"B2',
  '- Example of WRONG usage: "C"C2 "Am"A2 "F"F2 "G"G2 (melody just follows chord roots)',
  "",
  "LYRICS ALIGNMENT RULES:",
  "- Use w: lines to align lyrics under the melody notes",
  "- Each w: line corresponds to the music line directly above it",
  "- Use hyphens (-) to split syllables across multiple notes: w: A-ma-zing grace",
  "- Use asterisks (*) to skip notes that have no syllable: w: * * Hold on",
  "- Use pipes (|) in w: lines to align with bar lines in the music",
  "- Every music line that has lyrics MUST be followed by a w: line",
  "",
  "NOTATION RULES:",
  "- Write a singable melody line that matches the lyrics and genre",
  "- If a specific key is provided, you MUST use that exact key",
  "- If no key is specified, choose an appropriate key for the genre and vocal range",
  "- For songs without lyrics, write an instrumental melody",
  "- Use proper bar lines | at every measure boundary",
  "- Use repeat signs |: and :| for repeated sections",
  "- Use section comments: % Intro, % Verse 1, % Chorus, % Bridge, % Outro",
  "- Do NOT use [P:] section markers",
  "- Do NOT include ANY dynamics: no !p!, !mp!, !mf!, !f!, !ff!, !pp!, !ppp!, !fff!",
  "- Do NOT include ANY decorations: no !accent!, !fermata!, !tenuto!, !staccato!, !trill!, etc.",
  "- Do NOT include ANY crescendo/diminuendo marks",
  "- Include rests where musically appropriate: z (eighth rest), z2 (quarter rest), z4 (half rest), z8 (whole rest)",
  "- Ensure every measure has the correct number of beats matching the time signature",
  "",
  "MINIMUM LENGTH:",
  "- Generate at least 16 measures of music",
  "- If the lyrics are short, repeat them with melodic variation across sections",
  "- Include an intro (2-4 measures), verse sections, a chorus, and an ending",
  "- For instrumental songs, generate at least 32 measures with clear sections",
  "",
  "QUALITY:",
  "- The melody must be musically coherent, singable, and match the mood/genre",
  "- Vary the melody between verse and chorus — the chorus should feel like a lift",
  "- Keep the vocal range within an octave and a half (roughly C4 to A5 for most voices)",
  "- Use only basic ABC notation: notes, rests, bar lines, repeat signs, chord symbols, and lyrics",
  "- The output must be parseable by the abcjs JavaScript library without errors",
].join("\n");

/**
 * Build the song context string used as the LLM user prompt.
 */
export function buildSongContext(song: {
  title: string;
  genre?: string | null;
  mood?: string | null;
  keySignature?: string | null;
  timeSignature?: string | null;
  tempo?: number | null;
  lyrics?: string | null;
}): string {
  const parts: string[] = [];
  parts.push("Title: " + song.title);
  if (song.genre) parts.push("Genre: " + song.genre);
  if (song.mood) parts.push("Mood: " + song.mood);
  if (song.keySignature) parts.push("Key: " + song.keySignature);
  if (song.timeSignature) parts.push("Time Signature: " + song.timeSignature);
  if (song.tempo) parts.push("Tempo: " + song.tempo + " BPM");
  if (song.lyrics) parts.push("Lyrics:\n" + song.lyrics);
  return parts.join("\n");
}

/**
 * Sanitise raw ABC notation returned by the LLM.
 *
 * This is the SINGLE source of truth for ABC sanitisation.
 * Do NOT add additional sanitisation in db.ts or the frontend.
 *
 * Steps:
 * 1. Strip markdown code fences
 * 2. Extract ABC block from surrounding prose
 * 3. Remove unsupported directives (V:, %%staves)
 * 4. Strip dynamics and decoration marks
 * 5. Convert [P:] markers to comments
 * 6. Remove trailing prose/explanatory text
 * 7. Inject missing essential headers
 */
export function sanitiseAbc(raw: string): string {
  // 1. Strip markdown code fences
  let abc = raw.replace(/^```[a-z]*\n?/gm, "").replace(/```\s*$/gm, "").trim();
  
  // Handle empty input early
  if (!abc) return "";

  // 2. Try to extract just the ABC block if there is surrounding text
  const xMatch = abc.match(/^(X:\s*\d+)/m);
  if (xMatch && xMatch.index !== undefined && xMatch.index > 0) {
    abc = abc.substring(xMatch.index);
  }

  // 3. Filter and transform lines
  const filtered = abc.split("\n").filter((line) => {
    const trimmed = line.trim();
    // Remove V: voice directives
    if (trimmed.startsWith("V:")) return false;
    // Remove %%staves directives
    if (trimmed.startsWith("%%staves")) return false;
    // Remove standalone dynamics on their own line (e.g. !p!, !mf!, !ff!)
    if (/^![a-z]+!$/.test(trimmed)) return false;
    // Remove standalone crescendo/diminuendo markers
    if (/^!(crescendo|diminuendo|<|>)[(!)]+$/.test(trimmed)) return false;
    return true;
  }).map((line) => {
    const trimmed = line.trim();
    // Convert [P:...] section markers to comment lines for abcjs compatibility
    if (/^\[P:.*\]$/.test(trimmed)) {
      return "% " + trimmed;
    }
    // Strip inline dynamics decorations that abcjs doesn't handle well
    // e.g. !p! !mp! !mf! !f! !ff! !pp! !ppp! !fff!
    let cleaned = line.replace(/![pmf]{1,4}!/g, "");
    // Strip crescendo/diminuendo decorations
    // e.g. !crescendo(! !crescendo)! !diminuendo(! !diminuendo)! !<(! !<)! !>(! !>)!
    cleaned = cleaned.replace(/!(crescendo|diminuendo|<|>)[(!)]+/g, "");
    // Strip other common unsupported decorations
    cleaned = cleaned.replace(/!(accent|fermata|tenuto|staccato|trill|turn|mordent|pralltriller|emphasis|segno|coda|D\.S\.|D\.C\.|fine)!/g, "");
    return cleaned;
  });

  // 4. Remove trailing non-ABC content (prose/explanatory text after the music)
  let lastMusicLine = filtered.length - 1;
  for (let i = filtered.length - 1; i >= 0; i--) {
    const t = filtered[i].trim();
    if (!t || t.startsWith("%")) continue;
    // Check if this line looks like ABC content
    const isHeader = /^[A-Z]:/.test(t);
    const isLyrics = t.startsWith("w:") || t.startsWith("W:");
    const hasBarLines = t.includes("|");
    const wordCount = t.split(/\s+/).length;
    // Prose detection: 4+ words without bar lines, OR short text that looks like
    // natural language (starts with uppercase, has lowercase letters, ends with punctuation)
    const looksLikeProse = (!hasBarLines && !/^[A-Z]:/.test(t)) && (
      wordCount >= 4 ||
      /[.!?;]$/.test(t) ||
      (wordCount <= 2 && /^[A-Z][a-z]{2,}/.test(t))
    );
    const isMusic = !looksLikeProse && /[A-Ga-gz|:\[\]^_=,']/.test(t);
    if (isHeader || isMusic || isLyrics) {
      lastMusicLine = i;
      break;
    }
  }

  abc = filtered.slice(0, lastMusicLine + 1).join("\n").trim();

  // 5. CRITICAL: Separate header block from music body and enforce K: as last header
  const lines = abc.split("\n");
  const headerLines: string[] = [];
  const musicLines: string[] = [];
  let foundFirstMusic = false;
  let kLineContent = "";

  for (const line of lines) {
    const trimmed = line.trim();
    const isHeader = /^[A-Z]:/.test(trimmed);
    const isComment = trimmed.startsWith("%");
    const isLyrics = trimmed.startsWith("w:") || trimmed.startsWith("W:");

    if (!foundFirstMusic && (isHeader || isComment)) {
      // Capture K: content but don't add to headers yet
      if (isHeader && trimmed.startsWith("K:")) {
        kLineContent = line;
      } else {
        headerLines.push(line);
      }
    } else {
      // Once we hit music, lyrics, or comments after headers, everything is part of the music body
      foundFirstMusic = true;
      musicLines.push(line);
    }
  }

  // Debug logging for line-skipping issues
  if (musicLines.length > 0) {
    const lyricLineCount = musicLines.filter((l) => l.trim().startsWith("w:") || l.trim().startsWith("W:")).length;
    console.log(`[Sanitizer] Music block: ${musicLines.length} lines (${lyricLineCount} lyric lines)`);
  }

  // 6. Only inject missing headers if we have music content
  // If there's no music, return the headers as-is
  if (musicLines.length === 0) {
    // No music content — return headers only
    if (kLineContent) headerLines.push(kLineContent);
    return headerLines.join("\n").trim();
  }

  // Inject missing essential headers (M, L, Q) BEFORE K:
  const hasM = headerLines.some((l) => l.trim().startsWith("M:"));
  const hasL = headerLines.some((l) => l.trim().startsWith("L:"));
  const hasQ = headerLines.some((l) => l.trim().startsWith("Q:"));

  if (!hasM) headerLines.push("M:4/4");
  if (!hasL) headerLines.push("L:1/8");
  if (!hasQ) headerLines.push("Q:1/4=120");

  // Ensure K: is the last header line
  if (kLineContent) {
    headerLines.push(kLineContent);
  } else {
    headerLines.push("K:C"); // Default key if missing
  }

  // Reconstruct ABC with headers followed by music
  abc = [...headerLines, ...musicLines].join("\n").trim();

  return abc;
}

/**
 * Validate that the ABC notation has the minimum required structure.
 * Returns null if valid, or an error message string if invalid.
 */
export function validateAbc(abc: string): string | null {
  if (!abc || abc.trim().length === 0) {
    return "Empty ABC notation";
  }

  const lines = abc.split("\n");
  const headerLines = lines.filter((l) => /^[A-Z]:/.test(l.trim()));

  // Must have at least X:, T:, and K: headers
  const hasX = headerLines.some((l) => l.trim().startsWith("X:"));
  const hasT = headerLines.some((l) => l.trim().startsWith("T:"));
  const hasK = headerLines.some((l) => l.trim().startsWith("K:"));

  if (!hasX) return "Missing X: (reference number) header";
  if (!hasT) return "Missing T: (title) header";
  if (!hasK) return "Missing K: (key) header";

  // CRITICAL: Verify K: is the last header line (no headers after it)
  const kIndex = lines.findIndex((l) => l.trim().startsWith("K:"));
  if (kIndex !== -1) {
    for (let i = kIndex + 1; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      // Allow lyrics (w:, W:) after K:, but no other headers
      if (/^[A-Z]:/.test(trimmed) && !trimmed.startsWith("w:") && !trimmed.startsWith("W:")) {
        return `Invalid header after K: (line ${i + 1}: ${trimmed}). K: must be the last header.`;
      }
    }
  }

  // Validate K: header has a recognizable key value
  const kLine = headerLines.find((l) => l.trim().startsWith("K:"));
  if (kLine) {
    const keyValue = kLine.trim().substring(2).trim();
    if (!/^[A-G][#b]?\s*(m|min|minor|maj|major|mix|dor|phr|lyd|loc)?/i.test(keyValue)) {
      return `Invalid key signature: "${keyValue}"`;
    }
  }

  // Must have at least some music content (notes or rests) after the headers
  const musicLines = lines.filter((l) => {
    const t = l.trim();
    if (!t || t.startsWith("%")) return false;
    if (/^[A-Z]:/.test(t)) return false;
    if (t.startsWith("w:") || t.startsWith("W:")) return false;
    // Must contain at least one note letter or rest
    return /[A-Ga-gz]/.test(t);
  });

  if (musicLines.length === 0) {
    return "No music content found after headers";
  }

  // Check that music lines contain bar lines (structural check)
  const linesWithBars = musicLines.filter((l) => l.includes("|"));
  if (linesWithBars.length === 0) {
    return "No bar lines found in music content — notation may be malformed";
  }

  // Check minimum length: at least 16 measures by counting bar lines
  const allMusicText = musicLines.join(" ");
  const barLineCount = (allMusicText.match(/\|/g) || []).length;
  if (barLineCount < 16) {
    return `Sheet music is too short — found only ${barLineCount} measures, need at least 16 measures`;
  }

  // Verify music lines have reasonable content (not just bar lines)
  const validMusicLines = musicLines.filter((l) => {
    const withoutBars = l.replace(/[|:]/g, "").trim();
    return withoutBars.length > 2; // At least some notes/rests beyond just bar lines
  });
  if (validMusicLines.length < 2) {
    return "Sheet music content appears to be mostly bar lines with no actual notes";
  }

  return null;
}

/**
 * Generate ABC notation for a song using the LLM.
 * Includes retry logic for transient failures.
 */
export async function generateAbcNotation(
  song: Parameters<typeof buildSongContext>[0]
): Promise<string> {
  const songContext = buildSongContext(song);
  const MAX_ATTEMPTS = 2;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: SHEET_MUSIC_SYSTEM_PROMPT },
          {
            role: "user",
            content:
              "Generate a professional lead sheet in ABC notation for this song:\n\n" +
              songContext,
          },
        ],
      });

      const rawContent = response.choices?.[0]?.message?.content;
      const rawAbc = extractLLMText(rawContent);
      if (!rawAbc) {
        throw new Error("LLM returned empty content for sheet music generation");
      }

      // Sanitise and validate
      const cleanAbc = sanitiseAbc(rawAbc);
      const validationError = validateAbc(cleanAbc);
      if (validationError) {
        console.error(
          `[SheetMusic] Validation failed (attempt ${attempt}/${MAX_ATTEMPTS}): ${validationError}\nRaw output (first 500 chars):\n${rawAbc.substring(0, 500)}`
        );
        throw new Error("Sheet music validation failed: " + validationError);
      }

      return cleanAbc;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(
        `[SheetMusic] Attempt ${attempt}/${MAX_ATTEMPTS} failed: ${lastError.message}`
      );
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  throw lastError || new Error("Sheet music generation failed after all retries");
}

/**
 * Fire-and-forget background sheet music generation for a newly created song.
 * Sets status to "generating" IMMEDIATELY (before the delay) so the frontend
 * knows generation is in progress and can show the correct UI state.
 *
 * Auto-retry logic:
 * - The background job retries up to 3 times with increasing delays (3s, 6s, 12s)
 * - Each attempt calls generateAbcNotation which itself retries the LLM call once
 * - Only marks as "failed" after all retries are exhausted
 * - Logs each attempt clearly for debugging
 */
export function generateSheetMusicInBackground(songId: number): void {
  // Set status to "generating" immediately so the frontend sees it right away
  updateSongSheetMusicStatus(songId, "generating").catch(() => {});

  // Small delay to ensure the song record is fully committed
  setTimeout(async () => {
    const MAX_BG_ATTEMPTS = 3;
    const RETRY_DELAYS = [3000, 6000, 12000]; // Increasing backoff: 3s, 6s, 12s

    for (let attempt = 1; attempt <= MAX_BG_ATTEMPTS; attempt++) {
      try {
        const song = await getSongById(songId);
        if (!song) {
          console.log(
            `[BackgroundSheetMusic] Song ${songId} not found, skipping`
          );
          await updateSongSheetMusicStatus(songId, "failed", "Song not found").catch(() => {});
          return;
        }

        // Skip if sheet music already exists
        if (song.sheetMusicAbc) {
          console.log(
            `[BackgroundSheetMusic] Song ${songId} already has sheet music, skipping`
          );
          // Ensure status is "done" if ABC exists
          if (song.sheetMusicStatus !== "done") {
            await updateSongSheetMusicStatus(songId, "done").catch(() => {});
          }
          return;
        }

        console.log(
          `[BackgroundSheetMusic] Attempt ${attempt}/${MAX_BG_ATTEMPTS} — generating sheet music for song ${songId} "${song.title}"`
        );

        const abc = await generateAbcNotation(song);
        await updateSongSheetMusic(songId, abc);
        // updateSongSheetMusic already sets status to "done"

        console.log(
          `[BackgroundSheetMusic] Successfully generated sheet music for song ${songId} on attempt ${attempt}`
        );
        return; // Success — exit the retry loop
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(
          `[BackgroundSheetMusic] Attempt ${attempt}/${MAX_BG_ATTEMPTS} failed for song ${songId}: ${msg}`
        );

        // On the last attempt, persist the error message to the database
        if (attempt === MAX_BG_ATTEMPTS) {
          const errorMsg = msg.length > 500 ? msg.substring(0, 500) + "..." : msg;
          await updateSongSheetMusicStatus(
            songId,
            "failed",
            errorMsg
          ).catch(() => {});
        }

        if (attempt < MAX_BG_ATTEMPTS) {
          const delay = RETRY_DELAYS[attempt - 1] || 5000;
          console.log(
            `[BackgroundSheetMusic] Retrying song ${songId} in ${delay / 1000}s...`
          );
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    // All attempts exhausted — final error logging
    console.error(
      `[BackgroundSheetMusic] All ${MAX_BG_ATTEMPTS} attempts exhausted for song ${songId}. Marked as failed.`
    );
  }, 3000);
}
