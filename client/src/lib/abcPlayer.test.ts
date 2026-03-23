import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ABCPlayer, getPlayer, formatTime } from "./abcPlayer";

// ─── Mock Browser APIs ───

// requestAnimationFrame / cancelAnimationFrame polyfill for Node
let rafId = 0;
(globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
  rafId++;
  setTimeout(() => cb(performance.now()), 0);
  return rafId;
};
(globalThis as any).cancelAnimationFrame = (_id: number) => {};

// ─── Mock AudioContext ───

class MockGainNode {
  gain = { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
  connect = vi.fn();
}

class MockOscillatorNode {
  type = "sine";
  frequency = { setValueAtTime: vi.fn() };
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class MockAudioContext {
  state = "running";
  currentTime = 0;
  destination = {};
  createGain() { return new MockGainNode(); }
  createOscillator() { return new MockOscillatorNode(); }
  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
}

// Patch global
(globalThis as any).AudioContext = MockAudioContext;

// ─── Sample ABC Notation ───

const SAMPLE_ABC = `X:1
T:Test Song
M:4/4
L:1/8
Q:1/4=120
K:C
CDEF GABc|`;

const SAMPLE_ABC_G = `X:1
T:Test Song
M:4/4
L:1/8
Q:1/4=100
K:G
GABc defg|`;

// ─── ABCPlayer Tests ───

describe("ABCPlayer", () => {
  let player: ABCPlayer;

  beforeEach(() => {
    player = new ABCPlayer();
  });

  afterEach(() => {
    player.dispose();
  });

  it("should initialize with default state", () => {
    expect(player.isPlaying).toBe(false);
    expect(player.isPaused).toBe(false);
  });

  it("should load ABC notation", () => {
    const states: any[] = [];
    player.onStateChange((s) => states.push({ ...s }));
    player.load(SAMPLE_ABC);

    expect(states.length).toBeGreaterThan(0);
    const last = states[states.length - 1];
    expect(last.isPlaying).toBe(false);
    expect(last.isPaused).toBe(false);
    expect(last.duration).toBeGreaterThan(0);
    expect(last.tempo).toBe(120);
  });

  it("should detect tempo from ABC headers", () => {
    const states: any[] = [];
    player.onStateChange((s) => states.push({ ...s }));
    player.load(SAMPLE_ABC_G);

    const last = states[states.length - 1];
    expect(last.tempo).toBe(100);
  });

  it("should start playing after play()", () => {
    player.load(SAMPLE_ABC);
    player.play();
    expect(player.isPlaying).toBe(true);
    expect(player.isPaused).toBe(false);
  });

  it("should pause playback", () => {
    player.load(SAMPLE_ABC);
    player.play();
    player.pause();
    expect(player.isPlaying).toBe(true);
    expect(player.isPaused).toBe(true);
  });

  it("should resume from paused state", () => {
    player.load(SAMPLE_ABC);
    player.play();
    player.pause();
    player.play();
    expect(player.isPlaying).toBe(true);
    expect(player.isPaused).toBe(false);
  });

  it("should stop playback", () => {
    player.load(SAMPLE_ABC);
    player.play();
    player.stop();
    expect(player.isPlaying).toBe(false);
    expect(player.isPaused).toBe(false);
  });

  it("should not play without loading first", () => {
    player.play();
    expect(player.isPlaying).toBe(false);
  });

  it("should handle seek", () => {
    player.load(SAMPLE_ABC);
    player.play();
    player.seek(0.5);
    expect(player.isPlaying).toBe(true);
  });

  it("should handle seek while paused", () => {
    player.load(SAMPLE_ABC);
    player.play();
    player.pause();
    player.seek(0.3);
    expect(player.isPaused).toBe(true);
  });

  it("should set tempo multiplier", () => {
    const states: any[] = [];
    player.onStateChange((s) => states.push({ ...s }));
    player.load(SAMPLE_ABC);
    player.setTempoMultiplier(2);

    const last = states[states.length - 1];
    expect(last.tempo).toBe(240); // 120 * 2
  });

  it("should clamp tempo multiplier to valid range", () => {
    const states: any[] = [];
    player.onStateChange((s) => states.push({ ...s }));
    player.load(SAMPLE_ABC);

    player.setTempoMultiplier(0.1); // Below minimum 0.25
    let last = states[states.length - 1];
    expect(last.tempo).toBe(30); // 120 * 0.25

    player.setTempoMultiplier(10); // Above maximum 4
    last = states[states.length - 1];
    expect(last.tempo).toBe(480); // 120 * 4
  });

  it("should dispose cleanly", () => {
    player.load(SAMPLE_ABC);
    player.play();
    player.dispose();
    expect(player.isPlaying).toBe(false);
  });

  it("should handle loading new ABC while playing", () => {
    player.load(SAMPLE_ABC);
    player.play();
    player.load(SAMPLE_ABC_G);
    expect(player.isPlaying).toBe(false); // load() calls stop()
  });

  it("should handle ABC with rests", () => {
    const abcWithRests = `X:1
T:Rest Test
M:4/4
L:1/4
Q:1/4=120
K:C
C z E z|`;

    const states: any[] = [];
    player.onStateChange((s) => states.push({ ...s }));
    player.load(abcWithRests);

    const last = states[states.length - 1];
    expect(last.duration).toBeGreaterThan(0);
  });

  it("should handle ABC with dynamics", () => {
    const abcWithDynamics = `X:1
T:Dynamics Test
M:4/4
L:1/4
Q:1/4=120
K:C
!f!C D !p!E F|`;

    const states: any[] = [];
    player.onStateChange((s) => states.push({ ...s }));
    player.load(abcWithDynamics);

    const last = states[states.length - 1];
    expect(last.duration).toBeGreaterThan(0);
  });

  it("should handle ABC with accidentals", () => {
    const abcWithAccidentals = `X:1
T:Accidentals Test
M:4/4
L:1/4
Q:1/4=120
K:C
^C _D =E F|`;

    const states: any[] = [];
    player.onStateChange((s) => states.push({ ...s }));
    player.load(abcWithAccidentals);

    const last = states[states.length - 1];
    expect(last.duration).toBeGreaterThan(0);
  });

  it("should handle ABC with octave modifiers", () => {
    const abcWithOctaves = `X:1
T:Octave Test
M:4/4
L:1/4
Q:1/4=120
K:C
C, D E' f'|`;

    const states: any[] = [];
    player.onStateChange((s) => states.push({ ...s }));
    player.load(abcWithOctaves);

    const last = states[states.length - 1];
    expect(last.duration).toBeGreaterThan(0);
  });

  it("should handle ABC with chord symbols", () => {
    const abcWithChords = `X:1
T:Chord Test
M:4/4
L:1/4
Q:1/4=120
K:C
"C"C D "G"E F|`;

    const states: any[] = [];
    player.onStateChange((s) => states.push({ ...s }));
    player.load(abcWithChords);

    const last = states[states.length - 1];
    expect(last.duration).toBeGreaterThan(0);
  });

  it("should handle ABC with duration multipliers", () => {
    const abcWithDurations = `X:1
T:Duration Test
M:4/4
L:1/8
Q:1/4=120
K:C
C2 D4 E/2 F|`;

    const states: any[] = [];
    player.onStateChange((s) => states.push({ ...s }));
    player.load(abcWithDurations);

    const last = states[states.length - 1];
    expect(last.duration).toBeGreaterThan(0);
  });

  it("should handle empty ABC notation", () => {
    player.load("");
    const states: any[] = [];
    player.onStateChange((s) => states.push({ ...s }));
    player.load("");
    // Should not crash
    expect(player.isPlaying).toBe(false);
  });
});

// ─── getPlayer Singleton Tests ───

describe("getPlayer", () => {
  it("should return the same instance", () => {
    const p1 = getPlayer();
    const p2 = getPlayer();
    expect(p1).toBe(p2);
  });
});

// ─── formatTime Tests ───

describe("formatTime", () => {
  it("should format 0 seconds", () => {
    expect(formatTime(0)).toBe("0:00");
  });

  it("should format seconds only", () => {
    expect(formatTime(5)).toBe("0:05");
    expect(formatTime(45)).toBe("0:45");
  });

  it("should format minutes and seconds", () => {
    expect(formatTime(60)).toBe("1:00");
    expect(formatTime(90)).toBe("1:30");
    expect(formatTime(125)).toBe("2:05");
  });

  it("should handle fractional seconds", () => {
    expect(formatTime(5.7)).toBe("0:05");
    expect(formatTime(61.9)).toBe("1:01");
  });

  it("should handle negative values", () => {
    expect(formatTime(-5)).toBe("0:00");
  });

  it("should handle NaN", () => {
    expect(formatTime(NaN)).toBe("0:00");
  });

  it("should handle Infinity", () => {
    expect(formatTime(Infinity)).toBe("0:00");
  });

  it("should handle large values", () => {
    expect(formatTime(3600)).toBe("60:00");
    expect(formatTime(3661)).toBe("61:01");
  });
});
