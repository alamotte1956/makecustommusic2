import { describe, it, expect } from "vitest";

/**
 * Bar count logic extracted from SheetMusicViewer for testability.
 * This mirrors the useMemo logic in the component.
 */
function countBarsFromAbc(abc: string | null): number {
  if (!abc) return 0;
  const lines = abc.split("\n");
  const musicLines = lines.filter((l) => {
    const trimmed = l.trim();
    if (!trimmed) return false;
    // Skip header lines and lyric lines
    if (/^[A-Za-z]:/.test(trimmed) && !trimmed.startsWith("|")) return false;
    if (trimmed.startsWith("w:") || trimmed.startsWith("W:")) return false;
    if (trimmed.startsWith("%")) return false;
    return true;
  });
  const musicText = musicLines.join(" ");
  const barLines = (musicText.match(/\|/g) || []).length;
  return Math.max(0, barLines);
}

/**
 * Duration estimation logic extracted from SheetMusicViewer for testability.
 * This mirrors the estimatedDuration useMemo logic in the component.
 */
function estimateDuration(abc: string | null, barCount: number): string | null {
  if (!abc || barCount <= 0) return null;

  // Extract time signature (M: field) — defaults to 4/4
  const mMatch = abc.match(/M:\s*(\d+)\/(\d+)/);
  const beatsPerBar = mMatch ? parseInt(mMatch[1], 10) : 4;
  const beatUnit = mMatch ? parseInt(mMatch[2], 10) : 4;

  // Extract tempo (Q: field)
  let bpm = 120;
  let tempoNoteLength = 1 / 4;
  const qMatch = abc.match(/Q:\s*(?:(\d+)\/(\d+)\s*=\s*)?(\d+)/);
  if (qMatch) {
    if (qMatch[1] && qMatch[2]) {
      tempoNoteLength = parseInt(qMatch[1], 10) / parseInt(qMatch[2], 10);
    }
    bpm = parseInt(qMatch[3], 10);
  }

  const barDurationSeconds = (beatsPerBar / beatUnit) / tempoNoteLength / bpm * 60;
  const totalSeconds = Math.round(barCount * barDurationSeconds);

  if (totalSeconds <= 0 || !isFinite(totalSeconds)) return null;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `~${minutes}:${seconds.toString().padStart(2, "0")}`;
}

describe("countBarsFromAbc", () => {
  it("returns 0 for null input", () => {
    expect(countBarsFromAbc(null)).toBe(0);
  });

  it("returns 0 for empty string", () => {
    expect(countBarsFromAbc("")).toBe(0);
  });

  it("returns 0 for header-only ABC", () => {
    const abc = `X: 1\nT: Test Song\nM: 4/4\nL: 1/4\nK: C`;
    expect(countBarsFromAbc(abc)).toBe(0);
  });

  it("counts bars in a simple ABC tune", () => {
    const abc = `X: 1\nT: Test\nM: 4/4\nL: 1/4\nK: C\nCDEF|GABc|cdec|BAGF|`;
    expect(countBarsFromAbc(abc)).toBe(4);
  });

  it("counts bars across multiple lines", () => {
    const abc = `X: 1\nT: Test\nM: 4/4\nL: 1/4\nK: C\nCDEF|GABc|\ncdec|BAGF|\nEDEF|GABc|`;
    expect(countBarsFromAbc(abc)).toBe(6);
  });

  it("counts bars with repeat markers", () => {
    const abc = `X: 1\nT: Test\nM: 4/4\nL: 1/4\nK: C\n|:CDEF|GABc|cdec|BAGF:|`;
    expect(countBarsFromAbc(abc)).toBe(5);
  });

  it("ignores lyric lines (w:)", () => {
    const abc = `X: 1\nT: Test\nM: 4/4\nL: 1/4\nK: C\nCDEF|GABc|cdec|BAGF|\nw: la la la | la la la | la la | la la |`;
    expect(countBarsFromAbc(abc)).toBe(4);
  });

  it("ignores comment lines (%)", () => {
    const abc = `X: 1\nT: Test\nM: 4/4\nL: 1/4\nK: C\n% This is a comment with | pipes\nCDEF|GABc|cdec|BAGF|`;
    expect(countBarsFromAbc(abc)).toBe(4);
  });

  it("counts bars in a longer piece (24+ bars)", () => {
    const abc = `X: 1\nT: Long Song\nM: 4/4\nL: 1/4\nK: C\n` +
      `CDEF|GABc|cdec|BAGF|EDEF|GABc|d2c2|B4|\n` +
      `CDEF|GABc|cdec|BAGF|EDEF|GABc|d2c2|B4|\n` +
      `CDEF|GABc|cdec|BAGF|EDEF|GABc|d2c2|B4|`;
    expect(countBarsFromAbc(abc)).toBe(24);
  });

  it("handles lines starting with | (bar line at start of music line)", () => {
    const abc = `X: 1\nT: Test\nM: 4/4\nL: 1/4\nK: C\n|CDEF|GABc|cdec|BAGF|`;
    expect(countBarsFromAbc(abc)).toBe(5);
  });

  it("handles double bar lines ||", () => {
    const abc = `X: 1\nT: Test\nM: 4/4\nL: 1/4\nK: C\nCDEF|GABc||cdec|BAGF|`;
    expect(countBarsFromAbc(abc)).toBe(5);
  });

  it("handles ABC with chord symbols", () => {
    const abc = `X: 1\nT: Test\nM: 4/4\nL: 1/4\nK: C\n"C"CDEF|"G"GABc|"Am"cdec|"F"BAGF|`;
    expect(countBarsFromAbc(abc)).toBe(4);
  });
});

describe("estimateDuration", () => {
  it("returns null for null ABC", () => {
    expect(estimateDuration(null, 0)).toBeNull();
  });

  it("returns null for 0 bars", () => {
    const abc = `X: 1\nT: Test\nM: 4/4\nQ: 120\nK: C`;
    expect(estimateDuration(abc, 0)).toBeNull();
  });

  it("calculates duration with default tempo (120 BPM) when Q: is missing", () => {
    // 4/4 time, 120 BPM default, 32 bars
    // Each bar = 4 beats at 120 BPM = 2 seconds per bar
    // 32 bars * 2s = 64s = 1:04
    const abc = `X: 1\nT: Test\nM: 4/4\nL: 1/4\nK: C\nCDEF|GABc|`;
    expect(estimateDuration(abc, 32)).toBe("~1:04");
  });

  it("calculates duration with explicit Q:120 (simple format)", () => {
    // 4/4 time, Q:120, 60 bars
    // Each bar = 2s, 60 bars = 120s = 2:00
    const abc = `X: 1\nT: Test\nM: 4/4\nQ: 120\nK: C\nCDEF|`;
    expect(estimateDuration(abc, 60)).toBe("~2:00");
  });

  it("calculates duration with Q:1/4=100", () => {
    // 4/4 time, quarter=100, 50 bars
    // Each bar = 4 beats / 100 BPM * 60 = 2.4s per bar
    // 50 * 2.4 = 120s = 2:00
    const abc = `X: 1\nT: Test\nM: 4/4\nQ: 1/4=100\nK: C\nCDEF|`;
    expect(estimateDuration(abc, 50)).toBe("~2:00");
  });

  it("calculates duration with Q:1/8=160 (eighth note tempo)", () => {
    // 4/4 time, eighth=160
    // tempoNoteLength = 1/8 = 0.125
    // barDuration = (4/4) / 0.125 / 160 * 60 = 1 / 0.125 / 160 * 60 = 8 / 160 * 60 = 3s
    // 40 bars * 3s = 120s = 2:00
    const abc = `X: 1\nT: Test\nM: 4/4\nQ: 1/8=160\nK: C\nCDEF|`;
    expect(estimateDuration(abc, 40)).toBe("~2:00");
  });

  it("calculates duration with 3/4 time signature", () => {
    // 3/4 time, Q:120, 80 bars
    // Each bar = 3 beats at 120 BPM = 1.5s per bar
    // 80 * 1.5 = 120s = 2:00
    const abc = `X: 1\nT: Waltz\nM: 3/4\nQ: 120\nK: C\nCDE|`;
    expect(estimateDuration(abc, 80)).toBe("~2:00");
  });

  it("calculates duration with 6/8 time signature", () => {
    // 6/8 time, Q:1/4=120 (quarter note = 120)
    // beatsPerBar=6, beatUnit=8
    // barDuration = (6/8) / (1/4) / 120 * 60 = 0.75 / 0.25 / 120 * 60 = 3 / 120 * 60 = 1.5s
    // 80 bars * 1.5s = 120s = 2:00
    const abc = `X: 1\nT: Jig\nM: 6/8\nQ: 1/4=120\nK: C\nCDE FGA|`;
    expect(estimateDuration(abc, 80)).toBe("~2:00");
  });

  it("calculates duration with slow tempo (Q:60)", () => {
    // 4/4 time, Q:60, 15 bars
    // Each bar = 4 beats at 60 BPM = 4s per bar
    // 15 * 4 = 60s = 1:00
    const abc = `X: 1\nT: Slow\nM: 4/4\nQ: 60\nK: C\nCDEF|`;
    expect(estimateDuration(abc, 15)).toBe("~1:00");
  });

  it("calculates duration with fast tempo (Q:200)", () => {
    // 4/4 time, Q:200, 100 bars
    // Each bar = 4/200*60 = 1.2s per bar
    // 100 * 1.2 = 120s = 2:00
    const abc = `X: 1\nT: Fast\nM: 4/4\nQ: 200\nK: C\nCDEF|`;
    expect(estimateDuration(abc, 100)).toBe("~2:00");
  });

  it("formats short durations correctly", () => {
    // 4/4 time, Q:120, 4 bars = 8s = ~0:08
    const abc = `X: 1\nT: Short\nM: 4/4\nQ: 120\nK: C\nCDEF|`;
    expect(estimateDuration(abc, 4)).toBe("~0:08");
  });

  it("formats long durations correctly", () => {
    // 4/4 time, Q:80, 120 bars
    // Each bar = 4/80*60 = 3s per bar
    // 120 * 3 = 360s = 6:00
    const abc = `X: 1\nT: Long\nM: 4/4\nQ: 80\nK: C\nCDEF|`;
    expect(estimateDuration(abc, 120)).toBe("~6:00");
  });

  it("handles Q:3/8=80 (dotted quarter tempo)", () => {
    // 6/8 time, Q:3/8=80 (dotted quarter = 80)
    // tempoNoteLength = 3/8 = 0.375
    // barDuration = (6/8) / 0.375 / 80 * 60 = 0.75 / 0.375 / 80 * 60 = 2 / 80 * 60 = 1.5s
    // 80 bars * 1.5s = 120s = 2:00
    const abc = `X: 1\nT: Compound\nM: 6/8\nQ: 3/8=80\nK: C\nCDE FGA|`;
    expect(estimateDuration(abc, 80)).toBe("~2:00");
  });
});
