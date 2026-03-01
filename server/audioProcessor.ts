/**
 * Studio-Grade Audio Post-Processing Module
 * Uses FFmpeg for reverb, EQ, compression, and vocal-instrumental mixing.
 */

import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, unlink, mkdtemp } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { nanoid } from "nanoid";
import { storagePut } from "./storage";
import axios from "axios";

const execAsync = promisify(exec);

// ─── Processing Presets ───

export type ProcessingPreset = "raw" | "warm" | "bright" | "radio-ready" | "cinematic";

interface PresetConfig {
  label: string;
  description: string;
  eq: string;       // FFmpeg equalizer filter
  compressor: string; // FFmpeg acompressor filter
  reverb: string;    // FFmpeg aecho/reverb filter
  limiter: string;   // FFmpeg limiter
  normalize: boolean;
}

const PRESETS: Record<ProcessingPreset, PresetConfig> = {
  raw: {
    label: "Raw",
    description: "No processing — original audio as generated",
    eq: "",
    compressor: "",
    reverb: "",
    limiter: "",
    normalize: false,
  },
  warm: {
    label: "Warm",
    description: "Gentle warmth with subtle low-end boost and soft compression",
    // Boost lows slightly, gentle high roll-off
    eq: "equalizer=f=200:t=q:w=1.5:g=3,equalizer=f=8000:t=q:w=1:g=-2",
    // Gentle compression
    compressor: "acompressor=threshold=-20dB:ratio=3:attack=20:release=200:makeup=2",
    // Subtle room reverb
    reverb: "aecho=0.8:0.7:40:0.3",
    limiter: "alimiter=limit=0.95:attack=5:release=50",
    normalize: true,
  },
  bright: {
    label: "Bright",
    description: "Crisp highs with presence boost for clarity and air",
    // Boost presence and air frequencies
    eq: "equalizer=f=3000:t=q:w=1.5:g=3,equalizer=f=10000:t=q:w=1:g=4,equalizer=f=200:t=q:w=1:g=-1",
    // Medium compression for punch
    compressor: "acompressor=threshold=-18dB:ratio=4:attack=10:release=150:makeup=3",
    // Short bright reverb
    reverb: "aecho=0.8:0.6:25:0.25",
    limiter: "alimiter=limit=0.95:attack=3:release=30",
    normalize: true,
  },
  "radio-ready": {
    label: "Radio Ready",
    description: "Broadcast-quality mastering with full-spectrum polish",
    // Balanced EQ: slight low boost, presence lift, air
    eq: "equalizer=f=80:t=q:w=1:g=2,equalizer=f=250:t=q:w=1.5:g=-1,equalizer=f=3500:t=q:w=1.5:g=3,equalizer=f=12000:t=q:w=1:g=2",
    // Aggressive but musical compression
    compressor: "acompressor=threshold=-16dB:ratio=5:attack=5:release=100:makeup=4",
    // Plate reverb feel
    reverb: "aecho=0.8:0.75:35|45:0.3|0.2",
    limiter: "alimiter=limit=0.98:attack=2:release=20",
    normalize: true,
  },
  cinematic: {
    label: "Cinematic",
    description: "Wide, dramatic sound with deep reverb and expansive stereo",
    // Deep lows, scooped mids, sparkling highs
    eq: "equalizer=f=60:t=q:w=1:g=4,equalizer=f=500:t=q:w=2:g=-2,equalizer=f=5000:t=q:w=1:g=2,equalizer=f=14000:t=q:w=0.7:g=3",
    // Light compression to preserve dynamics
    compressor: "acompressor=threshold=-22dB:ratio=2.5:attack=30:release=300:makeup=2",
    // Long hall reverb
    reverb: "aecho=0.8:0.8:60|80|100:0.4|0.3|0.2",
    limiter: "alimiter=limit=0.93:attack=5:release=80",
    normalize: true,
  },
};

export function getPresets(): { id: ProcessingPreset; label: string; description: string }[] {
  return Object.entries(PRESETS).map(([id, config]) => ({
    id: id as ProcessingPreset,
    label: config.label,
    description: config.description,
  }));
}

// ─── Helper: Download URL to temp file ───

async function downloadToFile(url: string, filePath: string): Promise<void> {
  const response = await axios.get(url, { responseType: "arraybuffer", timeout: 60000 });
  await writeFile(filePath, Buffer.from(response.data));
}

// ─── Helper: Create temp directory ───

async function createTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "audio-proc-"));
}

// ─── Helper: Cleanup temp files ───

async function cleanup(...files: string[]): Promise<void> {
  for (const f of files) {
    try { await unlink(f); } catch { /* ignore */ }
  }
}

// ─── Audio Post-Processing ───

/**
 * Apply studio-grade post-processing to an audio file.
 * Downloads from URL, processes with FFmpeg, uploads to S3.
 */
export async function postProcessAudio(
  audioUrl: string,
  preset: ProcessingPreset,
  userId: number,
  prefix: string = "processed"
): Promise<{ url: string; key: string }> {
  if (preset === "raw") {
    // No processing needed
    return { url: audioUrl, key: "" };
  }

  const config = PRESETS[preset];
  if (!config) {
    throw new Error(`Unknown processing preset: ${preset}`);
  }

  const tempDir = await createTempDir();
  const inputFile = join(tempDir, `input-${nanoid(8)}.mp3`);
  const outputFile = join(tempDir, `output-${nanoid(8)}.mp3`);

  try {
    // Download the source audio
    await downloadToFile(audioUrl, inputFile);

    // Build FFmpeg filter chain
    const filters: string[] = [];
    if (config.eq) filters.push(config.eq);
    if (config.compressor) filters.push(config.compressor);
    if (config.reverb) filters.push(config.reverb);
    if (config.limiter) filters.push(config.limiter);
    if (config.normalize) filters.push("loudnorm=I=-14:TP=-1:LRA=11");

    const filterChain = filters.join(",");

    // Run FFmpeg
    const cmd = `ffmpeg -y -i "${inputFile}" -af "${filterChain}" -b:a 192k -ar 44100 "${outputFile}" 2>&1`;
    await execAsync(cmd, { timeout: 120000 });

    // Upload processed audio to S3
    const buffer = await readFile(outputFile);
    const fileKey = `${prefix}/${userId}/${nanoid()}.mp3`;
    const { url } = await storagePut(fileKey, buffer, "audio/mpeg");

    return { url, key: fileKey };
  } finally {
    await cleanup(inputFile, outputFile);
    // Try to remove temp dir
    try { await execAsync(`rm -rf "${tempDir}"`); } catch { /* ignore */ }
  }
}

// ─── Vocal-Instrumental Mixing ───

/**
 * Mix a vocal track over an instrumental track with proper volume balance.
 * vocalLevel: dB adjustment for vocal (e.g., 0 = same level, 3 = louder, -3 = quieter)
 * instrumentalLevel: dB adjustment for instrumental
 */
export async function mixVocalInstrumental(
  instrumentalUrl: string,
  vocalUrl: string,
  userId: number,
  options: {
    vocalLevel?: number;      // dB, default 2 (slightly louder vocals)
    instrumentalLevel?: number; // dB, default -3 (bed the instrumental)
    preset?: ProcessingPreset;  // Apply post-processing to the mix
  } = {}
): Promise<{ mixedUrl: string; mixedKey: string }> {
  const {
    vocalLevel = 2,
    instrumentalLevel = -3,
    preset = "radio-ready",
  } = options;

  const tempDir = await createTempDir();
  const instrFile = join(tempDir, `instr-${nanoid(8)}.mp3`);
  const vocalFile = join(tempDir, `vocal-${nanoid(8)}.mp3`);
  const mixFile = join(tempDir, `mix-${nanoid(8)}.mp3`);

  try {
    // Download both tracks
    await Promise.all([
      downloadToFile(instrumentalUrl, instrFile),
      downloadToFile(vocalUrl, vocalFile),
    ]);

    // Build the mixing filter
    // Adjust levels, then mix together, then apply post-processing
    const postFilters: string[] = [];
    const config = PRESETS[preset];
    if (preset !== "raw" && config) {
      if (config.eq) postFilters.push(config.eq);
      if (config.compressor) postFilters.push(config.compressor);
      if (config.limiter) postFilters.push(config.limiter);
      if (config.normalize) postFilters.push("loudnorm=I=-14:TP=-1:LRA=11");
    }

    const postChain = postFilters.length > 0 ? `[mixed]${postFilters.join(",")}[out]` : "[mixed]acopy[out]";

    const filterComplex = [
      `[0:a]volume=${instrumentalLevel}dB[instr]`,
      `[1:a]volume=${vocalLevel}dB[vocal]`,
      `[instr][vocal]amix=inputs=2:duration=longest:dropout_transition=3[mixed]`,
      postChain,
    ].join(";");

    const cmd = `ffmpeg -y -i "${instrFile}" -i "${vocalFile}" -filter_complex "${filterComplex}" -map "[out]" -b:a 192k -ar 44100 "${mixFile}" 2>&1`;
    await execAsync(cmd, { timeout: 120000 });

    // Upload mixed audio to S3
    const buffer = await readFile(mixFile);
    const fileKey = `mixed/${userId}/${nanoid()}.mp3`;
    const { url } = await storagePut(fileKey, buffer, "audio/mpeg");

    return { mixedUrl: url, mixedKey: fileKey };
  } finally {
    await cleanup(instrFile, vocalFile, mixFile);
    try { await execAsync(`rm -rf "${tempDir}"`); } catch { /* ignore */ }
  }
}

// ─── Stem Export ───

/**
 * Prepare stems for download. Returns URLs for instrumental and vocal tracks.
 * If post-processing is requested, applies it to each stem individually.
 */
export async function prepareStemDownloads(
  instrumentalUrl: string,
  vocalUrl: string,
  userId: number,
  preset: ProcessingPreset = "raw"
): Promise<{
  instrumentalStemUrl: string;
  vocalStemUrl: string;
  instrumentalStemKey: string;
  vocalStemKey: string;
}> {
  if (preset === "raw") {
    // Return original URLs as-is
    return {
      instrumentalStemUrl: instrumentalUrl,
      vocalStemUrl: vocalUrl,
      instrumentalStemKey: "",
      vocalStemKey: "",
    };
  }

  // Apply post-processing to each stem
  const [instrResult, vocalResult] = await Promise.all([
    postProcessAudio(instrumentalUrl, preset, userId, "stems/instrumental"),
    postProcessAudio(vocalUrl, preset, userId, "stems/vocal"),
  ]);

  return {
    instrumentalStemUrl: instrResult.url,
    vocalStemUrl: vocalResult.url,
    instrumentalStemKey: instrResult.key,
    vocalStemKey: vocalResult.key,
  };
}
