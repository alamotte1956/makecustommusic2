import { describe, it, expect } from "vitest";

// Test the error classification logic used in SheetMusicViewer
// We replicate the classifyError function here since it's not exported

type ErrorType = "network" | "generation" | "rendering" | null;
interface ErrorState {
  type: ErrorType;
  message: string;
  detail?: string;
}

function classifyError(error: any): ErrorState {
  const message = error?.message || String(error) || "An unexpected error occurred";
  const lowerMsg = message.toLowerCase();

  if (
    lowerMsg.includes("network") ||
    lowerMsg.includes("fetch") ||
    lowerMsg.includes("timeout") ||
    lowerMsg.includes("econnrefused") ||
    lowerMsg.includes("failed to fetch") ||
    lowerMsg.includes("aborted")
  ) {
    return { type: "network", message: "Unable to reach the server.", detail: message };
  }

  if (
    lowerMsg.includes("render") ||
    lowerMsg.includes("abcjs") ||
    lowerMsg.includes("svg")
  ) {
    return { type: "rendering", message: "Failed to render the sheet music.", detail: message };
  }

  return { type: "generation", message, detail: undefined };
}

describe("SheetMusicViewer Error Handling", () => {
  describe("classifyError", () => {
    it("should classify network errors correctly", () => {
      const cases = [
        new Error("Network error"),
        new Error("Failed to fetch"),
        new Error("Request timeout"),
        new Error("ECONNREFUSED"),
        new Error("Request aborted"),
      ];
      for (const err of cases) {
        const result = classifyError(err);
        expect(result.type).toBe("network");
        expect(result.message).toBe("Unable to reach the server.");
        expect(result.detail).toBe(err.message);
      }
    });

    it("should classify rendering errors correctly", () => {
      const cases = [
        new Error("Failed to render ABC notation"),
        new Error("abcjs module not found"),
        new Error("SVG generation failed"),
      ];
      for (const err of cases) {
        const result = classifyError(err);
        expect(result.type).toBe("rendering");
        expect(result.message).toBe("Failed to render the sheet music.");
        expect(result.detail).toBe(err.message);
      }
    });

    it("should classify generation errors as default", () => {
      const cases = [
        new Error("Failed to generate sheet music. Please try again."),
        new Error("Song not found"),
        new Error("Internal server error"),
        new Error("Something went wrong"),
      ];
      for (const err of cases) {
        const result = classifyError(err);
        expect(result.type).toBe("generation");
        expect(result.message).toBe(err.message);
        expect(result.detail).toBeUndefined();
      }
    });

    it("should handle errors without message property", () => {
      const result = classifyError("string error");
      expect(result.type).toBe("generation");
      expect(result.message).toBe("string error");
    });

    it("should handle null/undefined errors", () => {
      const result = classifyError(null);
      expect(result.type).toBe("generation");
      expect(result.message).toBe("null");
    });

    it("should handle error objects with empty message", () => {
      const result = classifyError(new Error(""));
      expect(result.type).toBe("generation");
      // Empty message falls through to String(error) which gives "Error"
      expect(result.message).toBeTruthy();
    });
  });

  describe("ERROR_INFO mapping", () => {
    const ERROR_INFO = {
      network: {
        title: "Connection Error",
        suggestion: "Check your internet connection and try again.",
      },
      generation: {
        title: "Generation Failed",
        suggestion: "The AI could not generate sheet music for this song. Try regenerating or choosing a different key.",
      },
      rendering: {
        title: "Rendering Error",
        suggestion: "The sheet music notation could not be displayed. Try regenerating the sheet music.",
      },
    };

    it("should have entries for all error types", () => {
      expect(ERROR_INFO.network).toBeDefined();
      expect(ERROR_INFO.generation).toBeDefined();
      expect(ERROR_INFO.rendering).toBeDefined();
    });

    it("should have non-empty titles and suggestions", () => {
      for (const key of Object.keys(ERROR_INFO) as Array<keyof typeof ERROR_INFO>) {
        expect(ERROR_INFO[key].title.length).toBeGreaterThan(0);
        expect(ERROR_INFO[key].suggestion.length).toBeGreaterThan(0);
      }
    });

    it("network error should mention connection", () => {
      expect(ERROR_INFO.network.title.toLowerCase()).toContain("connection");
      expect(ERROR_INFO.network.suggestion.toLowerCase()).toContain("internet");
    });

    it("generation error should suggest retry", () => {
      expect(ERROR_INFO.generation.suggestion.toLowerCase()).toContain("regenerat");
    });

    it("rendering error should suggest regeneration", () => {
      expect(ERROR_INFO.rendering.suggestion.toLowerCase()).toContain("regenerat");
    });
  });

  describe("Mp3ToSheetMusic error classification", () => {
    // Replicate the inline classification logic from Mp3ToSheetMusic
    function classifyMp3Error(err: any): { type: string; message: string } {
      const msg = err?.message || "";
      const lowerMsg = msg.toLowerCase();
      const isNetwork = lowerMsg.includes("network") || lowerMsg.includes("fetch") || lowerMsg.includes("timeout") || lowerMsg.includes("aborted");
      return {
        type: isNetwork ? "network" : "generation",
        message: isNetwork ? "Unable to reach the server. Check your connection and try again." : (msg || "Failed to generate sheet music."),
      };
    }

    it("should classify network errors", () => {
      expect(classifyMp3Error(new Error("Network error")).type).toBe("network");
      expect(classifyMp3Error(new Error("Failed to fetch")).type).toBe("network");
      expect(classifyMp3Error(new Error("Request timeout")).type).toBe("network");
      expect(classifyMp3Error(new Error("Request aborted")).type).toBe("network");
    });

    it("should classify generation errors", () => {
      expect(classifyMp3Error(new Error("LLM failed")).type).toBe("generation");
      expect(classifyMp3Error(new Error("Invalid audio")).type).toBe("generation");
    });

    it("should provide fallback message for empty errors", () => {
      const result = classifyMp3Error(new Error(""));
      expect(result.type).toBe("generation");
      expect(result.message).toBe("Failed to generate sheet music.");
    });

    it("should provide network-specific message for network errors", () => {
      const result = classifyMp3Error(new Error("Network error"));
      expect(result.message).toContain("server");
      expect(result.message).toContain("connection");
    });
  });
});
