import { describe, it, expect } from "vitest";
import { getPresets } from "./audioProcessor";

describe("audioProcessor", () => {
  describe("getPresets", () => {
    it("returns all five processing presets", () => {
      const presets = getPresets();
      expect(presets).toHaveLength(5);
    });

    it("includes raw, warm, bright, radio-ready, and cinematic presets", () => {
      const presets = getPresets();
      const ids = presets.map((p) => p.id);
      expect(ids).toContain("raw");
      expect(ids).toContain("warm");
      expect(ids).toContain("bright");
      expect(ids).toContain("radio-ready");
      expect(ids).toContain("cinematic");
    });

    it("each preset has id, label, and description", () => {
      const presets = getPresets();
      for (const preset of presets) {
        expect(preset).toHaveProperty("id");
        expect(preset).toHaveProperty("label");
        expect(preset).toHaveProperty("description");
        expect(typeof preset.id).toBe("string");
        expect(typeof preset.label).toBe("string");
        expect(typeof preset.description).toBe("string");
      }
    });

    it("raw preset exists with correct label", () => {
      const presets = getPresets();
      const raw = presets.find((p) => p.id === "raw");
      expect(raw).toBeDefined();
      expect(raw!.label).toBe("Raw");
      expect(raw!.description).toContain("No processing");
    });

    it("radio-ready preset exists with correct label", () => {
      const presets = getPresets();
      const radioReady = presets.find((p) => p.id === "radio-ready");
      expect(radioReady).toBeDefined();
      expect(radioReady!.label).toBe("Radio Ready");
    });
  });
});
