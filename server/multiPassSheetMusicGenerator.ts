/**
 * Multi-Pass Sheet Music Generator
 *
 * Redesigned architecture that splits generation into focused, verifiable passes:
 *
 * Pass 1: STRUCTURE — Deterministic lyrics parsing into sections with syllable counts
 * Pass 2: CHORDS — LLM generates chord progression constrained to section structure
 * Pass 3: MELODY — LLM generates melody ONE SECTION AT A TIME with exact syllable counts
 * Pass 4: ASSEMBLY — Programmatic ABC construction with guaranteed correct formatting
 *
 * This approach fixes:
 * - Wrong words: lyrics are placed deterministically, not by the LLM
 * - Wrong notes: melody is generated per-section with tight constraints
 * - Bad formatting: ABC is assembled programmatically, never free-form
 */

import { invokeLLM } from "./_core/llm";
import { extractLLMText } from "./llmHelpers";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SongSection {
  name: string;           // e.g., "Verse 1", "Chorus", "Bridge"
  type: "verse" | "chorus" | "bridge" | "pre-chorus" | "intro" | "outro" | "interlude" | "tag";
  lines: LyricLine[];
  isRepeatOf?: string;    // If this section repeats another (e.g., "Chorus" repeats first chorus)
}

interface LyricLine {
  text: string;           // Original text of the line
  syllables: string[];    // Split into individual syllables
  syllableCount: number;  // Total syllable count for this line
}

interface ChordProgression {
  sectionName: string;
  chordsPerMeasure: string[];  // One chord per measure
  measuresPerLine: number[];   // How many measures each lyric line gets
}

interface MelodyLine {
  abcNotes: string;       // ABC notation for this line (notes only, no lyrics)
  noteCount: number;      // Number of notes generated
}

interface SectionMelody {
  sectionName: string;
  lines: MelodyLine[];
}

// ─── PASS 1: Deterministic Lyrics Parsing ──────────────────────────────────────

/**
 * Parse lyrics into structured sections with accurate syllable counts.
 * This is entirely deterministic — no LLM involved.
 */
export function parseLyricsIntoSections(lyrics: string): SongSection[] {
  if (!lyrics || !lyrics.trim()) return [];

  const rawLines = lyrics.split("\n");
  const sections: SongSection[] = [];
  let currentSection: SongSection = {
    name: "Verse 1",
    type: "verse",
    lines: [],
  };

  let verseCount = 0;
  let chorusCount = 0;
  const seenChorusLyrics: string[] = [];

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();

    // Detect section headers
    const sectionMatch = trimmed.match(
      /^[\[\(]?(verse|chorus|bridge|pre-?chorus|intro|outro|hook|refrain|tag|interlude)\s*(\d*)[\]\):]?\s*$/i
    );

    if (sectionMatch) {
      // Save current section if it has content
      if (currentSection.lines.length > 0) {
        sections.push(currentSection);
      }

      const rawType = sectionMatch[1].toLowerCase().replace("-", "");
      const num = sectionMatch[2] || "";
      const type = mapSectionType(rawType);
      const name = formatSectionName(rawType, num, type === "verse" ? ++verseCount : type === "chorus" ? ++chorusCount : 0);

      currentSection = { name, type, lines: [] };
      continue;
    }

    // Blank line = section separator (if no explicit headers)
    if (!trimmed) {
      if (currentSection.lines.length > 0) {
        sections.push(currentSection);
        // Auto-detect next section type
        const nextType = guessNextSectionType(sections);
        const nextName = nextType === "verse" ? `Verse ${++verseCount}` :
                         nextType === "chorus" ? `Chorus` : `Section ${sections.length + 1}`;
        currentSection = { name: nextName, type: nextType, lines: [] };
      }
      continue;
    }

    // Regular lyric line — split into syllables
    const syllables = splitIntoSyllables(trimmed);
    currentSection.lines.push({
      text: trimmed,
      syllables,
      syllableCount: syllables.length,
    });
  }

  // Push final section
  if (currentSection.lines.length > 0) {
    sections.push(currentSection);
  }

  // If no explicit section headers were found and we only have one section,
  // try to auto-detect verse/chorus by looking for repeated blocks
  if (sections.length === 1 && sections[0].lines.length > 8) {
    return autoDetectSections(sections[0].lines);
  }

  // Mark repeated choruses
  for (let i = 0; i < sections.length; i++) {
    if (sections[i].type === "chorus") {
      const lyricsText = sections[i].lines.map(l => l.text.toLowerCase()).join("\n");
      const firstIdx = seenChorusLyrics.indexOf(lyricsText);
      if (firstIdx >= 0) {
        sections[i].isRepeatOf = `Chorus`;
      } else {
        seenChorusLyrics.push(lyricsText);
      }
    }
  }

  return sections;
}

/**
 * Split a line of text into individual syllables.
 * For sheet music, what matters is:
 * 1. Correct syllable COUNT per word
 * 2. Clean display text for each syllable
 * 
 * We use vowel-group counting for accuracy and split at natural boundaries.
 */
export function splitIntoSyllables(text: string): string[] {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const allSyllables: string[] = [];

  for (const word of words) {
    // Keep punctuation attached to the word for display
    const cleanWord = word.replace(/[^a-zA-Z']/g, "");
    if (!cleanWord) continue;

    const count = countWordSyllables(cleanWord);
    if (count === 1) {
      allSyllables.push(word);
    } else {
      const parts = splitWordAtVowelBoundaries(cleanWord, count);
      // Add hyphens for ABC notation display (all but last part get hyphen suffix)
      for (let i = 0; i < parts.length; i++) {
        if (i < parts.length - 1) {
          allSyllables.push(parts[i] + "-");
        } else {
          allSyllables.push(parts[i]);
        }
      }
    }
  }

  return allSyllables;
}

/**
 * Count syllables in a word using English rules.
 */
function countWordSyllables(word: string): number {
  const lower = word.toLowerCase();
  
  // Very short words
  if (lower.length <= 3) return 1;
  
  // Common single-syllable words
  const monosyllables = new Set(["the", "and", "for", "are", "but", "not", "you", "all", 
    "can", "had", "her", "was", "one", "our", "out", "they", "been", "have", 
    "said", "each", "which", "their", "will", "from", "this", "that", "with",
    "what", "were", "when", "your", "than", "them", "then", "some", "would",
    "make", "like", "long", "look", "come", "could", "more", "write", "gone",
    "see", "through", "where", "much", "back", "give", "most", "find", "here",
    "thing", "right", "still", "those", "great", "grace", "love", "praise",
    "lord", "god", "christ", "faith", "hope", "peace", "light", "life",
    "heart", "soul", "free", "king", "sing", "song", "world", "word",
    "saved", "chains", "blood", "cross", "throne", "name", "reign", "reigns",
    "sweet", "sound", "found", "blind", "once", "lost", "wretch", "fear"]);
  if (monosyllables.has(lower)) return 1;
  
  // Count vowel groups
  const vowelGroups = lower.match(/[aeiouy]+/g);
  if (!vowelGroups) return 1;
  
  let count = vowelGroups.length;
  
  // Silent-e: trailing 'e' after consonant (not after vowel)
  // Only apply if the 'e' is truly silent (not part of a spoken syllable like "-ble", "-ting")
  if (lower.endsWith("e") && lower.length > 2 && !/[aeiouy]/.test(lower[lower.length - 2])) {
    // Don't apply silent-e to words ending in common suffixes where 'e' is not silent
    const noSilentE = ["ine", "ize", "ise", "ite", "ide", "ode", "ude", "ute", "ane", "one"];
    const endsWithVowelSuffix = noSilentE.some(s => lower.endsWith(s) && lower.length > s.length + 1);
    if (!endsWithVowelSuffix && count > 1) count--;
  }
  
  // -le exception: consonant + le at end IS a syllable (e.g., "ta-ble", "peo-ple")
  if (lower.endsWith("le") && lower.length > 3 && !/[aeiouy]/.test(lower[lower.length - 3])) {
    // The silent-e rule may have incorrectly decremented, add it back
    const withoutSilentE = (lower.match(/[aeiouy]+/g) || []).length;
    count = Math.max(count, withoutSilentE);
  }
  
  // -ing: words ending in -ing where the base has a silent-e that was removed
  // e.g., "amazing" = amaze + ing = 3 syllables, not 2
  // The vowel groups already count correctly for -ing words, so no adjustment needed
  
  // -ed: doesn't add syllable unless preceded by t or d
  if (lower.endsWith("ed") && lower.length > 3 && count > 1) {
    const beforeEd = lower[lower.length - 3];
    if (beforeEd !== "t" && beforeEd !== "d") {
      count--;
    }
  }
  
  // -es: usually doesn't add syllable
  if (lower.endsWith("es") && lower.length > 3 && count > 1) {
    const beforeEs = lower[lower.length - 3];
    if (!["s", "x", "z", "h"].includes(beforeEs)) {
      // Don't decrement — keep as is for safety
    }
  }
  
  return Math.max(1, count);
}

/**
 * Split a word into n syllable parts.
 * 
 * Strategy: Find natural split points between vowel groups.
 * For consonant clusters between vowels (VCV or VCCV patterns):
 * - Single consonant between vowels: split before consonant (V|CV) — "a-ma-zing"
 * - Two consonants between vowels: split between them (VC|CV) — "ran-somed", "won-der"
 * - Three+ consonants: keep common onsets together (e.g., "str", "bl", "cr") with next vowel
 */
function splitWordAtVowelBoundaries(word: string, n: number): string[] {
  if (n <= 1) return [word];
  if (word.length <= n) return [word];
  
  const lower = word.toLowerCase();
  const isVowel = (ch: string) => "aeiouy".includes(ch);
  
  // Common consonant onsets that should stay together
  const validOnsets = new Set([
    "bl", "br", "ch", "cl", "cr", "dr", "dw", "fl", "fr", "gl", "gr",
    "kn", "ph", "pl", "pr", "qu", "sc", "sh", "sk", "sl", "sm", "sn",
    "sp", "st", "str", "sw", "th", "tr", "tw", "wh", "wr"
  ]);
  
  // Find all candidate split points
  const candidateSplits: number[] = [];
  
  let i = 0;
  while (i < lower.length) {
    // Find end of current vowel group
    if (isVowel(lower[i])) {
      // Skip through the vowel group
      while (i < lower.length && isVowel(lower[i])) i++;
      // Now i points to first consonant after vowel group (or end)
      if (i >= lower.length) break;
      
      // Count consecutive consonants
      const consStart = i;
      while (i < lower.length && !isVowel(lower[i])) i++;
      const consEnd = i; // i now points to next vowel (or end)
      
      if (i >= lower.length) break; // No more vowels, no split needed
      
      const consCount = consEnd - consStart;
      const consonants = lower.slice(consStart, consEnd);
      
      if (consCount === 1) {
        // Single consonant: split before it (V | CV) — "a|ma|zing"
        candidateSplits.push(consStart);
      } else if (consCount === 2) {
        // Two consonants: check if they form a valid onset
        if (validOnsets.has(consonants)) {
          // Keep together with next vowel: split before both (V | CCV)
          candidateSplits.push(consStart);
        } else {
          // Split between them (VC | CV) — "ran|somed", "won|der"
          candidateSplits.push(consStart + 1);
        }
      } else {
        // 3+ consonants: find the longest valid onset from the right
        let splitAt = consStart + 1; // default: after first consonant
        for (let onsetLen = Math.min(3, consCount - 1); onsetLen >= 2; onsetLen--) {
          const possibleOnset = consonants.slice(consCount - onsetLen);
          if (validOnsets.has(possibleOnset)) {
            splitAt = consEnd - onsetLen;
            break;
          }
        }
        candidateSplits.push(splitAt);
      }
    } else {
      i++;
    }
  }
  
  if (candidateSplits.length === 0) return [word];
  
  // Select n-1 split points from candidates
  let selectedSplits: number[];
  if (candidateSplits.length <= n - 1) {
    selectedSplits = [...candidateSplits];
  } else {
    // Evenly distribute selections across available candidates
    selectedSplits = [];
    const step = candidateSplits.length / (n - 1);
    for (let j = 0; j < n - 1; j++) {
      const idx = Math.min(Math.round(j * step), candidateSplits.length - 1);
      const point = candidateSplits[idx];
      if (!selectedSplits.includes(point)) {
        selectedSplits.push(point);
      }
    }
  }
  
  // Sort split points
  selectedSplits.sort((a, b) => a - b);
  
  // Build result from split points
  const result: string[] = [];
  let start = 0;
  for (const split of selectedSplits) {
    if (split > start && split < word.length) {
      result.push(word.slice(start, split));
      start = split;
    }
  }
  result.push(word.slice(start));
  
  // Only merge empty fragments (not single-char ones which are valid syllables like "A" in "A-ma-zing")
  for (let j = result.length - 1; j >= 0; j--) {
    if (result[j].length === 0 && result.length > 1) {
      if (j > 0) {
        result[j - 1] += result[j];
        result.splice(j, 1);
      } else if (result.length > 1) {
        result[1] = result[0] + result[1];
        result.splice(0, 1);
      }
    }
  }
  
  // If we ended up with more parts than requested, merge the shortest adjacent pair
  while (result.length > n) {
    let minLen = Infinity;
    let minIdx = 0;
    for (let j = 0; j < result.length - 1; j++) {
      const combined = result[j].length + result[j + 1].length;
      if (combined < minLen) {
        minLen = combined;
        minIdx = j;
      }
    }
    result[minIdx] = result[minIdx] + result[minIdx + 1];
    result.splice(minIdx + 1, 1);
  }
  
  return result;
}

function mapSectionType(raw: string): SongSection["type"] {
  const normalized = raw.replace("-", "").toLowerCase();
  switch (normalized) {
    case "verse": return "verse";
    case "chorus": case "hook": case "refrain": return "chorus";
    case "bridge": return "bridge";
    case "prechorus": return "pre-chorus";
    case "intro": return "intro";
    case "outro": return "outro";
    case "interlude": return "interlude";
    case "tag": return "tag";
    default: return "verse";
  }
}

function formatSectionName(rawType: string, num: string, count: number): string {
  const type = rawType.charAt(0).toUpperCase() + rawType.slice(1).toLowerCase();
  if (num) return `${type} ${num}`;
  if (count > 0) return `${type} ${count}`;
  return type;
}

function guessNextSectionType(existingSections: SongSection[]): SongSection["type"] {
  if (existingSections.length === 0) return "verse";
  const lastType = existingSections[existingSections.length - 1].type;
  // Common patterns: verse → chorus → verse → chorus → bridge → chorus
  if (lastType === "verse") return "chorus";
  if (lastType === "chorus") return "verse";
  if (lastType === "bridge") return "chorus";
  return "verse";
}

function autoDetectSections(allLines: LyricLine[]): SongSection[] {
  // Split into groups of 4 lines and check for repetition
  const sections: SongSection[] = [];
  const groupSize = 4;
  let verseNum = 1;
  const seenGroups: Map<string, number> = new Map();

  for (let i = 0; i < allLines.length; i += groupSize) {
    const group = allLines.slice(i, i + groupSize);
    if (group.length === 0) continue;

    const normalized = group.map(l => l.text.toLowerCase().trim()).join("|");

    if (seenGroups.has(normalized)) {
      sections.push({ name: "Chorus", type: "chorus", lines: group, isRepeatOf: "Chorus" });
    } else {
      seenGroups.set(normalized, sections.length);
      // First occurrence of a repeated group is the chorus
      const isLikelyChorus = group.some(l => l.text.length < 40) && group.length <= 4;
      if (sections.length > 0 && isLikelyChorus && sections[sections.length - 1].type === "verse") {
        sections.push({ name: "Chorus", type: "chorus", lines: group });
      } else {
        sections.push({ name: `Verse ${verseNum++}`, type: "verse", lines: group });
      }
    }
  }

  return sections;
}

// ─── PASS 2: Chord Progression Generation ──────────────────────────────────────

const CHORD_GENERATION_PROMPT = `You are a professional Nashville session musician and arranger. Generate chord progressions for a song.

You will receive the song structure with section names, types, and line counts. Generate appropriate chords.

RULES:
1. Return ONLY a valid JSON object — no markdown, no explanation
2. Each section gets a chord progression
3. Use Nashville-standard chord symbols: C, Am, F, G7, Dm/F, Cmaj7, etc.
4. Assign 1-2 measures per lyric line (typically 1 measure for short lines, 2 for long lines)
5. Choruses should have stronger, more memorable progressions
6. Bridges should contrast harmonically with verses/choruses
7. Worship/Christian songs favor: I-V-vi-IV, I-IV-V-I, vi-IV-I-V progressions
8. Keep progressions singable and congregational

Response format:
{
  "sections": [
    {
      "name": "Verse 1",
      "measuresPerLine": [2, 2, 2, 2],
      "chords": ["C", "Am", "F", "G", "C", "Am", "Dm", "G"]
    }
  ]
}`;

export async function generateChordProgression(
  sections: SongSection[],
  key: string,
  genre: string,
  tempo: number,
  timeSignature: string
): Promise<ChordProgression[]> {
  const structureDescription = sections.map(s => {
    const lineInfo = s.lines.map((l, i) => `    Line ${i + 1}: "${l.text}" (${l.syllableCount} syllables)`).join("\n");
    return `  [${s.name}] (${s.type}) — ${s.lines.length} lines\n${lineInfo}`;
  }).join("\n\n");

  const userPrompt = `Generate chord progressions for this ${genre || "Christian Contemporary"} song in the key of ${key || "C"}.
Tempo: ${tempo || 120} BPM, Time Signature: ${timeSignature || "4/4"}

Song Structure:
${structureDescription}

IMPORTANT:
- Each section needs chords. The total number of chords in a section = sum of measuresPerLine.
- measuresPerLine tells how many measures each lyric line occupies (usually 1 or 2).
- For lines with many syllables (8+), use 2 measures. For short lines (4-5 syllables), use 1 measure.
- The chords array length MUST equal the sum of measuresPerLine for that section.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: CHORD_GENERATION_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const text = extractLLMText(response.choices?.[0]?.message?.content);
    if (!text) throw new Error("Empty chord response");

    const parsed = JSON.parse(text);
    const result: ChordProgression[] = [];

    for (const section of parsed.sections || []) {
      result.push({
        sectionName: section.name,
        chordsPerMeasure: section.chords || [],
        measuresPerLine: section.measuresPerLine || [],
      });
    }

    // Validate: ensure we have progressions for all sections
    if (result.length < sections.length) {
      // Fill missing sections with a simple I-IV-V-I pattern
      for (let i = result.length; i < sections.length; i++) {
        const s = sections[i];
        const measuresPerLine = s.lines.map(l => l.syllableCount > 7 ? 2 : 1);
        const totalMeasures = measuresPerLine.reduce((a, b) => a + b, 0);
        const baseChords = getDefaultChords(key, s.type);
        const chords: string[] = [];
        for (let m = 0; m < totalMeasures; m++) {
          chords.push(baseChords[m % baseChords.length]);
        }
        result.push({ sectionName: s.name, chordsPerMeasure: chords, measuresPerLine });
      }
    }

    return result;
  } catch (err: any) {
    console.error("[MultiPass:Chords] LLM chord generation failed:", err?.message);
    // Fallback: generate default progressions
    return sections.map(s => {
      const measuresPerLine = s.lines.map(l => l.syllableCount > 7 ? 2 : 1);
      const totalMeasures = measuresPerLine.reduce((a, b) => a + b, 0);
      const baseChords = getDefaultChords(key, s.type);
      const chords: string[] = [];
      for (let m = 0; m < totalMeasures; m++) {
        chords.push(baseChords[m % baseChords.length]);
      }
      return { sectionName: s.name, chordsPerMeasure: chords, measuresPerLine };
    });
  }
}

function getDefaultChords(key: string, sectionType: string): string[] {
  // Simple Nashville-style defaults based on key
  const k = (key || "C").replace(/m$/, "");
  const isMinor = (key || "").endsWith("m");

  if (isMinor) {
    switch (sectionType) {
      case "chorus": return [k + "m", k.replace(/.$/, String.fromCharCode(k.charCodeAt(k.length - 1) + 5)), k.replace(/.$/, String.fromCharCode(k.charCodeAt(k.length - 1) + 3)), k.replace(/.$/, String.fromCharCode(k.charCodeAt(k.length - 1) + 7))];
      default: return [k + "m", "F", "G", k + "m"];
    }
  }

  // Major key defaults
  switch (sectionType) {
    case "chorus": return [k, "G", "Am", "F"];
    case "bridge": return ["Am", "F", k, "G"];
    case "pre-chorus": return ["Am", "F", "G", "G"];
    default: return [k, "Am", "F", "G"];
  }
}

// ─── PASS 3: Melody Generation (Per-Section) ──────────────────────────────────

const MELODY_SECTION_PROMPT = `You are a professional melody writer. Generate ABC notation melody for ONE section of a song.

CRITICAL CONSTRAINTS:
1. You MUST generate EXACTLY the specified number of notes for each line
2. Each note corresponds to one syllable of lyrics
3. Output ONLY the ABC notes — no headers, no w: lines, no comments, no markdown

NOTATION RULES:
- Use standard ABC note letters: C D E F G A B c d e f g a b (lowercase = octave above middle C)
- Duration: no suffix = eighth note (L:1/8 base), 2 = quarter, 4 = half, 6 = dotted half, 8 = whole
- Rests: z = eighth rest, z2 = quarter rest
- Accidentals: ^ = sharp, _ = flat
- Ties: use - after duration to tie to next note
- Bar lines: | separates measures

MELODY QUALITY RULES:
- Use stepwise motion (2nds, 3rds) 70% of the time, with occasional leaps (4ths, 5ths)
- Vary rhythm: mix eighth notes, quarters, dotted quarters, half notes
- Phrases should rise and fall like natural speech
- End phrases on stable scale degrees (1, 3, 5)
- Chorus melodies should be higher energy/range than verses
- Include rests (z, z2) for breathing between phrases

OUTPUT FORMAT:
Return one line of ABC notes per lyric line. Each line must have EXACTLY the specified note count.
Separate lines with newlines. Include | bar lines to divide into measures.

Example (4 notes per line, 2 measures):
"G"B2 "D"A2 | "Em"G2 "C"E2 |
"Am"A2 "F"c2 | "G"B2 "C"G2 |`;

export async function generateMelodyForSection(
  section: SongSection,
  chords: ChordProgression,
  key: string,
  tempo: number,
  timeSignature: string,
  genre: string,
  sectionContext: string
): Promise<SectionMelody> {
  const beatsPerMeasure = parseInt(timeSignature?.split("/")[0] || "4");

  // Build the constraint description
  const lineConstraints = section.lines.map((line, i) => {
    const measures = chords.measuresPerLine[i] || 1;
    const chordsForLine = chords.chordsPerMeasure.slice(
      chords.measuresPerLine.slice(0, i).reduce((a, b) => a + b, 0),
      chords.measuresPerLine.slice(0, i).reduce((a, b) => a + b, 0) + measures
    );
    return `Line ${i + 1}: "${line.text}" — EXACTLY ${line.syllableCount} notes, ${measures} measure(s), chords: ${chordsForLine.join(" → ")}`;
  }).join("\n");

  const userPrompt = `Generate melody for the [${section.name}] section of a ${genre || "Christian Contemporary"} song.

Key: ${key || "C"}
Tempo: ${tempo || 120} BPM
Time Signature: ${timeSignature || "4/4"} (${beatsPerMeasure} beats per measure)
Section type: ${section.type}

${sectionContext}

LINE-BY-LINE CONSTRAINTS (you MUST match these EXACTLY):
${lineConstraints}

CRITICAL: Each line MUST have EXACTLY the specified number of notes. Count carefully!
A "note" is any pitch letter (A-G, a-g) or rest (z). Chord symbols in quotes don't count.
Include chord symbols from the progression in quotes before the note they apply to.

Output one line of ABC melody per lyric line. No headers, no w: lines, no comments.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: MELODY_SECTION_PROMPT },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 4096,
    });

    const rawMelody = extractLLMText(response.choices?.[0]?.message?.content);
    if (!rawMelody) throw new Error("Empty melody response");

    // Parse the response into individual lines
    const melodyLines = rawMelody
      .replace(/^```[a-z]*\n?/gm, "")
      .replace(/```\s*$/gm, "")
      .split("\n")
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.startsWith("%") && !l.startsWith("w:") && !/^[A-Z]:/.test(l));

    const result: SectionMelody = { sectionName: section.name, lines: [] };

    for (let i = 0; i < section.lines.length; i++) {
      const expectedNotes = section.lines[i].syllableCount;
      let melodyLine = melodyLines[i] || "";

      // Count notes in this line
      const noteCount = countNotesInLine(melodyLine);

      // If note count doesn't match, try to fix it
      if (noteCount !== expectedNotes && melodyLine) {
        melodyLine = adjustNoteCount(melodyLine, expectedNotes, key, chords.chordsPerMeasure, i, chords.measuresPerLine);
      }

      result.lines.push({
        abcNotes: melodyLine || generateFallbackMelody(expectedNotes, key, section.type),
        noteCount: expectedNotes,
      });
    }

    return result;
  } catch (err: any) {
    console.error(`[MultiPass:Melody] Failed for section "${section.name}":`, err?.message);
    // Fallback: generate simple melodic patterns
    return {
      sectionName: section.name,
      lines: section.lines.map(line => ({
        abcNotes: generateFallbackMelody(line.syllableCount, key, section.type),
        noteCount: line.syllableCount,
      })),
    };
  }
}

/**
 * Count the number of notes (pitches + rests) in an ABC melody line.
 */
function countNotesInLine(line: string): number {
  // Remove chord symbols
  let clean = line.replace(/"[^"]*"/g, "");
  // Remove grace notes
  clean = clean.replace(/\{[^}]*\}/g, "");
  // Remove bar lines
  clean = clean.replace(/[|:\[\]]/g, " ");

  let count = 0;
  let i = 0;
  while (i < clean.length) {
    const ch = clean[i];
    if (/\s/.test(ch)) { i++; continue; }

    // Accidentals
    if (ch === "^" || ch === "_" || ch === "=") {
      if (i + 1 < clean.length && clean[i + 1] === ch) i++;
      i++;
      if (i < clean.length && /[A-Ga-g]/.test(clean[i])) {
        count++;
        i++;
        while (i < clean.length && /[,']/.test(clean[i])) i++;
        while (i < clean.length && /[0-9/]/.test(clean[i])) i++;
        if (i < clean.length && clean[i] === "-") i++;
      }
      continue;
    }

    // Notes
    if (/[A-Ga-g]/.test(ch)) {
      count++;
      i++;
      while (i < clean.length && /[,']/.test(clean[i])) i++;
      while (i < clean.length && /[0-9/]/.test(clean[i])) i++;
      if (i < clean.length && clean[i] === "-") i++;
      continue;
    }

    // Rests
    if (/[zZxX]/.test(ch)) {
      count++;
      i++;
      while (i < clean.length && /[0-9/]/.test(clean[i])) i++;
      continue;
    }

    i++;
  }

  return count;
}

/**
 * Adjust a melody line to have exactly the target number of notes.
 */
function adjustNoteCount(melodyLine: string, targetCount: number, key: string, chords: string[], lineIdx: number, measuresPerLine: number[]): string {
  const currentCount = countNotesInLine(melodyLine);

  if (currentCount === targetCount) return melodyLine;

  if (currentCount > targetCount) {
    // Too many notes — remove excess from the end
    // Parse notes and keep only targetCount
    return truncateToNotes(melodyLine, targetCount);
  }

  // Too few notes — add passing tones
  const deficit = targetCount - currentCount;
  const keyRoot = (key || "C")[0];
  const scaleNotes = getScaleNotes(key);
  const additions = scaleNotes.slice(0, deficit).map(n => n + "2").join(" ");
  return melodyLine + " " + additions;
}

function truncateToNotes(line: string, maxNotes: number): string {
  let count = 0;
  let i = 0;
  const chars = line;

  while (i < chars.length && count < maxNotes) {
    const ch = chars[i];

    // Skip chord symbols
    if (ch === '"') {
      i++;
      while (i < chars.length && chars[i] !== '"') i++;
      if (i < chars.length) i++;
      continue;
    }

    // Accidentals
    if (ch === "^" || ch === "_" || ch === "=") {
      if (i + 1 < chars.length && chars[i + 1] === ch) i++;
      i++;
      if (i < chars.length && /[A-Ga-g]/.test(chars[i])) {
        count++;
        i++;
        while (i < chars.length && /[,']/.test(chars[i])) i++;
        while (i < chars.length && /[0-9/]/.test(chars[i])) i++;
        if (i < chars.length && chars[i] === "-") i++;
      }
      continue;
    }

    // Notes
    if (/[A-Ga-g]/.test(ch)) {
      count++;
      i++;
      while (i < chars.length && /[,']/.test(chars[i])) i++;
      while (i < chars.length && /[0-9/]/.test(chars[i])) i++;
      if (i < chars.length && chars[i] === "-") i++;
      continue;
    }

    // Rests
    if (/[zZxX]/.test(ch)) {
      count++;
      i++;
      while (i < chars.length && /[0-9/]/.test(chars[i])) i++;
      continue;
    }

    i++;
  }

  return line.substring(0, i).trim();
}

function getScaleNotes(key: string): string[] {
  const k = (key || "C").replace(/m$/, "");
  const isMinor = (key || "").endsWith("m");

  const majorScales: Record<string, string[]> = {
    "C": ["C", "D", "E", "F", "G", "A", "B", "c", "d", "e"],
    "D": ["D", "E", "^F", "G", "A", "B", "^c", "d", "e", "^f"],
    "E": ["E", "^F", "^G", "A", "B", "^c", "^d", "e", "^f", "^g"],
    "F": ["F", "G", "A", "_B", "c", "d", "e", "f", "g", "a"],
    "G": ["G", "A", "B", "c", "d", "e", "^f", "g", "a", "b"],
    "A": ["A", "B", "^c", "d", "e", "^f", "^g", "a", "b", "^c'"],
    "Bb": ["_B", "c", "d", "_e", "f", "g", "a", "_b", "c'", "d'"],
    "Eb": ["_E", "F", "G", "_A", "_B", "c", "d", "_e", "f", "g"],
    "Ab": ["_A", "_B", "c", "_d", "_e", "f", "g", "_a", "_b", "c'"],
  };

  const minorScales: Record<string, string[]> = {
    "A": ["A", "B", "c", "d", "e", "f", "g", "a", "b", "c'"],
    "D": ["D", "E", "F", "G", "A", "_B", "c", "d", "e", "f"],
    "E": ["E", "^F", "G", "A", "B", "c", "d", "e", "^f", "g"],
    "G": ["G", "A", "_B", "c", "d", "_e", "f", "g", "a", "_b"],
  };

  if (isMinor && minorScales[k]) return minorScales[k];
  if (majorScales[k]) return majorScales[k];
  return majorScales["C"];
}

/**
 * Generate a simple but musical fallback melody when LLM fails.
 */
function generateFallbackMelody(noteCount: number, key: string, sectionType: string): string {
  const scale = getScaleNotes(key);
  const notes: string[] = [];

  // Create a melodic contour based on section type
  const range = sectionType === "chorus" ? [2, 7] : [0, 5]; // Chorus uses higher range
  const [lo, hi] = range;

  for (let i = 0; i < noteCount; i++) {
    // Simple arch contour: rise in first half, fall in second half
    const progress = i / Math.max(1, noteCount - 1);
    let scaleIdx: number;
    if (progress < 0.5) {
      scaleIdx = lo + Math.round((hi - lo) * (progress * 2));
    } else {
      scaleIdx = hi - Math.round((hi - lo) * ((progress - 0.5) * 2));
    }
    scaleIdx = Math.max(lo, Math.min(hi, scaleIdx));

    // Add some rhythmic variety
    const duration = (i % 3 === 0) ? "2" : (i % 5 === 0) ? "4" : "2";
    notes.push(scale[scaleIdx % scale.length] + duration);
  }

  // Add bar lines every 4 notes (for 4/4 time with eighth note base)
  const withBars: string[] = [];
  for (let i = 0; i < notes.length; i++) {
    withBars.push(notes[i]);
    if ((i + 1) % 4 === 0 && i < notes.length - 1) {
      withBars.push("|");
    }
  }

  return withBars.join(" ") + " |";
}

// ─── PASS 4: ABC Assembly ──────────────────────────────────────────────────────

/**
 * Assemble the final ABC notation from all the generated parts.
 * This is entirely deterministic — guaranteed correct formatting.
 */
export function assembleAbc(
  title: string,
  key: string,
  timeSignature: string,
  tempo: number,
  sections: SongSection[],
  chords: ChordProgression[],
  melodies: SectionMelody[]
): string {
  const lines: string[] = [];

  // Headers (strict order, K: last)
  lines.push("X: 1");
  lines.push(`T: ${title}`);
  lines.push(`M: ${timeSignature || "4/4"}`);
  lines.push("L: 1/8");
  lines.push(`Q: 1/4=${tempo || 120}`);
  lines.push(`K: ${key || "C"}`);

  // Music body — one section at a time
  for (let sIdx = 0; sIdx < sections.length; sIdx++) {
    const section = sections[sIdx];
    const melody = melodies[sIdx];

    // Section comment
    lines.push(`% ${section.name}`);

    // If this is a repeated chorus, use repeat signs
    if (section.isRepeatOf && sIdx > 0) {
      // Find the original chorus and reference it
      lines.push(`% (repeat of ${section.isRepeatOf})`);
      // Still write it out with lyrics for clarity
    }

    // Write each line: melody + w: lyrics
    for (let lIdx = 0; lIdx < section.lines.length; lIdx++) {
      const lyricLine = section.lines[lIdx];
      const melodyLine = melody?.lines[lIdx];

      if (melodyLine) {
        lines.push(melodyLine.abcNotes);
      } else {
        // Fallback if melody is missing
        lines.push(generateFallbackMelody(lyricLine.syllableCount, key, section.type));
      }

      // Build the w: line from syllables
      const wLine = buildLyricsLine(lyricLine.syllables);
      lines.push(wLine);
    }
  }

  return lines.join("\n");
}

/**
 * Build a w: lyrics line from syllables array.
 * Uses hyphens to connect syllables within a word.
 */
function buildLyricsLine(syllables: string[]): string {
  if (syllables.length === 0) return "w:";

  // Reconstruct with proper ABC lyrics formatting
  // Each syllable is separated by a space
  // Multi-syllable words use hyphens: "a-" "ma-" "zing"
  const formatted: string[] = [];

  for (let i = 0; i < syllables.length; i++) {
    const syl = syllables[i];
    // Check if next syllable is part of the same word
    // (we determine this by checking if the original text had these syllables adjacent)
    formatted.push(syl);
  }

  return "w: " + formatted.join(" ");
}

// ─── MAIN ENTRY POINT ──────────────────────────────────────────────────────────

/**
 * Generate sheet music using the multi-pass architecture.
 * This is the main entry point that orchestrates all passes.
 */
export async function generateSheetMusicMultiPass(
  title: string,
  genre: string,
  key: string,
  timeSignature: string,
  tempo: number,
  lyrics: string
): Promise<string> {
  console.log(`[MultiPass] Starting multi-pass generation for "${title}"`);
  console.log(`[MultiPass] Key: ${key}, Tempo: ${tempo}, Genre: ${genre}`);
  console.log(`[MultiPass] Lyrics length: ${lyrics?.length || 0} chars`);

  // ═══ PASS 1: Parse lyrics into structured sections ═══
  console.log("[MultiPass] Pass 1: Parsing lyrics into sections...");
  const sections = parseLyricsIntoSections(lyrics);

  if (sections.length === 0) {
    console.warn("[MultiPass] No lyrics sections found — generating instrumental");
    // For instrumental, fall back to the old generator
    throw new Error("No lyrics provided — cannot use multi-pass generator for instrumentals");
  }

  console.log(`[MultiPass] Found ${sections.length} sections:`);
  for (const s of sections) {
    console.log(`  [${s.name}] ${s.lines.length} lines, syllables: ${s.lines.map(l => l.syllableCount).join(", ")}`);
  }

  // ═══ PASS 2: Generate chord progressions ═══
  console.log("[MultiPass] Pass 2: Generating chord progressions...");
  const chords = await generateChordProgression(sections, key, genre, tempo, timeSignature);

  console.log(`[MultiPass] Generated chords for ${chords.length} sections`);

  // ═══ PASS 3: Generate melody for each section ═══
  console.log("[MultiPass] Pass 3: Generating melodies per section...");
  const melodies: SectionMelody[] = [];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const sectionChords = chords[i];

    // Build context about surrounding sections for musical coherence
    const context = i === 0
      ? "This is the opening section. Start with a moderate, inviting melody."
      : `Previous section was [${sections[i - 1].name}]. ${
          section.type === "chorus" ? "Make this section more energetic and memorable than the verse." :
          section.type === "bridge" ? "Contrast with the verse/chorus — use different melodic material." :
          "Continue the musical flow from the previous section."
        }`;

    console.log(`[MultiPass] Generating melody for [${section.name}]...`);
    const melody = await generateMelodyForSection(
      section, sectionChords, key, tempo, timeSignature, genre, context
    );
    melodies.push(melody);
  }

  // ═══ PASS 4: Assemble final ABC notation ═══
  console.log("[MultiPass] Pass 4: Assembling final ABC notation...");
  const abc = assembleAbc(title, key, timeSignature, tempo, sections, chords, melodies);

  console.log(`[MultiPass] Complete! Generated ${abc.length} chars, ${(abc.match(/\|/g) || []).length} bar lines`);
  return abc;
}
