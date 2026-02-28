/**
 * Replicate MusicGen Integration (Meta's MusicGen model)
 * Generates high-quality instrumental music from text prompts
 */

import { ENV } from "../_core/env";

const REPLICATE_BASE_URL = "https://api.replicate.com/v1";
const MUSICGEN_VERSION = "671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb";

export function isReplicateAvailable(): boolean {
  return Boolean(ENV.replicateApiToken && ENV.replicateApiToken.length > 0);
}

type ReplicateGenerateParams = {
  prompt: string;
  duration?: number; // seconds, default 8
  modelVersion?: string; // "stereo-large", "stereo-melody-large", etc.
  outputFormat?: string; // "wav" or "mp3"
  temperature?: number;
};

type ReplicatePrediction = {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string; // URL to the generated audio file
  error?: string;
  logs?: string;
};

export async function replicateGenerate(params: ReplicateGenerateParams): Promise<ReplicatePrediction> {
  const {
    prompt,
    duration = 15,
    modelVersion = "stereo-large",
    outputFormat = "mp3",
    temperature = 1,
  } = params;

  const response = await fetch(`${REPLICATE_BASE_URL}/predictions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${ENV.replicateApiToken}`,
      "Content-Type": "application/json",
      "Prefer": "wait=60", // Wait up to 60s for sync response
    },
    body: JSON.stringify({
      version: MUSICGEN_VERSION,
      input: {
        prompt,
        duration,
        model_version: modelVersion,
        output_format: outputFormat,
        normalization_strategy: "peak",
        temperature,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Replicate API error: ${response.status} - ${errorText}`);
  }

  return (await response.json()) as ReplicatePrediction;
}

export async function replicateGetPrediction(predictionId: string): Promise<ReplicatePrediction> {
  const response = await fetch(`${REPLICATE_BASE_URL}/predictions/${predictionId}`, {
    headers: {
      "Authorization": `Bearer ${ENV.replicateApiToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Replicate status check failed: ${response.status} - ${errorText}`);
  }

  return (await response.json()) as ReplicatePrediction;
}

/**
 * Poll for Replicate prediction completion
 * Returns the audio URL
 */
export async function replicatePollUntilDone(
  predictionId: string,
  maxWaitMs: number = 120000, // 2 minutes
  intervalMs: number = 3000   // 3 seconds
): Promise<string> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const prediction = await replicateGetPrediction(predictionId);

    if (prediction.status === "succeeded") {
      if (prediction.output) {
        // Output can be a string URL or an object
        const outputUrl = typeof prediction.output === "string"
          ? prediction.output
          : (prediction.output as any)?.url || String(prediction.output);
        return outputUrl;
      }
      throw new Error("Replicate generation completed but no output URL");
    }

    if (prediction.status === "failed") {
      throw new Error(`Replicate generation failed: ${prediction.error || "Unknown error"}`);
    }

    if (prediction.status === "canceled") {
      throw new Error("Replicate generation was canceled");
    }

    // Still processing, wait and retry
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw new Error("Replicate generation timed out after 2 minutes");
}

/**
 * Generate music and wait for completion
 * Returns the audio URL
 */
export async function replicateGenerateAndWait(params: ReplicateGenerateParams): Promise<string> {
  const prediction = await replicateGenerate(params);

  // If sync mode returned a completed prediction
  if (prediction.status === "succeeded" && prediction.output) {
    const outputUrl = typeof prediction.output === "string"
      ? prediction.output
      : (prediction.output as any)?.url || String(prediction.output);
    return outputUrl;
  }

  // Otherwise poll
  return replicatePollUntilDone(prediction.id);
}
