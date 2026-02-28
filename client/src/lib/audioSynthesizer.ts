/**
 * Audio Synthesizer - Converts ABC notation to playable audio using Web Audio API
 * and encodes to MP3 using lamejs
 */

// @ts-ignore - lamejs doesn't have proper types
import lamejs from "lamejs";

type NoteEvent = {
  frequency: number;
  duration: number; // in seconds
  startTime: number; // in seconds
};

const NOTE_FREQUENCIES: Record<string, number> = {
  "C": 261.63, "^C": 277.18, "_D": 277.18, "D": 293.66, "^D": 311.13,
  "_E": 311.13, "E": 329.63, "F": 349.23, "^F": 369.99, "_G": 369.99,
  "G": 392.00, "^G": 415.30, "_A": 415.30, "A": 440.00, "^A": 466.16,
  "_B": 466.16, "B": 493.88,
};

function parseAbcToNotes(abc: string, tempo: number = 120): NoteEvent[] {
  const events: NoteEvent[] = [];
  const beatDuration = 60 / tempo;

  // Extract the notes section (after K: line)
  const lines = abc.split("\n");
  let notesStarted = false;
  let noteString = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("K:")) {
      notesStarted = true;
      continue;
    }
    if (notesStarted && !trimmed.startsWith("%") && trimmed.length > 0) {
      noteString += " " + trimmed;
    }
  }

  // Remove bar lines and other markers
  noteString = noteString.replace(/\|/g, " ").replace(/\[|\]/g, " ").replace(/:/g, " ");

  let currentTime = 0;
  const defaultDuration = beatDuration; // eighth note default

  // Simple regex to match ABC notes
  const noteRegex = /([_^]?)([A-Ga-g])([',]*)(\d*\/?\.?\d*)/g;
  let match;

  while ((match = noteRegex.exec(noteString)) !== null) {
    const accidental = match[1];
    const noteLetter = match[2];
    const octaveModifier = match[3];
    const durationStr = match[4];

    // Determine base note
    const isLower = noteLetter === noteLetter.toLowerCase();
    const baseNote = noteLetter.toUpperCase();
    const noteKey = accidental + baseNote;

    let freq = NOTE_FREQUENCIES[noteKey] || NOTE_FREQUENCIES[baseNote] || 440;

    // Adjust octave
    if (isLower) freq *= 2;
    for (const ch of octaveModifier) {
      if (ch === "'") freq *= 2;
      if (ch === ",") freq /= 2;
    }

    // Parse duration
    let dur = defaultDuration;
    if (durationStr) {
      if (durationStr.includes("/")) {
        const parts = durationStr.split("/");
        const num = parseInt(parts[0]) || 1;
        const den = parseInt(parts[1]) || 2;
        dur = defaultDuration * (num / den);
      } else if (durationStr) {
        const mult = parseFloat(durationStr);
        if (!isNaN(mult) && mult > 0) {
          dur = defaultDuration * mult;
        }
      }
    }

    // Skip rests (z/Z)
    if (baseNote !== "Z") {
      events.push({
        frequency: freq,
        duration: dur * 0.9, // slight gap between notes
        startTime: currentTime,
      });
    }

    currentTime += dur;
  }

  return events;
}

export async function synthesizeAudio(
  abcNotation: string,
  tempo: number = 120,
  onProgress?: (progress: number) => void
): Promise<{ audioBuffer: AudioBuffer; blob: Blob }> {
  const notes = parseAbcToNotes(abcNotation, tempo);

  if (notes.length === 0) {
    throw new Error("No notes found in the ABC notation");
  }

  const sampleRate = 44100;
  const totalDuration = Math.max(...notes.map(n => n.startTime + n.duration)) + 0.5;
  const numSamples = Math.ceil(totalDuration * sampleRate);

  // Create offline audio context
  const offlineCtx = new OfflineAudioContext(1, numSamples, sampleRate);

  // Create notes with envelope
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const osc = offlineCtx.createOscillator();
    const gainNode = offlineCtx.createGain();

    // Use a mix of sine and triangle for a richer sound
    osc.type = "triangle";
    osc.frequency.value = note.frequency;

    // ADSR envelope
    const attackTime = 0.02;
    const decayTime = 0.05;
    const sustainLevel = 0.6;
    const releaseTime = 0.1;

    gainNode.gain.setValueAtTime(0, note.startTime);
    gainNode.gain.linearRampToValueAtTime(0.4, note.startTime + attackTime);
    gainNode.gain.linearRampToValueAtTime(0.4 * sustainLevel, note.startTime + attackTime + decayTime);
    gainNode.gain.setValueAtTime(0.4 * sustainLevel, note.startTime + note.duration - releaseTime);
    gainNode.gain.linearRampToValueAtTime(0, note.startTime + note.duration);

    osc.connect(gainNode);
    gainNode.connect(offlineCtx.destination);

    osc.start(note.startTime);
    osc.stop(note.startTime + note.duration);

    if (onProgress) {
      onProgress(Math.round((i / notes.length) * 50));
    }
  }

  // Add a subtle pad/harmony layer
  if (notes.length > 4) {
    const chordNotes = notes.filter((_, i) => i % 4 === 0);
    for (const note of chordNotes) {
      const osc = offlineCtx.createOscillator();
      const gainNode = offlineCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = note.frequency / 2; // one octave lower
      gainNode.gain.setValueAtTime(0, note.startTime);
      gainNode.gain.linearRampToValueAtTime(0.08, note.startTime + 0.1);
      gainNode.gain.setValueAtTime(0.08, note.startTime + note.duration - 0.1);
      gainNode.gain.linearRampToValueAtTime(0, note.startTime + note.duration);
      osc.connect(gainNode);
      gainNode.connect(offlineCtx.destination);
      osc.start(note.startTime);
      osc.stop(note.startTime + note.duration);
    }
  }

  onProgress?.(60);

  const audioBuffer = await offlineCtx.startRendering();

  onProgress?.(70);

  // Convert to MP3
  const mp3Blob = await encodeToMp3(audioBuffer, onProgress);

  onProgress?.(100);

  return { audioBuffer, blob: mp3Blob };
}

async function encodeToMp3(
  audioBuffer: AudioBuffer,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const samples = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;

  const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, 128);
  const mp3Data: BlobPart[] = [];

  const sampleBlockSize = 1152;
  const totalBlocks = Math.ceil(samples.length / sampleBlockSize);

  for (let i = 0; i < samples.length; i += sampleBlockSize) {
    const blockEnd = Math.min(i + sampleBlockSize, samples.length);
    const block = samples.subarray(i, blockEnd);

    // Convert float samples to int16
    const int16 = new Int16Array(block.length);
    for (let j = 0; j < block.length; j++) {
      const s = Math.max(-1, Math.min(1, block[j]));
      int16[j] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    const mp3buf = mp3encoder.encodeBuffer(int16);
    if (mp3buf.length > 0) {
      mp3Data.push(new Blob([mp3buf]));
    }

    const currentBlock = Math.floor(i / sampleBlockSize);
    if (onProgress && currentBlock % 10 === 0) {
      onProgress(70 + Math.round((currentBlock / totalBlocks) * 25));
    }
  }

  const end = mp3encoder.flush();
  if (end.length > 0) {
    mp3Data.push(new Blob([end]));
  }

  return new Blob(mp3Data, { type: "audio/mpeg" });
}

export function createAudioUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

export function revokeAudioUrl(url: string): void {
  URL.revokeObjectURL(url);
}
