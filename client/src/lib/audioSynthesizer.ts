/**
 * Audio Synthesizer - Converts ABC notation to playable audio using Web Audio API
 * Outputs WAV format (reliable, no external dependencies)
 */

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

  // Simple regex to match ABC notes (including rests z/Z)
  const noteRegex = /([_^]?)([A-Ga-gz])([',]*)(\d*\/?\.?\d*)/g;
  let match;

  while ((match = noteRegex.exec(noteString)) !== null) {
    const accidental = match[1];
    const noteLetter = match[2];
    const octaveModifier = match[3];
    const durationStr = match[4];

    // Check for rest
    const isRest = noteLetter.toLowerCase() === "z";

    // Determine base note
    const isLower = noteLetter === noteLetter.toLowerCase();
    const baseNote = noteLetter.toUpperCase();
    const noteKey = accidental + baseNote;

    let freq = NOTE_FREQUENCIES[noteKey] || NOTE_FREQUENCIES[baseNote] || 440;

    // Adjust octave
    if (isLower && !isRest) freq *= 2;
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

    // Add note event (skip rests)
    if (!isRest) {
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

    // Use triangle wave for a warmer sound
    osc.type = "triangle";
    osc.frequency.value = note.frequency;

    // ADSR envelope
    const attackTime = 0.02;
    const decayTime = 0.05;
    const sustainLevel = 0.6;
    const releaseTime = Math.min(0.1, note.duration * 0.2);

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

  // Convert to WAV (reliable, no external dependencies)
  const wavBlob = encodeToWav(audioBuffer, onProgress);

  onProgress?.(100);

  return { audioBuffer, blob: wavBlob };
}

/**
 * Encode AudioBuffer to WAV format
 */
function encodeToWav(
  audioBuffer: AudioBuffer,
  onProgress?: (progress: number) => void
): Blob {
  const numChannels = 1;
  const sampleRate = audioBuffer.sampleRate;
  const samples = audioBuffer.getChannelData(0);
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = samples.length * blockAlign;
  const bufferSize = 44 + dataSize;

  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  // WAV header
  writeString(view, 0, "RIFF");
  view.setUint32(4, bufferSize - 8, true);
  writeString(view, 8, "WAVE");

  // fmt chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // byte rate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // Write samples
  let offset = 44;
  const totalSamples = samples.length;
  for (let i = 0; i < totalSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;

    if (onProgress && i % 44100 === 0) {
      onProgress(70 + Math.round((i / totalSamples) * 25));
    }
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

export function createAudioUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

export function revokeAudioUrl(url: string): void {
  URL.revokeObjectURL(url);
}
