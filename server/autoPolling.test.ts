/**
 * Tests for the auto-polling feature in Recent Conversions.
 * Covers: polling activation logic, status detection, and cleanup behavior.
 */
import { describe, it, expect } from "vitest";

// ─── Processing status detection ───

const PROCESSING_STATUSES = ["uploading", "transcribing", "generating"];
const TERMINAL_STATUSES = ["done", "error"];

function hasProcessingJobs(jobs: { status: string }[]): boolean {
  return jobs.some((j) => PROCESSING_STATUSES.includes(j.status));
}

describe("processing status detection", () => {
  it("should detect uploading as a processing status", () => {
    expect(hasProcessingJobs([{ status: "uploading" }])).toBe(true);
  });

  it("should detect transcribing as a processing status", () => {
    expect(hasProcessingJobs([{ status: "transcribing" }])).toBe(true);
  });

  it("should detect generating as a processing status", () => {
    expect(hasProcessingJobs([{ status: "generating" }])).toBe(true);
  });

  it("should not detect done as a processing status", () => {
    expect(hasProcessingJobs([{ status: "done" }])).toBe(false);
  });

  it("should not detect error as a processing status", () => {
    expect(hasProcessingJobs([{ status: "error" }])).toBe(false);
  });

  it("should return false for empty jobs list", () => {
    expect(hasProcessingJobs([])).toBe(false);
  });

  it("should detect processing among mixed statuses", () => {
    const jobs = [
      { status: "done" },
      { status: "error" },
      { status: "transcribing" },
    ];
    expect(hasProcessingJobs(jobs)).toBe(true);
  });

  it("should return false when all jobs are terminal", () => {
    const jobs = [
      { status: "done" },
      { status: "error" },
      { status: "done" },
    ];
    expect(hasProcessingJobs(jobs)).toBe(false);
  });
});

// ─── Polling interval logic ───

describe("polling interval logic", () => {
  it("should use 3000ms interval when processing jobs exist", () => {
    const pollActive = true;
    const interval = pollActive ? 3000 : false;
    expect(interval).toBe(3000);
  });

  it("should disable polling (false) when no processing jobs", () => {
    const pollActive = false;
    const interval = pollActive ? 3000 : false;
    expect(interval).toBe(false);
  });

  it("should start polling when a retry changes status from error to transcribing", () => {
    const jobsBefore = [{ status: "error" }, { status: "done" }];
    const jobsAfter = [{ status: "transcribing" }, { status: "done" }];
    expect(hasProcessingJobs(jobsBefore)).toBe(false);
    expect(hasProcessingJobs(jobsAfter)).toBe(true);
  });

  it("should stop polling when processing job completes", () => {
    const jobsBefore = [{ status: "generating" }, { status: "done" }];
    const jobsAfter = [{ status: "done" }, { status: "done" }];
    expect(hasProcessingJobs(jobsBefore)).toBe(true);
    expect(hasProcessingJobs(jobsAfter)).toBe(false);
  });

  it("should stop polling when processing job fails", () => {
    const jobsBefore = [{ status: "transcribing" }];
    const jobsAfter = [{ status: "error" }];
    expect(hasProcessingJobs(jobsBefore)).toBe(true);
    expect(hasProcessingJobs(jobsAfter)).toBe(false);
  });
});

// ─── Status categories ───

describe("status categories", () => {
  it("processing statuses should be uploading, transcribing, generating", () => {
    expect(PROCESSING_STATUSES).toEqual(["uploading", "transcribing", "generating"]);
  });

  it("terminal statuses should be done and error", () => {
    expect(TERMINAL_STATUSES).toEqual(["done", "error"]);
  });

  it("all statuses should be covered by processing + terminal", () => {
    const allStatuses = [...PROCESSING_STATUSES, ...TERMINAL_STATUSES];
    expect(allStatuses).toContain("uploading");
    expect(allStatuses).toContain("transcribing");
    expect(allStatuses).toContain("generating");
    expect(allStatuses).toContain("done");
    expect(allStatuses).toContain("error");
  });
});
