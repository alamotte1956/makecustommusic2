/**
 * Lyrics Alignment Post-Processor
 *
 * Validates and auto-pads/trims ABC notation w: (lyrics) lines so that the
 * syllable count matches the note count in the corresponding music line.
 *
 * ABC lyrics alignment rules:
 * - Each syllable in a w: line corresponds to one note in the preceding music line
 * - Syllables are separated by spaces (one syllable per note)
 * - Hyphens (-) at the end of a syllable continue the word on the next note
 * - Underscores (_) extend the previous syllable over the next note (melisma)
 * - Asterisks (*) skip a note (no lyric for that note)
 * - Bar lines (|) in w: lines align with bar lines in the music
 * - Tilde (~) is a non-breaking space within a syllable
 */

/**
 * Count the number of notes in an ABC music line.
 * Notes are: A-G, a-g (with optional accidentals ^, _, =, and octave markers , ')
 * Rests (z, Z, x, X) also consume a syllable slot.
 * Chords in quotes ("Am") are NOT notes.
 * Multi-note chords [CEG] count as ONE note.
 * Grace notes {abc} do NOT count.
 */
export function countNotesInMusicLine(musicLine: string): number {
  // Remove chord symbols in quotes (e.g., "Am7", "G/B")
  let line = musicLine.replace(/"[^"]*"/g, "");

  // Remove grace notes {abc}
  line = line.replace(/\{[^}]*\}/g, "");

  // Remove decorations like !fermata!, !accent!, etc.
  line = line.replace(/![^!]*!/g, "");

  // Remove inline fields like [M:3/4], [K:Am], [Q:120]
  line = line.replace(/\[[A-Z]:[^\]]*\]/g, "");

  // Remove bar lines and repeat markers but keep the content
  // We need to count notes between bars, bars themselves don't count
  // Remove: |, ||, |:, :|, [|, |], :||:, |1, |2, etc.
  line = line.replace(/:\|:|:\|\|:|\|\||\|:|:\||\[\||\|\]|\|[0-9]*/g, " ");
  // Clean remaining single bars
  line = line.replace(/\|/g, " ");

  // Count multi-note chords [CEG] as single notes
  // Replace each chord group with a single placeholder character
  line = line.replace(/\[[A-Ga-g][^\]]*\]/g, "N");

  // Now count individual notes and rests
  // Notes: A-G, a-g (possibly preceded by ^, _, =, and followed by , or ')
  // Rests: z, Z, x, X
  // After a note letter, there may be octave modifiers (,' ) and duration (numbers, /)
  // We need to count each NOTE START, not each character

  let noteCount = 0;
  let i = 0;
  while (i < line.length) {
    const ch = line[i];

    // Skip whitespace
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Placeholder for chord groups
    if (ch === "N") {
      noteCount++;
      i++;
      // Skip duration after chord
      while (i < line.length && /[0-9/]/.test(line[i])) i++;
      continue;
    }

    // Check for accidentals before a note
    if (ch === "^" || ch === "_" || ch === "=") {
      // Could be double accidental (^^, __)
      if (i + 1 < line.length && line[i + 1] === ch) {
        i += 2;
      } else {
        i++;
      }
      // Now expect a note letter
      if (i < line.length && /[A-Ga-g]/.test(line[i])) {
        noteCount++;
        i++;
        // Skip octave modifiers
        while (i < line.length && (line[i] === "," || line[i] === "'")) i++;
        // Skip duration
        while (i < line.length && /[0-9/]/.test(line[i])) i++;
        // Skip ties
        if (i < line.length && line[i] === "-") i++;
      }
      continue;
    }

    // Note letters
    if (/[A-Ga-g]/.test(ch)) {
      noteCount++;
      i++;
      // Skip octave modifiers
      while (i < line.length && (line[i] === "," || line[i] === "'")) i++;
      // Skip duration
      while (i < line.length && /[0-9/]/.test(line[i])) i++;
      // Skip ties (- after duration means tie, not hyphen)
      if (i < line.length && line[i] === "-") i++;
      continue;
    }

    // Rests
    if (/[zZxX]/.test(ch)) {
      noteCount++;
      i++;
      // Skip duration
      while (i < line.length && /[0-9/]/.test(line[i])) i++;
      continue;
    }

    // Skip everything else (tuplet markers, slurs, etc.)
    i++;
  }

  return noteCount;
}

/**
 * Count the number of syllable slots in a w: lyrics line.
 * In ABC notation:
 * - Spaces separate syllables (each space = new note)
 * - Hyphens at end of word continue to next note
 * - * = skip a note
 * - _ = extend previous syllable (melisma)
 * - | = bar line alignment (doesn't count as a syllable)
 */
export function countSyllablesInLyricsLine(lyricsLine: string): number {
  // Remove the w: prefix
  let line = lyricsLine.replace(/^w:\s*/, "");

  if (!line.trim()) return 0;

  // Remove bar lines (they're alignment markers, not syllables)
  line = line.replace(/\|/g, " ");

  // Split by whitespace to get tokens
  const tokens = line.trim().split(/\s+/).filter((t) => t.length > 0);

  let count = 0;
  for (const token of tokens) {
    if (token === "|") continue; // bar line (already removed but just in case)

    // A hyphenated word like "a-ma-zing" counts as 3 syllables
    // Split by hyphens that are between characters
    const parts = token.split("-").filter((p) => p.length > 0);
    if (parts.length > 1) {
      // Hyphenated: each part is a syllable
      count += parts.length;
    } else {
      // Single syllable (could be *, _, or a word)
      count++;
    }
  }

  return count;
}

/**
 * Parse a w: line into individual syllable tokens.
 * Returns an array where each element is one syllable slot.
 */
export function parseLyricsSyllables(lyricsLine: string): string[] {
  let line = lyricsLine.replace(/^w:\s*/, "");
  if (!line.trim()) return [];

  // Split by spaces first
  const tokens = line.trim().split(/\s+/).filter((t) => t.length > 0);
  const syllables: string[] = [];

  for (const token of tokens) {
    if (token === "|") {
      // Bar line — we skip it in syllable counting but preserve for reconstruction
      continue;
    }

    // Check if token contains hyphens (multi-syllable word)
    // e.g., "a-ma-zing" → ["a-", "ma-", "zing"]
    if (token.includes("-") && token !== "-" && token !== "*" && token !== "_") {
      const parts = token.split("-");
      for (let i = 0; i < parts.length; i++) {
        if (parts[i].length === 0) continue;
        // Add hyphen suffix to all but the last part
        if (i < parts.length - 1) {
          syllables.push(parts[i] + "-");
        } else {
          syllables.push(parts[i]);
        }
      }
    } else {
      syllables.push(token);
    }
  }

  return syllables;
}

/**
 * Rebuild a w: line from syllable tokens.
 */
export function rebuildLyricsLine(syllables: string[]): string {
  if (syllables.length === 0) return "w:";

  // Join syllables with spaces, but hyphenated continuations don't need extra space
  const parts: string[] = [];
  for (let i = 0; i < syllables.length; i++) {
    parts.push(syllables[i]);
  }

  return "w: " + parts.join(" ");
}

/**
 * Align a lyrics line to match the note count of its corresponding music line.
 * - If fewer syllables than notes: pad with * (skip) tokens
 * - If more syllables than notes: truncate excess syllables
 */
export function alignLyricsToNotes(
  musicLine: string,
  lyricsLine: string
): string {
  const noteCount = countNotesInMusicLine(musicLine);
  const syllables = parseLyricsSyllables(lyricsLine);

  if (noteCount === 0) {
    // No notes in the music line — return empty lyrics
    return "w:";
  }

  if (syllables.length === noteCount) {
    // Already aligned — return as-is
    return rebuildLyricsLine(syllables);
  }

  if (syllables.length < noteCount) {
    // Fewer syllables than notes — pad with * (skip/melisma)
    const padded = [...syllables];
    while (padded.length < noteCount) {
      padded.push("*");
    }
    return rebuildLyricsLine(padded);
  }

  // More syllables than notes — truncate
  // Try to keep complete words: if the last kept syllable ends with -, remove the hyphen
  const trimmed = syllables.slice(0, noteCount);
  // If the last syllable ends with a hyphen, remove it to avoid dangling word
  if (trimmed.length > 0 && trimmed[trimmed.length - 1].endsWith("-")) {
    trimmed[trimmed.length - 1] = trimmed[trimmed.length - 1].slice(0, -1);
  }
  return rebuildLyricsLine(trimmed);
}

/**
 * Process an entire ABC notation string, aligning all w: lines with their
 * corresponding music lines.
 *
 * In ABC notation, a w: line applies to the immediately preceding music line.
 * Multiple w: lines can follow a single music line (for multiple verses).
 */
export function alignAllLyrics(abc: string): string {
  const lines = abc.split("\n");
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Check if this is a lyrics line
    if (trimmed.startsWith("w:") || trimmed.startsWith("W:")) {
      // Find the most recent music line (non-header, non-comment, non-lyrics)
      let musicLineIdx = -1;
      for (let j = i - 1; j >= 0; j--) {
        const prevTrimmed = result[j]?.trim() || "";
        // Skip other lyrics lines, comments, and empty lines
        if (
          prevTrimmed.startsWith("w:") ||
          prevTrimmed.startsWith("W:") ||
          prevTrimmed.startsWith("%") ||
          prevTrimmed === ""
        ) {
          continue;
        }
        // Skip header lines
        if (/^[A-Z]:/.test(prevTrimmed) && !prevTrimmed.startsWith("w:") && !prevTrimmed.startsWith("W:")) {
          continue;
        }
        // This should be a music line
        musicLineIdx = j;
        break;
      }

      if (musicLineIdx >= 0) {
        const musicLine = result[musicLineIdx];
        const aligned = alignLyricsToNotes(musicLine, trimmed);
        result.push(aligned);
      } else {
        // No preceding music line found — keep as-is
        result.push(lines[i]);
      }
    } else {
      result.push(lines[i]);
    }
  }

  return result.join("\n");
}
