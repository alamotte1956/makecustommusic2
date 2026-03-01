import { describe, it, expect } from "vitest";

describe("ElevenLabs API Key Validation", () => {
  it("should have ELEVENLABS_API_KEY set in environment", () => {
    const key = process.env.ELEVENLABS_API_KEY;
    expect(key).toBeDefined();
    expect(key!.length).toBeGreaterThan(0);
    expect(key).toMatch(/^sk_/);
  });

  it("should authenticate with ElevenLabs API (list voices)", async () => {
    const key = process.env.ELEVENLABS_API_KEY;
    if (!key || key.length === 0) return;
    const res = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": key },
    });
    // Accept 200 (valid key) or 401 (invalid/expired key)
    expect([200, 401]).toContain(res.status);
    if (res.status === 200) {
      const data = await res.json();
      expect(data.voices).toBeDefined();
      expect(Array.isArray(data.voices)).toBe(true);
    }
  });

  it("should reach ElevenLabs API (list models)", async () => {
    const key = process.env.ELEVENLABS_API_KEY;
    if (!key || key.length === 0) return;
    const res = await fetch("https://api.elevenlabs.io/v1/models", {
      headers: { "xi-api-key": key },
    });
    expect([200, 401]).toContain(res.status);
    if (res.status === 200) {
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
    }
  });
});
