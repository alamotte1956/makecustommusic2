/**
 * Suno API Integration
 * Supports both Simple Mode (prompt-based) and Custom Mode (lyrics + style tags)
 * API docs: https://docs.sunoapi.org/
 */

import axios from "axios";

const SUNO_API_BASE = "https://apibox.erweima.ai";

function getSunoApiKey(): string {
  return process.env.SUNO_API_KEY ?? "";
}

export function isSunoAvailable(): boolean {
  const key = getSunoApiKey();
  return !!key && key.length > 0;
}

type SunoGenerateSimpleParams = {
  mode: "simple";
  prompt: string;
  duration?: number; // in seconds
};

type SunoGenerateCustomParams = {
  mode: "custom";
  title: string;
  lyrics: string;
  style: string; // style tags like "synthwave, male vocals, slow tempo"
  duration?: number;
};

type SunoGenerateParams = SunoGenerateSimpleParams | SunoGenerateCustomParams;

type SunoTaskResponse = {
  code: number;
  msg: string;
  data: {
    taskId: string;
  };
};

export type SunoSongData = {
  id: string;
  title: string;
  audioUrl: string;
  imageUrl?: string;
  lyric?: string;
  modelName?: string;
  tags?: string;
  duration?: number;
  createTime?: string;
  status?: string;
};

type SunoStatusResponse = {
  code: number;
  msg: string;
  data: {
    status: string; // "SUCCESS", "PENDING", "TEXT_SUCCESS", "FIRST_SUCCESS", "FAILED"
    response?: {
      sunoData?: SunoSongData[];
    };
    failReason?: string;
  };
};

/**
 * Submit a music generation task to Suno API
 */
export async function sunoGenerate(params: SunoGenerateParams): Promise<string> {
  if (!isSunoAvailable()) {
    throw new Error("Suno API key is not configured");
  }

  const apiKey = getSunoApiKey();
  let requestBody: Record<string, unknown>;

  if (params.mode === "custom") {
    // Custom Mode: user provides lyrics, style tags, and title
    requestBody = {
      title: params.title,
      prompt: params.lyrics, // In custom mode, "prompt" is the lyrics
      tags: params.style, // Style tags like "pop, male vocals, upbeat"
      customMode: true,
      instrumental: false,
      model: "V5",
      callBackUrl: "",
    };
  } else {
    // Simple Mode: just a text prompt
    requestBody = {
      prompt: params.prompt,
      customMode: false,
      instrumental: false,
      model: "V5",
      callBackUrl: "",
    };
  }

  const response = await axios.post<SunoTaskResponse>(
    `${SUNO_API_BASE}/api/v1/generate`,
    requestBody,
    {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  if (response.data.code !== 200 || !response.data.data?.taskId) {
    throw new Error(`Suno API error: ${response.data.msg || "Unknown error"}`);
  }

  return response.data.data.taskId;
}

/**
 * Poll for the status of a Suno generation task
 */
export async function sunoGetStatus(taskId: string): Promise<SunoStatusResponse["data"]> {
  if (!isSunoAvailable()) {
    throw new Error("Suno API key is not configured");
  }

  const apiKey = getSunoApiKey();

  const response = await axios.get<SunoStatusResponse>(
    `${SUNO_API_BASE}/api/v1/generate/record-info`,
    {
      params: { taskId },
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
      timeout: 15000,
    }
  );

  if (response.data.code !== 200) {
    throw new Error(`Suno status error: ${response.data.msg || "Unknown error"}`);
  }

  return response.data.data;
}

/**
 * Generate music with Suno and poll until complete
 * Returns the first generated song's data
 */
export async function sunoGenerateAndWait(
  params: SunoGenerateParams,
  maxWaitMs: number = 300000, // 5 minutes max
  pollIntervalMs: number = 5000 // poll every 5 seconds
): Promise<SunoSongData> {
  const taskId = await sunoGenerate(params);

  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));

    const status = await sunoGetStatus(taskId);

    if (status.status === "SUCCESS") {
      const songs = status.response?.sunoData;
      if (!songs || songs.length === 0) {
        throw new Error("Suno returned no songs");
      }
      return songs[0];
    }

    if (status.status === "FAILED") {
      throw new Error(`Suno generation failed: ${status.failReason || "Unknown reason"}`);
    }

    // PENDING, TEXT_SUCCESS, FIRST_SUCCESS — keep polling
  }

  throw new Error("Suno generation timed out after 5 minutes");
}
