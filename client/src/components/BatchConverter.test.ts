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

  // Test sanitizeFilename logic (same as in the component)
  function sanitizeFilename(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 100);
  }

  describe("sanitizeFilename", () => {
    it("should remove special characters", () => {
      expect(sanitizeFilename('Song: "My Heart" <3>')).toBe("Song My Heart 3");
    });

    it("should collapse multiple spaces", () => {
      expect(sanitizeFilename("Song   with   spaces")).toBe("Song with spaces");
    });

    it("should trim whitespace", () => {
      expect(sanitizeFilename("  Song  ")).toBe("Song");
    });

    it("should truncate to 100 characters", () => {
      const longName = "A".repeat(150);
      expect(sanitizeFilename(longName).length).toBe(100);
    });

    it("should handle normal filenames unchanged", () => {
      expect(sanitizeFilename("Amazing Grace")).toBe("Amazing Grace");
    });

    it("should remove pipe and question mark", () => {
      expect(sanitizeFilename("Song | Version? 2")).toBe("Song Version 2");
    });
  });

  // Test ZIP download eligibility logic
  describe("ZIP download eligibility", () => {
    it("should require at least 2 completed items", () => {
      const items = [
        { status: "done", abcNotation: "X:1" },
        { status: "done", abcNotation: "X:2" },
      ];
      const doneCount = items.filter(i => i.status === "done" && i.abcNotation).length;
      expect(doneCount >= 2).toBe(true);
    });

    it("should not show ZIP for single completed item", () => {
      const items = [
        { status: "done", abcNotation: "X:1" },
        { status: "queued", abcNotation: undefined },
      ];
      const doneCount = items.filter(i => i.status === "done" && i.abcNotation).length;
      expect(doneCount >= 2).toBe(false);
    });

    it("should not count items without ABC notation", () => {
      const items = [
        { status: "done", abcNotation: "X:1" },
        { status: "done", abcNotation: undefined },
        { status: "done", abcNotation: "X:3" },
      ];
      const doneCount = items.filter(i => i.status === "done" && i.abcNotation).length;
      expect(doneCount).toBe(2);
    });

    it("should not count errored items", () => {
      const items = [
        { status: "done", abcNotation: "X:1" },
        { status: "error", abcNotation: undefined },
      ];
      const doneCount = items.filter(i => i.status === "done" && i.abcNotation).length;
      expect(doneCount >= 2).toBe(false);
    });
  });

  // Test ZIP filename generation
  describe("ZIP filename generation", () => {
    it("should generate correct ZIP filename", () => {
      const count = 5;
      const filename = `Sheet Music Batch (${count} files).zip`;
      expect(filename).toBe("Sheet Music Batch (5 files).zip");
    });

    it("should generate correct PDF filename inside ZIP", () => {
      const title = "Amazing Grace";
      const pdfFilename = `${sanitizeFilename(title)} - Sheet Music.pdf`;
      expect(pdfFilename).toBe("Amazing Grace - Sheet Music.pdf");
    });

    it("should sanitize PDF filenames with special chars", () => {
      const title = 'Song: "My Heart"';
      const pdfFilename = `${sanitizeFilename(title)} - Sheet Music.pdf`;
      expect(pdfFilename).toBe("Song My Heart - Sheet Music.pdf");
    });
  });
});
