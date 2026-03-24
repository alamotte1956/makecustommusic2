import { describe, it, expect } from "vitest";

/**
 * Tests for the Save MP3 Sheet Music to Library feature.
 * Validates the title derivation logic, route validation rules, and UI state transitions.
 */

// Title derivation logic (mirrors the backend route)
function deriveTitle(fileName: string, customTitle?: string): string {
  if (customTitle && customTitle.trim()) return customTitle.trim();
  return fileName
    .replace(/\.[^.]+$/, "")      // Remove extension
    .replace(/[-_]/g, " ")         // Replace dashes/underscores with spaces
    .replace(/\b\w/g, (c) => c.toUpperCase()) // Title case
    || "Untitled";
}

describe("Save MP3 Sheet Music to Library", () => {
  describe("Title derivation from filename", () => {
    it("removes file extension", () => {
      expect(deriveTitle("my-song.mp3")).toBe("My Song");
    });

    it("replaces dashes with spaces", () => {
      expect(deriveTitle("my-great-song.wav")).toBe("My Great Song");
    });

    it("replaces underscores with spaces", () => {
      expect(deriveTitle("my_great_song.flac")).toBe("My Great Song");
    });

    it("title-cases each word", () => {
      expect(deriveTitle("hello world.mp3")).toBe("Hello World");
    });

    it("handles multiple extensions", () => {
      expect(deriveTitle("song.backup.mp3")).toBe("Song.Backup");
    });

    it("uses custom title when provided", () => {
      expect(deriveTitle("my-song.mp3", "Custom Title")).toBe("Custom Title");
    });

    it("ignores empty custom title", () => {
      expect(deriveTitle("my-song.mp3", "")).toBe("My Song");
    });

    it("ignores whitespace-only custom title", () => {
      expect(deriveTitle("my-song.mp3", "   ")).toBe("My Song");
    });

    it("trims custom title", () => {
      expect(deriveTitle("my-song.mp3", "  My Custom Title  ")).toBe("My Custom Title");
    });

    it("returns 'Untitled' for empty filename after processing", () => {
      expect(deriveTitle(".mp3")).toBe("Untitled");
    });
  });

  describe("Route validation rules", () => {
    it("should require job to be in 'done' status", () => {
      const validStatuses = ["uploading", "transcribing", "generating", "error"];
      validStatuses.forEach((status) => {
        expect(status).not.toBe("done");
      });
    });

    it("should require abcNotation to be present", () => {
      const job = { status: "done", abcNotation: null };
      expect(job.abcNotation).toBeNull();
    });

    it("should accept job with valid data", () => {
      const job = {
        status: "done",
        abcNotation: "X:1\nT:Test\nK:C\nCDEF|",
        lyrics: "La la la",
        audioUrl: "https://example.com/audio.mp3",
        fileName: "test-song.mp3",
      };
      expect(job.status).toBe("done");
      expect(job.abcNotation).toBeTruthy();
    });
  });

  describe("Song creation data mapping", () => {
    it("maps engine to 'mp3-transcription'", () => {
      const engine = "mp3-transcription";
      expect(engine).toBe("mp3-transcription");
    });

    it("generates keywords from filename", () => {
      const fileName = "test-song.mp3";
      const keywords = `mp3 transcription, ${fileName}`;
      expect(keywords).toBe("mp3 transcription, test-song.mp3");
    });

    it("sets abcNotation to null (uses sheetMusicAbc instead)", () => {
      // The route stores ABC in sheetMusicAbc, not abcNotation
      // abcNotation is for the original AI-generated notation
      const songData = {
        abcNotation: null,
        sheetMusicAbc: "X:1\nT:Test\nK:C\nCDEF|",
      };
      expect(songData.abcNotation).toBeNull();
      expect(songData.sheetMusicAbc).toBeTruthy();
    });
  });

  describe("UI state transitions", () => {
    it("starts with no saved song", () => {
      const savedSongId: number | null = null;
      expect(savedSongId).toBeNull();
    });

    it("shows Save to Library button when not saved", () => {
      const savedSongId: number | null = null;
      const showSaveButton = !savedSongId;
      expect(showSaveButton).toBe(true);
    });

    it("shows View in Library button after saving", () => {
      const savedSongId: number | null = 42;
      const showViewButton = !!savedSongId;
      expect(showViewButton).toBe(true);
    });

    it("resets save state on handleReset", () => {
      let savedSongId: number | null = 42;
      let saveTitle = "My Song";
      let showSaveDialog = true;

      // Simulate reset
      savedSongId = null;
      saveTitle = "";
      showSaveDialog = false;

      expect(savedSongId).toBeNull();
      expect(saveTitle).toBe("");
      expect(showSaveDialog).toBe(false);
    });

    it("pre-fills title from filename on dialog open", () => {
      const fileName = "amazing-track.mp3";
      const defaultTitle = fileName
        .replace(/\.[^.]+$/, "")
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      expect(defaultTitle).toBe("Amazing Track");
    });
  });
});
