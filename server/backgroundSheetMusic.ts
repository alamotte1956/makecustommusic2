/**
 * Background sheet music generation.
 *
 * Call generateSheetMusicInBackground(songId) fire-and-forget after a song is
 * created. The function fetches the song, calls the LLM to produce ABC
 * notation, sanitises the output, and persists the result. Errors are logged
 * but never propagated so they cannot break the main request flow.
 */

import { invokeLLM } from "./_core/llm";
import { getSongById, updateSongSheetMusic, updateSongSheetMusicStatus } from "./db";
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
  "- Do NOT include ANY dynamics decorations: !p!, !mp!, !mf!, !f!, !ff!, !pp!, !ppp!, !fff! — not inline, not standalone",
  "- Do NOT include ANY crescendo/diminuendo decorations: !crescendo(!, !crescendo)!, !diminuendo(!, !diminuendo)!, !<(!, !<)!, !>(!, !>)!",
  "- Do NOT include ANY other decorations like !accent!, !fermata!, !tenuto!, !staccato!, !trill!, !turn!, !mordent!, !segno!, !coda!, !D.S.!, !D.C.!, !fine!",
  "- Include rests: z (eighth rest), z2 (quarter rest), z4 (half rest), z8 (whole rest)",
  "- Ensure every measure has the correct number of beats matching the time signature",
  "",
  "MINIMUM LENGTH:",
  "- ALWAYS generate at least 16 measures of music, even if the lyrics are very short",
  "- If the lyrics are short (1-2 lines), repeat them across multiple sections with melodic variation",
  "- Include an intro (2-4 measures), at least 2 verse sections, a chorus, and an outro",
  "- For instrumental songs, generate at least 32 measures with clear sections",
  "",
  "QUALITY:",
  "- The melody must be musically coherent and match the mood/genre",
  "- Keep the notation clean and professional — NO decorations, NO dynamics marks",
  "- The output must be parseable by the abcjs JavaScript library without errors",
  "- Ensure the piece has a clear beginning, development, and ending",
  "- Use only basic ABC notation: notes, rests, bar lines, repeat signs, chord symbols, and lyrics",
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
    // Remove standalone dynamics on their own line (e.g. !p!, !mf!, !ff!)
    if (/^![a-z]+!$/.test(trimmed)) return false;
    // Remove standalone crescendo/diminuendo markers
    if (/^!(crescendo|diminuendo|<|>)[(!)]+$/.test(trimmed)) return false;
    return true;
  }).map((line) => {
    const trimmed = line.trim();
    // Convert [P:...] section markers to comment lines for abcjs compatibility
    if (/^\[P:.*\]$/.test(trimmed)) {
      return "% " + trimmed;
    }
    // Strip inline dynamics decorations that abcjs doesn't handle well
    // e.g. !p! !mp! !mf! !f! !ff! !pp! !ppp! !fff!
    let cleaned = line.replace(/![pmf]{1,4}!/g, "");
    // Strip crescendo/diminuendo decorations
    // e.g. !crescendo(! !crescendo)! !diminuendo(! !diminuendo)! !<(! !<)! !>(! !>)!
    cleaned = cleaned.replace(/!(crescendo|diminuendo|<|>)[(!)]+/g, "");
    // Strip other common unsupported decorations
    cleaned = cleaned.replace(/!(accent|fermata|tenuto|staccato|trill|turn|mordent|pralltriller|emphasis|segno|coda|D\.S\.|D\.C\.|fine)!/g, "");
    return cleaned;
  });

  // 4. Remove trailing non-ABC content (prose/explanatory text after the music)
  // Strategy: find the last line that looks like actual ABC music notation.
  // Natural language sentences contain spaces between words and typically have
  // many lowercase letters — ABC music lines are denser with note letters,
  // bar lines, and special characters.
  let lastMusicLine = filtered.length - 1;
  for (let i = filtered.length - 1; i >= 0; i--) {
    const t = filtered[i].trim();
    if (!t || t.startsWith("%")) continue;
    // Check if this line looks like ABC content
    const isHeader = /^[A-Z]:/.test(t);
    const isLyrics = t.startsWith("w:") || t.startsWith("W:");
    // ABC music lines are dense with notes, bars, and special chars.
    // Prose sentences have many spaces and lowercase words.
    // A line is "music" if it has bar lines or a high density of note-like chars
    // relative to spaces, and doesn't look like a natural language sentence.
    const hasBarLines = t.includes("|");
    const wordCount = t.split(/\s+/).length;
    // Prose detection: 4+ words without bar lines, OR short text that looks like
    // natural language (starts with uppercase, has lowercase letters, ends with punctuation)
    const looksLikeProse = (!hasBarLines && !/^[A-Z]:/.test(t)) && (
      wordCount >= 4 ||
      // Short phrases like "Enjoy!" or "Good luck." — contain punctuation typical of prose
      /[.!?;]$/.test(t) ||
      // Single words that are clearly English, not ABC note sequences
      (wordCount <= 2 && /^[A-Z][a-z]{2,}/.test(t))
    );
    const isMusic = !looksLikeProse && /[A-Ga-gz|:\[\]^_=,']/.test(t);
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

    // Mark as generating
    await updateSongSheetMusicStatus(songId, "generating").catch(() => {});

    for (let attempt = 1; attempt <= MAX_BG_ATTEMPTS; attempt++) {
      try {
        const song = await getSongById(songId);
        if (!song) {
          console.log(
            `[BackgroundSheetMusic] Song ${songId} not found, skipping`
          );
          await updateSongSheetMusicStatus(songId, "failed", "Song not found").catch(() => {});
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
        // updateSongSheetMusic already sets status to "done"

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

    // All attempts exhausted — mark as failed
    console.error(
      `[BackgroundSheetMusic] All attempts exhausted for song ${songId}. Sheet music will not be generated.`
    );
    await updateSongSheetMusicStatus(songId, "failed", "Generation failed after all retry attempts. Please try generating manually.").catch(() => {});
  }, 3000);
}
