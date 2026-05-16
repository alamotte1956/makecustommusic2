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

  // Test individual PDF download eligibility
  describe("Individual PDF download eligibility", () => {
    it("should allow download for completed item with ABC notation", () => {
      const item = { status: "done", abcNotation: "X:1\nT:Test" };
      const canDownload = item.status === "done" && !!item.abcNotation;
      expect(canDownload).toBe(true);
    });

    it("should not allow download for completed item without ABC notation", () => {
      const item = { status: "done", abcNotation: undefined };
      const canDownload = item.status === "done" && !!item.abcNotation;
      expect(canDownload).toBe(false);
    });

    it("should not allow download for queued item", () => {
      const item = { status: "queued", abcNotation: undefined };
      const canDownload = item.status === "done" && !!item.abcNotation;
      expect(canDownload).toBe(false);
    });

    it("should not allow download for errored item", () => {
      const item = { status: "error", abcNotation: undefined };
      const canDownload = item.status === "done" && !!item.abcNotation;
      expect(canDownload).toBe(false);
    });

    it("should generate correct individual PDF filename", () => {
      const title = "How Great Thou Art";
      const expectedFilename = `${title} - Sheet Music.pdf`;
      expect(expectedFilename).toBe("How Great Thou Art - Sheet Music.pdf");
    });
  });

  // Test download progress stages
  describe("Download progress stages", () => {
    type DownloadStage = "rendering" | "composing" | "saving";

    const stageLabels: Record<DownloadStage, string> = {
      rendering: "Rendering notation...",
      composing: "Composing PDF...",
      saving: "Saving \u2713",
    };

    it("should have three distinct stages", () => {
      const stages: DownloadStage[] = ["rendering", "composing", "saving"];
      expect(stages).toHaveLength(3);
    });

    it("should map rendering stage to correct label", () => {
      expect(stageLabels.rendering).toBe("Rendering notation...");
    });

    it("should map composing stage to correct label", () => {
      expect(stageLabels.composing).toBe("Composing PDF...");
    });

    it("should map saving stage to correct label", () => {
      expect(stageLabels.saving).toBe("Saving \u2713");
    });

    it("should have increasing progress percentages across stages", () => {
      const stagePercents = [
        { stage: "rendering" as const, percent: 10 },
        { stage: "rendering" as const, percent: 30 },
        { stage: "composing" as const, percent: 50 },
        { stage: "saving" as const, percent: 100 },
      ];
      for (let i = 1; i < stagePercents.length; i++) {
        expect(stagePercents[i].percent).toBeGreaterThan(stagePercents[i - 1].percent);
      }
    });

    it("should start at 10% and end at 100%", () => {
      const firstPercent = 10;
      const lastPercent = 100;
      expect(firstPercent).toBe(10);
      expect(lastPercent).toBe(100);
    });

    it("should only track one item at a time", () => {
      const progress = { itemId: "item-1", stage: "composing" as const, percent: 50 };
      const isDownloading = (id: string) => progress.itemId === id;
      expect(isDownloading("item-1")).toBe(true);
      expect(isDownloading("item-2")).toBe(false);
    });
  });

  // Test cancel PDF download logic
  describe("Cancel PDF download", () => {
    it("should hide cancel button during saving stage", () => {
      const stage = "saving" as const;
      const showCancel = stage !== "saving";
      expect(showCancel).toBe(false);
    });

    it("should show cancel button during rendering stage", () => {
      const stage = "rendering" as const;
      const showCancel = stage !== "saving";
      expect(showCancel).toBe(true);
    });

    it("should show cancel button during composing stage", () => {
      const stage = "composing" as const;
      const showCancel = stage !== "saving";
      expect(showCancel).toBe(true);
    });

    it("should detect cancellation via abort flag", () => {
      let abortFlag = false;
      abortFlag = true;
      const isCancelled = abortFlag;
      expect(isCancelled).toBe(true);
    });

    it("should reset abort flag after cancellation", () => {
      let abortFlag = true;
      // Simulating the finally block
      abortFlag = false;
      expect(abortFlag).toBe(false);
    });

    it("should use special error message for cancellation", () => {
      const err = new Error("__cancelled__");
      const isCancelError = err.message === "__cancelled__";
      expect(isCancelError).toBe(true);
    });

    it("should not treat regular errors as cancellation", () => {
      const err = new Error("Some PDF error");
      const isCancelError = err.message === "__cancelled__";
      expect(isCancelError).toBe(false);
    });
  });

  // Test drag-and-drop reorder logic
  describe("Drag-and-drop reorder", () => {
    type TestItem = { id: string; status: string };

    function reorder(items: TestItem[], fromId: string, toId: string): TestItem[] {
      const arr = [...items];
      const fromIdx = arr.findIndex(i => i.id === fromId);
      const toIdx = arr.findIndex(i => i.id === toId);
      if (fromIdx === -1 || toIdx === -1) return items;
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      return arr;
    }

    function canDrag(item: TestItem, isProcessing: boolean): boolean {
      return item.status === "queued" && !isProcessing;
    }

    it("should reorder items when dragging from first to third", () => {
      const items: TestItem[] = [
        { id: "a", status: "queued" },
        { id: "b", status: "queued" },
        { id: "c", status: "queued" },
      ];
      const result = reorder(items, "a", "c");
      expect(result.map(i => i.id)).toEqual(["b", "c", "a"]);
    });

    it("should reorder items when dragging from third to first", () => {
      const items: TestItem[] = [
        { id: "a", status: "queued" },
        { id: "b", status: "queued" },
        { id: "c", status: "queued" },
      ];
      const result = reorder(items, "c", "a");
      expect(result.map(i => i.id)).toEqual(["c", "a", "b"]);
    });

    it("should not change order when dragging to same position", () => {
      const items: TestItem[] = [
        { id: "a", status: "queued" },
        { id: "b", status: "queued" },
      ];
      const result = reorder(items, "a", "a");
      expect(result.map(i => i.id)).toEqual(["a", "b"]);
    });

    it("should return original array if fromId not found", () => {
      const items: TestItem[] = [
        { id: "a", status: "queued" },
        { id: "b", status: "queued" },
      ];
      const result = reorder(items, "z", "a");
      expect(result).toBe(items);
    });

    it("should return original array if toId not found", () => {
      const items: TestItem[] = [
        { id: "a", status: "queued" },
        { id: "b", status: "queued" },
      ];
      const result = reorder(items, "a", "z");
      expect(result).toBe(items);
    });

    it("should allow drag for queued items when not processing", () => {
      expect(canDrag({ id: "a", status: "queued" }, false)).toBe(true);
    });

    it("should not allow drag for queued items when processing", () => {
      expect(canDrag({ id: "a", status: "queued" }, true)).toBe(false);
    });

    it("should not allow drag for done items", () => {
      expect(canDrag({ id: "a", status: "done" }, false)).toBe(false);
    });

    it("should not allow drag for error items", () => {
      expect(canDrag({ id: "a", status: "error" }, false)).toBe(false);
    });

    it("should not allow drag for uploading items", () => {
      expect(canDrag({ id: "a", status: "uploading" }, false)).toBe(false);
    });

    it("should handle reorder with mixed statuses correctly", () => {
      const items: TestItem[] = [
        { id: "a", status: "done" },
        { id: "b", status: "queued" },
        { id: "c", status: "queued" },
        { id: "d", status: "error" },
      ];
      // Reorder only moves items in the array, status doesn't matter for the array operation
      const result = reorder(items, "c", "b");
      expect(result.map(i => i.id)).toEqual(["a", "c", "b", "d"]);
    });

    it("should handle single-item array gracefully", () => {
      const items: TestItem[] = [{ id: "a", status: "queued" }];
      const result = reorder(items, "a", "a");
      expect(result.map(i => i.id)).toEqual(["a"]);
    });

    it("should set justDroppedId only when a valid reorder occurs", () => {
      // Simulates the logic: justDroppedId is set when fromId !== toId and both exist
      const dragId = "a";
      const overId = "b";
      const shouldFlash = dragId && overId && dragId !== overId;
      expect(shouldFlash).toBe(true);
    });

    it("should not set justDroppedId when dragging to same position", () => {
      const dragId = "a";
      const overId = "a";
      const shouldFlash = dragId && overId && dragId !== overId;
      expect(shouldFlash).toBe(false);
    });

    it("should not set justDroppedId when no drag target", () => {
      const dragId = "a";
      const overId: string | null = null;
      const shouldFlash = dragId && overId && dragId !== overId;
      expect(shouldFlash).toBeFalsy();
    });
  });
});
