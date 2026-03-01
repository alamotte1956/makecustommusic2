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

// ─── Capo Recommendation ───

/**
 * Open chord shapes that are easy to play on guitar.
 * These are the "beginner-friendly" shapes that don't require barre chords.
 * The key is the chord root + quality, the value is the "ease score" (lower = easier).
 */
const OPEN_CHORD_SHAPES: Record<string, number> = {
  // Major open chords (easiest)
  "C": 1, "A": 1, "G": 1, "E": 1, "D": 1,
  // Minor open chords
  "Am": 1, "Em": 1, "Dm": 2,
  // Seventh chords in open position
  "A7": 2, "D7": 2, "E7": 2, "G7": 2, "C7": 2, "B7": 2,
  // Minor seventh open chords
  "Am7": 2, "Em7": 2, "Dm7": 3,
  // Sus chords in open position
  "Asus2": 2, "Asus4": 2, "Dsus2": 2, "Dsus4": 2, "Esus4": 2,
  // Add9 chords
  "Cadd9": 3, "Gadd9": 3,
  // Major 7
  "Cmaj7": 3, "Fmaj7": 3, "Dmaj7": 3,
};

/**
 * Extract the root note and quality from a chord string.
 * e.g., "F#m7" → { root: "F#", quality: "m7" }
 *       "Bbmaj7" → { root: "Bb", quality: "maj7" }
 *       "Am/G" → { root: "A", quality: "m" } (ignores bass note)
 */
function parseChord(chord: string): { root: string; quality: string } | null {
  // Remove bass note for slash chords
  const mainChord = chord.split("/")[0].trim();
  const match = mainChord.match(/^([A-G][#b]?)(.*)/)
  if (!match) return null;
  return { root: match[1], quality: match[2] };
}

/**
 * Check if a chord (after transposition) maps to an easy open shape.
 * Returns the ease score (1-3) or 0 if it's not an open chord.
 */
function getOpenChordScore(chordRoot: string, quality: string): number {
  // Normalize the quality to match our lookup table
  // Strip leading quality indicators to find the base quality
  const baseQuality = quality.replace(/\/.*$/, ""); // Remove slash bass
  
  // Try exact match first (root + full quality)
  const fullChord = chordRoot + baseQuality;
  if (OPEN_CHORD_SHAPES[fullChord] !== undefined) {
    return OPEN_CHORD_SHAPES[fullChord];
  }
  
  // Try simplified quality (just major or minor)
  const isMinor = baseQuality.startsWith("m") && !baseQuality.startsWith("maj");
  const simpleChord = chordRoot + (isMinor ? "m" : "");
  if (OPEN_CHORD_SHAPES[simpleChord] !== undefined) {
    // Slightly higher score for extended chords that simplify to open shapes
    return OPEN_CHORD_SHAPES[simpleChord] + 1;
  }
  
  return 0; // Not an open chord shape
}

export interface CapoRecommendation {
  /** The recommended capo fret position (0 = no capo) */
  capoFret: number;
  /** The original key of the song */
  originalKey: string;
  /** The key the shapes will be played in (with capo) */
  capoKey: string;
  /** The simplified chord names as played with the capo */
  simplifiedChords: string[];
  /** Human-readable explanation of why this capo position is recommended */
  reason: string;
  /** Score representing how "easy" this capo position makes the song (higher = easier) */
  score: number;
}

/**
 * Recommend the best capo position for a set of chords.
 * Analyzes all 12 possible capo positions (frets 0-11) and scores each
 * based on how many chords become easy open shapes.
 *
 * @param chords - Array of chord strings used in the song (e.g., ["Bb", "Eb", "F", "Gm"])
 * @param currentKey - The current key of the song (e.g., "Bb")
 * @returns The best capo recommendation, or null if no capo improves playability
 */
export function recommendCapo(chords: string[], currentKey: string): CapoRecommendation | null {
  if (!chords || chords.length === 0) return null;

  // Deduplicate chords (just the main chord, ignoring slash bass)
  const uniqueChords = Array.from(new Set(chords.map(c => c.split("/")[0].trim())));
  const parsedChords = uniqueChords.map(parseChord).filter(Boolean) as { root: string; quality: string }[];
  
  if (parsedChords.length === 0) return null;

  // Score the current position (capo 0) as baseline
  let bestResult: CapoRecommendation | null = null;
  let bestScore = -1;

  // Evaluate capo positions 0 through 9 (beyond 9 is impractical)
  for (let capoFret = 0; capoFret <= 9; capoFret++) {
    // When you place a capo on fret N, you transpose DOWN by N semitones
    // to find the shapes you actually play.
    // E.g., song in Bb with capo on fret 3: you play shapes in G (Bb - 3 semitones = G)
    const semitonesDown = capoFret; // Transpose down to find the played shapes
    
    let totalScore = 0;
    let openCount = 0;
    const simplifiedChords: string[] = [];

    for (const { root, quality } of parsedChords) {
      const rootIdx = noteToIndex(root);
      if (rootIdx < 0) continue;

      // Transpose root down by capoFret semitones
      const newIdx = ((rootIdx - semitonesDown) + 12) % 12;
      const newRoot = SHARP_NOTES[newIdx];
      const score = getOpenChordScore(newRoot, quality);

      if (score > 0) {
        openCount++;
        totalScore += (4 - score); // Invert so easier chords score higher
      }
      simplifiedChords.push(newRoot + quality);
    }

    // Penalize high capo positions slightly (playing at fret 7+ is less comfortable)
    const positionPenalty = capoFret > 5 ? (capoFret - 5) * 0.5 : 0;
    const finalScore = totalScore - positionPenalty;

    // Only consider positions where at least half the chords become open
    const openRatio = openCount / parsedChords.length;
    if (openRatio < 0.5) continue;

    if (finalScore > bestScore) {
      bestScore = finalScore;

      // Determine the "capo key" (the key of the shapes being played)
      const keyIdx = noteToIndex(currentKey.replace("m", ""));
      const isMinor = currentKey.endsWith("m");
      const capoKeyIdx = ((keyIdx - semitonesDown) + 12) % 12;
      const capoKey = SHARP_NOTES[capoKeyIdx] + (isMinor ? "m" : "");

      bestResult = {
        capoFret,
        originalKey: currentKey,
        capoKey,
        simplifiedChords,
        score: finalScore,
        reason: capoFret === 0
          ? `All chords are already easy open shapes in ${currentKey}.`
          : `Capo on fret ${capoFret} lets you play ${capoKey} shapes (${openCount} of ${parsedChords.length} chords become open). Much easier fingering!`,
      };
    }
  }

  // Only return a capo recommendation if it's better than no capo
  // and the capo fret is > 0 (otherwise it's just "no capo needed")
  if (bestResult && bestResult.capoFret === 0) {
    // No capo needed — chords are already open
    return bestResult;
  }

  // Check if capo actually improves over no-capo
  if (bestResult) {
    // Score the no-capo position
    let noCapoScore = 0;
    for (const { root, quality } of parsedChords) {
      const score = getOpenChordScore(root, quality);
      if (score > 0) noCapoScore += (4 - score);
    }

    // Only recommend capo if it meaningfully improves the score
    if (bestResult.score <= noCapoScore) {
      return {
        capoFret: 0,
        originalKey: currentKey,
        capoKey: currentKey,
        simplifiedChords: uniqueChords,
        score: noCapoScore,
        reason: `Chords are already easy to play in ${currentKey} — no capo needed.`,
      };
    }
  }

  return bestResult;
}

/**
 * Get all viable capo positions ranked by score.
 * Useful for showing the user multiple options.
 */
export function getAllCapoOptions(chords: string[], currentKey: string): CapoRecommendation[] {
  if (!chords || chords.length === 0) return [];

  const uniqueChords = Array.from(new Set(chords.map(c => c.split("/")[0].trim())));
  const parsedChords = uniqueChords.map(parseChord).filter(Boolean) as { root: string; quality: string }[];
  if (parsedChords.length === 0) return [];

  const results: CapoRecommendation[] = [];

  for (let capoFret = 0; capoFret <= 9; capoFret++) {
    const semitonesDown = capoFret;
    let totalScore = 0;
    let openCount = 0;
    const simplifiedChords: string[] = [];

    for (const { root, quality } of parsedChords) {
      const rootIdx = noteToIndex(root);
      if (rootIdx < 0) continue;
      const newIdx = ((rootIdx - semitonesDown) + 12) % 12;
      const newRoot = SHARP_NOTES[newIdx];
      const score = getOpenChordScore(newRoot, quality);
      if (score > 0) {
        openCount++;
        totalScore += (4 - score);
      }
      simplifiedChords.push(newRoot + quality);
    }

    const positionPenalty = capoFret > 5 ? (capoFret - 5) * 0.5 : 0;
    const finalScore = totalScore - positionPenalty;
    const openRatio = openCount / parsedChords.length;

    if (openRatio >= 0.4) {
      const keyIdx = noteToIndex(currentKey.replace("m", ""));
      const isMinor = currentKey.endsWith("m");
      const capoKeyIdx = ((keyIdx - semitonesDown) + 12) % 12;
      const capoKey = SHARP_NOTES[capoKeyIdx] + (isMinor ? "m" : "");

      results.push({
        capoFret,
        originalKey: currentKey,
        capoKey,
        simplifiedChords,
        score: finalScore,
        reason: capoFret === 0
          ? `Play open shapes in ${currentKey}.`
          : `Capo fret ${capoFret}: play ${capoKey} shapes (${openCount}/${parsedChords.length} open).`,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score);
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
