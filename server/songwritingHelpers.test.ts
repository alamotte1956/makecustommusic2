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
    it("builds a simple mode prompt with keywords and arrangement", () => {
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
      expect(result.forceInstrumental).toBe(false);
    });

    it("builds a simple mode with genre production details in style", () => {
      const result = buildProductionPrompt({
        keywords: "love song",
        genre: "pop",
        mood: null,
        vocalType: null,
        duration: 60,
        mode: "simple",
      });
      expect(result.prompt).toContain("love song");
      // Genre details go in style field
      expect(result.style).toContain("pop");
      expect(result.style).toContain("BPM");
    });

    it("builds a simple mode with mood production details in style", () => {
      const result = buildProductionPrompt({
        keywords: "midnight drive",
        genre: null,
        mood: "melancholic",
        vocalType: null,
        duration: 45,
        mode: "simple",
      });
      // Mood details go in style field
      expect(result.style).toContain("melancholic");
      expect(result.style).toContain("minor key");
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
      expect(result.style).toContain("instrumental only");
    });

    it("adds vocal description for male vocals in style", () => {
      const result = buildProductionPrompt({
        keywords: "rock anthem",
        genre: "rock",
        mood: null,
        vocalType: "male",
        duration: 120,
        mode: "simple",
      });
      expect(result.style).toContain("male vocals");
      expect(result.forceInstrumental).toBe(false);
    });

    it("adds vocal description for mixed vocals in style", () => {
      const result = buildProductionPrompt({
        keywords: "duet",
        genre: null,
        mood: null,
        vocalType: "mixed",
        duration: 90,
        mode: "simple",
      });
      expect(result.style).toContain("duet");
      expect(result.style).toContain("male and female");
    });

    it("in custom mode, prompt contains ONLY the lyrics (not production notes)", () => {
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
      // prompt = only the lyrics (kie.ai sings this directly)
      expect(result.prompt).toBe("Under the stars tonight\nI found my way to you");
      // style = rich description with customStyle, genre, mood, vocals
      expect(result.style).toContain("dreamy pop ballad");
      expect(result.style).toContain("pop");
      expect(result.style).toContain("romantic");
      expect(result.style).toContain("female vocals");
      // prompt should NOT contain production notes
      expect(result.prompt).not.toContain("radio-ready");
      expect(result.prompt).not.toContain("Production");
      expect(result.prompt).not.toContain("BPM");
    });

    it("in custom mode without style tags, prompt is still only lyrics", () => {
      const result = buildProductionPrompt({
        keywords: "love",
        genre: "gospel",
        mood: "uplifting",
        vocalType: "male",
        duration: 180,
        mode: "custom",
        customTitle: "Amazing Grace Reimagined",
        customLyrics: "Amazing grace how sweet the sound\nThat saved a wretch like me",
        customStyle: "",
      });
      // prompt = only the lyrics
      expect(result.prompt).toBe("Amazing grace how sweet the sound\nThat saved a wretch like me");
      // style should still have genre + mood info even without customStyle
      expect(result.style).toContain("gospel");
      expect(result.style).toContain("uplifting");
      expect(result.style).toContain("male vocals");
      // style should NOT start with a comma (no empty customStyle prefix)
      expect(result.style).not.toMatch(/^,/);
    });

    it("in custom mode with undefined style, prompt is only lyrics", () => {
      const result = buildProductionPrompt({
        keywords: "worship",
        genre: "christian",
        mood: "calm",
        vocalType: "female",
        duration: 120,
        mode: "custom",
        customTitle: "Be Still",
        customLyrics: "Be still and know that I am God\nIn the quiet of the morning",
      });
      // prompt = only the lyrics
      expect(result.prompt).toContain("Be still and know that I am God");
      expect(result.prompt).not.toContain("Production");
      // style should have genre + mood
      expect(result.style).toContain("christian");
      expect(result.style).toContain("calm");
    });

    it("truncates lyrics prompt to 5000 characters in custom mode", () => {
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
      expect(result.prompt.length).toBeLessThanOrEqual(5000);
      expect(result.style.length).toBeLessThanOrEqual(1000);
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
          expect(result.prompt.length).toBeLessThanOrEqual(500);
        }
      }
    });
  });
});
