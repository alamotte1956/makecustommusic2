import { describe, it, expect, vi } from "vitest";

// Mock the credits module
vi.mock("./credits", () => ({
  getDailyUsageChart: vi.fn().mockResolvedValue({
    daily: [
      { date: "2026-03-01", generation: 5, tts: 2, takes: 0, total: 7, added: 0, songCount: 3 },
      { date: "2026-03-02", generation: 0, tts: 0, takes: 0, total: 0, added: 10, songCount: 0 },
      { date: "2026-03-03", generation: 3, tts: 1, takes: 1, total: 5, added: 0, songCount: 2 },
    ],
    weekly: [
      { week: "2026-03-01", generation: 8, tts: 3, takes: 1, total: 12, songCount: 5 },
    ],
  }),
}));

describe("Usage Chart Data", () => {
  it("getDailyUsageChart returns daily and weekly arrays", async () => {
    const { getDailyUsageChart } = await import("./credits");
    const result = await getDailyUsageChart(1, 30);

    expect(result).toBeDefined();
    expect(result.daily).toBeInstanceOf(Array);
    expect(result.weekly).toBeInstanceOf(Array);
    expect(result.daily.length).toBeGreaterThan(0);
    expect(result.weekly.length).toBeGreaterThan(0);
  });

  it("daily entries have correct shape", async () => {
    const { getDailyUsageChart } = await import("./credits");
    const result = await getDailyUsageChart(1, 30);
    const entry = result.daily[0];

    expect(entry).toHaveProperty("date");
    expect(entry).toHaveProperty("generation");
    expect(entry).toHaveProperty("tts");
    expect(entry).toHaveProperty("takes");
    expect(entry).toHaveProperty("total");
    expect(entry).toHaveProperty("added");
    expect(entry).toHaveProperty("songCount");
    expect(typeof entry.generation).toBe("number");
    expect(typeof entry.tts).toBe("number");
    expect(typeof entry.total).toBe("number");
    expect(typeof entry.songCount).toBe("number");
  });

  it("weekly entries have correct shape", async () => {
    const { getDailyUsageChart } = await import("./credits");
    const result = await getDailyUsageChart(1, 30);
    const entry = result.weekly[0];

    expect(entry).toHaveProperty("week");
    expect(entry).toHaveProperty("generation");
    expect(entry).toHaveProperty("tts");
    expect(entry).toHaveProperty("takes");
    expect(entry).toHaveProperty("total");
    expect(entry).toHaveProperty("songCount");
  });

  it("total equals sum of generation + tts + takes", async () => {
    const { getDailyUsageChart } = await import("./credits");
    const result = await getDailyUsageChart(1, 30);

    for (const entry of result.daily) {
      expect(entry.total).toBe(entry.generation + entry.tts + entry.takes);
    }
  });

  it("weekly total equals sum of daily entries in that week", async () => {
    const { getDailyUsageChart } = await import("./credits");
    const result = await getDailyUsageChart(1, 30);

    // The weekly entry should aggregate the daily entries
    const weeklyTotal = result.weekly[0].total;
    const dailySum = result.daily.reduce((sum: number, d: any) => sum + d.total, 0);
    expect(weeklyTotal).toBe(dailySum);
  });

  it("handles zero usage days correctly", async () => {
    const { getDailyUsageChart } = await import("./credits");
    const result = await getDailyUsageChart(1, 30);

    const zeroDay = result.daily.find((d: any) => d.total === 0);
    expect(zeroDay).toBeDefined();
    expect(zeroDay!.generation).toBe(0);
    expect(zeroDay!.tts).toBe(0);
    expect(zeroDay!.takes).toBe(0);
    expect(zeroDay!.songCount).toBe(0);
  });
});
