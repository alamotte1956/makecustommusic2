/**
 * Nashville Number System converter
 *
 * Converts standard chord names (C, Am, F, G7) to Nashville numbers (1, 6m, 4, 5⁷)
 * based on the key of the song. This is the format preferred by many session musicians,
 * worship teams, and Nashville studio players.
 *
 * Nashville Number System basics:
 * - Each chord is represented by its scale degree number (1-7)
 * - Major chords are just the number: 1, 4, 5
 * - Minor chords add 'm': 2m, 3m, 6m
 * - Seventh chords add '7': 5⁷, 1⁷
 * - Diminished uses '°': 7°
 * - Augmented uses '+': 1+
 * - Slash chords use '/': 1/3 (e.g., C/E in key of C)
 * - Suspended chords: 1sus, 1sus2
 * - Added tones: 1add9, 2m⁷
 */

// All 12 chromatic notes in both sharp and flat spellings
const SHARP_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_NOTES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

// Map note names to semitone values (0-11)
const NOTE_TO_SEMITONE: Record<string, number> = {
  "C": 0, "C#": 1, "Db": 1,
  "D": 2, "D#": 3, "Eb": 3,
  "E": 4, "Fb": 4, "E#": 5,
  "F": 5, "F#": 6, "Gb": 6,
  "G": 7, "G#": 8, "Ab": 8,
  "A": 9, "A#": 10, "Bb": 10,
  "B": 11, "Cb": 11, "B#": 0,
};

// Major scale intervals in semitones from root
const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];

/**
 * Parse a chord string into its root note and quality/extensions.
 * E.g., "Am7" → { root: "A", quality: "m7" }
 *       "F#m" → { root: "F#", quality: "m" }
 *       "Bb/D" → { root: "Bb", quality: "/D" }
 */
function parseChord(chord: string): { root: string; quality: string; bass?: string } | null {
  if (!chord || chord.trim() === "") return null;
  const trimmed = chord.trim();

  // Match root note: letter + optional # or b
  const rootMatch = trimmed.match(/^([A-G][#b]?)/);
  if (!rootMatch) return null;

  const root = rootMatch[1];
  let quality = trimmed.slice(root.length);

  // Check for slash bass note
  let bass: string | undefined;
  const slashIdx = quality.indexOf("/");
  if (slashIdx >= 0) {
    const bassStr = quality.slice(slashIdx + 1);
    const bassMatch = bassStr.match(/^([A-G][#b]?)/);
    if (bassMatch) {
      bass = bassMatch[1];
      quality = quality.slice(0, slashIdx);
    }
  }

  return { root, quality, bass };
}

/**
 * Get the semitone value for a note name.
 */
function getSemitone(note: string): number | null {
  const val = NOTE_TO_SEMITONE[note];
  return val !== undefined ? val : null;
}

/**
 * Convert a semitone interval from the key root to a Nashville number (1-7).
 * Returns the closest scale degree and whether it's sharp or flat.
 */
function semitoneToNashville(interval: number): { degree: number; accidental: string } {
  // Normalize to 0-11
  const normalized = ((interval % 12) + 12) % 12;

  // Check exact match with major scale
  const exactIdx = MAJOR_SCALE_INTERVALS.indexOf(normalized);
  if (exactIdx >= 0) {
    return { degree: exactIdx + 1, accidental: "" };
  }

  // Prefer flat of the next scale degree (Nashville convention: b7 not #6)
  // Check flat first, then sharp
  for (let i = 0; i < MAJOR_SCALE_INTERVALS.length; i++) {
    if (((MAJOR_SCALE_INTERVALS[i] - 1) + 12) % 12 === normalized) {
      return { degree: i + 1, accidental: "b" };
    }
  }

  // Then check sharp of a scale degree (one semitone above)
  for (let i = 0; i < MAJOR_SCALE_INTERVALS.length; i++) {
    if ((MAJOR_SCALE_INTERVALS[i] + 1) % 12 === normalized) {
      return { degree: i + 1, accidental: "#" };
    }
  }

  // Fallback — shouldn't happen with 12 semitones
  return { degree: 1, accidental: "" };
}

/**
 * Format the Nashville number with quality suffixes.
 * Converts standard chord quality notation to Nashville-style.
 */
function formatNashvilleQuality(quality: string): string {
  // Normalize quality string
  let q = quality.trim();

  // Common quality mappings
  if (q === "" || q === "maj" || q === "M") return "";
  if (q === "m" || q === "min" || q === "-") return "m";
  if (q === "dim" || q === "°" || q === "o") return "°";
  if (q === "aug" || q === "+") return "+";
  if (q === "sus") return "sus";
  if (q === "sus4") return "sus4";
  if (q === "sus2") return "sus2";

  // Seventh chords
  if (q === "7") return "7";
  if (q === "maj7" || q === "M7" || q === "Δ7") return "maj7";
  if (q === "m7" || q === "min7" || q === "-7") return "m7";
  if (q === "dim7" || q === "°7" || q === "o7") return "°7";
  if (q === "m7b5" || q === "ø" || q === "ø7") return "ø";

  // Extended chords
  if (q === "9") return "9";
  if (q === "m9" || q === "min9") return "m9";
  if (q === "maj9" || q === "M9") return "maj9";
  if (q === "11") return "11";
  if (q === "13") return "13";

  // Add chords
  if (q === "add9" || q === "add2") return "add9";
  if (q === "add4" || q === "add11") return "add11";
  if (q === "6") return "6";
  if (q === "m6" || q === "min6") return "m6";

  // Power chord
  if (q === "5") return "5";

  // Return as-is for anything else
  return q;
}

/**
 * Convert a single chord name to Nashville Number notation.
 *
 * @param chord - Standard chord name (e.g., "Am7", "F#m", "Bb/D")
 * @param key - Key of the song (e.g., "C", "G", "Bb")
 * @returns Nashville number string (e.g., "6m7", "#4m", "b7/2")
 */
export function chordToNashville(chord: string, key: string): string {
  const parsed = parseChord(chord);
  if (!parsed) return chord; // Return as-is if unparseable

  const keySemitone = getSemitone(key);
  const rootSemitone = getSemitone(parsed.root);
  if (keySemitone === null || rootSemitone === null) return chord;

  // Calculate interval from key root
  const interval = ((rootSemitone - keySemitone) + 12) % 12;
  const { degree, accidental } = semitoneToNashville(interval);
  const quality = formatNashvilleQuality(parsed.quality);

  let result = `${accidental}${degree}${quality}`;

  // Handle slash bass note
  if (parsed.bass) {
    const bassSemitone = getSemitone(parsed.bass);
    if (bassSemitone !== null) {
      const bassInterval = ((bassSemitone - keySemitone) + 12) % 12;
      const { degree: bassDegree, accidental: bassAcc } = semitoneToNashville(bassInterval);
      result += `/${bassAcc}${bassDegree}`;
    }
  }

  return result;
}

/**
 * Convert all chord symbols in a chord line to Nashville numbers.
 * Preserves spacing/positioning so chords stay aligned with lyrics.
 *
 * @param chordLine - A line of chord symbols (e.g., "  Am    F    C    G")
 * @param key - Key of the song
 * @returns The same line with Nashville numbers (e.g., "  6m    4    1    5")
 */
export function convertChordLineToNashville(chordLine: string, key: string): string {
  if (!chordLine || !key) return chordLine;

  // Match chord symbols in the line, preserving their positions
  // A chord is: a capital letter, optional # or b, followed by optional quality chars
  // We need to be careful to preserve spacing for alignment with lyrics
  const result: string[] = [];
  let i = 0;

  while (i < chordLine.length) {
    // Skip whitespace
    if (chordLine[i] === " " || chordLine[i] === "\t") {
      result.push(chordLine[i]);
      i++;
      continue;
    }

    // Try to match a chord starting at position i
    const remaining = chordLine.slice(i);
    const chordMatch = remaining.match(
      /^([A-G][#b]?)(m(?:aj|in)?7?|M7?|dim7?|aug|[°ø+]7?|sus[24]?|add[249]|[679]|11|13|7|5)?(\/?[A-G][#b]?)?/
    );

    if (chordMatch && chordMatch[0].length > 0) {
      const originalChord = chordMatch[0];
      const nashville = chordToNashville(originalChord, key);

      // Pad or trim to maintain alignment
      if (nashville.length < originalChord.length) {
        result.push(nashville + " ".repeat(originalChord.length - nashville.length));
      } else {
        result.push(nashville);
        // If Nashville is longer, we might eat into the next space
        // but that's acceptable for readability
      }
      i += originalChord.length;
    } else {
      // Not a chord character, just copy it
      result.push(chordLine[i]);
      i++;
    }
  }

  return result.join("");
}

/**
 * Get the Nashville number legend for a given key.
 * Shows the mapping of numbers to chord names for reference.
 *
 * @param key - Key of the song
 * @returns Array of { number, chord } pairs for the major scale
 */
export function getNashvilleLegend(key: string): { number: string; chord: string; quality: string }[] {
  const keySemitone = getSemitone(key);
  if (keySemitone === null) return [];

  // Determine if key uses flats or sharps
  const useFlats = ["F", "Bb", "Eb", "Ab", "Db", "Gb"].includes(key);
  const noteNames = useFlats ? FLAT_NOTES : SHARP_NOTES;

  // Natural qualities for each scale degree in a major key
  const naturalQualities = ["", "m", "m", "", "", "m", "°"];
  const qualityLabels = ["Major", "minor", "minor", "Major", "Major", "minor", "dim"];

  return MAJOR_SCALE_INTERVALS.map((interval, idx) => {
    const noteSemitone = (keySemitone + interval) % 12;
    const noteName = noteNames[noteSemitone];
    const quality = naturalQualities[idx];
    return {
      number: `${idx + 1}${quality}`,
      chord: `${noteName}${quality}`,
      quality: qualityLabels[idx],
    };
  });
}
