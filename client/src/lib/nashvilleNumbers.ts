/**
 * Nashville Number System (NNS) converter.
 *
 * Converts traditional chord symbols (e.g. "Am", "G/B", "F#m7")
 * to Nashville numbers relative to a given key (e.g. "6m", "5/7", "#4m7").
 *
 * Reference:
 * - In key of C: C=1, D=2, E=3, F=4, G=5, A=6, B=7
 * - Minor chords use lowercase "m" suffix: Am in C = 6m
 * - Slash chords: G/B in C = 5/7
 * - Extensions preserved: Cmaj7 in C = 1maj7, G7 in C = 57
 * - Accidentals: Bb in C = b7, F# in C = #4
 */

/** Chromatic note names (sharps) */
const SHARP_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** Chromatic note names (flats) */
const FLAT_NOTES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

/** Major scale intervals (semitones from root) */
const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];

/**
 * Normalize a note name to a semitone index (0-11).
 */
function noteToSemitone(note: string): number {
  // Normalize enharmonics
  const normalized = note
    .replace(/♯/g, "#")
    .replace(/♭/g, "b");

  let idx = SHARP_NOTES.indexOf(normalized);
  if (idx >= 0) return idx;

  idx = FLAT_NOTES.indexOf(normalized);
  if (idx >= 0) return idx;

  // Handle double sharps/flats or other edge cases
  const base = normalized[0].toUpperCase();
  let baseIdx = SHARP_NOTES.indexOf(base);
  if (baseIdx < 0) return -1;

  for (let i = 1; i < normalized.length; i++) {
    if (normalized[i] === "#") baseIdx++;
    else if (normalized[i] === "b") baseIdx--;
  }

  return ((baseIdx % 12) + 12) % 12;
}

/**
 * Build the major scale for a given key, returning semitone values for degrees 1-7.
 */
function buildMajorScale(keySemitone: number): number[] {
  return MAJOR_SCALE_INTERVALS.map((interval) => (keySemitone + interval) % 12);
}

/**
 * Convert a semitone to a Nashville number relative to the key.
 * Returns the number (1-7) with optional accidental prefix (b or #).
 */
function semitoneToNashville(semitone: number, scale: number[]): string {
  // Check for exact match in the scale
  const exactIdx = scale.indexOf(semitone);
  if (exactIdx >= 0) {
    return String(exactIdx + 1);
  }

  // Check for flat (one semitone below a scale degree)
  const sharpIdx = scale.indexOf((semitone + 1) % 12);
  if (sharpIdx >= 0) {
    return `b${sharpIdx + 1}`;
  }

  // Check for sharp (one semitone above a scale degree)
  const flatIdx = scale.indexOf((semitone + 11) % 12);
  if (flatIdx >= 0) {
    return `#${flatIdx + 1}`;
  }

  // Fallback: shouldn't happen with 12 semitones and 7 scale degrees
  return "?";
}

/**
 * Parse a chord symbol into its root note, quality, and optional bass note.
 *
 * Examples:
 *   "Am7"   → { root: "A", quality: "m7", bass: null }
 *   "G/B"   → { root: "G", quality: "", bass: "B" }
 *   "F#m"   → { root: "F#", quality: "m", bass: null }
 *   "Bbmaj7" → { root: "Bb", quality: "maj7", bass: null }
 *   "Eb/G"  → { root: "Eb", quality: "", bass: "G" }
 */
interface ParsedChord {
  root: string;
  quality: string;
  bass: string | null;
}

function parseChord(chord: string): ParsedChord | null {
  if (!chord || chord.trim() === "") return null;

  const trimmed = chord.trim();

  // Match: root note (letter + optional # or b), then quality, then optional /bass
  const match = trimmed.match(
    /^([A-Ga-g][#b♯♭]?)(.*?)(?:\/([A-Ga-g][#b♯♭]?))?$/
  );

  if (!match) return null;

  return {
    root: match[1][0].toUpperCase() + (match[1].slice(1) || ""),
    quality: match[2] || "",
    bass: match[3] ? match[3][0].toUpperCase() + (match[3].slice(1) || "") : null,
  };
}

/**
 * Convert a single chord symbol to Nashville Number notation.
 *
 * @param chord - The chord symbol (e.g. "Am7", "G/B", "F#m")
 * @param key - The key of the song (e.g. "C", "G", "Bb", "F#m")
 * @returns The Nashville number representation (e.g. "6m7", "5/7", "#4m")
 */
export function chordToNashville(chord: string, key: string): string {
  const parsed = parseChord(chord);
  if (!parsed) return chord; // Return original if unparseable

  // Parse the key - strip minor indicator for scale building
  const keyRoot = key.replace(/m$|min$|minor$/i, "");
  const keySemitone = noteToSemitone(keyRoot);
  if (keySemitone < 0) return chord; // Unknown key

  const scale = buildMajorScale(keySemitone);

  // Convert root
  const rootSemitone = noteToSemitone(parsed.root);
  if (rootSemitone < 0) return chord;
  const rootNumber = semitoneToNashville(rootSemitone, scale);

  // Convert bass note if present
  let bassNumber = "";
  if (parsed.bass) {
    const bassSemitone = noteToSemitone(parsed.bass);
    if (bassSemitone >= 0) {
      bassNumber = "/" + semitoneToNashville(bassSemitone, scale);
    }
  }

  return rootNumber + parsed.quality + bassNumber;
}

/**
 * Convert all chords in a chord line string to Nashville numbers.
 * Preserves spacing/alignment.
 */
export function convertChordLineToNashville(chordLine: string, key: string): string {
  if (!chordLine.trim()) return chordLine;

  // Replace each chord token while preserving whitespace
  return chordLine.replace(/\S+/g, (token) => {
    return chordToNashville(token, key);
  });
}

/**
 * Detect the key from ABC notation header.
 */
export function detectKeyFromAbc(abc: string): string {
  const match = abc.match(/^K:\s*(.+)$/m);
  if (!match) return "C"; // Default to C

  const keyStr = match[1].trim();
  // Extract just the key letter and accidental, ignoring mode indicators
  const keyMatch = keyStr.match(/^([A-G][#b♯♭]?)\s*(m|min|minor|maj|major|mix|dor|lyd|phr|loc)?/i);
  if (!keyMatch) return "C";

  return keyMatch[1] + (keyMatch[2] && /^m(in|inor)?$/i.test(keyMatch[2]) ? "m" : "");
}
