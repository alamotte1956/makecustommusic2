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
 * Analyze a sheet music image (PNG, JPG, PDF page) using LLM vision.
 */
export async function analyzeSheetMusicImage(imageUrl: string): Promise<SheetMusicAnalysis> {
  const response = await invokeLLM({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text" as const, text: "Please analyze this sheet music and extract all musical information." },
          { type: "image_url" as const, image_url: { url: imageUrl, detail: "high" as const } },
        ],
      },
    ],
    response_format: ANALYSIS_SCHEMA,
  });

  const raw = response.choices?.[0]?.message?.content;
  const content = typeof raw === "string" ? raw : Array.isArray(raw) ? (raw.find((c: any) => c.type === "text") as any)?.text : null;
  if (!content) throw new Error("Failed to analyze sheet music — no response from AI");
  return JSON.parse(content) as SheetMusicAnalysis;
}

/**
 * Analyze MusicXML content (text-based) using LLM.
 */
export async function analyzeMusicXML(xmlContent: string): Promise<SheetMusicAnalysis> {
  const response = await invokeLLM({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Please analyze this MusicXML content:\n\n${xmlContent.slice(0, 8000)}` },
    ],
    response_format: ANALYSIS_SCHEMA,
  });

  const raw = response.choices?.[0]?.message?.content;
  const content = typeof raw === "string" ? raw : Array.isArray(raw) ? (raw.find((c: any) => c.type === "text") as any)?.text : null;
  if (!content) throw new Error("Failed to analyze MusicXML — no response from AI");
  return JSON.parse(content) as SheetMusicAnalysis;
}
