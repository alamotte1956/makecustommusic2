/**
 * Background sheet music generation.
 *
 * Call `generateSheetMusicInBackground(songId)` fire-and-forget after a song is
 * created.  The function fetches the song, calls the LLM to produce ABC
 * notation, sanitises the output, and persists the result.  Errors are logged
 * but never propagated so they cannot break the main request flow.
 */

import { invokeLLM } from "./_core/llm";
import { getSongById, updateSongSheetMusic } from "./db";

const SHEET_MUSIC_SYSTEM_PROMPT = `You are a professional music arranger and sheet music engraver. Generate valid ABC notation for a lead sheet based on the song information provided.

REQUIRED HEADERS (must all be present, each on its own line):
- X: reference number (always 1)
- T: title of the song
- C: composer/artist if known
- M: time signature (e.g., 4/4, 3/4, 6/8) — ALWAYS include this
- L: default note length (e.g., 1/8)
- Q: tempo marking (e.g., 1/4=120) — ALWAYS include this
- K: key signature (e.g., C, Am, F#m) — ALWAYS include this, must be the LAST header line

STRICT FORMAT RULES:
- Output ONLY valid ABC notation text, nothing else
- Do NOT wrap the output in markdown code fences or backticks
- Do NOT include any JSON, XML, or other structured data formats
- Do NOT include any explanatory text before or after the notation
- Do NOT use V: (voice) directives — write a single-voice lead sheet only
- Do NOT use %%staves or multi-staff directives
- The K: header MUST be the last header line before the music body begins

NOTATION RULES:
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
- Include rests: z (eighth rest), z2 (quarter rest), z4 (half rest), z8 (whole rest)
- Ensure every measure has the correct number of beats matching the time signature

QUALITY:
- The melody must be musically coherent and match the mood/genre
- Keep the notation clean and professional — this will be rendered as printable sheet music
- The output must be parseable by the abcjs JavaScript library
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
 * Sanitise raw ABC notation returned by the LLM.
 *
 * - Strips markdown code fences
 * - Removes V: (voice) directives that cause multi-staff rendering issues
 * - Removes %%staves directives
 * - Removes any non-ABC preamble/postamble text
 * - Validates that essential headers are present
 */
export function sanitiseAbc(raw: string): string {
  // 1. Strip markdown code fences
  let abc = raw.replace(/^```[a-z]*\n?/gm, "").replace(/```\s*$/gm, "").trim();

  // 2. Try to extract just the ABC block if there's surrounding text
  //    Look for the X: header as the start of ABC notation
  const xMatch = abc.match(/^(X:\s*\d+)/m);
  if (xMatch && xMatch.index !== undefined && xMatch.index > 0) {
    abc = abc.substring(xMatch.index);
  }

  // 3. Remove V: (voice) directives — these cause multi-staff rendering issues in abcjs
  //    Also strip standalone dynamics lines and convert [P:] markers to comments
  abc = abc.split("\n").filter((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("V:") || trimmed.startsWith("%%staves")) return false;
    // Strip standalone dynamics on their own line (e.g. !mp!, !mf!, !p!, !f!, !ff!, !pp!)
    if (/^![pmf]{1,3}!$/.test(trimmed)) return false;
    return true;
  }).map((line) => {
    const trimmed = line.trim();
    // Convert [P:...] section markers to comment lines for abcjs compatibility
    if (/^\[P:.*\]$/.test(trimmed)) return `% ${trimmed}`;
    return line;
  }).join("\n");

  // 4. Remove any trailing non-ABC content (e.g. explanatory text after the notation)
  //    ABC notation ends at the last line containing notes, barlines, or w: lyrics
  const lines = abc.split("\n");
  let lastMusicLine = lines.length - 1;
  for (let i = lines.length - 1; i >= 0; i--) {
    const t = lines[i].trim();
    if (!t || t.startsWith("%")) continue;
    // Check if this line looks like ABC (header, music, lyrics, or empty)
    if (/^[A-Z]:/.test(t) || /[A-Ga-gz|:\[\]"!()^_=,']/.test(t) || t.startsWith("w:") || t.startsWith("W:")) {
      lastMusicLine = i;
      break;
    }
  }
  abc = lines.slice(0, lastMusicLine + 1).join("\n").trim();

  return abc;
}

/**
 * Validate that the ABC notation has the minimum required headers.
 * Returns an error message if invalid, or null if valid.
 */
export function validateAbc(abc: string): string | null {
  if (!abc || abc.length < 20) {
    return "ABC notation is too short or empty";
  }
  if (!/^X:\s*\d/m.test(abc)) return "Missing X: (reference number) header";
  if (!/^T:/m.test(abc)) return "Missing T: (title) header";
  if (!/^K:/m.test(abc)) return "Missing K: (key) header";

  // Check that there's at least some music content (notes)
  const musicLines = abc.split("\n").filter((l) => {
    const t = l.trim();
    return t && !t.startsWith("%") && !/^[A-Z]:/.test(t) && !t.startsWith("w:") && !t.startsWith("W:");
  });
  if (musicLines.length === 0) return "No music content found in ABC notation";

  return null;
}

/**
 * Call the LLM to generate ABC notation for a song and return the cleaned
 * and validated result.  Throws on failure.
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
  const rawAbc = typeof rawContent === "string" ? rawContent.trim() : null;
  if (!rawAbc) {
    throw new Error("LLM returned empty content for sheet music generation");
  }

  // Sanitise and validate
  const cleanAbc = sanitiseAbc(rawAbc);
  const validationError = validateAbc(cleanAbc);
  if (validationError) {
    console.error(`[SheetMusic] Validation failed: ${validationError}\nRaw output (first 500 chars):\n${rawAbc.substring(0, 500)}`);
    throw new Error(`Sheet music validation failed: ${validationError}`);
  }

  return cleanAbc;
}

/**
 * Fire-and-forget background sheet music generation.
 *
 * Safe to call without awaiting — errors are caught and logged.
 * Includes a small delay to let the song record fully commit to the database.
 */
export function generateSheetMusicInBackground(songId: number): void {
  // Small delay to ensure the song record is fully committed
  setTimeout(async () => {
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

      console.log(`[BackgroundSheetMusic] Successfully generated sheet music for song ${songId} (${cleanAbc.length} chars)`);
    } catch (err: any) {
      // Log but never propagate — this is fire-and-forget
      console.error(`[BackgroundSheetMusic] Failed for song ${songId}:`, err?.message || err);
    }
  }, 2000); // 2-second delay to let DB commit
}
