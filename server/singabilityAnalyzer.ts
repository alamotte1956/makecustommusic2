import { invokeLLM } from "./_core/llm";

import { extractLLMText } from "./llmHelpers";

export interface SingabilityScore {
  overall: number; // 0-100
  melodicFlow: number; // 0-100 — how naturally the syllables flow
  rhymeScheme: number; // 0-100 — consistency and quality of rhymes
  syllableBalance: number; // 0-100 — even syllable counts across lines
  emotionalArc: number; // 0-100 — build/release/resolution structure
  worshipReadiness: number; // 0-100 — congregational singability
  hookStrength: number; // 0-100 — memorability of chorus/hook
  summary: string; // 2-3 sentence summary
  strengths: string[]; // top 3 strengths
  improvements: string[]; // top 3 suggestions
  rhymeMap: { section: string; scheme: string }[]; // e.g., [{section: "Verse 1", scheme: "ABAB"}]
}

export async function analyzeSingability(
  lyrics: string,
  genre?: string | null,
  mood?: string | null,
  vocalType?: string | null,
): Promise<SingabilityScore> {
  const genreContext = genre ? `Genre: ${genre}.` : "";
  const moodContext = mood ? `Mood: ${mood}.` : "";
  const vocalContext = vocalType ? `Vocal type: ${vocalType}.` : "";

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a professional worship music analyst and vocal coach specializing in Christian music singability assessment. You evaluate lyrics for how well they can be sung by congregations, worship teams, and solo artists.

Analyze the given lyrics and return a JSON object with these exact fields:
- overall: number 0-100 (weighted average of all scores)
- melodicFlow: number 0-100 (how naturally syllables flow when sung — open vowels, consonant clusters, breath points)
- rhymeScheme: number 0-100 (consistency, quality, and variety of rhymes — perfect, slant, internal)
- syllableBalance: number 0-100 (even syllable counts across corresponding lines in verses/choruses)
- emotionalArc: number 0-100 (does the song build, release, and resolve emotionally?)
- worshipReadiness: number 0-100 (can a congregation sing this together? Simple enough for group singing?)
- hookStrength: number 0-100 (is the chorus/hook memorable and repeatable?)
- summary: string (2-3 sentences summarizing the overall singability)
- strengths: string[] (exactly 3 specific strengths)
- improvements: string[] (exactly 3 specific, actionable improvement suggestions)
- rhymeMap: array of {section: string, scheme: string} (e.g., [{section: "Verse 1", scheme: "ABAB"}, {section: "Chorus", scheme: "AABB"}])

Score guidelines:
- 90-100: Exceptional — radio-ready, congregation-tested quality
- 75-89: Strong — minor polish needed
- 60-74: Good foundation — needs work in specific areas
- 40-59: Developing — significant improvements needed
- Below 40: Needs major revision

Be honest but constructive. Christian worship music should be evaluated for both artistic quality AND congregational accessibility.`,
      },
      {
        role: "user",
        content: `Analyze the singability of these lyrics:\n\n${genreContext} ${moodContext} ${vocalContext}\n\n${lyrics}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "singability_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            overall: { type: "number", description: "Overall singability score 0-100" },
            melodicFlow: { type: "number", description: "Melodic flow score 0-100" },
            rhymeScheme: { type: "number", description: "Rhyme scheme score 0-100" },
            syllableBalance: { type: "number", description: "Syllable balance score 0-100" },
            emotionalArc: { type: "number", description: "Emotional arc score 0-100" },
            worshipReadiness: { type: "number", description: "Worship readiness score 0-100" },
            hookStrength: { type: "number", description: "Hook strength score 0-100" },
            summary: { type: "string", description: "2-3 sentence summary" },
            strengths: {
              type: "array",
              items: { type: "string" },
              description: "Exactly 3 strengths",
            },
            improvements: {
              type: "array",
              items: { type: "string" },
              description: "Exactly 3 improvement suggestions",
            },
            rhymeMap: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  section: { type: "string" },
                  scheme: { type: "string" },
                },
                required: ["section", "scheme"],
                additionalProperties: false,
              },
              description: "Rhyme scheme per section",
            },
          },
          required: [
            "overall", "melodicFlow", "rhymeScheme", "syllableBalance",
            "emotionalArc", "worshipReadiness", "hookStrength",
            "summary", "strengths", "improvements", "rhymeMap",
          ],
          additionalProperties: false,
        },
      },
    },
  });

  const rawContent = response.choices?.[0]?.message?.content;
  const content = extractLLMText(rawContent);
  if (!content) {
    throw new Error("Failed to get singability analysis from LLM");
  }

  const parsed = JSON.parse(content) as SingabilityScore;

  // Clamp all scores to 0-100
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
  parsed.overall = clamp(parsed.overall);
  parsed.melodicFlow = clamp(parsed.melodicFlow);
  parsed.rhymeScheme = clamp(parsed.rhymeScheme);
  parsed.syllableBalance = clamp(parsed.syllableBalance);
  parsed.emotionalArc = clamp(parsed.emotionalArc);
  parsed.worshipReadiness = clamp(parsed.worshipReadiness);
  parsed.hookStrength = clamp(parsed.hookStrength);

  // Ensure arrays have exactly 3 items
  parsed.strengths = parsed.strengths.slice(0, 3);
  parsed.improvements = parsed.improvements.slice(0, 3);

  return parsed;
}
