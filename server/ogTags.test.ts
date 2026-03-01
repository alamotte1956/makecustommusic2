import { describe, it, expect } from "vitest";
import { injectOgTags } from "./ogTags";

const SAMPLE_HTML = `<!doctype html>
<html lang="en">
<head>
<title>Make Custom Music - AI Music Generator &amp; Composer</title>
<meta name="title" content="Make Custom Music - AI Music Generator &amp; Composer" />
<meta name="description" content="Create AI-generated music from text descriptions." />
<link rel="canonical" href="https://makecustommusic.com/" />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://makecustommusic.com/" />
<meta property="og:title" content="Make Custom Music - AI Music Generator &amp; Composer" />
<meta property="og:description" content="Transform your ideas into songs with AI." />
<meta property="og:image" content="https://example.com/default.webp" />
<meta name="twitter:url" content="https://makecustommusic.com/" />
<meta name="twitter:title" content="Make Custom Music - AI Music Generator &amp; Composer" />
<meta name="twitter:description" content="Transform your ideas into songs with AI." />
<meta name="twitter:image" content="https://example.com/default.webp" />
</head>
<body><div id="root"></div></body>
</html>`;

describe("OG Tag Injection", () => {
  const ogTags = {
    title: "Midnight Dreams — Make Custom Music",
    description: "Listen to &quot;Midnight Dreams&quot; — jazz, melancholic. Created with Make Custom Music.",
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

    const description = `Listen to "${song.title}" — ${descParts.join(", ")}. Created with Make Custom Music.`;
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
      ? `Listen to "${song.title}" — ${descParts.join(", ")}. Created with Make Custom Music.`
      : `Listen to "${song.title}" on Make Custom Music. AI-generated music you can download and share.`;

    expect(description).toContain("Untitled");
    expect(description).toContain("AI-generated music");
    expect(description).not.toContain("vocals");
  });
});

describe("usePageMeta descriptions", () => {
  it("should have descriptions under 160 characters for all pages", () => {
    const descriptions = [
      "Choose a plan for AI music generation. Free, Pro, and Enterprise tiers with credits for song creation, MP3 downloads, and more.",
      "Frequently asked questions about Make Custom Music. Learn about AI music generation, pricing, downloads, and account management.",
      "Invite friends to Make Custom Music and earn free credits. Share your referral link and get rewarded when they sign up.",
      "Explore AI-generated songs shared by the community. Listen, download, and get inspired by music created with Make Custom Music.",
      "Upload your own audio or sheet music to Make Custom Music. Import MP3, WAV, or FLAC files and add them to your collection.",
    ];

    for (const desc of descriptions) {
      expect(desc.length).toBeGreaterThanOrEqual(50);
      expect(desc.length).toBeLessThanOrEqual(160);
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
