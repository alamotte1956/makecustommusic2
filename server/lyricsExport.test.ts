import { describe, it, expect } from "vitest";
import { buildPlainText, buildPdf, buildDocx } from "./lyricsExport";

/**
 * Tests for the lyrics export feature:
 * - Plain text generation with section markers
 * - PDF generation (buffer output)
 * - DOCX generation (buffer output)
 * - Edge cases: empty sections, missing metadata, special characters
 */

/* ─── Test Data ─── */
const samplePayload = {
  title: "Amazing Grace",
  genre: "Hymn",
  mood: "Reverent",
  vocalType: "female",
  sections: [
    { type: "verse", content: "Amazing grace, how sweet the sound\nThat saved a wretch like me" },
    { type: "chorus", content: "I once was lost, but now am found\nWas blind, but now I see" },
    { type: "verse", content: "'Twas grace that taught my heart to fear\nAnd grace my fears relieved" },
    { type: "bridge", content: "When we've been there ten thousand years\nBright shining as the sun" },
  ],
  format: "txt" as const,
};

const minimalPayload = {
  title: "",
  sections: [
    { type: "verse", content: "Just one line" },
  ],
  format: "txt" as const,
};

const emptyContentPayload = {
  title: "Empty Song",
  sections: [
    { type: "verse", content: "" },
    { type: "chorus", content: "   " },
    { type: "bridge", content: "Real content here" },
  ],
  format: "txt" as const,
};

/* ─── Plain Text Tests ─── */
describe("Lyrics Export - Plain Text", () => {
  it("generates text with title and underline", () => {
    const text = buildPlainText(samplePayload);
    expect(text).toContain("Amazing Grace");
    expect(text).toContain("=".repeat("Amazing Grace".length));
  });

  it("includes metadata line", () => {
    const text = buildPlainText(samplePayload);
    expect(text).toContain("Hymn");
    expect(text).toContain("Reverent");
    expect(text).toContain("Female");
  });

  it("includes section markers", () => {
    const text = buildPlainText(samplePayload);
    expect(text).toContain("[Verse]");
    expect(text).toContain("[Chorus]");
    expect(text).toContain("[Bridge]");
  });

  it("includes lyrics content", () => {
    const text = buildPlainText(samplePayload);
    expect(text).toContain("Amazing grace, how sweet the sound");
    expect(text).toContain("I once was lost, but now am found");
    expect(text).toContain("'Twas grace that taught my heart to fear");
  });

  it("includes copyright footer", () => {
    const text = buildPlainText(samplePayload);
    expect(text).toContain("Albert LaMotte");
    expect(text).toContain("Create Christian Music");
  });

  it("handles missing title", () => {
    const text = buildPlainText(minimalPayload);
    expect(text).toContain("Untitled Song");
  });

  it("handles missing metadata", () => {
    const text = buildPlainText(minimalPayload);
    // Should not have metadata line with pipes
    expect(text).not.toContain(" | ");
  });

  it("skips empty sections", () => {
    const text = buildPlainText(emptyContentPayload);
    expect(text).not.toContain("[Verse]");
    expect(text).not.toContain("[Chorus]");
    expect(text).toContain("[Bridge]");
    expect(text).toContain("Real content here");
  });

  it("handles all section types", () => {
    const allTypes = {
      title: "All Types",
      sections: [
        { type: "intro", content: "Intro content" },
        { type: "verse", content: "Verse content" },
        { type: "pre-chorus", content: "Pre-chorus content" },
        { type: "chorus", content: "Chorus content" },
        { type: "bridge", content: "Bridge content" },
        { type: "hook", content: "Hook content" },
        { type: "interlude", content: "Interlude content" },
        { type: "ad-lib", content: "Ad-lib content" },
        { type: "outro", content: "Outro content" },
      ],
      format: "txt" as const,
    };
    const text = buildPlainText(allTypes);
    expect(text).toContain("[Intro]");
    expect(text).toContain("[Verse]");
    expect(text).toContain("[Pre-Chorus]");
    expect(text).toContain("[Chorus]");
    expect(text).toContain("[Bridge]");
    expect(text).toContain("[Hook]");
    expect(text).toContain("[Interlude]");
    expect(text).toContain("[Ad-lib]");
    expect(text).toContain("[Outro]");
  });

  it("uses custom label when provided", () => {
    const payload = {
      title: "Test",
      sections: [
        { type: "verse", label: "Verse 1", content: "First verse" },
        { type: "verse", label: "Verse 2", content: "Second verse" },
      ],
      format: "txt" as const,
    };
    const text = buildPlainText(payload);
    expect(text).toContain("[Verse 1]");
    expect(text).toContain("[Verse 2]");
  });

  it("maps vocal types correctly", () => {
    const vocalTypes = [
      { vocalType: "male", expected: "Male" },
      { vocalType: "female", expected: "Female" },
      { vocalType: "mixed", expected: "Mixed" },
      { vocalType: "male_and_female", expected: "Male & Female" },
    ];
    for (const { vocalType, expected } of vocalTypes) {
      const text = buildPlainText({
        title: "Test",
        vocalType,
        sections: [{ type: "verse", content: "Line" }],
        format: "txt",
      });
      expect(text).toContain(`Vocal: ${expected}`);
    }
  });

  it("excludes vocal type 'none'", () => {
    const text = buildPlainText({
      title: "Test",
      vocalType: "none",
      sections: [{ type: "verse", content: "Line" }],
      format: "txt",
    });
    expect(text).not.toContain("Vocal:");
  });

  it("handles special characters in content", () => {
    const text = buildPlainText({
      title: "Test & <Song>",
      sections: [{ type: "verse", content: "Line with \"quotes\" & <brackets>" }],
      format: "txt",
    });
    expect(text).toContain("Test & <Song>");
    expect(text).toContain("Line with \"quotes\" & <brackets>");
  });
});

/* ─── PDF Tests ─── */
describe("Lyrics Export - PDF", () => {
  it("generates a valid PDF buffer", async () => {
    const buffer = await buildPdf(samplePayload);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    // PDF magic bytes: %PDF
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("generates PDF with minimal payload", async () => {
    const buffer = await buildPdf(minimalPayload);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("generates PDF with empty sections (only non-empty rendered)", async () => {
    const buffer = await buildPdf(emptyContentPayload);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("generates PDF with all section types", async () => {
    const payload = {
      title: "Full Song",
      genre: "Pop",
      mood: "Upbeat",
      vocalType: "mixed",
      sections: [
        { type: "intro", content: "Intro" },
        { type: "verse", content: "Verse" },
        { type: "chorus", content: "Chorus" },
        { type: "bridge", content: "Bridge" },
        { type: "outro", content: "Outro" },
      ],
      format: "pdf" as const,
    };
    const buffer = await buildPdf(payload);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(500); // Non-trivial PDF
  });

  it("handles long lyrics without error", async () => {
    const longContent = Array(50).fill("This is a long line of lyrics that goes on and on").join("\n");
    const buffer = await buildPdf({
      title: "Long Song",
      sections: [{ type: "verse", content: longContent }],
      format: "pdf",
    });
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);
  });
});

/* ─── DOCX Tests ─── */
describe("Lyrics Export - DOCX", () => {
  it("generates a valid DOCX buffer", async () => {
    const buffer = await buildDocx(samplePayload);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    // DOCX is a ZIP file, magic bytes: PK (0x50 0x4B)
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4B);
  });

  it("generates DOCX with minimal payload", async () => {
    const buffer = await buildDocx(minimalPayload);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4B);
  });

  it("generates DOCX with empty sections", async () => {
    const buffer = await buildDocx(emptyContentPayload);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("generates DOCX with metadata", async () => {
    const buffer = await buildDocx({
      title: "Worship Song",
      genre: "Worship",
      mood: "Peaceful",
      vocalType: "female",
      sections: [
        { type: "verse", content: "Verse content" },
        { type: "chorus", content: "Chorus content" },
      ],
      format: "docx",
    });
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(500);
  });

  it("handles long lyrics without error", async () => {
    const longContent = Array(50).fill("This is a long line of lyrics").join("\n");
    const buffer = await buildDocx({
      title: "Long Song",
      sections: [{ type: "verse", content: longContent }],
      format: "docx",
    });
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it("handles special characters", async () => {
    const buffer = await buildDocx({
      title: "Test & <Song> \"Special\"",
      sections: [{ type: "verse", content: "Line with 'apostrophes' & \"quotes\"" }],
      format: "docx",
    });
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });
});

/* ─── Cross-format Consistency ─── */
describe("Lyrics Export - Cross-format Consistency", () => {
  it("all formats produce non-empty output for the same payload", async () => {
    const text = buildPlainText(samplePayload);
    const pdf = await buildPdf(samplePayload);
    const docx = await buildDocx(samplePayload);

    expect(text.length).toBeGreaterThan(0);
    expect(pdf.length).toBeGreaterThan(0);
    expect(docx.length).toBeGreaterThan(0);
  });

  it("all formats handle single section", async () => {
    const payload = {
      title: "One Section",
      sections: [{ type: "chorus", content: "Just a chorus" }],
      format: "txt" as const,
    };
    const text = buildPlainText(payload);
    const pdf = await buildPdf(payload);
    const docx = await buildDocx(payload);

    expect(text).toContain("[Chorus]");
    expect(pdf.length).toBeGreaterThan(0);
    expect(docx.length).toBeGreaterThan(0);
  });
});
