/**
 * ElevenLabs API Integration
 * Supports Music Generation, Text-to-Speech, and Voice Narration
 * API docs: https://elevenlabs.io/docs/api-reference
 */

import axios from "axios";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

const ELEVENLABS_API_BASE = "https://api.elevenlabs.io";

function getApiKey(): string {
  return process.env.ELEVENLABS_API_KEY ?? "";
}

export function isElevenLabsAvailable(): boolean {
  const key = getApiKey();
  return !!key && key.length > 0;
}

// ─── Types ───

export type ElevenLabsVoice = {
  voice_id: string;
  name: string;
  category: string;
  labels?: Record<string, string>;
  preview_url?: string;
};

export type MusicGenerateParams = {
  prompt: string;
  durationMs?: number; // 3000-600000 (3s to 10min)
  forceInstrumental?: boolean;
};

export type TTSParams = {
  text: string;
  voiceId: string;
  modelId?: string;
};

export type MusicResult = {
  audioUrl: string;
  audioKey: string;
  duration: number; // seconds
};

export type TTSResult = {
  audioUrl: string;
  audioKey: string;
};

// ─── Music Generation ───

/**
 * Generate music from a text prompt.
 * Returns the audio URL after uploading to S3.
 */
export async function generateMusic(
  params: MusicGenerateParams,
  userId: number
): Promise<MusicResult> {
  if (!isElevenLabsAvailable()) {
    throw new Error("ElevenLabs API key is not configured");
  }

  const apiKey = getApiKey();
  const durationMs = params.durationMs ?? 30000;

  const response = await axios.post(
    `${ELEVENLABS_API_BASE}/v1/music`,
    {
      prompt: params.prompt,
      music_length_ms: durationMs,
      model_id: "music_v1",
      force_instrumental: params.forceInstrumental ?? false,
    },
    {
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      responseType: "arraybuffer",
      timeout: 120000, // 2 minutes - music generation can take time
      params: {
        output_format: "mp3_44100_128",
      },
    }
  );

  // Upload the audio to S3
  const fileKey = `songs/${userId}/${nanoid()}.mp3`;
  const buffer = Buffer.from(response.data);
  const { url } = await storagePut(fileKey, buffer, "audio/mpeg");

  return {
    audioUrl: url,
    audioKey: fileKey,
    duration: Math.round(durationMs / 1000),
  };
}

// ─── Text-to-Speech ───

/**
 * Convert text to speech using a specific voice.
 * Returns the audio URL after uploading to S3.
 */
export async function textToSpeech(
  params: TTSParams,
  userId: number
): Promise<TTSResult> {
  if (!isElevenLabsAvailable()) {
    throw new Error("ElevenLabs API key is not configured");
  }

  const apiKey = getApiKey();

  const response = await axios.post(
    `${ELEVENLABS_API_BASE}/v1/text-to-speech/${params.voiceId}`,
    {
      text: params.text,
      model_id: params.modelId ?? "eleven_multilingual_v2",
    },
    {
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      responseType: "arraybuffer",
      timeout: 60000,
      params: {
        output_format: "mp3_44100_128",
      },
    }
  );

  const fileKey = `tts/${userId}/${nanoid()}.mp3`;
  const buffer = Buffer.from(response.data);
  const { url } = await storagePut(fileKey, buffer, "audio/mpeg");

  return {
    audioUrl: url,
    audioKey: fileKey,
  };
}

// ─── Voice List ───

/**
 * Get list of available voices from ElevenLabs.
 */
export async function getVoices(): Promise<ElevenLabsVoice[]> {
  if (!isElevenLabsAvailable()) {
    throw new Error("ElevenLabs API key is not configured");
  }

  const apiKey = getApiKey();

  const response = await axios.get(`${ELEVENLABS_API_BASE}/v1/voices`, {
    headers: {
      "xi-api-key": apiKey,
    },
    timeout: 15000,
  });

  return (response.data.voices ?? []).map((v: any) => ({
    voice_id: v.voice_id,
    name: v.name,
    category: v.category ?? "premade",
    labels: v.labels ?? {},
    preview_url: v.preview_url ?? null,
  }));
}
