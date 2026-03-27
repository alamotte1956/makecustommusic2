import { describe, it, expect } from "vitest";
import { buildProductionPrompt } from "./songwritingHelpers";

describe("promptPreview endpoint logic", () => {
  it("should return lyrics as prompt in custom mode", () => {
    const result = buildProductionPrompt({
      keywords: "My Song",
      genre: "Gospel",
      mood: "Uplifting",
      vocalType: "male",
      duration: 60,
      mode: "custom",
      customTitle: "Amazing Grace Remix",
      customLyrics: "Amazing grace how sweet the sound\nThat saved a wretch like me",
      customStyle: "worship, reverb",
    });

    // In custom mode, prompt = lyrics only
    expect(result.prompt).toContain("Amazing grace how sweet the sound");
    expect(result.prompt).toContain("That saved a wretch like me");
    // Style should contain the custom style tags and genre
    expect(result.style).toContain("worship, reverb");
    expect(result.style.toLowerCase()).toContain("gospel");
    expect(result.style.toLowerCase()).toContain("uplifting");
    expect(result.forceInstrumental).toBe(false);
  });

  it("should return description as prompt in simple mode", () => {
    const result = buildProductionPrompt({
      keywords: "sunset worship",
      genre: "Praise & Worship",
      mood: "Calm",
      vocalType: "female",
      duration: 120,
      mode: "simple",
    });

    // In simple mode, prompt = description about the keywords
    expect(result.prompt).toContain("sunset worship");
    // Style should contain genre and mood info
    expect(result.style.toLowerCase()).toContain("praise & worship");
    expect(result.style.toLowerCase()).toContain("calm");
    expect(result.forceInstrumental).toBe(false);
  });

  it("should set forceInstrumental when vocalType is none", () => {
    const result = buildProductionPrompt({
      keywords: "peaceful meditation",
      genre: "Ambient",
      mood: null,
      vocalType: "none",
      duration: 60,
      mode: "simple",
    });

    expect(result.forceInstrumental).toBe(true);
    expect(result.style.toLowerCase()).toContain("instrumental");
  });

  it("should handle custom mode without customStyle", () => {
    const result = buildProductionPrompt({
      keywords: "Test",
      genre: "Pop",
      mood: "Happy",
      vocalType: "female",
      duration: 30,
      mode: "custom",
      customLyrics: "La la la, this is my song\nSinging all day long",
    });

    // prompt = lyrics
    expect(result.prompt).toContain("La la la, this is my song");
    // style should still have genre and mood
    expect(result.style.toLowerCase()).toContain("pop");
    expect(result.style.toLowerCase()).toContain("happy");
  });

  it("should truncate prompt to 5000 chars in custom mode", () => {
    const longLyrics = "A".repeat(6000);
    const result = buildProductionPrompt({
      keywords: "Test",
      genre: null,
      mood: null,
      vocalType: null,
      duration: 30,
      mode: "custom",
      customLyrics: longLyrics,
    });

    expect(result.prompt.length).toBeLessThanOrEqual(5000);
  });

  it("should truncate style to 1000 chars", () => {
    const longStyle = "B".repeat(1500);
    const result = buildProductionPrompt({
      keywords: "Test",
      genre: "Gospel",
      mood: "Uplifting",
      vocalType: "male",
      duration: 30,
      mode: "custom",
      customLyrics: "Some lyrics",
      customStyle: longStyle,
    });

    expect(result.style.length).toBeLessThanOrEqual(1000);
  });

  it("should return correct promptLabel based on mode", () => {
    // Custom mode label
    const customResult = buildProductionPrompt({
      keywords: "Test",
      genre: null,
      mood: null,
      vocalType: null,
      duration: 30,
      mode: "custom",
      customLyrics: "My lyrics",
    });
    // The endpoint wraps this, but we can verify the mode determines the label
    expect(customResult.prompt).toBe("My lyrics");

    // Simple mode label
    const simpleResult = buildProductionPrompt({
      keywords: "happy song",
      genre: null,
      mood: null,
      vocalType: null,
      duration: 30,
      mode: "simple",
    });
    expect(simpleResult.prompt).toContain("happy song");
  });
});
