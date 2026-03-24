import { describe, it, expect } from "vitest";
import { buildCoverArtPrompt, isChristianGenre, getChristianGenreKeys } from "./coverArtMotifs";

describe("Cover Art Motifs", () => {
  // ─── Christian Genre Detection ───
  describe("isChristianGenre", () => {
    it("should detect all 10 Christian genres", () => {
      const genres = [
        "Christian", "Gospel", "Christian Modern", "Christian Pop",
        "Christian Rock", "Christian Hip Hop", "Southern Gospel",
        "Hymns", "Praise & Worship", "Christian R&B",
      ];
      for (const genre of genres) {
        expect(isChristianGenre(genre)).toBe(true);
      }
    });

    it("should be case-insensitive", () => {
      expect(isChristianGenre("CHRISTIAN")).toBe(true);
      expect(isChristianGenre("gospel")).toBe(true);
      expect(isChristianGenre("Christian Rock")).toBe(true);
      expect(isChristianGenre("HYMNS")).toBe(true);
    });

    it("should return false for non-Christian genres", () => {
      const genres = ["Pop", "Rock", "Jazz", "Electronic", "Hip Hop", "Country", "R&B"];
      for (const genre of genres) {
        expect(isChristianGenre(genre)).toBe(false);
      }
    });
  });

  describe("getChristianGenreKeys", () => {
    it("should return all 10 Christian genre keys", () => {
      const keys = getChristianGenreKeys();
      expect(keys).toHaveLength(10);
      expect(keys).toContain("christian");
      expect(keys).toContain("gospel");
      expect(keys).toContain("christian modern");
      expect(keys).toContain("christian pop");
      expect(keys).toContain("christian rock");
      expect(keys).toContain("christian hip hop");
      expect(keys).toContain("southern gospel");
      expect(keys).toContain("hymns");
      expect(keys).toContain("praise & worship");
      expect(keys).toContain("christian r&b");
    });
  });

  // ─── Christian Genre Visual Motifs ───
  describe("Christian genre cover art prompts", () => {
    it("should include golden light and cross for Christian (CCM)", () => {
      const prompt = buildCoverArtPrompt({
        title: "Amazing Grace",
        genres: ["Christian"],
        moods: ["Uplifting"],
        type: "album",
      });
      expect(prompt).toContain("golden");
      expect(prompt).toContain("light rays");
      expect(prompt).toContain("cross");
      expect(prompt).toContain("sunrise");
      expect(prompt).toContain("AVOID");
    });

    it("should include stained glass and church for Gospel", () => {
      const prompt = buildCoverArtPrompt({
        title: "Joyful Praise",
        genres: ["Gospel"],
        moods: ["Triumphant"],
        type: "album",
      });
      expect(prompt).toContain("stained glass");
      expect(prompt).toContain("church");
      expect(prompt).toContain("golden");
      expect(prompt).toContain("royal purple");
    });

    it("should include dark stage and atmospheric haze for Christian Modern", () => {
      const prompt = buildCoverArtPrompt({
        title: "Worship Night",
        genres: ["Christian Modern"],
        moods: ["Devotional"],
        type: "album",
      });
      expect(prompt).toContain("atmospheric");
      expect(prompt).toContain("stage");
      expect(prompt).toContain("worship night");
      expect(prompt).toContain("navy blue");
    });

    it("should include bright modern design for Christian Pop", () => {
      const prompt = buildCoverArtPrompt({
        title: "You Say",
        genres: ["Christian Pop"],
        moods: ["Happy"],
        type: "song",
      });
      expect(prompt).toContain("bright");
      expect(prompt).toContain("modern");
      expect(prompt).toContain("K-LOVE");
      expect(prompt).toContain("coral");
    });

    it("should include arena rock and dramatic imagery for Christian Rock", () => {
      const prompt = buildCoverArtPrompt({
        title: "Stand Firm",
        genres: ["Christian Rock"],
        moods: ["Energetic"],
        type: "album",
      });
      expect(prompt).toContain("dramatic");
      expect(prompt).toContain("arena");
      expect(prompt).toContain("lightning");
      expect(prompt).toContain("fiery");
    });

    it("should include urban art and bold colors for Christian Hip Hop", () => {
      const prompt = buildCoverArtPrompt({
        title: "Redemption",
        genres: ["Christian Hip Hop"],
        moods: ["Dark"],
        type: "song",
      });
      expect(prompt).toContain("urban");
      expect(prompt).toContain("graffiti");
      expect(prompt).toContain("bold");
      expect(prompt).toContain("cityscape");
    });

    it("should include pastoral scenes and vintage warmth for Southern Gospel", () => {
      const prompt = buildCoverArtPrompt({
        title: "Homecoming",
        genres: ["Southern Gospel"],
        moods: ["Uplifting"],
        type: "album",
      });
      expect(prompt).toContain("country church");
      expect(prompt).toContain("nostalgic");
      expect(prompt).toContain("sepia");
      expect(prompt).toContain("pastoral");
    });

    it("should include cathedral and illuminated manuscript for Hymns", () => {
      const prompt = buildCoverArtPrompt({
        title: "Be Thou My Vision",
        genres: ["Hymns"],
        moods: ["Devotional"],
        type: "album",
      });
      expect(prompt).toContain("cathedral");
      expect(prompt).toContain("illuminated manuscript");
      expect(prompt).toContain("pipe organ");
      expect(prompt).toContain("timeless");
    });

    it("should include concert energy and raised hands for Praise & Worship", () => {
      const prompt = buildCoverArtPrompt({
        title: "Glorious Day",
        genres: ["Praise & Worship"],
        moods: ["Triumphant"],
        type: "album",
      });
      expect(prompt).toContain("hands raised");
      expect(prompt).toContain("concert");
      expect(prompt).toContain("explosive");
      expect(prompt).toContain("confetti");
    });

    it("should include smooth gradients and intimate lighting for Christian R&B", () => {
      const prompt = buildCoverArtPrompt({
        title: "Grace & Love",
        genres: ["Christian R&B"],
        moods: ["Romantic"],
        type: "song",
      });
      expect(prompt).toContain("smooth");
      expect(prompt).toContain("intimate");
      expect(prompt).toContain("rose gold");
      expect(prompt).toContain("candlelit");
    });
  });

  // ─── Prompt Structure ───
  describe("Prompt structure for Christian genres", () => {
    it("should include VISUAL STYLE, COLOR PALETTE, VISUAL MOTIFS, COMPOSITION, and AVOID sections", () => {
      const prompt = buildCoverArtPrompt({
        title: "Test",
        genres: ["Gospel"],
        moods: ["Happy"],
        type: "album",
      });
      expect(prompt).toContain("VISUAL STYLE:");
      expect(prompt).toContain("COLOR PALETTE:");
      expect(prompt).toContain("VISUAL MOTIFS:");
      expect(prompt).toContain("COMPOSITION:");
      expect(prompt).toContain("AVOID:");
    });

    it("should include the title in the prompt", () => {
      const prompt = buildCoverArtPrompt({
        title: "My Worship Album",
        genres: ["Christian"],
        moods: [],
        type: "album",
      });
      expect(prompt).toContain("My Worship Album");
    });

    it("should include instruments when provided", () => {
      const prompt = buildCoverArtPrompt({
        title: "Test",
        genres: ["Hymns"],
        moods: [],
        instruments: ["pipe organ", "choir", "strings"],
        type: "album",
      });
      expect(prompt).toContain("pipe organ");
      expect(prompt).toContain("choir");
    });

    it("should include description when provided", () => {
      const prompt = buildCoverArtPrompt({
        title: "Test",
        genres: ["Gospel"],
        moods: [],
        description: "A joyful celebration of faith",
        type: "album",
      });
      expect(prompt).toContain("A joyful celebration of faith");
    });

    it("should include keywords when provided", () => {
      const prompt = buildCoverArtPrompt({
        title: "Test",
        genres: ["Christian Rock"],
        moods: [],
        keywords: "spiritual warfare",
        type: "song",
      });
      expect(prompt).toContain("spiritual warfare");
    });

    it("should specify 'album cover art' for album type", () => {
      const prompt = buildCoverArtPrompt({
        title: "Test",
        genres: ["Christian"],
        moods: [],
        type: "album",
      });
      expect(prompt).toContain("album cover art");
    });

    it("should specify 'single cover art' for song type", () => {
      const prompt = buildCoverArtPrompt({
        title: "Test",
        genres: ["Christian"],
        moods: [],
        type: "song",
      });
      expect(prompt).toContain("single cover art");
    });

    it("should always include 'No text' instruction", () => {
      const prompt = buildCoverArtPrompt({
        title: "Test",
        genres: ["Gospel"],
        moods: [],
        type: "album",
      });
      expect(prompt).toContain("No text");
    });
  });

  // ─── Non-Christian Genres ───
  describe("Non-Christian genre cover art prompts", () => {
    it("should NOT include VISUAL STYLE sections for non-Christian genres", () => {
      const prompt = buildCoverArtPrompt({
        title: "Pop Hit",
        genres: ["Pop"],
        moods: ["Happy"],
        type: "song",
      });
      expect(prompt).not.toContain("VISUAL STYLE:");
      expect(prompt).not.toContain("AVOID:");
    });

    it("should include genre-specific style hints for non-Christian genres", () => {
      const prompt = buildCoverArtPrompt({
        title: "Jazz Night",
        genres: ["Jazz"],
        moods: ["Calm"],
        type: "album",
      });
      expect(prompt).toContain("smoky");
      expect(prompt).toContain("vintage");
    });

    it("should work with empty genres", () => {
      const prompt = buildCoverArtPrompt({
        title: "Unknown",
        genres: [],
        moods: [],
        type: "song",
      });
      expect(prompt).toContain("eclectic");
      expect(prompt).toContain("Unknown");
    });
  });

  // ─── Genre Isolation ───
  describe("Genre isolation", () => {
    it("should produce distinct prompts for each Christian genre", () => {
      const genres = [
        "Christian", "Gospel", "Christian Modern", "Christian Pop",
        "Christian Rock", "Christian Hip Hop", "Southern Gospel",
        "Hymns", "Praise & Worship", "Christian R&B",
      ];
      const prompts = genres.map(genre =>
        buildCoverArtPrompt({
          title: "Test",
          genres: [genre],
          moods: ["Happy"],
          type: "album",
        })
      );
      const uniquePrompts = new Set(prompts);
      expect(uniquePrompts.size).toBe(genres.length);
    });

    it("should use the first Christian genre found when multiple genres are present", () => {
      const prompt = buildCoverArtPrompt({
        title: "Mixed Album",
        genres: ["Pop", "Gospel", "Rock"],
        moods: ["Happy"],
        type: "album",
      });
      // Gospel is the first Christian genre, so it should use Gospel motifs
      expect(prompt).toContain("stained glass");
    });

    it("should fall back to non-Christian style when no Christian genre is present", () => {
      const prompt = buildCoverArtPrompt({
        title: "Rock Album",
        genres: ["Rock", "Pop"],
        moods: ["Energetic"],
        type: "album",
      });
      expect(prompt).not.toContain("VISUAL STYLE:");
      expect(prompt).toContain("raw and powerful");
    });
  });
});
