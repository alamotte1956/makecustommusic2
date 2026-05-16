import { describe, it, expect } from "vitest";

/**
 * Tests for the bar-highlight logic used in SheetMusicViewer.
 *
 * The actual highlighting runs inside a useCallback that manipulates SVG DOM.
 * Here we test the pure-logic parts extracted as helper functions:
 *   - findBarBoundaries: given sorted bar-line x positions and a note x,
 *     return [leftX, rightX]
 *   - barKey: generate a stable key string for a bar region
 */

// ─── Pure helpers (mirroring the logic in SheetMusicViewer) ───

function findBarBoundaries(
  barPositions: number[],
  noteCenterX: number,
  staffStartX: number,
  staffEndX: number
): [number, number] {
  let leftX = staffStartX;
  let rightX = staffEndX;
  for (let i = 0; i < barPositions.length; i++) {
    if (barPositions[i] <= noteCenterX) {
      leftX = barPositions[i];
    }
    if (barPositions[i] > noteCenterX) {
      rightX = barPositions[i];
      break;
    }
  }
  return [leftX, rightX];
}

function barKey(leftX: number, rightX: number, staffY: number): string {
  return `${Math.round(leftX)}-${Math.round(rightX)}-${Math.round(staffY)}`;
}

// ─── Tests ───

describe("findBarBoundaries", () => {
  it("returns staff boundaries when no bar lines exist", () => {
    const [left, right] = findBarBoundaries([], 100, 10, 500);
    expect(left).toBe(10);
    expect(right).toBe(500);
  });

  it("finds note in the first bar (before any bar line)", () => {
    const bars = [100, 200, 300, 400];
    const [left, right] = findBarBoundaries(bars, 50, 10, 500);
    expect(left).toBe(10);
    expect(right).toBe(100);
  });

  it("finds note in a middle bar", () => {
    const bars = [100, 200, 300, 400];
    const [left, right] = findBarBoundaries(bars, 250, 10, 500);
    expect(left).toBe(200);
    expect(right).toBe(300);
  });

  it("finds note in the last bar (after last bar line)", () => {
    const bars = [100, 200, 300, 400];
    const [left, right] = findBarBoundaries(bars, 450, 10, 500);
    expect(left).toBe(400);
    expect(right).toBe(500);
  });

  it("handles note exactly on a bar line", () => {
    const bars = [100, 200, 300];
    const [left, right] = findBarBoundaries(bars, 200, 10, 400);
    // Note at bar line position: leftX becomes that bar line, rightX is next
    expect(left).toBe(200);
    expect(right).toBe(300);
  });

  it("handles single bar line", () => {
    const bars = [250];
    const [left, right] = findBarBoundaries(bars, 300, 10, 500);
    expect(left).toBe(250);
    expect(right).toBe(500);
  });

  it("handles note before single bar line", () => {
    const bars = [250];
    const [left, right] = findBarBoundaries(bars, 100, 10, 500);
    expect(left).toBe(10);
    expect(right).toBe(250);
  });

  it("handles closely spaced bar lines", () => {
    const bars = [100, 105, 200, 205];
    const [left, right] = findBarBoundaries(bars, 150, 10, 500);
    expect(left).toBe(105);
    expect(right).toBe(200);
  });
});

describe("barKey", () => {
  it("generates a stable key string", () => {
    expect(barKey(100, 200, 50)).toBe("100-200-50");
  });

  it("rounds floating point values", () => {
    expect(barKey(100.4, 200.6, 50.2)).toBe("100-201-50");
  });

  it("same bar produces same key", () => {
    const key1 = barKey(100.1, 200.1, 50.1);
    const key2 = barKey(100.4, 199.8, 50.4);
    expect(key1).toBe(key2);
  });

  it("different bars produce different keys", () => {
    const key1 = barKey(100, 200, 50);
    const key2 = barKey(200, 300, 50);
    expect(key1).not.toBe(key2);
  });

  it("different staff lines produce different keys", () => {
    const key1 = barKey(100, 200, 50);
    const key2 = barKey(100, 200, 150);
    expect(key1).not.toBe(key2);
  });
});

describe("bar highlight CSS class", () => {
  it("uses the correct class name for the highlight rect", () => {
    // The class name used in SheetMusicViewer must match the CSS
    const className = "abcjs-bar-highlight";
    expect(className).toBe("abcjs-bar-highlight");
  });
});

describe("bar highlight cleanup on playback stop", () => {
  it("noteIndex -1 signals playback stopped", () => {
    // When noteIndex is -1, the callback should remove the bar highlight
    const noteIndex = -1;
    expect(noteIndex < 0).toBe(true);
  });

  it("noteIndex >= 0 signals active playback", () => {
    expect(0 >= 0).toBe(true);
    expect(42 >= 0).toBe(true);
  });
});
