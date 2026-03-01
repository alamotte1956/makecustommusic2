import { describe, it, expect } from "vitest";
import { addTempoSync, getTempoVoiceSettings, estimateBpmFromGenre } from "./ssmlBuilder";

describe("ssmlBuilder", () => {
  describe("estimateBpmFromGenre", () => {
    it("returns correct BPM for common genres", () => {
      expect(estimateBpmFromGenre("hip-hop")).toBe(90);
      expect(estimateBpmFromGenre("pop")).toBe(120);
      expect(estimateBpmFromGenre("rock")).toBe(130);
      expect(estimateBpmFromGenre("trap")).toBe(140);
      expect(estimateBpmFromGenre("ambient")).toBe(70);
      expect(estimateBpmFromGenre("electronic")).toBe(128);
      expect(estimateBpmFromGenre("r&b")).toBe(75);
      expect(estimateBpmFromGenre("country")).toBe(100);
    });

    it("handles case insensitivity", () => {
      expect(estimateBpmFromGenre("Hip-Hop")).toBe(90);
      expect(estimateBpmFromGenre("POP")).toBe(120);
      expect(estimateBpmFromGenre("ROCK")).toBe(130);
    });

    it("returns default 110 for unknown genres", () => {
      expect(estimateBpmFromGenre("experimental noise")).toBe(110);
      expect(estimateBpmFromGenre("unknown")).toBe(110);
    });

    it("matches partial genre names", () => {
      // "indie rock" iterates through the map; order depends on insertion
      // "indie rock" matches "hip-hop" key first in iteration, then "rock" — depends on runtime
      // With longest-match logic: "indie rock" matches "indie" (5 chars) over "rock" (4 chars)
      expect(estimateBpmFromGenre("indie rock")).toBe(110);
      // "lo-fi hip-hop" matches "hip-hop" (7 chars) over "lo-fi" (5 chars)
      expect(estimateBpmFromGenre("lo-fi hip-hop")).toBe(90);
    });
  });

  describe("getTempoVoiceSettings", () => {
    it("returns positive stability adjust for slow tempos", () => {
      const settings = getTempoVoiceSettings(60);
      expect(settings.stabilityAdjust).toBeGreaterThan(0);
      expect(settings.description).toContain("deliberate");
    });

    it("returns zero adjustments for medium tempos", () => {
      const settings = getTempoVoiceSettings(115);
      expect(settings.stabilityAdjust).toBe(0);
      expect(settings.styleAdjust).toBe(0);
    });

    it("returns negative stability adjust for fast tempos", () => {
      const settings = getTempoVoiceSettings(150);
      expect(settings.stabilityAdjust).toBeLessThan(0);
      expect(settings.styleAdjust).toBeGreaterThan(0);
    });

    it("returns descriptions for all tempo ranges", () => {
      const ranges = [60, 85, 115, 130, 160];
      for (const bpm of ranges) {
        const settings = getTempoVoiceSettings(bpm);
        expect(typeof settings.description).toBe("string");
        expect(settings.description.length).toBeGreaterThan(0);
      }
    });
  });

  describe("addTempoSync", () => {
    const sampleLyrics = `[Verse 1]
I walk these streets alone tonight
The city lights are burning bright

[Chorus]
We're running out of time
But everything feels fine`;

    it("returns a string with the lyrics preserved", () => {
      const result = addTempoSync(sampleLyrics, { bpm: 120 });
      expect(result).toContain("I walk these streets alone tonight");
      expect(result).toContain("We're running out of time");
    });

    it("preserves section markers", () => {
      const result = addTempoSync(sampleLyrics, { bpm: 120 });
      expect(result).toContain("[Verse 1]");
      expect(result).toContain("[Chorus]");
    });

    it("adds pauses for slow tempos at commas", () => {
      const lyrics = "[Verse 1]\nHello, world, this is a test";
      const result = addTempoSync(lyrics, { bpm: 70 });
      expect(result).toContain("...");
    });

    it("does not add extra pauses for fast tempos", () => {
      const lyrics = "[Verse 1]\nHello, world";
      const result = addTempoSync(lyrics, { bpm: 140 });
      // Fast tempos should not add ellipses
      expect(result).not.toContain("...");
    });

    it("handles empty lyrics gracefully", () => {
      const result = addTempoSync("", { bpm: 120 });
      expect(typeof result).toBe("string");
    });

    it("handles lyrics without section markers", () => {
      const lyrics = "Just a simple line\nAnother line here";
      const result = addTempoSync(lyrics, { bpm: 120 });
      expect(result).toContain("Just a simple line");
      expect(result).toContain("Another line here");
    });
  });
});
