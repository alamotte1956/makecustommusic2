import { describe, it, expect } from "vitest";
import { getGenreGuidance, getMoodGuidance, buildProductionPrompt } from "./songwritingHelpers";
import { estimateBpmFromGenre } from "./ssmlBuilder";

describe("Christian Genre Support", () => {
  describe("Genre Guidance", () => {
    it("should return specific guidance for 'christian' genre", () => {
      const guidance = getGenreGuidance("Christian");
      expect(guidance).toContain("CHRISTIAN");
      expect(guidance).toContain("CCM");
      expect(guidance).toContain("worship");
    });

    it("should return specific guidance for 'gospel' genre", () => {
      const guidance = getGenreGuidance("Gospel");
      expect(guidance).toContain("GOSPEL");
      expect(guidance).toContain("Kirk Franklin");
      expect(guidance).toContain("church");
    });

    it("should return specific guidance for 'christian modern' genre", () => {
      const guidance = getGenreGuidance("Christian Modern");
      expect(guidance).toContain("CHRISTIAN MODERN");
      expect(guidance).toContain("Bethel");
      expect(guidance).toContain("Elevation Worship");
    });

    it("should return specific guidance for 'christian pop' genre", () => {
      const guidance = getGenreGuidance("Christian Pop");
      expect(guidance).toContain("CHRISTIAN POP");
      expect(guidance).toContain("Lauren Daigle");
      expect(guidance).toContain("for KING & COUNTRY");
    });

    it("should be case-insensitive for genre lookup", () => {
      const lower = getGenreGuidance("christian modern");
      const upper = getGenreGuidance("Christian Modern");
      expect(lower).toBe(upper);
    });
  });

  describe("Mood Guidance for Christian Pairing", () => {
    it("should return devotional mood guidance", () => {
      const guidance = getMoodGuidance("Devotional");
      expect(guidance).toContain("DEVOTIONAL");
      expect(guidance).toContain("prayer");
      expect(guidance).toContain("intimate");
    });

    it("should return triumphant mood guidance", () => {
      const guidance = getMoodGuidance("Triumphant");
      expect(guidance).toContain("TRIUMPHANT");
      expect(guidance).toContain("victory");
      expect(guidance).toContain("breakthrough");
    });
  });

  describe("BPM Estimation", () => {
    it("should return correct BPM for christian genre", () => {
      expect(estimateBpmFromGenre("christian")).toBe(90);
    });

    it("should return correct BPM for gospel genre", () => {
      expect(estimateBpmFromGenre("gospel")).toBe(95);
    });

    it("should return correct BPM for christian modern genre", () => {
      expect(estimateBpmFromGenre("christian modern")).toBe(72);
    });

    it("should return correct BPM for christian pop genre", () => {
      expect(estimateBpmFromGenre("christian pop")).toBe(120);
    });

    it("should return correct BPM for worship", () => {
      expect(estimateBpmFromGenre("worship")).toBe(75);
    });

    it("should return correct BPM for ccm", () => {
      expect(estimateBpmFromGenre("ccm")).toBe(100);
    });
  });

  describe("Production Prompt Builder — Christian Genres", () => {
    it("should include Christian sonic signature in simple mode", () => {
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

    it("should include Gospel sonic signature in simple mode", () => {
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

    it("should include sonic signature in custom mode too", () => {
      const { prompt } = buildProductionPrompt({
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
      expect(prompt).toContain("GOSPEL MUSIC SONIC IDENTITY");
      expect(prompt).toContain("Hammond B3");
    });

    it("should NOT include sonic signature for non-Christian genres", () => {
      const { prompt } = buildProductionPrompt({
        keywords: "summer vibes",
        genre: "Pop",
        mood: "Happy",
        vocalType: "female",
        duration: 30,
        mode: "simple",
      });
      expect(prompt).not.toContain("SONIC IDENTITY");
      expect(prompt).not.toContain("worship");
    });

    it("should include genre production settings for all Christian genres", () => {
      const genres = ["Christian", "Gospel", "Christian Modern", "Christian Pop"];
      for (const genre of genres) {
        const { prompt } = buildProductionPrompt({
          keywords: "test",
          genre,
          mood: null,
          vocalType: "male",
          duration: 30,
          mode: "simple",
        });
        // Each should have BPM from GENRE_PRODUCTION
        expect(prompt).toContain("BPM");
        expect(prompt).toContain("instrumentation");
      }
    });
  });
});
