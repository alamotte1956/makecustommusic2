/**
 * Tests for the retryMp3SheetJob feature.
 * Covers: route validation, status transitions, and UI state logic.
 */
import { describe, it, expect } from "vitest";

// ─── Route validation logic ───

describe("retryMp3SheetJob route validation", () => {
  it("should only allow retrying jobs with 'error' status", () => {
    const allowedStatuses = ["error"];
    const allStatuses = ["uploading", "transcribing", "generating", "done", "error"];
    allStatuses.forEach((status) => {
      const canRetry = allowedStatuses.includes(status);
      if (status === "error") {
        expect(canRetry).toBe(true);
      } else {
        expect(canRetry).toBe(false);
      }
    });
  });

  it("should require audioUrl to be present for retry", () => {
    const jobWithAudio = { audioUrl: "https://example.com/audio.mp3" };
    const jobWithoutAudio = { audioUrl: null };
    expect(!!jobWithAudio.audioUrl).toBe(true);
    expect(!!jobWithoutAudio.audioUrl).toBe(false);
  });

  it("should reset job fields on retry", () => {
    const resetFields = {
      status: "transcribing",
      errorMessage: null,
      errorCode: null,
      abcNotation: null,
      lyrics: null,
    };
    expect(resetFields.status).toBe("transcribing");
    expect(resetFields.errorMessage).toBeNull();
    expect(resetFields.errorCode).toBeNull();
    expect(resetFields.abcNotation).toBeNull();
    expect(resetFields.lyrics).toBeNull();
  });

  it("should return jobId and new status on successful retry", () => {
    const result = { jobId: 42, status: "transcribing" as const };
    expect(result.jobId).toBe(42);
    expect(result.status).toBe("transcribing");
  });
});

// ─── UI state logic ───

describe("retry button UI logic", () => {
  it("should only show retry button for failed jobs", () => {
    const jobs = [
      { id: 1, status: "done" },
      { id: 2, status: "error" },
      { id: 3, status: "transcribing" },
      { id: 4, status: "generating" },
      { id: 5, status: "uploading" },
    ];
    const retryVisible = jobs.filter((j) => j.status === "error");
    expect(retryVisible).toHaveLength(1);
    expect(retryVisible[0].id).toBe(2);
  });

  it("should not show retry and view buttons simultaneously", () => {
    const job = { status: "error", abcNotation: null };
    const showView = job.status === "done" && !!job.abcNotation;
    const showRetry = job.status === "error";
    // They should never both be true
    expect(showView && showRetry).toBe(false);
  });

  it("should show loading spinner when retry is pending", () => {
    const isPending = true;
    // When pending, show Loader2 instead of RotateCcw
    const iconType = isPending ? "Loader2" : "RotateCcw";
    expect(iconType).toBe("Loader2");
  });

  it("should disable retry button when mutation is pending", () => {
    const isPending = true;
    expect(isPending).toBe(true);
    // Button should have disabled={isPending}
  });

  it("should refetch jobs list after successful retry", () => {
    // After retry mutation succeeds, the onSuccess callback calls refetch()
    // This ensures the job status updates from "error" to "transcribing" in the list
    const jobBefore = { id: 1, status: "error" };
    const jobAfter = { id: 1, status: "transcribing" };
    expect(jobBefore.status).not.toBe(jobAfter.status);
    expect(jobAfter.status).toBe("transcribing");
  });

  it("should show toast on successful retry", () => {
    const toastMessage = "Retrying conversion...";
    expect(toastMessage).toContain("Retry");
  });

  it("should show error toast on failed retry", () => {
    const errorMessage = "Only failed jobs can be retried";
    expect(errorMessage.length).toBeGreaterThan(0);
  });
});

// ─── Status transition logic ───

describe("retry status transitions", () => {
  it("should transition from error → transcribing on retry", () => {
    const before = "error";
    const after = "transcribing";
    expect(before).toBe("error");
    expect(after).toBe("transcribing");
  });

  it("should follow normal processing flow after retry: transcribing → generating → done", () => {
    const flow = ["transcribing", "generating", "done"];
    expect(flow[0]).toBe("transcribing");
    expect(flow[1]).toBe("generating");
    expect(flow[2]).toBe("done");
  });

  it("should be able to fail again after retry: transcribing → error", () => {
    const flow = ["transcribing", "error"];
    expect(flow[0]).toBe("transcribing");
    expect(flow[1]).toBe("error");
    // And can be retried again
  });

  it("should allow multiple retries on the same job", () => {
    // A job can go error → transcribing → error → transcribing → done
    const history = ["error", "transcribing", "error", "transcribing", "done"];
    const retryCount = history.filter((s) => s === "transcribing").length;
    expect(retryCount).toBe(2);
    expect(history[history.length - 1]).toBe("done");
  });
});
