/**
 * Capo Chart Logic
 *
 * Calculates equivalent open chord shapes for each capo position (1-9).
 * Identifies "easy" open keys and highlights recommended capo positions
 * for guitarists who prefer simpler chord voicings.
 */

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

/** Enharmonic mappings for display */
const ENHARMONIC_DISPLAY: Record<string, string> = {
  "C#": "Db",
  "D#": "Eb",
  "F#": "F#/Gb",
  "G#": "Ab",
  "A#": "Bb",
};

/** Keys that are considered "easy" for open chord guitar playing */
const EASY_MAJOR_KEYS = new Set(["C", "G", "D", "A", "E"]);
const EASY_MINOR_KEYS = new Set(["Am", "Em", "Dm"]);

/** Common open chord shapes that are easy to play */
const EASY_OPEN_CHORDS = new Set([
  "C", "G", "D", "A", "E", "F",
  "Am", "Em", "Dm",
  "C7", "G7", "D7", "A7", "E7", "B7",
  "Cmaj7", "Gmaj7", "Dmaj7", "Amaj7", "Emaj7",
  "Am7", "Em7", "Dm7",
  "Cadd9", "Gadd9", "Dadd9",
  "Csus2", "Dsus2", "Asus2",
  "Csus4", "Dsus4", "Asus4", "Esus4",
]);

export interface CapoPosition {
  /** Capo fret number (0 = no capo, 1-9) */
  fret: number;
  /** The key you'd play in (open chord shapes) */
  playKey: string;
  /** The original chords transposed to what you'd actually finger */
  chordShapes: Record<string, string>;
  /** How many of the song's chords are "easy" open chords at this position */
  easyChordCount: number;
  /** Total number of unique chords in the song */
  totalChords: number;
  /** Percentage of easy chords (0-100) */
  easyPercent: number;
  /** Whether this is a recommended position */
  recommended: boolean;
  /** Whether the play key is an easy open key */
  isEasyKey: boolean;
}

/**
 * Get the index of a note in the chromatic scale.
 * Handles flats by converting to sharps.
 */
function noteIndex(note: string): number {
  const flatToSharp: Record<string, string> = {
    Db: "C#",
    Eb: "D#",
    Fb: "E",
    Gb: "F#",
    Ab: "G#",
    Bb: "A#",
    Cb: "B",
  };
  const normalized = flatToSharp[note] || note;
  const idx = NOTES.indexOf(normalized as (typeof NOTES)[number]);
  return idx >= 0 ? idx : 0;
}

/**
 * Transpose a note down by a number of semitones (what you'd finger with a capo).
 */
function transposeDown(note: string, semitones: number): string {
  const idx = noteIndex(note);
  const newIdx = ((idx - semitones) % 12 + 12) % 12;
  return NOTES[newIdx];
}

/**
 * Parse a chord symbol into root note and quality.
 * e.g., "Am7" -> { root: "A", quality: "m7" }
 *       "F#m" -> { root: "F#", quality: "m" }
 *       "Bb"  -> { root: "Bb", quality: "" }
 */
function parseChord(chord: string): { root: string; quality: string } {
  const match = chord.match(/^([A-G][#b]?)(.*)/);
  if (!match) return { root: chord, quality: "" };
  return { root: match[1], quality: match[2] };
}

/**
 * Transpose a single chord symbol down by semitones.
 */
function transposeChord(chord: string, semitones: number): string {
  // Handle slash chords (e.g., "C/G")
  if (chord.includes("/")) {
    const [main, bass] = chord.split("/");
    const transposedMain = transposeChord(main, semitones);
    const transposedBass = transposeChord(bass, semitones);
    return `${transposedMain}/${transposedBass}`;
  }

  const { root, quality } = parseChord(chord);
  const newRoot = transposeDown(root, semitones);

  // Use flat notation for certain keys to be more readable
  const displayRoot = ENHARMONIC_DISPLAY[newRoot]?.split("/")[0] || newRoot;
  return displayRoot + quality;
}

/**
 * Check if a chord is an "easy" open chord.
 */
function isEasyChord(chord: string): boolean {
  // Strip slash bass notes for the check
  const mainChord = chord.includes("/") ? chord.split("/")[0] : chord;
  return EASY_OPEN_CHORDS.has(mainChord);
}

/**
 * Determine if a key (play key) is an easy open key.
 */
function isEasyOpenKey(key: string): boolean {
  if (EASY_MAJOR_KEYS.has(key)) return true;
  if (EASY_MINOR_KEYS.has(key)) return true;
  // Check with enharmonic equivalents
  const flatToSharp: Record<string, string> = {
    Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#",
  };
  const normalized = flatToSharp[key] || key;
  return EASY_MAJOR_KEYS.has(normalized) || EASY_MINOR_KEYS.has(normalized);
}

/**
 * Extract the key root from a key string like "C major", "Am", "F# minor", etc.
 */
function extractKeyRoot(key: string): string {
  // First handle explicit words like "major", "minor", "min", "maj"
  let cleaned = key.replace(/\s+(major|minor|maj|min)\b/gi, (match) => {
    if (/minor|min/i.test(match)) return "m";
    return "";
  }).trim();
  // If the key is just a note + "m" (e.g. "Am", "F#m"), keep it as-is
  return cleaned || key;
}

/**
 * Calculate capo chart for all positions (0-9) given a song's key and chords.
 */
export function calculateCapoChart(
  songKey: string,
  chords: string[]
): CapoPosition[] {
  const keyRoot = extractKeyRoot(songKey);
  const uniqueChords = Array.from(new Set(chords.filter(c => c && c.trim())));
  const positions: CapoPosition[] = [];

  for (let fret = 0; fret <= 9; fret++) {
    const chordShapes: Record<string, string> = {};
    let easyCount = 0;

    // Calculate the key you'd play in
    const playKeyRoot = transposeDown(keyRoot.replace(/m$/, ""), fret);
    const isMinor = keyRoot.endsWith("m");
    const displayPlayKey = (ENHARMONIC_DISPLAY[playKeyRoot]?.split("/")[0] || playKeyRoot) +
      (isMinor ? "m" : "");

    for (const chord of uniqueChords) {
      const transposed = transposeChord(chord, fret);
      chordShapes[chord] = transposed;
      if (isEasyChord(transposed)) {
        easyCount++;
      }
    }

    const easyPercent = uniqueChords.length > 0
      ? Math.round((easyCount / uniqueChords.length) * 100)
      : 0;

    const isEasyKey = isEasyOpenKey(displayPlayKey);

    positions.push({
      fret,
      playKey: displayPlayKey,
      chordShapes,
      easyChordCount: easyCount,
      totalChords: uniqueChords.length,
      easyPercent,
      recommended: easyPercent >= 75 && isEasyKey,
      isEasyKey,
    });
  }

  return positions;
}

/**
 * Get the best capo positions sorted by ease of playing.
 * Returns the top positions where the most chords are easy open shapes.
 */
export function getBestCapoPositions(
  songKey: string,
  chords: string[],
  maxResults = 3
): CapoPosition[] {
  const all = calculateCapoChart(songKey, chords);

  return all
    .filter(p => p.fret > 0) // Exclude no-capo position
    .sort((a, b) => {
      // Prioritize recommended positions
      if (a.recommended !== b.recommended) return a.recommended ? -1 : 1;
      // Then by easy chord percentage
      if (a.easyPercent !== b.easyPercent) return b.easyPercent - a.easyPercent;
      // Then by easy key
      if (a.isEasyKey !== b.isEasyKey) return a.isEasyKey ? -1 : 1;
      // Then by lower fret (more comfortable)
      return a.fret - b.fret;
    })
    .slice(0, maxResults);
}

/**
 * Get a display-friendly name for the capo position.
 */
export function getCapoLabel(fret: number): string {
  if (fret === 0) return "No Capo";
  const ordinal = fret === 1 ? "1st" : fret === 2 ? "2nd" : fret === 3 ? "3rd" : `${fret}th`;
  return `Capo ${ordinal} Fret`;
}
