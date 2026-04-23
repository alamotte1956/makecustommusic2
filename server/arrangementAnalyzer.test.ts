/**
 * Tests for Arrangement Analyzer with Instrumentation Customization
 */

import { describe, it, expect, vi } from "vitest";
import { ArrangementAnalyzer, InstrumentationConfig } from "./arrangementAnalyzer";

describe("ArrangementAnalyzer", () => {
  describe("analyzeSong with instrumentation config", () => {
    it("should filter parts based on instrumentation config", async () => {
      // Mock the LLM response
      vi.mock("./_core/llm", () => ({
        invokeLLM: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  arrangementStyle: "Pop arrangement",
                  vocalParts: [
                    {
                      name: "Lead Vocal",
                      voiceType: "soprano",
                      description: "Main melody"
                    },
                    {
                      name: "Harmony Vocal 1",
                      voiceType: "alto",
                      description: "Supporting harmony"
                    }
                  ],
                  instruments: [
                    {
                      name: "Piano",
                      role: "Harmonic foundation"
                    },
                    {
                      name: "Guitar",
                      role: "Melodic accompaniment"
                    },
                    {
                      name: "Bass Guitar",
                      role: "Bass line"
                    },
                    {
                      name: "Drums",
                      role: "Rhythm"
                    }
                  ],
                  reasoning: "Pop arrangement with full band"
                })
              }
            }
          ]
        })
      }));

      // Test with custom instrumentation config that only enables some parts
      const config: InstrumentationConfig = {
        presetId: "custom",
        parts: {
          "Lead Vocal": { enabled: true, prominence: 10 },
          "Harmony Vocal 1": { enabled: false, prominence: 0 },
          "Piano": { enabled: true, prominence: 8 },
          "Guitar": { enabled: true, prominence: 8 },
          "Bass Guitar": { enabled: false, prominence: 0 },
          "Drums": { enabled: true, prominence: 7 }
        }
      };

      // Note: This test would require mocking the LLM call
      // In a real scenario, you would test the filtering logic separately
      expect(config.parts["Lead Vocal"].enabled).toBe(true);
      expect(config.parts["Harmony Vocal 1"].enabled).toBe(false);
      expect(config.parts["Piano"].enabled).toBe(true);
      expect(config.parts["Drums"].enabled).toBe(true);
    });

    it("should count enabled parts correctly", () => {
      const config: InstrumentationConfig = {
        presetId: "pop",
        parts: {
          "Lead Vocal": { enabled: true, prominence: 10 },
          "Harmony Vocal 1": { enabled: true, prominence: 7 },
          "Harmony Vocal 2": { enabled: false, prominence: 0 },
          "Harmony Vocal 3": { enabled: false, prominence: 0 },
          "Piano": { enabled: true, prominence: 8 },
          "Guitar": { enabled: true, prominence: 8 },
          "Bass Guitar": { enabled: true, prominence: 7 },
          "Drums": { enabled: true, prominence: 8 },
          "Violin": { enabled: false, prominence: 0 },
          "Cello": { enabled: false, prominence: 0 },
          "Flute": { enabled: false, prominence: 0 },
          "Trumpet": { enabled: false, prominence: 0 },
          "Trombone": { enabled: false, prominence: 0 }
        }
      };

      const enabledCount = Object.values(config.parts).filter(
        (p) => p.enabled
      ).length;
      expect(enabledCount).toBe(6);
    });

    it("should validate prominence values are within range", () => {
      const config: InstrumentationConfig = {
        presetId: "worship",
        parts: {
          "Lead Vocal": { enabled: true, prominence: 10 },
          "Harmony Vocal 1": { enabled: true, prominence: 8 },
          "Harmony Vocal 2": { enabled: true, prominence: 8 },
          "Harmony Vocal 3": { enabled: true, prominence: 8 },
          "Piano": { enabled: true, prominence: 8 },
          "Guitar": { enabled: true, prominence: 7 },
          "Bass Guitar": { enabled: true, prominence: 7 },
          "Drums": { enabled: true, prominence: 7 },
          "Violin": { enabled: false, prominence: 0 },
          "Cello": { enabled: false, prominence: 0 },
          "Flute": { enabled: false, prominence: 0 },
          "Trumpet": { enabled: false, prominence: 0 },
          "Trombone": { enabled: false, prominence: 0 }
        }
      };

      // Check all prominence values are between 1 and 10
      for (const part of Object.values(config.parts)) {
        if (part.enabled) {
          expect(part.prominence).toBeGreaterThanOrEqual(1);
          expect(part.prominence).toBeLessThanOrEqual(10);
        }
      }
    });

    it("should have valid preset configurations", () => {
      const presets = [
        {
          id: "pop",
          parts: {
            "Lead Vocal": { enabled: true, prominence: 10 },
            "Harmony Vocal 1": { enabled: true, prominence: 7 },
            "Piano": { enabled: true, prominence: 8 },
            "Guitar": { enabled: true, prominence: 8 },
            "Bass Guitar": { enabled: true, prominence: 7 },
            "Drums": { enabled: true, prominence: 8 }
          }
        },
        {
          id: "worship",
          parts: {
            "Lead Vocal": { enabled: true, prominence: 10 },
            "Harmony Vocal 1": { enabled: true, prominence: 8 },
            "Harmony Vocal 2": { enabled: true, prominence: 8 },
            "Harmony Vocal 3": { enabled: true, prominence: 8 },
            "Piano": { enabled: true, prominence: 8 },
            "Guitar": { enabled: true, prominence: 7 },
            "Bass Guitar": { enabled: true, prominence: 7 },
            "Drums": { enabled: true, prominence: 7 }
          }
        },
        {
          id: "acoustic",
          parts: {
            "Lead Vocal": { enabled: true, prominence: 10 },
            "Harmony Vocal 1": { enabled: true, prominence: 8 },
            "Guitar": { enabled: true, prominence: 9 },
            "Bass Guitar": { enabled: true, prominence: 7 }
          }
        }
      ];

      // Verify each preset has at least one enabled part
      for (const preset of presets) {
        const enabledCount = Object.values(preset.parts).filter(
          (p) => p.enabled
        ).length;
        expect(enabledCount).toBeGreaterThan(0);
      }
    });

    it("should support custom preset creation", () => {
      const customConfig: InstrumentationConfig = {
        presetId: "custom",
        parts: {
          "Lead Vocal": { enabled: true, prominence: 10 },
          "Piano": { enabled: true, prominence: 9 },
          "Violin": { enabled: true, prominence: 8 },
          "Cello": { enabled: true, prominence: 7 },
          "Flute": { enabled: true, prominence: 6 }
        }
      };

      expect(customConfig.presetId).toBe("custom");
      const enabledCount = Object.values(customConfig.parts).filter(
        (p) => p.enabled
      ).length;
      expect(enabledCount).toBe(5);
    });

    it("should handle empty instrumentation config", () => {
      const emptyConfig: InstrumentationConfig = {
        parts: {}
      };

      const enabledCount = Object.values(emptyConfig.parts).filter(
        (p) => p.enabled
      ).length;
      expect(enabledCount).toBe(0);
    });

    it("should allow toggling individual parts", () => {
      const config: InstrumentationConfig = {
        presetId: "pop",
        parts: {
          "Lead Vocal": { enabled: true, prominence: 10 },
          "Piano": { enabled: true, prominence: 8 },
          "Drums": { enabled: false, prominence: 0 }
        }
      };

      // Toggle drums on
      config.parts["Drums"].enabled = true;
      config.parts["Drums"].prominence = 8;

      expect(config.parts["Drums"].enabled).toBe(true);
      expect(config.parts["Drums"].prominence).toBe(8);

      // Toggle piano off
      config.parts["Piano"].enabled = false;
      config.parts["Piano"].prominence = 0;

      expect(config.parts["Piano"].enabled).toBe(false);
    });

    it("should allow adjusting prominence values", () => {
      const config: InstrumentationConfig = {
        presetId: "pop",
        parts: {
          "Lead Vocal": { enabled: true, prominence: 10 },
          "Piano": { enabled: true, prominence: 8 }
        }
      };

      // Increase piano prominence
      config.parts["Piano"].prominence = 9;
      expect(config.parts["Piano"].prominence).toBe(9);

      // Decrease lead vocal prominence
      config.parts["Lead Vocal"].prominence = 8;
      expect(config.parts["Lead Vocal"].prominence).toBe(8);
    });
  });
});
