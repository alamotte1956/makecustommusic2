import { describe, it, expect } from "vitest";
import { getGenreGuidance, getMoodGuidance, buildProductionPrompt } from "./songwritingHelpers";

describe("songwritingHelpers", () => {
  describe("getGenreGuidance", () => {
    it("returns guidance for known genres", () => {
      const guidance = getGenreGuidance("pop");
      expect(guidance).toContain("POP");
      expect(guidance).toContain("earworm");
    });

    it("returns guidance for hip hop", () => {
      const guidance = getGenreGuidance("hip hop");
      expect(guidance).toContain("HIP HOP");
      expect(guidance).toContain("FLOW");
    });

    it("returns guidance for rock", () => {
      const guidance = getGenreGuidance("rock");
      expect(guidance).toContain("ROCK");
    });

    it("returns guidance for r&b", () => {
      const guidance = getGenreGuidance("r&b");
      expect(guidance).toContain("R&B");
    });

    it("returns guidance for electronic", () => {
      const guidance = getGenreGuidance("electronic");
      expect(guidance).toContain("ELECTRONIC");
    });

    it("returns guidance for country", () => {
      const guidance = getGenreGuidance("country");
      expect(guidance).toContain("COUNTRY");
    });

    it("returns generic guidance for unknown genres", () => {
      const guidance = getGenreGuidance("polka");
      expect(guidance).toContain("polka");
      expect(guidance).toContain("singability");
    });

    it("returns empty string for null genre", () => {
      expect(getGenreGuidance(null)).toBe("");
    });

    it("is case-insensitive", () => {
      const lower = getGenreGuidance("pop");
      const upper = getGenreGuidance("Pop");
      expect(lower).toBe(upper);
    });
  });

  describe("getMoodGuidance", () => {
    it("returns guidance for known moods", () => {
      const guidance = getMoodGuidance("happy");
      expect(guidance).toContain("HAPPY");
    });

    it("returns guidance for melancholic", () => {
      const guidance = getMoodGuidance("melancholic");
      expect(guidance).toContain("MELANCHOLIC");
    });

    it("returns guidance for energetic", () => {
      const guidance = getMoodGuidance("energetic");
      expect(guidance).toContain("ENERGETIC");
    });

    it("returns guidance for dark", () => {
      const guidance = getMoodGuidance("dark");
      expect(guidance).toContain("DARK");
    });

    it("returns generic guidance for unknown moods", () => {
      const guidance = getMoodGuidance("nostalgic");
      expect(guidance).toContain("nostalgic");
    });

    it("returns empty string for null mood", () => {
      expect(getMoodGuidance(null)).toBe("");
    });
  });

  describe("buildProductionPrompt", () => {
    it("builds a simple mode prompt with keywords only", () => {
      const result = buildProductionPrompt({
        keywords: "summer vibes beach party",
        genre: null,
        mood: null,
        vocalType: null,
        duration: 30,
        mode: "simple",
      });
      expect(result.prompt).toContain("summer vibes beach party");
      expect(result.prompt).toContain("radio-ready");
      expect(result.prompt).toContain("30 seconds");
      expect(result.forceInstrumental).toBe(false);
    });

    it("builds a simple mode prompt with genre production details", () => {
      const result = buildProductionPrompt({
        keywords: "love song",
        genre: "pop",
        mood: null,
        vocalType: null,
        duration: 60,
        mode: "simple",
      });
      expect(result.prompt).toContain("love song");
      expect(result.prompt).toContain("pop");
      expect(result.prompt).toContain("BPM");
      expect(result.prompt).toContain("synth");
    });

    it("builds a simple mode prompt with mood production details", () => {
      const result = buildProductionPrompt({
        keywords: "midnight drive",
        genre: null,
        mood: "melancholic",
        vocalType: null,
        duration: 45,
        mode: "simple",
      });
      expect(result.prompt).toContain("melancholic");
      expect(result.prompt).toContain("minor key");
    });

    it("sets forceInstrumental when vocalType is none", () => {
      const result = buildProductionPrompt({
        keywords: "piano meditation",
        genre: null,
        mood: null,
        vocalType: "none",
        duration: 60,
        mode: "simple",
      });
      expect(result.forceInstrumental).toBe(true);
      expect(result.prompt).toContain("Instrumental only");
    });

    it("adds vocal description for male vocals", () => {
      const result = buildProductionPrompt({
        keywords: "rock anthem",
        genre: "rock",
        mood: null,
        vocalType: "male",
        duration: 120,
        mode: "simple",
      });
      expect(result.prompt).toContain("male vocals");
      expect(result.forceInstrumental).toBe(false);
    });

    it("adds vocal description for mixed vocals", () => {
      const result = buildProductionPrompt({
        keywords: "duet",
        genre: null,
        mood: null,
        vocalType: "mixed",
        duration: 90,
        mode: "simple",
      });
      expect(result.prompt).toContain("duet");
      expect(result.prompt).toContain("male and female");
    });

    it("builds a custom mode prompt with lyrics", () => {
      const result = buildProductionPrompt({
        keywords: "love",
        genre: "pop",
        mood: "romantic",
        vocalType: "female",
        duration: 180,
        mode: "custom",
        customTitle: "Starlight",
        customLyrics: "Under the stars tonight\nI found my way to you",
        customStyle: "dreamy pop ballad",
      });
      expect(result.prompt).toContain("Starlight");
      expect(result.prompt).toContain("dreamy pop ballad");
      expect(result.prompt).toContain("Under the stars tonight");
      expect(result.prompt).toContain("radio-ready");
      expect(result.prompt).toContain("female vocals");
    });

    it("truncates prompt to 4100 characters", () => {
      const longLyrics = "La la la ".repeat(1000);
      const result = buildProductionPrompt({
        keywords: "test",
        genre: "pop",
        mood: "happy",
        vocalType: "female",
        duration: 120,
        mode: "custom",
        customTitle: "Long Song",
        customLyrics: longLyrics,
        customStyle: "pop",
      });
      expect(result.prompt.length).toBeLessThanOrEqual(4100);
    });

    it("handles all genre + mood combinations without errors", () => {
      const genres = ["pop", "hip hop", "rock", "r&b", "electronic", "country", "jazz", "classical", "ambient", "folk", "reggae", "blues"];
      const moods = ["happy", "melancholic", "energetic", "calm", "epic", "romantic", "dark", "uplifting", "mysterious", "playful"];

      for (const genre of genres) {
        for (const mood of moods) {
          const result = buildProductionPrompt({
            keywords: "test song",
            genre,
            mood,
            vocalType: "female",
            duration: 60,
            mode: "simple",
          });
          expect(result.prompt.length).toBeGreaterThan(0);
          expect(result.prompt.length).toBeLessThanOrEqual(4100);
        }
      }
    });
  });
});
