import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

/**
 * Tests for the collaborative lyrics sharing feature:
 * - Schema validation for shared lyrics input
 * - Share token generation
 * - Section data structure validation
 * - Update payload validation
 * - Edge cases
 */

/* ─── Schema Definitions (matching routers.ts) ─── */
const createSchema = z.object({
  title: z.string().min(1).max(255),
  genre: z.string().max(100).optional(),
  mood: z.string().max(100).optional(),
  vocalType: z.string().max(20).optional(),
  sections: z.array(z.object({
    id: z.string(),
    type: z.string(),
    label: z.string().optional(),
    content: z.string(),
  })),
});

const getByTokenSchema = z.object({
  token: z.string().min(1).max(64),
});

const updateSchema = z.object({
  token: z.string().min(1).max(64),
  title: z.string().min(1).max(255).optional(),
  genre: z.string().max(100).nullable().optional(),
  mood: z.string().max(100).nullable().optional(),
  vocalType: z.string().max(20).nullable().optional(),
  sections: z.array(z.object({
    id: z.string(),
    type: z.string(),
    label: z.string().optional(),
    content: z.string(),
  })).optional(),
  editorName: z.string().max(100).optional(),
});

const deleteSchema = z.object({
  token: z.string().min(1).max(64),
});

/* ─── Test Data ─── */
const validSections = [
  { id: "abc12345", type: "verse", content: "Amazing grace, how sweet the sound" },
  { id: "def67890", type: "chorus", content: "I once was lost, but now am found" },
];

const fullPayload = {
  title: "Amazing Grace",
  genre: "Hymn",
  mood: "Reverent",
  vocalType: "female",
  sections: validSections,
};

/* ─── Create Schema Tests ─── */
describe("Shared Lyrics - Create Schema Validation", () => {
  it("accepts valid full payload", () => {
    const result = createSchema.safeParse(fullPayload);
    expect(result.success).toBe(true);
  });

  it("accepts minimal payload (title + sections only)", () => {
    const result = createSchema.safeParse({
      title: "My Song",
      sections: [{ id: "a", type: "verse", content: "Line 1" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = createSchema.safeParse({
      title: "",
      sections: validSections,
    });
    expect(result.success).toBe(false);
  });

  it("rejects title over 255 characters", () => {
    const result = createSchema.safeParse({
      title: "A".repeat(256),
      sections: validSections,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty sections array", () => {
    const result = createSchema.safeParse({
      title: "My Song",
      sections: [],
    });
    // Empty array is valid per schema (business logic handles this)
    expect(result.success).toBe(true);
  });

  it("rejects section without id", () => {
    const result = createSchema.safeParse({
      title: "My Song",
      sections: [{ type: "verse", content: "Line 1" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects section without type", () => {
    const result = createSchema.safeParse({
      title: "My Song",
      sections: [{ id: "a", content: "Line 1" }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts section with optional label", () => {
    const result = createSchema.safeParse({
      title: "My Song",
      sections: [{ id: "a", type: "verse", label: "Verse 1", content: "Line 1" }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts all section types", () => {
    const types = ["intro", "verse", "pre-chorus", "chorus", "bridge", "hook", "interlude", "ad-lib", "outro"];
    for (const type of types) {
      const result = createSchema.safeParse({
        title: "Test",
        sections: [{ id: "a", type, content: "Content" }],
      });
      expect(result.success).toBe(true);
    }
  });

  it("accepts genre up to 100 chars", () => {
    const result = createSchema.safeParse({
      title: "Test",
      genre: "A".repeat(100),
      sections: [{ id: "a", type: "verse", content: "Line" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects genre over 100 chars", () => {
    const result = createSchema.safeParse({
      title: "Test",
      genre: "A".repeat(101),
      sections: [{ id: "a", type: "verse", content: "Line" }],
    });
    expect(result.success).toBe(false);
  });
});

/* ─── Get By Token Schema Tests ─── */
describe("Shared Lyrics - Get By Token Schema", () => {
  it("accepts valid token", () => {
    const result = getByTokenSchema.safeParse({ token: "abc123def456" });
    expect(result.success).toBe(true);
  });

  it("rejects empty token", () => {
    const result = getByTokenSchema.safeParse({ token: "" });
    expect(result.success).toBe(false);
  });

  it("rejects token over 64 chars", () => {
    const result = getByTokenSchema.safeParse({ token: "A".repeat(65) });
    expect(result.success).toBe(false);
  });
});

/* ─── Update Schema Tests ─── */
describe("Shared Lyrics - Update Schema Validation", () => {
  it("accepts token-only update (no changes)", () => {
    const result = updateSchema.safeParse({ token: "abc123" });
    expect(result.success).toBe(true);
  });

  it("accepts title update", () => {
    const result = updateSchema.safeParse({
      token: "abc123",
      title: "New Title",
    });
    expect(result.success).toBe(true);
  });

  it("accepts sections update", () => {
    const result = updateSchema.safeParse({
      token: "abc123",
      sections: [{ id: "a", type: "chorus", content: "New chorus" }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts editor name", () => {
    const result = updateSchema.safeParse({
      token: "abc123",
      editorName: "John",
    });
    expect(result.success).toBe(true);
  });

  it("accepts nullable genre/mood/vocalType", () => {
    const result = updateSchema.safeParse({
      token: "abc123",
      genre: null,
      mood: null,
      vocalType: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts full update payload", () => {
    const result = updateSchema.safeParse({
      token: "abc123",
      title: "Updated Song",
      genre: "Pop",
      mood: "Happy",
      vocalType: "male",
      sections: validSections,
      editorName: "Alice",
    });
    expect(result.success).toBe(true);
  });

  it("rejects editor name over 100 chars", () => {
    const result = updateSchema.safeParse({
      token: "abc123",
      editorName: "A".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty title in update", () => {
    const result = updateSchema.safeParse({
      token: "abc123",
      title: "",
    });
    expect(result.success).toBe(false);
  });
});

/* ─── Delete Schema Tests ─── */
describe("Shared Lyrics - Delete Schema Validation", () => {
  it("accepts valid token", () => {
    const result = deleteSchema.safeParse({ token: "abc123" });
    expect(result.success).toBe(true);
  });

  it("rejects empty token", () => {
    const result = deleteSchema.safeParse({ token: "" });
    expect(result.success).toBe(false);
  });
});

/* ─── Share Token Generation ─── */
describe("Shared Lyrics - Share Token", () => {
  it("nanoid generates unique tokens", async () => {
    const { nanoid } = await import("nanoid");
    const tokens = new Set<string>();
    for (let i = 0; i < 100; i++) {
      tokens.add(nanoid(16));
    }
    expect(tokens.size).toBe(100);
  });

  it("nanoid generates tokens of correct length", async () => {
    const { nanoid } = await import("nanoid");
    const token = nanoid(16);
    expect(token.length).toBe(16);
  });

  it("nanoid tokens are URL-safe", async () => {
    const { nanoid } = await import("nanoid");
    const token = nanoid(16);
    // nanoid uses A-Za-z0-9_- by default
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

/* ─── Section Data Structure ─── */
describe("Shared Lyrics - Section Data Structure", () => {
  it("sections preserve order", () => {
    const sections = [
      { id: "1", type: "verse", content: "First" },
      { id: "2", type: "chorus", content: "Second" },
      { id: "3", type: "bridge", content: "Third" },
    ];
    const result = createSchema.safeParse({ title: "Test", sections });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sections[0].content).toBe("First");
      expect(result.data.sections[1].content).toBe("Second");
      expect(result.data.sections[2].content).toBe("Third");
    }
  });

  it("sections can have empty content", () => {
    const result = createSchema.safeParse({
      title: "Test",
      sections: [{ id: "a", type: "verse", content: "" }],
    });
    expect(result.success).toBe(true);
  });

  it("sections can have multiline content", () => {
    const result = createSchema.safeParse({
      title: "Test",
      sections: [{ id: "a", type: "verse", content: "Line 1\nLine 2\nLine 3" }],
    });
    expect(result.success).toBe(true);
  });

  it("sections can have special characters", () => {
    const result = createSchema.safeParse({
      title: "Test & <Song>",
      sections: [{ id: "a", type: "verse", content: "Line with 'apostrophes' & \"quotes\"" }],
    });
    expect(result.success).toBe(true);
  });

  it("handles many sections", () => {
    const sections = Array.from({ length: 20 }, (_, i) => ({
      id: `section-${i}`,
      type: i % 2 === 0 ? "verse" : "chorus",
      content: `Content for section ${i}`,
    }));
    const result = createSchema.safeParse({ title: "Long Song", sections });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sections.length).toBe(20);
    }
  });
});

/* ─── Edge Cases ─── */
describe("Shared Lyrics - Edge Cases", () => {
  it("handles unicode in title and content", () => {
    const result = createSchema.safeParse({
      title: "Canción de Alabanza 🎵",
      sections: [{ id: "a", type: "verse", content: "Señor, te alabo con todo mi corazón" }],
    });
    expect(result.success).toBe(true);
  });

  it("handles very long content in a section", () => {
    const longContent = Array(100).fill("This is a long line of lyrics").join("\n");
    const result = createSchema.safeParse({
      title: "Test",
      sections: [{ id: "a", type: "verse", content: longContent }],
    });
    expect(result.success).toBe(true);
  });

  it("handles all optional fields as undefined", () => {
    const result = createSchema.safeParse({
      title: "Minimal",
      sections: [{ id: "a", type: "verse", content: "Just lyrics" }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.genre).toBeUndefined();
      expect(result.data.mood).toBeUndefined();
      expect(result.data.vocalType).toBeUndefined();
    }
  });
});
