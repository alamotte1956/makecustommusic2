import { describe, it, expect } from "vitest";
import { chordToNashville, convertChordLineToNashville, getNashvilleLegend } from "./nashvilleNumber";

describe("chordToNashville", () => {
  it("should convert basic major chords in key of C", () => {
    expect(chordToNashville("C", "C")).toBe("1");
    expect(chordToNashville("D", "C")).toBe("2");
    expect(chordToNashville("E", "C")).toBe("3");
    expect(chordToNashville("F", "C")).toBe("4");
    expect(chordToNashville("G", "C")).toBe("5");
    expect(chordToNashville("A", "C")).toBe("6");
    expect(chordToNashville("B", "C")).toBe("7");
  });

  it("should convert minor chords", () => {
    expect(chordToNashville("Am", "C")).toBe("6m");
    expect(chordToNashville("Dm", "C")).toBe("2m");
    expect(chordToNashville("Em", "C")).toBe("3m");
  });

  it("should convert seventh chords", () => {
    expect(chordToNashville("G7", "C")).toBe("57");
    expect(chordToNashville("Am7", "C")).toBe("6m7");
    expect(chordToNashville("Cmaj7", "C")).toBe("1maj7");
    expect(chordToNashville("Dm7", "C")).toBe("2m7");
  });

  it("should convert suspended chords", () => {
    expect(chordToNashville("Csus", "C")).toBe("1sus");
    expect(chordToNashville("Gsus4", "C")).toBe("5sus4");
    expect(chordToNashville("Dsus2", "C")).toBe("2sus2");
  });

  it("should convert diminished and augmented chords", () => {
    expect(chordToNashville("Bdim", "C")).toBe("7°");
    expect(chordToNashville("Caug", "C")).toBe("1+");
  });

  it("should handle slash chords", () => {
    expect(chordToNashville("C/E", "C")).toBe("1/3");
    expect(chordToNashville("G/B", "C")).toBe("5/7");
    expect(chordToNashville("Am/G", "C")).toBe("6m/5");
  });

  it("should handle key of G", () => {
    expect(chordToNashville("G", "G")).toBe("1");
    expect(chordToNashville("C", "G")).toBe("4");
    expect(chordToNashville("D", "G")).toBe("5");
    expect(chordToNashville("Em", "G")).toBe("6m");
    expect(chordToNashville("Am", "G")).toBe("2m");
  });

  it("should handle key of D", () => {
    expect(chordToNashville("D", "D")).toBe("1");
    expect(chordToNashville("G", "D")).toBe("4");
    expect(chordToNashville("A", "D")).toBe("5");
    expect(chordToNashville("Bm", "D")).toBe("6m");
    expect(chordToNashville("F#m", "D")).toBe("3m");
  });

  it("should handle flat keys", () => {
    expect(chordToNashville("Bb", "Bb")).toBe("1");
    expect(chordToNashville("Eb", "Bb")).toBe("4");
    expect(chordToNashville("F", "Bb")).toBe("5");
    expect(chordToNashville("Gm", "Bb")).toBe("6m");
  });

  it("should handle non-diatonic chords with accidentals", () => {
    // Bb in key of C is a flat 7
    expect(chordToNashville("Bb", "C")).toBe("b7");
    // Eb in key of C is a flat 3
    expect(chordToNashville("Eb", "C")).toBe("b3");
    // F# in key of C — Nashville convention prefers b5 over #4
    expect(chordToNashville("F#", "C")).toBe("b5");
  });

  it("should return chord as-is for unparseable input", () => {
    expect(chordToNashville("", "C")).toBe("");
    expect(chordToNashville("N.C.", "C")).toBe("N.C.");
  });
});

describe("convertChordLineToNashville", () => {
  it("should convert a full chord line preserving spacing", () => {
    const line = "  Am    F    C    G";
    const result = convertChordLineToNashville(line, "C");
    // Should contain the Nashville numbers
    expect(result).toContain("6m");
    expect(result).toContain("4");
    expect(result).toContain("1");
    expect(result).toContain("5");
  });

  it("should handle empty lines", () => {
    expect(convertChordLineToNashville("", "C")).toBe("");
    expect(convertChordLineToNashville("   ", "C")).toBe("   ");
  });

  it("should convert a typical worship song chord line", () => {
    const line = "G    D    Em   C";
    const result = convertChordLineToNashville(line, "G");
    expect(result).toContain("1");
    expect(result).toContain("5");
    expect(result).toContain("6m");
    expect(result).toContain("4");
  });
});

describe("getNashvilleLegend", () => {
  it("should return 7 scale degrees for key of C", () => {
    const legend = getNashvilleLegend("C");
    expect(legend).toHaveLength(7);
    expect(legend[0]).toEqual({ number: "1", chord: "C", quality: "Major" });
    expect(legend[1]).toEqual({ number: "2m", chord: "Dm", quality: "minor" });
    expect(legend[2]).toEqual({ number: "3m", chord: "Em", quality: "minor" });
    expect(legend[3]).toEqual({ number: "4", chord: "F", quality: "Major" });
    expect(legend[4]).toEqual({ number: "5", chord: "G", quality: "Major" });
    expect(legend[5]).toEqual({ number: "6m", chord: "Am", quality: "minor" });
    expect(legend[6]).toEqual({ number: "7°", chord: "B°", quality: "dim" });
  });

  it("should return correct legend for key of G", () => {
    const legend = getNashvilleLegend("G");
    expect(legend).toHaveLength(7);
    expect(legend[0]).toEqual({ number: "1", chord: "G", quality: "Major" });
    expect(legend[3]).toEqual({ number: "4", chord: "C", quality: "Major" });
    expect(legend[4]).toEqual({ number: "5", chord: "D", quality: "Major" });
  });

  it("should use flats for flat keys", () => {
    const legend = getNashvilleLegend("Bb");
    expect(legend).toHaveLength(7);
    expect(legend[0]).toEqual({ number: "1", chord: "Bb", quality: "Major" });
    expect(legend[3]).toEqual({ number: "4", chord: "Eb", quality: "Major" });
  });

  it("should return empty array for invalid key", () => {
    expect(getNashvilleLegend("X")).toEqual([]);
  });
});
