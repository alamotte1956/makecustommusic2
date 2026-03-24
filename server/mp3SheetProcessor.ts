/**
 * Background processor for MP3-to-sheet-music jobs.
 * Runs transcription + LLM generation asynchronously so the HTTP request
 * returns immediately with a jobId that the frontend can poll.
 */

import { invokeLLM } from "./_core/llm";
import { updateMp3SheetJob } from "./db";
import { deductCredits } from "./credits";
import { sanitiseAbc, validateAbc } from "./backgroundSheetMusic";

export async function processMp3SheetJob(
  jobId: number,
  userId: number,
  audioUrl: string,
  fileName: string
): Promise<void> {
  try {
    // Step 1: Transcribe audio
    console.log(`[Mp3SheetJob ${jobId}] Starting transcription...`);
    await updateMp3SheetJob(jobId, { status: "transcribing" });

    const { transcribeAudio } = await import("./_core/voiceTranscription");
    const transcription = await transcribeAudio({
      audioUrl,
      prompt: "Transcribe the song lyrics. Include all sung words.",
    });

    const hasLyrics = !("error" in transcription) && transcription.text && transcription.text.trim().length > 10;
    const lyricsText = hasLyrics && !("error" in transcription) ? transcription.text : null;
    const audioDuration = !("error" in transcription) ? transcription.duration : null;

    // Save lyrics immediately
    if (lyricsText) {
      await updateMp3SheetJob(jobId, { lyrics: lyricsText });
    }

    // Step 2: Generate ABC notation via LLM
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

    const response = await invokeLLM({
      model: "claude-sonnet-4-20250514",
      messages: analysisMessages,
    });

    const rawContent = response.choices?.[0]?.message?.content;
    const abcRaw = typeof rawContent === "string" ? rawContent.trim() : null;
    if (!abcRaw) {
      throw new Error("AI returned empty content.");
    }

    // Sanitise and validate
    const cleanAbc = sanitiseAbc(abcRaw);
    const validationError = validateAbc(cleanAbc);
    if (validationError) {
      throw new Error(`Generated sheet music failed validation: ${validationError}`);
    }

    // Deduct credit
    await deductCredits(userId, 1, "generation", `Sheet music from MP3: ${fileName}`);

    // Mark done
    await updateMp3SheetJob(jobId, {
      status: "done",
      abcNotation: cleanAbc,
    });

    console.log(`[Mp3SheetJob ${jobId}] Completed successfully.`);
  } catch (err: any) {
    console.error(`[Mp3SheetJob ${jobId}] Failed:`, err?.message || err);
    await updateMp3SheetJob(jobId, {
      status: "error",
      errorMessage: err?.message || "Unknown error occurred. Please try again.",
    }).catch(() => {}); // Don't let the update failure mask the original error
  }
}
