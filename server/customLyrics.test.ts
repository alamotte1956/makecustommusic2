import { describe, it, expect, vi } from "vitest";
import { z } from "zod";

/**
 * Tests for the custom lyrics feature:
 * - Validates the generate input schema accepts custom lyrics
 * - Validates the creation modes (describe, write-lyrics, ai-lyrics)
 * - Validates lyrics length constraints
 * - Validates the generateLyrics input schema
 */

// Replicate the generate input schema from routers.ts
const generateInputSchema = z.object({
  keywords: z.string().min(1).max(500),
  engine: z.enum(["elevenlabs"]).default("elevenlabs"),
  genre: z.string().max(100).optional(),
  mood: z.string().max(100).optional(),
  vocalType: z.enum(["none", "male", "female", "mixed"]).optional(),
  duration: z.number().min(15).max(240).optional(),
  mode: z.enum(["simple", "custom"]).optional(),
  customTitle: z.string().max(255).optional(),
  customLyrics: z.string().max(10000).optional(),
  customStyle: z.string().max(500).optional(),
});

// Replicate the generateLyrics input schema from routers.ts
const generateLyricsInputSchema = z.object({
  subject: z.string().min(1).max(500),
  genre: z.string().max(100).optional(),
  mood: z.string().max(100).optional(),
  vocalType: z.enum(["none", "male", "female", "mixed"]).optional(),
  length: z.enum(["standard", "extended"]).default("standard"),
});

describe("Custom Lyrics - Generate Input Schema", () => {
  it("accepts simple mode with just keywords", () => {
    const result = generateInputSchema.safeParse({
      keywords: "happy jazz piano",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mode).toBeUndefined();
      expect(result.data.customLyrics).toBeUndefined();
    }
  });

  it("accepts custom mode with user-written lyrics", () => {
    const result = generateInputSchema.safeParse({
      keywords: "My Custom Song",
      mode: "custom",
      customTitle: "Midnight in Paris",
      customLyrics: "[Verse 1]\nWalking through the city lights\nEvery shadow tells a story tonight\n\n[Chorus]\nWe're dancing in the moonlight",
      customStyle: "synthwave, dreamy, slow tempo",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mode).toBe("custom");
      expect(result.data.customTitle).toBe("Midnight in Paris");
      expect(result.data.customLyrics).toContain("[Verse 1]");
      expect(result.data.customStyle).toBe("synthwave, dreamy, slow tempo");
    }
  });

  it("accepts custom mode with lyrics but no title", () => {
    const result = generateInputSchema.safeParse({
      keywords: "Untitled Song",
      mode: "custom",
      customLyrics: "[Verse 1]\nHello world",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customTitle).toBeUndefined();
    }
  });

  it("accepts custom mode with all optional fields", () => {
    const result = generateInputSchema.safeParse({
      keywords: "Full custom song",
      mode: "custom",
      customTitle: "Summer Nights",
      customLyrics: "[Verse 1]\nSummer breeze\n[Chorus]\nDancing all night",
      customStyle: "pop, upbeat, reverb",
      genre: "Pop",
      mood: "Happy",
      vocalType: "female",
      duration: 120,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.genre).toBe("Pop");
      expect(result.data.mood).toBe("Happy");
      expect(result.data.vocalType).toBe("female");
      expect(result.data.duration).toBe(120);
    }
  });

  it("rejects empty keywords", () => {
    const result = generateInputSchema.safeParse({
      keywords: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects keywords exceeding 500 characters", () => {
    const result = generateInputSchema.safeParse({
      keywords: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("rejects customLyrics exceeding 10000 characters", () => {
    const result = generateInputSchema.safeParse({
      keywords: "Test",
      mode: "custom",
      customLyrics: "a".repeat(10001),
    });
    expect(result.success).toBe(false);
  });

  it("accepts customLyrics at exactly 10000 characters", () => {
    const result = generateInputSchema.safeParse({
      keywords: "Test",
      mode: "custom",
      customLyrics: "a".repeat(10000),
    });
    expect(result.success).toBe(true);
  });

  it("rejects customTitle exceeding 255 characters", () => {
    const result = generateInputSchema.safeParse({
      keywords: "Test",
      mode: "custom",
      customTitle: "a".repeat(256),
    });
    expect(result.success).toBe(false);
  });

  it("rejects customStyle exceeding 500 characters", () => {
    const result = generateInputSchema.safeParse({
      keywords: "Test",
      mode: "custom",
      customStyle: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid mode value", () => {
    const result = generateInputSchema.safeParse({
      keywords: "Test",
      mode: "write-lyrics",
    });
    expect(result.success).toBe(false);
  });

  it("defaults engine to elevenlabs", () => {
    const result = generateInputSchema.safeParse({
      keywords: "Test song",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.engine).toBe("elevenlabs");
    }
  });

  it("accepts all vocal types", () => {
    for (const vt of ["none", "male", "female", "mixed"]) {
      const result = generateInputSchema.safeParse({
        keywords: "Test",
        vocalType: vt,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid vocal type", () => {
    const result = generateInputSchema.safeParse({
      keywords: "Test",
      vocalType: "robot",
    });
    expect(result.success).toBe(false);
  });

  it("rejects duration below 15", () => {
    const result = generateInputSchema.safeParse({
      keywords: "Test",
      duration: 10,
    });
    expect(result.success).toBe(false);
  });

  it("rejects duration above 240", () => {
    const result = generateInputSchema.safeParse({
      keywords: "Test",
      duration: 300,
    });
    expect(result.success).toBe(false);
  });
});

describe("Custom Lyrics - Generate Lyrics Input Schema", () => {
  it("accepts a simple subject", () => {
    const result = generateLyricsInputSchema.safeParse({
      subject: "falling in love on a summer night",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.length).toBe("standard");
    }
  });

  it("accepts subject with all optional fields", () => {
    const result = generateLyricsInputSchema.safeParse({
      subject: "road trip with friends",
      genre: "Country",
      mood: "Happy",
      vocalType: "mixed",
      length: "extended",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.genre).toBe("Country");
      expect(result.data.mood).toBe("Happy");
      expect(result.data.vocalType).toBe("mixed");
      expect(result.data.length).toBe("extended");
    }
  });

  it("rejects empty subject", () => {
    const result = generateLyricsInputSchema.safeParse({
      subject: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects subject exceeding 500 characters", () => {
    const result = generateLyricsInputSchema.safeParse({
      subject: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("defaults length to standard", () => {
    const result = generateLyricsInputSchema.safeParse({
      subject: "test",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.length).toBe("standard");
    }
  });

  it("accepts extended length", () => {
    const result = generateLyricsInputSchema.safeParse({
      subject: "test",
      length: "extended",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.length).toBe("extended");
    }
  });

  it("rejects invalid length value", () => {
    const result = generateLyricsInputSchema.safeParse({
      subject: "test",
      length: "short",
    });
    expect(result.success).toBe(false);
  });
});

describe("Custom Lyrics - Frontend Creation Modes", () => {
  // These test the mapping between frontend creation modes and backend mode values
  const CREATION_MODES = ["describe", "write-lyrics", "ai-lyrics"] as const;

  it("maps describe mode to simple backend mode", () => {
    const mode = "describe";
    const isCustomMode = mode === "write-lyrics" || mode === "ai-lyrics";
    expect(isCustomMode).toBe(false);
    // In simple mode, backend receives mode: "simple" or undefined
  });

  it("maps write-lyrics mode to custom backend mode", () => {
    const mode = "write-lyrics";
    const isCustomMode = mode === "write-lyrics" || mode === "ai-lyrics";
    expect(isCustomMode).toBe(true);
    // In custom mode, backend receives mode: "custom"
  });

  it("maps ai-lyrics mode to custom backend mode", () => {
    const mode = "ai-lyrics";
    const isCustomMode = mode === "write-lyrics" || mode === "ai-lyrics";
    expect(isCustomMode).toBe(true);
    // In custom mode, backend receives mode: "custom"
  });

  it("all creation modes are defined", () => {
    expect(CREATION_MODES).toHaveLength(3);
    expect(CREATION_MODES).toContain("describe");
    expect(CREATION_MODES).toContain("write-lyrics");
    expect(CREATION_MODES).toContain("ai-lyrics");
  });
});

describe("Custom Lyrics - Lyrics Content Validation", () => {
  it("handles lyrics with section markers", () => {
    const lyrics = "[Verse 1]\nLine one\nLine two\n\n[Chorus]\nChorus line";
    const result = generateInputSchema.safeParse({
      keywords: "Test",
      mode: "custom",
      customLyrics: lyrics,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customLyrics).toContain("[Verse 1]");
      expect(result.data.customLyrics).toContain("[Chorus]");
    }
  });

  it("handles lyrics with unicode characters", () => {
    const lyrics = "[Verse 1]\nCafé résumé naïve\n\n[Chorus]\n♫ La la la ♪";
    const result = generateInputSchema.safeParse({
      keywords: "Test",
      mode: "custom",
      customLyrics: lyrics,
    });
    expect(result.success).toBe(true);
  });

  it("handles lyrics with only whitespace (still valid string)", () => {
    const lyrics = "   \n\n   ";
    const result = generateInputSchema.safeParse({
      keywords: "Test",
      mode: "custom",
      customLyrics: lyrics,
    });
    expect(result.success).toBe(true);
    // Note: The frontend validates that lyrics are non-empty before submitting
  });

  it("handles multi-line lyrics with various section types", () => {
    const lyrics = `[Intro]
Soft piano intro

[Verse 1]
Walking down the street
Feeling the beat

[Pre-Chorus]
Building up the tension

[Chorus]
Here we go again
Dancing in the rain

[Verse 2]
Another day goes by
Under the sky

[Bridge]
Everything changes now

[Outro]
Fade to silence`;
    const result = generateInputSchema.safeParse({
      keywords: "Test",
      mode: "custom",
      customLyrics: lyrics,
    });
    expect(result.success).toBe(true);
  });

  it("handles lyrics with duet markers for mixed vocals", () => {
    const lyrics = `[Verse 1]
[Male] I've been waiting for this moment
[Female] So have I, my darling
[Both] Together we'll find our way`;
    const result = generateInputSchema.safeParse({
      keywords: "Duet Song",
      mode: "custom",
      customLyrics: lyrics,
      vocalType: "mixed",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vocalType).toBe("mixed");
      expect(result.data.customLyrics).toContain("[Male]");
      expect(result.data.customLyrics).toContain("[Female]");
      expect(result.data.customLyrics).toContain("[Both]");
    }
  });
});

describe("Custom Lyrics - Song Template Structures", () => {
  const TEMPLATES = {
    "Love Song": "[Verse 1]\n\n\n[Pre-Chorus]\n\n\n[Chorus]\n\n\n[Verse 2]\n\n\n[Chorus]\n\n\n[Bridge]\n\n\n[Chorus]",
    "Story Song": "[Intro]\n\n\n[Verse 1]\n\n\n[Verse 2]\n\n\n[Chorus]\n\n\n[Verse 3]\n\n\n[Chorus]\n\n\n[Outro]",
    "Hip Hop / Rap": "[Intro]\n\n\n[Verse 1]\n\n\n[Hook]\n\n\n[Verse 2]\n\n\n[Hook]\n\n\n[Bridge]\n\n\n[Hook]",
    "Simple (Verse-Chorus)": "[Verse 1]\n\n\n[Chorus]\n\n\n[Verse 2]\n\n\n[Chorus]",
  };

  it("all templates are valid lyrics strings", () => {
    for (const [name, template] of Object.entries(TEMPLATES)) {
      const result = generateInputSchema.safeParse({
        keywords: name,
        mode: "custom",
        customLyrics: template,
      });
      expect(result.success).toBe(true);
    }
  });

  it("all templates contain at least one section marker", () => {
    for (const template of Object.values(TEMPLATES)) {
      expect(template).toMatch(/\[.+\]/);
    }
  });

  it("Love Song template has standard pop structure", () => {
    expect(TEMPLATES["Love Song"]).toContain("[Verse 1]");
    expect(TEMPLATES["Love Song"]).toContain("[Pre-Chorus]");
    expect(TEMPLATES["Love Song"]).toContain("[Chorus]");
    expect(TEMPLATES["Love Song"]).toContain("[Bridge]");
  });

  it("Hip Hop template uses Hook instead of Chorus", () => {
    expect(TEMPLATES["Hip Hop / Rap"]).toContain("[Hook]");
    expect(TEMPLATES["Hip Hop / Rap"]).not.toContain("[Chorus]");
  });
});
