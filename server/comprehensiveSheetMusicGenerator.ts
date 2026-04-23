/**
 * Comprehensive Sheet Music Generator — Algorithmic Fallback
 *
 * Used when the LLM fails to produce valid ABC notation.
 * Generates musically coherent melodies using proper melodic patterns,
 * chord tones, passing tones, and rhythmic variety — NOT scale runs.
 */

interface GeneratorOptions {
  title: string;
  key?: string;
  timeSignature?: string;
  tempo?: number;
  lyrics?: string;
}

// ─── Scale definitions for each key ─────────────────────────────────────────

interface ScaleInfo {
  notes: string[];        // Scale degrees as ABC note names (octave 4-5)
  chordProg: string[];    // 8-chord progression (2 per section)
  chordTones: Record<string, number[]>; // Chord name → scale degree indices
}

const SCALES: Record<string, ScaleInfo> = {
  C: {
    notes: ["C", "D", "E", "F", "G", "A", "B", "c", "d", "e"],
    chordProg: ["C", "Am", "F", "G", "C", "F", "Dm", "G", "Am", "F", "C", "G", "Em", "F", "G", "C"],
    chordTones: { C: [0, 2, 4], Am: [5, 7, 2], F: [3, 5, 0], G: [4, 6, 1], Dm: [1, 3, 5], Em: [2, 4, 6] },
  },
  G: {
    notes: ["G", "A", "B", "c", "d", "e", "^f", "g", "a", "b"],
    chordProg: ["G", "Em", "C", "D", "G", "C", "Am", "D", "Em", "C", "G", "D", "Bm", "C", "D", "G"],
    chordTones: { G: [0, 2, 4], Em: [5, 7, 2], C: [3, 5, 0], D: [4, 6, 1], Am: [1, 3, 5], Bm: [2, 4, 6] },
  },
  D: {
    notes: ["D", "E", "^F", "G", "A", "B", "^c", "d", "e", "^f"],
    chordProg: ["D", "Bm", "G", "A", "D", "G", "Em", "A", "Bm", "G", "D", "A", "F#m", "G", "A", "D"],
    chordTones: { D: [0, 2, 4], Bm: [5, 7, 2], G: [3, 5, 0], A: [4, 6, 1], Em: [1, 3, 5], "F#m": [2, 4, 6] },
  },
  A: {
    notes: ["A", "B", "^c", "d", "e", "^f", "^g", "a", "b", "^c'"],
    chordProg: ["A", "F#m", "D", "E", "A", "D", "Bm", "E", "F#m", "D", "A", "E", "C#m", "D", "E", "A"],
    chordTones: { A: [0, 2, 4], "F#m": [5, 7, 2], D: [3, 5, 0], E: [4, 6, 1], Bm: [1, 3, 5], "C#m": [2, 4, 6] },
  },
  F: {
    notes: ["F", "G", "A", "_B", "c", "d", "e", "f", "g", "a"],
    chordProg: ["F", "Dm", "Bb", "C", "F", "Bb", "Gm", "C", "Dm", "Bb", "F", "C", "Am", "Bb", "C", "F"],
    chordTones: { F: [0, 2, 4], Dm: [5, 7, 2], Bb: [3, 5, 0], C: [4, 6, 1], Gm: [1, 3, 5], Am: [2, 4, 6] },
  },
  Am: {
    notes: ["A", "B", "C", "D", "E", "F", "G", "a", "b", "c'"],
    chordProg: ["Am", "F", "C", "G", "Am", "Dm", "E", "Am", "F", "G", "Am", "E", "Dm", "F", "G", "Am"],
    chordTones: { Am: [0, 2, 4], F: [5, 7, 2], C: [3, 5, 0], G: [4, 6, 1], Dm: [1, 3, 5], E: [2, 4, 6] },
  },
  Em: {
    notes: ["E", "^F", "G", "A", "B", "C", "D", "e", "^f", "g"],
    chordProg: ["Em", "C", "G", "D", "Em", "Am", "B", "Em", "C", "D", "Em", "B", "Am", "C", "D", "Em"],
    chordTones: { Em: [0, 2, 4], C: [5, 7, 2], G: [3, 5, 0], D: [4, 6, 1], Am: [1, 3, 5], B: [2, 4, 6] },
  },
};

// ─── Melodic phrase patterns ────────────────────────────────────────────────
// Each pattern is an array of [scaleDegreeOffset, duration] pairs.
// scaleDegreeOffset is relative to the chord root's scale degree.
// duration is in eighth notes (1=eighth, 2=quarter, 4=half, 8=whole).

type PhrasePattern = [number, number][]; // [degreeOffset, duration]

const VERSE_PATTERNS: PhrasePattern[] = [
  // Pattern 1: Gentle stepwise with rest
  [[0, 2], [1, 2], [2, 2], [0, 2], [-1, 4], [0, 4]],
  // Pattern 2: Leap up, step down
  [[0, 2], [4, 2], [3, 2], [2, 2], [1, 4], [0, 4]],
  // Pattern 3: Syncopated with rests
  [[0, 2], [-99, 1], [2, 1], [1, 2], [0, 2], [2, 2], [-1, 2], [-99, 2]],
  // Pattern 4: Dotted rhythm
  [[0, 3], [1, 1], [2, 2], [0, 2], [-1, 3], [-2, 1], [0, 4]],
  // Pattern 5: Arch shape
  [[0, 2], [1, 2], [3, 2], [4, 2], [3, 2], [1, 2], [0, 4]],
  // Pattern 6: Call and response feel
  [[0, 2], [2, 2], [4, 4], [-99, 2], [3, 2], [1, 2], [0, 4]],
];

const CHORUS_PATTERNS: PhrasePattern[] = [
  // Pattern 1: Energetic leap
  [[0, 2], [4, 2], [5, 4], [4, 2], [2, 2], [0, 4]],
  // Pattern 2: High sustained
  [[4, 4], [5, 2], [4, 2], [2, 2], [3, 2], [4, 4]],
  // Pattern 3: Rhythmic drive
  [[0, 1], [0, 1], [2, 2], [4, 2], [5, 2], [4, 4], [2, 2]],
  // Pattern 4: Soaring melody
  [[2, 2], [4, 2], [5, 2], [7, 2], [5, 4], [4, 4]],
  // Pattern 5: Anthemic
  [[4, 4], [4, 2], [5, 2], [4, 2], [2, 2], [0, 2], [2, 2]],
  // Pattern 6: Powerful resolution
  [[5, 2], [4, 2], [2, 2], [4, 2], [5, 4], [4, 4]],
];

const BRIDGE_PATTERNS: PhrasePattern[] = [
  // Pattern 1: Unexpected leap
  [[0, 4], [5, 2], [6, 2], [5, 4], [3, 4]],
  // Pattern 2: Descending sequence
  [[6, 2], [5, 2], [4, 2], [3, 2], [2, 4], [0, 4]],
  // Pattern 3: Tension and release
  [[3, 2], [4, 2], [6, 4], [-99, 2], [5, 2], [4, 2], [2, 2]],
];

const INTRO_PATTERNS: PhrasePattern[] = [
  // Sparse, atmospheric
  [[0, 4], [-99, 4], [4, 4], [-99, 4]],
  [[0, 2], [2, 2], [4, 4], [-99, 4], [2, 4]],
  [[4, 4], [2, 4], [0, 4], [-99, 4]],
];

// ─── Seeded pseudo-random for deterministic but varied output ───────────────

function seedHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededPick<T>(arr: T[], seed: number, index: number): T {
  // Use a proper hash mixing function to avoid modular collisions
  let h = seed ^ (index * 2654435761);
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h = (h ^ (h >>> 16)) >>> 0;
  return arr[h % arr.length];
}

// ─── Main Generator ─────────────────────────────────────────────────────────

export function generateComprehensiveSheetMusic(options: GeneratorOptions): string {
  const {
    title,
    key = "C",
    timeSignature = "4/4",
    tempo = 120,
    lyrics = "",
  } = options;

  const scale = SCALES[key] || SCALES["C"];
  const seed = seedHash(title + key);
  const lines: string[] = [];

  // ABC Headers
  lines.push("X: 1");
  lines.push(`T: ${title}`);
  lines.push(`M: ${timeSignature}`);
  lines.push("L: 1/8");
  lines.push(`Q: 1/4=${tempo}`);
  lines.push(`K: ${key}`);

  // Song structure: Intro(4) + Verse1(8) + Chorus(8) + Verse2(8) + Chorus(8) + Bridge(4) + Chorus(8) + Outro(4) = 52 measures
  const sections: { name: string; measures: number; patterns: PhrasePattern[] }[] = [
    { name: "Intro", measures: 4, patterns: INTRO_PATTERNS },
    { name: "Verse 1", measures: 8, patterns: VERSE_PATTERNS },
    { name: "Chorus", measures: 8, patterns: CHORUS_PATTERNS },
    { name: "Verse 2", measures: 8, patterns: VERSE_PATTERNS },
    { name: "Chorus", measures: 8, patterns: CHORUS_PATTERNS },
    { name: "Bridge", measures: 4, patterns: BRIDGE_PATTERNS },
    { name: "Chorus", measures: 8, patterns: CHORUS_PATTERNS },
    { name: "Outro", measures: 4, patterns: INTRO_PATTERNS },
  ];

  let chordIdx = 0;
  let sectionSeed = seed;

  for (const section of sections) {
    lines.push(`% ${section.name}`);

    for (let m = 0; m < section.measures; m += 2) {
      // Pick a pattern for this 2-measure phrase
      const pattern = seededPick(section.patterns, sectionSeed, m);
      sectionSeed += 13;

      // Get chord for this measure
      const chord = scale.chordProg[chordIdx % scale.chordProg.length];
      const nextChord = scale.chordProg[(chordIdx + 1) % scale.chordProg.length];
      chordIdx++;

      // Get the root scale degree for this chord
      const chordRoot = (scale.chordTones[chord] || [0, 2, 4])[0];

      // Generate notes from the pattern
      let measureStr = `"${chord}" `;
      let eighthsInMeasure = 0;
      const beatsPerMeasure = timeSignature === "3/4" ? 6 : 8;
      let addedNextChord = false;

      for (const [degOffset, dur] of pattern) {
        if (eighthsInMeasure >= beatsPerMeasure * 2) break; // Stop at 2 measures

        // Check if we need to add bar line and next chord
        if (eighthsInMeasure === beatsPerMeasure && !addedNextChord) {
          measureStr += `| "${nextChord}" `;
          addedNextChord = true;
          chordIdx++;
        }

        if (degOffset === -99) {
          // Rest
          const restDur = Math.min(dur, beatsPerMeasure * 2 - eighthsInMeasure);
          if (restDur > 0) {
            measureStr += restDur === 1 ? "z " : `z${restDur} `;
            eighthsInMeasure += restDur;
          }
        } else {
          // Note
          const scaleDeg = ((chordRoot + degOffset) % scale.notes.length + scale.notes.length) % scale.notes.length;
          const note = scale.notes[scaleDeg];
          const noteDur = Math.min(dur, beatsPerMeasure * 2 - eighthsInMeasure);
          if (noteDur > 0) {
            measureStr += noteDur === 1 ? `${note} ` : `${note}${noteDur} `;
            eighthsInMeasure += noteDur;
          }
        }
      }

      // Fill remaining beats if pattern was too short
      while (eighthsInMeasure < beatsPerMeasure * 2) {
        if (eighthsInMeasure === beatsPerMeasure && !addedNextChord) {
          measureStr += `| "${nextChord}" `;
          addedNextChord = true;
          chordIdx++;
        }
        const chordRoot2 = (scale.chordTones[addedNextChord ? nextChord : chord] || [0, 2, 4])[0];
        const note = scale.notes[chordRoot2];
        const remaining = (addedNextChord ? beatsPerMeasure * 2 : beatsPerMeasure) - (eighthsInMeasure % beatsPerMeasure || beatsPerMeasure);
        const dur = Math.min(remaining > 0 ? remaining : 2, beatsPerMeasure * 2 - eighthsInMeasure);
        if (dur <= 0) break;
        measureStr += dur === 1 ? `${note} ` : `${note}${dur} `;
        eighthsInMeasure += dur;
      }

      // Ensure we have a bar line at the end
      if (!addedNextChord && eighthsInMeasure >= beatsPerMeasure) {
        measureStr += "| ";
      }
      measureStr += "|";

      lines.push(measureStr.trim());
    }
  }

  return lines.join("\n");
}

/**
 * Generate ABC notation with lyrics alignment
 */
export function generateComprehensiveSheetMusicWithLyrics(
  options: GeneratorOptions
): string {
  const baseAbc = generateComprehensiveSheetMusic(options);

  if (!options.lyrics) {
    return baseAbc;
  }

  // Split lyrics into words and distribute across music lines
  const words = options.lyrics
    .split(/\n/)
    .filter((l) => l.trim())
    .flatMap((l) => l.trim().split(/\s+/));

  const abcLines = baseAbc.split("\n");
  const result: string[] = [];
  let wordIdx = 0;

  for (const line of abcLines) {
    result.push(line);
    const trimmed = line.trim();

    // Add lyrics after music lines (not headers, comments, or empty lines)
    if (trimmed && !trimmed.startsWith("%") && !/^[A-Z]:/.test(trimmed) && /[A-Ga-g]/.test(trimmed)) {
      // Count approximate notes in this line
      const noteCount = (trimmed.match(/[A-Ga-g][,']*/g) || []).length;
      const wordsForLine = words.slice(wordIdx, wordIdx + Math.min(noteCount, 8));
      if (wordsForLine.length > 0) {
        result.push("w: " + wordsForLine.join(" "));
        wordIdx += wordsForLine.length;
      }
    }
  }

  return result.join("\n");
}
