/**
 * Utilities for parsing and editing ABC notation
 * Allows extracting editable sections (lyrics, chords) and updating them
 */

export interface AbcEditableSection {
  type: "lyric" | "chord" | "title" | "composer";
  lineNumber: number;
  originalLine: string;
  prefix: string; // e.g., "w:", "C:", "T:"
  content: string; // The editable content
}

export interface AbcEditState {
  sections: AbcEditableSection[];
  headers: string[]; // Non-editable header lines
  musicLines: string[]; // Music notation lines
}

/**
 * Parse ABC notation to extract editable sections
 */
export function parseAbcForEditing(abc: string): AbcEditState {
  const lines = abc.split("\n");
  const sections: AbcEditableSection[] = [];
  const headers: string[] = [];
  const musicLines: string[] = [];
  let lineNumber = 0;

  for (const line of lines) {
    if (line.startsWith("w:") || line.startsWith("W:")) {
      // Lyric line
      const prefix = line.substring(0, 2);
      const content = line.substring(2).trim();
      sections.push({
        type: "lyric",
        lineNumber,
        originalLine: line,
        prefix,
        content,
      });
    } else if (line.match(/^"[^"]+"/)) {
      // Chord line (e.g., "C" or "Am")
      sections.push({
        type: "chord",
        lineNumber,
        originalLine: line,
        prefix: "",
        content: line,
      });
    } else if (line.startsWith("T:")) {
      // Title
      const content = line.substring(2).trim();
      sections.push({
        type: "title",
        lineNumber,
        originalLine: line,
        prefix: "T:",
        content,
      });
    } else if (line.startsWith("C:")) {
      // Composer
      const content = line.substring(2).trim();
      sections.push({
        type: "composer",
        lineNumber,
        originalLine: line,
        prefix: "C:",
        content,
      });
    } else if (line.match(/^[A-Z]:/)) {
      // Other header line (not editable)
      headers.push(line);
    } else if (line.trim()) {
      // Music notation line
      musicLines.push(line);
    }

    lineNumber++;
  }

  return { sections, headers, musicLines };
}

/**
 * Reconstruct ABC notation from edited sections
 */
export function reconstructAbcFromEdits(
  original: string,
  editedSections: AbcEditableSection[]
): string {
  const lines = original.split("\n");
  const editMap = new Map(editedSections.map((s) => [s.lineNumber, s]));

  const reconstructed = lines.map((line, idx) => {
    const edited = editMap.get(idx);
    if (!edited) return line;

    if (edited.type === "lyric") {
      return `${edited.prefix} ${edited.content}`;
    } else if (edited.type === "title") {
      return `T: ${edited.content}`;
    } else if (edited.type === "composer") {
      return `C: ${edited.content}`;
    } else if (edited.type === "chord") {
      return edited.content;
    }

    return line;
  });

  return reconstructed.join("\n");
}

/**
 * Extract just the lyric lines for easier editing
 */
export function extractLyrics(abc: string): string[] {
  const lines = abc.split("\n");
  return lines
    .filter((line) => line.startsWith("w:") || line.startsWith("W:"))
    .map((line) => line.substring(2).trim());
}

/**
 * Update lyrics in ABC notation
 */
export function updateLyricsInAbc(abc: string, newLyrics: string[]): string {
  const lines = abc.split("\n");
  let lyricIndex = 0;

  const updated = lines.map((line) => {
    if (line.startsWith("w:") || line.startsWith("W:")) {
      const prefix = line.substring(0, 2);
      if (lyricIndex < newLyrics.length) {
        return `${prefix} ${newLyrics[lyricIndex++]}`;
      }
    }
    return line;
  });

  return updated.join("\n");
}

/**
 * Extract chord symbols from ABC notation
 */
export function extractChords(abc: string): string[] {
  const lines = abc.split("\n");
  const chords: string[] = [];

  for (const line of lines) {
    const chordMatches = line.match(/"[^"]+"/g);
    if (chordMatches) {
      chords.push(...chordMatches.map((c) => c.slice(1, -1)));
    }
  }

  return chords;
}

/**
 * Check if ABC notation has editable content
 */
export function hasEditableContent(abc: string): boolean {
  const lines = abc.split("\n");
  return lines.some(
    (line) =>
      line.startsWith("w:") ||
      line.startsWith("W:") ||
      line.match(/^"[^"]+"/),
  );
}
