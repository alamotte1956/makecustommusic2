import { describe, it, expect } from "vitest";
import { getGenreGuidance, getMoodGuidance, buildProductionPrompt } from "./songwritingHelpers";

describe("Christian Genre Support", () => {
  describe("getGenreGuidance — Christian Genres", () => {
    it("should return guidance for Christian genre", () => {
      const guidance = getGenreGuidance("Christian");
      expect(guidance).toContain("worship");
    });

    it("should return guidance for Gospel genre", () => {
      const guidance = getGenreGuidance("Gospel");
      expect(guidance).toContain("gospel");
    });

    it("should return guidance for Christian Modern genre", () => {
      const guidance = getGenreGuidance("Christian Modern");
      expect(guidance.length).toBeGreaterThan(0);
    });

    it("should return guidance for Christian Pop genre", () => {
      const guidance = getGenreGuidance("Christian Pop");
      expect(guidance.length).toBeGreaterThan(0);
    });

    it("should be case-insensitive", () => {
      const g1 = getGenreGuidance("christian");
      const g2 = getGenreGuidance("CHRISTIAN");
      const g3 = getGenreGuidance("Christian");
      expect(g1).toBe(g2);
      expect(g2).toBe(g3);
    });

    it("should return different guidance for different Christian sub-genres", () => {
      const christian = getGenreGuidance("Christian");
      const gospel = getGenreGuidance("Gospel");
      expect(christian).not.toBe(gospel);
    });
  });

  describe("getMoodGuidance — Christian-relevant moods", () => {
    it("should return guidance for devotional mood", () => {
      const guidance = getMoodGuidance("Devotional");
      expect(guidance.length).toBeGreaterThan(0);
    });

    it("should return guidance for triumphant mood", () => {
      const guidance = getMoodGuidance("Triumphant");
      expect(guidance.length).toBeGreaterThan(0);
    });

    it("should return guidance for uplifting mood", () => {
      const guidance = getMoodGuidance("Uplifting");
      expect(guidance).toContain("hope");
    });
  });

  describe("Production Prompt Builder — Christian Genres", () => {
    it("should include Christian sonic signature in simple mode prompt", () => {
      const { prompt } = buildProductionPrompt({
        keywords: "amazing grace",
        genre: "Christian",
        mood: "Uplifting",
        vocalType: "female",
        duration: 60,
        mode: "simple",
      });
      expect(prompt).toContain("CHRISTIAN MUSIC SONIC IDENTITY");
      expect(prompt).toContain("worship");
      expect(prompt).toContain("reverent");
    });

    it("should include Gospel sonic signature in simple mode prompt", () => {
      const { prompt } = buildProductionPrompt({
        keywords: "praise the Lord",
        genre: "Gospel",
        mood: "Triumphant",
        vocalType: "mixed",
        duration: 90,
        mode: "simple",
      });
      expect(prompt).toContain("GOSPEL MUSIC SONIC IDENTITY");
      expect(prompt).toContain("Hammond B3");
      expect(prompt).toContain("choir");
    });

    it("should include Christian Modern sonic signature with worship guitar reference", () => {
      const { prompt } = buildProductionPrompt({
        keywords: "God is good",
        genre: "Christian Modern",
        mood: "Devotional",
        vocalType: "male",
        duration: 120,
        mode: "simple",
      });
      expect(prompt).toContain("MODERN WORSHIP SONIC IDENTITY");
      expect(prompt).toContain("dotted-eighth");
      expect(prompt).toContain("Elevation");
    });

    it("should include Christian Pop sonic signature with K-LOVE reference", () => {
      const { prompt } = buildProductionPrompt({
        keywords: "hope in the storm",
        genre: "Christian Pop",
        mood: "Uplifting",
        vocalType: "female",
        duration: 60,
        mode: "simple",
      });
      expect(prompt).toContain("CHRISTIAN POP SONIC IDENTITY");
      expect(prompt).toContain("K-LOVE");
      expect(prompt).toContain("Lauren Daigle");
    });

    it("should use Christian-specific arrangement for Christian Modern", () => {
      const { prompt } = buildProductionPrompt({
        keywords: "worship song",
        genre: "Christian Modern",
        mood: null,
        vocalType: "male",
        duration: 60,
        mode: "simple",
      });
      // Should use the Christian Modern medium arrangement, not generic
      expect(prompt).toContain("pad swell");
      expect(prompt).toContain("delayed guitar");
    });

    it("should use Gospel-specific arrangement for Gospel", () => {
      const { prompt } = buildProductionPrompt({
        keywords: "praise song",
        genre: "Gospel",
        mood: null,
        vocalType: "mixed",
        duration: 60,
        mode: "simple",
      });
      expect(prompt).toContain("Organ");
      expect(prompt).toContain("gospel groove");
    });

    it("should include sonic signature in custom mode style field", () => {
      const { prompt, style } = buildProductionPrompt({
        keywords: "my testimony",
        genre: "Gospel",
        mood: "Triumphant",
        vocalType: "female",
        duration: 90,
        mode: "custom",
        customTitle: "My Testimony",
        customLyrics: "[Verse 1]\nThrough the fire, through the storm\nYou held me in Your arms\n\n[Chorus]\nI will praise You, Lord\nForever and ever more",
        customStyle: "soulful gospel with choir",
      });
      // In custom mode, prompt = only lyrics, style = musical description
      expect(prompt).toContain("Through the fire, through the storm");
      expect(prompt).not.toContain("GOSPEL MUSIC SONIC IDENTITY");
      // Sonic signature goes into the style field in custom mode
      expect(style).toContain("GOSPEL MUSIC SONIC IDENTITY");
      expect(style).toContain("soulful gospel with choir");
      expect(style).toContain("Gospel");
    });

    it("should NOT include sonic signature for non-Christian genres", () => {
      const { prompt, style } = buildProductionPrompt({
        keywords: "summer vibes",
        genre: "Pop",
        mood: "Happy",
        vocalType: "female",
        duration: 30,
        mode: "simple",
      });
      expect(prompt).not.toContain("SONIC IDENTITY");
      expect(style).not.toContain("SONIC IDENTITY");
    });

    it("should include genre production settings for all Christian genres in style", () => {
      const genres = ["Christian", "Gospel", "Christian Modern", "Christian Pop"];
      for (const genre of genres) {
        const { style } = buildProductionPrompt({
          keywords: "test",
          genre,
          mood: null,
          vocalType: "male",
          duration: 30,
          mode: "simple",
        });
        // Each should have BPM from GENRE_PRODUCTION in the style field
        expect(style).toContain("BPM");
      }
    });

    it("should include vocal production in style field for simple mode", () => {
      const { style } = buildProductionPrompt({
        keywords: "worship",
        genre: "Christian",
        mood: "Uplifting",
        vocalType: "female",
        duration: 60,
        mode: "simple",
      });
      expect(style).toContain("female vocals");
    });

    it("should include instrumental in style field when vocalType is none", () => {
      const { style, forceInstrumental } = buildProductionPrompt({
        keywords: "meditation",
        genre: "Christian",
        mood: "Calm",
        vocalType: "none",
        duration: 60,
        mode: "simple",
      });
      expect(forceInstrumental).toBe(true);
      expect(style).toContain("instrumental only");
    });
  });
});
