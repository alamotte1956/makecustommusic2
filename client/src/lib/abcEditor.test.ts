import { describe, it, expect } from "vitest";
import {
  parseAbcForEditing,
  reconstructAbcFromEdits,
  extractLyrics,
  updateLyricsInAbc,
  extractChords,
  hasEditableContent,
  type AbcEditableSection,
} from "./abcEditor";

describe("abcEditor", () => {
  const sampleAbc = `X: 1
T: Amazing Grace
C: John Newton
M: 4/4
L: 1/8
K: G
"G"G4 A2 B2 | "D"d4 d2 e2 |
w: A-ma-zing grace, how sweet the sound
"G"G4 A2 B2 | "D"d4 c2 B2 |
w: That saved a wretch like me`;

  describe("parseAbcForEditing", () => {
    it("should extract lyric lines", () => {
      const result = parseAbcForEditing(sampleAbc);
      const lyricSections = result.sections.filter((s) => s.type === "lyric");
      expect(lyricSections.length).toBe(2);
      expect(lyricSections[0].content).toBe("A-ma-zing grace, how sweet the sound");
      expect(lyricSections[1].content).toBe("That saved a wretch like me");
    });

    it("should extract title and composer", () => {
      const result = parseAbcForEditing(sampleAbc);
      const titleSections = result.sections.filter((s) => s.type === "title");
      const composerSections = result.sections.filter((s) => s.type === "composer");
      expect(titleSections.length).toBeGreaterThan(0);
      expect(composerSections.length).toBeGreaterThan(0);
    });

    it("should extract chord lines", () => {
      const result = parseAbcForEditing(sampleAbc);
      const chordSections = result.sections.filter((s) => s.type === "chord");
      expect(chordSections.length).toBeGreaterThan(0);
    });

    it("should preserve line numbers", () => {
      const result = parseAbcForEditing(sampleAbc);
      const sections = result.sections;
      expect(sections.every((s) => typeof s.lineNumber === "number")).toBe(true);
    });
  });

  describe("reconstructAbcFromEdits", () => {
    it("should update lyrics in ABC notation", () => {
      const result = parseAbcForEditing(sampleAbc);
      const editedSections = result.sections.map((s) =>
        s.type === "lyric"
          ? { ...s, content: s.content.toUpperCase() }
          : s,
      );
      const reconstructed = reconstructAbcFromEdits(sampleAbc, editedSections);
      expect(reconstructed).toContain("A-MA-ZING GRACE, HOW SWEET THE SOUND");
      expect(reconstructed).toContain("THAT SAVED A WRETCH LIKE ME");
    });

    it("should preserve non-edited lines", () => {
      const result = parseAbcForEditing(sampleAbc);
      const reconstructed = reconstructAbcFromEdits(sampleAbc, result.sections);
      expect(reconstructed).toContain("X: 1");
      expect(reconstructed).toContain("T: Amazing Grace");
      expect(reconstructed).toContain("K: G");
    });
  });

  describe("extractLyrics", () => {
    it("should extract all lyric lines", () => {
      const lyrics = extractLyrics(sampleAbc);
      expect(lyrics.length).toBe(2);
      expect(lyrics[0]).toBe("A-ma-zing grace, how sweet the sound");
      expect(lyrics[1]).toBe("That saved a wretch like me");
    });

    it("should handle ABC with no lyrics", () => {
      const abcNoLyrics = `X: 1
T: Test
M: 4/4
L: 1/8
K: G
G4 A2 B2`;
      const lyrics = extractLyrics(abcNoLyrics);
      expect(lyrics.length).toBe(0);
    });

    it("should handle both lowercase and uppercase w:", () => {
      const abcMixed = `X: 1
w: lowercase lyric
W: UPPERCASE LYRIC`;
      const lyrics = extractLyrics(abcMixed);
      expect(lyrics.length).toBe(2);
      expect(lyrics[0]).toBe("lowercase lyric");
      expect(lyrics[1]).toBe("UPPERCASE LYRIC");
    });
  });

  describe("updateLyricsInAbc", () => {
    it("should update lyrics in ABC notation", () => {
      const newLyrics = ["New lyric one", "New lyric two"];
      const updated = updateLyricsInAbc(sampleAbc, newLyrics);
      expect(updated).toContain("w: New lyric one");
      expect(updated).toContain("w: New lyric two");
    });

    it("should handle fewer lyrics than original", () => {
      const newLyrics = ["Only one lyric"];
      const updated = updateLyricsInAbc(sampleAbc, newLyrics);
      expect(updated).toContain("w: Only one lyric");
      // Original second lyric should remain unchanged
      expect(updated).toContain("That saved a wretch like me");
    });

    it("should handle empty lyrics array", () => {
      const updated = updateLyricsInAbc(sampleAbc, []);
      // Should preserve structure but not update lyrics
      expect(updated).toContain("X: 1");
    });
  });

  describe("extractChords", () => {
    it("should extract chord symbols", () => {
      const chords = extractChords(sampleAbc);
      expect(chords).toContain("G");
      expect(chords).toContain("D");
    });

    it("should handle ABC with no chords", () => {
      const abcNoChords = `X: 1
M: 4/4
K: G
G4 A2 B2`;
      const chords = extractChords(abcNoChords);
      expect(chords.length).toBe(0);
    });
  });

  describe("hasEditableContent", () => {
    it("should return true for ABC with lyrics", () => {
      expect(hasEditableContent(sampleAbc)).toBe(true);
    });

    it("should return true for ABC with chords", () => {
      const abcWithChords = `X: 1
"C"C4 "G"G4`;
      expect(hasEditableContent(abcWithChords)).toBe(true);
    });

    it("should return false for ABC with no editable content", () => {
      const abcNoEditable = `X: 1
T: Test
M: 4/4
K: G
G4 A2 B2`;
      expect(hasEditableContent(abcNoEditable)).toBe(false);
    });
  });
});
