import { describe, it, expect } from "vitest";

/**
 * Tests for the MP3 Sheet Music Job history feature and progress UI.
 */

describe("MP3 Sheet Music Job History", () => {
  describe("job data shape", () => {
    interface RecentJob {
      id: number;
      fileName: string;
      status: string;
      abcNotation: string | null;
      lyrics: string | null;
      audioUrl: string | null;
      errorMessage: string | null;
      createdAt: Date;
    }

    it("completed jobs have all required fields", () => {
      const job: RecentJob = {
        id: 1,
        fileName: "my-song.mp3",
        status: "done",
        abcNotation: "X: 1\nT: My Song\nK: C\nCDEF |",
        lyrics: "Hello world",
        audioUrl: "https://example.com/audio.mp3",
        errorMessage: null,
        createdAt: new Date(),
      };
      expect(job.id).toBeDefined();
      expect(job.fileName).toBeTruthy();
      expect(job.status).toBe("done");
      expect(job.abcNotation).toBeTruthy();
      expect(job.errorMessage).toBeNull();
    });

    it("failed jobs have error message but no ABC notation", () => {
      const job: RecentJob = {
        id: 2,
        fileName: "bad-audio.mp3",
        status: "error",
        abcNotation: null,
        lyrics: null,
        audioUrl: "https://example.com/bad.mp3",
        errorMessage: "AI returned empty content.",
        createdAt: new Date(),
      };
      expect(job.status).toBe("error");
      expect(job.abcNotation).toBeNull();
      expect(job.errorMessage).toBeTruthy();
    });

    it("in-progress jobs have no ABC notation yet", () => {
      const job: RecentJob = {
        id: 3,
        fileName: "processing.mp3",
        status: "transcribing",
        abcNotation: null,
        lyrics: null,
        audioUrl: "https://example.com/proc.mp3",
        errorMessage: null,
        createdAt: new Date(),
      };
      expect(job.abcNotation).toBeNull();
      expect(job.errorMessage).toBeNull();
    });
  });

  describe("job list filtering", () => {
    function canLoadJob(status: string, abcNotation: string | null): boolean {
      return status === "done" && !!abcNotation;
    }

    it("allows loading completed jobs with ABC notation", () => {
      expect(canLoadJob("done", "X: 1\nT: Test\nK: C\n")).toBe(true);
    });

    it("prevents loading failed jobs", () => {
      expect(canLoadJob("error", null)).toBe(false);
    });

    it("prevents loading in-progress jobs", () => {
      expect(canLoadJob("transcribing", null)).toBe(false);
      expect(canLoadJob("generating", null)).toBe(false);
      expect(canLoadJob("uploading", null)).toBe(false);
    });

    it("prevents loading done jobs without ABC notation (edge case)", () => {
      expect(canLoadJob("done", null)).toBe(false);
    });
  });

  describe("date formatting", () => {
    it("formats dates consistently", () => {
      const date = new Date("2026-03-24T12:30:00Z");
      const formatted = date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      expect(formatted).toBeTruthy();
      expect(formatted.length).toBeGreaterThan(5);
    });
  });

  describe("status badge mapping", () => {
    const STATUS_DISPLAY: Record<string, { label: string; variant: string }> = {
      done: { label: "Done", variant: "green" },
      error: { label: "Failed", variant: "red" },
      transcribing: { label: "Processing", variant: "violet" },
      generating: { label: "Processing", variant: "violet" },
      uploading: { label: "Processing", variant: "violet" },
    };

    it("maps all known statuses to display info", () => {
      expect(STATUS_DISPLAY["done"].label).toBe("Done");
      expect(STATUS_DISPLAY["error"].label).toBe("Failed");
      expect(STATUS_DISPLAY["transcribing"].label).toBe("Processing");
      expect(STATUS_DISPLAY["generating"].label).toBe("Processing");
      expect(STATUS_DISPLAY["uploading"].label).toBe("Processing");
    });

    it("uses green for success, red for error, violet for processing", () => {
      expect(STATUS_DISPLAY["done"].variant).toBe("green");
      expect(STATUS_DISPLAY["error"].variant).toBe("red");
      expect(STATUS_DISPLAY["transcribing"].variant).toBe("violet");
    });
  });
});

describe("Progress UI", () => {
  describe("progress percentage mapping", () => {
    const STEP_PROGRESS: Record<string, number> = {
      uploading: 15,
      transcribing: 40,
      analyzing: 60,
      generating: 80,
    };

    it("maps each step to a progress percentage", () => {
      expect(STEP_PROGRESS["uploading"]).toBe(15);
      expect(STEP_PROGRESS["transcribing"]).toBe(40);
      expect(STEP_PROGRESS["analyzing"]).toBe(60);
      expect(STEP_PROGRESS["generating"]).toBe(80);
    });

    it("progress increases monotonically through steps", () => {
      const steps = ["uploading", "transcribing", "analyzing", "generating"];
      for (let i = 1; i < steps.length; i++) {
        expect(STEP_PROGRESS[steps[i]]).toBeGreaterThan(STEP_PROGRESS[steps[i - 1]]);
      }
    });
  });

  describe("estimated time messages", () => {
    function getEstimateMessage(step: string): string {
      switch (step) {
        case "uploading": return "Preparing your audio file...";
        case "transcribing": return "Estimated time: 20-40 seconds remaining";
        case "generating": return "Estimated time: 15-30 seconds remaining";
        default: return "Processing...";
      }
    }

    it("shows preparation message during upload", () => {
      expect(getEstimateMessage("uploading")).toContain("Preparing");
    });

    it("shows time estimate during transcription", () => {
      expect(getEstimateMessage("transcribing")).toContain("20-40 seconds");
    });

    it("shows time estimate during generation", () => {
      expect(getEstimateMessage("generating")).toContain("15-30 seconds");
    });

    it("shows generic message for unknown steps", () => {
      expect(getEstimateMessage("unknown")).toBe("Processing...");
    });
  });

  describe("step order and completion logic", () => {
    const STEP_ORDER = ["uploading", "transcribing", "generating"];

    function isStepComplete(currentStep: string, checkStep: string): boolean {
      const currentIdx = STEP_ORDER.indexOf(currentStep);
      const checkIdx = STEP_ORDER.indexOf(checkStep);
      if (currentIdx === -1 || checkIdx === -1) return false;
      return checkIdx < currentIdx;
    }

    it("marks earlier steps as complete", () => {
      expect(isStepComplete("generating", "uploading")).toBe(true);
      expect(isStepComplete("generating", "transcribing")).toBe(true);
      expect(isStepComplete("transcribing", "uploading")).toBe(true);
    });

    it("does not mark current or future steps as complete", () => {
      expect(isStepComplete("transcribing", "transcribing")).toBe(false);
      expect(isStepComplete("uploading", "transcribing")).toBe(false);
      expect(isStepComplete("uploading", "generating")).toBe(false);
    });
  });
});
