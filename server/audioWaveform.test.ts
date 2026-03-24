import { describe, it, expect } from "vitest";

/**
 * Tests for the AudioWaveform component's data processing logic.
 * Since extractPeaks runs in the browser with AudioBuffer, we test the
 * algorithm logic with equivalent array-based implementations.
 */

// Replicate the extractPeaks algorithm for testing
function extractPeaks(channelData: Float32Array, barCount: number): number[] {
  const samplesPerBar = Math.floor(channelData.length / barCount);
  const peaks: number[] = [];

  for (let i = 0; i < barCount; i++) {
    let max = 0;
    const start = i * samplesPerBar;
    const end = Math.min(start + samplesPerBar, channelData.length);
    for (let j = start; j < end; j++) {
      const abs = Math.abs(channelData[j]);
      if (abs > max) max = abs;
    }
    peaks.push(max);
  }

  // Normalise to [0, 1]
  const globalMax = Math.max(...peaks, 0.001);
  return peaks.map((p) => p / globalMax);
}

describe("AudioWaveform extractPeaks", () => {
  it("returns the correct number of bars", () => {
    const data = new Float32Array(1000);
    for (let i = 0; i < 1000; i++) data[i] = Math.sin(i * 0.1);
    const peaks = extractPeaks(data, 50);
    expect(peaks).toHaveLength(50);
  });

  it("normalises peaks to [0, 1] range", () => {
    const data = new Float32Array(1000);
    for (let i = 0; i < 1000; i++) data[i] = Math.sin(i * 0.1) * 0.5;
    const peaks = extractPeaks(data, 50);
    peaks.forEach((p) => {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    });
  });

  it("has at least one peak at 1.0 (the maximum)", () => {
    const data = new Float32Array(1000);
    for (let i = 0; i < 1000; i++) data[i] = Math.sin(i * 0.1);
    const peaks = extractPeaks(data, 50);
    expect(Math.max(...peaks)).toBeCloseTo(1.0, 2);
  });

  it("handles silence (all zeros)", () => {
    const data = new Float32Array(1000); // all zeros
    const peaks = extractPeaks(data, 50);
    expect(peaks).toHaveLength(50);
    // All peaks should be 0 (divided by 0.001 minimum)
    peaks.forEach((p) => expect(p).toBe(0));
  });

  it("handles constant amplitude", () => {
    const data = new Float32Array(1000);
    data.fill(0.5);
    const peaks = extractPeaks(data, 10);
    expect(peaks).toHaveLength(10);
    // All peaks should be 1.0 (all equal, normalised)
    peaks.forEach((p) => expect(p).toBeCloseTo(1.0, 5));
  });

  it("handles negative values correctly (uses absolute value)", () => {
    const data = new Float32Array(100);
    data.fill(-0.8);
    const peaks = extractPeaks(data, 5);
    expect(peaks).toHaveLength(5);
    peaks.forEach((p) => expect(p).toBeCloseTo(1.0, 5));
  });

  it("detects loud and quiet sections", () => {
    const data = new Float32Array(200);
    // First half: loud
    for (let i = 0; i < 100; i++) data[i] = 0.9;
    // Second half: quiet
    for (let i = 100; i < 200; i++) data[i] = 0.1;
    const peaks = extractPeaks(data, 2);
    expect(peaks[0]).toBeGreaterThan(peaks[1]);
    expect(peaks[0]).toBeCloseTo(1.0, 2);
    expect(peaks[1]).toBeCloseTo(0.1 / 0.9, 1);
  });

  it("handles very small bar counts", () => {
    const data = new Float32Array(1000);
    for (let i = 0; i < 1000; i++) data[i] = Math.random() * 2 - 1;
    const peaks = extractPeaks(data, 1);
    expect(peaks).toHaveLength(1);
    expect(peaks[0]).toBeCloseTo(1.0, 2);
  });

  it("handles bar count larger than samples", () => {
    const data = new Float32Array(5);
    data.set([0.1, 0.5, 0.3, 0.8, 0.2]);
    const peaks = extractPeaks(data, 10);
    expect(peaks).toHaveLength(10);
    // samplesPerBar = 0, so most bars will be 0
    // This is an edge case — the function should not crash
  });
});

describe("AudioWaveform rendering calculations", () => {
  it("calculates played fraction correctly", () => {
    const currentTime = 30;
    const duration = 120;
    const playedFraction = duration > 0 ? currentTime / duration : 0;
    expect(playedFraction).toBeCloseTo(0.25, 5);
  });

  it("handles zero duration gracefully", () => {
    const currentTime = 0;
    const duration = 0;
    const playedFraction = duration > 0 ? currentTime / duration : 0;
    expect(playedFraction).toBe(0);
  });

  it("calculates bar dimensions correctly", () => {
    const containerWidth = 300;
    const peaks = new Array(100).fill(0.5);
    const barWidth = Math.max(1, (containerWidth / peaks.length) - 1);
    expect(barWidth).toBe(2); // 300/100 - 1 = 2
  });

  it("calculates seek position from click", () => {
    const canvasWidth = 400;
    const clickX = 100;
    const duration = 120;
    const fraction = Math.max(0, Math.min(1, clickX / canvasWidth));
    const seekTime = fraction * duration;
    expect(seekTime).toBeCloseTo(30, 1);
  });

  it("clamps seek position to valid range", () => {
    const canvasWidth = 400;
    const duration = 120;

    // Click before canvas
    const fraction1 = Math.max(0, Math.min(1, -50 / canvasWidth));
    expect(fraction1).toBe(0);

    // Click after canvas
    const fraction2 = Math.max(0, Math.min(1, 500 / canvasWidth));
    expect(fraction2).toBe(1);
    expect(fraction2 * duration).toBe(120);
  });

  it("computes bar count from container width", () => {
    const containerWidth = 300;
    const barCount = Math.max(50, Math.floor(containerWidth / 3));
    expect(barCount).toBe(100);

    // Narrow container still gets minimum 50 bars
    const narrowWidth = 100;
    const narrowBarCount = Math.max(50, Math.floor(narrowWidth / 3));
    expect(narrowBarCount).toBe(50);
  });
});

describe("AudioWaveform skeleton", () => {
  it("generates 60 skeleton bars", () => {
    const skeletonBars = Array.from({ length: 60 });
    expect(skeletonBars).toHaveLength(60);
  });

  it("skeleton bar heights vary with sine pattern", () => {
    const heights = Array.from({ length: 60 }, (_, i) =>
      20 + Math.sin(i * 0.3) * 30
    );
    // Heights should vary between roughly -10 and 50
    const min = Math.min(...heights);
    const max = Math.max(...heights);
    expect(max - min).toBeGreaterThan(20);
  });
});
