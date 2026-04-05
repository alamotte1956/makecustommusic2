import { invokeLLM } from "./_core/llm";
import { extractLLMText } from "./llmHelpers";
import type { SheetMusicFeedbackAnalysis, SheetMusicIssueCategory } from "../shared/sheetMusicFeedback";
import { SHEET_MUSIC_ISSUE_CATEGORIES, CATEGORY_LABELS } from "../shared/sheetMusicFeedback";

const FEEDBACK_ANALYSIS_SCHEMA = {
  type: "json_schema" as const,
  json_schema: {
    name: "sheet_music_feedback_analysis",
    strict: true,
    schema: {
      type: "object",
      properties: {
        primaryCategory: {
          type: "string",
          enum: [...SHEET_MUSIC_ISSUE_CATEGORIES],
          description: "The single most important issue category",
        },
        categories: {
          type: "array",
          items: {
            type: "string",
            enum: [...SHEET_MUSIC_ISSUE_CATEGORIES],
          },
          description: "All detected issue categories, ordered by severity",
        },
        summary: {
          type: "string",
          description: "A concise 1-2 sentence summary of the issue for the admin",
        },
        confidence: {
          type: "number",
          description: "Confidence score from 0.0 to 1.0",
        },
        suggestedAction: {
          type: "string",
          description: "A specific actionable suggestion to fix the issue",
        },
      },
      required: ["primaryCategory", "categories", "summary", "confidence", "suggestedAction"],
      additionalProperties: false,
    },
  },
};

const SYSTEM_PROMPT = `You are an expert music notation analyst. Your job is to analyze user feedback about AI-generated sheet music and categorize the issues.

Available issue categories:
${SHEET_MUSIC_ISSUE_CATEGORIES.map((c) => `- ${c}: ${CATEGORY_LABELS[c]}`).join("\n")}

When analyzing feedback:
1. Read the user's comment carefully to understand their complaint
2. Examine the ABC notation (if provided) for structural problems
3. Cross-reference the song metadata (title, key, lyrics) with the notation
4. Identify the PRIMARY issue and any secondary issues
5. Provide a clear summary and actionable suggestion

Be specific in your summary. Instead of "the notes are wrong", say "the melody in measures 5-8 doesn't match the expected contour for this hymn style."
For suggestedAction, provide concrete steps like "Regenerate with explicit key signature K:G and tempo Q:1/4=80" rather than vague advice.`;

/**
 * Analyze user feedback on sheet music quality using AI.
 * Takes the user's comment, the ABC notation, and song metadata
 * to categorize the issue and suggest improvements.
 */
export async function analyzeSheetMusicFeedback(params: {
  comment: string;
  abcNotation?: string | null;
  songTitle?: string;
  songLyrics?: string | null;
  songKey?: string | null;
  songGenre?: string | null;
}): Promise<SheetMusicFeedbackAnalysis> {
  const { comment, abcNotation, songTitle, songLyrics, songKey, songGenre } = params;

  // Build context for the AI
  const contextParts: string[] = [];

  if (songTitle) contextParts.push(`Song title: "${songTitle}"`);
  if (songKey) contextParts.push(`Expected key: ${songKey}`);
  if (songGenre) contextParts.push(`Genre: ${songGenre}`);
  if (songLyrics) contextParts.push(`Lyrics (first 500 chars):\n${songLyrics.slice(0, 500)}`);
  if (abcNotation) contextParts.push(`ABC Notation:\n${abcNotation.slice(0, 2000)}`);

  const userMessage = `User feedback on sheet music quality:
"${comment}"

Song context:
${contextParts.join("\n")}

Please analyze this feedback and categorize the issue(s). If the user's comment is vague (e.g., "it's bad" or "doesn't sound right"), examine the ABC notation for common problems like wrong key, missing lyrics, or structural issues.`;

  console.log(`[FeedbackAnalyzer] Analyzing feedback for "${songTitle}": "${comment.slice(0, 100)}..."`);

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      response_format: FEEDBACK_ANALYSIS_SCHEMA,
    });

    const raw = response.choices?.[0]?.message?.content;
    const content = extractLLMText(raw);

    if (!content) {
      console.error("[FeedbackAnalyzer] No content in LLM response");
      return createFallbackAnalysis(comment);
    }

    const parsed = JSON.parse(content);

    // Validate categories are valid
    const validCategories = parsed.categories.filter(
      (c: string) => SHEET_MUSIC_ISSUE_CATEGORIES.includes(c as SheetMusicIssueCategory)
    ) as SheetMusicIssueCategory[];

    const primaryCategory = SHEET_MUSIC_ISSUE_CATEGORIES.includes(parsed.primaryCategory)
      ? parsed.primaryCategory as SheetMusicIssueCategory
      : validCategories[0] || "other";

    const analysis: SheetMusicFeedbackAnalysis = {
      primaryCategory,
      categories: validCategories.length > 0 ? validCategories : ["other"],
      summary: parsed.summary || "User reported an issue with the sheet music.",
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
      suggestedAction: parsed.suggestedAction || "Regenerate the sheet music with adjusted parameters.",
      analyzedAt: Date.now(),
    };

    console.log(
      `[FeedbackAnalyzer] Analysis complete: primary=${analysis.primaryCategory}, ` +
      `categories=[${analysis.categories.join(", ")}], confidence=${analysis.confidence}`
    );

    return analysis;
  } catch (err: any) {
    console.error("[FeedbackAnalyzer] Analysis failed:", err?.message || err);
    return createFallbackAnalysis(comment);
  }
}

/**
 * Create a fallback analysis when AI analysis fails.
 * Uses simple keyword matching to provide a basic categorization.
 */
function createFallbackAnalysis(comment: string): SheetMusicFeedbackAnalysis {
  const lower = comment.toLowerCase();
  let primaryCategory: SheetMusicIssueCategory = "other";

  // Simple keyword matching for fallback
  if (lower.includes("note") || lower.includes("melody") || lower.includes("pitch")) {
    primaryCategory = "wrong_notes";
  } else if (lower.includes("rhythm") || lower.includes("timing") || lower.includes("beat")) {
    primaryCategory = "wrong_rhythm";
  } else if (lower.includes("key") || lower.includes("sharp") || lower.includes("flat")) {
    primaryCategory = "wrong_key";
  } else if (lower.includes("lyric") || lower.includes("word") || lower.includes("text")) {
    primaryCategory = "missing_lyrics";
  } else if (lower.includes("format") || lower.includes("layout") || lower.includes("spacing") || lower.includes("read")) {
    primaryCategory = "bad_formatting";
  } else if (lower.includes("missing") || lower.includes("incomplete") || lower.includes("cut off")) {
    primaryCategory = "incomplete";
  } else if (lower.includes("chord")) {
    primaryCategory = "wrong_chords";
  } else if (lower.includes("tempo") || lower.includes("speed") || lower.includes("fast") || lower.includes("slow")) {
    primaryCategory = "tempo_issues";
  } else if (lower.includes("play") || lower.includes("sound") || lower.includes("audio")) {
    primaryCategory = "playback_issues";
  }

  return {
    primaryCategory,
    categories: [primaryCategory],
    summary: `User reported: "${comment.slice(0, 150)}"`,
    confidence: 0.3,
    suggestedAction: "Review the sheet music manually and regenerate if needed.",
    analyzedAt: Date.now(),
  };
}
