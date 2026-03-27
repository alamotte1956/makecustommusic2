/**
 * Background sheet music generation.
 *
 * Call generateSheetMusicInBackground(songId) fire-and-forget after a song is
 * created. The function fetches the song, calls the LLM to produce ABC
 * notation, sanitises the output, and persists the result. Errors are logged
 * but never propagated so they cannot break the main request flow.
 */

import { invokeLLM } from "./_core/llm";
import { getSongById, updateSongSheetMusic } from "./db";
import { extractLLMText } from "./llmHelpers";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SHEET_MUSIC_SYSTEM_PROMPT = [
  "You are a professional music arranger and sheet music engraver.",
  "Generate valid ABC notation for a lead sheet based on the song information provided.",
  "",
  "REQUIRED HEADERS (must all be present, each on its own line):",
  "- X: reference number (always 1)",
  "- T: title of the song",
  "- C: composer/artist if known",
  "- M: time signature (e.g., 4/4, 3/4, 6/8)",
  "- L: default note length (e.g., 1/8)",
  "- Q: tempo marking (e.g., 1/4=120)",
  "- K: key signature (e.g., C, Am, F#m) — must be the LAST header line",
  "",
  "STRICT FORMAT RULES:",
  "- Output ONLY valid ABC notation text, nothing else",
  "- Do NOT wrap the output in markdown code fences or backticks",
  "- Do NOT include any JSON, XML, or other structured data formats",
  "- Do NOT include any explanatory text before or after the notation",
  "- Do NOT use V: (voice) directives — write a single-voice lead sheet only",
  "- Do NOT use %%staves or multi-staff directives",
  "- The K: header MUST be the last header line before the music body begins",
  "",
  "NOTATION RULES:",
  "- Write a singable melody line that matches the lyrics and genre",
  "- Align lyrics under notes using w: lines",
  "- If a specific key is provided, you MUST use that exact key",
  "- If no key is specified, choose an appropriate key for the genre",
  "- For songs without lyrics, write an instrumental melody",
  "",
  "MUSICAL COMPLETENESS:",
  '- Include chord symbols above the staff using "quoted chords" e.g. "Am"A "F"F "C"C',
  "- Use proper bar lines | at every measure boundary",
  "- Use repeat signs |: and :| for repeated sections",
  "- Use comments to label sections: % Intro, % Verse 1, % Chorus, % Bridge, % Outro",
  "- Do NOT use [P:] section markers — use % comments instead",
  "- Do NOT include standalone dynamics (!p!, !mp!, !mf!, !f!, !ff!) on their own lines",
  "- Do NOT include !crescendo! or !diminuendo! decorations",
  "- Include rests: z (eighth rest), z2 (quarter rest), z4 (half rest), z8 (whole rest)",
  "- Ensure every measure has the correct number of beats matching the time signature",
  "",
  "QUALITY:",
  "- The melody must be musically coherent and match the mood/genre",
  "- Keep the notation clean and professional",
  "- The output must be parseable by the abcjs JavaScript library",
  "- Ensure the piece has a clear beginning, development, and ending",
].join("\n");

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
  const parts: string[] = [];
  parts.push("Title: " + song.title);
  if (song.genre) parts.push("Genre: " + song.genre);
  if (song.mood) parts.push("Mood: " + song.mood);
  if (song.keySignature) parts.push("Key: " + song.keySignature);
  if (song.timeSignature) parts.push("Time Signature: " + song.timeSignature);
  if (song.tempo) parts.push("Tempo: " + song.tempo + " BPM");
  if (song.lyrics) parts.push("Lyrics:\n" + song.lyrics);
  return parts.join("\n");
}

/**
 * Sanitise raw ABC notation returned by the LLM.
 *
 * - Strips markdown code fences
 * - Removes V: (voice) directives that cause multi-staff rendering issues
 * - Removes %%staves directives
 * - Removes standalone dynamics lines
 * - Converts [P:] markers to comments
 * - Removes any non-ABC preamble/postamble text
 */
export function sanitiseAbc(raw: string): string {
  // 1. Strip markdown code fences
  let abc = raw.replace(/^```[a-z]*\n?/gm, "").replace(/```\s*$/gm, "").trim();

  // 2. Try to extract just the ABC block if there is surrounding text
  const xMatch = abc.match(/^(X:\s*\d+)/m);
  if (xMatch && xMatch.index !== undefined && xMatch.index > 0) {
    abc = abc.substring(xMatch.index);
  }

  // 3. Filter and transform lines
  const filtered = abc.split("\n").filter((line) => {
    const trimmed = line.trim();
    // Remove V: voice directives
    if (trimmed.startsWith("V:")) return false;
    // Remove %%staves directives
    if (trimmed.startsWith("%%staves")) return false;
    // Remove standalone dynamics on their own line
    if (/^![pmf]{1,3}!$/.test(trimmed)) return false;
    return true;
  }).map((line) => {
    const trimmed = line.trim();
    // Convert [P:...] section markers to comment lines for abcjs compatibility
    if (/^\[P:.*\]$/.test(trimmed)) {
      return "% " + trimmed;
    }
    return line;
  });

  // 4. Remove trailing non-ABC content
  let lastMusicLine = filtered.length - 1;
  for (let i = filtered.length - 1; i >= 0; i--) {
    const t = filtered[i].trim();
    if (!t || t.startsWith("%")) continue;
    // Check if this line looks like ABC content
    const isHeader = /^[A-Z]:/.test(t);
    const isMusic = /[A-Ga-gz|:\[\]^_=,']/.test(t);
    const isLyrics = t.startsWith("w:") || t.startsWith("W:");
    if (isHeader || isMusic || isLyrics) {
      lastMusicLine = i;
      break;
    }
  }

  abc = filtered.slice(0, lastMusicLine + 1).join("\n").trim();

  // 5. Ensure essential headers exist — inject defaults if missing
  if (!/^M:/m.test(abc)) {
    abc = abc.replace(/^(K:)/m, "M:4/4\n$1");
  }
  if (!/^L:/m.test(abc)) {
    abc = abc.replace(/^(K:)/m, "L:1/8\n$1");
  }
  if (!/^Q:/m.test(abc)) {
    abc = abc.replace(/^(K:)/m, "Q:1/4=120\n$1");
  }

  return abc;
}

/**
 * Validate that the ABC notation has the minimum required structure.
 * Returns null if valid, or an error message string if invalid.
 */
export function validateAbc(abc: string): string | null {
  if (!abc || abc.trim().length === 0) {
    return "Empty ABC notation";
  }

  const lines = abc.split("\n");
  const headerLines = lines.filter((l) => /^[A-Z]:/.test(l.trim()));

  // Must have at least X:, T:, and K: headers
  const hasX = headerLines.some((l) => l.trim().startsWith("X:"));
  const hasT = headerLines.some((l) => l.trim().startsWith("T:"));
  const hasK = headerLines.some((l) => l.trim().startsWith("K:"));

  if (!hasX) return "Missing X: (reference number) header";
  if (!hasT) return "Missing T: (title) header";
  if (!hasK) return "Missing K: (key) header";

  // Must have at least some music content (notes or rests) after the headers
  const musicLines = lines.filter((l) => {
    const t = l.trim();
    if (!t || t.startsWith("%")) return false;
    if (/^[A-Z]:/.test(t)) return false;
    if (t.startsWith("w:") || t.startsWith("W:")) return false;
    // Must contain at least one note letter or rest
    return /[A-Ga-gz]/.test(t);
  });

  if (musicLines.length === 0) {
    return "No music content found after headers";
  }

  return null;
}

/**
 * Generate ABC notation for a song using the LLM.
 * Includes retry logic for transient failures.
 */
export async function generateAbcNotation(
  song: Parameters<typeof buildSongContext>[0]
): Promise<string> {
  const songContext = buildSongContext(song);
  const MAX_ATTEMPTS = 2;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: SHEET_MUSIC_SYSTEM_PROMPT },
          {
            role: "user",
            content:
              "Generate a professional lead sheet in ABC notation for this song:\n\n" +
              songContext,
          },
        ],
      });

      const rawContent = response.choices?.[0]?.message?.content;
      const rawAbc = extractLLMText(rawContent);
      if (!rawAbc) {
        throw new Error("LLM returned empty content for sheet music generation");
      }

      // Sanitise and validate
      const cleanAbc = sanitiseAbc(rawAbc);
      const validationError = validateAbc(cleanAbc);
      if (validationError) {
        console.error(
          `[SheetMusic] Validation failed (attempt ${attempt}/${MAX_ATTEMPTS}): ${validationError}\nRaw output (first 500 chars):\n${rawAbc.substring(0, 500)}`
        );
        throw new Error("Sheet music validation failed: " + validationError);
      }

      return cleanAbc;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(
        `[SheetMusic] Attempt ${attempt}/${MAX_ATTEMPTS} failed: ${lastError.message}`
      );
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  throw lastError || new Error("Sheet music generation failed after all retries");
}

/**
 * Fire-and-forget background sheet music generation for a newly created song.
 * Includes retry logic at the top level — if the first generation attempt fails,
 * it will retry once after a delay.
 */
export function generateSheetMusicInBackground(songId: number): void {
  // Small delay to ensure the song record is fully committed
  setTimeout(async () => {
    const MAX_BG_ATTEMPTS = 2;

    for (let attempt = 1; attempt <= MAX_BG_ATTEMPTS; attempt++) {
      try {
        const song = await getSongById(songId);
        if (!song) {
          console.log(
            `[BackgroundSheetMusic] Song ${songId} not found, skipping`
          );
          return;
        }

        // Skip if sheet music already exists
        if (song.sheetMusicAbc) {
          console.log(
            `[BackgroundSheetMusic] Song ${songId} already has sheet music, skipping`
          );
          return;
        }

        console.log(
          `[BackgroundSheetMusic] Starting generation for song ${songId} "${song.title}" (attempt ${attempt}/${MAX_BG_ATTEMPTS})`
        );

        const abc = await generateAbcNotation(song);
        await updateSongSheetMusic(songId, abc);

        console.log(
          `[BackgroundSheetMusic] Successfully generated sheet music for song ${songId}`
        );
        return; // Success — exit the retry loop
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(
          `[BackgroundSheetMusic] Attempt ${attempt}/${MAX_BG_ATTEMPTS} failed for song ${songId}: ${msg}`
        );

        if (attempt < MAX_BG_ATTEMPTS) {
          // Wait 5 seconds before retrying the entire background job
          await new Promise((r) => setTimeout(r, 5000));
        }
      }
    }

    console.error(
      `[BackgroundSheetMusic] All attempts exhausted for song ${songId}. Sheet music will not be generated.`
    );
  }, 3000);
}
