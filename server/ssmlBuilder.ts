/**
 * SSML Builder for Tempo-Synced Vocal Delivery
 * 
 * Generates SSML markup that aligns vocal pacing with the instrumental BPM.
 * ElevenLabs supports a subset of SSML including <break>, prosody rate, and emphasis.
 * 
 * Note: ElevenLabs TTS uses the `text` field which accepts SSML-like hints
 * embedded in the text. We use natural language pacing cues and strategic
 * punctuation/pauses to control tempo since ElevenLabs doesn't support
 * full W3C SSML. Instead, we use text-based tempo control.
 */

export type TempoSyncOptions = {
  bpm: number;
  timeSignature?: string; // e.g., "4/4", "3/4", "6/8"
  genre?: string;
  mood?: string;
};

/**
 * Calculate the duration of a beat in milliseconds from BPM.
 */
function beatDurationMs(bpm: number): number {
  return Math.round(60000 / bpm);
}

/**
 * Get the pacing descriptor based on BPM range.
 */
function getPacingFromBpm(bpm: number): { rate: string; pauseMs: number; description: string } {
  if (bpm < 70) {
    return { rate: "slow", pauseMs: 600, description: "slow, deliberate" };
  } else if (bpm < 100) {
    return { rate: "medium-slow", pauseMs: 400, description: "relaxed, flowing" };
  } else if (bpm < 120) {
    return { rate: "medium", pauseMs: 300, description: "natural, conversational" };
  } else if (bpm < 140) {
    return { rate: "medium-fast", pauseMs: 200, description: "upbeat, energetic" };
  } else {
    return { rate: "fast", pauseMs: 150, description: "rapid, driving" };
  }
}

/**
 * Add tempo-aware pacing cues to lyrics text.
 * Uses strategic punctuation, line breaks, and pacing hints
 * to guide the TTS engine toward the target tempo.
 */
export function addTempoSync(lyrics: string, options: TempoSyncOptions): string {
  const { bpm, timeSignature = "4/4", genre, mood } = options;
  const pacing = getPacingFromBpm(bpm);
  const beatMs = beatDurationMs(bpm);

  // Parse lyrics into sections and lines
  const lines = lyrics.split("\n");
  const processedLines: string[] = [];

  let currentSection = "";

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect section markers like [Verse 1], [Chorus], etc.
    const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1].toLowerCase();
      // Add a longer pause between sections
      if (processedLines.length > 0) {
        processedLines.push(""); // blank line = natural pause
        processedLines.push(""); // double blank = longer pause
      }
      processedLines.push(trimmed);
      continue;
    }

    // Skip empty lines (preserve them as pauses)
    if (!trimmed) {
      processedLines.push("");
      continue;
    }

    // Apply tempo-aware processing to the line
    let processedLine = trimmed;

    // For slower tempos, add subtle pauses (ellipses) at natural break points
    if (bpm < 90) {
      // Add breathing room at commas and mid-line pauses
      processedLine = processedLine.replace(/,\s*/g, "... ");
    }

    // For chorus sections, add emphasis markers
    if (currentSection.includes("chorus") || currentSection.includes("hook")) {
      // Choruses should feel slightly more emphatic
      if (!processedLine.endsWith("!") && !processedLine.endsWith("?")) {
        // Leave as-is, the emphasis comes from the section context
      }
    }

    // For bridge sections, add a slight tempo shift feel
    if (currentSection.includes("bridge")) {
      // Bridges often have a different energy — add subtle pauses
      processedLine = processedLine.replace(/\.\s+/g, "... ");
    }

    processedLines.push(processedLine);
  }

  // Build the final text with a pacing preamble
  // The preamble is a subtle instruction that helps guide the TTS pacing
  const pacingPreamble = buildPacingPreamble(bpm, pacing, genre, mood);

  return pacingPreamble + processedLines.join("\n");
}

/**
 * Build a pacing preamble that subtly guides the TTS engine.
 * This is prepended to the lyrics and uses natural language
 * to set the vocal delivery style.
 */
function buildPacingPreamble(
  bpm: number,
  pacing: { rate: string; pauseMs: number; description: string },
  genre?: string,
  mood?: string
): string {
  // For ElevenLabs, we don't use explicit SSML tags.
  // Instead, we return an empty preamble and let the text formatting
  // and voice settings handle the pacing.
  // The tempo sync is achieved through:
  // 1. Strategic punctuation (added above)
  // 2. Voice settings (stability/style control speed)
  // 3. The natural rhythm of the lyrics themselves
  return "";
}

/**
 * Get recommended voice settings adjustments based on BPM.
 * Returns suggested overrides to make the voice delivery match the tempo.
 */
export function getTempoVoiceSettings(bpm: number): {
  stabilityAdjust: number;
  styleAdjust: number;
  description: string;
} {
  if (bpm < 70) {
    // Slow: more stable, less style variation for smooth delivery
    return { stabilityAdjust: 0.1, styleAdjust: -0.1, description: "Smooth, deliberate delivery" };
  } else if (bpm < 100) {
    // Medium-slow: balanced
    return { stabilityAdjust: 0.05, styleAdjust: 0, description: "Relaxed, flowing delivery" };
  } else if (bpm < 120) {
    // Medium: natural
    return { stabilityAdjust: 0, styleAdjust: 0, description: "Natural conversational pace" };
  } else if (bpm < 140) {
    // Medium-fast: slightly less stable for energy, more style
    return { stabilityAdjust: -0.05, styleAdjust: 0.1, description: "Energetic, upbeat delivery" };
  } else {
    // Fast: less stable for rapid delivery, high style for energy
    return { stabilityAdjust: -0.1, styleAdjust: 0.15, description: "Rapid, driving delivery" };
  }
}

/**
 * Estimate the BPM from genre if not explicitly provided.
 */
export function estimateBpmFromGenre(genre: string): number {
  const genreBpm: Record<string, number> = {
    "hip-hop": 90,
    "rap": 85,
    "trap": 140,
    "r&b": 75,
    "rnb": 75,
    "pop": 120,
    "rock": 130,
    "indie": 110,
    "country": 100,
    "folk": 95,
    "jazz": 110,
    "blues": 80,
    "electronic": 128,
    "edm": 128,
    "house": 125,
    "techno": 130,
    "ambient": 70,
    "lo-fi": 85,
    "lofi": 85,
    "soul": 85,
    "funk": 110,
    "reggae": 80,
    "latin": 100,
    "classical": 90,
    "metal": 140,
    "punk": 160,
    "gospel": 95,
    "christian": 90,
    "christian modern": 72,
    "christian pop": 120,
    "ccm": 100,
    "worship": 75,
    "hymn": 80,
    "hymns": 80,
    "christian rock": 130,
    "christian hip hop": 90,
    "southern gospel": 95,
    "praise & worship": 130,
    "praise and worship": 130,
    "christian r&b": 80,
    "christian rnb": 80,
    "drill": 140,
    "afrobeats": 105,
  };

  const lower = genre.toLowerCase().trim();

  // Exact match first
  if (genreBpm[lower] !== undefined) return genreBpm[lower];

  // Then try longest substring match to avoid "rap" matching before "trap"
  let bestMatch = "";
  let bestBpm = 110;
  for (const [key, bpm] of Object.entries(genreBpm)) {
    if (lower.includes(key) && key.length > bestMatch.length) {
      bestMatch = key;
      bestBpm = bpm;
    }
  }
  return bestBpm;
}
