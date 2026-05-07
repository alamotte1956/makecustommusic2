/**
 * Audio-Aware Sheet Music Generator
 *
 * This generator sends the actual audio file to the LLM so it can HEAR the
 * melody, rhythm, chords, and structure — producing sheet music that matches
 * the original recording rather than guessing from lyrics alone.
 *
 * Two-pass approach:
 *   Pass 1: Analyze audio → extract key, tempo, time signature, chord progression,
 *           melody contour, and song structure
 *   Pass 2: Generate complete ABC notation from the analysis + lyrics
 *
 * Falls back to text-only generation if audio analysis fails.
 */

import { invokeLLM } from "./_core/llm";
import { extractLLMText } from "./llmHelpers";
import { sanitiseAbc, validateAbc } from "./backgroundSheetMusic";

// ─── Audio Analysis Types ──────────────────────────────────────────────────────

interface AudioAnalysis {
  key: string;
  tempo: number;
  timeSignature: string;
  chordProgression: string[];
  structure: SongSection[];
  melodyDescription: string;
  genre: string;
  mood: string;
}

interface SongSection {
  name: string;       // e.g., "Intro", "Verse 1", "Chorus"
  startTime: number;  // approximate seconds
  endTime: number;
  chords: string[];   // chords used in this section
  melodyHint: string; // description of melody contour
}

// ─── System Prompts ────────────────────────────────────────────────────────────

const AUDIO_ANALYSIS_PROMPT = `You are an expert music transcriber and analyst. Listen carefully to this audio recording and provide a detailed musical analysis.

You MUST respond with ONLY a valid JSON object (no markdown, no explanation). The JSON must have this exact structure:

{
  "key": "C",
  "tempo": 120,
  "timeSignature": "4/4",
  "chordProgression": ["C", "Am", "F", "G"],
  "structure": [
    {
      "name": "Intro",
      "startTime": 0,
      "endTime": 8,
      "chords": ["C", "G"],
      "melodyHint": "Instrumental, ascending arpeggio pattern"
    },
    {
      "name": "Verse 1",
      "startTime": 8,
      "endTime": 30,
      "chords": ["C", "Am", "F", "G"],
      "melodyHint": "Moderate range, stepwise motion, starts on 3rd scale degree"
    }
  ],
  "melodyDescription": "The melody is primarily stepwise with occasional leaps of a 4th. The verse sits in a comfortable mid-range while the chorus lifts to a higher register. The rhythm follows the natural speech pattern of the lyrics.",
  "genre": "Contemporary Worship",
  "mood": "Uplifting, reverent"
}

ANALYSIS GUIDELINES:
- Listen for the actual KEY the song is performed in (not just guess from genre)
- Count the actual TEMPO by listening to the beat
- Identify the TIME SIGNATURE (4/4, 3/4, 6/8, etc.)
- List the CHORD PROGRESSION as you hear it — use standard chord symbols (C, Am, F, G7, Dm/F, etc.)
- Map out the STRUCTURE with approximate timestamps
- Describe the MELODY contour for each section (ascending, descending, arched, repeated notes, leaps, etc.)
- Note the actual GENRE and MOOD you hear

Be as accurate as possible — this analysis will be used to generate sheet music.`;

const ABC_GENERATION_FROM_ANALYSIS_PROMPT = `You are a professional music transcriber and sheet music engraver. Generate accurate ABC notation that faithfully represents the audio recording based on the musical analysis provided.

═══ REQUIRED ABC HEADERS (each on its own line, in this order) ═══
X: 1
T: <song title>
M: <time signature from analysis>
L: 1/8
Q: 1/4=<tempo from analysis>
K: <key from analysis>

═══ CRITICAL RULES ═══
1. TRANSCRIBE what you hear — do NOT compose something new
2. The melody MUST match the audio — use the melody descriptions from the analysis
3. The chords MUST match the analysis — place them where they actually occur
4. The structure MUST match the analysis — include all sections in order
5. If lyrics are provided, align them precisely with the melody using w: lines

═══ MELODY TRANSCRIPTION RULES ═══
- Write the ACTUAL melody heard in the recording
- Match the rhythm to what you hear — use appropriate note durations
- Include rests where the singer breathes or pauses
- The melody range should match what you hear (don't transpose unless the key differs)
- Use ties and slurs where the singer holds notes across beats

═══ CHORD PLACEMENT ═══
- Place chord symbols in double quotes before the note: "C"E2 "Am"c2
- Change chords exactly where they change in the recording
- Use the exact chord voicings from the analysis (e.g., "Dm/F" not just "Dm")

═══ LYRICS ALIGNMENT ═══
- Every music line with vocals MUST be followed by a w: line
- Use hyphens for syllable splits: w: A-ma-zing grace how sweet
- Use asterisks to skip instrumental notes: w: * * Hold on
- Align w: bar pipes | with music bar lines
- Match syllables to notes 1:1 (one syllable per note, unless melisma)

═══ STRUCTURE ═══
- Use section comments: % Intro, % Verse 1, % Chorus, % Bridge, % Outro
- Include ALL sections from the analysis
- Use repeat signs |: and :| for repeated sections with same melody
- Generate the FULL song — do not truncate or abbreviate

═══ NOTATION RULES ═══
- Use proper bar lines | at every measure boundary
- NO dynamics (!p!, !mf!, !f!), NO decorations (!fermata!, !accent!)
- NO V: voice directives, NO %%staves
- K: must be the LAST header line before music begins
- NO blank line between K: and the first music line

═══ ABSOLUTE LENGTH REQUIREMENT ═══
- Generate the COMPLETE song — ALL sections from the analysis
- Minimum 32 measures for a song with lyrics (typically 40-60 measures)
- Do NOT stop after one verse and chorus
- Every section in the structure analysis MUST appear in the ABC output
- Different verses with different lyrics MUST be written out separately
- FAILURE MODE TO AVOID: Generating only 4-8 bars and stopping. This is WRONG.

═══ OUTPUT ═══
Output ONLY valid ABC notation. No markdown fences, no explanations, no JSON.`;

// ─── Main Functions ────────────────────────────────────────────────────────────

/**
 * Analyze audio using the LLM's audio understanding capabilities.
 * Sends the actual audio file to the model for analysis.
 */
export async function analyzeAudio(audioUrl: string): Promise<AudioAnalysis | null> {
  const MAX_ATTEMPTS = 2;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      console.log(`[AudioAnalysis] Attempt ${attempt}/${MAX_ATTEMPTS} — analyzing audio...`);

      const response = await invokeLLM({
        messages: [
          { role: "system", content: AUDIO_ANALYSIS_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "file_url",
                file_url: {
                  url: audioUrl,
                  mime_type: "audio/mpeg",
                },
              },
              {
                type: "text",
                text: "Please analyze this audio recording and provide the musical analysis as JSON.",
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
      });

      const rawContent = response.choices?.[0]?.message?.content;
      const text = extractLLMText(rawContent);
      if (!text) {
        console.warn(`[AudioAnalysis] Empty response on attempt ${attempt}`);
        continue;
      }

      // Parse JSON response
      const analysis = JSON.parse(text) as AudioAnalysis;

      // Validate essential fields
      if (!analysis.key || !analysis.tempo || !analysis.chordProgression?.length) {
        console.warn(`[AudioAnalysis] Incomplete analysis on attempt ${attempt}:`, {
          key: analysis.key,
          tempo: analysis.tempo,
          chords: analysis.chordProgression?.length,
        });
        if (attempt < MAX_ATTEMPTS) continue;
      }

      console.log(`[AudioAnalysis] Successfully analyzed audio:`, {
        key: analysis.key,
        tempo: analysis.tempo,
        timeSignature: analysis.timeSignature,
        sections: analysis.structure?.length || 0,
        chords: analysis.chordProgression?.slice(0, 8).join(", "),
      });

      return analysis;
    } catch (err: any) {
      console.error(`[AudioAnalysis] Attempt ${attempt} failed:`, err?.message || err);
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  console.warn("[AudioAnalysis] All attempts failed — will fall back to text-only generation");
  return null;
}

/**
 * Generate ABC notation from audio analysis + lyrics.
 * This is the second pass that produces the actual sheet music.
 */
export async function generateAbcFromAnalysis(
  title: string,
  analysis: AudioAnalysis,
  lyrics: string | null,
  audioUrl: string
): Promise<string> {
  const MAX_ATTEMPTS = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      console.log(`[AudioABC] Attempt ${attempt}/${MAX_ATTEMPTS} — generating ABC from analysis...`);

      // Build the user prompt with analysis details
      const userPrompt = buildAbcPromptFromAnalysis(title, analysis, lyrics);

      // Send audio + analysis to the LLM for ABC generation
      const response = await invokeLLM({
        messages: [
          { role: "system", content: ABC_GENERATION_FROM_ANALYSIS_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "file_url",
                file_url: {
                  url: audioUrl,
                  mime_type: "audio/mpeg",
                },
              },
              {
                type: "text",
                text: userPrompt,
              },
            ],
          },
        ],
        max_tokens: 16384,
      });

      const rawAbc = extractLLMText(response.choices?.[0]?.message?.content);
      if (!rawAbc) {
        throw new Error("LLM returned empty ABC content");
      }

      console.log(`[AudioABC] Raw ABC length: ${rawAbc.length}, first 300 chars: ${rawAbc.substring(0, 300)}`);

      // Sanitise and validate
      const cleanAbc = sanitiseAbc(rawAbc);
      const validationError = validateAbc(cleanAbc);
      if (validationError) {
        console.warn(`[AudioABC] Validation failed (attempt ${attempt}): ${validationError}`);
        throw new Error("Validation failed: " + validationError);
      }

      console.log(`[AudioABC] Successfully generated ${cleanAbc.length} chars of ABC notation`);
      return cleanAbc;
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[AudioABC] Attempt ${attempt} failed: ${lastError.message}`);
      if (attempt < MAX_ATTEMPTS) {
        const delay = 2000 * attempt;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError || new Error("ABC generation from audio analysis failed");
}

/**
 * Generate ABC notation directly from audio (single-pass approach).
 * Used when the two-pass approach fails or as a simpler alternative.
 */
export async function generateAbcDirectFromAudio(
  title: string,
  audioUrl: string,
  lyrics: string | null
): Promise<string> {
  const MAX_ATTEMPTS = 3;
  let lastError: Error | null = null;

  const systemPrompt = `You are a professional music transcriber. Listen to this audio recording and transcribe it into ABC notation.

CRITICAL: Transcribe the ACTUAL melody, chords, and rhythm you hear in the recording. Do NOT compose something new.

═══ REQUIRED ABC HEADERS ═══
X: 1
T: ${title}
M: <detected time signature>
L: 1/8
Q: 1/4=<detected tempo>
K: <detected key>

═══ RULES ═══
- Transcribe the melody as accurately as possible
- Include chord symbols where you hear chord changes: "C"E2 "Am"c2
- Use section comments: % Intro, % Verse 1, % Chorus, etc.
- Include ALL sections of the song — do not truncate
- If you can hear lyrics, add w: lines aligned with the melody
- Use proper bar lines | at every measure boundary
- NO dynamics, NO decorations, NO V: directives
- Output ONLY valid ABC notation — no markdown, no explanations

═══ ABSOLUTE LENGTH REQUIREMENT ═══
- Transcribe the ENTIRE song from start to finish
- Include ALL verses, choruses, bridges, intros, and outros
- Minimum 32 measures for a song with lyrics (typically 40-60 measures)
- Do NOT stop after the first verse and chorus
- FAILURE MODE TO AVOID: Transcribing only 4-8 bars and stopping. This is WRONG.
- A complete song transcription covers the full duration of the audio`;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      console.log(`[AudioDirect] Attempt ${attempt}/${MAX_ATTEMPTS} — direct transcription...`);

      const userContent: any[] = [
        {
          type: "file_url",
          file_url: {
            url: audioUrl,
            mime_type: "audio/mpeg",
          },
        },
        {
          type: "text",
          text: lyrics
            ? `Transcribe this audio recording into ABC notation. The lyrics are:\n\n${lyrics}\n\nAlign the melody notes with these lyrics using w: lines. You MUST transcribe the ENTIRE song — all verses, all choruses, all bridges. Do not stop early.`
            : `Transcribe this audio recording into ABC notation. Write out the full melody with chord symbols. Transcribe the ENTIRE piece from start to finish — do not stop early.`,
        },
      ];

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        max_tokens: 16384,
      });

      const rawAbc = extractLLMText(response.choices?.[0]?.message?.content);
      if (!rawAbc) {
        throw new Error("LLM returned empty content");
      }

      const cleanAbc = sanitiseAbc(rawAbc);
      const validationError = validateAbc(cleanAbc);
      if (validationError) {
        console.warn(`[AudioDirect] Validation failed (attempt ${attempt}): ${validationError}`);
        throw new Error("Validation failed: " + validationError);
      }

      console.log(`[AudioDirect] Successfully generated ${cleanAbc.length} chars of ABC`);
      return cleanAbc;
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[AudioDirect] Attempt ${attempt} failed: ${lastError.message}`);
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }
  }

  throw lastError || new Error("Direct audio transcription failed");
}

/**
 * Full pipeline: Analyze audio → Generate ABC notation.
 * This is the main entry point for audio-based sheet music generation.
 *
 * Strategy:
 * 1. Try two-pass (analyze + generate) — most accurate
 * 2. Fall back to single-pass direct transcription
 * 3. Fall back to text-only generation (from improvedSheetMusicGenerator)
 */
export async function generateSheetMusicFromAudio(
  title: string,
  audioUrl: string,
  lyrics: string | null,
  options?: {
    key?: string;
    genre?: string;
    tempo?: number;
    timeSignature?: string;
  }
): Promise<{ abc: string; analysis: AudioAnalysis | null }> {
  console.log(`[AudioSheetMusic] Starting full pipeline for "${title}"`);
  console.log(`[AudioSheetMusic] Audio URL: ${audioUrl}`);
  console.log(`[AudioSheetMusic] Has lyrics: ${!!lyrics} (${lyrics?.length || 0} chars)`);

  // Strategy 1: Two-pass approach (analyze → generate)
  try {
    const analysis = await analyzeAudio(audioUrl);
    if (analysis) {
      try {
        const abc = await generateAbcFromAnalysis(title, analysis, lyrics, audioUrl);
        console.log(`[AudioSheetMusic] Two-pass approach succeeded`);
        return { abc, analysis };
      } catch (genErr: any) {
        console.warn(`[AudioSheetMusic] ABC generation from analysis failed:`, genErr?.message);
        // Continue to fallback strategies
      }
    }
  } catch (analysisErr: any) {
    console.warn(`[AudioSheetMusic] Audio analysis failed:`, analysisErr?.message);
  }

  // Strategy 2: Single-pass direct transcription
  try {
    console.log(`[AudioSheetMusic] Trying direct audio transcription...`);
    const abc = await generateAbcDirectFromAudio(title, audioUrl, lyrics);
    console.log(`[AudioSheetMusic] Direct transcription succeeded`);
    return { abc, analysis: null };
  } catch (directErr: any) {
    console.warn(`[AudioSheetMusic] Direct transcription failed:`, directErr?.message);
  }

  // Strategy 3: Fall back to text-only generation (original approach)
  console.log(`[AudioSheetMusic] All audio-based approaches failed, falling back to text-only...`);
  const { generateSheetMusicImproved } = await import("./improvedSheetMusicGenerator");
  const abc = await generateSheetMusicImproved(
    title,
    options?.genre || "Christian Contemporary",
    options?.key || "C",
    "4/4",
    options?.tempo || 120,
    lyrics || ""
  );
  return { abc, analysis: null };
}

// ─── Helper Functions ──────────────────────────────────────────────────────────

function buildAbcPromptFromAnalysis(
  title: string,
  analysis: AudioAnalysis,
  lyrics: string | null
): string {
  const parts: string[] = [];

  parts.push(`Generate ABC notation for this song based on the following musical analysis:`);
  parts.push(``);
  parts.push(`═══ SONG INFO ═══`);
  parts.push(`Title: ${title}`);
  parts.push(`Key: ${analysis.key}`);
  parts.push(`Tempo: ${analysis.tempo} BPM`);
  parts.push(`Time Signature: ${analysis.timeSignature}`);
  parts.push(`Genre: ${analysis.genre}`);
  parts.push(`Mood: ${analysis.mood}`);
  parts.push(``);
  parts.push(`═══ CHORD PROGRESSION ═══`);
  parts.push(analysis.chordProgression.join(" → "));
  parts.push(``);

  if (analysis.structure && analysis.structure.length > 0) {
    parts.push(`═══ SONG STRUCTURE ═══`);
    for (const section of analysis.structure) {
      parts.push(`[${section.name}] (${section.startTime}s - ${section.endTime}s)`);
      parts.push(`  Chords: ${section.chords.join(" → ")}`);
      parts.push(`  Melody: ${section.melodyHint}`);
    }
    parts.push(``);
  }

  parts.push(`═══ MELODY DESCRIPTION ═══`);
  parts.push(analysis.melodyDescription);
  parts.push(``);

  if (lyrics) {
    parts.push(`═══ LYRICS ═══`);
    parts.push(lyrics);
    parts.push(``);
    parts.push(`IMPORTANT: Align the melody to these lyrics using w: lines after each music line.`);
    parts.push(`Each syllable needs its own note. Use hyphens for multi-syllable words.`);
  } else {
    parts.push(`This appears to be an instrumental piece or the lyrics could not be transcribed.`);
    parts.push(`Write out the full melody without w: lines.`);
  }

  parts.push(``);
  parts.push(`CRITICAL: Listen to the audio and transcribe the ACTUAL melody you hear.`);
  parts.push(`The analysis above is a guide — trust your ears over the analysis if they differ.`);
  parts.push(`Generate the COMPLETE song — all sections, full length. Do not truncate.`);
  parts.push(``);
  parts.push(`ABSOLUTE LENGTH REQUIREMENT:`);
  parts.push(`- You MUST generate at least 32 measures (typically 40-60 for a full song)`);
  parts.push(`- Every section in the structure above MUST appear in the ABC output`);
  parts.push(`- If there are 3 verses, write out ALL 3 verses with their different lyrics`);
  parts.push(`- FAILURE MODE: Generating only 4-8 bars is WRONG. Write the FULL song.`);

  return parts.join("\n");
}
