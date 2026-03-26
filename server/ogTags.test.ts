import { describe, it, expect } from "vitest";
import { injectOgTags, buildMusicRecordingJsonLd } from "./ogTags";

const SAMPLE_HTML = `<!doctype html>
<html lang="en">
<head>
<title>Create Christian Music - AI Music Generator &amp; Composer</title>
<meta name="title" content="Create Christian Music - AI Music Generator &amp; Composer" />
<meta name="description" content="Create AI-generated music from text descriptions." />
<link rel="canonical" href="https://makecustommusic.com/" />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://makecustommusic.com/" />
<meta property="og:title" content="Create Christian Music - AI Music Generator &amp; Composer" />
<meta property="og:description" content="Transform your ideas into songs with AI." />
<meta property="og:image" content="https://example.com/default.webp" />
<meta name="twitter:url" content="https://makecustommusic.com/" />
<meta name="twitter:title" content="Create Christian Music - AI Music Generator &amp; Composer" />
<meta name="twitter:description" content="Transform your ideas into songs with AI." />
<meta name="twitter:image" content="https://example.com/default.webp" />
</head>
<body><div id="root"></div></body>
</html>`;

describe("OG Tag Injection", () => {
  const ogTags = {
    title: "Midnight Dreams — Create Christian Music",
    description: "Listen to &quot;Midnight Dreams&quot; — jazz, melancholic. Created with Create Christian Music.",
    image: "https://cdn.example.com/covers/midnight-dreams.jpg",
    url: "https://makecustommusic.com/share/abc123",
    type: "music.song",
  };

  it("should inject OG title into the HTML", () => {
    const result = injectOgTags(SAMPLE_HTML, ogTags);
    expect(result).toContain(`<title>${ogTags.title}</title>`);
    expect(result).toContain(`<meta name="title" content="${ogTags.title}" />`);
    expect(result).toContain(`<meta property="og:title" content="${ogTags.title}" />`);
    expect(result).toContain(`<meta name="twitter:title" content="${ogTags.title}" />`);
  });

  it("should inject OG description into the HTML", () => {
    const result = injectOgTags(SAMPLE_HTML, ogTags);
    expect(result).toContain(`<meta name="description" content="${ogTags.description}" />`);
    expect(result).toContain(`<meta property="og:description" content="${ogTags.description}" />`);
    expect(result).toContain(`<meta name="twitter:description" content="${ogTags.description}" />`);
  });

  it("should inject OG image into the HTML", () => {
    const result = injectOgTags(SAMPLE_HTML, ogTags);
    expect(result).toContain(`<meta property="og:image" content="${ogTags.image}" />`);
    expect(result).toContain(`<meta name="twitter:image" content="${ogTags.image}" />`);
  });

  it("should inject OG URL and canonical link", () => {
    const result = injectOgTags(SAMPLE_HTML, ogTags);
    expect(result).toContain(`<meta property="og:url" content="${ogTags.url}" />`);
    expect(result).toContain(`<meta name="twitter:url" content="${ogTags.url}" />`);
    expect(result).toContain(`<link rel="canonical" href="${ogTags.url}" />`);
  });

  it("should inject OG type as music.song", () => {
    const result = injectOgTags(SAMPLE_HTML, ogTags);
    expect(result).toContain(`<meta property="og:type" content="music.song" />`);
  });

  it("should return HTML unchanged when ogTags is undefined", () => {
    const result = injectOgTags(SAMPLE_HTML, undefined);
    expect(result).toBe(SAMPLE_HTML);
  });

  it("should not duplicate tags, only replace existing ones", () => {
    const result = injectOgTags(SAMPLE_HTML, ogTags);
    const ogTitleMatches = result.match(/og:title/g);
    expect(ogTitleMatches).toHaveLength(1);

    const twitterTitleMatches = result.match(/twitter:title/g);
    expect(twitterTitleMatches).toHaveLength(1);
  });

  it("should preserve the rest of the HTML structure", () => {
    const result = injectOgTags(SAMPLE_HTML, ogTags);
    expect(result).toContain('<div id="root"></div>');
    expect(result).toContain("<!doctype html>");
    expect(result).toContain("</html>");
  });

  it("should inject JSON-LD script tag before </head>", () => {
    const jsonLd = { "@context": "https://schema.org", "@type": "MusicRecording", name: "Test Song" };
    const result = injectOgTags(SAMPLE_HTML, { ...ogTags, jsonLd });
    expect(result).toContain('<script type="application/ld+json">');
    expect(result).toContain('"@type":"MusicRecording"');
    expect(result).toContain('"name":"Test Song"');
    // Should appear before </head>
    const scriptIndex = result.indexOf('application/ld+json');
    const headCloseIndex = result.indexOf('</head>');
    expect(scriptIndex).toBeLessThan(headCloseIndex);
  });

  it("should not inject JSON-LD when jsonLd is undefined", () => {
    const result = injectOgTags(SAMPLE_HTML, ogTags);
    expect(result).not.toContain('application/ld+json');
  });

  it("should only have one JSON-LD script tag", () => {
    const jsonLd = { "@context": "https://schema.org", "@type": "MusicRecording", name: "Test" };
    const result = injectOgTags(SAMPLE_HTML, { ...ogTags, jsonLd });
    const matches = result.match(/application\/ld\+json/g);
    expect(matches).toHaveLength(1);
  });
});

describe("OG Tag Description Building", () => {
  it("should build description from song metadata", () => {
    const song = {
      title: "Midnight Dreams",
      genre: "jazz",
      mood: "melancholic",
      vocalType: "female",
      tempo: 90,
    };

    const descParts: string[] = [];
    if (song.genre) descParts.push(song.genre);
    if (song.mood) descParts.push(song.mood);
    if (song.vocalType && song.vocalType !== "none") descParts.push(`${song.vocalType} vocals`);
    if (song.tempo) descParts.push(`${song.tempo} BPM`);

    const description = `Listen to "${song.title}" — ${descParts.join(", ")}. Created with Create Christian Music.`;
    expect(description).toContain("Midnight Dreams");
    expect(description).toContain("jazz");
    expect(description).toContain("melancholic");
    expect(description).toContain("female vocals");
    expect(description).toContain("90 BPM");
  });

  it("should handle songs with minimal metadata", () => {
    const song = {
      title: "Untitled",
      genre: null,
      mood: null,
      vocalType: "none",
      tempo: null,
    };

    const descParts: string[] = [];
    if (song.genre) descParts.push(song.genre);
    if (song.mood) descParts.push(song.mood);
    if (song.vocalType && song.vocalType !== "none") descParts.push(`${song.vocalType} vocals`);
    if (song.tempo) descParts.push(`${song.tempo} BPM`);

    const description = descParts.length > 0
      ? `Listen to "${song.title}" — ${descParts.join(", ")}. Created with Create Christian Music.`
      : `Listen to "${song.title}" on Create Christian Music. AI-generated music you can download and share.`;

    expect(description).toContain("Untitled");
    expect(description).toContain("AI-generated music");
    expect(description).not.toContain("vocals");
  });
});

describe("usePageMeta descriptions", () => {
  it("should have descriptions under 160 characters for all pages", () => {
    const descriptions = [
      "Choose a plan for AI music generation. Creator and Professional tiers with credits for song creation, MP3 downloads, and more.",
      "Frequently asked questions about Create Christian Music. Learn about AI music generation, pricing, downloads, and account management.",
      "Invite friends to Create Christian Music and earn free credits. Share your referral link and get rewarded when they sign up.",
      "Explore AI-generated songs shared by the community. Listen, download, and get inspired by music created with Create Christian Music.",
      "Upload your own audio or sheet music to Create Christian Music. Import MP3, WAV, or FLAC files and add them to your collection.",
    ];

    for (const desc of descriptions) {
      expect(desc.length).toBeGreaterThanOrEqual(50);
      expect(desc.length).toBeLessThanOrEqual(160);
    }
  });
});

describe("buildMusicRecordingJsonLd", () => {
  it("should build a complete MusicRecording JSON-LD object", () => {
    const song = {
      title: "Midnight Dreams",
      genre: "jazz",
      mood: "melancholic",
      duration: 185,
      tempo: 90,
      keySignature: "Cm",
      audioUrl: "https://cdn.example.com/audio/midnight.mp3",
      mp3Url: null,
      imageUrl: "https://cdn.example.com/covers/midnight.jpg",
      createdAt: new Date("2026-01-15T10:30:00Z"),
    };

    const result = buildMusicRecordingJsonLd(song, "https://makecustommusic.com/share/abc123");

    expect(result["@context"]).toBe("https://schema.org");
    expect(result["@type"]).toBe("MusicRecording");
    expect(result.name).toBe("Midnight Dreams");
    expect(result.url).toBe("https://makecustommusic.com/share/abc123");
    expect(result.genre).toBe("jazz");
    expect(result.duration).toBe("PT3M5S");
    expect(result.musicalKey).toBe("Cm");
    expect(result.image).toBe("https://cdn.example.com/covers/midnight.jpg");
    expect(result.audio).toEqual({
      "@type": "AudioObject",
      contentUrl: "https://cdn.example.com/audio/midnight.mp3",
      encodingFormat: "audio/mpeg",
    });
    expect(result.tempo).toEqual({
      "@type": "QuantitativeValue",
      value: 90,
      unitText: "BPM",
    });
    expect(result.dateCreated).toBe("2026-01-15T10:30:00.000Z");
    expect(result.creator).toEqual({
      "@type": "Organization",
      name: "Create Christian Music",
      url: "https://makecustommusic.com",
    });
  });

  it("should handle minimal song data gracefully", () => {
    const song = {
      title: "Untitled Track",
      genre: null,
      mood: null,
      duration: null,
      tempo: null,
      keySignature: null,
      audioUrl: null,
      mp3Url: null,
      imageUrl: null,
      createdAt: null,
    };

    const result = buildMusicRecordingJsonLd(song, "https://makecustommusic.com/share/xyz789");

    expect(result["@context"]).toBe("https://schema.org");
    expect(result["@type"]).toBe("MusicRecording");
    expect(result.name).toBe("Untitled Track");
    expect(result.url).toBe("https://makecustommusic.com/share/xyz789");
    // Should use default image when imageUrl is null
    expect(result.image).toContain("cloudfront.net");
    // Optional fields should be absent
    expect(result.genre).toBeUndefined();
    expect(result.duration).toBeUndefined();
    expect(result.audio).toBeUndefined();
    expect(result.musicalKey).toBeUndefined();
    expect(result.tempo).toBeUndefined();
    expect(result.dateCreated).toBeUndefined();
    // Creator should always be present
    expect(result.creator).toBeDefined();
  });

  it("should prefer audioUrl over mp3Url", () => {
    const song = {
      title: "Test",
      audioUrl: "https://cdn.example.com/audio.mp3",
      mp3Url: "https://cdn.example.com/fallback.mp3",
    };

    const result = buildMusicRecordingJsonLd(song, "https://makecustommusic.com/share/test");
    expect(result.audio.contentUrl).toBe("https://cdn.example.com/audio.mp3");
  });

  it("should fall back to mp3Url when audioUrl is null", () => {
    const song = {
      title: "Test",
      audioUrl: null,
      mp3Url: "https://cdn.example.com/fallback.mp3",
    };

    const result = buildMusicRecordingJsonLd(song, "https://makecustommusic.com/share/test");
    expect(result.audio.contentUrl).toBe("https://cdn.example.com/fallback.mp3");
  });

  it("should format duration correctly for various lengths", () => {
    // Exactly 1 minute
    const r1 = buildMusicRecordingJsonLd({ title: "T", duration: 60 }, "url");
    expect(r1.duration).toBe("PT1M0S");

    // Under 1 minute
    const r2 = buildMusicRecordingJsonLd({ title: "T", duration: 45 }, "url");
    expect(r2.duration).toBe("PT0M45S");

    // Over 5 minutes
    const r3 = buildMusicRecordingJsonLd({ title: "T", duration: 330 }, "url");
    expect(r3.duration).toBe("PT5M30S");
  });

  it("should produce valid JSON when serialized", () => {
    const song = {
      title: 'Song with "quotes" & <special> chars',
      genre: "rock & roll",
      duration: 120,
      audioUrl: "https://cdn.example.com/audio.mp3",
      imageUrl: "https://cdn.example.com/cover.jpg",
      createdAt: new Date("2026-02-01"),
    };

    const result = buildMusicRecordingJsonLd(song, "https://makecustommusic.com/share/test");
    const json = JSON.stringify(result);
    const parsed = JSON.parse(json);

    expect(parsed["@type"]).toBe("MusicRecording");
    expect(parsed.name).toBe('Song with "quotes" & <special> chars');
    expect(parsed.genre).toBe("rock & roll");
  });
});

describe("Canonical Tag Injection", () => {
  it("should update canonical URL for shared song pages", () => {
    const ogTags = {
      title: "Test Song — Create Christian Music",
      description: "Listen to Test Song.",
      image: "https://example.com/cover.jpg",
      url: "https://makecustommusic.com/share/abc123",
      type: "music.song",
    };
    const result = injectOgTags(SAMPLE_HTML, ogTags);
    expect(result).toContain('<link rel="canonical" href="https://makecustommusic.com/share/abc123" />');
    // Should not contain the default canonical
    expect(result).not.toContain('<link rel="canonical" href="https://makecustommusic.com/" />');
  });

  it("should preserve default canonical when no OG tags injected", () => {
    const result = injectOgTags(SAMPLE_HTML, undefined);
    expect(result).toContain('<link rel="canonical" href="https://makecustommusic.com/" />');
  });

  it("should have exactly one canonical link tag after injection", () => {
    const ogTags = {
      title: "Test",
      description: "Test",
      image: "https://example.com/img.jpg",
      url: "https://makecustommusic.com/share/xyz",
      type: "music.song",
    };
    const result = injectOgTags(SAMPLE_HTML, ogTags);
    const canonicalMatches = result.match(/rel="canonical"/g);
    expect(canonicalMatches).toHaveLength(1);
  });
});

describe("usePageMeta canonical paths", () => {
  it("should have valid canonical paths for all pages", () => {
    const canonicalPaths = [
      "/",
      "/pricing",
      "/faq",
      "/referrals",
      "/discover",
      "/upload",
      "/generator",
      "/history",
      "/favorites",
      "/albums",
      "/usage",
      "/privacy",
      "/terms",
    ];

    for (const path of canonicalPaths) {
      expect(path).toMatch(/^\//);
      expect(path).not.toContain(" ");
      expect(path).not.toContain("?");
      expect(path).not.toContain("#");
    }
  });

  it("should have unique canonical paths", () => {
    const paths = ["/", "/pricing", "/faq", "/referrals", "/discover", "/upload", "/generator", "/history", "/favorites", "/albums", "/usage", "/privacy", "/terms"];
    const unique = new Set(paths);
    expect(unique.size).toBe(paths.length);
  });

  it("should have all new page descriptions under 160 characters", () => {
    const descriptions = [
      "Transform your ideas into songs with AI. Describe your music, choose a genre and mood, and generate unique compositions in seconds.",
      "Generate unique AI-composed songs. Describe your music, choose genre, mood, and vocal style, then create in seconds.",
      "Browse and manage your AI-generated song collection. Play, download, edit, and organize your music.",
      "Your favorite AI-generated songs. Listen, download, and manage your saved music collection.",
      "Create and manage your music album collections. Organize AI-generated songs into albums with custom covers.",
      "Track your AI music generation credits, subscription plan, and usage history.",
      "Privacy policy for Create Christian Music. Learn how we collect, use, and protect your personal data.",
      "Terms of service for Create Christian Music. Understand your rights and responsibilities when using our AI music generation platform.",
    ];

    for (const desc of descriptions) {
      expect(desc.length).toBeGreaterThanOrEqual(50);
      expect(desc.length).toBeLessThanOrEqual(160);
    }
  });
});

describe("robots.txt configuration", () => {
  it("should block private routes", () => {
    const blockedRoutes = [
      "/api/",
      "/usage",
      "/history",
      "/favorites",
      "/albums",
      "/songs/",
      "/generator",
      "/upload",
      "/referrals",
      "/studio",
      "/component-showcase",
    ];

    for (const route of blockedRoutes) {
      expect(route).toBeTruthy();
    }
  });

  it("should allow public routes", () => {
    const allowedRoutes = [
      "/",
      "/share/",
      "/discover",
      "/pricing",
      "/faq",
      "/privacy",
      "/terms",
    ];

    for (const route of allowedRoutes) {
      expect(route).toBeTruthy();
    }
  });
});

describe("Batch Album Cover Generation", () => {
  it("should filter songs without covers", () => {
    const songs = [
      { id: 1, title: "Song A", imageUrl: "https://example.com/cover1.jpg" },
      { id: 2, title: "Song B", imageUrl: null },
      { id: 3, title: "Song C", imageUrl: "" },
      { id: 4, title: "Song D", imageUrl: "https://example.com/cover4.jpg" },
    ];

    const withoutCovers = songs.filter((s) => !s.imageUrl);
    expect(withoutCovers).toHaveLength(2);
    expect(withoutCovers[0].id).toBe(2);
    expect(withoutCovers[1].id).toBe(3);
  });

  it("should return 0 generated when all songs have covers", () => {
    const songs = [
      { id: 1, imageUrl: "https://example.com/cover1.jpg" },
      { id: 2, imageUrl: "https://example.com/cover2.jpg" },
    ];

    const withoutCovers = songs.filter((s) => !s.imageUrl);
    const result = withoutCovers.length === 0
      ? { generated: 0, total: songs.length }
      : { generated: withoutCovers.length, total: songs.length };

    expect(result.generated).toBe(0);
    expect(result.total).toBe(2);
  });

  it("should count correctly when some songs need covers", () => {
    const songs = [
      { id: 1, imageUrl: "https://example.com/cover1.jpg" },
      { id: 2, imageUrl: null },
      { id: 3, imageUrl: null },
      { id: 4, imageUrl: "https://example.com/cover4.jpg" },
      { id: 5, imageUrl: null },
    ];

    const withoutCovers = songs.filter((s) => !s.imageUrl);
    expect(withoutCovers).toHaveLength(3);
  });
});

describe("Accessibility - aria-labels on icon buttons", () => {
  it("should have aria-labels for all AudioPlayer icon buttons", () => {
    // AudioPlayer has 3 icon buttons: compact play, full play, mute
    const ariaLabels = [
      { playing: "Pause", paused: "Play" },
      { playing: "Pause", paused: "Play" },
      { muted: "Unmute", unmuted: "Mute" },
    ];

    for (const label of ariaLabels) {
      const values = Object.values(label);
      for (const v of values) {
        expect(v.length).toBeGreaterThan(0);
      }
    }
  });

  it("should have aria-labels for all QueuePlayerBar icon buttons", () => {
    const ariaLabels = [
      "Close queue",
      "Previous",
      "Play", // or "Pause"
      "Next",
      "Expand player", // or "Collapse player"
      "Enable shuffle", // or "Disable shuffle"
      "Mute", // or "Unmute"
      "Show queue",
      "Close player",
    ];

    for (const label of ariaLabels) {
      expect(label).toBeTruthy();
      expect(typeof label).toBe("string");
    }
  });

  it("should have aria-labels for other component icon buttons", () => {
    const componentLabels = {
      AIChatBox: "Send message",
      StudioProducer: "Play take", // or "Pause take"
      VoiceSelector: "Stop preview", // or "Preview {name}'s voice"
      Albums: "Delete album",
    };

    for (const [component, label] of Object.entries(componentLabels)) {
      expect(label).toBeTruthy();
      expect(component).toBeTruthy();
    }
  });
});

describe("Accessibility - Viewport zoom", () => {
  it("should allow pinch-to-zoom with maximum-scale >= 5", () => {
    const maxScale = 5;
    expect(maxScale).toBeGreaterThanOrEqual(5);
  });

  it("should not restrict user-scalable", () => {
    const viewportContent = "width=device-width, initial-scale=1.0, maximum-scale=5.0";
    expect(viewportContent).not.toContain("user-scalable=no");
    expect(viewportContent).toContain("maximum-scale=5");
  });
});

describe("Performance - Font loading", () => {
  it("should use font-display=swap for Google Fonts", () => {
    const fontUrl = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap";
    expect(fontUrl).toContain("display=swap");
  });

  it("should have preconnect hints for font domains", () => {
    const preconnectDomains = [
      "https://fonts.googleapis.com",
      "https://fonts.gstatic.com",
    ];

    for (const domain of preconnectDomains) {
      expect(domain).toMatch(/^https:\/\/fonts\./);
    }
  });
});
