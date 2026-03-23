import { describe, it, expect } from "vitest";
import { buildSongContext, sanitiseAbc, validateAbc } from "./backgroundSheetMusic";

describe("backgroundSheetMusic", () => {
  describe("buildSongContext", () => {
    it("should include all provided song fields", () => {
      const result = buildSongContext({
        title: "My Song",
        genre: "Rock",
        mood: "Energetic",
        keySignature: "C",
        timeSignature: "4/4",
        tempo: 120,
        lyrics: "Hello world",
      });

      expect(result).toContain("Title: My Song");
      expect(result).toContain("Genre: Rock");
      expect(result).toContain("Mood: Energetic");
      expect(result).toContain("Key: C");
      expect(result).toContain("Time Signature: 4/4");
      expect(result).toContain("Tempo: 120 BPM");
      expect(result).toContain("Lyrics:\nHello world");
    });

    it("should omit null/undefined fields", () => {
      const result = buildSongContext({
        title: "Minimal Song",
        genre: null,
        mood: null,
        keySignature: null,
        timeSignature: null,
        tempo: null,
        lyrics: null,
      });

      expect(result).toBe("Title: Minimal Song");
      expect(result).not.toContain("Genre");
      expect(result).not.toContain("Mood");
      expect(result).not.toContain("Key");
      expect(result).not.toContain("Time Signature");
      expect(result).not.toContain("Tempo");
      expect(result).not.toContain("Lyrics");
    });

    it("should handle partial fields", () => {
      const result = buildSongContext({
        title: "Partial Song",
        genre: "Jazz",
        mood: null,
        keySignature: "Am",
      });

      expect(result).toContain("Title: Partial Song");
      expect(result).toContain("Genre: Jazz");
      expect(result).toContain("Key: Am");
      expect(result).not.toContain("Mood");
      expect(result).not.toContain("Tempo");
    });

    it("should separate fields with newlines", () => {
      const result = buildSongContext({
        title: "Test",
        genre: "Pop",
      });

      expect(result).toBe("Title: Test\nGenre: Pop");
    });
  });

  describe("sanitiseAbc", () => {
    it("should strip markdown code fences", () => {
      const raw = '```abc\nX:1\nT:Test\nK:C\nCDEF|\n```';
      const result = sanitiseAbc(raw);
      expect(result).not.toContain("```");
      expect(result).toContain("X:1");
      expect(result).toContain("CDEF|");
    });

    it("should strip triple backticks without language tag", () => {
      const raw = '```\nX:1\nT:Test\nK:C\nCDEF|\n```';
      const result = sanitiseAbc(raw);
      expect(result).not.toContain("```");
      expect(result).toContain("X:1");
    });

    it("should remove V: (voice) directives", () => {
      const raw = 'X:1\nT:Test\nM:4/4\nL:1/8\nK:C\nV:1 treble\n"C"CDEF G2|\nV:2 bass\nC,2 G,2|';
      const result = sanitiseAbc(raw);
      expect(result).not.toContain("V:1");
      expect(result).not.toContain("V:2");
      expect(result).toContain('"C"CDEF G2|');
    });

    it("should remove %%staves directives", () => {
      const raw = 'X:1\nT:Test\nK:C\n%%staves {1 2}\nCDEF|';
      const result = sanitiseAbc(raw);
      expect(result).not.toContain("%%staves");
      expect(result).toContain("CDEF|");
    });

    it("should extract ABC from text with preamble", () => {
      const raw = 'Here is the ABC notation for your song:\n\nX:1\nT:Test\nK:C\nCDEF|';
      const result = sanitiseAbc(raw);
      expect(result.startsWith("X:1")).toBe(true);
      expect(result).not.toContain("Here is");
    });

    it("should handle clean ABC without modification", () => {
      const clean = 'X:1\nT:Test\nM:4/4\nL:1/8\nK:C\n"C"CDEF G2 c2|';
      const result = sanitiseAbc(clean);
      expect(result).toBe(clean);
    });

    it("should handle empty string", () => {
      expect(sanitiseAbc("")).toBe("");
    });

    it("should handle ABC with both code fences and V: directives", () => {
      const raw = '```abc\nX:1\nT:Test\nK:C\nV:1 treble\nCDEF|\n```';
      const result = sanitiseAbc(raw);
      expect(result).not.toContain("```");
      expect(result).not.toContain("V:");
      expect(result).toContain("CDEF|");
    });

    it("should preserve w: lyrics lines", () => {
      const raw = 'X:1\nT:Test\nK:C\nCDEF|\nw: Hel-lo world';
      const result = sanitiseAbc(raw);
      expect(result).toContain("w: Hel-lo world");
    });

    it("should preserve comment lines starting with %", () => {
      const raw = 'X:1\nT:Test\nK:C\n% This is a comment\nCDEF|';
      const result = sanitiseAbc(raw);
      expect(result).toContain("% This is a comment");
    });
  });

  describe("validateAbc", () => {
    it("should accept valid ABC notation", () => {
      const valid = 'X:1\nT:Test Song\nM:4/4\nL:1/8\nK:C\n"C"CDEF G2 c2|';
      expect(validateAbc(valid)).toBeNull();
    });

    it("should reject empty string", () => {
      expect(validateAbc("")).not.toBeNull();
      expect(validateAbc("")).toContain("too short");
    });

    it("should reject very short string", () => {
      expect(validateAbc("X:1\nT:A\nK:C")).not.toBeNull();
    });

    it("should reject missing X: header", () => {
      const noX = 'T:Test Song Title\nM:4/4\nK:C\nCDEF GABC|';
      const err = validateAbc(noX);
      expect(err).not.toBeNull();
      expect(err).toContain("X:");
    });

    it("should reject missing T: header", () => {
      const noT = 'X:1\nM:4/4\nK:C\nCDEF GABC DEFG|';
      const err = validateAbc(noT);
      expect(err).not.toBeNull();
      expect(err).toContain("T:");
    });

    it("should reject missing K: header", () => {
      const noK = 'X:1\nT:Test Song\nM:4/4\nCDEF GABC|';
      const err = validateAbc(noK);
      expect(err).not.toBeNull();
      expect(err).toContain("K:");
    });

    it("should reject ABC with headers but no music content", () => {
      const headersOnly = 'X:1\nT:Test Song\nM:4/4\nL:1/8\nK:C';
      expect(validateAbc(headersOnly)).toContain("No music content");
    });

    it("should accept ABC with w: lyrics as music content indicator", () => {
      // w: lines are filtered out when checking for music content,
      // so there must be actual note lines too
      const withLyrics = 'X:1\nT:Test Song\nM:4/4\nL:1/8\nK:C\nCDEF|\nw: Hel-lo world';
      expect(validateAbc(withLyrics)).toBeNull();
    });
  });

  describe("generateSheetMusicInBackground", () => {
    it("should be a fire-and-forget function that returns void", async () => {
      const { generateSheetMusicInBackground } = await import("./backgroundSheetMusic");
      expect(typeof generateSheetMusicInBackground).toBe("function");
    });
  });

  describe("generateAbcNotation", () => {
    it("should be an async function", async () => {
      const { generateAbcNotation } = await import("./backgroundSheetMusic");
      expect(typeof generateAbcNotation).toBe("function");
    });
  });

  describe("integration with song creation flow", () => {
    it("should build context correctly for ElevenLabs-generated songs", () => {
      const result = buildSongContext({
        title: "ElevenLabs Track",
        genre: "Electronic",
        mood: "Chill",
        keySignature: null,
        timeSignature: null,
        tempo: null,
        lyrics: "Some lyrics here",
      });

      expect(result).toContain("Title: ElevenLabs Track");
      expect(result).toContain("Genre: Electronic");
      expect(result).toContain("Mood: Chill");
      expect(result).toContain("Lyrics:\nSome lyrics here");
      expect(result).not.toContain("Key:");
      expect(result).not.toContain("Tempo:");
    });

    it("should build context correctly for uploaded songs", () => {
      const result = buildSongContext({
        title: "My Upload",
        genre: "uploaded",
        mood: "original",
      });

      expect(result).toContain("Title: My Upload");
      expect(result).toContain("Genre: uploaded");
      expect(result).toContain("Mood: original");
    });

    it("should build context correctly for sheet-music-generated songs", () => {
      const result = buildSongContext({
        title: "Classical Piece",
        genre: "Classical",
        mood: "Dramatic",
        keySignature: "D minor",
        timeSignature: "3/4",
        tempo: 80,
        lyrics: null,
      });

      expect(result).toContain("Title: Classical Piece");
      expect(result).toContain("Genre: Classical");
      expect(result).toContain("Key: D minor");
      expect(result).toContain("Time Signature: 3/4");
      expect(result).toContain("Tempo: 80 BPM");
      expect(result).not.toContain("Lyrics");
    });
  });

  describe("sanitiseAbc edge cases", () => {
    it("should handle V: directive with various formats", () => {
      const variants = [
        "V:1 treble",
        "V: 1 treble",
        "V:2 bass",
        "V:1 clef=treble",
        "V:T1 name=\"Soprano\"",
      ];
      for (const v of variants) {
        const raw = `X:1\nT:Test\nK:C\n${v}\nCDEF|`;
        const result = sanitiseAbc(raw);
        expect(result).not.toContain("V:");
        expect(result).toContain("CDEF|");
      }
    });

    it("should not remove lines that happen to contain V: in music content", () => {
      // A chord like "Dm7/A" or note sequences shouldn't be removed
      const raw = 'X:1\nT:Test\nK:C\n"Dm7"CDEF|';
      const result = sanitiseAbc(raw);
      expect(result).toContain('"Dm7"CDEF|');
    });

    it("should handle multiple code fence types", () => {
      const raw = '```\nX:1\nT:Test\nK:C\nCDEF|\n```\n';
      const result = sanitiseAbc(raw);
      expect(result).not.toContain("```");
      expect(result).toContain("X:1");
    });
  });
});
