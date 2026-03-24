import { describe, it, expect } from "vitest";

/**
 * Tests for the file size indicator bar logic used in the MP3-to-Sheet-Music upload preview.
 * These validate the percentage calculation, color thresholds, and remaining space display.
 */

const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB

function getFileSizeIndicator(fileSize: number) {
  const pct = Math.min((fileSize / MAX_FILE_SIZE) * 100, 100);
  const sizeMB = fileSize / (1024 * 1024);
  const remainMB = Math.max(16 - sizeMB, 0);
  const barColor = pct < 50 ? "green" : pct < 80 ? "amber" : "red";
  const atLimit = pct >= 100;
  return { pct, sizeMB, remainMB, barColor, atLimit };
}

describe("File Size Indicator Bar", () => {
  describe("Percentage calculation", () => {
    it("calculates 0% for empty file", () => {
      const result = getFileSizeIndicator(0);
      expect(result.pct).toBe(0);
      expect(result.remainMB).toBe(16);
    });

    it("calculates 50% for 8MB file", () => {
      const result = getFileSizeIndicator(8 * 1024 * 1024);
      expect(result.pct).toBeCloseTo(50, 1);
      expect(result.remainMB).toBeCloseTo(8, 1);
    });

    it("calculates 100% for 16MB file", () => {
      const result = getFileSizeIndicator(16 * 1024 * 1024);
      expect(result.pct).toBe(100);
      expect(result.remainMB).toBe(0);
      expect(result.atLimit).toBe(true);
    });

    it("caps at 100% for files larger than 16MB", () => {
      const result = getFileSizeIndicator(20 * 1024 * 1024);
      expect(result.pct).toBe(100);
      expect(result.remainMB).toBe(0);
      expect(result.atLimit).toBe(true);
    });

    it("calculates correctly for small files", () => {
      const result = getFileSizeIndicator(1 * 1024 * 1024); // 1MB
      expect(result.pct).toBeCloseTo(6.25, 1);
      expect(result.sizeMB).toBeCloseTo(1, 1);
      expect(result.remainMB).toBeCloseTo(15, 1);
    });
  });

  describe("Color thresholds", () => {
    it("shows green for files under 50% (< 8MB)", () => {
      expect(getFileSizeIndicator(1 * 1024 * 1024).barColor).toBe("green");
      expect(getFileSizeIndicator(4 * 1024 * 1024).barColor).toBe("green");
      expect(getFileSizeIndicator(7.9 * 1024 * 1024).barColor).toBe("green");
    });

    it("shows amber for files between 50-80% (8-12.8MB)", () => {
      expect(getFileSizeIndicator(8 * 1024 * 1024).barColor).toBe("amber");
      expect(getFileSizeIndicator(10 * 1024 * 1024).barColor).toBe("amber");
      expect(getFileSizeIndicator(12.7 * 1024 * 1024).barColor).toBe("amber");
    });

    it("shows red for files over 80% (> 12.8MB)", () => {
      expect(getFileSizeIndicator(12.8 * 1024 * 1024).barColor).toBe("red");
      expect(getFileSizeIndicator(14 * 1024 * 1024).barColor).toBe("red");
      expect(getFileSizeIndicator(16 * 1024 * 1024).barColor).toBe("red");
    });
  });

  describe("Remaining space display", () => {
    it("shows remaining MB for files under limit", () => {
      const result = getFileSizeIndicator(5 * 1024 * 1024);
      expect(result.atLimit).toBe(false);
      expect(result.remainMB).toBeCloseTo(11, 1);
    });

    it("shows 'at limit' for files at exactly 16MB", () => {
      const result = getFileSizeIndicator(16 * 1024 * 1024);
      expect(result.atLimit).toBe(true);
    });

    it("remaining never goes negative", () => {
      const result = getFileSizeIndicator(20 * 1024 * 1024);
      expect(result.remainMB).toBe(0);
    });
  });

  describe("Edge cases", () => {
    it("handles very small files (1KB)", () => {
      const result = getFileSizeIndicator(1024);
      expect(result.pct).toBeCloseTo(0.006, 2);
      expect(result.barColor).toBe("green");
      expect(result.remainMB).toBeCloseTo(16, 0);
    });

    it("handles boundary at exactly 50%", () => {
      // 50% = 8MB exactly → should be amber (pct is NOT < 50)
      const result = getFileSizeIndicator(8 * 1024 * 1024);
      expect(result.barColor).toBe("amber");
    });

    it("handles boundary at exactly 80%", () => {
      // 80% = 12.8MB exactly → should be red (pct is NOT < 80)
      const result = getFileSizeIndicator(12.8 * 1024 * 1024);
      expect(result.barColor).toBe("red");
    });
  });
});
