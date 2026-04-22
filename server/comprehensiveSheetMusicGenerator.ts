/**
 * Comprehensive Sheet Music Generator
 * 
 * Generates complete, multi-line ABC notation with proper structure,
 * realistic melodies, and chord progressions.
 */

interface GeneratorOptions {
  title: string;
  key?: string;
  timeSignature?: string;
  tempo?: number;
  lyrics?: string;
}

/**
 * Generate comprehensive ABC notation with multiple lines of music
 */
export function generateComprehensiveSheetMusic(options: GeneratorOptions): string {
  const {
    title,
    key = "C",
    timeSignature = "4/4",
    tempo = 120,
    lyrics = ""
  } = options;

  const lines: string[] = [];

  // ABC Headers
  lines.push("X: 1");
  lines.push(`T: ${title}`);
  lines.push("M: 4/4");
  lines.push("L: 1/8");
  lines.push(`Q: 1/4=${tempo}`);
  lines.push(`K: ${key}`);
  lines.push("");

  // Generate 64 measures of music (16 lines of 4 measures each)
  // This ensures multiple lines of staff notation
  const noteSequences = generateNoteSequences(key);
  const chordProgression = generateChordProgression(key);

  let measureCount = 0;
  let noteIndex = 0;
  let chordIndex = 0;

  for (let lineNum = 0; lineNum < 16; lineNum++) {
    let line = "";

    // Generate 4 measures per line
    for (let m = 0; m < 4; m++) {
      measureCount++;

      // Add chord at measure start (every 4 measures)
      if (measureCount % 4 === 1 && chordIndex < chordProgression.length) {
        line += `"${chordProgression[chordIndex]}" `;
        chordIndex++;
      }

      // Generate 8 eighth notes per measure (4/4 time)
      const measureNotes = generateMeasureNotes(
        noteSequences,
        noteIndex,
        measureCount
      );
      line += measureNotes;
      noteIndex += 8;

      // Add bar line
      line += "| ";
    }

    // Add line to output
    lines.push(line.trim());
  }

  // Add final bar line
  lines.push("");

  return lines.join("\n");
}

/**
 * Generate note sequences for a given key
 */
function generateNoteSequences(key: string): string[][] {
  const sequences: Record<string, string[][]> = {
    C: [
      ["C", "D", "E", "F", "G", "A", "B", "c"],
      ["c", "B", "A", "G", "F", "E", "D", "C"],
      ["E", "F", "G", "A", "B", "c", "d", "e"],
      ["G", "A", "B", "c", "d", "e", "f", "g"],
    ],
    G: [
      ["G", "A", "B", "c", "d", "e", "f#", "g"],
      ["g", "f#", "e", "d", "c", "B", "A", "G"],
      ["B", "c", "d", "e", "f#", "g", "a", "b"],
      ["d", "e", "f#", "g", "a", "b", "c", "d"],
    ],
    D: [
      ["D", "E", "F#", "G", "A", "B", "C#", "d"],
      ["d", "C#", "B", "A", "G", "F#", "E", "D"],
      ["F#", "G", "A", "B", "C#", "d", "e", "f#"],
      ["A", "B", "C#", "d", "e", "f#", "g#", "a"],
    ],
    A: [
      ["A", "B", "C#", "D", "E", "F#", "G#", "a"],
      ["a", "G#", "F#", "E", "D", "C#", "B", "A"],
      ["C#", "D", "E", "F#", "G#", "a", "b", "c#"],
      ["E", "F#", "G#", "a", "b", "c#", "d#", "e"],
    ],
    F: [
      ["F", "G", "A", "Bb", "C", "D", "E", "f"],
      ["f", "E", "D", "C", "Bb", "A", "G", "F"],
      ["A", "Bb", "C", "D", "E", "f", "g", "a"],
      ["C", "D", "E", "F", "G", "A", "B", "c"],
    ],
  };

  return sequences[key] || sequences["C"];
}

/**
 * Generate a chord progression for a given key
 */
function generateChordProgression(key: string): string[] {
  const progressions: Record<string, string[]> = {
    C: ["C", "F", "G", "C", "Am", "F", "G", "C", "C", "F", "G", "C", "Am", "F", "G", "C"],
    G: ["G", "C", "D", "G", "Em", "C", "D", "G", "G", "C", "D", "G", "Em", "C", "D", "G"],
    D: ["D", "G", "A", "D", "Bm", "G", "A", "D", "D", "G", "A", "D", "Bm", "G", "A", "D"],
    A: ["A", "D", "E", "A", "F#m", "D", "E", "A", "A", "D", "E", "A", "F#m", "D", "E", "A"],
    F: ["F", "Bb", "C", "F", "Dm", "Bb", "C", "F", "F", "Bb", "C", "F", "Dm", "Bb", "C", "F"],
  };

  return progressions[key] || progressions["C"];
}

/**
 * Generate notes for a single measure with rhythm variation
 */
function generateMeasureNotes(
  sequences: string[][],
  startIndex: number,
  measureCount: number
): string {
  const sequenceIndex = Math.floor(startIndex / 32) % sequences.length;
  const sequence = sequences[sequenceIndex];
  const positionInSequence = (startIndex + measureCount * 2) % sequence.length;

  let notes = "";
  const rhythmPattern = getRandomRhythmPattern(measureCount);

  for (let i = 0; i < rhythmPattern.length; i++) {
    const noteIndex = (positionInSequence + i) % sequence.length;
    const note = sequence[noteIndex];
    const duration = rhythmPattern[i];

    notes += note + duration + " ";
  }

  return notes.trim();
}

/**
 * Get a rhythm pattern for a measure
 * Returns array of duration values (e.g., ["2", "2", "2", "2"] for quarter notes)
 */
function getRandomRhythmPattern(measureCount: number): string[] {
  const patterns = [
    ["2", "2", "2", "2"],           // 4 quarter notes
    ["4", "4", "4", "4", "4", "4", "4", "4"], // 8 eighth notes
    ["4", "4", "2", "2"],           // Mix of eighths and quarters
    ["2", "2", "4", "4", "4", "4"], // Mix
    ["1", "2", "2", "2"],           // Half note + quarters
    ["2", "2", "2", "4", "4"],      // Quarters + eighths
  ];

  // Use measure count to create variety
  const patternIndex = (measureCount * 7) % patterns.length;
  return patterns[patternIndex];
}

/**
 * Generate ABC notation with lyrics
 */
export function generateComprehensiveSheetMusicWithLyrics(
  options: GeneratorOptions
): string {
  const baseAbc = generateComprehensiveSheetMusic(options);

  if (!options.lyrics) {
    return baseAbc;
  }

  // Parse lyrics into lines and add them to the ABC notation
  const lyricLines = options.lyrics.split("\n").filter(l => l.trim());
  let abcWithLyrics = baseAbc;

  // Add lyrics as ABC w: lines (word lines)
  for (const lyricLine of lyricLines.slice(0, 4)) {
    abcWithLyrics += `\nw: ${lyricLine.substring(0, 100)}`;
  }

  return abcWithLyrics;
}
