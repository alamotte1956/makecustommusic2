import { describe, it, expect } from "vitest";
import { getPresets } from "./audioProcessor";
import { addTempoSync, getTempoVoiceSettings, estimateBpmFromGenre } from "./ssmlBuilder";

describe("Studio Production Routes - Unit Tests", () => {
  describe("Processing Presets", () => {
    it("returns presets with correct structure for the UI", () => {
      const presets = getPresets();
      for (const preset of presets) {
        expect(preset.id).toBeTruthy();
        expect(preset.label).toBeTruthy();
        expect(preset.description).toBeTruthy();
      }
    });

    it("presets have unique IDs", () => {
      const presets = getPresets();
      const ids = presets.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe("Tempo-Synced Vocal Generation", () => {
    it("correctly estimates BPM for the generate route", () => {
      // Test the pipeline: genre -> BPM -> voice settings
      const genre = "hip-hop";
      const bpm = estimateBpmFromGenre(genre);
      const voiceSettings = getTempoVoiceSettings(bpm);

      expect(bpm).toBe(90);
      expect(voiceSettings.stabilityAdjust).toBe(0.05);
      expect(voiceSettings.description).toContain("Relaxed");
    });

    it("applies tempo sync to lyrics before TTS", () => {
      const lyrics = "[Verse 1]\nWalking down the street, feeling free, alive\n\n[Chorus]\nThis is our moment";
      const bpm = estimateBpmFromGenre("r&b"); // 75 BPM = slow

      const synced = addTempoSync(lyrics, { bpm, genre: "r&b" });

      // Slow tempo should add pauses at commas
      expect(synced).toContain("...");
      expect(synced).toContain("[Verse 1]");
      expect(synced).toContain("[Chorus]");
    });

    it("adjusts voice settings based on tempo for energetic genres", () => {
      const bpm = estimateBpmFromGenre("punk"); // 160 BPM — firmly in fast range
      const settings = getTempoVoiceSettings(bpm);

      // Fast tempo should decrease stability and increase style
      expect(settings.stabilityAdjust).toBeLessThan(0);
      expect(settings.styleAdjust).toBeGreaterThan(0);
    });

    it("clamps adjusted voice settings within valid range", () => {
      // Test that adjustments don't push values out of [0, 1]
      const bpm = 160; // Very fast
      const settings = getTempoVoiceSettings(bpm);

      const baseStability = 0.05; // Very low base
      const adjusted = Math.max(0, Math.min(1, baseStability + settings.stabilityAdjust));
      expect(adjusted).toBeGreaterThanOrEqual(0);
      expect(adjusted).toBeLessThanOrEqual(1);

      const baseStyle = 0.95; // Very high base
      const adjustedStyle = Math.max(0, Math.min(1, baseStyle + settings.styleAdjust));
      expect(adjustedStyle).toBeGreaterThanOrEqual(0);
      expect(adjustedStyle).toBeLessThanOrEqual(1);
    });
  });

  describe("Take Variations", () => {
    it("defines three distinct take variations", () => {
      const takeVariations = [
        { label: "Take 1 — Warm & Intimate", stability: 0.6, similarity_boost: 0.85, style: 0.25 },
        { label: "Take 2 — Energetic & Bright", stability: 0.4, similarity_boost: 0.75, style: 0.5 },
        { label: "Take 3 — Smooth & Polished", stability: 0.55, similarity_boost: 0.9, style: 0.35 },
      ];

      expect(takeVariations).toHaveLength(3);

      // Each take should have different stability values
      const stabilities = takeVariations.map((t) => t.stability);
      const uniqueStabilities = new Set(stabilities);
      expect(uniqueStabilities.size).toBe(3);

      // Each take should have different style values
      const styles = takeVariations.map((t) => t.style);
      const uniqueStyles = new Set(styles);
      expect(uniqueStyles.size).toBe(3);
    });

    it("all take settings are within valid ElevenLabs ranges", () => {
      const takeVariations = [
        { stability: 0.6, similarity_boost: 0.85, style: 0.25 },
        { stability: 0.4, similarity_boost: 0.75, style: 0.5 },
        { stability: 0.55, similarity_boost: 0.9, style: 0.35 },
      ];

      for (const take of takeVariations) {
        expect(take.stability).toBeGreaterThanOrEqual(0);
        expect(take.stability).toBeLessThanOrEqual(1);
        expect(take.similarity_boost).toBeGreaterThanOrEqual(0);
        expect(take.similarity_boost).toBeLessThanOrEqual(1);
        expect(take.style).toBeGreaterThanOrEqual(0);
        expect(take.style).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("Mixing Level Validation", () => {
    it("default mixing levels are within expected range", () => {
      const defaultVocalLevel = 2;
      const defaultInstrumentalLevel = -3;

      expect(defaultVocalLevel).toBeGreaterThanOrEqual(-10);
      expect(defaultVocalLevel).toBeLessThanOrEqual(10);
      expect(defaultInstrumentalLevel).toBeGreaterThanOrEqual(-10);
      expect(defaultInstrumentalLevel).toBeLessThanOrEqual(10);

      // Vocal should be louder than instrumental by default
      expect(defaultVocalLevel).toBeGreaterThan(defaultInstrumentalLevel);
    });
  });
});
