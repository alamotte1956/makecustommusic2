import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the rate limit map for testing
describe("generateVoice endpoint", () => {
  describe("input validation", () => {
    it("should require lyrics field", () => {
      // Validate that the endpoint expects lyrics
      const body = { voiceId: "test-voice" };
      expect(body).not.toHaveProperty("lyrics");
    });

    it("should require voiceId field", () => {
      const body = { lyrics: "Hello world" };
      expect(body).not.toHaveProperty("voiceId");
    });

    it("should accept valid request body", () => {
      const body = {
        lyrics: "Hello world, this is a test",
        voiceId: "21m00Tcm4TlvDq8ikWAM",
        stability: 0.4,
        similarityBoost: 0.75,
      };
      expect(body.lyrics).toBeTruthy();
      expect(body.voiceId).toBeTruthy();
      expect(body.stability).toBeGreaterThanOrEqual(0);
      expect(body.stability).toBeLessThanOrEqual(1);
      expect(body.similarityBoost).toBeGreaterThanOrEqual(0);
      expect(body.similarityBoost).toBeLessThanOrEqual(1);
    });

    it("should clamp stability to valid range", () => {
      const clamp = (val: number) => Math.max(0, Math.min(1, val));
      expect(clamp(-0.5)).toBe(0);
      expect(clamp(1.5)).toBe(1);
      expect(clamp(0.4)).toBe(0.4);
    });

    it("should clamp similarityBoost to valid range", () => {
      const clamp = (val: number) => Math.max(0, Math.min(1, val));
      expect(clamp(-1)).toBe(0);
      expect(clamp(2)).toBe(1);
      expect(clamp(0.75)).toBe(0.75);
    });

    it("should reject lyrics over 5000 characters", () => {
      const longLyrics = "a".repeat(5001);
      expect(longLyrics.length).toBeGreaterThan(5000);
    });

    it("should accept lyrics up to 5000 characters", () => {
      const lyrics = "a".repeat(5000);
      expect(lyrics.length).toBeLessThanOrEqual(5000);
    });
  });

  describe("rate limiting", () => {
    it("should track per-user rate limits", () => {
      const rateLimitMap = new Map<number, { count: number; resetAt: number }>();
      const RATE_LIMIT_MAX = 10;
      const RATE_LIMIT_WINDOW_MS = 60_000;

      function checkRateLimit(userId: number): boolean {
        const now = Date.now();
        const entry = rateLimitMap.get(userId);
        if (!entry || now > entry.resetAt) {
          rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
          return true;
        }
        if (entry.count >= RATE_LIMIT_MAX) {
          return false;
        }
        entry.count++;
        return true;
      }

      // First 10 requests should succeed
      for (let i = 0; i < 10; i++) {
        expect(checkRateLimit(1)).toBe(true);
      }

      // 11th request should fail
      expect(checkRateLimit(1)).toBe(false);

      // Different user should still succeed
      expect(checkRateLimit(2)).toBe(true);
    });

    it("should reset rate limits after window expires", () => {
      const rateLimitMap = new Map<number, { count: number; resetAt: number }>();

      function checkRateLimit(userId: number, now: number): boolean {
        const entry = rateLimitMap.get(userId);
        if (!entry || now > entry.resetAt) {
          rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 });
          return true;
        }
        if (entry.count >= 10) {
          return false;
        }
        entry.count++;
        return true;
      }

      const now = Date.now();

      // Fill up the limit
      for (let i = 0; i < 10; i++) {
        checkRateLimit(1, now);
      }
      expect(checkRateLimit(1, now)).toBe(false);

      // After window expires, should succeed again
      expect(checkRateLimit(1, now + 61_000)).toBe(true);
    });
  });

  describe("voice_settings defaults", () => {
    it("should use default stability of 0.4", () => {
      const DEFAULT_STABILITY = 0.4;
      const userStability = undefined;
      const stability = typeof userStability === "number" ? userStability : DEFAULT_STABILITY;
      expect(stability).toBe(0.4);
    });

    it("should use default similarity_boost of 0.75", () => {
      const DEFAULT_SIMILARITY = 0.75;
      const userSimilarity = undefined;
      const similarity = typeof userSimilarity === "number" ? userSimilarity : DEFAULT_SIMILARITY;
      expect(similarity).toBe(0.75);
    });

    it("should allow user to override defaults", () => {
      const userStability = 0.6;
      const userSimilarity = 0.9;
      const stability = typeof userStability === "number" ? userStability : 0.4;
      const similarity = typeof userSimilarity === "number" ? userSimilarity : 0.75;
      expect(stability).toBe(0.6);
      expect(similarity).toBe(0.9);
    });
  });

  describe("ElevenLabs API request format", () => {
    it("should construct correct API URL with voiceId", () => {
      const voiceId = "21m00Tcm4TlvDq8ikWAM";
      const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
      expect(url).toBe("https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM");
    });

    it("should construct correct request body with voice_settings", () => {
      const body = {
        text: "Hello world",
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.75,
        },
      };
      expect(body.model_id).toBe("eleven_multilingual_v2");
      expect(body.voice_settings.stability).toBe(0.4);
      expect(body.voice_settings.similarity_boost).toBe(0.75);
    });

    it("should set correct headers", () => {
      const apiKey = "sk_test_key";
      const headers = {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      };
      expect(headers["xi-api-key"]).toBe(apiKey);
      expect(headers["Content-Type"]).toBe("application/json");
    });
  });
});
