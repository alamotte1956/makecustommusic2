/**
 * Multi-part ABC notation generator.
 * Generates separate ABC notations for different instrument parts (Vocals, Bass, Piano).
 */

import { invokeLLM } from "./_core/llm";
import { extractLLMText } from "./llmHelpers";

export interface InstrumentPart {
  name: string;
  clef: string;
  range: string;
  description: string;
}

// Define common instrument parts for sheet music
const INSTRUMENT_PARTS: Record<string, InstrumentPart> = {
  vocals: {
    name: "Vocals",
    clef: "treble",
    range: "C4-C6",
    description: "Lead vocal melody line with lyrics"
  },
  bass: {
    name: "Bass",
    clef: "bass",
    range: "E2-E4",
    description: "Bass line following the chord progression"
  },
  piano: {
    name: "Piano",
    clef: "treble",
    range: "C3-C6",
    description: "Piano/chord accompaniment with chord symbols"
  }
};

/**
 * Generate separate ABC notation for a specific instrument part.
 * @param songTitle - Title of the song
 * @param lyrics - Song lyrics (if applicable)
 * @param chords - Chord progression
 * @param key - Key signature
 * @param tempo - Tempo in BPM
 * @param partName - Name of the instrument part (vocals, bass, piano)
 * @returns ABC notation for the specific part
 */
export async function generatePartAbc(
  songTitle: string,
  lyrics: string | null,
  chords: string,
  key: string,
  tempo: number,
  partName: keyof typeof INSTRUMENT_PARTS
): Promise<string> {
  const part = INSTRUMENT_PARTS[partName];
  if (!part) {
    throw new Error(`Unknown instrument part: ${partName}`);
  }

  const systemPrompt = buildPartGenerationPrompt(part, songTitle, lyrics, chords, key, tempo);

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `Generate ABC notation for the ${part.name} part of "${songTitle}".` as string
        }
      ]
    });

     const abcText = extractLLMText(response);
    return abcText || "";
  } catch (error) {
    console.error(`[MultiPartAbc] Error generating ${partName} part:`, error);
    throw error;
  }
}

/**
 * Generate ABC notations for all common instrument parts.
 * @returns Object with ABC notation for each part
 */
export async function generateAllPartAbcs(
  songTitle: string,
  lyrics: string | null,
  chords: string,
  key: string,
  tempo: number
): Promise<Record<string, string>> {
  const parts: Record<string, string> = {};

  // Always generate vocals and piano
  const partsToGenerate: (keyof typeof INSTRUMENT_PARTS)[] = ["vocals", "piano"];

  // Add bass if there are chords (bass follows chord progression)
  if (chords && chords.length > 0) {
    partsToGenerate.push("bass");
  }

  for (const partName of partsToGenerate) {
    try {
      console.log(`[MultiPartAbc] Generating ${partName} part...`);
      const abc = await generatePartAbc(songTitle, lyrics, chords, key, tempo, partName);
      parts[partName] = abc;
      console.log(`[MultiPartAbc] Generated ${partName} part (${abc.length} chars)`);
    } catch (error) {
      console.error(`[MultiPartAbc] Failed to generate ${partName} part:`, error);
      // Continue with other parts even if one fails
    }
  }

  return parts;
}

/**
 * Build the system prompt for generating a specific instrument part.
 */
function buildPartGenerationPrompt(
  part: InstrumentPart,
  songTitle: string,
  lyrics: string | null,
  chords: string,
  key: string,
  tempo: number
): string {
  const basePrompt = [
    "You are a professional music arranger specializing in orchestration.",
    `Generate valid ABC notation for the ${part.name} part of a song.`,
    "",
    "REQUIRED HEADERS (must all be present, each on its own line):",
    "- X: 1",
    `- T: ${songTitle} (${part.name})`,
    "- M: 4/4",
    "- L: 1/8",
    `- Q: 1/4=${tempo}`,
    `- K: ${key}`,
    "",
    "CLEF AND RANGE:",
    `- Use ${part.clef} clef`,
    `- Write in the range: ${part.range}`,
    "",
    "STRICT FORMAT RULES:",
    "- Output ONLY valid ABC notation text, nothing else",
    "- Do NOT wrap the output in markdown code fences or backticks",
    "- Do NOT include any explanatory text before or after the notation",
    "- The K: header MUST be the last header line before the music body begins",
    ""
  ];

  if (part.name === "Vocals") {
    basePrompt.push(
      "VOCALS SPECIFIC RULES:",
      "- Generate a singable melody line that matches the lyrics",
      "- Align lyrics with the melody using w: lines",
      "- Use hyphens (-) to split syllables across notes",
      "- Use asterisks (*) to skip notes without syllables",
      "- Include chord symbols in quotes before notes: \"C\"E2 \"Am\"c2",
      ""
    );
    if (lyrics) {
      basePrompt.push(`LYRICS:\n${lyrics}\n`);
    }
  } else if (part.name === "Bass") {
    basePrompt.push(
      "BASS SPECIFIC RULES:",
      "- Generate a bass line that follows the chord progression",
      "- Use mostly quarter notes and half notes for a steady bass",
      "- Start each measure on the root of the chord",
      "- Include chord symbols in quotes: \"C\"C2 \"Am\"A2",
      "- Keep the bass line simple and supportive",
      ""
    );
    if (chords) {
      basePrompt.push(`CHORD PROGRESSION:\n${chords}\n`);
    }
  } else if (part.name === "Piano") {
    basePrompt.push(
      "PIANO SPECIFIC RULES:",
      "- Generate a chord accompaniment suitable for piano",
      "- Use chord symbols in quotes: \"C\"E2G2 \"Am\"A2c2",
      "- Include both melody and harmony notes",
      "- Create a flowing, musical accompaniment",
      "- Use a mix of quarter notes and eighth notes",
      ""
    );
    if (chords) {
      basePrompt.push(`CHORD PROGRESSION:\n${chords}\n`);
    }
  }

  basePrompt.push(
    "OUTPUT:",
    "- Generate 8-16 bars of music",
    "- Ensure proper bar lines at every measure boundary",
    "- Use repeat signs if appropriate",
    "- Output ONLY the ABC notation, no other text"
  );

  return basePrompt.join("\n");
}
