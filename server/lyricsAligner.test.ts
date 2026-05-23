import { describe, it, expect } from "vitest";
import {
  countNotesInMusicLine,
  countSyllablesInLyricsLine,
  parseLyricsSyllables,
  rebuildLyricsLine,
  alignLyricsToNotes,
  alignAllLyrics,
} from "./lyricsAligner";

describe("countNotesInMusicLine", () => {
  it("counts simple notes", () => {
    expect(countNotesInMusicLine("C D E F")).toBe(4);
  });

  it("counts notes with durations", () => {
    expect(countNotesInMusicLine("C2 D4 E F/2")).toBe(4);
  });

  it("counts lowercase notes (higher octave)", () => {
    expect(countNotesInMusicLine("c d e f g a b")).toBe(7);
  });

  it("counts notes with octave modifiers", () => {
    expect(countNotesInMusicLine("C, D' e'' f,,")).toBe(4);
  });

  it("counts notes with accidentals", () => {
    expect(countNotesInMusicLine("^C _D =E ^^F __G")).toBe(5);
  });

  it("ignores chord symbols in quotes", () => {
    expect(countNotesInMusicLine('"Am" C D "G" E F')).toBe(4);
  });

  it("counts rests as note slots", () => {
    expect(countNotesInMusicLine("C z D z2 E")).toBe(5);
  });

  it("counts multi-note chords as one note", () => {
    expect(countNotesInMusicLine("[CEG] D [FA] B")).toBe(4);
  });

  it("ignores grace notes", () => {
    expect(countNotesInMusicLine("{g}A B {cd}E F")).toBe(4);
  });

  it("handles bar lines correctly", () => {
    expect(countNotesInMusicLine("C D E F | G A B c")).toBe(8);
  });

  it("handles complex real-world music line", () => {
    // "Am" chord, notes with durations, bar lines
    expect(countNotesInMusicLine('"Am" A2 B c | "G" d2 e f')).toBe(6);
  });

  it("handles ties (- after note)", () => {
    // A tied note is still one note for lyrics purposes
    expect(countNotesInMusicLine("A2- A2 B c")).toBe(4);
  });

  it("handles empty line", () => {
    expect(countNotesInMusicLine("")).toBe(0);
  });

  it("handles line with only chords and bar lines", () => {
    expect(countNotesInMusicLine('"Am" | "G" |')).toBe(0);
  });

  it("handles repeat markers", () => {
    expect(countNotesInMusicLine("|: C D E F :|")).toBe(4);
  });

  it("handles inline fields", () => {
    expect(countNotesInMusicLine("[M:3/4] C D E")).toBe(3);
  });
});

describe("countSyllablesInLyricsLine", () => {
  it("counts simple space-separated words", () => {
    expect(countSyllablesInLyricsLine("w: A- ma- zing grace")).toBe(4);
  });

  it("counts asterisks as syllable slots", () => {
    expect(countSyllablesInLyricsLine("w: * * hello world")).toBe(4);
  });

  it("counts underscores as syllable slots", () => {
    expect(countSyllablesInLyricsLine("w: glo- _ ry")).toBe(3);
  });

  it("handles empty lyrics line", () => {
    expect(countSyllablesInLyricsLine("w:")).toBe(0);
  });

  it("handles lyrics with bar lines", () => {
    expect(countSyllablesInLyricsLine("w: A- ma- zing | grace how")).toBe(5);
  });
});

describe("parseLyricsSyllables", () => {
  it("parses simple words", () => {
    expect(parseLyricsSyllables("w: hello world")).toEqual(["hello", "world"]);
  });

  it("parses hyphenated words into separate syllables", () => {
    expect(parseLyricsSyllables("w: a-ma-zing")).toEqual(["a-", "ma-", "zing"]);
  });

  it("preserves asterisks and underscores", () => {
    expect(parseLyricsSyllables("w: * hello _ world")).toEqual(["*", "hello", "_", "world"]);
  });

  it("handles empty line", () => {
    expect(parseLyricsSyllables("w:")).toEqual([]);
  });

  it("handles mixed content", () => {
    expect(parseLyricsSyllables("w: A- ma- zing grace how sweet")).toEqual([
      "A-", "ma-", "zing", "grace", "how", "sweet",
    ]);
  });
});

describe("rebuildLyricsLine", () => {
  it("rebuilds from syllables", () => {
    expect(rebuildLyricsLine(["hello", "world"])).toBe("w: hello world");
  });

  it("rebuilds hyphenated syllables", () => {
    expect(rebuildLyricsLine(["a-", "ma-", "zing"])).toBe("w: a- ma- zing");
  });

  it("handles empty array", () => {
    expect(rebuildLyricsLine([])).toBe("w:");
  });

  it("handles asterisks", () => {
    expect(rebuildLyricsLine(["*", "*", "hello"])).toBe("w: * * hello");
  });
});

describe("alignLyricsToNotes", () => {
  it("pads with asterisks when fewer syllables than notes", () => {
    const music = "C D E F G A B c";
    const lyrics = "w: A- ma- zing grace";
    const result = alignLyricsToNotes(music, lyrics);
    // 8 notes, 4 syllables → pad with 4 asterisks
    expect(result).toBe("w: A- ma- zing grace * * * *");
  });

  it("trims excess syllables when more syllables than notes", () => {
    const music = "C D E F";
    const lyrics = "w: A- ma- zing grace how sweet the sound";
    const result = alignLyricsToNotes(music, lyrics);
    // 4 notes, 8 syllables → keep first 4
    expect(result).toBe("w: A- ma- zing grace");
  });

  it("removes trailing hyphen when trimming mid-word", () => {
    const music = "C D";
    const lyrics = "w: a-ma-zing grace";
    const result = alignLyricsToNotes(music, lyrics);
    // 2 notes, trim to 2 syllables: "a-" "ma-" → remove trailing hyphen from last
    expect(result).toBe("w: a- ma");
  });

  it("returns unchanged when already aligned", () => {
    const music = "C D E F";
    const lyrics = "w: how sweet the sound";
    const result = alignLyricsToNotes(music, lyrics);
    expect(result).toBe("w: how sweet the sound");
  });

  it("handles music line with chords", () => {
    const music = '"Am" C D "G" E F';
    const lyrics = "w: a- ma- zing grace";
    const result = alignLyricsToNotes(music, lyrics);
    // 4 notes, 4 syllables → aligned
    expect(result).toBe("w: a- ma- zing grace");
  });

  it("handles empty music line", () => {
    const result = alignLyricsToNotes("", "w: hello world");
    expect(result).toBe("w:");
  });

  it("handles rests in music (rests get syllable slots)", () => {
    const music = "C z D E";
    const lyrics = "w: hello world";
    const result = alignLyricsToNotes(music, lyrics);
    // 4 notes (including rest), 2 syllables → pad
    expect(result).toBe("w: hello world * *");
  });
});

describe("alignAllLyrics", () => {
  it("aligns lyrics in a complete ABC notation", () => {
    const abc = `X: 1
T: Test Song
M: 4/4
L: 1/8
K: C
"C" C D E F "G" G A B c
w: A- ma- zing grace how sweet the sound that`;
    const result = alignAllLyrics(abc);
    // 8 notes, 9 syllables → trim to 8 (drops "that")
    expect(result).toContain("w: A- ma- zing grace how sweet the sound");
  });

  it("handles multiple w: lines for the same music line", () => {
    const abc = `X: 1
T: Test
M: 4/4
L: 1/4
K: C
C D E F
w: verse one two three
w: verse two three four`;
    const result = alignAllLyrics(abc);
    const lines = result.split("\n");
    const lyricsLines = lines.filter((l) => l.trim().startsWith("w:"));
    expect(lyricsLines.length).toBe(2);
    // Both should be aligned to 4 notes
    expect(lyricsLines[0]).toBe("w: verse one two three");
    expect(lyricsLines[1]).toBe("w: verse two three four");
  });

  it("handles ABC with no lyrics (passes through unchanged)", () => {
    const abc = `X: 1
T: Test
M: 4/4
L: 1/4
K: C
C D E F | G A B c`;
    const result = alignAllLyrics(abc);
    expect(result).toBe(abc);
  });

  it("handles ABC with comments between music and lyrics", () => {
    const abc = `X: 1
T: Test
M: 4/4
L: 1/4
K: C
% Verse 1
C D E F
w: one two three`;
    const result = alignAllLyrics(abc);
    // 4 notes, 3 syllables → pad
    expect(result).toContain("w: one two three *");
  });

  it("preserves non-lyrics lines unchanged", () => {
    const abc = `X: 1
T: Amazing Grace
M: 4/4
L: 1/8
K: G
"G" B2 d2 "C" e4 | "G" d2 B2 G4
w: A- ma- zing grace how sweet
"G" B2 d2 "D" A4 | "G" G8
w: the sound that saved`;
    const result = alignAllLyrics(abc);
    // Verify headers are preserved
    expect(result).toContain("X: 1");
    expect(result).toContain("T: Amazing Grace");
    expect(result).toContain("M: 4/4");
    expect(result).toContain("K: G");
    // Music lines preserved
    expect(result).toContain('"G" B2 d2 "C" e4 | "G" d2 B2 G4');
  });

  it("handles real-world misaligned lyrics", () => {
    const abc = `X: 1
T: Test
M: 4/4
L: 1/8
K: C
"C" E2 G2 c2 B2 | "Am" A2 G2 E4
w: Je- sus loves me this I know for the`;
    const result = alignAllLyrics(abc);
    // Count notes: E2 G2 c2 B2 A2 G2 E4 = 7 notes
    // Syllables: Je- sus loves me this I know for the = 9
    // Should trim to 7
    const lyricsLine = result.split("\n").find((l) => l.trim().startsWith("w:"));
    const syllables = lyricsLine!.replace("w: ", "").trim().split(/\s+/);
    expect(syllables.length).toBe(7);
  });
});
