/**
 * Multi-part ABC notation generator.
 * Generates separate ABC notations for different instrument parts (Vocals, Bass, Piano).
 * Each part is generated via LLM with instrument-specific prompts and sanitised for abcjs rendering.
 */

import { invokeLLM } from "./_core/llm";
import { extractLLMText } from "./llmHelpers";
import { sanitiseAbc, validateAbc } from "./backgroundSheetMusic";

export interface InstrumentPart {
  name: string;
  label: string;
  clef: string;
  range: string;
  description: string;
}

export const INSTRUMENT_PARTS: Record<string, InstrumentPart> = {
  vocals: {
    name: "vocals",
    label: "Vocals",
    clef: "treble",
    range: "C4-C6",
    description: "Lead vocal melody line with lyrics",
  },
  bass: {
    name: "bass",
    label: "Bass",
    clef: "bass",
    range: "E2-E4",
    description: "Bass line following the chord progression",
  },
  piano: {
    name: "piano",
    label: "Piano",
    clef: "treble",
    range: "C3-C6",
    description: "Piano/chord accompaniment with chord voicings",
  },
};

export const PART_NAMES = Object.keys(INSTRUMENT_PARTS) as (keyof typeof INSTRUMENT_PARTS)[];

/**
 * Extract chord progression and key from the lead sheet ABC.
 */
function extractInfoFromLeadSheet(abc: string): { key: string; tempo: number; chords: string[]; timeSignature: string } {
  const keyMatch = abc.match(/K:\s*([A-G][#b]?m?\w*)/);
  const tempoMatch = abc.match(/Q:\s*1\/4=(\d+)/);
  const timeMatch = abc.match(/M:\s*(\d+\/\d+)/);

  const key = keyMatch?.[1] || "C";
  const tempo = tempoMatch ? parseInt(tempoMatch[1]) : 120;
  const timeSignature = timeMatch?.[1] || "4/4";

  // Extract chord symbols from the ABC notation
  const chordMatches = abc.match(/"([A-G][#b]?[a-z0-9/]*)"/g) || [];
  const chords = Array.from(new Set(chordMatches.map((c) => c.replace(/"/g, ""))));

  return { key, tempo, chords, timeSignature };
}

/**
 * Build a strong instrument-specific prompt for LLM generation.
 */
function buildPartPrompt(
  part: InstrumentPart,
  songTitle: string,
  leadSheetAbc: string,
  lyrics: string | null,
  info: { key: string; tempo: number; chords: string[]; timeSignature: string }
): string {
  const chordsStr = info.chords.length > 0 ? info.chords.join(", ") : "C, Am, F, G";

  const common = `You are a professional music arranger. Generate valid ABC notation for the ${part.label} part of "${songTitle}".

REQUIRED HEADERS (each on its own line, in this exact order):
X: 1
T: ${songTitle} - ${part.label}
M: ${info.timeSignature}
L: 1/8
Q: 1/4=${info.tempo}
K: ${info.key}

STRICT FORMAT RULES:
- Output ONLY valid ABC notation, nothing else
- Do NOT wrap in markdown code fences or backticks
- Do NOT include any explanatory text
- The K: header MUST be the last header line, immediately followed by music (NO blank line)
- Do NOT use V: (voice) directives or %%staves
- Use | for bar lines, |] for final bar
- Include chord symbols in quotes: "C"E2 "Am"A2
- Generate 16-32 bars of music matching the lead sheet structure
- Use section comments: % Intro, % Verse, % Chorus, % Bridge

CHORD PROGRESSION: ${chordsStr}
KEY: ${info.key}
TEMPO: ${info.tempo} BPM

LEAD SHEET (reference for structure and harmony):
${leadSheetAbc.substring(0, 1500)}
`;

  if (part.name === "vocals") {
    return `${common}
VOCALS-SPECIFIC RULES:
- Write a singable melody in the range ${part.range}
- The melody should follow the chord tones but be melodically interesting
- Use a mix of note durations: quarter notes (2), half notes (4), eighth notes (1), dotted quarters (3)
- Include rests (z) for breathing between phrases
- Align lyrics using w: lines after each music line
- Use hyphens (-) to split syllables, asterisks (*) to skip notes
- Make the melody expressive with occasional leaps (3rds, 4ths, 5ths) mixed with stepwise motion
${lyrics ? `\nLYRICS:\n${lyrics.substring(0, 1000)}` : ""}

EXAMPLE of good vocal ABC:
"C"E2 G2 "Am"A2 G2 | "F"F4 "G"E2 D2 |
w: A-maz-ing grace how sweet
"C"C4 z2 E2 | "G"G2 A2 G2 E2 |
w: the sound that saved`;
  }

  if (part.name === "bass") {
    return `${common}
BASS-SPECIFIC RULES:
- Write in bass clef range ${part.range} (use uppercase letters with commas for low notes: C, D, E, etc.)
- For ABC notation bass range: use C, D, E, F, G, A, B (middle octave) and C, D, E, F, G, A, B with commas for lower
- Start each measure on the root of the chord
- Use a walking bass or root-fifth pattern appropriate for the genre
- Mostly quarter notes (2) and half notes (4) for a steady groove
- Occasional eighth-note runs for fills between sections
- Add rests at phrase endings for musical breathing

EXAMPLE of good bass ABC:
"C"C4 G2 E2 | "Am"A,4 E2 C2 | "F"F,4 C2 A,2 | "G"G,4 D2 B,2 |
"C"C2 E2 G2 E2 | "Am"A,2 C2 E2 C2 | "F"F,2 A,2 C2 A,2 | "G"G,2 B,2 D2 B,2 |`;
  }

  if (part.name === "piano") {
    return `${common}
PIANO-SPECIFIC RULES:
- Write a chord accompaniment in the range ${part.range}
- Use chord voicings: triads, inversions, and occasional 7ths
- Create a rhythmic accompaniment pattern (not just whole-note chords)
- Mix broken chords (arpeggios) with block chords for variety
- Use eighth notes and quarter notes for rhythmic interest
- Include rests between chord hits for a clean, professional sound
- Vary the pattern between verse (lighter) and chorus (fuller)

EXAMPLE of good piano ABC:
% Verse (lighter pattern)
"C"E2G2 c2G2 | "Am"A2c2 e2c2 | "F"F2A2 c2A2 | "G"G2B2 d2B2 |
% Chorus (fuller chords)
"C"[CEG]4 [CEG]4 | "Am"[Ace]4 [Ace]4 | "F"[FAc]4 [FAc]4 | "G"[GBd]4 [GBd]4 |`;
  }

  return common;
}

/**
 * Generate ABC notation for a single instrument part.
 */
export async function generatePartAbc(
  songTitle: string,
  leadSheetAbc: string,
  lyrics: string | null,
  partName: keyof typeof INSTRUMENT_PARTS
): Promise<string> {
  const part = INSTRUMENT_PARTS[partName];
  if (!part) throw new Error(`Unknown instrument part: ${String(partName)}`);

  const info = extractInfoFromLeadSheet(leadSheetAbc);
  const prompt = buildPartPrompt(part, songTitle, leadSheetAbc, lyrics, info);

  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[MultiPartAbc] Generating ${partName} part (attempt ${attempt})...`);

      const response = await invokeLLM({
        messages: [
          { role: "system", content: prompt },
          {
            role: "user",
            content: `Generate the ${part.label} part ABC notation now. Output ONLY the ABC notation.`,
          },
        ],
      });

      let abcText = extractLLMText(response?.choices?.[0]?.message?.content);
      if (!abcText || abcText.length < 30) {
        console.warn(`[MultiPartAbc] ${partName} attempt ${attempt}: empty or too short`);
        continue;
      }

      // Strip markdown fences if present
      abcText = abcText.replace(/```[a-z]*\n?/g, "").replace(/```/g, "").trim();

      // Sanitise using the shared sanitiser
      abcText = sanitiseAbc(abcText);

      // Validate
      const validationError = validateAbc(abcText);
      if (validationError) {
        console.warn(`[MultiPartAbc] ${partName} attempt ${attempt} validation failed: ${validationError}`);
        if (attempt < maxAttempts) continue;
        // On last attempt, return what we have — it may still render partially
      }

      console.log(`[MultiPartAbc] Generated ${partName} part (${abcText.length} chars)`);
      return abcText;
    } catch (error) {
      console.error(`[MultiPartAbc] Error generating ${partName} part (attempt ${attempt}):`, error);
      if (attempt === maxAttempts) throw error;
    }
  }

  throw new Error(`Failed to generate ${partName} part after ${maxAttempts} attempts`);
}

/**
 * Generate ABC notations for all instrument parts.
 * Generates sequentially to avoid overwhelming the LLM API.
 */
export async function generateAllPartAbcs(
  songTitle: string,
  leadSheetAbc: string,
  lyrics: string | null
): Promise<Record<string, string>> {
  const parts: Record<string, string> = {};

  for (const partName of PART_NAMES) {
    try {
      const abc = await generatePartAbc(songTitle, leadSheetAbc, lyrics, partName);
      parts[partName] = abc;
    } catch (error) {
      console.error(`[MultiPartAbc] Failed to generate ${partName} part:`, error);
      // Continue with other parts even if one fails
    }
  }

  return parts;
}
