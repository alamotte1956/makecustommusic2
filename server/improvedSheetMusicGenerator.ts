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
  "measures": <number of measures, minimum 32>,
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
  const prompt = `You are a music lyricist. Break down these lyrics into syllables for sheet music alignment.

Song: "${title}"
Genre: ${genre}
Lyrics:
${lyrics}

Return ONLY valid JSON (no markdown, no explanation) with this structure:
[
  {"text": "A-ma-zing grace", "syllables": ["A", "ma", "zing", "grace"]},
  {"text": "How sweet the sound", "syllables": ["How", "sweet", "the", "sound"]}
]`;

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

  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1].trim();
  }

  const lines = JSON.parse(jsonText);
  return lines;
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
  const prompt = `You are a music composer. Generate a chord progression for this song structure.

Song: "${title}"
Genre: ${genre}
Key: ${key}
Total Measures: ${structure.measures}
Sections: ${structure.sections.map((s) => `${s.name} (measures ${s.startMeasure}-${s.endMeasure})`).join(", ")}

Return ONLY valid JSON (no markdown, no explanation) with chord changes at key measures:
[
  {"measureNumber": 1, "chord": "C"},
  {"measureNumber": 5, "chord": "Am"},
  {"measureNumber": 9, "chord": "F"},
  {"measureNumber": 13, "chord": "G"}
]`;

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

  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1].trim();
  }

  let chords = JSON.parse(jsonText);
  
  // Ensure chords is always an array
  if (!Array.isArray(chords)) {
    console.warn('[generateChordProgression] LLM returned non-array chords, converting to array');
    // If it's a single object, wrap it in an array
    if (typeof chords === 'object' && chords !== null && 'chord' in chords) {
      chords = [chords];
    } else {
      // Fallback: return empty array
      console.warn('[generateChordProgression] Invalid chord format, using fallback');
      chords = [];
    }
  }
  
  return chords;
}

/**
 * Generate a musically coherent melody phrase for a section
 */
function generateMelodyPhrase(
  startNote: string,
  length: number,
  key: string,
  sectionType: string
): string {
  // Define note sequences for different keys
  const keySequences: Record<string, string[]> = {
    C: ["C", "D", "E", "F", "G", "A", "B", "c"],
    G: ["G", "A", "B", "c", "d", "e", "f#", "g"],
    D: ["D", "E", "F#", "G", "A", "B", "C#", "d"],
    A: ["A", "B", "C#", "D", "E", "F#", "G#", "a"],
    E: ["E", "F#", "G#", "A", "B", "C#", "D#", "e"],
    F: ["F", "G", "A", "Bb", "C", "D", "E", "f"],
    Bb: ["Bb", "C", "D", "Eb", "F", "G", "A", "Bb"],
    Am: ["A", "B", "C", "D", "E", "F", "G", "a"],
    Em: ["E", "F#", "G", "A", "B", "C", "D", "e"],
    Dm: ["D", "E", "F", "G", "A", "Bb", "C", "d"],
  };

  const notes = keySequences[key] || keySequences["C"];
  let phrase = "";

  // Create varied patterns based on section type
  if (sectionType === "Intro" || sectionType === "Outro") {
    // Simpler, more sparse melody
    for (let i = 0; i < length; i += 2) {
      phrase += notes[i % notes.length] + "4 z4 ";
    }
  } else if (sectionType === "Chorus") {
    // More active, energetic melody
    for (let i = 0; i < length; i++) {
      phrase += notes[i % notes.length] + "2 ";
    }
  } else {
    // Verse: moderate activity
    for (let i = 0; i < length; i++) {
      const duration = i % 3 === 0 ? "4" : "2"; // Mix of quarter and eighth notes
      phrase += notes[i % notes.length] + duration + " ";
    }
  }

  return phrase.trim();
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

  // Build melody for each section
  const notesPerMeasure = timeSignature === "3/4" ? 6 : 8; // 8 eighth notes per 4/4 measure
  let currentNote = "C";
  let measureCount = 0;
  let notesInMeasure = 0;
  let measureLine = "";
  let lastChord = "C";

  // Create a chord map for quick lookup
  const chordMap: Record<number, string> = {};
  if (Array.isArray(chords)) {
    chords.forEach((c) => {
      chordMap[c.measureNumber] = c.chord;
    });
  }

  // Generate notes for each measure
  for (let measure = 1; measure <= structure.measures; measure++) {
    // Find current section
    const currentSection = structure.sections.find(
      (s) => measure >= s.startMeasure && measure <= s.endMeasure
    );
    const sectionName = currentSection?.name || "Verse";

    // Add chord symbol at measure start if it changes
    if (chordMap[measure]) {
      lastChord = chordMap[measure];
      measureLine += `"${lastChord}" `;
    } else if (measure === 1) {
      // Add initial chord
      const firstChord = chords.length > 0 ? chords[0].chord : "C";
      measureLine += `"${firstChord}" `;
      lastChord = firstChord;
    }

    // Generate notes for this measure
    const noteSequence = ["C", "D", "E", "F", "G", "A", "B", "c"];
    let notesThisMeasure = 0;

    while (notesThisMeasure < notesPerMeasure && notesThisMeasure < 8) {
      const note = noteSequence[(measure + notesThisMeasure) % noteSequence.length];
      const duration = sectionName === "Intro" || sectionName === "Outro" ? "4" : "2";
      measureLine += note + duration + " ";
      notesThisMeasure += parseInt(duration);
    }

    // Complete the measure with bar line
    measureLine = measureLine.trim();
    if (measureLine.length > 0) {
      lines.push(measureLine + " |");
    }
    measureLine = "";
  }

  // Add final bar line
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
