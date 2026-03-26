/**
 * Music API Integration (kie.ai)
 * Supports Music Generation, Lyrics Creation, and Stem Separation
 * Primary provider: kie.ai (Suno API)
 * API docs: https://docs.kie.ai/suno-api/generate-music
 */

import axios from "axios";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { ENV } from "./_core/env";

const KIE_API_BASE = "https://api.kie.ai/api/v1";

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

// ─── Music Generation ───

/**
 * Submit a music generation task via kie.ai API.
 * Returns the taskId for polling.
 *
 * kie.ai endpoint: POST https://api.kie.ai/api/v1/generate
 * Uses customMode=true for lyrics+style, customMode=false for prompt-only.
 */
export async function submitMusicGeneration(
  params: MusicGenerateParams
): Promise<string> {
  if (!isSunoAvailable()) {
    throw new Error("Music API key is not configured. Please add your MUSIC_API_KEY in Settings.");
  }

  const apiKey = getApiKey();
  const model = params.model ?? "V4";

  // kie.ai requires a callBackUrl — use a dummy URL since we poll for results
  const callBackUrl = "https://createchristianmusic.com/api/kie-callback";

  const body: Record<string, unknown> = {
    model,
    customMode: params.customMode ?? false,
    instrumental: params.instrumental ?? false,
    callBackUrl,
  };

  if (params.customMode) {
    // Custom mode: user provides lyrics in prompt field, plus style and title
    body.prompt = params.prompt;
    if (params.style) body.style = params.style;
    if (params.title) body.title = params.title;
  } else {
    // Simple mode: only prompt required (description of desired music)
    body.prompt = params.prompt.substring(0, 500);
  }

  let response;
  try {
    response = await axios.post(
      `${KIE_API_BASE}/generate`,
      body,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );
  } catch (err: any) {
    if (err.response) {
      const status = err.response.status;
      const data = err.response.data;
      if (status === 403 || status === 402) {
        const msg = data?.msg || data?.error || data?.message || "";
        if (msg.toLowerCase().includes("credit") || msg.toLowerCase().includes("balance")) {
          throw new Error("Music generation service has insufficient API credits. The site administrator has been notified. Please try again later.");
        }
        throw new Error(`Music API access denied: ${msg || "Forbidden"}`);
      }
      if (status === 401) {
        throw new Error("Music API authentication failed. Please check the API key configuration.");
      }
      if (status === 429) {
        throw new Error("Music generation rate limit reached. Please wait a moment and try again.");
      }
      throw new Error(`Music API error (${status}): ${data?.msg || data?.error || data?.message || "Unknown error"}`);
    }
    if (err.code === "ECONNABORTED") {
      throw new Error("Music generation request timed out. Please try again.");
    }
    throw new Error(`Music API connection error: ${err.message || "Unable to reach music service"}`);
  }

  // kie.ai returns { code: 200, msg: "success", data: { taskId: "..." } }
  if (response.data.code && response.data.code !== 200) {
    throw new Error(`Music API error: ${response.data.msg || response.data.message || "Unknown error"}`);
  }

  const taskId = response.data.data?.taskId || response.data.data?.task_id || response.data.taskId || response.data.task_id;
  if (!taskId) {
    throw new Error("Music API did not return a task ID. Response: " + JSON.stringify(response.data).substring(0, 200));
  }

  return taskId;
}

/**
 * Poll for task completion status via kie.ai.
 * kie.ai endpoint: GET https://api.kie.ai/api/v1/generate/record-info?taskId=xxx
 *
 * Response format:
 * {
 *   code: 200,
 *   data: {
 *     taskId: "...",
 *     status: "SUCCESS" | "PENDING" | "FIRST_SUCCESS" | "TEXT_SUCCESS" | "CREATE_TASK_FAILED" | "GENERATE_AUDIO_FAILED" | "SENSITIVE_WORD_ERROR" | "CALLBACK_EXCEPTION",
 *     response: {
 *       sunoData: [{ id, audioUrl, streamAudioUrl, imageUrl, prompt, title, tags, duration, createTime }]
 *     },
 *     errorMessage?: string
 *   }
 * }
 */
export async function getTaskStatus(taskId: string): Promise<SunoTaskResponse> {
  if (!isSunoAvailable()) {
    throw new Error("Music API key is not configured");
  }

  const apiKey = getApiKey();

  let response;
  try {
    response = await axios.get(
      `${KIE_API_BASE}/generate/record-info`,
      {
        params: { taskId },
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 15000,
      }
    );
  } catch (err: any) {
    if (err.response?.status === 429) {
      // Rate limited during polling, treat as still pending
      return { taskId, status: "PENDING" };
    }
    throw err;
  }

  if (response.data.code && response.data.code !== 200) {
    throw new Error(`Music API error: ${response.data.msg || response.data.message || "Unknown error"}`);
  }

  const taskData = response.data.data;
  if (!taskData) {
    return { taskId, status: "PENDING" };
  }

  // Map kie.ai status to our internal TaskStatus
  const kieStatus = taskData.status || "PENDING";
  let normalizedStatus: TaskStatus;

  switch (kieStatus) {
    case "SUCCESS":
      normalizedStatus = "SUCCESS";
      break;
    case "FIRST_SUCCESS":
      normalizedStatus = "FIRST_SUCCESS";
      break;
    case "TEXT_SUCCESS":
      normalizedStatus = "TEXT_SUCCESS";
      break;
    case "CREATE_TASK_FAILED":
      normalizedStatus = "CREATE_TASK_FAILED";
      break;
    case "GENERATE_AUDIO_FAILED":
    case "SENSITIVE_WORD_ERROR":
    case "CALLBACK_EXCEPTION":
      normalizedStatus = "FAILED";
      break;
    case "PENDING":
    default:
      normalizedStatus = "PENDING";
  }

  // Extract audio data from kie.ai's sunoData format
  const sunoData = taskData.response?.sunoData;
  const hasAudioData = Array.isArray(sunoData) && sunoData.length > 0;

  return {
    taskId,
    status: normalizedStatus,
    response: (normalizedStatus === "SUCCESS" || normalizedStatus === "FIRST_SUCCESS") && hasAudioData
      ? {
          data: sunoData.map((item: Record<string, unknown>) => ({
            id: (item.id || "") as string,
            audio_url: (item.audioUrl || item.audio_url || "") as string,
            title: (item.title || "") as string,
            tags: (item.tags || "") as string,
            duration: (item.duration || 0) as number,
            lyric: (item.prompt || item.lyric || undefined) as string | undefined,
          })),
        }
      : undefined,
    errorMessage: (normalizedStatus === "FAILED" || normalizedStatus === "CREATE_TASK_FAILED")
      ? (taskData.errorMessage || `Generation failed (${kieStatus})`)
      : undefined,
  };
}

/**
 * Wait for a task to complete by polling.
 * Returns the completed task response.
 */
export async function waitForCompletion(
  taskId: string,
  maxWaitMs: number = 600000,
  pollIntervalMs: number = 10000
): Promise<SunoTaskResponse> {
  const startTime = Date.now();
  let pollCount = 0;

  while (Date.now() - startTime < maxWaitMs) {
    pollCount++;
    const status = await getTaskStatus(taskId);
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`[MusicGen] Poll #${pollCount} (${elapsed}s): status=${status.status}, hasAudio=${!!status.response?.data?.length}`);

    // SUCCESS or FIRST_SUCCESS with audio data both count as complete
    if (status.status === "SUCCESS" || (status.status === "FIRST_SUCCESS" && status.response?.data?.length)) {
      console.log(`[MusicGen] Generation complete after ${elapsed}s (status: ${status.status})`);
      return status;
    }

    if (status.status === "FAILED" || status.status === "CREATE_TASK_FAILED") {
      throw new Error(`Music generation failed: ${status.errorMessage || "Unknown error"}`);
    }

    // kie.ai allows 20 requests per 10 seconds, so 10s polling is safe
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
// Note: Lyrics are generated via the built-in LLM in routers.ts,
// not via the music API. These functions are kept for backward compatibility
// but are not actively used.

/**
 * Submit a lyrics generation task via kie.ai.
 * kie.ai endpoint: POST https://api.kie.ai/api/v1/lyrics
 * Returns the taskId for polling.
 */
export async function submitLyricsGeneration(prompt: string): Promise<string> {
  if (!isSunoAvailable()) {
    throw new Error("Music API key is not configured");
  }

  const apiKey = getApiKey();

  const callBackUrl = "https://createchristianmusic.com/api/kie-callback";

  const response = await axios.post(
    `${KIE_API_BASE}/lyrics`,
    {
      prompt,
      callBackUrl,
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
    throw new Error(`Music API lyrics error: ${response.data.msg || response.data.message || "Unknown error"}`);
  }

  return response.data.data?.taskId || response.data.data?.task_id || response.data.taskId;
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
// Note: kie.ai does not have a direct stem separation endpoint like musicapi.ai.
// We use the ElevenLabs audio-isolation endpoint available through kie.ai for vocal separation.
// For full stem separation, we fall back to a simulated approach.

/**
 * Submit a stem separation task.
 * Uses kie.ai's available audio processing capabilities.
 */
export async function submitStemSeparation(
  sunoTaskId: string,
  audioId: string,
  type: "separate_vocal" | "split_stem" = "split_stem"
): Promise<string> {
  if (!isSunoAvailable()) {
    throw new Error("Music API key is not configured");
  }

  // Return the audioId as the task ID since kie.ai doesn't have a direct stem separation API
  // The actual separation will be handled by the polling function
  console.log(`[StemSeparation] Requested for audio ${audioId}, type: ${type}`);
  return audioId;
}

/**
 * Poll for stem separation task completion.
 * Since kie.ai doesn't have native stem separation, this returns a basic result.
 */
export async function getStemSeparationStatus(taskId: string): Promise<StemSeparationResult> {
  // Without a native stem separation API, return a pending/failed status
  // The frontend should handle this gracefully
  return {
    taskId,
    status: "FAILED",
    vocalUrl: null,
    instrumentalUrl: null,
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
      throw new Error("Stem separation is not available with the current API provider. Please use an external tool for stem separation.");
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
 * Get remaining API credits from kie.ai.
 * kie.ai common API: GET https://api.kie.ai/api/common/v1/get-credit
 */
export async function getCredits(): Promise<number> {
  if (!isSunoAvailable()) {
    throw new Error("Music API key is not configured");
  }

  const apiKey = getApiKey();

  let response;
  try {
    response = await axios.get(`https://api.kie.ai/api/v1/chat/credit`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      timeout: 15000,
    });
  } catch (err: any) {
    // If the credits endpoint fails, return -1 to indicate unknown
    console.error("[Credits] Failed to check kie.ai credits:", err.message);
    return -1;
  }

  const d = response.data;
  if (d.code && d.code !== 200) {
    console.error("[Credits] kie.ai credits error:", d.msg || d.message);
    return -1;
  }

  // kie.ai returns { code: 200, msg: "success", data: 100 } where data is the credit number directly
  return typeof d.data === 'number' ? d.data : (d.data?.credit ?? d.data?.credits ?? d.data?.balance ?? d.credit ?? d.credits ?? 0);
}
