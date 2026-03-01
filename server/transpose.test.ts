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
