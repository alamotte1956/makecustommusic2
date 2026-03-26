import { describe, it, expect, vi } from "vitest";
import { z } from "zod";

/**
 * Tests for the dedicated Write Your Own Lyrics page:
 * - Section type validation and structure
 * - Lyrics formatting with section markers
 * - Template structures
 * - Scripture starter content
 * - Refine lyrics input schema
 * - Draft save/load data structure
 * - Vocal type mapping for the page
 * - Full lyrics assembly from sections
 */

// ─── Schema replicas from routers.ts ───

const generateInputSchema = z.object({
  keywords: z.string().min(1).max(500),
  engine: z.enum(["elevenlabs"]).default("elevenlabs"),
  genre: z.string().max(100).optional(),
  mood: z.string().max(100).optional(),
  vocalType: z.enum(["none", "male", "female", "mixed", "male_and_female"]).optional(),
  duration: z.number().min(15).max(240).optional(),
  mode: z.enum(["simple", "custom"]).optional(),
  customTitle: z.string().max(255).optional(),
  customLyrics: z.string().max(10000).optional(),
  customStyle: z.string().max(500).optional(),
});

const refineLyricsInputSchema = z.object({
  lyrics: z.string().min(1).max(10000),
  mode: z.enum(["polish", "rhyme", "restructure", "rewrite"]).default("polish"),
  genre: z.string().max(100).optional(),
  mood: z.string().max(100).optional(),
});

const generateLyricsInputSchema = z.object({
  subject: z.string().min(1).max(500),
  genre: z.string().max(100).optional(),
  mood: z.string().max(100).optional(),
  vocalType: z.enum(["none", "male", "female", "mixed", "male_and_female"]).optional(),
  length: z.enum(["standard", "extended"]).default("standard"),
});

// ─── Section Types (mirrors WriteLyrics.tsx constants) ───

type SectionType = "intro" | "verse" | "pre-chorus" | "chorus" | "bridge" | "outro" | "interlude" | "hook" | "ad-lib";

const SECTION_TYPES: SectionType[] = [
  "intro", "verse", "pre-chorus", "chorus", "bridge", "hook", "interlude", "ad-lib", "outro",
];

interface LyricSection {
  id: string;
  type: SectionType;
  content: string;
  label?: string;
}

// Helper: assemble full lyrics from sections (mirrors WriteLyrics.tsx logic)
function assembleLyrics(sections: LyricSection[]): string {
  const sectionLabels: Record<SectionType, string> = {
    intro: "Intro",
    verse: "Verse",
    "pre-chorus": "Pre-Chorus",
    chorus: "Chorus",
    bridge: "Bridge",
    hook: "Hook",
    interlude: "Interlude",
    "ad-lib": "Ad-lib",
    outro: "Outro",
  };

  return sections
    .filter(s => s.content.trim())
    .map(s => {
      const label = s.label || sectionLabels[s.type] || s.type;
      return `[${label}]\n${s.content.trim()}`;
    })
    .join("\n\n");
}

// ─── Tests ───

describe("Write Lyrics - Section Types", () => {
  it("defines all 9 section types", () => {
    expect(SECTION_TYPES).toHaveLength(9);
    expect(SECTION_TYPES).toContain("intro");
    expect(SECTION_TYPES).toContain("verse");
    expect(SECTION_TYPES).toContain("pre-chorus");
    expect(SECTION_TYPES).toContain("chorus");
    expect(SECTION_TYPES).toContain("bridge");
    expect(SECTION_TYPES).toContain("outro");
    expect(SECTION_TYPES).toContain("interlude");
    expect(SECTION_TYPES).toContain("hook");
    expect(SECTION_TYPES).toContain("ad-lib");
  });

  it("each section type is a valid string", () => {
    for (const type of SECTION_TYPES) {
      expect(typeof type).toBe("string");
      expect(type.length).toBeGreaterThan(0);
    }
  });
});

describe("Write Lyrics - Lyrics Assembly", () => {
  it("assembles lyrics with section markers", () => {
    const sections: LyricSection[] = [
      { id: "1", type: "verse", content: "Walking down the road\nSearching for my soul" },
      { id: "2", type: "chorus", content: "We are the light\nShining so bright" },
    ];
    const result = assembleLyrics(sections);
    expect(result).toContain("[Verse]");
    expect(result).toContain("[Chorus]");
    expect(result).toContain("Walking down the road");
    expect(result).toContain("We are the light");
  });

  it("skips empty sections", () => {
    const sections: LyricSection[] = [
      { id: "1", type: "verse", content: "Line one" },
      { id: "2", type: "chorus", content: "" },
      { id: "3", type: "verse", content: "Line two" },
    ];
    const result = assembleLyrics(sections);
    expect(result).not.toContain("[Chorus]");
    expect(result).toContain("[Verse]");
    expect(result.split("[Verse]").length).toBe(3); // two verses
  });

  it("skips whitespace-only sections", () => {
    const sections: LyricSection[] = [
      { id: "1", type: "verse", content: "Real content" },
      { id: "2", type: "bridge", content: "   \n  \n  " },
    ];
    const result = assembleLyrics(sections);
    expect(result).not.toContain("[Bridge]");
  });

  it("uses custom label when provided", () => {
    const sections: LyricSection[] = [
      { id: "1", type: "verse", content: "Hello world", label: "Verse 1" },
    ];
    const result = assembleLyrics(sections);
    expect(result).toContain("[Verse 1]");
  });

  it("handles all section types correctly", () => {
    const sections: LyricSection[] = SECTION_TYPES.map((type, i) => ({
      id: String(i),
      type,
      content: `Content for ${type}`,
    }));
    const result = assembleLyrics(sections);
    expect(result).toContain("[Intro]");
    expect(result).toContain("[Verse]");
    expect(result).toContain("[Pre-Chorus]");
    expect(result).toContain("[Chorus]");
    expect(result).toContain("[Bridge]");
    expect(result).toContain("[Hook]");
    expect(result).toContain("[Interlude]");
    expect(result).toContain("[Ad-lib]");
    expect(result).toContain("[Outro]");
  });

  it("returns empty string when all sections are empty", () => {
    const sections: LyricSection[] = [
      { id: "1", type: "verse", content: "" },
      { id: "2", type: "chorus", content: "" },
    ];
    const result = assembleLyrics(sections);
    expect(result).toBe("");
  });

  it("trims content within sections", () => {
    const sections: LyricSection[] = [
      { id: "1", type: "verse", content: "  Hello world  \n  " },
    ];
    const result = assembleLyrics(sections);
    expect(result).toBe("[Verse]\nHello world");
  });

  it("separates sections with double newlines", () => {
    const sections: LyricSection[] = [
      { id: "1", type: "verse", content: "Line 1" },
      { id: "2", type: "chorus", content: "Line 2" },
    ];
    const result = assembleLyrics(sections);
    expect(result).toBe("[Verse]\nLine 1\n\n[Chorus]\nLine 2");
  });
});

describe("Write Lyrics - Song Templates", () => {
  const TEMPLATES = [
    {
      label: "Worship Song",
      sections: ["verse", "chorus", "verse", "chorus", "bridge", "chorus"],
    },
    {
      label: "Pop/Rock",
      sections: ["intro", "verse", "pre-chorus", "chorus", "verse", "pre-chorus", "chorus", "bridge", "chorus", "outro"],
    },
    {
      label: "Hymn (4 Verses)",
      sections: ["verse", "verse", "verse", "verse"],
    },
    {
      label: "Gospel",
      sections: ["verse", "chorus", "verse", "chorus", "bridge", "chorus", "ad-lib", "outro"],
    },
    {
      label: "Simple (V-C-V-C)",
      sections: ["verse", "chorus", "verse", "chorus"],
    },
  ];

  it("defines 5 song templates", () => {
    expect(TEMPLATES).toHaveLength(5);
  });

  it("each template has a label and sections array", () => {
    for (const t of TEMPLATES) {
      expect(typeof t.label).toBe("string");
      expect(t.label.length).toBeGreaterThan(0);
      expect(Array.isArray(t.sections)).toBe(true);
      expect(t.sections.length).toBeGreaterThan(0);
    }
  });

  it("all template section types are valid", () => {
    for (const t of TEMPLATES) {
      for (const s of t.sections) {
        expect(SECTION_TYPES).toContain(s);
      }
    }
  });

  it("Worship Song template has correct structure", () => {
    const worship = TEMPLATES.find(t => t.label === "Worship Song");
    expect(worship).toBeDefined();
    expect(worship!.sections).toEqual(["verse", "chorus", "verse", "chorus", "bridge", "chorus"]);
  });

  it("Hymn template has 4 verses", () => {
    const hymn = TEMPLATES.find(t => t.label === "Hymn (4 Verses)");
    expect(hymn).toBeDefined();
    expect(hymn!.sections).toEqual(["verse", "verse", "verse", "verse"]);
  });

  it("Gospel template includes ad-lib section", () => {
    const gospel = TEMPLATES.find(t => t.label === "Gospel");
    expect(gospel).toBeDefined();
    expect(gospel!.sections).toContain("ad-lib");
  });
});

describe("Write Lyrics - Scripture Starters", () => {
  const SCRIPTURE_STARTERS = [
    { label: "Psalm 23", text: "The Lord is my shepherd, I shall not want\nHe makes me lie down in green pastures\nHe leads me beside still waters\nHe restores my soul" },
    { label: "Psalm 100", text: "Make a joyful noise unto the Lord\nAll the earth, serve the Lord with gladness\nCome before His presence with singing\nKnow that the Lord, He is God" },
    { label: "Phil 4:13", text: "I can do all things\nThrough Christ who strengthens me\nNothing is impossible\nWhen I believe" },
    { label: "Jer 29:11", text: "For I know the plans I have for you\nPlans to prosper and not to harm\nPlans to give you hope and a future\nDeclares the Lord Almighty" },
    { label: "Rom 8:28", text: "All things work together for good\nFor those who love the Lord\nCalled according to His purpose\nNothing can separate us from His love" },
    { label: "Isaiah 40:31", text: "Those who wait upon the Lord\nShall renew their strength\nThey shall mount up with wings like eagles\nRun and not grow weary" },
  ];

  it("defines 6 scripture starters", () => {
    expect(SCRIPTURE_STARTERS).toHaveLength(6);
  });

  it("each scripture has a label and multi-line text", () => {
    for (const s of SCRIPTURE_STARTERS) {
      expect(typeof s.label).toBe("string");
      expect(s.label.length).toBeGreaterThan(0);
      expect(typeof s.text).toBe("string");
      expect(s.text).toContain("\n"); // multi-line
    }
  });

  it("scripture text is suitable for song lyrics (4 lines each)", () => {
    for (const s of SCRIPTURE_STARTERS) {
      const lines = s.text.split("\n").filter(l => l.trim());
      expect(lines.length).toBe(4);
    }
  });

  it("scripture labels are valid Bible references", () => {
    const validRefs = ["Psalm 23", "Psalm 100", "Phil 4:13", "Jer 29:11", "Rom 8:28", "Isaiah 40:31"];
    for (const s of SCRIPTURE_STARTERS) {
      expect(validRefs).toContain(s.label);
    }
  });
});

describe("Write Lyrics - Vocal Type Mapping", () => {
  const VOCAL_TYPES = [
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
    { value: "mixed", label: "Duet" },
    { value: "male_and_female", label: "Choir" },
    { value: "none", label: "Instrumental (No Vocals)" },
  ];

  it("defines 5 vocal types", () => {
    expect(VOCAL_TYPES).toHaveLength(5);
  });

  it("all vocal values are valid for the generate schema", () => {
    for (const v of VOCAL_TYPES) {
      const result = generateInputSchema.safeParse({
        keywords: "Test",
        vocalType: v.value,
      });
      expect(result.success).toBe(true);
    }
  });

  it("all vocal values are valid for the generateLyrics schema", () => {
    for (const v of VOCAL_TYPES) {
      const result = generateLyricsInputSchema.safeParse({
        subject: "Test",
        vocalType: v.value,
      });
      expect(result.success).toBe(true);
    }
  });

  it("maps Duet to mixed vocal type", () => {
    const duet = VOCAL_TYPES.find(v => v.label === "Duet");
    expect(duet).toBeDefined();
    expect(duet!.value).toBe("mixed");
  });

  it("maps Choir to male_and_female vocal type", () => {
    const choir = VOCAL_TYPES.find(v => v.label === "Choir");
    expect(choir).toBeDefined();
    expect(choir!.value).toBe("male_and_female");
  });

  it("maps Instrumental to none vocal type", () => {
    const instrumental = VOCAL_TYPES.find(v => v.label.includes("Instrumental"));
    expect(instrumental).toBeDefined();
    expect(instrumental!.value).toBe("none");
  });
});

describe("Write Lyrics - Refine Lyrics Schema", () => {
  it("accepts polish mode", () => {
    const result = refineLyricsInputSchema.safeParse({
      lyrics: "Some lyrics to polish",
      mode: "polish",
    });
    expect(result.success).toBe(true);
  });

  it("accepts rhyme mode", () => {
    const result = refineLyricsInputSchema.safeParse({
      lyrics: "Some lyrics to improve rhymes",
      mode: "rhyme",
    });
    expect(result.success).toBe(true);
  });

  it("accepts restructure mode", () => {
    const result = refineLyricsInputSchema.safeParse({
      lyrics: "Some lyrics to restructure",
      mode: "restructure",
    });
    expect(result.success).toBe(true);
  });

  it("accepts rewrite mode", () => {
    const result = refineLyricsInputSchema.safeParse({
      lyrics: "Some lyrics to rewrite",
      mode: "rewrite",
    });
    expect(result.success).toBe(true);
  });

  it("defaults mode to polish", () => {
    const result = refineLyricsInputSchema.safeParse({
      lyrics: "Some lyrics",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mode).toBe("polish");
    }
  });

  it("accepts optional genre and mood", () => {
    const result = refineLyricsInputSchema.safeParse({
      lyrics: "Some lyrics",
      mode: "polish",
      genre: "Gospel",
      mood: "Reverent",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.genre).toBe("Gospel");
      expect(result.data.mood).toBe("Reverent");
    }
  });

  it("rejects empty lyrics", () => {
    const result = refineLyricsInputSchema.safeParse({
      lyrics: "",
      mode: "polish",
    });
    expect(result.success).toBe(false);
  });

  it("rejects lyrics exceeding 10000 characters", () => {
    const result = refineLyricsInputSchema.safeParse({
      lyrics: "a".repeat(10001),
      mode: "polish",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid mode", () => {
    const result = refineLyricsInputSchema.safeParse({
      lyrics: "Some lyrics",
      mode: "translate",
    });
    expect(result.success).toBe(false);
  });
});

describe("Write Lyrics - Draft Data Structure", () => {
  interface LyricDraft {
    name: string;
    title: string;
    sections: LyricSection[];
    genre: string | null;
    mood: string | null;
    vocal: string;
    style: string;
  }

  it("creates a valid draft structure", () => {
    const draft: LyricDraft = {
      name: "My Draft",
      title: "Amazing Grace Remix",
      sections: [
        { id: "1", type: "verse", content: "Amazing grace how sweet the sound" },
        { id: "2", type: "chorus", content: "I once was lost but now am found" },
      ],
      genre: "Gospel",
      mood: "Reverent",
      vocal: "female",
      style: "acoustic guitar, soft piano",
    };

    expect(draft.name).toBe("My Draft");
    expect(draft.sections).toHaveLength(2);
    expect(draft.genre).toBe("Gospel");
  });

  it("serializes and deserializes draft to/from JSON", () => {
    const draft: LyricDraft = {
      name: "Test Draft",
      title: "Test Song",
      sections: [
        { id: "1", type: "verse", content: "Line 1\nLine 2" },
        { id: "2", type: "chorus", content: "Chorus line" },
      ],
      genre: null,
      mood: "Happy",
      vocal: "male",
      style: "",
    };

    const json = JSON.stringify(draft);
    const parsed = JSON.parse(json) as LyricDraft;

    expect(parsed.name).toBe(draft.name);
    expect(parsed.title).toBe(draft.title);
    expect(parsed.sections).toHaveLength(2);
    expect(parsed.sections[0].content).toBe("Line 1\nLine 2");
    expect(parsed.genre).toBeNull();
    expect(parsed.mood).toBe("Happy");
  });

  it("handles multiple drafts in an array", () => {
    const drafts: LyricDraft[] = [
      {
        name: "Draft 1",
        title: "Song A",
        sections: [{ id: "1", type: "verse", content: "A" }],
        genre: "Pop",
        mood: null,
        vocal: "female",
        style: "",
      },
      {
        name: "Draft 2",
        title: "Song B",
        sections: [{ id: "2", type: "chorus", content: "B" }],
        genre: "Rock",
        mood: "Energetic",
        vocal: "male",
        style: "electric guitar",
      },
    ];

    const json = JSON.stringify(drafts);
    const parsed = JSON.parse(json) as LyricDraft[];
    expect(parsed).toHaveLength(2);
    expect(parsed[0].name).toBe("Draft 1");
    expect(parsed[1].style).toBe("electric guitar");
  });
});

describe("Write Lyrics - Generate Song from Lyrics Integration", () => {
  it("accepts assembled lyrics in custom mode", () => {
    const sections: LyricSection[] = [
      { id: "1", type: "verse", content: "Walking through the valley\nOf the shadow of death" },
      { id: "2", type: "chorus", content: "I will fear no evil\nFor You are with me" },
      { id: "3", type: "bridge", content: "Your rod and Your staff\nThey comfort me" },
    ];
    const fullLyrics = assembleLyrics(sections);

    const result = generateInputSchema.safeParse({
      keywords: "Psalm 23 Song",
      engine: "elevenlabs",
      genre: "Gospel",
      mood: "Reverent",
      vocalType: "female",
      mode: "custom",
      customTitle: "Psalm 23 Song",
      customLyrics: fullLyrics,
      customStyle: "acoustic guitar, choir harmonies",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mode).toBe("custom");
      expect(result.data.customLyrics).toContain("[Verse]");
      expect(result.data.customLyrics).toContain("[Chorus]");
      expect(result.data.customLyrics).toContain("[Bridge]");
      expect(result.data.customLyrics).toContain("I will fear no evil");
    }
  });

  it("accepts assembled lyrics with all vocal types", () => {
    const lyrics = "[Verse]\nTest line";
    for (const vt of ["none", "male", "female", "mixed", "male_and_female"]) {
      const result = generateInputSchema.safeParse({
        keywords: "Test",
        mode: "custom",
        customLyrics: lyrics,
        vocalType: vt,
      });
      expect(result.success).toBe(true);
    }
  });

  it("handles large multi-section lyrics within limit", () => {
    const sections: LyricSection[] = [];
    for (let i = 0; i < 20; i++) {
      sections.push({
        id: String(i),
        type: i % 2 === 0 ? "verse" : "chorus",
        content: `Line ${i + 1} of the song\nAnother line here\nThird line for good measure\nFourth line to fill it up`,
      });
    }
    const fullLyrics = assembleLyrics(sections);

    const result = generateInputSchema.safeParse({
      keywords: "Long Song",
      mode: "custom",
      customLyrics: fullLyrics,
    });

    expect(result.success).toBe(true);
    expect(fullLyrics.length).toBeLessThan(10000);
  });
});

describe("Write Lyrics - Genre and Mood Options", () => {
  const GENRES = [
    "Pop", "Rock", "R&B", "Hip Hop", "Country", "Folk", "Jazz", "Blues",
    "Electronic", "Ambient", "Classical", "Reggae",
    "Christian", "Gospel", "Christian Modern", "Christian Pop",
    "Christian Rock", "Praise & Worship", "Hymns", "CCM",
    "Liturgical", "Choral", "Christian Acoustic", "Anthem",
  ];

  const MOODS = [
    "Happy", "Sad", "Energetic", "Calm", "Romantic", "Dark", "Uplifting",
    "Melancholic", "Triumphant", "Peaceful", "Intense", "Dreamy",
    "Reverent", "Joyful Praise", "Prayerful", "Grateful", "Reflective",
    "Celebratory", "Devotional", "Hopeful",
  ];

  it("defines 24 genres including 12 Christian-specific genres", () => {
    expect(GENRES).toHaveLength(24);
    const christianGenres = GENRES.filter(g =>
      ["Christian", "Gospel", "Christian Modern", "Christian Pop", "Christian Rock",
       "Praise & Worship", "Hymns", "CCM", "Liturgical", "Choral",
       "Christian Acoustic", "Anthem"].includes(g)
    );
    expect(christianGenres).toHaveLength(12);
  });

  it("defines 20 moods including worship-specific moods", () => {
    expect(MOODS).toHaveLength(20);
    expect(MOODS).toContain("Reverent");
    expect(MOODS).toContain("Joyful Praise");
    expect(MOODS).toContain("Prayerful");
    expect(MOODS).toContain("Devotional");
  });

  it("all genres are valid for the generate schema", () => {
    for (const g of GENRES) {
      const result = generateInputSchema.safeParse({
        keywords: "Test",
        genre: g,
      });
      expect(result.success).toBe(true);
    }
  });

  it("all moods are valid for the generate schema", () => {
    for (const m of MOODS) {
      const result = generateInputSchema.safeParse({
        keywords: "Test",
        mood: m,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe("Write Lyrics - AI Lyrics Parsing", () => {
  // Test the logic that parses AI-generated lyrics into sections
  function parseLyricsIntoSections(lyricsText: string): { type: SectionType; content: string }[] {
    const lines = lyricsText.split("\n");
    const sections: { type: SectionType; content: string }[] = [];
    let currentType: SectionType = "verse";
    let currentContent: string[] = [];

    for (const line of lines) {
      const sectionMatch = line.match(/^\[(.*?)\]/i);
      if (sectionMatch) {
        if (currentContent.length > 0) {
          sections.push({ type: currentType, content: currentContent.join("\n").trim() });
          currentContent = [];
        }
        const label = sectionMatch[1].toLowerCase();
        if (label.includes("verse")) currentType = "verse";
        else if (label.includes("pre-chorus") || label.includes("pre chorus")) currentType = "pre-chorus";
        else if (label.includes("chorus")) currentType = "chorus";
        else if (label.includes("bridge")) currentType = "bridge";
        else if (label.includes("intro")) currentType = "intro";
        else if (label.includes("outro")) currentType = "outro";
        else if (label.includes("hook")) currentType = "hook";
        else currentType = "verse";
      } else if (line.trim()) {
        currentContent.push(line);
      }
    }
    if (currentContent.length > 0) {
      sections.push({ type: currentType, content: currentContent.join("\n").trim() });
    }

    return sections;
  }

  it("parses standard AI lyrics with section markers", () => {
    const lyrics = `[Verse 1]
Walking down the road
Searching for my soul

[Chorus]
We are the light
Shining so bright

[Verse 2]
Another day goes by
Under the open sky

[Bridge]
And when the night falls
We stand tall`;

    const sections = parseLyricsIntoSections(lyrics);
    expect(sections).toHaveLength(4);
    expect(sections[0].type).toBe("verse");
    expect(sections[1].type).toBe("chorus");
    expect(sections[2].type).toBe("verse");
    expect(sections[3].type).toBe("bridge");
  });

  it("parses lyrics with pre-chorus", () => {
    const lyrics = `[Verse 1]
Line one

[Pre-Chorus]
Building up

[Chorus]
The hook`;

    const sections = parseLyricsIntoSections(lyrics);
    expect(sections).toHaveLength(3);
    expect(sections[1].type).toBe("pre-chorus");
  });

  it("handles lyrics without section markers (defaults to verse)", () => {
    const lyrics = `Just some plain text
Without any markers
Line three`;

    const sections = parseLyricsIntoSections(lyrics);
    expect(sections).toHaveLength(1);
    expect(sections[0].type).toBe("verse");
    expect(sections[0].content).toContain("Just some plain text");
  });

  it("handles intro and outro markers", () => {
    const lyrics = `[Intro]
Soft piano

[Verse 1]
Main content

[Outro]
Fade away`;

    const sections = parseLyricsIntoSections(lyrics);
    expect(sections).toHaveLength(3);
    expect(sections[0].type).toBe("intro");
    expect(sections[2].type).toBe("outro");
  });

  it("handles hook marker", () => {
    const lyrics = `[Hook]
Catchy line here`;

    const sections = parseLyricsIntoSections(lyrics);
    expect(sections).toHaveLength(1);
    expect(sections[0].type).toBe("hook");
  });

  it("ignores empty lines between sections", () => {
    const lyrics = `[Verse 1]
Line one
Line two


[Chorus]
Chorus line`;

    const sections = parseLyricsIntoSections(lyrics);
    expect(sections).toHaveLength(2);
    expect(sections[0].content).toBe("Line one\nLine two");
  });
});

describe("Write Lyrics - Word and Line Count", () => {
  function countWords(sections: LyricSection[]): number {
    return sections.reduce((acc, s) => acc + s.content.trim().split(/\s+/).filter(Boolean).length, 0);
  }

  function countLines(sections: LyricSection[]): number {
    return sections.reduce((acc, s) => acc + s.content.trim().split("\n").filter(l => l.trim()).length, 0);
  }

  it("counts words correctly", () => {
    const sections: LyricSection[] = [
      { id: "1", type: "verse", content: "One two three" },
      { id: "2", type: "chorus", content: "Four five" },
    ];
    expect(countWords(sections)).toBe(5);
  });

  it("counts lines correctly", () => {
    const sections: LyricSection[] = [
      { id: "1", type: "verse", content: "Line one\nLine two\nLine three" },
      { id: "2", type: "chorus", content: "Chorus line" },
    ];
    expect(countLines(sections)).toBe(4);
  });

  it("handles empty sections in counts", () => {
    const sections: LyricSection[] = [
      { id: "1", type: "verse", content: "" },
      { id: "2", type: "chorus", content: "One word" },
    ];
    expect(countWords(sections)).toBe(2);
    expect(countLines(sections)).toBe(1);
  });

  it("handles whitespace-only content", () => {
    const sections: LyricSection[] = [
      { id: "1", type: "verse", content: "   " },
    ];
    expect(countWords(sections)).toBe(0);
  });
});

describe("Write Lyrics - Drag-and-Drop Section Reordering", () => {
  // Mirrors the arrayMove logic from @dnd-kit/sortable
  function arrayMove<T>(arr: T[], from: number, to: number): T[] {
    const result = [...arr];
    const [item] = result.splice(from, 1);
    result.splice(to, 0, item);
    return result;
  }

  const baseSections: LyricSection[] = [
    { id: "sec_1", type: "verse", content: "Verse 1 content" },
    { id: "sec_2", type: "chorus", content: "Chorus content" },
    { id: "sec_3", type: "bridge", content: "Bridge content" },
    { id: "sec_4", type: "outro", content: "Outro content" },
  ];

  it("moves a section from first to last position", () => {
    const result = arrayMove(baseSections, 0, 3);
    expect(result[0].id).toBe("sec_2");
    expect(result[3].id).toBe("sec_1");
    expect(result).toHaveLength(4);
  });

  it("moves a section from last to first position", () => {
    const result = arrayMove(baseSections, 3, 0);
    expect(result[0].id).toBe("sec_4");
    expect(result[1].id).toBe("sec_1");
    expect(result).toHaveLength(4);
  });

  it("moves a section one position down", () => {
    const result = arrayMove(baseSections, 0, 1);
    expect(result[0].id).toBe("sec_2");
    expect(result[1].id).toBe("sec_1");
    expect(result[2].id).toBe("sec_3");
    expect(result[3].id).toBe("sec_4");
  });

  it("moves a section one position up", () => {
    const result = arrayMove(baseSections, 2, 1);
    expect(result[0].id).toBe("sec_1");
    expect(result[1].id).toBe("sec_3");
    expect(result[2].id).toBe("sec_2");
    expect(result[3].id).toBe("sec_4");
  });

  it("does not change array when moving to same position", () => {
    const result = arrayMove(baseSections, 1, 1);
    expect(result.map(s => s.id)).toEqual(baseSections.map(s => s.id));
  });

  it("preserves all section data after reorder", () => {
    const result = arrayMove(baseSections, 0, 2);
    const movedSection = result.find(s => s.id === "sec_1");
    expect(movedSection).toBeDefined();
    expect(movedSection!.type).toBe("verse");
    expect(movedSection!.content).toBe("Verse 1 content");
  });

  it("preserves array length after any reorder", () => {
    for (let from = 0; from < baseSections.length; from++) {
      for (let to = 0; to < baseSections.length; to++) {
        const result = arrayMove(baseSections, from, to);
        expect(result).toHaveLength(baseSections.length);
      }
    }
  });

  it("preserves all unique IDs after reorder", () => {
    const result = arrayMove(baseSections, 0, 3);
    const ids = result.map(s => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(baseSections.length);
    for (const section of baseSections) {
      expect(ids).toContain(section.id);
    }
  });

  it("assembled lyrics reflect new order after reorder", () => {
    const reordered = arrayMove(baseSections, 0, 2);
    const lyrics = assembleLyrics(reordered);
    const chorusPos = lyrics.indexOf("[Chorus]");
    const bridgePos = lyrics.indexOf("[Bridge]");
    const versePos = lyrics.indexOf("[Verse]");
    // After moving verse from 0 to 2: chorus, bridge, verse, outro
    expect(chorusPos).toBeLessThan(bridgePos);
    expect(bridgePos).toBeLessThan(versePos);
  });

  it("handles reordering with empty sections", () => {
    const withEmpty: LyricSection[] = [
      { id: "a", type: "verse", content: "Content" },
      { id: "b", type: "chorus", content: "" },
      { id: "c", type: "bridge", content: "More content" },
    ];
    const result = arrayMove(withEmpty, 0, 2);
    expect(result[0].id).toBe("b");
    expect(result[1].id).toBe("c");
    expect(result[2].id).toBe("a");
  });

  it("handles single section array", () => {
    const single: LyricSection[] = [
      { id: "only", type: "verse", content: "Solo" },
    ];
    const result = arrayMove(single, 0, 0);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("only");
  });

  // DnD handleDragEnd logic test
  it("simulates handleDragEnd: reorders when active !== over", () => {
    const activeId = "sec_1";
    const overId = "sec_3";

    // Simulate the handleDragEnd logic
    const oldIndex = baseSections.findIndex(s => s.id === activeId);
    const newIndex = baseSections.findIndex(s => s.id === overId);
    const result = arrayMove(baseSections, oldIndex, newIndex);

    expect(result[0].id).toBe("sec_2");
    expect(result[1].id).toBe("sec_3");
    expect(result[2].id).toBe("sec_1");
    expect(result[3].id).toBe("sec_4");
  });

  it("simulates handleDragEnd: no change when active === over", () => {
    const activeId = "sec_2";
    const overId = "sec_2";

    // When active === over, handleDragEnd does nothing
    if (activeId !== overId) {
      throw new Error("Should not reach here");
    }
    // Sections remain unchanged
    expect(baseSections.map(s => s.id)).toEqual(["sec_1", "sec_2", "sec_3", "sec_4"]);
  });

  it("section IDs are stable strings suitable for DnD", () => {
    for (const section of baseSections) {
      expect(typeof section.id).toBe("string");
      expect(section.id.length).toBeGreaterThan(0);
    }
  });
});

describe("Write Lyrics - Drag Overlay Preview", () => {
  it("generates preview text from section content", () => {
    const section: LyricSection = {
      id: "test",
      type: "chorus",
      content: "Line one of chorus\nLine two of chorus\nLine three",
    };
    // Mirrors SectionCardOverlay logic
    const preview = section.content.trim()
      ? section.content.trim().split("\n").slice(0, 2).join(" / ")
      : "(empty)";
    expect(preview).toBe("Line one of chorus / Line two of chorus");
  });

  it("shows (empty) for empty section content", () => {
    const section: LyricSection = {
      id: "test",
      type: "verse",
      content: "",
    };
    const preview = section.content.trim()
      ? section.content.trim().split("\n").slice(0, 2).join(" / ")
      : "(empty)";
    expect(preview).toBe("(empty)");
  });

  it("shows single line for single-line content", () => {
    const section: LyricSection = {
      id: "test",
      type: "bridge",
      content: "Just one line",
    };
    const preview = section.content.trim()
      ? section.content.trim().split("\n").slice(0, 2).join(" / ")
      : "(empty)";
    expect(preview).toBe("Just one line");
  });
});
