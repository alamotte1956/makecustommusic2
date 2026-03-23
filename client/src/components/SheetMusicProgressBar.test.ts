import { describe, it, expect } from "vitest";

/**
 * Tests for SheetMusicProgressBar logic.
 *
 * Since we're in a Node environment without jsdom, we test the
 * component's rendering logic and props contract rather than
 * actual DOM rendering. The component is a pure function of its
 * props, so we validate the logic that determines visibility,
 * progress clamping, and indicator states.
 */

// ─── Progress Calculation Logic ───

/**
 * Mirrors the progress calculation used in SheetMusicViewer/Mp3ToSheetMusic
 * when converting PlaybackState to progress bar props.
 */
function calculateProgress(currentTime: number, duration: number): number {
  return duration > 0 ? (currentTime / duration) * 100 : 0;
}

/**
 * Mirrors the clamping logic inside SheetMusicProgressBar.
 */
function clampProgress(progress: number): number {
  return Math.min(100, Math.max(0, progress));
}

/**
 * Determines whether the progress bar should be visible.
 * Mirrors the early return logic: `if (!isPlaying && progress === 0) return null`
 */
function isProgressBarVisible(isPlaying: boolean, progress: number): boolean {
  return !((!isPlaying) && progress === 0);
}

/**
 * Determines whether the glowing leading edge should show.
 * Mirrors: `isActive && progress > 0 && progress < 100`
 */
function shouldShowLeadingEdge(isActive: boolean, progress: number): boolean {
  return isActive && progress > 0 && progress < 100;
}

/**
 * Determines whether the paused indicator should show.
 * Mirrors: `!isActive && isPlaying && progress > 0`
 */
function shouldShowPausedIndicator(isActive: boolean, isPlaying: boolean, progress: number): boolean {
  return !isActive && isPlaying && progress > 0;
}

// ─── Tests ───

describe("SheetMusicProgressBar", () => {
  describe("progress calculation", () => {
    it("should calculate 0% when currentTime is 0", () => {
      expect(calculateProgress(0, 10)).toBe(0);
    });

    it("should calculate 50% at midpoint", () => {
      expect(calculateProgress(5, 10)).toBe(50);
    });

    it("should calculate 100% at end", () => {
      expect(calculateProgress(10, 10)).toBe(100);
    });

    it("should return 0 when duration is 0", () => {
      expect(calculateProgress(5, 0)).toBe(0);
    });

    it("should handle fractional progress", () => {
      const progress = calculateProgress(3.7, 12.5);
      expect(progress).toBeCloseTo(29.6, 1);
    });
  });

  describe("progress clamping", () => {
    it("should clamp negative values to 0", () => {
      expect(clampProgress(-10)).toBe(0);
    });

    it("should clamp values over 100 to 100", () => {
      expect(clampProgress(150)).toBe(100);
    });

    it("should pass through valid values unchanged", () => {
      expect(clampProgress(50)).toBe(50);
      expect(clampProgress(0)).toBe(0);
      expect(clampProgress(100)).toBe(100);
    });
  });

  describe("visibility", () => {
    it("should be hidden when not playing and progress is 0", () => {
      expect(isProgressBarVisible(false, 0)).toBe(false);
    });

    it("should be visible when playing", () => {
      expect(isProgressBarVisible(true, 0)).toBe(true);
      expect(isProgressBarVisible(true, 50)).toBe(true);
    });

    it("should be visible when paused with progress > 0", () => {
      // isPlaying is true when paused (paused is a sub-state of playing)
      expect(isProgressBarVisible(true, 30)).toBe(true);
    });

    it("should be visible after playback ends if progress remains", () => {
      // After stop, isPlaying becomes false but progress might still be > 0 briefly
      expect(isProgressBarVisible(false, 100)).toBe(true);
    });
  });

  describe("leading edge indicator", () => {
    it("should show when actively playing with progress between 0 and 100", () => {
      expect(shouldShowLeadingEdge(true, 50)).toBe(true);
    });

    it("should not show when progress is 0", () => {
      expect(shouldShowLeadingEdge(true, 0)).toBe(false);
    });

    it("should not show when progress is 100", () => {
      expect(shouldShowLeadingEdge(true, 100)).toBe(false);
    });

    it("should not show when paused", () => {
      expect(shouldShowLeadingEdge(false, 50)).toBe(false);
    });

    it("should not show when stopped", () => {
      expect(shouldShowLeadingEdge(false, 0)).toBe(false);
    });
  });

  describe("paused indicator", () => {
    it("should show when paused with progress > 0", () => {
      // isActive=false (paused), isPlaying=true (still in a session), progress > 0
      expect(shouldShowPausedIndicator(false, true, 30)).toBe(true);
    });

    it("should not show when actively playing", () => {
      expect(shouldShowPausedIndicator(true, true, 50)).toBe(false);
    });

    it("should not show when stopped", () => {
      expect(shouldShowPausedIndicator(false, false, 0)).toBe(false);
    });

    it("should not show when paused at 0", () => {
      expect(shouldShowPausedIndicator(false, true, 0)).toBe(false);
    });
  });

  describe("PlaybackState to progress bar props mapping", () => {
    it("should map idle state correctly", () => {
      const state = { isPlaying: false, isPaused: false, currentTime: 0, duration: 0, tempo: 120, activeNoteIndex: -1 };
      const progress = calculateProgress(state.currentTime, state.duration);
      const isActive = state.isPlaying && !state.isPaused;
      const isPlaying = state.isPlaying;

      expect(progress).toBe(0);
      expect(isActive).toBe(false);
      expect(isPlaying).toBe(false);
      expect(isProgressBarVisible(isPlaying, progress)).toBe(false);
    });

    it("should map playing state correctly", () => {
      const state = { isPlaying: true, isPaused: false, currentTime: 5, duration: 10, tempo: 120, activeNoteIndex: 3 };
      const progress = calculateProgress(state.currentTime, state.duration);
      const isActive = state.isPlaying && !state.isPaused;
      const isPlaying = state.isPlaying;

      expect(progress).toBe(50);
      expect(isActive).toBe(true);
      expect(isPlaying).toBe(true);
      expect(isProgressBarVisible(isPlaying, progress)).toBe(true);
      expect(shouldShowLeadingEdge(isActive, progress)).toBe(true);
      expect(shouldShowPausedIndicator(isActive, isPlaying, progress)).toBe(false);
    });

    it("should map paused state correctly", () => {
      const state = { isPlaying: true, isPaused: true, currentTime: 3, duration: 10, tempo: 120, activeNoteIndex: 2 };
      const progress = calculateProgress(state.currentTime, state.duration);
      const isActive = state.isPlaying && !state.isPaused;
      const isPlaying = state.isPlaying;

      expect(progress).toBe(30);
      expect(isActive).toBe(false);
      expect(isPlaying).toBe(true);
      expect(isProgressBarVisible(isPlaying, progress)).toBe(true);
      expect(shouldShowLeadingEdge(isActive, progress)).toBe(false);
      expect(shouldShowPausedIndicator(isActive, isPlaying, progress)).toBe(true);
    });

    it("should map completed state correctly", () => {
      const state = { isPlaying: false, isPaused: false, currentTime: 0, duration: 10, tempo: 120, activeNoteIndex: -1 };
      const progress = calculateProgress(state.currentTime, state.duration);
      const isActive = state.isPlaying && !state.isPaused;
      const isPlaying = state.isPlaying;

      expect(progress).toBe(0);
      expect(isActive).toBe(false);
      expect(isPlaying).toBe(false);
    });
  });
});
