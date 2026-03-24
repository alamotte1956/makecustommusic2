/**
 * Background processor for MP3-to-sheet-music jobs.
 * Runs transcription + LLM generation asynchronously so the HTTP request
 * returns immediately with a jobId that the frontend can poll.
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

import { invokeLLM } from "./_core/llm";
import { updateMp3SheetJob } from "./db";
import { deductCredits } from "./credits";
import { sanitiseAbc, validateAbc } from "./backgroundSheetMusic";

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
    if (lowerMsg.includes("400") || lowerMsg.includes("bad request")) {
      return {
        code: "generation_failed",
        message: "The AI could not process this audio file. The format may not be supported. Please try converting to MP3 and uploading again.",
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

export async function processMp3SheetJob(
  jobId: number,
  userId: number,
  audioUrl: string,
  fileName: string
): Promise<void> {
  try {
    // ── Step 1: Transcribe audio ──────────────────────────────────────
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
        // Transcription returned a structured error — log but continue
        // (we can still attempt generation without lyrics)
        console.warn(`[Mp3SheetJob ${jobId}] Transcription warning: ${transcription.code} — ${transcription.error}`);

        // If the error is fatal (file too large, invalid format), stop here
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
      // Unexpected transcription error — classify and store
      const classified = classifyError(transcriptionErr, "transcription");
      console.error(`[Mp3SheetJob ${jobId}] Transcription error:`, transcriptionErr?.message);
      // Continue without lyrics if possible, but log the issue
      console.warn(`[Mp3SheetJob ${jobId}] Continuing without lyrics due to transcription failure.`);
    }

    // Save lyrics immediately if available
    if (lyricsText) {
      await updateMp3SheetJob(jobId, { lyrics: lyricsText });
    }

    // ── Step 2: Generate ABC notation via LLM ─────────────────────────
    console.log(`[Mp3SheetJob ${jobId}] Starting ABC generation...`);
    await updateMp3SheetJob(jobId, { status: "generating" });

    const analysisMessages: any[] = [
      {
        role: "system" as const,
        content: `You are an expert music transcriber and arranger. You will analyze an audio file and produce professional ABC notation for a lead sheet.

Your task:
1. Listen carefully to the audio and identify: key signature, time signature, tempo (BPM), melody, chord progressions, and song structure
2. Generate valid ABC notation that accurately represents the music

REQUIRED HEADERS (must all be present, each on its own line):
- X: reference number (always 1)
- T: title (use the filename or identify from audio)
- C: composer/artist if identifiable
- M: time signature (e.g., 4/4, 3/4, 6/8) — ALWAYS include, detect from audio
- L: default note length (e.g., 1/8)
- Q: tempo marking (e.g., 1/4=120) — ALWAYS include, detect BPM from audio
- K: key signature (e.g., C, Am, F#m) — ALWAYS include, detect from audio, must be the LAST header line

STRICT FORMAT RULES:
- Output ONLY valid ABC notation text, nothing else
- Do NOT wrap the output in markdown code fences or backticks
- Do NOT include any JSON, XML, or other structured data formats
- Do NOT include any explanatory text before or after the notation
- Do NOT use V: (voice) directives — write a single-voice lead sheet only
- Do NOT use %%staves or multi-staff directives

TRANSCRIPTION RULES:
- Output ONLY valid ABC notation, no explanations or commentary
- Write the melody line as accurately as possible from what you hear
- Include chord symbols above the staff using "quoted chords" e.g. "Am"A "F"F "C"C
- If lyrics are provided, align them under notes using w: lines

MUSICAL COMPLETENESS:
- Use proper bar lines | at every measure boundary
- Use repeat signs |: and :| for repeated sections (verses, choruses)
- Use comments to label sections: % Intro, % Verse 1, % Chorus, % Bridge, % Outro
- Use first/second endings [1 and [2 where appropriate
- Do NOT use [P:] section markers — use % comments instead
- Do NOT include standalone dynamics (!p!, !mp!, !mf!, !f!, !ff!) on their own lines
- Do NOT include !crescendo! or !diminuendo! decorations
- Use ties - between notes of the same pitch that span bar lines
- Use slurs () to group legato phrases
- Include rests: z (eighth rest), z2 (quarter rest), z4 (half rest), z8 (whole rest)
- Ensure every measure has the correct number of beats matching the time signature

QUALITY:
- The transcription should capture the essential musical content faithfully
- Keep the notation clean and professional — this will be rendered as printable sheet music
- The output must be parseable by the abcjs library
- Ensure the piece has a clear structure matching what you hear in the audio`,
      },
      {
        role: "user" as const,
        content: [
          {
            type: "file_url" as const,
            file_url: {
              url: audioUrl,
              mime_type: "audio/mpeg" as const,
            },
          },
          {
            type: "text" as const,
            text: `Please transcribe this audio into ABC notation for a lead sheet.\n\nFile: ${fileName}${lyricsText ? `\n\nDetected lyrics:\n${lyricsText}` : "\n\nNo lyrics detected — this appears to be instrumental."}${audioDuration ? `\nAudio duration: ${Math.round(audioDuration)} seconds` : ""}`,
          },
        ],
      },
    ];

    let abcRaw: string | null = null;
    try {
      const response = await invokeLLM({
        messages: analysisMessages,
      });

      const rawContent = response.choices?.[0]?.message?.content;
      abcRaw = typeof rawContent === "string" ? rawContent.trim() : null;
      if (!abcRaw) {
        throw new Error("AI returned empty content.");
      }
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

    // ── Step 3: Sanitise and validate ─────────────────────────────────
    let cleanAbc: string;
    try {
      cleanAbc = sanitiseAbc(abcRaw);
      const validationError = validateAbc(cleanAbc);
      if (validationError) {
        throw new Error(validationError);
      }
    } catch (valErr: any) {
      const classified = classifyError(valErr, "validation");
      console.error(`[Mp3SheetJob ${jobId}] Validation error [${classified.code}]:`, valErr?.message);
      await updateMp3SheetJob(jobId, {
        status: "error",
        errorCode: classified.code,
        errorMessage: classified.message,
      }).catch(() => {});
      return;
    }

    // ── Step 4: Deduct credit ─────────────────────────────────────────
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

    // ── Step 5: Mark done ─────────────────────────────────────────────
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
