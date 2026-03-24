/**
 * Background processor for MP3-to-sheet-music jobs.
 * Runs transcription + LLM generation asynchronously so the HTTP request
 * returns immediately with a jobId that the frontend can poll.
 *
 * Architecture:
 *   Step 1: Whisper transcribes audio → lyrics text
 *   Step 2: Text-only LLM generates ABC notation from lyrics + metadata
 *           (We do NOT send audio to the LLM — the Forge API proxy does not
 *            reliably support file_url audio content. Instead we use the same
 *            proven text-only approach as backgroundSheetMusic.ts.)
 *
 * Error codes stored in mp3_sheet_jobs.errorCode:
 *   - transcription_failed    Whisper could not process the audio
 *   - transcription_timeout   Whisper took too long to respond
 *   - audio_download_failed   Could not fetch the uploaded audio from S3
 *   - audio_too_long          Audio exceeds the supported duration
 *   - generation_failed       LLM returned an error or empty content
 *   - generation_timeout      LLM took too long to respond
 *   - validation_failed       Generated ABC notation failed validation
 *   - credit_error            Could not deduct credits
 *   - unknown                 Unexpected / unclassified error
 */

import { generateAbcNotation } from "./backgroundSheetMusic";
import { updateMp3SheetJob } from "./db";
import { deductCredits } from "./credits";

/** Maximum audio duration we support (10 minutes) */
const MAX_AUDIO_DURATION_SEC = 600;

/** Classify an error into a structured error code */
function classifyError(err: any, phase: "transcription" | "generation" | "validation" | "credit"): {
  code: string;
  message: string;
} {
  const msg = err?.message || String(err) || "";
  const lowerMsg = msg.toLowerCase();

  // Timeout patterns
  if (lowerMsg.includes("timeout") || lowerMsg.includes("timed out") || lowerMsg.includes("deadline exceeded")) {
    return {
      code: phase === "transcription" ? "transcription_timeout" : "generation_timeout",
      message: phase === "transcription"
        ? "Audio transcription timed out. The file may be too long or the service is temporarily busy. Please try a shorter clip or try again later."
        : "Sheet music generation timed out. The AI service is temporarily busy. Please try again in a few minutes.",
    };
  }

  // Network / download failures
  if (lowerMsg.includes("fetch") || lowerMsg.includes("network") || lowerMsg.includes("econnrefused") || lowerMsg.includes("dns")) {
    return {
      code: "audio_download_failed",
      message: "Could not access the uploaded audio file. Please try uploading again.",
    };
  }

  // Rate limiting
  if (lowerMsg.includes("rate limit") || lowerMsg.includes("429") || lowerMsg.includes("too many requests")) {
    return {
      code: phase === "transcription" ? "transcription_failed" : "generation_failed",
      message: "The service is experiencing high demand. Please wait a minute and try again.",
    };
  }

  // LLM-specific errors
  if (phase === "generation") {
    if (lowerMsg.includes("500") || lowerMsg.includes("bad response") || lowerMsg.includes("upstream")) {
      return {
        code: "generation_failed",
        message: "The AI service encountered an internal error. Please try again in a few moments.",
      };
    }
    if (lowerMsg.includes("400") || lowerMsg.includes("bad request")) {
      return {
        code: "generation_failed",
        message: "The AI could not process this request. Please try again or try a different audio file.",
      };
    }
    if (lowerMsg.includes("empty content") || lowerMsg.includes("empty response")) {
      return {
        code: "generation_failed",
        message: "The AI was unable to generate sheet music from this audio. The audio may be too quiet, too noisy, or not contain recognizable musical content.",
      };
    }
  }

  // Validation errors
  if (phase === "validation") {
    return {
      code: "validation_failed",
      message: `The AI-generated notation had formatting issues: ${msg}. Please try again — results may vary between attempts.`,
    };
  }

  // Credit errors
  if (phase === "credit") {
    return {
      code: "credit_error",
      message: "Could not process credits for this generation. Please check your account balance and try again.",
    };
  }

  // Transcription-specific
  if (phase === "transcription") {
    if (lowerMsg.includes("file_too_large") || lowerMsg.includes("file too large")) {
      return {
        code: "transcription_failed",
        message: "The audio file is too large for transcription. Please use a file under 16MB.",
      };
    }
    if (lowerMsg.includes("invalid_format") || lowerMsg.includes("unsupported")) {
      return {
        code: "transcription_failed",
        message: "The audio format is not supported. Please upload an MP3, WAV, FLAC, OGG, or M4A file.",
      };
    }
    return {
      code: "transcription_failed",
      message: `Audio transcription failed: ${msg || "Unknown error"}. Please try a different audio file or try again later.`,
    };
  }

  // Fallback
  return {
    code: "unknown",
    message: msg || "An unexpected error occurred. Please try again.",
  };
}

/**
 * Derive a clean song title from the uploaded filename.
 */
function deriveTitleFromFilename(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, "")          // remove extension
    .replace(/[-_]+/g, " ")           // dashes/underscores → spaces
    .replace(/\s+/g, " ")             // collapse whitespace
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase()) // title case
    || "Untitled";
}

export async function processMp3SheetJob(
  jobId: number,
  userId: number,
  audioUrl: string,
  fileName: string
): Promise<void> {
  try {
    // ── Step 1: Transcribe audio with Whisper ────────────────────────
    console.log(`[Mp3SheetJob ${jobId}] Starting transcription...`);
    await updateMp3SheetJob(jobId, { status: "transcribing" });

    let lyricsText: string | null = null;
    let audioDuration: number | null = null;

    try {
      const { transcribeAudio } = await import("./_core/voiceTranscription");
      const transcription = await transcribeAudio({
        audioUrl,
        prompt: "Transcribe the song lyrics. Include all sung words.",
      });

      if ("error" in transcription) {
        console.warn(`[Mp3SheetJob ${jobId}] Transcription warning: ${transcription.code} — ${transcription.error}`);

        // Fatal transcription errors
        if (transcription.code === "FILE_TOO_LARGE") {
          throw Object.assign(new Error(transcription.error), { _phase: "transcription" as const });
        }
        if (transcription.code === "INVALID_FORMAT") {
          throw Object.assign(new Error(transcription.error), { _phase: "transcription" as const });
        }
        // For other transcription errors, continue without lyrics
      } else {
        const hasLyrics = transcription.text && transcription.text.trim().length > 10;
        lyricsText = hasLyrics ? transcription.text : null;
        audioDuration = transcription.duration ?? null;

        // Check audio duration limit
        if (audioDuration && audioDuration > MAX_AUDIO_DURATION_SEC) {
          await updateMp3SheetJob(jobId, {
            status: "error",
            errorCode: "audio_too_long",
            errorMessage: `Audio is ${Math.round(audioDuration / 60)} minutes long. Maximum supported duration is ${MAX_AUDIO_DURATION_SEC / 60} minutes. Please trim the audio and try again.`,
          });
          return;
        }
      }
    } catch (transcriptionErr: any) {
      if (transcriptionErr._phase === "transcription") throw transcriptionErr;
      const classified = classifyError(transcriptionErr, "transcription");
      console.error(`[Mp3SheetJob ${jobId}] Transcription error:`, transcriptionErr?.message);
      // Continue without lyrics — we can still attempt generation
      console.warn(`[Mp3SheetJob ${jobId}] Continuing without lyrics due to transcription failure.`);
    }

    // Save lyrics immediately if available
    if (lyricsText) {
      await updateMp3SheetJob(jobId, { lyrics: lyricsText });
    }

    // ── Step 2: Generate ABC notation via text-only LLM ──────────────
    // We use the same proven generateAbcNotation() from backgroundSheetMusic.ts
    // which sends text (title + lyrics + metadata) to Claude — no audio file.
    console.log(`[Mp3SheetJob ${jobId}] Starting ABC generation (text-only LLM)...`);
    await updateMp3SheetJob(jobId, { status: "generating" });

    const title = deriveTitleFromFilename(fileName);

    let cleanAbc: string;
    try {
      cleanAbc = await generateAbcNotation({
        title,
        lyrics: lyricsText,
        // We don't have genre/mood/key from audio, but the LLM will infer from lyrics
      });
    } catch (genErr: any) {
      const classified = classifyError(genErr, "generation");
      console.error(`[Mp3SheetJob ${jobId}] Generation error [${classified.code}]:`, genErr?.message);
      await updateMp3SheetJob(jobId, {
        status: "error",
        errorCode: classified.code,
        errorMessage: classified.message,
      }).catch(() => {});
      return;
    }

    // ── Step 3: Deduct credit ────────────────────────────────────────
    try {
      await deductCredits(userId, 1, "generation", `Sheet music from MP3: ${fileName}`);
    } catch (creditErr: any) {
      const classified = classifyError(creditErr, "credit");
      console.error(`[Mp3SheetJob ${jobId}] Credit error [${classified.code}]:`, creditErr?.message);
      await updateMp3SheetJob(jobId, {
        status: "error",
        errorCode: classified.code,
        errorMessage: classified.message,
      }).catch(() => {});
      return;
    }

    // ── Step 4: Mark done ────────────────────────────────────────────
    await updateMp3SheetJob(jobId, {
      status: "done",
      abcNotation: cleanAbc,
    });

    console.log(`[Mp3SheetJob ${jobId}] Completed successfully.`);
  } catch (err: any) {
    // Top-level catch for truly unexpected errors
    const phase = err._phase || "transcription";
    const classified = classifyError(err, phase);
    console.error(`[Mp3SheetJob ${jobId}] Unhandled error [${classified.code}]:`, err?.message || err);
    await updateMp3SheetJob(jobId, {
      status: "error",
      errorCode: classified.code,
      errorMessage: classified.message,
    }).catch(() => {});
  }
}
