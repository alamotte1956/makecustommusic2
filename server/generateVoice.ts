/**
 * Express route: POST /api/generate-voice
 *
 * Direct audio streaming endpoint for ElevenLabs TTS.
 * Flow: User sends lyrics → server calls ElevenLabs → returns MP3 audio stream
 *
 * Also uploads to S3 for persistent storage and returns the URL in a header.
 *
 * Includes:
 * - JWT/session auth guard
 * - Per-user rate limiting (max 10 requests per minute)
 * - voice_settings support (stability, similarity_boost)
 */

import type { Express, Request, Response } from "express";
import axios from "axios";
import { sdk } from "./_core/sdk";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

// ─── Rate Limiting ───

const rateLimitMap = new Map<number, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10; // max requests per window
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

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

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  const expired: number[] = [];
  rateLimitMap.forEach((entry, userId) => {
    if (now > entry.resetAt) {
      expired.push(userId);
    }
  });
  expired.forEach((id) => rateLimitMap.delete(id));
}, 300_000);

// ─── Route Registration ───

export function registerGenerateVoiceRoute(app: Express) {
  app.post("/api/generate-voice", async (req: Request, res: Response) => {
    try {
      // ── Auth Guard ──
      let user;
      try {
        user = await sdk.authenticateRequest(req);
      } catch {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      // ── Rate Limiting ──
      if (!checkRateLimit(user.id)) {
        res.status(429).json({
          error: "Rate limit exceeded. Please wait before generating more audio.",
        });
        return;
      }

      // ── Input Validation ──
      const { lyrics, voiceId, stability, similarityBoost } = req.body;

      if (!lyrics || typeof lyrics !== "string" || lyrics.trim().length === 0) {
        res.status(400).json({ error: "lyrics is required and must be a non-empty string" });
        return;
      }

      if (lyrics.length > 5000) {
        res.status(400).json({ error: "lyrics must be 5000 characters or fewer" });
        return;
      }

      if (!voiceId || typeof voiceId !== "string") {
        res.status(400).json({ error: "voiceId is required" });
        return;
      }

      // ── ElevenLabs API Key Check ──
      const apiKey = process.env.ELEVENLABS_API_KEY;
      if (!apiKey) {
        res.status(503).json({ error: "ElevenLabs API key is not configured" });
        return;
      }

      // ── Voice Settings (matching user's preferred defaults) ──
      const voiceSettings = {
        stability: typeof stability === "number" ? Math.max(0, Math.min(1, stability)) : 0.4,
        similarity_boost:
          typeof similarityBoost === "number"
            ? Math.max(0, Math.min(1, similarityBoost))
            : 0.75,
      };

      // ── Call ElevenLabs TTS API ──
      const response = await axios({
        method: "POST",
        url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        responseType: "arraybuffer",
        timeout: 60000,
        params: {
          output_format: "mp3_44100_128",
        },
        data: {
          text: lyrics,
          model_id: "eleven_multilingual_v2",
          voice_settings: voiceSettings,
        },
      });

      const audioBuffer = Buffer.from(response.data);

      // ── Upload to S3 for persistent URL ──
      const fileKey = `tts/${user.id}/${nanoid()}.mp3`;
      const { url: persistentUrl } = await storagePut(fileKey, audioBuffer, "audio/mpeg");

      // ── Return audio stream + persistent URL header ──
      res.set("Content-Type", "audio/mpeg");
      res.set("X-Audio-Url", persistentUrl);
      res.set("Access-Control-Expose-Headers", "X-Audio-Url");
      res.send(audioBuffer);
    } catch (err: any) {
      console.error("[GenerateVoice] Error:", err?.message || err);

      if (err?.response?.status === 401) {
        res.status(503).json({ error: "ElevenLabs API key is invalid or expired" });
        return;
      }

      if (err?.response?.status === 429) {
        res.status(429).json({ error: "ElevenLabs rate limit reached. Please try again later." });
        return;
      }

      if (!res.headersSent) {
        res.status(500).json({ error: "Voice generation failed" });
      }
    }
  });
}
