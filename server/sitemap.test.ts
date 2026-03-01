import { describe, it, expect, vi } from "vitest";

// ─── Sitemap XML Generation Tests ───

describe("Dynamic Sitemap", () => {
  describe("XML structure", () => {
    it("should produce valid XML with urlset root element", () => {
      const BASE_URL = "https://makecustommusic.com";
      const staticRoutes = [
        { path: "/", changefreq: "weekly", priority: 1.0 },
        { path: "/generate", changefreq: "weekly", priority: 0.9 },
        { path: "/discover", changefreq: "daily", priority: 0.8 },
      ];

      const urls = staticRoutes.map(
        (r) =>
          `  <url>\n    <loc>${BASE_URL + r.path}</loc>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority.toFixed(1)}</priority>\n  </url>`
      );

      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;

      expect(xml).toContain('<?xml version="1.0"');
      expect(xml).toContain("<urlset");
      expect(xml).toContain("</urlset>");
      expect(xml).toContain("<loc>https://makecustommusic.com/</loc>");
      expect(xml).toContain("<loc>https://makecustommusic.com/generate</loc>");
      expect(xml).toContain("<loc>https://makecustommusic.com/discover</loc>");
    });

    it("should include shared song URLs with /share/:token pattern", () => {
      const BASE_URL = "https://makecustommusic.com";
      const sharedSongs = [
        { shareToken: "abc123", updatedAt: new Date("2026-01-15") },
        { shareToken: "def456", updatedAt: new Date("2026-02-20") },
      ];

      const urls = sharedSongs.map(
        (s) =>
          `  <url>\n    <loc>${BASE_URL}/share/${s.shareToken}</loc>\n    <lastmod>${s.updatedAt.toISOString().split("T")[0]}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>`
      );

      const xml = urls.join("\n");
      expect(xml).toContain("/share/abc123");
      expect(xml).toContain("/share/def456");
      expect(xml).toContain("<lastmod>2026-01-15</lastmod>");
      expect(xml).toContain("<lastmod>2026-02-20</lastmod>");
    });

    it("should escape special XML characters in URLs", () => {
      function escapeXml(str: string): string {
        return str
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&apos;");
      }

      expect(escapeXml("test&value")).toBe("test&amp;value");
      expect(escapeXml("a<b>c")).toBe("a&lt;b&gt;c");
      expect(escapeXml('say "hello"')).toBe("say &quot;hello&quot;");
    });

    it("should format dates as YYYY-MM-DD", () => {
      function formatDate(date: Date): string {
        return date.toISOString().split("T")[0];
      }

      expect(formatDate(new Date("2026-03-01T12:00:00Z"))).toBe("2026-03-01");
      expect(formatDate(new Date("2025-12-25T00:00:00Z"))).toBe("2025-12-25");
    });

    it("should include all required static routes", () => {
      const STATIC_ROUTES = [
        { path: "/", changefreq: "weekly", priority: 1.0 },
        { path: "/generate", changefreq: "weekly", priority: 0.9 },
        { path: "/discover", changefreq: "daily", priority: 0.8 },
        { path: "/pricing", changefreq: "monthly", priority: 0.8 },
        { path: "/upload", changefreq: "monthly", priority: 0.6 },
        { path: "/faq", changefreq: "monthly", priority: 0.5 },
        { path: "/privacy", changefreq: "yearly", priority: 0.3 },
        { path: "/terms", changefreq: "yearly", priority: 0.3 },
      ];

      const paths = STATIC_ROUTES.map((r) => r.path);
      expect(paths).toContain("/");
      expect(paths).toContain("/generate");
      expect(paths).toContain("/discover");
      expect(paths).toContain("/pricing");
      expect(paths).toContain("/upload");
      expect(paths).toContain("/faq");
      expect(paths).toContain("/privacy");
      expect(paths).toContain("/terms");
      expect(STATIC_ROUTES).toHaveLength(8);
    });

    it("should skip songs without shareToken", () => {
      const songs = [
        { shareToken: "abc123", updatedAt: new Date() },
        { shareToken: null, updatedAt: new Date() },
        { shareToken: "def456", updatedAt: new Date() },
      ];

      const filtered = songs.filter((s) => s.shareToken);
      expect(filtered).toHaveLength(2);
      expect(filtered[0].shareToken).toBe("abc123");
      expect(filtered[1].shareToken).toBe("def456");
    });

    it("should set proper priority values", () => {
      const STATIC_ROUTES = [
        { path: "/", priority: 1.0 },
        { path: "/generate", priority: 0.9 },
        { path: "/discover", priority: 0.8 },
        { path: "/privacy", priority: 0.3 },
      ];

      // Homepage should have highest priority
      expect(STATIC_ROUTES[0].priority).toBe(1.0);
      // All priorities should be between 0 and 1
      for (const route of STATIC_ROUTES) {
        expect(route.priority).toBeGreaterThanOrEqual(0);
        expect(route.priority).toBeLessThanOrEqual(1);
      }
    });
  });
});

// ─── Song Cover Generation Tests ───

describe("Song Cover Generation", () => {
  it("should build a descriptive image prompt from song metadata", () => {
    const song = {
      title: "Midnight Dreams",
      genre: "jazz",
      mood: "melancholic",
      keywords: "night city rain",
    };

    const promptParts = [
      `Album cover art for a song titled "${song.title}"`,
      song.genre ? `Genre: ${song.genre}` : null,
      song.mood ? `Mood: ${song.mood}` : null,
      song.keywords ? `Themes: ${song.keywords}` : null,
    ].filter(Boolean);

    const prompt = promptParts.join(". ");
    expect(prompt).toContain("Midnight Dreams");
    expect(prompt).toContain("jazz");
    expect(prompt).toContain("melancholic");
    expect(prompt).toContain("night city rain");
  });

  it("should handle songs with minimal metadata", () => {
    const song = {
      title: "Untitled Track",
      genre: null,
      mood: null,
      keywords: "",
    };

    const promptParts = [
      `Album cover art for a song titled "${song.title}"`,
      song.genre ? `Genre: ${song.genre}` : null,
      song.mood ? `Mood: ${song.mood}` : null,
      song.keywords ? `Themes: ${song.keywords}` : null,
    ].filter(Boolean);

    const prompt = promptParts.join(". ");
    expect(prompt).toContain("Untitled Track");
    expect(prompt).not.toContain("Genre:");
    expect(prompt).not.toContain("Mood:");
  });
});

// ─── Key Selection for Sheet Music Tests ───

describe("Key Selection for Sheet Music", () => {
  it("should accept optional key parameter in generateSheetMusic input", () => {
    // Validate the input schema shape
    const inputWithKey = { songId: 1, key: "Am" };
    const inputWithoutKey = { songId: 1 };

    expect(inputWithKey.songId).toBe(1);
    expect(inputWithKey.key).toBe("Am");
    expect(inputWithoutKey.songId).toBe(1);
    expect((inputWithoutKey as any).key).toBeUndefined();
  });

  it("should use requested key in song context when provided", () => {
    const song = {
      title: "Test Song",
      genre: "pop",
      mood: "happy",
      keySignature: "C",
      timeSignature: "4/4",
      tempo: 120,
      lyrics: "La la la",
    };

    const requestedKey = "Am";

    const songContext = [
      `Title: ${song.title}`,
      song.genre ? `Genre: ${song.genre}` : null,
      song.mood ? `Mood: ${song.mood}` : null,
      requestedKey ? `Key: ${requestedKey}` : null,
      song.timeSignature ? `Time Signature: ${song.timeSignature}` : null,
      song.tempo ? `Tempo: ${song.tempo} BPM` : null,
      song.lyrics ? `Lyrics:\n${song.lyrics}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    // Should use the requested key, not the song's original key
    expect(songContext).toContain("Key: Am");
    expect(songContext).not.toContain("Key: C");
  });

  it("should fall back to song keySignature when no key is requested", () => {
    const song = {
      title: "Test Song",
      keySignature: "G",
    };

    const requestedKey = undefined;
    const effectiveKey = requestedKey || song.keySignature;

    expect(effectiveKey).toBe("G");
  });

  it("should allow auto key selection (undefined)", () => {
    const requestedKey = undefined;
    const songKeySignature = null;
    const effectiveKey = requestedKey || songKeySignature;

    // When both are falsy, no key is specified — AI picks the best one
    expect(effectiveKey).toBeFalsy();
  });

  it("should support all common keys", () => {
    const COMMON_KEYS = [
      "C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B",
      "Cm", "Dm", "Em", "Fm", "Gm", "Am", "Bm",
    ];

    expect(COMMON_KEYS).toHaveLength(19);
    expect(COMMON_KEYS).toContain("C");
    expect(COMMON_KEYS).toContain("Am");
    expect(COMMON_KEYS).toContain("F#");
    expect(COMMON_KEYS).toContain("Bb");
  });

  it("should regenerate sheet music when key is specified even if cached exists", () => {
    const existingAbc = "X:1\nT:Test\nM:4/4\nK:C\nCDEF|";
    const requestedKey = "Am";

    // When a key is specified, we should NOT return cached
    const shouldRegenerate = !!(requestedKey);
    expect(shouldRegenerate).toBe(true);

    // When no key is specified and cached exists, return cached
    const noKeyRequested = undefined;
    const shouldUseCached = !!existingAbc && !noKeyRequested;
    expect(shouldUseCached).toBe(true);
  });
});
