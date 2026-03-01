import { describe, it, expect } from "vitest";

describe("ElevenLabs API Key Validation", () => {
  it("should have ELEVENLABS_API_KEY set", () => {
    const key = process.env.ELEVENLABS_API_KEY;
    expect(key).toBeDefined();
    expect(key!.length).toBeGreaterThan(0);
    expect(key).toMatch(/^sk_/);
  });

  it("should authenticate with ElevenLabs API (list voices)", async () => {
    const key = process.env.ELEVENLABS_API_KEY;
    const res = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": key! },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.voices).toBeDefined();
    expect(Array.isArray(data.voices)).toBe(true);
    expect(data.voices.length).toBeGreaterThan(0);
  });

  it("should authenticate with ElevenLabs API (list models)", async () => {
    const key = process.env.ELEVENLABS_API_KEY;
    const res = await fetch("https://api.elevenlabs.io/v1/models", {
      headers: { "xi-api-key": key! },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });
});
