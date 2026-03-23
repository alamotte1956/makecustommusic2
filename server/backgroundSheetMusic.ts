/**
 * Background sheet music generation.
 *
 * Call `generateSheetMusicInBackground(songId)` fire-and-forget after a song is
 * created.  The function fetches the song, calls the LLM to produce ABC
 * notation, and persists the result.  Errors are logged but never propagated so
 * they cannot break the main request flow.
 */

import { invokeLLM } from "./_core/llm";
import { getSongById, updateSongSheetMusic } from "./db";

const SHEET_MUSIC_SYSTEM_PROMPT = `You are a professional music arranger and sheet music engraver. Generate valid ABC notation for a lead sheet based on the song information provided.

REQUIRED HEADERS (must all be present):
- X: reference number (always 1)
- T: title of the song
- C: composer/artist if known
- M: time signature (e.g., 4/4, 3/4, 6/8) — ALWAYS include this
- L: default note length (e.g., 1/8)
- Q: tempo marking (e.g., 1/4=120) — ALWAYS include this
- K: key signature (e.g., C, Am, F#m) — ALWAYS include this

NOTATION RULES:
- Output ONLY valid ABC notation, no explanations
- Write a singable melody line that matches the lyrics and genre
- Align lyrics under notes using w: lines
- If a specific key is provided, you MUST use that exact key for K: and write all melody and chords in that key
- If no key is specified, choose an appropriate key for the genre
- For songs without lyrics, write an instrumental melody

MUSICAL COMPLETENESS:
- Include chord symbols above the staff using "quoted chords" e.g. "Am"A "F"F "C"C
- Use proper bar lines | at every measure boundary
- Use repeat signs |: and :| for repeated sections
- Use section markers [P:Intro], [P:Verse], [P:Chorus], [P:Bridge], [P:Outro] to label song structure
- Use first/second endings [1 and [2 where appropriate
- Include dynamics: !p!, !mp!, !mf!, !f!, !ff!, !crescendo(!, !crescendo)!, !diminuendo(!, !diminuendo)!
- Include articulations where musically appropriate: .A (staccato), ~A (trill), HA (fermata)
- Use ties - between notes of the same pitch that span bar lines
- Use slurs () to group legato phrases
- Include rests: z (eighth rest), z2 (quarter rest), z4 (half rest), z8 (whole rest)
- Ensure every measure has the correct number of beats matching the time signature

QUALITY:
- The melody must be musically coherent and match the mood/genre
- Keep the notation clean and professional — this will be rendered as printable sheet music
- The output must be parseable by the abcjs library
- Ensure the piece has a clear beginning, development, and ending`;

/**
 * Build the song context string used as the LLM user prompt.
 */
export function buildSongContext(song: {
  title: string;
  genre?: string | null;
  mood?: string | null;
  keySignature?: string | null;
  timeSignature?: string | null;
  tempo?: number | null;
  lyrics?: string | null;
}): string {
  return [
    `Title: ${song.title}`,
    song.genre ? `Genre: ${song.genre}` : null,
    song.mood ? `Mood: ${song.mood}` : null,
    song.keySignature ? `Key: ${song.keySignature}` : null,
    song.timeSignature ? `Time Signature: ${song.timeSignature}` : null,
    song.tempo ? `Tempo: ${song.tempo} BPM` : null,
    song.lyrics ? `Lyrics:\n${song.lyrics}` : null,
  ].filter(Boolean).join("\n");
}

/**
 * Call the LLM to generate ABC notation for a song and return the cleaned
 * result.  Throws on failure.
 */
export async function generateAbcNotation(song: Parameters<typeof buildSongContext>[0]): Promise<string> {
  const songContext = buildSongContext(song);

  const response = await invokeLLM({
    model: "claude-sonnet-4-20250514",
    messages: [
      { role: "system", content: SHEET_MUSIC_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Generate a professional lead sheet in ABC notation for this song:\n\n${songContext}`,
      },
    ],
  });

  const rawContent = response.choices?.[0]?.message?.content;
  const abcNotation = typeof rawContent === "string" ? rawContent.trim() : null;
  if (!abcNotation) {
    throw new Error("LLM returned empty content for sheet music generation");
  }

  // Strip markdown code fences if present
  return abcNotation.replace(/^```[a-z]*\n?/gm, "").replace(/```$/gm, "").trim();
}

/**
 * Fire-and-forget background sheet music generation.
 *
 * Safe to call without awaiting — errors are caught and logged.
 */
export function generateSheetMusicInBackground(songId: number): void {
  // Wrap in an async IIFE so the caller doesn't need to await
  (async () => {
    try {
      const song = await getSongById(songId);
      if (!song) {
        console.log(`[BackgroundSheetMusic] Song ${songId} not found, skipping`);
        return;
      }

      // Skip if sheet music already exists
      if (song.sheetMusicAbc) {
        console.log(`[BackgroundSheetMusic] Song ${songId} already has sheet music, skipping`);
        return;
      }

      console.log(`[BackgroundSheetMusic] Starting generation for song ${songId}: "${song.title}"`);

      const cleanAbc = await generateAbcNotation(song);
      await updateSongSheetMusic(songId, cleanAbc);

      console.log(`[BackgroundSheetMusic] Successfully generated sheet music for song ${songId}`);
    } catch (err) {
      // Log but never propagate — this is fire-and-forget
      console.error(`[BackgroundSheetMusic] Failed for song ${songId}:`, err);
    }
  })();
}
