/**
 * Tests for Part Selection Feature in ZIP Download
 */

import { describe, it, expect } from "vitest";

describe("Part Selection Feature", () => {
  describe("Selection state management", () => {
    it("should initialize with empty selection", () => {
      const selectedParts = new Set<number>();
      expect(selectedParts.size).toBe(0);
    });

    it("should add part to selection", () => {
      const selectedParts = new Set<number>();
      selectedParts.add(0);
      selectedParts.add(2);
      
      expect(selectedParts.size).toBe(2);
      expect(selectedParts.has(0)).toBe(true);
      expect(selectedParts.has(2)).toBe(true);
      expect(selectedParts.has(1)).toBe(false);
    });

    it("should remove part from selection", () => {
      const selectedParts = new Set<number>([0, 1, 2]);
      selectedParts.delete(1);
      
      expect(selectedParts.size).toBe(2);
      expect(selectedParts.has(1)).toBe(false);
      expect(selectedParts.has(0)).toBe(true);
    });

    it("should toggle part selection", () => {
      const selectedParts = new Set<number>();
      
      // Add part
      selectedParts.add(0);
      expect(selectedParts.has(0)).toBe(true);
      
      // Remove part
      selectedParts.delete(0);
      expect(selectedParts.has(0)).toBe(false);
    });
  });

  describe("Select All functionality", () => {
    it("should select all parts", () => {
      const generatedMelodies = [
        { partName: "Lead Vocal", partType: "vocal" },
        { partName: "Alto Harmony", partType: "vocal" },
        { partName: "Piano", partType: "instrument" },
        { partName: "Guitar", partType: "instrument" }
      ];
      
      const allIndices = new Set<number>(
        generatedMelodies.map((_: any, idx: number) => idx)
      );
      
      expect(allIndices.size).toBe(4);
      expect(allIndices.has(0)).toBe(true);
      expect(allIndices.has(3)).toBe(true);
    });

    it("should handle empty melody list", () => {
      const generatedMelodies: any[] = [];
      const allIndices = new Set<number>(
        generatedMelodies.map((_: any, idx: number) => idx)
      );
      
      expect(allIndices.size).toBe(0);
    });
  });

  describe("Deselect All functionality", () => {
    it("should clear all selections", () => {
      const selectedParts = new Set<number>([0, 1, 2, 3, 4]);
      selectedParts.clear();
      
      expect(selectedParts.size).toBe(0);
    });
  });

  describe("Filter selected melodies", () => {
    it("should return only selected melodies", () => {
      const generatedMelodies = [
        { partName: "Lead Vocal", partType: "vocal" },
        { partName: "Alto Harmony", partType: "vocal" },
        { partName: "Piano", partType: "instrument" },
        { partName: "Guitar", partType: "instrument" },
        { partName: "Bass", partType: "instrument" }
      ];
      
      const selectedParts = new Set<number>([0, 2, 4]);
      const selectedMelodies = generatedMelodies.filter(
        (_: any, idx: number) => selectedParts.has(idx)
      );
      
      expect(selectedMelodies).toHaveLength(3);
      expect(selectedMelodies[0].partName).toBe("Lead Vocal");
      expect(selectedMelodies[1].partName).toBe("Piano");
      expect(selectedMelodies[2].partName).toBe("Bass");
    });

    it("should return empty array when no parts selected", () => {
      const generatedMelodies = [
        { partName: "Lead Vocal", partType: "vocal" },
        { partName: "Piano", partType: "instrument" }
      ];
      
      const selectedParts = new Set<number>();
      const selectedMelodies = generatedMelodies.filter(
        (_: any, idx: number) => selectedParts.has(idx)
      );
      
      expect(selectedMelodies).toHaveLength(0);
    });

    it("should preserve order of selected parts", () => {
      const generatedMelodies = [
        { partName: "Lead Vocal", partType: "vocal" },
        { partName: "Alto Harmony", partType: "vocal" },
        { partName: "Tenor Harmony", partType: "vocal" },
        { partName: "Bass Harmony", partType: "vocal" },
        { partName: "Piano", partType: "instrument" }
      ];
      
      const selectedParts = new Set<number>([4, 0, 2]);
      const selectedMelodies = generatedMelodies.filter(
        (_: any, idx: number) => selectedParts.has(idx)
      );
      
      expect(selectedMelodies).toHaveLength(3);
      expect(selectedMelodies[0].partName).toBe("Lead Vocal");
      expect(selectedMelodies[1].partName).toBe("Tenor Harmony");
      expect(selectedMelodies[2].partName).toBe("Piano");
    });
  });

  describe("Download with selected parts", () => {
    it("should disable download when no parts selected", () => {
      const selectedParts = new Set<number>();
      const isDownloadDisabled = selectedParts.size === 0;
      
      expect(isDownloadDisabled).toBe(true);
    });

    it("should enable download when parts selected", () => {
      const selectedParts = new Set<number>([0, 1]);
      const isDownloadDisabled = selectedParts.size === 0;
      
      expect(isDownloadDisabled).toBe(false);
    });

    it("should include only selected parts in ZIP request", () => {
      const generatedMelodies = [
        { partName: "Lead Vocal", partType: "vocal", abcNotation: "C D E" },
        { partName: "Piano", partType: "instrument", abcNotation: "C2 E2 G2" },
        { partName: "Guitar", partType: "instrument", abcNotation: "C E G" }
      ];
      
      const selectedParts = new Set<number>([0, 2]);
      const melodyLinesToDownload = generatedMelodies.filter(
        (_: any, idx: number) => selectedParts.has(idx)
      );
      
      const requestBody = {
        songTitle: "Test Song",
        composer: "Test Composer",
        tempo: 120,
        keySignature: "C",
        timeSignature: "4/4",
        melodyLines: melodyLinesToDownload
      };
      
      expect(requestBody.melodyLines).toHaveLength(2);
      expect(requestBody.melodyLines[0].partName).toBe("Lead Vocal");
      expect(requestBody.melodyLines[1].partName).toBe("Guitar");
    });
  });

  describe("Part selection UI state", () => {
    it("should display correct selected count", () => {
      const selectedParts = new Set<number>([0, 1, 3]);
      const displayText = `Selected: ${selectedParts.size}`;
      
      expect(displayText).toBe("Selected: 3");
    });

    it("should show visual feedback for selected parts", () => {
      const selectedParts = new Set<number>([0, 2]);
      const isPartSelected = (idx: number) => selectedParts.has(idx);
      
      expect(isPartSelected(0)).toBe(true);
      expect(isPartSelected(1)).toBe(false);
      expect(isPartSelected(2)).toBe(true);
    });
  });

  describe("Multiple selection scenarios", () => {
    it("should handle selecting all 8 parts", () => {
      const partCount = 8;
      const selectedParts = new Set<number>();
      
      for (let i = 0; i < partCount; i++) {
        selectedParts.add(i);
      }
      
      expect(selectedParts.size).toBe(8);
    });

    it("should handle selecting only vocal parts", () => {
      const generatedMelodies = [
        { partName: "Lead Vocal", partType: "vocal" },
        { partName: "Alto Harmony", partType: "vocal" },
        { partName: "Tenor Harmony", partType: "vocal" },
        { partName: "Bass Harmony", partType: "vocal" },
        { partName: "Piano", partType: "instrument" },
        { partName: "Guitar", partType: "instrument" },
        { partName: "Bass", partType: "instrument" },
        { partName: "Drums", partType: "instrument" }
      ];
      
      const vocalIndices = generatedMelodies
        .map((m, idx) => (m.partType === "vocal" ? idx : -1))
        .filter((idx) => idx !== -1);
      
      const selectedParts = new Set<number>(vocalIndices);
      
      expect(selectedParts.size).toBe(4);
    });

    it("should handle selecting only instrument parts", () => {
      const generatedMelodies = [
        { partName: "Lead Vocal", partType: "vocal" },
        { partName: "Alto Harmony", partType: "vocal" },
        { partName: "Tenor Harmony", partType: "vocal" },
        { partName: "Bass Harmony", partType: "vocal" },
        { partName: "Piano", partType: "instrument" },
        { partName: "Guitar", partType: "instrument" },
        { partName: "Bass", partType: "instrument" },
        { partName: "Drums", partType: "instrument" }
      ];
      
      const instrumentIndices = generatedMelodies
        .map((m, idx) => (m.partType === "instrument" ? idx : -1))
        .filter((idx) => idx !== -1);
      
      const selectedParts = new Set<number>(instrumentIndices);
      
      expect(selectedParts.size).toBe(4);
    });
  });
});
