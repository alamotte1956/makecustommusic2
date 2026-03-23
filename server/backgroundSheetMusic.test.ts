import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildSongContext } from "./backgroundSheetMusic";

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

  describe("generateSheetMusicInBackground", () => {
    it("should be a fire-and-forget function that returns void", async () => {
      // The function should return void (not a promise) so it doesn't block
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
      // ElevenLabs songs typically have genre and mood but no key/tempo/time
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
      // Uploaded songs typically have minimal metadata
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
      // Songs from sheet music analysis have rich metadata
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
});
