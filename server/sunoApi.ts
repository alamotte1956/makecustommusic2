/**
 * Music API Integration (musicapi.ai)
 * Supports Music Generation, Lyrics Creation, and Stem Separation
 * Primary provider: musicapi.ai (Sonic API)
 * API docs: https://docs.musicapi.ai/sonic-instructions
 */

import axios from "axios";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { ENV } from "./_core/env";

const MUSIC_API_BASE = "https://api.musicapi.ai/api/v1";

function getApiKey(): string {
  return ENV.musicApiKey;
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

// ─── Model Mapping ───

/** Map our internal model names to musicapi.ai Sonic model versions */
function mapModelToSonic(model: SunoModel): string {
  const mapping: Record<SunoModel, string> = {
    V4: "sonic-v4",
    V4_5: "sonic-v4-5",
    V4_5PLUS: "sonic-v4-5-plus",
    V4_5ALL: "sonic-v4-5-all",
    V5: "sonic-v5",
  };
  return mapping[model] || "sonic-v4-5-plus";
}

// ─── Music Generation ───

/**
 * Submit a music generation task via musicapi.ai Sonic API.
 * Returns the taskId for polling.
 */
export async function submitMusicGeneration(
  params: MusicGenerateParams
): Promise<string> {
  if (!isSunoAvailable()) {
    throw new Error("Music API key is not configured. Please add your MUSIC_API_KEY in Settings.");
  }

  const apiKey = getApiKey();
  const model = mapModelToSonic(params.model ?? "V4_5PLUS");

  const body: Record<string, unknown> = {
    mv: model,
    custom_mode: params.customMode ?? false,
  };

  if (params.customMode) {
    // Custom mode: user provides lyrics in prompt field
    body.prompt = params.prompt;
    if (params.style) body.tags = params.style;
    if (params.title) body.title = params.title;
  } else {
    // AI description mode: prompt is a description
    body.gpt_description_prompt = params.prompt.substring(0, 400);
  }

  if (params.instrumental) {
    body.make_instrumental = true;
  }

  const response = await axios.post(
    `${MUSIC_API_BASE}/sonic/create`,
    body,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  if (response.data.code && response.data.code !== 200) {
    throw new Error(`Music API error: ${response.data.message || response.data.msg || "Unknown error"}`);
  }

  // musicapi.ai returns task_id at top level or nested in data
  const taskId = response.data.task_id || response.data.data?.task_id || response.data.data?.taskId;
  if (!taskId) {
    throw new Error("Music API did not return a task ID. Response: " + JSON.stringify(response.data).substring(0, 200));
  }

  return taskId;
}

/**
 * Poll for task completion status via musicapi.ai.
 * Normalizes the response to our internal SunoTaskResponse format.
 */
export async function getTaskStatus(taskId: string): Promise<SunoTaskResponse> {
  if (!isSunoAvailable()) {
    throw new Error("Music API key is not configured");
  }

  const apiKey = getApiKey();

  const response = await axios.get(
    `${MUSIC_API_BASE}/sonic/task/${taskId}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      timeout: 15000,
    }
  );

  if (response.data.code && response.data.code !== 200) {
    throw new Error(`Music API error: ${response.data.message || response.data.msg || "Unknown error"}`);
  }

  const clips = response.data.data;

  // musicapi.ai returns an array of clip objects directly
  if (!Array.isArray(clips) || clips.length === 0) {
    return {
      taskId,
      status: "PENDING",
    };
  }

  // Check the state of the first clip
  const firstClip = clips[0];
  const state = firstClip.state || firstClip.status || "pending";

  // Map musicapi.ai states to our internal states
  let normalizedStatus: TaskStatus;
  switch (state) {
    case "succeeded":
    case "complete":
      normalizedStatus = "SUCCESS";
      break;
    case "failed":
    case "error":
      normalizedStatus = "FAILED";
      break;
    case "running":
    case "processing":
      normalizedStatus = "FIRST_SUCCESS";
      break;
    default:
      normalizedStatus = "PENDING";
  }

  return {
    taskId,
    status: normalizedStatus,
    response: normalizedStatus === "SUCCESS"
      ? {
          data: clips.map((clip: Record<string, unknown>) => ({
            id: (clip.clip_id || clip.id || "") as string,
            audio_url: (clip.audio_url || "") as string,
            title: (clip.title || "") as string,
            tags: (clip.tags || "") as string,
            duration: (clip.duration || 0) as number,
            lyric: (clip.lyrics || clip.lyric || undefined) as string | undefined,
          })),
        }
      : undefined,
    errorMessage: normalizedStatus === "FAILED" ? (firstClip.error_message || firstClip.errorMessage || "Generation failed") : undefined,
  };
}

/**
 * Wait for a task to complete by polling.
 * Returns the completed task response.
 */
export async function waitForCompletion(
  taskId: string,
  maxWaitMs: number = 600000,
  pollIntervalMs: number = 18000
): Promise<SunoTaskResponse> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const status = await getTaskStatus(taskId);

    if (status.status === "SUCCESS") {
      return status;
    }

    if (status.status === "FAILED" || status.status === "CREATE_TASK_FAILED") {
      throw new Error(`Music generation failed: ${status.errorMessage || "Unknown error"}`);
    }

    // Wait before polling again (musicapi.ai recommends 15-25s)
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error("Music generation timed out after 10 minutes");
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
    throw new Error("No audio generated");
  }

  // Take the first audio result
  const audio = result.response.data[0];

  // Download the audio and upload to S3 for permanence
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
// Note: Lyrics are generated via the built-in LLM (Claude) in routers.ts,
// not via the music API. These functions are kept for backward compatibility
// but are not actively used.

/**
 * Submit a lyrics generation task.
 * Returns the taskId for polling.
 */
export async function submitLyricsGeneration(prompt: string): Promise<string> {
  if (!isSunoAvailable()) {
    throw new Error("Music API key is not configured");
  }

  const apiKey = getApiKey();

  // musicapi.ai uses the same create-music endpoint with auto_lyrics mode
  const response = await axios.post(
    `${MUSIC_API_BASE}/sonic/create`,
    {
      custom_mode: true,
      mv: "sonic-v4-5-plus",
      prompt: prompt,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  if (response.data.code && response.data.code !== 200) {
    throw new Error(`Music API lyrics error: ${response.data.message || response.data.msg || "Unknown error"}`);
  }

  return response.data.task_id || response.data.data?.task_id || response.data.data?.taskId;
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
    throw new Error("Music API key is not configured");
  }

  const taskResult = await getTaskStatus(taskId);

  return {
    status: taskResult.status === "SUCCESS" ? "SUCCESS" : taskResult.status === "FAILED" ? "FAILED" : "PENDING",
    text: taskResult.response?.data?.[0]?.lyric,
    title: taskResult.response?.data?.[0]?.title,
  };
}

// ─── Stem Separation ───

/**
 * Submit a stem separation task via musicapi.ai get-vox endpoint.
 * type: "separate_vocal" (2 stems) or "split_stem" (up to 12 stems)
 */
export async function submitStemSeparation(
  sunoTaskId: string,
  audioId: string,
  type: "separate_vocal" | "split_stem" = "split_stem"
): Promise<string> {
  if (!isSunoAvailable()) {
    throw new Error("Music API key is not configured");
  }

  const apiKey = getApiKey();

  // musicapi.ai uses get-vox for vocal extraction
  const response = await axios.post(
    `${MUSIC_API_BASE}/sonic/vox`,
    {
      clip_id: audioId,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  if (response.data.code && response.data.code !== 200) {
    throw new Error(`Stem separation error: ${response.data.message || response.data.msg || "Unknown error"}`);
  }

  return response.data.task_id || response.data.data?.task_id || response.data.data?.taskId || audioId;
}

/**
 * Poll for stem separation task completion.
 */
export async function getStemSeparationStatus(taskId: string): Promise<StemSeparationResult> {
  if (!isSunoAvailable()) {
    throw new Error("Music API key is not configured");
  }

  const apiKey = getApiKey();

  const response = await axios.get(
    `${MUSIC_API_BASE}/sonic/task/${taskId}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      timeout: 15000,
    }
  );

  if (response.data.code && response.data.code !== 200) {
    throw new Error(`Stem separation error: ${response.data.message || response.data.msg || "Unknown error"}`);
  }

  const data = response.data.data;
  const clipData = Array.isArray(data) ? data[0] : data;
  const state = clipData?.state || clipData?.status || "pending";

  return {
    taskId,
    status: state === "succeeded" ? "SUCCESS" : state === "failed" ? "FAILED" : "PENDING",
    vocalUrl: clipData?.vocal_url || clipData?.vocalUrl || null,
    instrumentalUrl: clipData?.instrumental_url || clipData?.instrumentalUrl || null,
    backingVocalsUrl: null,
    drumsUrl: null,
    bassUrl: null,
    guitarUrl: null,
    keyboardUrl: null,
    percussionUrl: null,
    stringsUrl: null,
    synthUrl: null,
    fxUrl: null,
    brassUrl: null,
    woodwindsUrl: null,
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
 * Download a stem audio file from CDN and upload to S3 for permanent storage.
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
 * Get remaining API credits from musicapi.ai.
 */
export async function getCredits(): Promise<number> {
  if (!isSunoAvailable()) {
    throw new Error("Music API key is not configured");
  }

  const apiKey = getApiKey();

  const response = await axios.get(`${MUSIC_API_BASE}/get-credits`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    timeout: 15000,
  });

  // musicapi.ai returns flat JSON: { credits: 50, extra_credits: 0 }
  // or nested: { code: 200, data: { credits: 50 } }
  const d = response.data;
  if (d.code && d.code !== 200) {
    throw new Error(`Credits check error: ${d.message || d.msg || "Unknown error"}`);
  }

  return d.credits ?? d.data?.credits ?? d.data?.remaining ?? 0;
}
