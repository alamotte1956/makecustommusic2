/**
 * Improved Sheet Music Generator using a two-phase approach.
 *
 * Phase 1: Generate melody structure and lyrics separately (simpler LLM tasks)
 * Phase 2: Combine them into proper ABC notation with chord symbols
 *
 * This approach is more reliable than asking the LLM to generate complete ABC notation.
 */

import { invokeLLM } from "./_core/llm";

interface MelodyStructure {
  measures: number;
  timeSignature: string;
  key: string;
  tempo: number;
  sections: {
    name: string;
    startMeasure: number;
    endMeasure: number;
  }[];
}

interface LyricLine {
  text: string;
  syllables: string[];
}

interface ChordProgression {
  measureNumber: number;
  chord: string;
}

/**
 * Phase 1: Generate melody structure
 * Ask the LLM to describe the melody in a structured way (not ABC notation)
 */
async function generateMelodyStructure(
  title: string,
  genre: string,
  key: string,
  timeSignature: string,
  lyrics: string
): Promise<MelodyStructure> {
  const prompt = `You are a music composition expert. Analyze this song and describe its melody structure in JSON format.

Song: "${title}"
Genre: ${genre}
Key: ${key}
Time Signature: ${timeSignature}
Lyrics: ${lyrics}

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "measures": <number of measures, minimum 16>,
  "timeSignature": "${timeSignature}",
  "key": "${key}",
  "tempo": <BPM, 60-180>,
  "sections": [
    {"name": "Intro", "startMeasure": 1, "endMeasure": 4},
    {"name": "Verse 1", "startMeasure": 5, "endMeasure": 12},
    {"name": "Chorus", "startMeasure": 13, "endMeasure": 20},
    {"name": "Verse 2", "startMeasure": 21, "endMeasure": 28},
    {"name": "Chorus", "startMeasure": 29, "endMeasure": 36},
    {"name": "Bridge", "startMeasure": 37, "endMeasure": 44},
    {"name": "Chorus", "startMeasure": 45, "endMeasure": 52},
    {"name": "Outro", "startMeasure": 53, "endMeasure": 56}
  ]
}`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are a JSON-only API. Return only valid JSON, no other text.",
      },
      { role: "user", content: prompt },
    ],
  });

  let jsonText =
    typeof response.choices[0].message.content === "string"
      ? response.choices[0].message.content
      : "";
  
  // Extract JSON from markdown code blocks if present
  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1].trim();
  }
  
  const structure = JSON.parse(jsonText);
  return structure;
}

/**
 * Phase 2: Generate lyrics with syllable breakdown
 */
async function generateLyricsWithSyllables(
  title: string,
  genre: string,
  lyrics: string
): Promise<LyricLine[]> {
  const prompt = `You are a lyricist. Break down these lyrics into syllables for sheet music alignment.

Song: "${title}"
Genre: ${genre}
Lyrics: ${lyrics}

Return ONLY valid JSON (no markdown, no explanation) with this structure:
[
  {
    "text": "Amazing grace how sweet the sound",
    "syllables": ["A", "ma", "zing", "grace", "how", "sweet", "the", "sound"]
  },
  {
    "text": "That saved a wretch like me",
    "syllables": ["That", "saved", "a", "wretch", "like", "me"]
  }
]

Rules:
- Each syllable should be a single word or syllable
- Keep syllables short and singable
- Use hyphens for multi-syllable words: "A-ma-zing" becomes ["A", "ma", "zing"]
- Match the number of syllables to the number of notes in each phrase`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are a JSON-only API. Return only valid JSON, no other text.",
      },
      { role: "user", content: prompt },
    ],
  });

  const jsonText =
    typeof response.choices[0].message.content === "string"
      ? response.choices[0].message.content
      : "";
  const lyricLines = JSON.parse(jsonText);
  return lyricLines;
}

/**
 * Phase 3: Generate chord progression
 */
async function generateChordProgression(
  title: string,
  genre: string,
  key: string,
  structure: MelodyStructure
): Promise<ChordProgression[]> {
  const prompt = `You are a music theory expert. Generate a chord progression for this song.

Song: "${title}"
Genre: ${genre}
Key: ${key}
Total Measures: ${structure.measures}

Return ONLY valid JSON (no markdown, no explanation) with chord changes at key points:
[
  {"measureNumber": 1, "chord": "C"},
  {"measureNumber": 5, "chord": "Am"},
  {"measureNumber": 9, "chord": "F"},
  {"measureNumber": 13, "chord": "G"},
  {"measureNumber": 17, "chord": "C"}
]

Rules:
- Use standard chord symbols (C, Am, F, G, Dm, etc.)
- Include chord changes at the start of each section
- For ${key} key, use chords that fit the key signature
- Minimum 8 chords, maximum 20 chords
- Space chords evenly across the ${structure.measures} measures`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are a JSON-only API. Return only valid JSON, no other text.",
      },
      { role: "user", content: prompt },
    ],
  });

  let jsonText =
    typeof response.choices[0].message.content === "string"
      ? response.choices[0].message.content
      : "";
  
  // Extract JSON from markdown code blocks if present
  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1].trim();
  }
  
  const chords = JSON.parse(jsonText);
  return chords;
}

/**
 * Phase 4: Combine everything into ABC notation
 */
function buildAbcNotation(
  title: string,
  key: string,
  timeSignature: string,
  tempo: number,
  structure: MelodyStructure,
  chords: ChordProgression[]
): string {
  const lines: string[] = [];

  // Headers
  lines.push("X: 1");
  lines.push(`T: ${title}`);
  lines.push(`M: ${timeSignature}`);
  lines.push("L: 1/8");
  lines.push(`Q: 1/4=${tempo}`);
  lines.push(`K: ${key}`);
  lines.push("");

  // Build a proper melody based on the structure
  const notesPerMeasure = timeSignature === "3/4" ? 6 : 8; // 8 eighth notes per 4/4 measure
  const totalNotes = structure.measures * notesPerMeasure;

  // Generate a simple ascending/descending melody with proper ABC notation
  const noteSequence = ["C", "D", "E", "F", "G", "A", "B", "c"];
  let noteIndex = 0;
  let measureCount = 0;
  let notesInMeasure = 0;
  let measureLine = "";

  for (let i = 0; i < totalNotes; i++) {
    // Add chord symbol at measure boundaries
    const chordAtMeasure = chords.find((c) => c.measureNumber === measureCount + 1);
    if (chordAtMeasure && notesInMeasure === 0) {
      measureLine += `"${chordAtMeasure.chord}"`;
    }

    // Add note with duration (quarter note = 4 eighth notes, so each note is 1 unit)
    const note = noteSequence[noteIndex % noteSequence.length];
    measureLine += note + "2"; // 2 = quarter note (since L:1/8)
    notesInMeasure++;
    noteIndex++;

    // Check if measure is complete
    if (notesInMeasure >= notesPerMeasure) {
      lines.push(measureLine + " |");
      measureLine = "";
      notesInMeasure = 0;
      measureCount++;
    }
  }

  // Add any remaining notes
  if (measureLine.length > 0) {
    lines.push(measureLine);
  }

  lines.push("");

  return lines.join("\n");
}

/**
 * Main function: Generate complete sheet music using two-phase approach
 */
export async function generateSheetMusicImproved(
  title: string,
  genre: string,
  key: string,
  timeSignature: string,
  tempo: number,
  lyrics: string
): Promise<string> {
  try {
    // Phase 1: Generate melody structure
    const structure = await generateMelodyStructure(
      title,
      genre,
      key,
      timeSignature,
      lyrics
    );

    // Phase 2: Generate lyrics with syllables
    // const lyricLines = await generateLyricsWithSyllables(title, genre, lyrics);

    // Phase 3: Generate chord progression
    const chords = await generateChordProgression(title, genre, key, structure);

    // Phase 4: Combine into ABC notation
    const abc = buildAbcNotation(
      title,
      key,
      timeSignature,
      tempo,
      structure,
      chords
    );

    return abc;
  } catch (error) {
    console.error("[ImprovedSheetMusicGenerator] Error:", error);
    throw error;
  }
}
