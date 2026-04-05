/**
 * ABC Notation Playback Engine
 * Uses the Web Audio API to synthesize and play ABC notation
 * directly in the browser with piano-like tones.
 *
 * Also exposes a note-timing map so consumers can highlight
 * the currently-playing note in the rendered sheet music.
 */

// ─── Types ───

export interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  tempo: number;
  /** Index into the scheduledNotes array for the note currently sounding (-1 = none) */
  activeNoteIndex: number;
}

export type PlaybackCallback = (state: PlaybackState) => void;

/** Timing entry exposed to consumers for mapping notes to SVG elements */
export interface NoteTiming {
  /** Seconds from start (before tempo multiplier) */
  startTime: number;
  /** Duration in seconds (before tempo multiplier) */
  duration: number;
  /** True for rests (no audible pitch) */
  isRest: boolean;
}

// ─── Key Signature Accidentals ───────────────────────────────────────────────
// Maps key names to the set of note letters that are sharped (+1) or flatted (-1).
const KEY_ACCIDENTALS: Record<string, Record<string, number>> = {
  "C": {}, "Am": {},
  "G": { F: 1 }, "Em": { F: 1 },
  "D": { F: 1, C: 1 }, "Bm": { F: 1, C: 1 },
  "A": { F: 1, C: 1, G: 1 }, "F#m": { F: 1, C: 1, G: 1 },
  "E": { F: 1, C: 1, G: 1, D: 1 }, "C#m": { F: 1, C: 1, G: 1, D: 1 },
  "B": { F: 1, C: 1, G: 1, D: 1, A: 1 }, "G#m": { F: 1, C: 1, G: 1, D: 1, A: 1 },
  "F#": { F: 1, C: 1, G: 1, D: 1, A: 1, E: 1 }, "D#m": { F: 1, C: 1, G: 1, D: 1, A: 1, E: 1 },
  "C#": { F: 1, C: 1, G: 1, D: 1, A: 1, E: 1, B: 1 }, "A#m": { F: 1, C: 1, G: 1, D: 1, A: 1, E: 1, B: 1 },
  "F": { B: -1 }, "Dm": { B: -1 },
  "Bb": { B: -1, E: -1 }, "Gm": { B: -1, E: -1 },
  "Eb": { B: -1, E: -1, A: -1 }, "Cm": { B: -1, E: -1, A: -1 },
  "Ab": { B: -1, E: -1, A: -1, D: -1 }, "Fm": { B: -1, E: -1, A: -1, D: -1 },
  "Db": { B: -1, E: -1, A: -1, D: -1, G: -1 }, "Bbm": { B: -1, E: -1, A: -1, D: -1, G: -1 },
  "Gb": { B: -1, E: -1, A: -1, D: -1, G: -1, C: -1 }, "Ebm": { B: -1, E: -1, A: -1, D: -1, G: -1, C: -1 },
  "Cb": { B: -1, E: -1, A: -1, D: -1, G: -1, C: -1, F: -1 }, "Abm": { B: -1, E: -1, A: -1, D: -1, G: -1, C: -1, F: -1 },
};

/**
 * Parse the K: header value into a normalized key name for lookup.
 * Handles "C", "Am", "Cmaj", "Cmin", "C minor", "Cmix", etc.
 */
function normalizeKeyName(keyStr: string): string {
  const match = keyStr.trim().match(/^([A-G][#b]?)\s*(m|min|minor)?/i);
  if (!match) return "C";
  const root = match[1];
  const isMinor = !!match[2];
  return root + (isMinor ? "m" : "");
}

// ─── ABC Note to Frequency Mapping ───

// MIDI note number to frequency (A4 = 440 Hz)
function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// ABC note to MIDI pitch mapping (middle C = 60, no accidentals)
const NOTE_MAP: Record<string, number> = {
  C: 60, D: 62, E: 64, F: 65, G: 67, A: 69, B: 71,
  c: 72, d: 74, e: 76, f: 77, g: 79, a: 81, b: 83,
};

// ─── Parse ABC Headers ───

interface ABCHeaders {
  tempo: number;
  meter: [number, number];
  defaultNoteLength: [number, number];
  key: string;
}

function parseHeaders(abc: string): ABCHeaders {
  const lines = abc.split("\n");
  const headers: ABCHeaders = {
    tempo: 120,
    meter: [4, 4],
    defaultNoteLength: [1, 8],
    key: "C",
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("Q:")) {
      const qMatch = trimmed.substring(2).trim().match(/(?:\d+\/\d+=)?(\d+)/);
      if (qMatch) headers.tempo = parseInt(qMatch[1], 10);
    } else if (trimmed.startsWith("M:")) {
      const mMatch = trimmed.substring(2).trim().match(/(\d+)\/(\d+)/);
      if (mMatch) headers.meter = [parseInt(mMatch[1], 10), parseInt(mMatch[2], 10)];
    } else if (trimmed.startsWith("L:")) {
      const lMatch = trimmed.substring(2).trim().match(/(\d+)\/(\d+)/);
      if (lMatch) headers.defaultNoteLength = [parseInt(lMatch[1], 10), parseInt(lMatch[2], 10)];
    } else if (trimmed.startsWith("K:")) {
      headers.key = trimmed.substring(2).trim();
    }
  }

  return headers;
}

// ─── Parse Duration ───

function parseDuration(durationStr: string, defaultLength: [number, number], bps: number): number {
  const defaultBeats = (defaultLength[0] / defaultLength[1]) * 4;
  const defaultSeconds = defaultBeats / bps;

  if (!durationStr || durationStr.length === 0) return defaultSeconds;

  const slashMatch = durationStr.match(/^(\d*)\/(\d*)/);
  if (slashMatch) {
    const num = slashMatch[1] ? parseInt(slashMatch[1], 10) : 1;
    const den = slashMatch[2] ? parseInt(slashMatch[2], 10) : 2;
    return defaultSeconds * (num / den);
  }

  const multiplier = parseInt(durationStr, 10);
  if (!isNaN(multiplier)) return defaultSeconds * multiplier;

  return defaultSeconds;
}

// ─── Parse ABC into Scheduled Notes ───

interface ScheduledNote {
  pitch: number;
  startTime: number;
  duration: number;
  velocity: number;
}

function parseABCToSchedule(abc: string): { notes: ScheduledNote[]; duration: number; tempo: number } {
  const headers = parseHeaders(abc);
  const bps = headers.tempo / 60;
  const notes: ScheduledNote[] = [];
  let currentTime = 0;
  const currentVelocity = 80;

  // Get key signature accidentals
  const keyName = normalizeKeyName(headers.key);
  const keyAccidentals = KEY_ACCIDENTALS[keyName] || {};

  // Track per-measure accidentals (reset at each bar line)
  // In ABC, an explicit accidental applies to the rest of the measure for that note letter
  let measureAccidentals: Record<string, number> = {};

  const lines = abc.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[A-Z]:/.test(trimmed) && !trimmed.startsWith("w:")) continue;
    if (trimmed.startsWith("w:")) continue;
    if (!trimmed || trimmed.startsWith("%")) continue;

    let i = 0;
    while (i < trimmed.length) {
      const ch = trimmed[i];

      // Bar lines reset measure accidentals
      if (ch === "|") {
        measureAccidentals = {};
        i++;
        continue;
      }

      if (ch === ":") { i++; continue; }

      if (ch === "!") {
        const endBang = trimmed.indexOf("!", i + 1);
        if (endBang > i) {
          i = endBang + 1;
          continue;
        }
        i++; continue;
      }

      if (ch === '"') {
        const endQuote = trimmed.indexOf('"', i + 1);
        if (endQuote > i) { i = endQuote + 1; continue; }
        i++; continue;
      }

      if (ch === "[") {
        const endBracket = trimmed.indexOf("]", i + 1);
        if (endBracket > i) { i = endBracket + 1; continue; }
        i++; continue;
      }

      // Handle rests
      if (ch === "z" || ch === "Z") {
        i++;
        let durStr = "";
        while (i < trimmed.length && /[\d\/]/.test(trimmed[i])) {
          durStr += trimmed[i]; i++;
        }
        const duration = parseDuration(durStr, headers.defaultNoteLength, bps);
        notes.push({ pitch: 0, startTime: currentTime, duration, velocity: 0 });
        currentTime += duration;
        continue;
      }

      // Handle explicit accidentals
      let explicitAccidental: number | null = null;
      if (ch === "^") { explicitAccidental = 1; i++; if (i < trimmed.length && trimmed[i] === "^") { explicitAccidental = 2; i++; } }
      else if (ch === "_") { explicitAccidental = -1; i++; if (i < trimmed.length && trimmed[i] === "_") { explicitAccidental = -2; i++; } }
      else if (ch === "=") { explicitAccidental = 0; i++; } // natural — overrides key sig

      if (i < trimmed.length && /[A-Ga-g]/.test(trimmed[i])) {
        const noteLetter = trimmed[i];
        const upperLetter = noteLetter.toUpperCase();
        let pitch = NOTE_MAP[noteLetter];
        if (pitch === undefined) { i++; continue; }

        // Apply accidental: explicit > measure > key signature
        let accidental: number;
        if (explicitAccidental !== null) {
          accidental = explicitAccidental;
          // Record this accidental for the rest of the measure
          measureAccidentals[upperLetter] = explicitAccidental;
        } else if (measureAccidentals[upperLetter] !== undefined) {
          // A previous explicit accidental in this measure applies
          accidental = measureAccidentals[upperLetter];
        } else {
          // Fall back to key signature
          accidental = keyAccidentals[upperLetter] || 0;
        }

        pitch += accidental;
        i++;

        while (i < trimmed.length) {
          if (trimmed[i] === "'") { pitch += 12; i++; }
          else if (trimmed[i] === ",") { pitch -= 12; i++; }
          else break;
        }

        let durStr = "";
        while (i < trimmed.length && /[\d\/]/.test(trimmed[i])) {
          durStr += trimmed[i]; i++;
        }

        // Handle ties: if next non-space char is a dash, combine durations
        const duration = parseDuration(durStr, headers.defaultNoteLength, bps);

        notes.push({ pitch, startTime: currentTime, duration, velocity: currentVelocity });
        currentTime += duration;
        continue;
      }

      // If we had an accidental but no note followed, just skip
      if (explicitAccidental !== null) continue;

      i++;
    }
  }

  return { notes, duration: currentTime, tempo: headers.tempo };
}

// ─── Piano Synthesizer ───

function createPianoTone(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  velocity: number,
  masterGain: GainNode
): void {
  const vol = (velocity / 127) * 0.3;

  const harmonics = [
    { ratio: 1, gain: 1.0 },
    { ratio: 2, gain: 0.5 },
    { ratio: 3, gain: 0.15 },
    { ratio: 4, gain: 0.08 },
    { ratio: 5, gain: 0.03 },
  ];

  for (const h of harmonics) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = h.ratio === 1 ? "triangle" : "sine";
    osc.frequency.setValueAtTime(frequency * h.ratio, startTime);

    const noteGain = vol * h.gain;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(noteGain, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(noteGain * 0.7, startTime + 0.08);
    const sustainEnd = startTime + Math.max(duration - 0.05, 0.1);
    gain.gain.setValueAtTime(noteGain * 0.7, sustainEnd);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration + 0.1);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.15);
  }
}

// ─── Active Note Lookup ───

/**
 * Binary-search style lookup: given the current playback time (already
 * adjusted for tempo multiplier), return the index of the note that is
 * currently sounding, or -1 if none.
 */
function findActiveNoteIndex(notes: ScheduledNote[], time: number, tempoMultiplier: number): number {
  if (notes.length === 0 || time < 0) return -1;

  // Walk backwards from the end to find the latest note whose adjusted
  // start time is <= current time and whose end time is > current time.
  for (let i = notes.length - 1; i >= 0; i--) {
    const n = notes[i];
    const start = n.startTime / tempoMultiplier;
    const end = start + n.duration / tempoMultiplier;
    if (start <= time && time < end) return i;
  }
  return -1;
}

// ─── ABCPlayer Class ───

export class ABCPlayer {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private scheduledNotes: ScheduledNote[] = [];
  private totalDuration = 0;
  private tempo = 120;
  private startedAt = 0;
  private pausedAt = 0;
  private _isPlaying = false;
  private _isPaused = false;
  private animationFrame: number | null = null;
  private callback: PlaybackCallback | null = null;
  private currentAbc = "";
  private tempoMultiplier = 1;

  get isPlaying(): boolean { return this._isPlaying; }
  get isPaused(): boolean { return this._isPaused; }

  /**
   * Set a callback to receive playback state updates (~60fps).
   */
  onStateChange(cb: PlaybackCallback): void {
    this.callback = cb;
  }

  /**
   * Return the note-timing map so consumers can correlate indices
   * with rendered SVG note elements.
   */
  getNoteTimings(): NoteTiming[] {
    return this.scheduledNotes.map((n) => ({
      startTime: n.startTime,
      duration: n.duration,
      isRest: n.pitch === 0,
    }));
  }

  /**
   * Load ABC notation and prepare for playback.
   */
  load(abc: string): void {
    this.stop();
    this.currentAbc = abc;
    const parsed = parseABCToSchedule(abc);
    this.scheduledNotes = parsed.notes;
    this.totalDuration = parsed.duration;
    this.tempo = parsed.tempo;
    this.emitState();
  }

  /**
   * Set tempo multiplier (0.5 = half speed, 2.0 = double speed).
   */
  setTempoMultiplier(multiplier: number): void {
    const wasPlaying = this._isPlaying && !this._isPaused;
    const currentPos = this.getCurrentTime();

    this.tempoMultiplier = Math.max(0.25, Math.min(4, multiplier));

    if (wasPlaying) {
      this.stopAudio();
      this.scheduleFrom(currentPos);
    }
    this.emitState();
  }

  /**
   * Start or resume playback.
   */
  play(): void {
    if (!this.currentAbc) return;

    if (!this.audioCtx || this.audioCtx.state === "closed") {
      this.audioCtx = new AudioContext();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(0.8, this.audioCtx.currentTime);
      this.masterGain.connect(this.audioCtx.destination);
    }

    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }

    if (this._isPaused) {
      this.scheduleFrom(this.pausedAt);
      this._isPaused = false;
    } else {
      this.scheduleFrom(0);
    }

    this._isPlaying = true;
    this.startAnimationLoop();
    this.emitState();
  }

  /**
   * Pause playback.
   */
  pause(): void {
    if (!this._isPlaying || this._isPaused) return;

    this.pausedAt = this.getCurrentTime();
    this.stopAudio();
    this._isPaused = true;
    this.cancelAnimationLoop();
    this.emitState();
  }

  /**
   * Stop playback and reset to beginning.
   */
  stop(): void {
    this.stopAudio();
    this._isPlaying = false;
    this._isPaused = false;
    this.pausedAt = 0;
    this.cancelAnimationLoop();
    this.emitState();
  }

  /**
   * Seek to a specific position (0 to 1).
   */
  seek(position: number): void {
    const targetTime = position * this.getAdjustedDuration();
    const wasPlaying = this._isPlaying && !this._isPaused;

    this.stopAudio();

    if (wasPlaying) {
      this.scheduleFrom(targetTime);
      this._isPlaying = true;
      this._isPaused = false;
      this.startAnimationLoop();
    } else {
      this.pausedAt = targetTime;
      this._isPaused = this._isPlaying;
    }

    this.emitState();
  }

  /**
   * Clean up all resources.
   */
  dispose(): void {
    this.stop();
    if (this.audioCtx && this.audioCtx.state !== "closed") {
      this.audioCtx.close().catch(() => {});
    }
    this.audioCtx = null;
    this.masterGain = null;
    this.callback = null;
  }

  // ─── Private Methods ───

  private getAdjustedDuration(): number {
    return this.totalDuration / this.tempoMultiplier;
  }

  private getCurrentTime(): number {
    if (!this.audioCtx || !this._isPlaying) return this.pausedAt;
    if (this._isPaused) return this.pausedAt;
    return (this.audioCtx.currentTime - this.startedAt);
  }

  private scheduleFrom(fromTime: number): void {
    if (!this.audioCtx || !this.masterGain) return;

    const wasCtx = this.audioCtx;
    if (wasCtx.state !== "closed") {
      this.audioCtx = new AudioContext();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(0.8, this.audioCtx.currentTime);
      this.masterGain.connect(this.audioCtx.destination);
      wasCtx.close().catch(() => {});
    }

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    this.startedAt = now - fromTime;
    const adjustedDuration = this.getAdjustedDuration();

    for (const note of this.scheduledNotes) {
      if (note.pitch === 0 || note.velocity === 0) continue;

      const noteStart = note.startTime / this.tempoMultiplier;
      const noteDur = note.duration / this.tempoMultiplier;

      if (noteStart + noteDur <= fromTime) continue;

      const scheduleTime = now + Math.max(0, noteStart - fromTime);
      const actualDur = noteStart < fromTime
        ? noteDur - (fromTime - noteStart)
        : noteDur;

      if (actualDur <= 0) continue;

      const freq = midiToFreq(note.pitch);
      createPianoTone(ctx, freq, scheduleTime, actualDur, note.velocity, this.masterGain!);
    }

    const remainingTime = adjustedDuration - fromTime;
    if (remainingTime > 0) {
      setTimeout(() => {
        if (this._isPlaying && !this._isPaused) {
          this.stop();
        }
      }, remainingTime * 1000 + 200);
    }
  }

  private stopAudio(): void {
    if (this.audioCtx && this.audioCtx.state !== "closed") {
      this.audioCtx.close().catch(() => {});
    }
    this.audioCtx = null;
    this.masterGain = null;
  }

  private startAnimationLoop(): void {
    this.cancelAnimationLoop();
    const tick = () => {
      this.emitState();
      if (this._isPlaying && !this._isPaused) {
        this.animationFrame = requestAnimationFrame(tick);
      }
    };
    this.animationFrame = requestAnimationFrame(tick);
  }

  private cancelAnimationLoop(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  private emitState(): void {
    if (!this.callback) return;
    const adjustedDuration = this.getAdjustedDuration();
    const ct = Math.min(this.getCurrentTime(), adjustedDuration);
    const activeNoteIndex = (this._isPlaying && !this._isPaused)
      ? findActiveNoteIndex(this.scheduledNotes, ct, this.tempoMultiplier)
      : (this._isPaused
          ? findActiveNoteIndex(this.scheduledNotes, ct, this.tempoMultiplier)
          : -1);
    this.callback({
      isPlaying: this._isPlaying,
      isPaused: this._isPaused,
      currentTime: ct,
      duration: adjustedDuration,
      tempo: Math.round(this.tempo * this.tempoMultiplier),
      activeNoteIndex,
    });
  }
}

// ─── Singleton Helper ───

let playerInstance: ABCPlayer | null = null;

export function getPlayer(): ABCPlayer {
  if (!playerInstance) {
    playerInstance = new ABCPlayer();
  }
  return playerInstance;
}

/**
 * Format seconds into mm:ss display.
 */
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
