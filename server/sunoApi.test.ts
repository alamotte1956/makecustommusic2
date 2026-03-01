import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";

// Mock axios to avoid real API calls in tests
vi.mock("axios");
const mockedAxios = vi.mocked(axios, true);

describe("Suno API Integration (SunoAPI.org)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Ensure SUNO_API_KEY is set for tests
    process.env.SUNO_API_KEY = process.env.SUNO_API_KEY || "test-key";
  });

  describe("isSunoAvailable", () => {
    it("should return true when SUNO_API_KEY is set", async () => {
      const { isSunoAvailable } = await import("./sunoApi");
      expect(isSunoAvailable()).toBe(true);
    });

    it("should return false when SUNO_API_KEY is empty", async () => {
      const originalKey = process.env.SUNO_API_KEY;
      process.env.SUNO_API_KEY = "";
      // Need to re-import to get fresh module
      vi.resetModules();
      const { isSunoAvailable } = await import("./sunoApi");
      expect(isSunoAvailable()).toBe(false);
      process.env.SUNO_API_KEY = originalKey;
    });
  });

  describe("sunoGenerate", () => {
    it("should call SunoAPI.org endpoint with correct URL for simple mode", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          code: 200,
          msg: "success",
          data: { taskId: "test-task-123" },
        },
      });

      const { sunoGenerate } = await import("./sunoApi");
      const taskId = await sunoGenerate({
        mode: "simple",
        prompt: "A happy jazz piano tune",
      });

      expect(taskId).toBe("test-task-123");
      expect(mockedAxios.post).toHaveBeenCalledWith(
        "https://api.sunoapi.org/api/v1/generate",
        expect.objectContaining({
          prompt: "A happy jazz piano tune",
          customMode: false,
          instrumental: false,
          model: "V5",
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Authorization": expect.stringContaining("Bearer "),
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("should call SunoAPI.org endpoint with correct URL for custom mode", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          code: 200,
          msg: "success",
          data: { taskId: "custom-task-456" },
        },
      });

      const { sunoGenerate } = await import("./sunoApi");
      const taskId = await sunoGenerate({
        mode: "custom",
        title: "My Song",
        lyrics: "[Verse]\nHello world",
        style: "pop, upbeat",
      });

      expect(taskId).toBe("custom-task-456");
      expect(mockedAxios.post).toHaveBeenCalledWith(
        "https://api.sunoapi.org/api/v1/generate",
        expect.objectContaining({
          title: "My Song",
          prompt: "[Verse]\nHello world",
          style: "pop, upbeat",
          customMode: true,
          instrumental: false,
          model: "V5",
        }),
        expect.any(Object)
      );
    });

    it("should throw error when API returns non-200 code", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          code: 429,
          msg: "Insufficient credits",
          data: null,
        },
      });

      const { sunoGenerate } = await import("./sunoApi");
      await expect(
        sunoGenerate({ mode: "simple", prompt: "test" })
      ).rejects.toThrow("Suno API error: Insufficient credits");
    });
  });

  describe("sunoGetStatus", () => {
    it("should call SunoAPI.org status endpoint with correct URL", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          code: 200,
          msg: "success",
          data: {
            taskId: "test-task-123",
            status: "SUCCESS",
            response: {
              sunoData: [
                {
                  id: "song-1",
                  title: "Test Song",
                  audioUrl: "https://example.com/song.mp3",
                  streamAudioUrl: "https://example.com/stream",
                  imageUrl: "https://example.com/cover.jpg",
                  tags: "pop, upbeat",
                  duration: 120,
                },
              ],
            },
          },
        },
      });

      const { sunoGetStatus } = await import("./sunoApi");
      const status = await sunoGetStatus("test-task-123");

      expect(status.status).toBe("SUCCESS");
      expect(status.response?.sunoData?.[0]?.audioUrl).toBe("https://example.com/song.mp3");
      expect(status.response?.sunoData?.[0]?.streamAudioUrl).toBe("https://example.com/stream");
      expect(mockedAxios.get).toHaveBeenCalledWith(
        "https://api.sunoapi.org/api/v1/generate/record-info",
        expect.objectContaining({
          params: { taskId: "test-task-123" },
          headers: expect.objectContaining({
            "Authorization": expect.stringContaining("Bearer "),
          }),
        })
      );
    });

    it("should throw error when status API returns non-200 code", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          code: 401,
          msg: "Unauthorized access",
          data: null,
        },
      });

      const { sunoGetStatus } = await import("./sunoApi");
      await expect(sunoGetStatus("bad-task")).rejects.toThrow(
        "Suno status error: Unauthorized access"
      );
    });
  });

  describe("sunoGenerateAndWait", () => {
    it("should handle SUCCESS status and return first song", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          code: 200,
          msg: "success",
          data: { taskId: "wait-task-789" },
        },
      });

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          code: 200,
          msg: "success",
          data: {
            taskId: "wait-task-789",
            status: "SUCCESS",
            response: {
              sunoData: [
                {
                  id: "song-abc",
                  title: "Generated Song",
                  audioUrl: "https://example.com/generated.mp3",
                  tags: "jazz",
                  duration: 180,
                },
              ],
            },
          },
        },
      });

      const { sunoGenerateAndWait } = await import("./sunoApi");
      const song = await sunoGenerateAndWait(
        { mode: "simple", prompt: "jazz tune" },
        10000,
        100
      );

      expect(song.id).toBe("song-abc");
      expect(song.title).toBe("Generated Song");
      expect(song.audioUrl).toBe("https://example.com/generated.mp3");
    });

    it("should handle granular failure statuses from SunoAPI.org", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          code: 200,
          msg: "success",
          data: { taskId: "fail-task" },
        },
      });

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          code: 200,
          msg: "success",
          data: {
            taskId: "fail-task",
            status: "SENSITIVE_WORD_ERROR",
            errorMessage: "Content contains prohibited words",
          },
        },
      });

      const { sunoGenerateAndWait } = await import("./sunoApi");
      await expect(
        sunoGenerateAndWait(
          { mode: "simple", prompt: "bad content" },
          10000,
          100
        )
      ).rejects.toThrow("Content contains prohibited words");
    });

    it("should handle CREATE_TASK_FAILED status", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          code: 200,
          msg: "success",
          data: { taskId: "fail-task-2" },
        },
      });

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          code: 200,
          msg: "success",
          data: {
            taskId: "fail-task-2",
            status: "CREATE_TASK_FAILED",
            errorMessage: "Failed to create the generation task",
          },
        },
      });

      const { sunoGenerateAndWait } = await import("./sunoApi");
      await expect(
        sunoGenerateAndWait(
          { mode: "simple", prompt: "test" },
          10000,
          100
        )
      ).rejects.toThrow("Failed to create the generation task");
    });

    it("should handle GENERATE_AUDIO_FAILED status", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          code: 200,
          msg: "success",
          data: { taskId: "fail-task-3" },
        },
      });

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          code: 200,
          msg: "success",
          data: {
            taskId: "fail-task-3",
            status: "GENERATE_AUDIO_FAILED",
            errorMessage: null,
            failReason: "Audio generation failed",
          },
        },
      });

      const { sunoGenerateAndWait } = await import("./sunoApi");
      await expect(
        sunoGenerateAndWait(
          { mode: "simple", prompt: "test" },
          10000,
          100
        )
      ).rejects.toThrow("Audio generation failed");
    });

    it("should poll through PENDING and TEXT_SUCCESS before SUCCESS", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          code: 200,
          msg: "success",
          data: { taskId: "poll-task" },
        },
      });

      // First poll: PENDING
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          code: 200,
          msg: "success",
          data: { taskId: "poll-task", status: "PENDING" },
        },
      });

      // Second poll: TEXT_SUCCESS
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          code: 200,
          msg: "success",
          data: { taskId: "poll-task", status: "TEXT_SUCCESS" },
        },
      });

      // Third poll: SUCCESS
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          code: 200,
          msg: "success",
          data: {
            taskId: "poll-task",
            status: "SUCCESS",
            response: {
              sunoData: [
                {
                  id: "polled-song",
                  title: "Polled Song",
                  audioUrl: "https://example.com/polled.mp3",
                  duration: 150,
                },
              ],
            },
          },
        },
      });

      const { sunoGenerateAndWait } = await import("./sunoApi");
      const song = await sunoGenerateAndWait(
        { mode: "simple", prompt: "poll test" },
        30000,
        50
      );

      expect(song.id).toBe("polled-song");
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    });
  });
});
