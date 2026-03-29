/**
 * Diagnostic script: Tests the full sheet music generation pipeline
 * with a real LLM call to identify where things break.
 * 
 * Run: node --loader tsx test-sheet-music-pipeline.mjs
 */

import { buildSongContext, generateAbcNotation, sanitiseAbc, validateAbc } from "./server/backgroundSheetMusic.ts";
import { invokeLLM } from "./server/_core/llm.ts";
import { extractLLMText } from "./server/llmHelpers.ts";

const testSong = {
  title: "Amazing Grace",
  genre: "Gospel",
  mood: "Uplifting",
  keySignature: "G",
  timeSignature: "3/4",
  tempo: 80,
  lyrics: `Amazing grace, how sweet the sound
That saved a wretch like me
I once was lost, but now am found
Was blind but now I see

'Twas grace that taught my heart to fear
And grace my fears relieved
How precious did that grace appear
The hour I first believed`,
};

async function runDiagnostic() {
  console.log("=== SHEET MUSIC PIPELINE DIAGNOSTIC ===\n");

  // Step 1: Build song context
  console.log("--- Step 1: Build Song Context ---");
  const context = buildSongContext(testSong);
  console.log("Context length:", context.length);
  console.log("Context:\n", context);
  console.log();

  // Step 2: Call LLM directly to see raw response
  console.log("--- Step 2: Raw LLM Call ---");
  const SYSTEM_PROMPT = [
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

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: "Generate a professional lead sheet in ABC notation for this song:\n\n" + context,
        },
      ],
    });

    console.log("Response choices:", response.choices?.length);
    const rawContent = response.choices?.[0]?.message?.content;
    console.log("Content type:", typeof rawContent);
    console.log("Content is array:", Array.isArray(rawContent));
    
    if (Array.isArray(rawContent)) {
      console.log("Content array length:", rawContent.length);
      rawContent.forEach((item, i) => {
        console.log(`  [${i}] type=${item.type}, text length=${item.text?.length || 0}`);
        if (item.type === "thinking") {
          console.log(`  [${i}] thinking text (first 200 chars):`, item.text?.substring(0, 200));
        }
      });
    }

    // Step 3: Extract text using our helper
    console.log("\n--- Step 3: Extract LLM Text ---");
    const rawAbc = extractLLMText(rawContent);
    console.log("Extracted text length:", rawAbc?.length || 0);
    console.log("Extracted text (first 500 chars):\n", rawAbc?.substring(0, 500));
    console.log("Extracted text (last 200 chars):\n", rawAbc?.substring(rawAbc.length - 200));
    console.log();

    if (!rawAbc) {
      console.error("FAILURE: extractLLMText returned null/empty!");
      return;
    }

    // Step 4: Sanitise
    console.log("--- Step 4: Sanitise ABC ---");
    const cleanAbc = sanitiseAbc(rawAbc);
    console.log("Sanitised length:", cleanAbc.length);
    console.log("Sanitised (first 500 chars):\n", cleanAbc.substring(0, 500));
    console.log("Sanitised (last 200 chars):\n", cleanAbc.substring(cleanAbc.length - 200));
    console.log("Line count:", cleanAbc.split("\n").length);
    console.log();

    // Step 5: Validate
    console.log("--- Step 5: Validate ABC ---");
    const validationError = validateAbc(cleanAbc);
    if (validationError) {
      console.error("VALIDATION FAILED:", validationError);
    } else {
      console.log("VALIDATION PASSED");
    }
    console.log();

    // Step 6: Full pipeline test
    console.log("--- Step 6: Full generateAbcNotation ---");
    const fullResult = await generateAbcNotation(testSong);
    console.log("Full pipeline result length:", fullResult.length);
    console.log("Full pipeline line count:", fullResult.split("\n").length);
    console.log("Full pipeline result:\n", fullResult);

  } catch (err) {
    console.error("ERROR:", err);
  }
}

runDiagnostic().catch(console.error);
