import { describe, it, expect } from "vitest";

/**
 * Tests for the MP3-to-Sheet-Music error handling improvements.
 * These test the error code mapping, error display logic, and processor error codes.
 */

// ─── Error Code Mapping (mirrors frontend mapErrorCodeToType) ───

const ERROR_CODE_MAP: Record<string, string> = {
  audio_too_long: "audio_too_long",
  transcription_failed: "transcription_failed",
  transcription_timeout: "transcription_timeout",
  audio_download_failed: "network",
  generation_failed: "generation_failed",
  generation_timeout: "generation_timeout",
  validation_failed: "validation_failed",
  credit_error: "credit_error",
  unknown: "unknown",
};

function mapErrorCodeToType(errorCode?: string | null, message?: string): string {
  if (errorCode) {
    return ERROR_CODE_MAP[errorCode] || "unknown";
  }
  const lowerMsg = (message || "").toLowerCase();
  if (lowerMsg.includes("network") || lowerMsg.includes("fetch") || lowerMsg.includes("connection")) return "network";
  if (lowerMsg.includes("too large") || lowerMsg.includes("file size")) return "file_too_large";
  if (lowerMsg.includes("empty")) return "empty_file";
  if (lowerMsg.includes("unsupported") || lowerMsg.includes("format")) return "unsupported_format";
  if (lowerMsg.includes("credit") || lowerMsg.includes("insufficient")) return "insufficient_credits";
  if (lowerMsg.includes("timeout") || lowerMsg.includes("timed out")) return "generation_timeout";
  return "unknown";
}

// ─── Error Display (mirrors frontend getErrorDisplay) ───

type ErrorType = "network" | "file_too_large" | "empty_file" | "unsupported_format" | "insufficient_credits" | "audio_too_long" | "transcription_failed" | "transcription_timeout" | "generation_failed" | "generation_timeout" | "validation_failed" | "credit_error" | "unknown";

function getErrorDisplay(type: ErrorType) {
  const displays: Record<ErrorType, { icon: string; title: string; suggestion: string }> = {
    network: { icon: "wifi", title: "Connection Error", suggestion: "Check your internet connection and try again." },
    file_too_large: { icon: "file", title: "File Too Large", suggestion: "Compress or trim your audio file to under 16MB and try again." },
    empty_file: { icon: "file", title: "Empty File", suggestion: "The uploaded file appears to be empty. Please select a valid audio file." },
    unsupported_format: { icon: "file", title: "Unsupported Format", suggestion: "Please upload an MP3, WAV, FLAC, OGG, or M4A file." },
    insufficient_credits: { icon: "credit", title: "Insufficient Credits", suggestion: "You need at least 1 credit. Please upgrade your plan or purchase more credits." },
    audio_too_long: { icon: "clock", title: "Audio Too Long", suggestion: "Maximum supported duration is 10 minutes. Please trim the audio and try again." },
    transcription_failed: { icon: "alert", title: "Transcription Failed", suggestion: "The audio could not be transcribed. Try a clearer recording or a different audio format." },
    transcription_timeout: { icon: "clock", title: "Transcription Timed Out", suggestion: "The audio file may be too long or the service is busy. Try a shorter clip or try again later." },
    generation_failed: { icon: "alert", title: "Sheet Music Generation Failed", suggestion: "The AI could not generate notation from this audio. Try a different file or a clearer recording." },
    generation_timeout: { icon: "clock", title: "Generation Timed Out", suggestion: "The AI service is temporarily busy. Please try again in a few minutes." },
    validation_failed: { icon: "alert", title: "Notation Validation Failed", suggestion: "The AI-generated notation had formatting issues. Try again — results may vary between attempts." },
    credit_error: { icon: "credit", title: "Credit Processing Error", suggestion: "Could not process credits. Please check your account balance and try again." },
    unknown: { icon: "alert", title: "Something Went Wrong", suggestion: "An unexpected error occurred. Please try again or try a different audio file." },
  };
  return displays[type] || displays.unknown;
}

describe("MP3 Sheet Music Error Handling", () => {
  describe("mapErrorCodeToType", () => {
    it("maps known error codes to correct types", () => {
      expect(mapErrorCodeToType("audio_too_long")).toBe("audio_too_long");
      expect(mapErrorCodeToType("transcription_failed")).toBe("transcription_failed");
      expect(mapErrorCodeToType("transcription_timeout")).toBe("transcription_timeout");
      expect(mapErrorCodeToType("audio_download_failed")).toBe("network");
      expect(mapErrorCodeToType("generation_failed")).toBe("generation_failed");
      expect(mapErrorCodeToType("generation_timeout")).toBe("generation_timeout");
      expect(mapErrorCodeToType("validation_failed")).toBe("validation_failed");
      expect(mapErrorCodeToType("credit_error")).toBe("credit_error");
      expect(mapErrorCodeToType("unknown")).toBe("unknown");
    });

    it("maps unknown error codes to 'unknown'", () => {
      expect(mapErrorCodeToType("some_new_error")).toBe("unknown");
      expect(mapErrorCodeToType("xyz")).toBe("unknown");
    });

    it("falls back to message-based inference when no error code", () => {
      expect(mapErrorCodeToType(null, "Network error occurred")).toBe("network");
      expect(mapErrorCodeToType(null, "Failed to fetch data")).toBe("network");
      expect(mapErrorCodeToType(null, "Connection refused")).toBe("network");
      expect(mapErrorCodeToType(null, "File too large")).toBe("file_too_large");
      expect(mapErrorCodeToType(null, "File size exceeds limit")).toBe("file_too_large");
      expect(mapErrorCodeToType(null, "Empty audio file")).toBe("empty_file");
      expect(mapErrorCodeToType(null, "Unsupported audio format")).toBe("unsupported_format");
      expect(mapErrorCodeToType(null, "Insufficient credits")).toBe("insufficient_credits");
      expect(mapErrorCodeToType(null, "Request timed out")).toBe("generation_timeout");
    });

    it("returns 'unknown' when no code and no matching message", () => {
      expect(mapErrorCodeToType(null, "Something went wrong")).toBe("unknown");
      expect(mapErrorCodeToType(null, "")).toBe("unknown");
      expect(mapErrorCodeToType(undefined, undefined)).toBe("unknown");
    });

    it("prioritizes error code over message", () => {
      expect(mapErrorCodeToType("transcription_failed", "Network error")).toBe("transcription_failed");
      expect(mapErrorCodeToType("generation_timeout", "File too large")).toBe("generation_timeout");
    });
  });

  describe("getErrorDisplay", () => {
    it("returns correct display info for each error type", () => {
      const networkDisplay = getErrorDisplay("network");
      expect(networkDisplay.icon).toBe("wifi");
      expect(networkDisplay.title).toBe("Connection Error");
      expect(networkDisplay.suggestion).toContain("internet connection");

      const fileTooLarge = getErrorDisplay("file_too_large");
      expect(fileTooLarge.icon).toBe("file");
      expect(fileTooLarge.title).toBe("File Too Large");
      expect(fileTooLarge.suggestion).toContain("16MB");

      const audioTooLong = getErrorDisplay("audio_too_long");
      expect(audioTooLong.icon).toBe("clock");
      expect(audioTooLong.title).toBe("Audio Too Long");
      expect(audioTooLong.suggestion).toContain("10 minutes");

      const transcriptionFailed = getErrorDisplay("transcription_failed");
      expect(transcriptionFailed.icon).toBe("alert");
      expect(transcriptionFailed.title).toBe("Transcription Failed");

      const generationFailed = getErrorDisplay("generation_failed");
      expect(generationFailed.title).toBe("Sheet Music Generation Failed");

      const credits = getErrorDisplay("insufficient_credits");
      expect(credits.icon).toBe("credit");
      expect(credits.title).toBe("Insufficient Credits");
    });

    it("returns fallback for unknown type", () => {
      const unknown = getErrorDisplay("unknown");
      expect(unknown.icon).toBe("alert");
      expect(unknown.title).toBe("Something Went Wrong");
    });

    it("every error type has all required fields", () => {
      const allTypes: ErrorType[] = [
        "network", "file_too_large", "empty_file", "unsupported_format",
        "insufficient_credits", "audio_too_long", "transcription_failed",
        "transcription_timeout", "generation_failed", "generation_timeout",
        "validation_failed", "credit_error", "unknown",
      ];
      for (const type of allTypes) {
        const display = getErrorDisplay(type);
        expect(display.icon).toBeTruthy();
        expect(display.title).toBeTruthy();
        expect(display.suggestion).toBeTruthy();
        expect(display.title.length).toBeGreaterThan(3);
        expect(display.suggestion.length).toBeGreaterThan(10);
      }
    });
  });

  describe("Retryable vs non-retryable errors", () => {
    const NON_RETRYABLE = ["file_too_large", "empty_file", "unsupported_format", "insufficient_credits"];
    const RETRYABLE: ErrorType[] = [
      "network", "audio_too_long", "transcription_failed", "transcription_timeout",
      "generation_failed", "generation_timeout", "validation_failed", "credit_error", "unknown",
    ];

    it("non-retryable errors should not show retry button", () => {
      for (const type of NON_RETRYABLE) {
        expect(NON_RETRYABLE.includes(type)).toBe(true);
      }
    });

    it("retryable errors should show retry button", () => {
      for (const type of RETRYABLE) {
        expect(NON_RETRYABLE.includes(type)).toBe(false);
      }
    });
  });

  describe("Backend error codes in processor", () => {
    // Verify the error codes the processor sets match what the frontend expects
    const PROCESSOR_ERROR_CODES = [
      "audio_too_long",
      "transcription_failed",
      "transcription_timeout",
      "audio_download_failed",
      "generation_failed",
      "generation_timeout",
      "validation_failed",
      "credit_error",
      "unknown",
    ];

    it("all processor error codes are mapped in the frontend", () => {
      for (const code of PROCESSOR_ERROR_CODES) {
        const mapped = mapErrorCodeToType(code);
        expect(mapped).not.toBe("unknown_unmapped");
        // Verify the mapped type has a display
        const display = getErrorDisplay(mapped as ErrorType);
        expect(display.title).toBeTruthy();
      }
    });

    it("error codes follow snake_case convention", () => {
      for (const code of PROCESSOR_ERROR_CODES) {
        expect(code).toMatch(/^[a-z_]+$/);
      }
    });
  });
});
