import { describe, it, expect, vi } from "vitest";
import { sanitizeFilename } from "./albumZip";

// We test the sanitizeFilename utility directly since the Express route
// requires a full HTTP server setup. The route logic is covered by
// integration-level checks.

describe("albumZip", () => {
  describe("sanitizeFilename", () => {
    it("removes unsafe characters", () => {
      expect(sanitizeFilename('My Song: "Remix" <v2>')).toBe("My Song Remix v2");
    });

    it("collapses multiple spaces", () => {
      expect(sanitizeFilename("Hello    World")).toBe("Hello World");
    });

    it("trims whitespace", () => {
      expect(sanitizeFilename("  My Song  ")).toBe("My Song");
    });

    it("returns 'untitled' for empty string", () => {
      expect(sanitizeFilename("")).toBe("untitled");
    });

    it("returns 'untitled' for string of only unsafe characters", () => {
      expect(sanitizeFilename('<>:"/\\|?*')).toBe("untitled");
    });

    it("truncates to 200 characters", () => {
      const longName = "A".repeat(300);
      const result = sanitizeFilename(longName);
      expect(result.length).toBe(200);
    });

    it("handles normal filenames without changes", () => {
      expect(sanitizeFilename("Beautiful Day")).toBe("Beautiful Day");
    });

    it("preserves hyphens and underscores", () => {
      expect(sanitizeFilename("my-song_v2")).toBe("my-song_v2");
    });

    it("preserves parentheses and brackets", () => {
      expect(sanitizeFilename("Song (feat. Artist) [Remix]")).toBe("Song (feat. Artist) [Remix]");
    });

    it("removes null bytes and control characters", () => {
      expect(sanitizeFilename("Song\x00Name\x1F")).toBe("SongName");
    });

    it("handles unicode characters", () => {
      expect(sanitizeFilename("Café Müsik 日本語")).toBe("Café Müsik 日本語");
    });
  });
});
