import { describe, it, expect } from "vitest";
import {
  calculateCapoChart,
  getBestCapoPositions,
  getCapoLabel,
} from "./capoChart";

describe("capoChart", () => {
  describe("calculateCapoChart", () => {
    it("returns 10 positions (frets 0-9)", () => {
      const result = calculateCapoChart("G", ["G", "C", "D", "Em"]);
      expect(result).toHaveLength(10);
      expect(result[0].fret).toBe(0);
      expect(result[9].fret).toBe(9);
    });

    it("fret 0 returns original chords unchanged", () => {
      const result = calculateCapoChart("G", ["G", "C", "D", "Em"]);
      const noCapo = result[0];
      expect(noCapo.chordShapes["G"]).toBe("G");
      expect(noCapo.chordShapes["C"]).toBe("C");
      expect(noCapo.chordShapes["D"]).toBe("D");
      expect(noCapo.chordShapes["Em"]).toBe("Em");
    });

    it("transposes chords down by the fret number", () => {
      // Capo 2 on a song in A: you'd play G shapes (A is 2 semitones above G)
      const result = calculateCapoChart("A", ["A", "D", "E"]);
      const capo2 = result[2];
      expect(capo2.playKey).toBe("G");
      expect(capo2.chordShapes["A"]).toBe("G");
      expect(capo2.chordShapes["D"]).toBe("C");
      expect(capo2.chordShapes["E"]).toBe("D");
    });

    it("handles minor keys correctly", () => {
      const result = calculateCapoChart("Am", ["Am", "Dm", "E"]);
      const noCapo = result[0];
      expect(noCapo.playKey).toBe("Am");
      expect(noCapo.isEasyKey).toBe(true);
    });

    it("handles flat keys", () => {
      const result = calculateCapoChart("Bb", ["Bb", "Eb", "F"]);
      // Capo 1 on Bb → play in A shapes
      const capo1 = result[1];
      expect(capo1.playKey).toBe("A");
      expect(capo1.chordShapes["Bb"]).toBe("A");
    });

    it("handles sharp keys", () => {
      const result = calculateCapoChart("F#", ["F#", "B", "Db"]);
      // Capo 2 on F# → play in E shapes
      const capo2 = result[2];
      expect(capo2.playKey).toBe("E");
      expect(capo2.chordShapes["F#"]).toBe("E");
    });

    it("calculates easy chord percentage correctly", () => {
      // G, C, D, Em are all easy open chords
      const result = calculateCapoChart("G", ["G", "C", "D", "Em"]);
      const noCapo = result[0];
      expect(noCapo.easyChordCount).toBe(4);
      expect(noCapo.totalChords).toBe(4);
      expect(noCapo.easyPercent).toBe(100);
    });

    it("deduplicates chords", () => {
      const result = calculateCapoChart("G", ["G", "C", "G", "D", "C"]);
      const noCapo = result[0];
      expect(noCapo.totalChords).toBe(3); // G, C, D
    });

    it("filters out empty chord strings", () => {
      const result = calculateCapoChart("G", ["G", "", "C", " ", "D"]);
      const noCapo = result[0];
      expect(noCapo.totalChords).toBe(3);
    });

    it("marks recommended positions correctly", () => {
      // Bb with Bb, Eb, F, Gm — hard chords
      // Capo 1 → A, D, E, F#m — 3/4 easy, key A is easy → 75% → recommended
      const result = calculateCapoChart("Bb", ["Bb", "Eb", "F", "Gm"]);
      const capo1 = result[1];
      expect(capo1.playKey).toBe("A");
      expect(capo1.isEasyKey).toBe(true);
      // A, D, E are easy; F#m is not
      expect(capo1.easyChordCount).toBe(3);
      expect(capo1.easyPercent).toBe(75);
      expect(capo1.recommended).toBe(true);
    });

    it("handles key strings with 'major' or 'minor' suffixes", () => {
      const result = calculateCapoChart("G major", ["G", "C", "D"]);
      expect(result[0].playKey).toBe("G");
      expect(result[0].isEasyKey).toBe(true);

      const minorResult = calculateCapoChart("A minor", ["Am", "Dm", "E"]);
      expect(minorResult[0].playKey).toBe("Am");
      expect(minorResult[0].isEasyKey).toBe(true);
    });

    it("handles slash chords", () => {
      const result = calculateCapoChart("G", ["G", "C/E", "D/F#"]);
      const capo2 = result[2];
      // G → F, C/E → Bb/D, D/F# → C/E
      expect(capo2.chordShapes["C/E"]).toBe("Bb/D");
      expect(capo2.chordShapes["D/F#"]).toBe("C/E");
    });

    it("returns empty chord shapes for empty chord list", () => {
      const result = calculateCapoChart("G", []);
      expect(result[0].totalChords).toBe(0);
      expect(result[0].easyPercent).toBe(0);
    });
  });

  describe("getBestCapoPositions", () => {
    it("excludes fret 0 (no capo)", () => {
      const result = getBestCapoPositions("G", ["G", "C", "D"]);
      expect(result.every((p) => p.fret > 0)).toBe(true);
    });

    it("returns up to maxResults positions", () => {
      const result = getBestCapoPositions("G", ["G", "C", "D"], 2);
      expect(result.length).toBeLessThanOrEqual(2);
    });

    it("sorts by recommended first, then by easy percent", () => {
      const result = getBestCapoPositions("Bb", ["Bb", "Eb", "F", "Gm"], 5);
      // Recommended positions should come first
      const recommendedIndices = result
        .map((p, i) => (p.recommended ? i : -1))
        .filter((i) => i >= 0);
      const nonRecommendedIndices = result
        .map((p, i) => (!p.recommended ? i : -1))
        .filter((i) => i >= 0);

      if (recommendedIndices.length > 0 && nonRecommendedIndices.length > 0) {
        expect(Math.max(...recommendedIndices)).toBeLessThan(
          Math.min(...nonRecommendedIndices)
        );
      }
    });

    it("returns positions for a difficult key like Db", () => {
      const result = getBestCapoPositions("Db", ["Db", "Gb", "Ab"]);
      expect(result.length).toBeGreaterThan(0);
      // Should suggest capo positions that simplify these chords
    });
  });

  describe("getCapoLabel", () => {
    it("returns 'No Capo' for fret 0", () => {
      expect(getCapoLabel(0)).toBe("No Capo");
    });

    it("uses correct ordinal suffixes", () => {
      expect(getCapoLabel(1)).toBe("Capo 1st Fret");
      expect(getCapoLabel(2)).toBe("Capo 2nd Fret");
      expect(getCapoLabel(3)).toBe("Capo 3rd Fret");
      expect(getCapoLabel(4)).toBe("Capo 4th Fret");
      expect(getCapoLabel(5)).toBe("Capo 5th Fret");
      expect(getCapoLabel(9)).toBe("Capo 9th Fret");
    });
  });
});
