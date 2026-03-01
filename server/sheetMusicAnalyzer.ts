import { invokeLLM } from "./_core/llm";

export interface SheetMusicAnalysis {
  title: string;
  key: string;
  timeSignature: string;
  tempo: number;
  genre: string;
  mood: string;
  instruments: string[];
  sections: {
    name: string;
    measures: string;
    notes: string;
    lyrics: string;
  }[];
  chordProgression: string[];
  description: string;
  styleTags: string;
}

const ANALYSIS_SCHEMA = {
  type: "json_schema" as const,
  json_schema: {
    name: "sheet_music_analysis",
    strict: true,
    schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        key: { type: "string" },
        timeSignature: { type: "string" },
        tempo: { type: "number" },
        genre: { type: "string" },
        mood: { type: "string" },
        instruments: { type: "array", items: { type: "string" } },
        sections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              measures: { type: "string" },
              notes: { type: "string" },
              lyrics: { type: "string" },
            },
            required: ["name", "measures", "notes", "lyrics"],
            additionalProperties: false,
          },
        },
        chordProgression: { type: "array", items: { type: "string" } },
        description: { type: "string" },
        styleTags: { type: "string" },
      },
      required: [
        "title", "key", "timeSignature", "tempo", "genre", "mood",
        "instruments", "sections", "chordProgression", "description", "styleTags",
      ],
      additionalProperties: false,
    },
  },
};

const SYSTEM_PROMPT = `You are an expert musicologist and sheet music reader. Analyze the provided sheet music and extract detailed musical information. Return a JSON object with:
- title: Song title if visible, or a descriptive title
- key: Musical key (e.g., C Major, A Minor)
- timeSignature: Time signature (e.g., 4/4, 3/4)
- tempo: BPM estimate
- genre: Best matching genre
- mood: Overall mood/feel
- instruments: List of instruments visible or implied
- sections: Array of {name, measures, notes, lyrics} for each section
- chordProgression: Chord symbols in order
- description: Detailed text description suitable for AI music generation
- styleTags: Comma-separated style tags for generation

Be thorough and accurate. If you cannot read certain elements clearly, make educated guesses based on context.`;

/**
 * Analyze a sheet music file (PNG, JPG, or PDF) using LLM vision/file capabilities.
 * PDFs are sent as file_url content type; images as image_url.
 */
export async function analyzeSheetMusicImage(
  fileUrl: string,
  mimeType?: string,
): Promise<SheetMusicAnalysis> {
  // Determine if this is a PDF based on the URL extension or provided MIME type
  const isPdf =
    mimeType === "application/pdf" ||
    fileUrl.toLowerCase().endsWith(".pdf") ||
    fileUrl.toLowerCase().includes("/pdf");

  // Build the appropriate content block for the LLM
  const mediaContent = isPdf
    ? {
        type: "file_url" as const,
        file_url: {
          url: fileUrl,
          mime_type: "application/pdf" as const,
        },
      }
    : {
        type: "image_url" as const,
        image_url: { url: fileUrl, detail: "high" as const },
      };

  console.log(`[SheetMusicAnalyzer] Analyzing ${isPdf ? "PDF" : "image"} file: ${fileUrl.substring(0, 80)}...`);

  const response = await invokeLLM({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "text" as const,
            text: `Please analyze this sheet music ${isPdf ? "PDF document" : "image"} and extract all musical information. Read every page carefully.`,
          },
          mediaContent,
        ],
      },
    ],
    response_format: ANALYSIS_SCHEMA,
  });

  const raw = response.choices?.[0]?.message?.content;
  const content =
    typeof raw === "string"
      ? raw
      : Array.isArray(raw)
        ? (raw.find((c: any) => c.type === "text") as any)?.text
        : null;

  if (!content) {
    const responseStr = JSON.stringify(response).substring(0, 500);
    console.error("[SheetMusicAnalyzer] No content in LLM response:", responseStr);

    // Check for specific LLM errors
    if (responseStr.includes("no pages") || responseStr.includes("INVALID_ARGUMENT")) {
      throw new Error(
        "The PDF file could not be read — it may be empty, corrupted, or password-protected. " +
        "Please try uploading a different PDF or convert your sheet music to a PNG/JPG image."
      );
    }
    if (responseStr.includes("too large") || responseStr.includes("size")) {
      throw new Error(
        "The file is too large for analysis. Please try a smaller file or upload individual pages as images."
      );
    }
    throw new Error("Failed to analyze sheet music — the AI could not process this file. Please try a different format (PNG, JPG, or MusicXML).");
  }

  const analysis = JSON.parse(content) as SheetMusicAnalysis;

  // Validate the analysis has meaningful data
  if (
    analysis.key === "Unknown" &&
    analysis.tempo === 0 &&
    analysis.genre === "Undefined"
  ) {
    console.warn("[SheetMusicAnalyzer] Analysis returned placeholder data — the file may not contain readable sheet music");
    throw new Error(
      "Could not extract meaningful musical information from this file. " +
      "Please ensure the file contains clear, readable sheet music notation. " +
      "For best results, use high-resolution images (PNG/JPG) or well-formatted PDF files."
    );
  }

  console.log(`[SheetMusicAnalyzer] Analysis complete: "${analysis.title}" in ${analysis.key}, ${analysis.tempo} BPM`);
  return analysis;
}

/**
 * Analyze MusicXML content (text-based) using LLM.
 */
export async function analyzeMusicXML(xmlContent: string): Promise<SheetMusicAnalysis> {
  console.log(`[SheetMusicAnalyzer] Analyzing MusicXML content (${xmlContent.length} chars)`);

  const response = await invokeLLM({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Please analyze this MusicXML content:\n\n${xmlContent.slice(0, 8000)}` },
    ],
    response_format: ANALYSIS_SCHEMA,
  });

  const raw = response.choices?.[0]?.message?.content;
  const content =
    typeof raw === "string"
      ? raw
      : Array.isArray(raw)
        ? (raw.find((c: any) => c.type === "text") as any)?.text
        : null;

  if (!content) {
    console.error("[SheetMusicAnalyzer] No content in MusicXML LLM response");
    throw new Error("Failed to analyze MusicXML — no response from AI");
  }

  return JSON.parse(content) as SheetMusicAnalysis;
}
