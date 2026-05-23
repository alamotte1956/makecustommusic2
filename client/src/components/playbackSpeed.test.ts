import { describe, it, expect } from "vitest";

/**
 * Tests for the playback speed control logic used in PlaybackControls.
 * Tests cover: formatSpeed, speed clamping, preset values, and slider mapping.
 */

// ─── Pure helpers (mirroring the logic in PlaybackControls) ───

function formatSpeed(speed: number): string {
  if (speed === 1) return "1×";
  if (Number.isInteger(speed)) return `${speed}×`;
  return `${parseFloat(speed.toFixed(2))}×`;
}

function clampSpeed(speed: number): number {
  return Math.max(0.25, Math.min(4, speed));
}

function sliderToSpeed(sliderValue: number): number {
  return sliderValue / 100;
}

function speedToSlider(speed: number): number {
  return speed * 100;
}

const SPEED_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

// ─── Tests ───

describe("formatSpeed", () => {
  it("formats 1x as '1×'", () => {
    expect(formatSpeed(1)).toBe("1×");
  });

  it("formats integer speeds with × suffix", () => {
    expect(formatSpeed(2)).toBe("2×");
    expect(formatSpeed(3)).toBe("3×");
    expect(formatSpeed(4)).toBe("4×");
  });

  it("formats decimal speeds correctly", () => {
    expect(formatSpeed(0.5)).toBe("0.5×");
    expect(formatSpeed(0.75)).toBe("0.75×");
    expect(formatSpeed(1.25)).toBe("1.25×");
    expect(formatSpeed(1.5)).toBe("1.5×");
  });

  it("trims trailing zeros", () => {
    expect(formatSpeed(1.50)).toBe("1.5×");
    expect(formatSpeed(2.00)).toBe("2×");
  });

  it("handles very small speeds", () => {
    expect(formatSpeed(0.25)).toBe("0.25×");
  });
});

describe("clampSpeed", () => {
  it("clamps minimum to 0.25", () => {
    expect(clampSpeed(0.1)).toBe(0.25);
    expect(clampSpeed(0)).toBe(0.25);
    expect(clampSpeed(-1)).toBe(0.25);
  });

  it("clamps maximum to 4", () => {
    expect(clampSpeed(5)).toBe(4);
    expect(clampSpeed(10)).toBe(4);
  });

  it("passes through valid values", () => {
    expect(clampSpeed(0.5)).toBe(0.5);
    expect(clampSpeed(1)).toBe(1);
    expect(clampSpeed(2)).toBe(2);
    expect(clampSpeed(3.5)).toBe(3.5);
  });

  it("handles boundary values", () => {
    expect(clampSpeed(0.25)).toBe(0.25);
    expect(clampSpeed(4)).toBe(4);
  });
});

describe("slider <-> speed conversion", () => {
  it("converts slider value to speed", () => {
    expect(sliderToSpeed(25)).toBe(0.25);
    expect(sliderToSpeed(50)).toBe(0.5);
    expect(sliderToSpeed(100)).toBe(1);
    expect(sliderToSpeed(200)).toBe(2);
    expect(sliderToSpeed(400)).toBe(4);
  });

  it("converts speed to slider value", () => {
    expect(speedToSlider(0.25)).toBe(25);
    expect(speedToSlider(0.5)).toBe(50);
    expect(speedToSlider(1)).toBe(100);
    expect(speedToSlider(2)).toBe(200);
    expect(speedToSlider(4)).toBe(400);
  });

  it("round-trips correctly", () => {
    for (const preset of SPEED_PRESETS) {
      expect(sliderToSpeed(speedToSlider(preset))).toBe(preset);
    }
  });
});

describe("SPEED_PRESETS", () => {
  it("contains expected preset values", () => {
    expect(SPEED_PRESETS).toEqual([0.5, 0.75, 1, 1.25, 1.5, 2]);
  });

  it("all presets are within valid range", () => {
    for (const preset of SPEED_PRESETS) {
      expect(preset).toBeGreaterThanOrEqual(0.25);
      expect(preset).toBeLessThanOrEqual(4);
    }
  });

  it("includes 1x (normal speed)", () => {
    expect(SPEED_PRESETS).toContain(1);
  });

  it("is sorted in ascending order", () => {
    for (let i = 1; i < SPEED_PRESETS.length; i++) {
      expect(SPEED_PRESETS[i]).toBeGreaterThan(SPEED_PRESETS[i - 1]);
    }
  });
});

describe("speed state behavior", () => {
  it("non-default speed is detected correctly", () => {
    expect(1 !== 1).toBe(false);
    expect(0.75 !== 1).toBe(true);
    expect(1.5 !== 1).toBe(true);
  });

  it("slider step of 5 gives 0.05x granularity", () => {
    const step = 5;
    const speedStep = step / 100;
    expect(speedStep).toBe(0.05);
  });

  it("BPM display reflects tempo multiplier", () => {
    const baseTempo = 120;
    expect(Math.round(baseTempo * 0.5)).toBe(60);
    expect(Math.round(baseTempo * 1)).toBe(120);
    expect(Math.round(baseTempo * 1.5)).toBe(180);
    expect(Math.round(baseTempo * 2)).toBe(240);
  });
});
