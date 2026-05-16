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
 * Returns an object with formatted duration, BPM, time signature, and detection flags.
 */
function estimateDurationInfo(abc: string | null, barCount: number): {
  formatted: string;
  bpm: number;
  timeSig: string;
  tempoNoteName: string;
  tempoDetected: boolean;
  timeSigDetected: boolean;
} | null {
  if (!abc || barCount <= 0) return null;

  const mMatch = abc.match(/M:\s*(\d+)\/(\d+)/);
  const beatsPerBar = mMatch ? parseInt(mMatch[1], 10) : 4;
  const beatUnit = mMatch ? parseInt(mMatch[2], 10) : 4;
  const timeSig = `${beatsPerBar}/${beatUnit}`;
  const timeSigDetected = !!mMatch;

  let bpm = 120;
  let tempoNoteLength = 1 / 4;
  let tempoNoteName = "\u2669"; // quarter note symbol
  const qMatch = abc.match(/Q:\s*(?:(\d+)\/(\d+)\s*=\s*)?(\d+)/);
  const tempoDetected = !!qMatch;
  if (qMatch) {
    if (qMatch[1] && qMatch[2]) {
      tempoNoteLength = parseInt(qMatch[1], 10) / parseInt(qMatch[2], 10);
      const noteVal = tempoNoteLength;
      if (noteVal === 0.125) tempoNoteName = "\u266A";
      else if (noteVal === 0.375) tempoNoteName = "\u2669.";
      else if (noteVal === 0.5) tempoNoteName = "\uD834\uDD5E";
      else if (noteVal === 1) tempoNoteName = "\uD834\uDD5D";
    }
    bpm = parseInt(qMatch[3], 10);
  }

  const barDurationSeconds = (beatsPerBar / beatUnit) / tempoNoteLength / bpm * 60;
  const totalSeconds = Math.round(barCount * barDurationSeconds);

  if (totalSeconds <= 0 || !isFinite(totalSeconds)) return null;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const formatted = `~${minutes}:${seconds.toString().padStart(2, "0")}`;

  return { formatted, bpm, timeSig, tempoNoteName, tempoDetected, timeSigDetected };
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

describe("estimateDurationInfo", () => {
  it("returns null for null ABC", () => {
    expect(estimateDurationInfo(null, 0)).toBeNull();
  });

  it("returns null for 0 bars", () => {
    const abc = `X: 1\nT: Test\nM: 4/4\nQ: 120\nK: C`;
    expect(estimateDurationInfo(abc, 0)).toBeNull();
  });

  it("calculates duration with default tempo (120 BPM) when Q: is missing", () => {
    const abc = `X: 1\nT: Test\nM: 4/4\nL: 1/4\nK: C\nCDEF|GABc|`;
    const info = estimateDurationInfo(abc, 32)!;
    expect(info.formatted).toBe("~1:04");
    expect(info.bpm).toBe(120);
    expect(info.tempoDetected).toBe(false);
    expect(info.timeSigDetected).toBe(true);
    expect(info.timeSig).toBe("4/4");
  });

  it("calculates duration with explicit Q:120 (simple format)", () => {
    const abc = `X: 1\nT: Test\nM: 4/4\nQ: 120\nK: C\nCDEF|`;
    const info = estimateDurationInfo(abc, 60)!;
    expect(info.formatted).toBe("~2:00");
    expect(info.bpm).toBe(120);
    expect(info.tempoDetected).toBe(true);
    expect(info.tempoNoteName).toBe("\u2669");
  });

  it("calculates duration with Q:1/4=100", () => {
    const abc = `X: 1\nT: Test\nM: 4/4\nQ: 1/4=100\nK: C\nCDEF|`;
    const info = estimateDurationInfo(abc, 50)!;
    expect(info.formatted).toBe("~2:00");
    expect(info.bpm).toBe(100);
    expect(info.tempoNoteName).toBe("\u2669");
  });

  it("calculates duration with Q:1/8=160 (eighth note tempo)", () => {
    const abc = `X: 1\nT: Test\nM: 4/4\nQ: 1/8=160\nK: C\nCDEF|`;
    const info = estimateDurationInfo(abc, 40)!;
    expect(info.formatted).toBe("~2:00");
    expect(info.bpm).toBe(160);
    expect(info.tempoNoteName).toBe("\u266A"); // eighth note symbol
  });

  it("calculates duration with 3/4 time signature", () => {
    const abc = `X: 1\nT: Waltz\nM: 3/4\nQ: 120\nK: C\nCDE|`;
    const info = estimateDurationInfo(abc, 80)!;
    expect(info.formatted).toBe("~2:00");
    expect(info.timeSig).toBe("3/4");
    expect(info.timeSigDetected).toBe(true);
  });

  it("calculates duration with 6/8 time signature", () => {
    const abc = `X: 1\nT: Jig\nM: 6/8\nQ: 1/4=120\nK: C\nCDE FGA|`;
    const info = estimateDurationInfo(abc, 80)!;
    expect(info.formatted).toBe("~2:00");
    expect(info.timeSig).toBe("6/8");
  });

  it("calculates duration with slow tempo (Q:60)", () => {
    const abc = `X: 1\nT: Slow\nM: 4/4\nQ: 60\nK: C\nCDEF|`;
    const info = estimateDurationInfo(abc, 15)!;
    expect(info.formatted).toBe("~1:00");
    expect(info.bpm).toBe(60);
  });

  it("calculates duration with fast tempo (Q:200)", () => {
    const abc = `X: 1\nT: Fast\nM: 4/4\nQ: 200\nK: C\nCDEF|`;
    const info = estimateDurationInfo(abc, 100)!;
    expect(info.formatted).toBe("~2:00");
    expect(info.bpm).toBe(200);
  });

  it("formats short durations correctly", () => {
    const abc = `X: 1\nT: Short\nM: 4/4\nQ: 120\nK: C\nCDEF|`;
    const info = estimateDurationInfo(abc, 4)!;
    expect(info.formatted).toBe("~0:08");
  });

  it("formats long durations correctly", () => {
    const abc = `X: 1\nT: Long\nM: 4/4\nQ: 80\nK: C\nCDEF|`;
    const info = estimateDurationInfo(abc, 120)!;
    expect(info.formatted).toBe("~6:00");
  });

  it("handles Q:3/8=80 (dotted quarter tempo)", () => {
    const abc = `X: 1\nT: Compound\nM: 6/8\nQ: 3/8=80\nK: C\nCDE FGA|`;
    const info = estimateDurationInfo(abc, 80)!;
    expect(info.formatted).toBe("~2:00");
    expect(info.bpm).toBe(80);
    expect(info.tempoNoteName).toBe("\u2669."); // dotted quarter
  });

  // --- New tooltip metadata tests ---

  it("marks tempo as not detected when Q: is missing", () => {
    const abc = `X: 1\nT: Test\nM: 4/4\nK: C\nCDEF|`;
    const info = estimateDurationInfo(abc, 10)!;
    expect(info.tempoDetected).toBe(false);
    expect(info.bpm).toBe(120); // default
    expect(info.tempoNoteName).toBe("\u2669"); // default quarter note
  });

  it("marks time signature as not detected when M: is missing", () => {
    const abc = `X: 1\nT: Test\nQ: 100\nK: C\nCDEF|`;
    const info = estimateDurationInfo(abc, 10)!;
    expect(info.timeSigDetected).toBe(false);
    expect(info.timeSig).toBe("4/4"); // default
    expect(info.tempoDetected).toBe(true);
    expect(info.bpm).toBe(100);
  });

  it("marks both as not detected when Q: and M: are missing", () => {
    const abc = `X: 1\nT: Test\nK: C\nCDEF|`;
    const info = estimateDurationInfo(abc, 10)!;
    expect(info.tempoDetected).toBe(false);
    expect(info.timeSigDetected).toBe(false);
    expect(info.bpm).toBe(120);
    expect(info.timeSig).toBe("4/4");
  });

  it("marks both as detected when Q: and M: are present", () => {
    const abc = `X: 1\nT: Test\nM: 3/4\nQ: 1/4=90\nK: C\nCDE|`;
    const info = estimateDurationInfo(abc, 10)!;
    expect(info.tempoDetected).toBe(true);
    expect(info.timeSigDetected).toBe(true);
    expect(info.bpm).toBe(90);
    expect(info.timeSig).toBe("3/4");
  });

  it("returns correct tempoNoteName for simple Q:BPM format", () => {
    const abc = `X: 1\nT: Test\nM: 4/4\nQ: 140\nK: C\nCDEF|`;
    const info = estimateDurationInfo(abc, 10)!;
    // Simple Q:140 means quarter note = 140
    expect(info.tempoNoteName).toBe("\u2669");
    expect(info.bpm).toBe(140);
  });
});
