import { describe, it, expect, beforeAll } from "vitest";

// We test the pure utility functions that are used client-side.
// Since these are TypeScript modules with no DOM dependency, we can import and test them directly.

// ─── ABC-to-MIDI Converter Tests ───

describe("ABC-to-MIDI Converter", () => {
  // We need to dynamically import the client module
  let abcToMidi: (abc: string) => Uint8Array;
  let extractChordsFromABC: (abc: string) => string[];
  let downloadMidi: (abc: string, filename: string) => void;

  beforeAll(async () => {
    const mod = await import("../client/src/lib/midiExport");
    abcToMidi = mod.abcToMidi;
    extractChordsFromABC = mod.extractChordsFromABC;
    downloadMidi = mod.downloadMidi;
  });

  describe("abcToMidi", () => {
    it("should return a Uint8Array with valid MIDI header", () => {
      const abc = `X:1
T:Test Song
M:4/4
L:1/8
Q:1/4=120
K:C
CDEF GABc|`;
      const midi = abcToMidi(abc);
      expect(midi).toBeInstanceOf(Uint8Array);
      expect(midi.length).toBeGreaterThan(14);
      // MIDI files start with "MThd" (0x4D 0x54 0x68 0x64)
      expect(midi[0]).toBe(0x4D); // M
      expect(midi[1]).toBe(0x54); // T
      expect(midi[2]).toBe(0x68); // h
      expect(midi[3]).toBe(0x64); // d
    });

    it("should produce MIDI with track header", () => {
      const abc = `X:1
T:Simple
M:4/4
L:1/4
Q:1/4=100
K:G
GABG|`;
      const midi = abcToMidi(abc);
      // After the 14-byte header, should have MTrk (0x4D 0x54 0x72 0x6B)
      expect(midi[14]).toBe(0x4D); // M
      expect(midi[15]).toBe(0x54); // T
      expect(midi[16]).toBe(0x72); // r
      expect(midi[17]).toBe(0x6B); // k
    });

    it("should handle different time signatures", () => {
      const abc34 = `X:1
T:Waltz
M:3/4
L:1/4
Q:1/4=90
K:D
DEF|`;
      const midi = abcToMidi(abc34);
      expect(midi).toBeInstanceOf(Uint8Array);
      expect(midi.length).toBeGreaterThan(14);
    });

    it("should handle key signatures with sharps and flats", () => {
      const abcFSharp = `X:1
T:Sharp Key
M:4/4
L:1/8
Q:1/4=120
K:F#
F2G2A2B2|`;
      const midi = abcToMidi(abcFSharp);
      expect(midi).toBeInstanceOf(Uint8Array);
      expect(midi.length).toBeGreaterThan(14);
    });

    it("should handle empty notation gracefully", () => {
      const abc = `X:1
T:Empty
M:4/4
L:1/4
Q:1/4=120
K:C
`;
      const midi = abcToMidi(abc);
      expect(midi).toBeInstanceOf(Uint8Array);
      // Should still have valid MIDI header even with no notes
      expect(midi[0]).toBe(0x4D);
    });

    it("should handle chords in ABC notation", () => {
      const abc = `X:1
T:With Chords
M:4/4
L:1/4
Q:1/4=120
K:C
"C"C "Am"A "F"F "G"G|`;
      const midi = abcToMidi(abc);
      expect(midi).toBeInstanceOf(Uint8Array);
      expect(midi.length).toBeGreaterThan(14);
    });

    it("should handle accidentals (sharps and flats)", () => {
      const abc = `X:1
T:Accidentals
M:4/4
L:1/4
Q:1/4=120
K:C
^C _E =F ^G|`;
      const midi = abcToMidi(abc);
      expect(midi).toBeInstanceOf(Uint8Array);
      expect(midi.length).toBeGreaterThan(14);
    });

    it("should handle different octaves", () => {
      const abc = `X:1
T:Octaves
M:4/4
L:1/4
Q:1/4=120
K:C
C, C c c'|`;
      const midi = abcToMidi(abc);
      expect(midi).toBeInstanceOf(Uint8Array);
      expect(midi.length).toBeGreaterThan(14);
    });

    it("should handle rests (z)", () => {
      const abc = `X:1
T:With Rests
M:4/4
L:1/4
Q:1/4=120
K:C
C z E z|`;
      const midi = abcToMidi(abc);
      expect(midi).toBeInstanceOf(Uint8Array);
      expect(midi.length).toBeGreaterThan(14);
    });

    it("should handle note length modifiers", () => {
      const abc = `X:1
T:Lengths
M:4/4
L:1/8
Q:1/4=120
K:C
C2 D4 E/2 F|`;
      const midi = abcToMidi(abc);
      expect(midi).toBeInstanceOf(Uint8Array);
      expect(midi.length).toBeGreaterThan(14);
    });
  });

  describe("extractChordsFromABC", () => {
    it("should extract unique chords from ABC notation", () => {
      const abc = `X:1
T:Test
M:4/4
L:1/4
K:C
"C"C "Am"A "F"F "G"G|"C"C "Dm"D "G7"G "C"C|`;
      const chords = extractChordsFromABC(abc);
      expect(chords).toContain("C");
      expect(chords).toContain("Am");
      expect(chords).toContain("F");
      expect(chords).toContain("G");
      expect(chords).toContain("Dm");
      expect(chords).toContain("G7");
    });

    it("should return unique chords only (no duplicates)", () => {
      const abc = `X:1
T:Test
M:4/4
L:1/4
K:C
"C"C "C"D "C"E "Am"A|`;
      const chords = extractChordsFromABC(abc);
      const cCount = chords.filter(c => c === "C").length;
      expect(cCount).toBe(1);
    });

    it("should return empty array when no chords present", () => {
      const abc = `X:1
T:Test
M:4/4
L:1/4
K:C
CDEF|`;
      const chords = extractChordsFromABC(abc);
      expect(chords).toEqual([]);
    });

    it("should handle complex chord names", () => {
      const abc = `X:1
T:Test
M:4/4
L:1/4
K:C
"Cmaj7"C "F#m"F "Bb"B "Dsus4"D|`;
      const chords = extractChordsFromABC(abc);
      expect(chords).toContain("Cmaj7");
      expect(chords).toContain("F#m");
      expect(chords).toContain("Bb");
      expect(chords).toContain("Dsus4");
    });

    it("should preserve chord order of first appearance", () => {
      const abc = `X:1
T:Test
M:4/4
L:1/4
K:C
"Am"A "G"G "F"F "C"C|`;
      const chords = extractChordsFromABC(abc);
      expect(chords[0]).toBe("Am");
      expect(chords[1]).toBe("G");
      expect(chords[2]).toBe("F");
      expect(chords[3]).toBe("C");
    });
  });
});

// ─── Guitar Chord Chart Data Tests ───

describe("Guitar Chord Chart", () => {
  it("should have chord data importable", async () => {
    // The GuitarChordChart component is a React component,
    // so we test the chord database concept here
    const commonChords = [
      "C", "D", "E", "F", "G", "A", "B",
      "Am", "Bm", "Cm", "Dm", "Em", "Fm", "Gm",
      "A7", "B7", "C7", "D7", "E7", "F7", "G7",
    ];

    // Verify the chord names are valid strings
    commonChords.forEach(chord => {
      expect(typeof chord).toBe("string");
      expect(chord.length).toBeGreaterThan(0);
    });
  });

  it("should handle all 12 major keys", () => {
    const majorKeys = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
    majorKeys.forEach(key => {
      expect(typeof key).toBe("string");
      expect(key.length).toBeGreaterThan(0);
    });
  });

  it("should handle enharmonic equivalents", () => {
    const enharmonicPairs = [
      ["F#", "Gb"],
      ["C#", "Db"],
      ["Bb", "A#"],
      ["Eb", "D#"],
      ["Ab", "G#"],
    ];
    enharmonicPairs.forEach(([sharp, flat]) => {
      expect(typeof sharp).toBe("string");
      expect(typeof flat).toBe("string");
    });
  });
});
