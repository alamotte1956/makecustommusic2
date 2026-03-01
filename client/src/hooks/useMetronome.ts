import { useRef, useState, useCallback, useEffect } from "react";

// ─── Types ───

export interface StrumBeat {
  /** "D" = down, "U" = up, "x" = muted/ghost, "." = rest */
  direction: "D" | "U" | "x" | ".";
  /** Whether this is the accented (first) beat of the measure */
  accent: boolean;
  /** 0-based index within the pattern */
  index: number;
}

export interface MetronomeState {
  isPlaying: boolean;
  bpm: number;
  currentBeat: number;
  beats: StrumBeat[];
  volume: number;
  /** Number of beats per measure (from time signature) */
  beatsPerMeasure: number;
}

export interface MetronomeControls {
  start: () => void;
  stop: () => void;
  toggle: () => void;
  setBpm: (bpm: number) => void;
  setVolume: (vol: number) => void;
  tapTempo: () => void;
}

// ─── Helpers ───

/** Parse a strumming pattern string into structured beats */
export function parseStrummingPattern(pattern: string, beatsPerMeasure: number): StrumBeat[] {
  if (!pattern || pattern.trim().length === 0) {
    // Default: all down strums for the time signature
    return Array.from({ length: beatsPerMeasure }, (_, i) => ({
      direction: "D" as const,
      accent: i === 0,
      index: i,
    }));
  }

  // Normalize: split by spaces, commas, dashes, or individual chars
  const tokens: string[] = [];
  const cleaned = pattern.trim();

  // Try splitting by spaces first
  const spaceSplit = cleaned.split(/[\s,]+/).filter(Boolean);
  if (spaceSplit.length > 1) {
    for (const token of spaceSplit) {
      tokens.push(token.toUpperCase());
    }
  } else {
    // Single string like "DDUUDU" — split each char
    for (const ch of cleaned) {
      if (/[DdUuXx.]/.test(ch)) {
        tokens.push(ch.toUpperCase());
      }
    }
  }

  if (tokens.length === 0) {
    return Array.from({ length: beatsPerMeasure }, (_, i) => ({
      direction: "D" as const,
      accent: i === 0,
      index: i,
    }));
  }

  return tokens.map((token, i) => {
    let direction: StrumBeat["direction"] = "D";
    if (token === "U" || token === "UP") direction = "U";
    else if (token === "X" || token === "MUTE" || token === "M") direction = "x";
    else if (token === "." || token === "-" || token === "REST") direction = ".";
    // else D, DOWN, etc. → "D"

    return {
      direction,
      accent: i % beatsPerMeasure === 0,
      index: i,
    };
  });
}

/** Parse time signature string like "4/4" into beats per measure */
export function parseTimeSignature(timeSig: string): number {
  if (!timeSig) return 4;
  const match = timeSig.match(/^(\d+)\/(\d+)$/);
  if (!match) return 4;
  const numerator = parseInt(match[1], 10);
  // For compound meters like 6/8, the "feel" is in groups of 3
  // but we return the actual beat count for visual display
  return numerator || 4;
}

// ─── Hook ───

export function useMetronome(
  initialBpm: number = 120,
  strummingPattern: string = "",
  timeSignature: string = "4/4"
): [MetronomeState, MetronomeControls] {
  const beatsPerMeasure = parseTimeSignature(timeSignature);
  const beats = parseStrummingPattern(strummingPattern, beatsPerMeasure);

  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpmState] = useState(Math.max(30, Math.min(300, initialBpm)));
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [volume, setVolumeState] = useState(0.7);

  // Refs for Web Audio scheduling
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextBeatTimeRef = useRef(0);
  const currentBeatRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);
  const bpmRef = useRef(bpm);
  const volumeRef = useRef(volume);
  const beatsRef = useRef(beats);

  // Tap tempo tracking
  const tapTimesRef = useRef<number[]>([]);

  // Keep refs in sync
  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    beatsRef.current = beats;
  }, [beats]);

  // Create a click sound using oscillator
  const playClick = useCallback((time: number, isAccent: boolean, beatDirection: StrumBeat["direction"]) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const vol = volumeRef.current;
    if (vol <= 0) return;

    // Skip rests — no sound
    if (beatDirection === ".") return;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    if (beatDirection === "x") {
      // Muted/ghost note: short noise-like click
      osc.type = "triangle";
      osc.frequency.setValueAtTime(200, time);
      gainNode.gain.setValueAtTime(vol * 0.15, time);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
      osc.start(time);
      osc.stop(time + 0.03);
    } else if (isAccent) {
      // Accent beat: higher pitch, louder
      osc.type = "sine";
      osc.frequency.setValueAtTime(1200, time);
      gainNode.gain.setValueAtTime(vol * 0.5, time);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
      osc.start(time);
      osc.stop(time + 0.08);
    } else {
      // Normal beat
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, time);
      gainNode.gain.setValueAtTime(vol * 0.35, time);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
      osc.start(time);
      osc.stop(time + 0.06);
    }
  }, []);

  // Scheduler: looks ahead and schedules clicks
  const scheduler = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx || !isPlayingRef.current) return;

    const scheduleAheadTime = 0.1; // seconds
    const lookahead = 25; // ms

    while (nextBeatTimeRef.current < ctx.currentTime + scheduleAheadTime) {
      const beatIdx = currentBeatRef.current % beatsRef.current.length;
      const beat = beatsRef.current[beatIdx];

      playClick(nextBeatTimeRef.current, beat.accent, beat.direction);

      // Update visual state (use setTimeout to sync with audio)
      const beatTime = nextBeatTimeRef.current - ctx.currentTime;
      const beatIdxCopy = beatIdx;
      setTimeout(() => {
        if (isPlayingRef.current) {
          setCurrentBeat(beatIdxCopy);
        }
      }, Math.max(0, beatTime * 1000));

      // Advance to next beat
      const secondsPerBeat = 60.0 / bpmRef.current;
      nextBeatTimeRef.current += secondsPerBeat;
      currentBeatRef.current++;
    }

    timerRef.current = window.setTimeout(scheduler, lookahead);
  }, [playClick]);

  const start = useCallback(() => {
    if (isPlayingRef.current) return;

    // Create or resume AudioContext (with Safari fallback)
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }

    isPlayingRef.current = true;
    currentBeatRef.current = 0;
    nextBeatTimeRef.current = audioCtxRef.current.currentTime + 0.05;
    setIsPlaying(true);
    setCurrentBeat(0);
    scheduler();
  }, [scheduler]);

  const stop = useCallback(() => {
    isPlayingRef.current = false;
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsPlaying(false);
    setCurrentBeat(-1);
    currentBeatRef.current = 0;
  }, []);

  const toggle = useCallback(() => {
    if (isPlayingRef.current) {
      stop();
    } else {
      start();
    }
  }, [start, stop]);

  const setBpm = useCallback((newBpm: number) => {
    const clamped = Math.max(30, Math.min(300, newBpm));
    setBpmState(clamped);
    bpmRef.current = clamped;
  }, []);

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolumeState(clamped);
    volumeRef.current = clamped;
  }, []);

  const tapTempo = useCallback(() => {
    const now = performance.now();
    const taps = tapTimesRef.current;

    // Remove taps older than 3 seconds
    while (taps.length > 0 && now - taps[0] > 3000) {
      taps.shift();
    }

    taps.push(now);

    if (taps.length >= 2) {
      // Calculate average interval
      let totalInterval = 0;
      for (let i = 1; i < taps.length; i++) {
        totalInterval += taps[i] - taps[i - 1];
      }
      const avgInterval = totalInterval / (taps.length - 1);
      const tappedBpm = Math.round(60000 / avgInterval);
      setBpm(tappedBpm);
    }
  }, [setBpm]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isPlayingRef.current = false;
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, []);

  // Stop when BPM changes while playing (restart with new tempo)
  useEffect(() => {
    if (isPlayingRef.current) {
      stop();
      // Small delay to let the stop complete, then restart
      const t = setTimeout(() => start(), 50);
      return () => clearTimeout(t);
    }
  }, [bpm]); // eslint-disable-line react-hooks/exhaustive-deps

  const state: MetronomeState = {
    isPlaying,
    bpm,
    currentBeat,
    beats,
    volume,
    beatsPerMeasure,
  };

  const controls: MetronomeControls = {
    start,
    stop,
    toggle,
    setBpm,
    setVolume,
    tapTempo,
  };

  return [state, controls];
}
