import { describe, it, expect } from "vitest";

// Test the VOCAL_PRODUCTION entries from songwritingHelpers
// We can't import the private const directly, so we test via buildProductionPrompt
import { buildProductionPrompt } from "./songwritingHelpers";

describe("Male & Female Vocal Option", () => {
  describe("buildProductionPrompt with male_and_female vocal type", () => {
    it("should include male and female blended vocal production in Custom mode", () => {
      const { prompt } = buildProductionPrompt({
        keywords: "worship song",
        genre: "Christian",
        mood: "Uplifting",
        vocalType: "male_and_female",
        duration: 120,
        mode: "custom",
        customTitle: "Together We Sing",
        customLyrics: "We lift our voices as one",
        customStyle: "worship, harmony",
      });
      expect(prompt).toContain("male and female");
      expect(prompt).toContain("unison");
      expect(prompt).toContain("harmony");
    });

    it("should include male and female blended vocal production in Simple mode", () => {
      const { prompt } = buildProductionPrompt({
        keywords: "praise and worship",
        genre: "Gospel",
        mood: "Triumphant",
        vocalType: "male_and_female",
        duration: 90,
        mode: "simple",
      });
      expect(prompt).toContain("male and female");
      expect(prompt).toContain("unison");
    });

    it("should NOT be instrumental when male_and_female is selected", () => {
      const { forceInstrumental } = buildProductionPrompt({
        keywords: "worship song",
        genre: "Christian",
        mood: "Uplifting",
        vocalType: "male_and_female",
        duration: 60,
        mode: "simple",
      });
      expect(forceInstrumental).toBe(false);
    });

    it("should produce different prompts for mixed vs male_and_female", () => {
      const mixedResult = buildProductionPrompt({
        keywords: "love song",
        genre: "Pop",
        mood: "Romantic",
        vocalType: "mixed",
        duration: 120,
        mode: "simple",
      });
      const mfResult = buildProductionPrompt({
        keywords: "love song",
        genre: "Pop",
        mood: "Romantic",
        vocalType: "male_and_female",
        duration: 120,
        mode: "simple",
      });
      expect(mixedResult.prompt).not.toBe(mfResult.prompt);
      // mixed = duet with call-and-response
      expect(mixedResult.prompt).toContain("duet");
      // male_and_female = blended unison and harmony
      expect(mfResult.prompt).toContain("unison");
    });

    it("should work with all Christian genres", () => {
      const christianGenres = [
        "Christian", "Gospel", "Christian Modern", "Christian Pop",
        "Christian Rock", "Christian Hip Hop", "Southern Gospel",
        "Hymns", "Praise & Worship", "Christian R&B",
      ];
      for (const genre of christianGenres) {
        const { prompt, forceInstrumental } = buildProductionPrompt({
          keywords: "faith song",
          genre,
          mood: "Devotional",
          vocalType: "male_and_female",
          duration: 120,
          mode: "simple",
        });
        expect(forceInstrumental).toBe(false);
        expect(prompt).toContain("male and female");
      }
    });
  });

  describe("Vocal type distinctions", () => {
    it("should produce instrumental-only for none", () => {
      const { forceInstrumental, prompt } = buildProductionPrompt({
        keywords: "ambient",
        genre: "Ambient",
        mood: "Calm",
        vocalType: "none",
        duration: 60,
        mode: "simple",
      });
      expect(forceInstrumental).toBe(true);
      expect(prompt).toContain("Instrumental only");
    });

    it("should produce male vocals for male", () => {
      const { prompt } = buildProductionPrompt({
        keywords: "rock anthem",
        genre: "Rock",
        mood: "Energetic",
        vocalType: "male",
        duration: 120,
        mode: "simple",
      });
      expect(prompt).toContain("male vocals");
    });

    it("should produce female vocals for female", () => {
      const { prompt } = buildProductionPrompt({
        keywords: "pop ballad",
        genre: "Pop",
        mood: "Romantic",
        vocalType: "female",
        duration: 120,
        mode: "simple",
      });
      expect(prompt).toContain("female vocals");
    });

    it("should produce duet for mixed", () => {
      const { prompt } = buildProductionPrompt({
        keywords: "love duet",
        genre: "R&B",
        mood: "Romantic",
        vocalType: "mixed",
        duration: 120,
        mode: "simple",
      });
      expect(prompt).toContain("duet");
      expect(prompt).toContain("call-and-response");
    });

    it("should produce blended unison for male_and_female", () => {
      const { prompt } = buildProductionPrompt({
        keywords: "worship",
        genre: "Christian",
        mood: "Uplifting",
        vocalType: "male_and_female",
        duration: 120,
        mode: "simple",
      });
      expect(prompt).toContain("unison");
      expect(prompt).toContain("worship-team");
    });
  });
});
