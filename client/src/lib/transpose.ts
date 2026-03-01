/**
 * Music Transposition Utility
 * Transposes notes, chords, and ABC notation between keys.
 */

// All 12 chromatic notes in sharps and flats
const SHARP_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_NOTES  = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

// All keys a user might want to select
export const ALL_KEYS = [
  "C", "C#", "Db", "D", "D#", "Eb", "E", "F",
  "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B",
  "Cm", "C#m", "Dm", "D#m", "Ebm", "Em", "Fm",
  "F#m", "Gm", "G#m", "Am", "A#m", "Bbm", "Bm",
];

// Common major keys for the dropdown (simplified list)
export const COMMON_KEYS = [
  "C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B",
  "Cm", "Dm", "Em", "Fm", "Gm", "Am", "Bm",
];

/**
 * Normalize a note name to its index in the chromatic scale (0-11).
 */
function noteToIndex(note: string): number {
  const upper = note.trim();
  let idx = SHARP_NOTES.indexOf(upper);
  if (idx >= 0) return idx;
  idx = FLAT_NOTES.indexOf(upper);
  if (idx >= 0) return idx;

  // Handle enharmonic equivalents
  const map: Record<string, number> = {
    "Cb": 11, "E#": 5, "Fb": 4, "B#": 0,
  };
  if (map[upper] !== undefined) return map[upper];
  return -1;
}

/**
 * Calculate the semitone interval from one key to another.
 */
export function getSemitoneInterval(fromKey: string, toKey: string): number {
  // Strip minor suffix for root note comparison
  const fromRoot = fromKey.replace("m", "");
  const toRoot = toKey.replace("m", "");
  const fromIdx = noteToIndex(fromRoot);
  const toIdx = noteToIndex(toRoot);
  if (fromIdx < 0 || toIdx < 0) return 0;
  return ((toIdx - fromIdx) + 12) % 12;
}

/**
 * Determine whether to use sharps or flats based on the target key.
 */
function useFlats(targetKey: string): boolean {
  const flatKeys = ["F", "Bb", "Eb", "Ab", "Db", "Gb",
                    "Dm", "Gm", "Cm", "Fm", "Bbm", "Ebm"];
  return flatKeys.includes(targetKey);
}

/**
 * Transpose a single chord name by a number of semitones.
 * Handles roots like C, C#, Db, and suffixes like m, 7, maj7, sus4, dim, aug, etc.
 */
export function transposeChord(chord: string, semitones: number, targetKey: string): string {
  if (semitones === 0) return chord;

  // Match root note (with optional # or b) and the rest (quality/extensions)
  const match = chord.match(/^([A-G][#b]?)(.*)/);
  if (!match) return chord;

  const [, root, suffix] = match;
  const idx = noteToIndex(root);
  if (idx < 0) return chord;

  const newIdx = ((idx + semitones) + 12) % 12;
  const notes = useFlats(targetKey) ? FLAT_NOTES : SHARP_NOTES;
  return notes[newIdx] + suffix;
}

/**
 * Transpose a slash chord (e.g., "Am/G" → "Bm/A").
 */
export function transposeChordWithSlash(chord: string, semitones: number, targetKey: string): string {
  if (semitones === 0) return chord;

  const parts = chord.split("/");
  const transposed = parts.map(part => transposeChord(part.trim(), semitones, targetKey));
  return transposed.join("/");
}

/**
 * Transpose ABC notation to a new key.
 * Updates the K: field and transposes all note letters.
 */
export function transposeABC(abc: string, fromKey: string, toKey: string): string {
  const semitones = getSemitoneInterval(fromKey, toKey);
  if (semitones === 0) return abc;

  const flats = useFlats(toKey);

  // ABC note mapping: lowercase = octave up, uppercase = middle octave
  // ABC sharps: ^, flats: _, natural: =
  const abcNoteRegex = /(\^{1,2}|_{1,2}|=)?([A-Ga-g])([,']*)/g;

  const lines = abc.split("\n");
  const result: string[] = [];

  for (const line of lines) {
    // Update the K: (key) field
    if (line.trim().startsWith("K:")) {
      const toRoot = toKey.replace("m", "");
      const isMinor = toKey.endsWith("m") || line.toLowerCase().includes("min");
      result.push(`K:${toRoot}${isMinor ? "m" : ""}`);
      continue;
    }

    // Skip header fields (don't transpose them)
    if (/^[A-Z]:/.test(line.trim()) && !line.trim().startsWith("w:")) {
      result.push(line);
      continue;
    }

    // Transpose notes in music lines
    const transposedLine = line.replace(abcNoteRegex, (match, accidental, noteLetter, octaveMod) => {
      // Determine the base note index
      const isLower = noteLetter === noteLetter.toLowerCase();
      const upperNote = noteLetter.toUpperCase();

      let noteIdx = "CDEFGAB".indexOf(upperNote);
      if (noteIdx < 0) return match;

      // Convert to chromatic index
      const chromaticMap = [0, 2, 4, 5, 7, 9, 11]; // C D E F G A B
      let chromatic = chromaticMap[noteIdx];

      // Apply accidentals
      if (accidental === "^") chromatic = (chromatic + 1) % 12;
      else if (accidental === "^^") chromatic = (chromatic + 2) % 12;
      else if (accidental === "_") chromatic = (chromatic + 11) % 12;
      else if (accidental === "__") chromatic = (chromatic + 10) % 12;

      // Transpose
      const newChromatic = (chromatic + semitones) % 12;

      // Map back to ABC note
      const noteNames = flats
        ? ["C", "_D", "D", "_E", "E", "F", "_G", "G", "_A", "A", "_B", "B"]
        : ["C", "^C", "D", "^D", "E", "F", "^F", "G", "^G", "A", "^A", "B"];

      let abcNote = noteNames[newChromatic];

      // Restore case for octave
      if (isLower) {
        // Extract the letter part (last character)
        const letterPart = abcNote.replace(/[\^_=]/g, "");
        const accPart = abcNote.replace(/[A-G]/g, "");
        abcNote = accPart + letterPart.toLowerCase();
      }

      return abcNote + (octaveMod || "");
    });

    result.push(transposedLine);
  }

  return result.join("\n");
}

/**
 * Detect the key from ABC notation by reading the K: field.
 */
export function detectKeyFromABC(abc: string): string | null {
  const lines = abc.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("K:")) {
      const keyStr = trimmed.substring(2).trim();
      // Parse key: could be "C", "Am", "Cmaj", "Cmin", "C major", etc.
      const match = keyStr.match(/^([A-G][#b]?)\s*(m|min|minor)?/i);
      if (match) {
        const root = match[1];
        const isMinor = match[2] ? true : false;
        return root + (isMinor ? "m" : "");
      }
      return keyStr;
    }
  }
  return null;
}
