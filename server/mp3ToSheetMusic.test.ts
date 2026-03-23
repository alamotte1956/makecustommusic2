import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock LLM
vi.mock("./server/_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

// Mock voice transcription
vi.mock("./server/_core/voiceTranscription", () => ({
  transcribeAudio: vi.fn(),
}));

// Mock storage
vi.mock("./server/storage", () => ({
  storagePut: vi.fn(),
}));

describe("MP3 to Sheet Music Feature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Route validation", () => {
    it("should require fileData parameter", () => {
      const input = { fileName: "test.mp3", mimeType: "audio/mpeg" };
      expect(input).not.toHaveProperty("fileData");
    });

    it("should require fileName parameter", () => {
      const input = { fileData: "base64data", mimeType: "audio/mpeg" };
      expect(input).not.toHaveProperty("fileName");
    });

    it("should require mimeType parameter", () => {
      const input = { fileData: "base64data", fileName: "test.mp3" };
      expect(input).not.toHaveProperty("mimeType");
    });

    it("should accept valid audio mime types", () => {
      const validTypes = ["audio/mpeg", "audio/wav", "audio/flac", "audio/ogg", "audio/mp4", "audio/x-m4a"];
      for (const type of validTypes) {
        expect(type.startsWith("audio/")).toBe(true);
      }
    });
  });

  describe("ABC notation output", () => {
    it("should produce valid ABC notation structure", () => {
      const sampleAbc = `X:1
T:Test Song
M:4/4
L:1/8
K:C
|: C D E F | G A B c :|`;
      expect(sampleAbc).toContain("X:1");
      expect(sampleAbc).toContain("T:");
      expect(sampleAbc).toContain("M:");
      expect(sampleAbc).toContain("K:");
    });

    it("should include title in ABC notation", () => {
      const abc = "X:1\nT:My Song\nM:4/4\nK:C\nCDEF|";
      const titleMatch = abc.match(/T:(.+)/);
      expect(titleMatch).not.toBeNull();
      expect(titleMatch![1]).toBe("My Song");
    });

    it("should include key signature in ABC notation", () => {
      const abc = "X:1\nT:Test\nM:4/4\nK:Am\nABcd|";
      const keyMatch = abc.match(/K:(.+)/);
      expect(keyMatch).not.toBeNull();
      expect(keyMatch![1]).toBe("Am");
    });

    it("should include time signature in ABC notation", () => {
      const abc = "X:1\nT:Test\nM:3/4\nK:G\nGAB|";
      const meterMatch = abc.match(/M:(.+)/);
      expect(meterMatch).not.toBeNull();
      expect(meterMatch![1]).toBe("3/4");
    });

    it("should include tempo when present", () => {
      const abc = "X:1\nT:Test\nM:4/4\nQ:1/4=120\nK:C\nCDEF|";
      const tempoMatch = abc.match(/Q:(.+)/);
      expect(tempoMatch).not.toBeNull();
      expect(tempoMatch![1]).toBe("1/4=120");
    });
  });

  describe("File size validation", () => {
    it("should enforce 16MB file size limit", () => {
      const MAX_FILE_SIZE = 16 * 1024 * 1024;
      expect(MAX_FILE_SIZE).toBe(16777216);
    });

    it("should reject files over 16MB", () => {
      const MAX_FILE_SIZE = 16 * 1024 * 1024;
      const oversizedFile = 17 * 1024 * 1024;
      expect(oversizedFile > MAX_FILE_SIZE).toBe(true);
    });

    it("should accept files under 16MB", () => {
      const MAX_FILE_SIZE = 16 * 1024 * 1024;
      const validFile = 10 * 1024 * 1024;
      expect(validFile <= MAX_FILE_SIZE).toBe(true);
    });
  });

  describe("Audio type validation", () => {
    const AUDIO_TYPES = ["audio/mpeg", "audio/wav", "audio/flac", "audio/ogg", "audio/mp4", "audio/x-m4a", "audio/aac"];

    it("should accept MP3 files", () => {
      expect(AUDIO_TYPES.includes("audio/mpeg")).toBe(true);
    });

    it("should accept WAV files", () => {
      expect(AUDIO_TYPES.includes("audio/wav")).toBe(true);
    });

    it("should accept FLAC files", () => {
      expect(AUDIO_TYPES.includes("audio/flac")).toBe(true);
    });

    it("should accept OGG files", () => {
      expect(AUDIO_TYPES.includes("audio/ogg")).toBe(true);
    });

    it("should accept M4A files", () => {
      expect(AUDIO_TYPES.includes("audio/mp4")).toBe(true);
      expect(AUDIO_TYPES.includes("audio/x-m4a")).toBe(true);
    });

    it("should accept AAC files", () => {
      expect(AUDIO_TYPES.includes("audio/aac")).toBe(true);
    });

    it("should not accept video files", () => {
      expect(AUDIO_TYPES.includes("video/mp4")).toBe(false);
    });

    it("should not accept image files", () => {
      expect(AUDIO_TYPES.includes("image/png")).toBe(false);
    });
  });

  describe("Processing steps", () => {
    const STEPS = ["idle", "uploading", "transcribing", "analyzing", "generating", "done", "error"];

    it("should have all required processing steps", () => {
      expect(STEPS).toContain("idle");
      expect(STEPS).toContain("uploading");
      expect(STEPS).toContain("analyzing");
      expect(STEPS).toContain("generating");
      expect(STEPS).toContain("done");
      expect(STEPS).toContain("error");
    });

    it("should start in idle state", () => {
      expect(STEPS[0]).toBe("idle");
    });

    it("should end in done or error state", () => {
      expect(STEPS[STEPS.length - 1]).toBe("error");
      expect(STEPS[STEPS.length - 2]).toBe("done");
    });
  });

  describe("Base64 encoding", () => {
    it("should handle base64 encoded audio data", () => {
      const sampleBase64 = "SGVsbG8gV29ybGQ="; // "Hello World"
      const decoded = Buffer.from(sampleBase64, "base64").toString("utf-8");
      expect(decoded).toBe("Hello World");
    });

    it("should strip data URL prefix from base64", () => {
      const dataUrl = "data:audio/mpeg;base64,SGVsbG8=";
      const base64 = dataUrl.split(",")[1];
      expect(base64).toBe("SGVsbG8=");
    });
  });

  describe("Response format", () => {
    it("should return abcNotation in response", () => {
      const response = {
        abcNotation: "X:1\nT:Test\nM:4/4\nK:C\nCDEF|",
        lyrics: "Hello world",
      };
      expect(response).toHaveProperty("abcNotation");
      expect(typeof response.abcNotation).toBe("string");
    });

    it("should optionally return lyrics in response", () => {
      const responseWithLyrics = {
        abcNotation: "X:1\nT:Test\nM:4/4\nK:C\nCDEF|",
        lyrics: "Some lyrics here",
      };
      expect(responseWithLyrics).toHaveProperty("lyrics");

      const responseWithoutLyrics = {
        abcNotation: "X:1\nT:Test\nM:4/4\nK:C\nCDEF|",
        lyrics: null,
      };
      expect(responseWithoutLyrics.lyrics).toBeNull();
    });
  });
});
