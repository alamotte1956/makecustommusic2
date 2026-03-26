/**
 * Suno API Integration
 * Supports Music Generation, Lyrics Creation, and Stem Separation
 * API docs: https://docs.sunoapi.org/
 */

import axios from "axios";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { ENV } from "./_core/env";

const SUNO_API_BASE = "https://api.sunoapi.org/api/v1";

function getApiKey(): string {
  return ENV.sunoApiKey;
}

export function isSunoAvailable(): boolean {
  const key = getApiKey();
  return !!key && key.length > 0;
}

// ─── Types ───

export type SunoModel = "V4" | "V4_5" | "V4_5PLUS" | "V4_5ALL" | "V5";

export type MusicGenerateParams = {
  prompt: string;
  customMode?: boolean;
  style?: string;
  title?: string;
  instrumental?: boolean;
  model?: SunoModel;
};

export type MusicResult = {
  audioUrl: string;
  audioKey: string;
  duration: number;
  sunoTaskId: string;
  sunoAudioId: string;
  title: string;
  tags: string;
};

export type TaskStatus = "PENDING" | "TEXT_SUCCESS" | "FIRST_SUCCESS" | "SUCCESS" | "FAILED" | "CREATE_TASK_FAILED";

export type SunoTaskResponse = {
  taskId: string;
  status: TaskStatus;
  response?: {
    data: Array<{
      id: string;
      audio_url: string;
      title: string;
      tags: string;
      duration: number;
      lyric?: string;
    }>;
  };
  errorMessage?: string;
};

export type StemSeparationResult = {
  taskId: string;
  status: string;
  vocalUrl?: string | null;
  instrumentalUrl?: string | null;
  backingVocalsUrl?: string | null;
  drumsUrl?: string | null;
  bassUrl?: string | null;
  guitarUrl?: string | null;
  keyboardUrl?: string | null;
  percussionUrl?: string | null;
  stringsUrl?: string | null;
  synthUrl?: string | null;
  fxUrl?: string | null;
  brassUrl?: string | null;
  woodwindsUrl?: string | null;
};

// ─── Music Generation ───

/**
 * Submit a music generation task to Suno.
 * Returns the taskId for polling.
 */
export async function submitMusicGeneration(
  params: MusicGenerateParams
): Promise<string> {
  if (!isSunoAvailable()) {
    throw new Error("Suno API key is not configured. Please add your SUNO_API_KEY in Settings.");
  }

  const apiKey = getApiKey();

  const body: Record<string, unknown> = {
    prompt: params.prompt,
    model: params.model ?? "V4_5PLUS",
    instrumental: params.instrumental ?? false,
  };

  if (params.customMode) {
    body.customMode = true;
    if (params.style) body.style = params.style;
    if (params.title) body.title = params.title;
  }

  const response = await axios.post(
    `${SUNO_API_BASE}/generate`,
    body,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  if (response.data.code !== 200) {
    throw new Error(`Suno API error: ${response.data.msg || "Unknown error"}`);
  }

  return response.data.data.taskId;
}

/**
 * Poll for task completion status.
 */
export async function getTaskStatus(taskId: string): Promise<SunoTaskResponse> {
  if (!isSunoAvailable()) {
    throw new Error("Suno API key is not configured");
  }

  const apiKey = getApiKey();

  const response = await axios.get(
    `${SUNO_API_BASE}/generate/record-info`,
    {
      params: { taskId },
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      timeout: 15000,
    }
  );

  if (response.data.code !== 200) {
    throw new Error(`Suno API error: ${response.data.msg || "Unknown error"}`);
  }

  return response.data.data;
}

/**
 * Wait for a task to complete by polling.
 * Returns the completed task response.
 */
export async function waitForCompletion(
  taskId: string,
  maxWaitMs: number = 600000,
  pollIntervalMs: number = 15000
): Promise<SunoTaskResponse> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const status = await getTaskStatus(taskId);

    if (status.status === "SUCCESS") {
      return status;
    }

    if (status.status === "FAILED" || status.status === "CREATE_TASK_FAILED") {
      throw new Error(`Suno generation failed: ${status.errorMessage || "Unknown error"}`);
    }

    // Wait before polling again
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error("Suno generation timed out after 10 minutes");
}

/**
 * Generate music and wait for completion.
 * Downloads the audio and uploads to S3.
 * Returns the first audio result.
 */
export async function generateMusic(
  params: MusicGenerateParams,
  userId: number
): Promise<MusicResult> {
  const taskId = await submitMusicGeneration(params);

  // Poll for completion
  const result = await waitForCompletion(taskId);

  if (!result.response?.data?.length) {
    throw new Error("No audio generated from Suno");
  }

  // Take the first audio result
  const audio = result.response.data[0];

  // Download the audio from Suno and upload to S3 for permanence
  const audioResponse = await axios.get(audio.audio_url, {
    responseType: "arraybuffer",
    timeout: 60000,
  });

  const fileKey = `songs/${userId}/${nanoid()}.mp3`;
  const buffer = Buffer.from(audioResponse.data);
  const { url } = await storagePut(fileKey, buffer, "audio/mpeg");

  return {
    audioUrl: url,
    audioKey: fileKey,
    duration: Math.round(audio.duration || 0),
    sunoTaskId: taskId,
    sunoAudioId: audio.id,
    title: audio.title || "",
    tags: audio.tags || "",
  };
}

// ─── Lyrics Generation ───

/**
 * Submit a lyrics generation task.
 * Returns the taskId for polling.
 */
export async function submitLyricsGeneration(prompt: string): Promise<string> {
  if (!isSunoAvailable()) {
    throw new Error("Suno API key is not configured");
  }

  const apiKey = getApiKey();

  const response = await axios.post(
    `${SUNO_API_BASE}/lyrics`,
    { prompt },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  if (response.data.code !== 200) {
    throw new Error(`Suno lyrics error: ${response.data.msg || "Unknown error"}`);
  }

  return response.data.data.taskId;
}

/**
 * Poll for lyrics task completion.
 */
export async function getLyricsTaskStatus(taskId: string): Promise<{
  status: string;
  text?: string;
  title?: string;
}> {
  if (!isSunoAvailable()) {
    throw new Error("Suno API key is not configured");
  }

  const apiKey = getApiKey();

  const response = await axios.get(
    `${SUNO_API_BASE}/lyrics/record-info`,
    {
      params: { taskId },
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      timeout: 15000,
    }
  );

  if (response.data.code !== 200) {
    throw new Error(`Suno lyrics error: ${response.data.msg || "Unknown error"}`);
  }

  const data = response.data.data;
  return {
    status: data.status || data.successFlag || "PENDING",
    text: data.response?.data?.[0]?.text,
    title: data.response?.data?.[0]?.title,
  };
}

// ─── Stem Separation ───

/**
 * Submit a stem separation task.
 * type: "separate_vocal" (2 stems) or "split_stem" (up to 12 stems)
 */
export async function submitStemSeparation(
  sunoTaskId: string,
  audioId: string,
  type: "separate_vocal" | "split_stem" = "split_stem"
): Promise<string> {
  if (!isSunoAvailable()) {
    throw new Error("Suno API key is not configured");
  }

  const apiKey = getApiKey();

  const response = await axios.post(
    `${SUNO_API_BASE}/vocal-removal/generate`,
    {
      taskId: sunoTaskId,
      audioId,
      type,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  if (response.data.code !== 200) {
    throw new Error(`Suno stem separation error: ${response.data.msg || "Unknown error"}`);
  }

  return response.data.data.taskId;
}

/**
 * Poll for stem separation task completion.
 */
export async function getStemSeparationStatus(taskId: string): Promise<StemSeparationResult> {
  if (!isSunoAvailable()) {
    throw new Error("Suno API key is not configured");
  }

  const apiKey = getApiKey();

  const response = await axios.get(
    `${SUNO_API_BASE}/vocal-removal/record-info`,
    {
      params: { taskId },
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      timeout: 15000,
    }
  );

  if (response.data.code !== 200) {
    throw new Error(`Suno stem separation error: ${response.data.msg || "Unknown error"}`);
  }

  const data = response.data.data;
  const resp = data.response || {};

  return {
    taskId: data.taskId,
    status: data.successFlag || "PENDING",
    vocalUrl: resp.vocalUrl || null,
    instrumentalUrl: resp.instrumentalUrl || null,
    backingVocalsUrl: resp.backingVocalsUrl || null,
    drumsUrl: resp.drumsUrl || null,
    bassUrl: resp.bassUrl || null,
    guitarUrl: resp.guitarUrl || null,
    keyboardUrl: resp.keyboardUrl || null,
    percussionUrl: resp.percussionUrl || null,
    stringsUrl: resp.stringsUrl || null,
    synthUrl: resp.synthUrl || null,
    fxUrl: resp.fxUrl || null,
    brassUrl: resp.brassUrl || null,
    woodwindsUrl: resp.woodwindsUrl || null,
  };
}

/**
 * Wait for stem separation to complete.
 */
export async function waitForStemSeparation(
  taskId: string,
  maxWaitMs: number = 600000,
  pollIntervalMs: number = 15000
): Promise<StemSeparationResult> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const status = await getStemSeparationStatus(taskId);

    if (status.status === "SUCCESS") {
      return status;
    }

    if (status.status === "FAILED") {
      throw new Error("Stem separation failed");
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error("Stem separation timed out after 10 minutes");
}

/**
 * Download a stem audio file from Suno CDN and upload to S3 for permanent storage.
 */
export async function downloadAndStoreStem(
  stemUrl: string,
  userId: number,
  stemType: string
): Promise<{ url: string; key: string }> {
  const audioResponse = await axios.get(stemUrl, {
    responseType: "arraybuffer",
    timeout: 60000,
  });

  const fileKey = `stems/${userId}/${nanoid()}-${stemType}.mp3`;
  const buffer = Buffer.from(audioResponse.data);
  const { url } = await storagePut(fileKey, buffer, "audio/mpeg");

  return { url, key: fileKey };
}

// ─── Credits ───

/**
 * Get remaining Suno API credits.
 */
export async function getCredits(): Promise<number> {
  if (!isSunoAvailable()) {
    throw new Error("Suno API key is not configured");
  }

  const apiKey = getApiKey();

  const response = await axios.get(`${SUNO_API_BASE}/get-credits`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    timeout: 15000,
  });

  if (response.data.code !== 200) {
    throw new Error(`Suno credits error: ${response.data.msg || "Unknown error"}`);
  }

  return response.data.data.credits ?? 0;
}
