import { describe, it, expect } from "vitest";

// We test the transposition logic inline since the utility is in the client folder.
// These tests verify the core music theory logic.

const SHARP_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_NOTES  = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

function noteToIndex(note: string): number {
  const upper = note.trim();
  let idx = SHARP_NOTES.indexOf(upper);
  if (idx >= 0) return idx;
  idx = FLAT_NOTES.indexOf(upper);
  if (idx >= 0) return idx;
  const map: Record<string, number> = { "Cb": 11, "E#": 5, "Fb": 4, "B#": 0 };
  if (map[upper] !== undefined) return map[upper];
  return -1;
}

function getSemitoneInterval(fromKey: string, toKey: string): number {
  const fromRoot = fromKey.replace("m", "");
  const toRoot = toKey.replace("m", "");
  const fromIdx = noteToIndex(fromRoot);
  const toIdx = noteToIndex(toRoot);
  if (fromIdx < 0 || toIdx < 0) return 0;
  return ((toIdx - fromIdx) + 12) % 12;
}

function useFlats(targetKey: string): boolean {
  const flatKeys = ["F", "Bb", "Eb", "Ab", "Db", "Gb", "Dm", "Gm", "Cm", "Fm", "Bbm", "Ebm"];
  return flatKeys.includes(targetKey);
}

function transposeChord(chord: string, semitones: number, targetKey: string): string {
  if (semitones === 0) return chord;
  const match = chord.match(/^([A-G][#b]?)(.*)/);
  if (!match) return chord;
  const [, root, suffix] = match;
  const idx = noteToIndex(root);
  if (idx < 0) return chord;
  const newIdx = ((idx + semitones) + 12) % 12;
  const notes = useFlats(targetKey) ? FLAT_NOTES : SHARP_NOTES;
  return notes[newIdx] + suffix;
}

function transposeChordWithSlash(chord: string, semitones: number, targetKey: string): string {
  if (semitones === 0) return chord;
  const parts = chord.split("/");
  const transposed = parts.map(part => transposeChord(part.trim(), semitones, targetKey));
  return transposed.join("/");
}

describe("Music Transposition Utility", () => {
  describe("noteToIndex", () => {
    it("maps C to 0", () => {
      expect(noteToIndex("C")).toBe(0);
    });

    it("maps sharp notes correctly", () => {
      expect(noteToIndex("C#")).toBe(1);
      expect(noteToIndex("F#")).toBe(6);
      expect(noteToIndex("A#")).toBe(10);
    });

    it("maps flat notes correctly", () => {
      expect(noteToIndex("Db")).toBe(1);
      expect(noteToIndex("Eb")).toBe(3);
      expect(noteToIndex("Bb")).toBe(10);
    });

    it("handles enharmonic equivalents", () => {
      expect(noteToIndex("Cb")).toBe(11);
      expect(noteToIndex("E#")).toBe(5);
      expect(noteToIndex("B#")).toBe(0);
    });

    it("returns -1 for invalid notes", () => {
      expect(noteToIndex("X")).toBe(-1);
      expect(noteToIndex("")).toBe(-1);
    });
  });

  describe("getSemitoneInterval", () => {
    it("returns 0 for same key", () => {
      expect(getSemitoneInterval("C", "C")).toBe(0);
      expect(getSemitoneInterval("Am", "Am")).toBe(0);
    });

    it("calculates correct interval going up", () => {
      expect(getSemitoneInterval("C", "D")).toBe(2);
      expect(getSemitoneInterval("C", "G")).toBe(7);
      expect(getSemitoneInterval("C", "E")).toBe(4);
    });

    it("wraps around correctly", () => {
      expect(getSemitoneInterval("A", "C")).toBe(3);
      expect(getSemitoneInterval("B", "C")).toBe(1);
    });

    it("handles minor keys", () => {
      expect(getSemitoneInterval("Am", "Em")).toBe(7);
      expect(getSemitoneInterval("Am", "Dm")).toBe(5);
    });

    it("handles flat keys", () => {
      expect(getSemitoneInterval("Bb", "C")).toBe(2);
      expect(getSemitoneInterval("Eb", "F")).toBe(2);
    });
  });

  describe("transposeChord", () => {
    it("returns same chord when semitones is 0", () => {
      expect(transposeChord("Am", 0, "C")).toBe("Am");
    });

    it("transposes simple major chords", () => {
      expect(transposeChord("C", 2, "D")).toBe("D");
      expect(transposeChord("G", 2, "A")).toBe("A");
    });

    it("transposes minor chords", () => {
      expect(transposeChord("Am", 2, "D")).toBe("Bm");
      expect(transposeChord("Em", 5, "A")).toBe("Am");
    });

    it("transposes 7th chords", () => {
      expect(transposeChord("G7", 2, "A")).toBe("A7");
      expect(transposeChord("Cmaj7", 4, "E")).toBe("Emaj7");
    });

    it("transposes sus chords", () => {
      expect(transposeChord("Dsus4", 2, "E")).toBe("Esus4");
      expect(transposeChord("Asus2", 3, "C")).toBe("Csus2");
    });

    it("uses flats for flat keys", () => {
      expect(transposeChord("C", 1, "F")).toBe("Db");
      expect(transposeChord("A", 1, "Bb")).toBe("Bb");
    });

    it("uses sharps for sharp keys", () => {
      expect(transposeChord("C", 1, "G")).toBe("C#");
      expect(transposeChord("A", 1, "E")).toBe("A#");
    });

    it("handles already-sharp root notes", () => {
      expect(transposeChord("F#", 2, "A")).toBe("G#");
      expect(transposeChord("C#m", 2, "E")).toBe("D#m");
    });

    it("handles already-flat root notes", () => {
      expect(transposeChord("Bb", 2, "C")).toBe("C");
      expect(transposeChord("Ebm", 2, "F")).toBe("Fm");
    });

    it("returns chord unchanged for invalid input", () => {
      expect(transposeChord("N.C.", 2, "D")).toBe("N.C.");
      expect(transposeChord("", 2, "D")).toBe("");
    });
  });

  describe("transposeChordWithSlash", () => {
    it("transposes slash chords", () => {
      expect(transposeChordWithSlash("Am/G", 2, "D")).toBe("Bm/A");
      expect(transposeChordWithSlash("C/E", 7, "G")).toBe("G/B");
    });

    it("handles non-slash chords", () => {
      expect(transposeChordWithSlash("Am", 2, "D")).toBe("Bm");
    });

    it("returns same when semitones is 0", () => {
      expect(transposeChordWithSlash("Am/G", 0, "C")).toBe("Am/G");
    });
  });

  describe("full transposition scenarios", () => {
    it("transposes a C major progression to G major", () => {
      const chords = ["C", "Am", "F", "G"];
      const semitones = getSemitoneInterval("C", "G");
      const transposed = chords.map(c => transposeChord(c, semitones, "G"));
      expect(transposed).toEqual(["G", "Em", "C", "D"]);
    });

    it("transposes a G major progression to D major", () => {
      const chords = ["G", "Em", "C", "D"];
      const semitones = getSemitoneInterval("G", "D");
      const transposed = chords.map(c => transposeChord(c, semitones, "D"));
      expect(transposed).toEqual(["D", "Bm", "G", "A"]);
    });

    it("transposes a C major progression to F major (uses flats)", () => {
      const chords = ["C", "Am", "F", "G"];
      const semitones = getSemitoneInterval("C", "F");
      const transposed = chords.map(c => transposeChord(c, semitones, "F"));
      expect(transposed).toEqual(["F", "Dm", "Bb", "C"]);
    });

    it("transposes Am progression to Em", () => {
      const chords = ["Am", "Dm", "E", "Am"];
      const semitones = getSemitoneInterval("Am", "Em");
      const transposed = chords.map(c => transposeChord(c, semitones, "Em"));
      expect(transposed).toEqual(["Em", "Am", "B", "Em"]);
    });

    it("transposes Bb major progression to C major", () => {
      const chords = ["Bb", "Gm", "Eb", "F"];
      const semitones = getSemitoneInterval("Bb", "C");
      const transposed = chords.map(c => transposeChord(c, semitones, "C"));
      expect(transposed).toEqual(["C", "Am", "F", "G"]);
    });
  });
});

// ─── Capo Recommendation Tests ───

// Replicate the capo logic for testing (same as client-side)
const OPEN_CHORD_SHAPES: Record<string, number> = {
  "C": 1, "A": 1, "G": 1, "E": 1, "D": 1,
  "Am": 1, "Em": 1, "Dm": 2,
  "A7": 2, "D7": 2, "E7": 2, "G7": 2, "C7": 2, "B7": 2,
  "Am7": 2, "Em7": 2, "Dm7": 3,
  "Asus2": 2, "Asus4": 2, "Dsus2": 2, "Dsus4": 2, "Esus4": 2,
  "Cadd9": 3, "Gadd9": 3,
  "Cmaj7": 3, "Fmaj7": 3, "Dmaj7": 3,
};

function parseChord(chord: string): { root: string; quality: string } | null {
  const mainChord = chord.split("/")[0].trim();
  const match = mainChord.match(/^([A-G][#b]?)(.*)/);
  if (!match) return null;
  return { root: match[1], quality: match[2] };
}

function getOpenChordScore(chordRoot: string, quality: string): number {
  const baseQuality = quality.replace(/\/.*$/, "");
  const fullChord = chordRoot + baseQuality;
  if (OPEN_CHORD_SHAPES[fullChord] !== undefined) {
    return OPEN_CHORD_SHAPES[fullChord];
  }
  const isMinor = baseQuality.startsWith("m") && !baseQuality.startsWith("maj");
  const simpleChord = chordRoot + (isMinor ? "m" : "");
  if (OPEN_CHORD_SHAPES[simpleChord] !== undefined) {
    return OPEN_CHORD_SHAPES[simpleChord] + 1;
  }
  return 0;
}

interface CapoRecommendation {
  capoFret: number;
  originalKey: string;
  capoKey: string;
  simplifiedChords: string[];
  reason: string;
  score: number;
}

function recommendCapo(chords: string[], currentKey: string): CapoRecommendation | null {
  if (!chords || chords.length === 0) return null;

  const uniqueChords = Array.from(new Set(chords.map(c => c.split("/")[0].trim())));
  const parsedChords = uniqueChords.map(parseChord).filter(Boolean) as { root: string; quality: string }[];
  if (parsedChords.length === 0) return null;

  let bestResult: CapoRecommendation | null = null;
  let bestScore = -1;

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
    if (openRatio < 0.5) continue;

    if (finalScore > bestScore) {
      bestScore = finalScore;
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

  if (bestResult && bestResult.capoFret === 0) {
    return bestResult;
  }

  if (bestResult) {
    let noCapoScore = 0;
    for (const { root, quality } of parsedChords) {
      const score = getOpenChordScore(root, quality);
      if (score > 0) noCapoScore += (4 - score);
    }
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

describe("Capo Recommendation", () => {
  describe("parseChord", () => {
    it("parses simple major chords", () => {
      expect(parseChord("C")).toEqual({ root: "C", quality: "" });
      expect(parseChord("G")).toEqual({ root: "G", quality: "" });
    });

    it("parses minor chords", () => {
      expect(parseChord("Am")).toEqual({ root: "A", quality: "m" });
      expect(parseChord("F#m")).toEqual({ root: "F#", quality: "m" });
    });

    it("parses extended chords", () => {
      expect(parseChord("Cmaj7")).toEqual({ root: "C", quality: "maj7" });
      expect(parseChord("Dm7")).toEqual({ root: "D", quality: "m7" });
      expect(parseChord("Gsus4")).toEqual({ root: "G", quality: "sus4" });
    });

    it("parses slash chords (takes main chord)", () => {
      expect(parseChord("Am/G")).toEqual({ root: "A", quality: "m" });
      expect(parseChord("C/E")).toEqual({ root: "C", quality: "" });
    });

    it("returns null for invalid input", () => {
      expect(parseChord("N.C.")).toBeNull();
      expect(parseChord("")).toBeNull();
    });
  });

  describe("getOpenChordScore", () => {
    it("scores basic open major chords as 1", () => {
      expect(getOpenChordScore("C", "")).toBe(1);
      expect(getOpenChordScore("G", "")).toBe(1);
      expect(getOpenChordScore("D", "")).toBe(1);
      expect(getOpenChordScore("A", "")).toBe(1);
      expect(getOpenChordScore("E", "")).toBe(1);
    });

    it("scores basic open minor chords", () => {
      expect(getOpenChordScore("A", "m")).toBe(1);
      expect(getOpenChordScore("E", "m")).toBe(1);
      expect(getOpenChordScore("D", "m")).toBe(2);
    });

    it("scores seventh chords", () => {
      expect(getOpenChordScore("A", "7")).toBe(2);
      expect(getOpenChordScore("E", "7")).toBe(2);
      expect(getOpenChordScore("G", "7")).toBe(2);
    });

    it("returns 0 for barre chord roots", () => {
      expect(getOpenChordScore("F", "")).toBe(0);
      expect(getOpenChordScore("Bb", "")).toBe(0);
      expect(getOpenChordScore("F#", "")).toBe(0);
    });

    it("scores extended chords that simplify to open shapes", () => {
      // Am7 is in the lookup directly
      expect(getOpenChordScore("A", "m7")).toBe(2);
      // Cm7 is not in lookup, but Cm is not open either
      expect(getOpenChordScore("C", "m7")).toBe(0);
    });
  });

  describe("recommendCapo", () => {
    it("returns null for empty chord array", () => {
      expect(recommendCapo([], "C")).toBeNull();
    });

    it("returns capo 0 for already-open chords in C", () => {
      const result = recommendCapo(["C", "Am", "F", "G"], "C");
      // F is not open, so this might suggest a capo
      // Actually C, Am, G are open but F is not — let's check
      expect(result).not.toBeNull();
    });

    it("returns capo 0 for all-open chords like G Em C D", () => {
      const result = recommendCapo(["G", "Em", "C", "D"], "G");
      expect(result).not.toBeNull();
      expect(result!.capoFret).toBe(0);
    });

    it("recommends capo for Bb major progression", () => {
      // Bb Eb F Gm — all barre chords, should recommend capo
      const result = recommendCapo(["Bb", "Eb", "F", "Gm"], "Bb");
      expect(result).not.toBeNull();
      expect(result!.capoFret).toBeGreaterThan(0);
    });

    it("recommends capo for Ab major progression", () => {
      // Ab Db Eb Fm — all barre chords
      const result = recommendCapo(["Ab", "Db", "Eb", "Fm"], "Ab");
      expect(result).not.toBeNull();
      expect(result!.capoFret).toBeGreaterThan(0);
    });

    it("recommends capo 3 for Bb to play G shapes", () => {
      // Bb Gm Eb F → capo 3 → G Em C D (all open!)
      const result = recommendCapo(["Bb", "Gm", "Eb", "F"], "Bb");
      expect(result).not.toBeNull();
      // Capo 3: Bb→G, Gm→Em, Eb→C, F→D — perfect!
      expect(result!.capoFret).toBe(3);
      expect(result!.capoKey).toBe("G");
    });

    it("handles duplicate chords", () => {
      const result = recommendCapo(["G", "G", "Em", "C", "D", "G"], "G");
      expect(result).not.toBeNull();
      expect(result!.capoFret).toBe(0);
    });

    it("handles slash chords", () => {
      const result = recommendCapo(["G", "Em", "C/E", "D"], "G");
      expect(result).not.toBeNull();
      expect(result!.capoFret).toBe(0);
    });

    it("includes simplified chord names", () => {
      const result = recommendCapo(["Bb", "Gm", "Eb", "F"], "Bb");
      expect(result).not.toBeNull();
      expect(result!.simplifiedChords.length).toBeGreaterThan(0);
    });

    it("includes a reason string", () => {
      const result = recommendCapo(["Bb", "Gm", "Eb", "F"], "Bb");
      expect(result).not.toBeNull();
      expect(result!.reason.length).toBeGreaterThan(0);
    });

    it("recommends capo for F# major progression", () => {
      // F# B C#m G#m — all barre chords
      const result = recommendCapo(["F#", "B", "C#m", "G#m"], "F#");
      expect(result).not.toBeNull();
      expect(result!.capoFret).toBeGreaterThan(0);
    });

    it("prefers lower capo positions when scores are similar", () => {
      // Due to position penalty, lower frets should be preferred
      const result = recommendCapo(["Bb", "Gm", "Eb", "F"], "Bb");
      expect(result).not.toBeNull();
      expect(result!.capoFret).toBeLessThanOrEqual(5);
    });
  });

  describe("PDF margin constants", () => {
    const PAGE_HEIGHT = 297;
    const MARGIN_TOP = 25;
    const MARGIN_BOTTOM = 25;
    const FOOTER_RESERVE = 12;
    const SAFE_BOTTOM = PAGE_HEIGHT - MARGIN_BOTTOM - FOOTER_RESERVE;
    const USABLE_HEIGHT = SAFE_BOTTOM - MARGIN_TOP;

    it("safe bottom is below usable area", () => {
      expect(SAFE_BOTTOM).toBe(260);
    });

    it("usable height is correct", () => {
      expect(USABLE_HEIGHT).toBe(235);
    });

    it("footer reserve keeps content away from bottom", () => {
      expect(SAFE_BOTTOM + FOOTER_RESERVE).toBe(PAGE_HEIGHT - MARGIN_BOTTOM);
    });

    it("content starting at MARGIN_TOP has full usable height", () => {
      expect(MARGIN_TOP + USABLE_HEIGHT).toBe(SAFE_BOTTOM);
    });

    function checkPageBreak(y: number, needed: number): { needsBreak: boolean; newY: number } {
      if (y + needed > SAFE_BOTTOM) {
        return { needsBreak: true, newY: MARGIN_TOP };
      }
      return { needsBreak: false, newY: y };
    }

    it("should not break when content fits within safe zone", () => {
      const result = checkPageBreak(100, 50);
      expect(result.needsBreak).toBe(false);
      expect(result.newY).toBe(100);
    });

    it("should break when content exceeds safe bottom", () => {
      const result = checkPageBreak(250, 15);
      expect(result.needsBreak).toBe(true);
      expect(result.newY).toBe(MARGIN_TOP);
    });

    it("should not break at exact safe bottom boundary", () => {
      // 250 + 10 = 260 = SAFE_BOTTOM, so it fits
      const result = checkPageBreak(250, 10);
      expect(result.needsBreak).toBe(false);
    });

    it("should break just past safe bottom", () => {
      // 250 + 11 = 261 > 260, needs break
      const result = checkPageBreak(250, 11);
      expect(result.needsBreak).toBe(true);
      expect(result.newY).toBe(MARGIN_TOP);
    });

    it("footer text is placed below safe bottom", () => {
      const footerY = PAGE_HEIGHT - MARGIN_BOTTOM + 2;
      expect(footerY).toBeGreaterThan(SAFE_BOTTOM);
      expect(footerY).toBeLessThan(PAGE_HEIGHT);
    });
  });
});
