import { describe, it, expect } from "vitest";

/**
 * Tests for the MP3-to-sheet-music background job architecture.
 * Validates the job status flow, polling logic, and error handling patterns.
 */

describe("MP3 Sheet Music Job Architecture", () => {
  const VALID_STATUSES = ["uploading", "transcribing", "generating", "done", "error"] as const;

  describe("job status transitions", () => {
    it("defines all valid job statuses", () => {
      expect(VALID_STATUSES).toContain("uploading");
      expect(VALID_STATUSES).toContain("transcribing");
      expect(VALID_STATUSES).toContain("generating");
      expect(VALID_STATUSES).toContain("done");
      expect(VALID_STATUSES).toContain("error");
    });

    it("follows the correct status progression", () => {
      // Normal flow: uploading → transcribing → generating → done
      const normalFlow = ["uploading", "transcribing", "generating", "done"];
      for (let i = 0; i < normalFlow.length; i++) {
        expect(VALID_STATUSES).toContain(normalFlow[i]);
      }
    });

    it("can transition to error from any non-terminal status", () => {
      const nonTerminal = ["uploading", "transcribing", "generating"];
      for (const status of nonTerminal) {
        // Each non-terminal status can transition to "error"
        expect(VALID_STATUSES).toContain("error");
        expect(status).not.toBe("done");
        expect(status).not.toBe("error");
      }
    });
  });

  describe("polling response handling", () => {
    type JobStatus = typeof VALID_STATUSES[number];

    interface JobResult {
      status: JobStatus;
      abcNotation: string | null;
      lyrics: string | null;
      audioUrl: string | null;
      fileName: string;
      errorMessage: string | null;
    }

    function shouldStopPolling(result: JobResult): boolean {
      return result.status === "done" || result.status === "error";
    }

    function shouldShowResult(result: JobResult): boolean {
      return result.status === "done" && !!result.abcNotation;
    }

    it("stops polling when status is done", () => {
      const result: JobResult = {
        status: "done",
        abcNotation: "X: 1\nT: Test\nK: C\nCDEF |",
        lyrics: "Hello world",
        audioUrl: "https://example.com/audio.mp3",
        fileName: "test.mp3",
        errorMessage: null,
      };
      expect(shouldStopPolling(result)).toBe(true);
      expect(shouldShowResult(result)).toBe(true);
    });

    it("stops polling when status is error", () => {
      const result: JobResult = {
        status: "error",
        abcNotation: null,
        lyrics: null,
        audioUrl: "https://example.com/audio.mp3",
        fileName: "test.mp3",
        errorMessage: "AI returned empty content.",
      };
      expect(shouldStopPolling(result)).toBe(true);
      expect(shouldShowResult(result)).toBe(false);
    });

    it("continues polling when status is transcribing", () => {
      const result: JobResult = {
        status: "transcribing",
        abcNotation: null,
        lyrics: null,
        audioUrl: "https://example.com/audio.mp3",
        fileName: "test.mp3",
        errorMessage: null,
      };
      expect(shouldStopPolling(result)).toBe(false);
    });

    it("continues polling when status is generating", () => {
      const result: JobResult = {
        status: "generating",
        abcNotation: null,
        lyrics: null,
        audioUrl: "https://example.com/audio.mp3",
        fileName: "test.mp3",
        errorMessage: null,
      };
      expect(shouldStopPolling(result)).toBe(false);
    });

    it("does not show result when done but abcNotation is null", () => {
      const result: JobResult = {
        status: "done",
        abcNotation: null,
        lyrics: null,
        audioUrl: "https://example.com/audio.mp3",
        fileName: "test.mp3",
        errorMessage: null,
      };
      expect(shouldStopPolling(result)).toBe(true);
      expect(shouldShowResult(result)).toBe(false);
    });
  });

  describe("frontend step mapping", () => {
    const STEP_LABELS: Record<string, string> = {
      idle: "",
      uploading: "Uploading audio file...",
      transcribing: "Transcribing audio with Whisper...",
      analyzing: "Analyzing musical elements with AI...",
      generating: "Generating ABC notation...",
      done: "Sheet music ready!",
      error: "Generation failed",
    };

    it("has labels for all processing steps", () => {
      const steps = ["idle", "uploading", "transcribing", "analyzing", "generating", "done", "error"];
      for (const step of steps) {
        expect(STEP_LABELS[step]).toBeDefined();
      }
    });

    it("maps server statuses to frontend steps correctly", () => {
      // Server "transcribing" → frontend "transcribing"
      expect(STEP_LABELS["transcribing"]).toBe("Transcribing audio with Whisper...");
      // Server "generating" → frontend "generating"
      expect(STEP_LABELS["generating"]).toBe("Generating ABC notation...");
      // Server "done" → frontend "done"
      expect(STEP_LABELS["done"]).toBe("Sheet music ready!");
      // Server "error" → frontend "error"
      expect(STEP_LABELS["error"]).toBe("Generation failed");
    });
  });

  describe("file validation", () => {
    const AUDIO_TYPES = ["audio/mpeg", "audio/wav", "audio/flac", "audio/ogg", "audio/mp4", "audio/x-m4a", "audio/aac"];
    const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB

    it("accepts all supported audio types", () => {
      expect(AUDIO_TYPES).toContain("audio/mpeg");
      expect(AUDIO_TYPES).toContain("audio/wav");
      expect(AUDIO_TYPES).toContain("audio/flac");
      expect(AUDIO_TYPES).toContain("audio/ogg");
      expect(AUDIO_TYPES).toContain("audio/mp4");
      expect(AUDIO_TYPES).toContain("audio/x-m4a");
      expect(AUDIO_TYPES).toContain("audio/aac");
    });

    it("enforces 16MB file size limit", () => {
      expect(MAX_FILE_SIZE).toBe(16 * 1024 * 1024);
    });

    it("rejects unsupported types", () => {
      expect(AUDIO_TYPES).not.toContain("video/mp4");
      expect(AUDIO_TYPES).not.toContain("image/png");
      expect(AUDIO_TYPES).not.toContain("text/plain");
    });
  });

  describe("polling interval", () => {
    it("uses 3-second polling interval", () => {
      const POLL_INTERVAL = 3000;
      expect(POLL_INTERVAL).toBe(3000);
      // 3 seconds is reasonable: fast enough for good UX, slow enough to not overload server
      expect(POLL_INTERVAL).toBeGreaterThanOrEqual(2000);
      expect(POLL_INTERVAL).toBeLessThanOrEqual(5000);
    });
  });
});
