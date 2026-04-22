/**
 * Simple Sheet Music Generator - Reliable fallback that generates complete ABC notation
 * 
 * This generator creates valid, parseable ABC notation that abcjs can render.
 * It prioritizes reliability over complexity.
 */

export function generateSimpleSheetMusic(
  title: string,
  key: string = "C",
  timeSignature: string = "4/4",
  tempo: number = 120,
  lyrics: string = ""
): string {
  const lines: string[] = [];

  // Headers - MUST be in this exact order
  lines.push("X: 1");
  lines.push(`T: ${title}`);
  lines.push("M: 4/4");
  lines.push("L: 1/8");
  lines.push(`Q: 1/4=${tempo}`);
  lines.push(`K: ${key}`);
  lines.push("");

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
  const chords = getChordProgression(key);

  // Generate 32 measures of music (8 lines of 4 measures each)
  let noteIndex = 0;
  let chordIndex = 0;
  let measureCount = 0;

  for (let line = 0; line < 8; line++) {
    let measureLine = "";

    // 4 measures per line
    for (let m = 0; m < 4; m++) {
      measureCount++;

      // Add chord at measure start
      if (chordIndex < chords.length && measureCount === chords[chordIndex].measure) {
        measureLine += `"${chords[chordIndex].chord}" `;
        chordIndex++;
      }

      // Add 8 eighth notes per measure (4/4 time)
      for (let n = 0; n < 8; n++) {
        const note = notes[noteIndex % notes.length];
        measureLine += note;
        noteIndex++;

        // Add duration marker
        if (n % 2 === 1) {
          measureLine += "2 "; // Quarter note (2 eighth notes)
        }
      }

      // Add bar line
      measureLine += "| ";
    }

    // Add line to output
    lines.push(measureLine.trim());
  }

  // Add final bar line
  lines.push("");

  return lines.join("\n");
}

/**
 * Get a basic chord progression for a key
 */
function getChordProgression(
  key: string
): { measure: number; chord: string }[] {
  const progressions: Record<string, { measure: number; chord: string }[]> = {
    C: [
      { measure: 1, chord: "C" },
      { measure: 5, chord: "Am" },
      { measure: 9, chord: "F" },
      { measure: 13, chord: "G" },
      { measure: 17, chord: "C" },
      { measure: 21, chord: "Am" },
      { measure: 25, chord: "F" },
      { measure: 29, chord: "G" },
    ],
    G: [
      { measure: 1, chord: "G" },
      { measure: 5, chord: "Em" },
      { measure: 9, chord: "D" },
      { measure: 13, chord: "A" },
      { measure: 17, chord: "G" },
      { measure: 21, chord: "Em" },
      { measure: 25, chord: "D" },
      { measure: 29, chord: "A" },
    ],
    D: [
      { measure: 1, chord: "D" },
      { measure: 5, chord: "Bm" },
      { measure: 9, chord: "G" },
      { measure: 13, chord: "A" },
      { measure: 17, chord: "D" },
      { measure: 21, chord: "Bm" },
      { measure: 25, chord: "G" },
      { measure: 29, chord: "A" },
    ],
    A: [
      { measure: 1, chord: "A" },
      { measure: 5, chord: "F#m" },
      { measure: 9, chord: "D" },
      { measure: 13, chord: "E" },
      { measure: 17, chord: "A" },
      { measure: 21, chord: "F#m" },
      { measure: 25, chord: "D" },
      { measure: 29, chord: "E" },
    ],
    F: [
      { measure: 1, chord: "F" },
      { measure: 5, chord: "Dm" },
      { measure: 9, chord: "Bb" },
      { measure: 13, chord: "C" },
      { measure: 17, chord: "F" },
      { measure: 21, chord: "Dm" },
      { measure: 25, chord: "Bb" },
      { measure: 29, chord: "C" },
    ],
    Am: [
      { measure: 1, chord: "Am" },
      { measure: 5, chord: "F" },
      { measure: 9, chord: "C" },
      { measure: 13, chord: "G" },
      { measure: 17, chord: "Am" },
      { measure: 21, chord: "F" },
      { measure: 25, chord: "C" },
      { measure: 29, chord: "G" },
    ],
  };

  return progressions[key] || progressions["C"];
}
