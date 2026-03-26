import { describe, it, expect } from "vitest";

describe("MUSIC_API_KEY validation", () => {
  it("should have MUSIC_API_KEY set in environment", () => {
    const key = process.env.MUSIC_API_KEY;
    expect(key).toBeDefined();
    expect(key!.length).toBeGreaterThan(0);
  });

  it("should authenticate successfully with musicapi.ai", async () => {
    const key = process.env.MUSIC_API_KEY;
    if (!key) {
      throw new Error("MUSIC_API_KEY not set");
    }

    const response = await fetch("https://api.musicapi.ai/api/v1/get-credits", {
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
    // Accept either code:200 or HTTP 200 as success
    const isAuthorized = response.status === 200 && data.code !== 401 && data.code !== 403;
    expect(isAuthorized).toBe(true);
    console.log("Credits remaining:", JSON.stringify(data.data || data));
  });
});
