import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";

vi.mock("axios");
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://s3.example.com/test.mp3", key: "test-key" }),
}));
vi.mock("nanoid", () => ({
  nanoid: () => "test-nanoid-123",
}));

const mockedAxios = vi.mocked(axios, true);

describe("ElevenLabs API Integration", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ELEVENLABS_API_KEY = "sk_test_key_123";
  });

  describe("isElevenLabsAvailable", () => {
    it("should return true when ELEVENLABS_API_KEY is set", async () => {
      const { isElevenLabsAvailable } = await import("./elevenLabsApi");
      expect(isElevenLabsAvailable()).toBe(true);
    });

    it("should return false when ELEVENLABS_API_KEY is empty", async () => {
      const originalKey = process.env.ELEVENLABS_API_KEY;
      process.env.ELEVENLABS_API_KEY = "";
      vi.resetModules();
      const { isElevenLabsAvailable } = await import("./elevenLabsApi");
      expect(isElevenLabsAvailable()).toBe(false);
      process.env.ELEVENLABS_API_KEY = originalKey;
    });
  });

  describe("generateMusic", () => {
    it("should call ElevenLabs music endpoint with correct parameters", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: Buffer.from("fake-audio-data"),
      });

      const { generateMusic } = await import("./elevenLabsApi");
      const result = await generateMusic(
        { prompt: "happy jazz piano", durationMs: 30000 },
        1
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(
        "https://api.elevenlabs.io/v1/music",
        expect.objectContaining({
          prompt: "happy jazz piano",
          music_length_ms: 30000,
          model_id: "music_v1",
          force_instrumental: false,
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            "xi-api-key": "sk_test_key_123",
          }),
          responseType: "arraybuffer",
        })
      );

      expect(result).toHaveProperty("audioUrl");
      expect(result).toHaveProperty("audioKey");
      expect(result).toHaveProperty("duration");
      expect(result.duration).toBe(30);
    });

    it("should use default duration when not specified", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: Buffer.from("fake-audio-data"),
      });

      const { generateMusic } = await import("./elevenLabsApi");
      const result = await generateMusic({ prompt: "test" }, 1);

      expect(result.duration).toBe(30);
    });

    it("should set force_instrumental when specified", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: Buffer.from("fake-audio-data"),
      });

      const { generateMusic } = await import("./elevenLabsApi");
      await generateMusic(
        { prompt: "instrumental jazz", forceInstrumental: true },
        1
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          force_instrumental: true,
        }),
        expect.any(Object)
      );
    });

    it("should throw when API key is not configured", async () => {
      process.env.ELEVENLABS_API_KEY = "";
      vi.resetModules();

      const { generateMusic } = await import("./elevenLabsApi");
      await expect(
        generateMusic({ prompt: "test" }, 1)
      ).rejects.toThrow("ElevenLabs API key is not configured");
    });
  });

  describe("textToSpeech", () => {
    it("should call TTS endpoint with correct parameters", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: Buffer.from("fake-tts-data"),
      });

      const { textToSpeech } = await import("./elevenLabsApi");
      const result = await textToSpeech(
        { text: "Hello world", voiceId: "voice-123" },
        1
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(
        "https://api.elevenlabs.io/v1/text-to-speech/voice-123",
        expect.objectContaining({
          text: "Hello world",
          model_id: "eleven_multilingual_v2",
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            "xi-api-key": "sk_test_key_123",
          }),
          responseType: "arraybuffer",
        })
      );

      expect(result).toHaveProperty("audioUrl");
      expect(result).toHaveProperty("audioKey");
    });

    it("should use custom model when specified", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: Buffer.from("fake-tts-data"),
      });

      const { textToSpeech } = await import("./elevenLabsApi");
      await textToSpeech(
        { text: "Hello", voiceId: "v1", modelId: "eleven_turbo_v2_5" },
        1
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          model_id: "eleven_turbo_v2_5",
        }),
        expect.any(Object)
      );
    });

    it("should throw when API key is not configured", async () => {
      process.env.ELEVENLABS_API_KEY = "";
      vi.resetModules();

      const { textToSpeech } = await import("./elevenLabsApi");
      await expect(
        textToSpeech({ text: "test", voiceId: "v1" }, 1)
      ).rejects.toThrow("ElevenLabs API key is not configured");
    });
  });

  describe("getVoices", () => {
    it("should call voices endpoint and return formatted list", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          voices: [
            {
              voice_id: "v1",
              name: "Rachel",
              category: "premade",
              labels: { gender: "female" },
              preview_url: "https://example.com/preview.mp3",
            },
            {
              voice_id: "v2",
              name: "Adam",
              category: "premade",
              labels: { gender: "male" },
            },
          ],
        },
      });

      const { getVoices } = await import("./elevenLabsApi");
      const voices = await getVoices();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        "https://api.elevenlabs.io/v1/voices",
        expect.objectContaining({
          headers: expect.objectContaining({
            "xi-api-key": "sk_test_key_123",
          }),
        })
      );

      expect(voices).toHaveLength(2);
      expect(voices[0]).toEqual({
        voice_id: "v1",
        name: "Rachel",
        category: "premade",
        labels: { gender: "female" },
        preview_url: "https://example.com/preview.mp3",
      });
      expect(voices[1].name).toBe("Adam");
    });

    it("should throw when API key is not configured", async () => {
      process.env.ELEVENLABS_API_KEY = "";
      vi.resetModules();

      const { getVoices } = await import("./elevenLabsApi");
      await expect(getVoices()).rejects.toThrow("ElevenLabs API key is not configured");
    });
  });
});
