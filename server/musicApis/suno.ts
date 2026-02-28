/**
 * Suno API Integration (via sunoapi.org)
 * Generates professional-quality music with vocals and lyrics
 */

import { ENV } from "../_core/env";

const SUNO_BASE_URL = "https://api.sunoapi.org";

export function isSunoAvailable(): boolean {
  return Boolean(ENV.sunoApiKey && ENV.sunoApiKey.length > 0);
}

type SunoGenerateParams = {
  prompt: string;
  style?: string;
  title?: string;
  instrumental: boolean;
  vocalGender?: "m" | "f";
  model?: string;
};

type SunoGenerateResult = {
  taskId: string;
};

type SunoSongData = {
  id: string;
  audioUrl: string;
  streamAudioUrl: string;
  imageUrl: string;
  prompt: string;
  modelName: string;
  title: string;
  tags: string;
  createTime: string;
  duration: number;
};

type SunoStatusResult = {
  taskId: string;
  status: "PENDING" | "TEXT_SUCCESS" | "FIRST_SUCCESS" | "SUCCESS" | "CREATE_TASK_FAILED" | "GENERATE_AUDIO_FAILED" | "CALLBACK_EXCEPTION" | "SENSITIVE_WORD_ERROR";
  response?: {
    taskId: string;
    sunoData: SunoSongData[];
  };
  errorMessage?: string;
};

export async function sunoGenerate(params: SunoGenerateParams): Promise<SunoGenerateResult> {
  const { prompt, style, title, instrumental, vocalGender, model = "V4_5ALL" } = params;

  const isCustomMode = Boolean(style || title);

  const body: Record<string, unknown> = {
    customMode: isCustomMode,
    instrumental,
    model,
    callBackUrl: "https://example.com/callback", // We use polling instead
  };

  if (isCustomMode) {
    if (style) body.style = style;
    if (title) body.title = title;
    if (!instrumental) body.prompt = prompt; // lyrics/prompt
  } else {
    body.prompt = prompt;
  }

  if (vocalGender && !instrumental) {
    body.vocalGender = vocalGender;
  }

  const response = await fetch(`${SUNO_BASE_URL}/api/v1/generate`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${ENV.sunoApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Suno API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  if (result.code !== 200) {
    throw new Error(`Suno API error: ${result.msg || "Unknown error"}`);
  }

  return { taskId: result.data.taskId };
}

export async function sunoGetStatus(taskId: string): Promise<SunoStatusResult> {
  const response = await fetch(
    `${SUNO_BASE_URL}/api/v1/generate/record-info?taskId=${encodeURIComponent(taskId)}`,
    {
      headers: {
        "Authorization": `Bearer ${ENV.sunoApiKey}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Suno status check failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  if (result.code !== 200) {
    throw new Error(`Suno status error: ${result.msg || "Unknown error"}`);
  }

  return result.data as SunoStatusResult;
}

/**
 * Poll for Suno generation completion
 * Returns the first completed song data
 */
export async function sunoPollUntilDone(
  taskId: string,
  maxWaitMs: number = 180000, // 3 minutes
  intervalMs: number = 5000   // 5 seconds
): Promise<SunoSongData> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const status = await sunoGetStatus(taskId);

    if (status.status === "SUCCESS" || status.status === "FIRST_SUCCESS") {
      const songs = status.response?.sunoData;
      if (songs && songs.length > 0) {
        return songs[0];
      }
      throw new Error("Suno generation completed but no songs returned");
    }

    if (
      status.status === "CREATE_TASK_FAILED" ||
      status.status === "GENERATE_AUDIO_FAILED" ||
      status.status === "SENSITIVE_WORD_ERROR" ||
      status.status === "CALLBACK_EXCEPTION"
    ) {
      throw new Error(`Suno generation failed: ${status.status} - ${status.errorMessage || "Unknown error"}`);
    }

    // Still pending, wait and retry
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw new Error("Suno generation timed out after 3 minutes");
}
