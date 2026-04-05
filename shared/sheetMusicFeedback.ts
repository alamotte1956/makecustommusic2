/**
 * Categories for AI-analyzed sheet music quality issues.
 * Each category represents a common problem area in generated sheet music.
 */
export const SHEET_MUSIC_ISSUE_CATEGORIES = [
  "wrong_notes",        // Notes don't match the melody or harmony
  "wrong_rhythm",       // Rhythm/timing is incorrect
  "wrong_key",          // Key signature doesn't match the song
  "missing_lyrics",     // Lyrics are missing or misaligned
  "bad_formatting",     // Layout, spacing, or readability issues
  "incomplete",         // Sheet music is cut off or missing sections
  "wrong_chords",       // Chord symbols are incorrect
  "tempo_issues",       // Tempo marking is wrong
  "playback_issues",    // Audio playback doesn't sound right
  "other",              // Doesn't fit other categories
] as const;

export type SheetMusicIssueCategory = typeof SHEET_MUSIC_ISSUE_CATEGORIES[number];

export interface SheetMusicFeedbackAnalysis {
  /** Primary issue category identified by AI */
  primaryCategory: SheetMusicIssueCategory;
  /** All issue categories detected (may include multiple) */
  categories: SheetMusicIssueCategory[];
  /** AI-generated summary of the issue */
  summary: string;
  /** Confidence score from 0 to 1 */
  confidence: number;
  /** Suggested action for improvement */
  suggestedAction: string;
  /** Timestamp of analysis */
  analyzedAt: number;
}

/** Human-readable labels for each category */
export const CATEGORY_LABELS: Record<SheetMusicIssueCategory, string> = {
  wrong_notes: "Wrong Notes",
  wrong_rhythm: "Wrong Rhythm",
  wrong_key: "Wrong Key",
  missing_lyrics: "Missing/Misaligned Lyrics",
  bad_formatting: "Bad Formatting",
  incomplete: "Incomplete",
  wrong_chords: "Wrong Chords",
  tempo_issues: "Tempo Issues",
  playback_issues: "Playback Issues",
  other: "Other",
};

/** Icons/emoji for each category (for admin display) */
export const CATEGORY_ICONS: Record<SheetMusicIssueCategory, string> = {
  wrong_notes: "🎵",
  wrong_rhythm: "🥁",
  wrong_key: "🔑",
  missing_lyrics: "📝",
  bad_formatting: "📐",
  incomplete: "✂️",
  wrong_chords: "🎸",
  tempo_issues: "⏱️",
  playback_issues: "🔊",
  other: "❓",
};
