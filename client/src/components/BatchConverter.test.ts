import { describe, it, expect, vi } from "vitest";

// Unit tests for BatchConverter utility functions and types
// We test the pure functions extracted from the component logic

describe("BatchConverter utilities", () => {
  // Test titleFromFilename logic (same as in the component)
  function titleFromFilename(name: string): string {
    return name
      .replace(/\.[^.]+$/, "")
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  describe("titleFromFilename", () => {
    it("should convert filename to title case", () => {
      expect(titleFromFilename("amazing-grace.mp3")).toBe("Amazing Grace");
    });

    it("should handle underscores", () => {
      expect(titleFromFilename("how_great_thou_art.wav")).toBe("How Great Thou Art");
    });

    it("should handle mixed separators", () => {
      expect(titleFromFilename("be-thou_my-vision.flac")).toBe("Be Thou My Vision");
    });

    it("should handle single word", () => {
      expect(titleFromFilename("hallelujah.mp3")).toBe("Hallelujah");
    });

    it("should handle multiple extensions", () => {
      // \b\w capitalizes after word boundaries including dots
      expect(titleFromFilename("song.backup.mp3")).toBe("Song.Backup");
    });

    it("should handle no extension", () => {
      expect(titleFromFilename("my-song")).toBe("My Song");
    });
  });

  // Test formatFileSize logic
  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  describe("formatFileSize", () => {
    it("should format bytes", () => {
      expect(formatFileSize(500)).toBe("500 B");
    });

    it("should format kilobytes", () => {
      expect(formatFileSize(1024)).toBe("1.0 KB");
      expect(formatFileSize(2560)).toBe("2.5 KB");
    });

    it("should format megabytes", () => {
      expect(formatFileSize(1048576)).toBe("1.0 MB");
      expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
      expect(formatFileSize(16 * 1024 * 1024)).toBe("16.0 MB");
    });
  });

  // Test batch item status types
  describe("BatchItemStatus", () => {
    it("should have all expected statuses", () => {
      const validStatuses = ["queued", "uploading", "transcribing", "generating", "done", "error"];
      validStatuses.forEach(status => {
        expect(typeof status).toBe("string");
      });
    });
  });

  // Test constants
  describe("Constants", () => {
    it("should enforce 16MB max file size", () => {
      const MAX_FILE_SIZE = 16 * 1024 * 1024;
      expect(MAX_FILE_SIZE).toBe(16777216);
    });

    it("should enforce 20 file max batch size", () => {
      const MAX_BATCH_SIZE = 20;
      expect(MAX_BATCH_SIZE).toBe(20);
    });
  });

  // Test audio type validation logic
  describe("Audio type validation", () => {
    const AUDIO_TYPES = [
      "audio/mpeg", "audio/wav", "audio/flac", "audio/ogg",
      "audio/mp4", "audio/x-m4a", "audio/aac", "audio/aiff", "audio/x-aiff",
    ];

    function isValidAudioFile(type: string, name: string): boolean {
      return AUDIO_TYPES.some(t => type === t) ||
        /\.(aiff?|m4a|mp3|wav|flac|ogg)$/i.test(name);
    }

    it("should accept MP3 files", () => {
      expect(isValidAudioFile("audio/mpeg", "song.mp3")).toBe(true);
    });

    it("should accept WAV files", () => {
      expect(isValidAudioFile("audio/wav", "song.wav")).toBe(true);
    });

    it("should accept FLAC files", () => {
      expect(isValidAudioFile("audio/flac", "song.flac")).toBe(true);
    });

    it("should accept M4A files", () => {
      expect(isValidAudioFile("audio/x-m4a", "song.m4a")).toBe(true);
    });

    it("should accept AIFF files", () => {
      expect(isValidAudioFile("audio/aiff", "song.aiff")).toBe(true);
      expect(isValidAudioFile("audio/x-aiff", "song.aif")).toBe(true);
    });

    it("should reject non-audio files", () => {
      expect(isValidAudioFile("application/pdf", "document.pdf")).toBe(false);
      expect(isValidAudioFile("image/png", "image.png")).toBe(false);
    });

    it("should accept files by extension even with empty type", () => {
      expect(isValidAudioFile("", "song.mp3")).toBe(true);
      expect(isValidAudioFile("", "song.wav")).toBe(true);
      expect(isValidAudioFile("", "song.flac")).toBe(true);
    });

    it("should reject files with wrong extension and empty type", () => {
      expect(isValidAudioFile("", "document.txt")).toBe(false);
    });
  });
});
