import { describe, it, expect } from "vitest";

describe("MUSIC_API_KEY validation", () => {
  it("should have MUSIC_API_KEY set in environment", () => {
    const key = process.env.MUSIC_API_KEY;
    expect(key).toBeDefined();
    expect(key!.length).toBeGreaterThan(0);
  });

  it("should authenticate successfully with kie.ai", async () => {
    const key = process.env.MUSIC_API_KEY;
    if (!key) {
      throw new Error("MUSIC_API_KEY not set");
    }

    const response = await fetch("https://api.kie.ai/api/v1/chat/credit", {
      headers: {
        Authorization: `Bearer ${key}`,
      },
    });

    // Should not get 401/403 unauthorized
    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);

    const text = await response.text();
    console.log("HTTP status:", response.status);
    console.log("Response body:", text);

    const data = JSON.parse(text);
    expect(data.code).toBe(200);
    console.log("Credits remaining:", data.data);
  });

  it("should require callBackUrl in generate request", async () => {
    const key = process.env.MUSIC_API_KEY;
    if (!key) {
      throw new Error("MUSIC_API_KEY not set");
    }

    const response = await fetch("https://api.kie.ai/api/v1/generate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "V4",
        customMode: false,
        instrumental: false,
        prompt: "test",
      }),
    });

    const data = await response.json();
    // Without callBackUrl, kie.ai returns 422
    expect(data.code).toBe(422);
    expect(data.msg).toContain("callBackUrl");
  });
});
