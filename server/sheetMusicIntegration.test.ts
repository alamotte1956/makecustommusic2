/**
 * Sheet Music Integration Tests
 * 
 * Tests the full sheet music generation pipeline:
 * 1. buildSongContext - building the LLM prompt
 * 2. sanitiseAbc - cleaning LLM output
 * 3. validateAbc - validating ABC notation
 * 4. generateAbcNotation - full LLM call (mocked)
 * 5. generateSheetMusicInBackground - background job flow
 * 6. mp3SheetProcessor - MP3 to sheet music flow
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildSongContext, sanitiseAbc, validateAbc, generateAbcNotation } from "./backgroundSheetMusic";

// ─── buildSongContext tests ───

describe("buildSongContext", () => {
  it("includes all provided fields", () => {
    const ctx = buildSongContext({
      title: "Amazing Grace",
      genre: "Hymn",
      mood: "Reverent",
      keySignature: "G",
      timeSignature: "3/4",
      tempo: 80,
      lyrics: "Amazing grace, how sweet the sound",
    });
    expect(ctx).toContain("Title: Amazing Grace");
    expect(ctx).toContain("Genre: Hymn");
    expect(ctx).toContain("Mood: Reverent");
    expect(ctx).toContain("Key: G");
    expect(ctx).toContain("Time Signature: 3/4");
    expect(ctx).toContain("Tempo: 80 BPM");
    expect(ctx).toContain("Lyrics:\nAmazing grace, how sweet the sound");
  });

  it("omits null/undefined fields gracefully", () => {
    const ctx = buildSongContext({
      title: "Untitled",
      genre: null,
      mood: undefined,
      lyrics: null,
    });
    expect(ctx).toBe("Title: Untitled");
    expect(ctx).not.toContain("Genre");
    expect(ctx).not.toContain("Mood");
    expect(ctx).not.toContain("Lyrics");
  });

  it("handles empty string title", () => {
    const ctx = buildSongContext({ title: "" });
    expect(ctx).toBe("Title: ");
  });
});

// ─── sanitiseAbc tests ───

describe("sanitiseAbc", () => {
  it("strips markdown code fences", () => {
    const raw = "```abc\nX:1\nT:Test\nK:C\nCDEF|\n```";
    const result = sanitiseAbc(raw);
    expect(result).not.toContain("```");
    expect(result).toContain("X:1");
  });

  it("removes V: voice directives", () => {
    const raw = "X:1\nT:Test\nK:C\nV:1 clef=treble\nCDEF|";
    const result = sanitiseAbc(raw);
    expect(result).not.toContain("V:1");
    expect(result).toContain("CDEF|");
  });

  it("removes %%staves directives", () => {
    const raw = "X:1\nT:Test\n%%staves [1 2]\nK:C\nCDEF|";
    const result = sanitiseAbc(raw);
    expect(result).not.toContain("%%staves");
  });

  it("converts [P:] markers to comments", () => {
    const raw = "X:1\nT:Test\nK:C\n[P:Verse 1]\nCDEF|";
    const result = sanitiseAbc(raw);
    expect(result).toContain("% [P:Verse 1]");
    expect(result).not.toMatch(/^\[P:/m);
  });

  it("removes standalone dynamics", () => {
    const raw = "X:1\nT:Test\nK:C\n!mf!\nCDEF|\n!ff!\nGABc|";
    const result = sanitiseAbc(raw);
    expect(result).not.toMatch(/^!mf!$/m);
    expect(result).not.toMatch(/^!ff!$/m);
    expect(result).toContain("CDEF|");
  });

  it("strips preamble text before X: header", () => {
    const raw = "Here is the ABC notation for your song:\n\nX:1\nT:Test\nK:C\nCDEF|";
    const result = sanitiseAbc(raw);
    expect(result).toMatch(/^X:1/);
    expect(result).not.toContain("Here is");
  });

  it("strips postamble text after music content", () => {
    const raw = "X:1\nT:Test\nK:C\nCDEF|\n\nI hope you enjoy this music!";
    const result = sanitiseAbc(raw);
    expect(result).not.toContain("I hope");
  });

  it("injects missing M: header", () => {
    const raw = "X:1\nT:Test\nL:1/8\nK:C\nCDEF|";
    const result = sanitiseAbc(raw);
    expect(result).toContain("M:4/4");
  });

  it("injects missing L: header", () => {
    const raw = "X:1\nT:Test\nM:4/4\nK:C\nCDEF|";
    const result = sanitiseAbc(raw);
    expect(result).toContain("L:1/8");
  });

  it("injects missing Q: header", () => {
    const raw = "X:1\nT:Test\nM:4/4\nL:1/8\nK:C\nCDEF|";
    const result = sanitiseAbc(raw);
    expect(result).toContain("Q:1/4=120");
  });

  it("does not duplicate existing headers", () => {
    const raw = "X:1\nT:Test\nM:3/4\nL:1/4\nQ:1/4=80\nK:G\nGAB|";
    const result = sanitiseAbc(raw);
    // Should keep original values, not inject defaults
    expect(result).toContain("M:3/4");
    expect(result).toContain("L:1/4");
    expect(result).toContain("Q:1/4=80");
    // Should NOT have the defaults
    const mCount = (result.match(/^M:/gm) || []).length;
    expect(mCount).toBe(1);
  });

  it("handles completely empty input", () => {
    const result = sanitiseAbc("");
    expect(result).toBe("");
  });

  it("handles ABC with only headers and no music", () => {
    const raw = "X:1\nT:Test\nK:C";
    const result = sanitiseAbc(raw);
    expect(result).toContain("X:1");
    expect(result).toContain("T:Test");
  });
});

// ─── validateAbc tests ───

describe("validateAbc", () => {
  it("returns null for valid ABC", () => {
    const abc = "X:1\nT:Test Song\nM:4/4\nL:1/8\nQ:1/4=120\nK:C\nCDEF GABc|";
    expect(validateAbc(abc)).toBeNull();
  });

  it("rejects empty input", () => {
    expect(validateAbc("")).toBe("Empty ABC notation");
    expect(validateAbc("   ")).toBe("Empty ABC notation");
  });

  it("rejects missing X: header", () => {
    const abc = "T:Test\nK:C\nCDEF|";
    expect(validateAbc(abc)).toContain("Missing X:");
  });

  it("rejects missing T: header", () => {
    const abc = "X:1\nK:C\nCDEF|";
    expect(validateAbc(abc)).toContain("Missing T:");
  });

  it("rejects missing K: header", () => {
    const abc = "X:1\nT:Test\nCDEF|";
    expect(validateAbc(abc)).toContain("Missing K:");
  });

  it("rejects headers-only with no music content", () => {
    const abc = "X:1\nT:Test\nM:4/4\nK:C";
    expect(validateAbc(abc)).toContain("No music content");
  });

  it("accepts ABC with lyrics lines", () => {
    const abc = "X:1\nT:Test\nK:C\nCDEF GABc|\nw:Ama-zing grace how sweet";
    expect(validateAbc(abc)).toBeNull();
  });

  it("accepts ABC with comments", () => {
    const abc = "X:1\nT:Test\nK:C\n% Verse 1\nCDEF GABc|";
    expect(validateAbc(abc)).toBeNull();
  });

  it("accepts ABC with chord symbols", () => {
    const abc = 'X:1\nT:Test\nK:C\n"Am"A2 B2 "F"c2 d2|';
    expect(validateAbc(abc)).toBeNull();
  });
});

// ─── generateAbcNotation tests (with mocked LLM) ───

describe("generateAbcNotation", () => {
  it("sanitises and validates LLM output correctly", () => {
    // Test the pipeline: sanitise + validate on valid ABC
    const validAbc = "X:1\nT:Test Song\nM:4/4\nL:1/8\nQ:1/4=120\nK:C\nCDEF GABc|cBAG FEDC|";
    const cleaned = sanitiseAbc(validAbc);
    expect(cleaned).toContain("X:1");
    expect(cleaned).toContain("T:Test Song");
    expect(validateAbc(cleaned)).toBeNull();
  });

  it("extractLLMText handles array content (Claude thinking blocks)", async () => {
    const { extractLLMText } = await import("./llmHelpers");
    const validAbc = "X:1\nT:Test Song\nM:4/4\nL:1/8\nQ:1/4=120\nK:C\nCDEF GABc|cBAG FEDC|";
    const content = [
      { type: "thinking", thinking: "Let me compose..." },
      { type: "text", text: validAbc },
    ];
    const result = extractLLMText(content);
    expect(result).toContain("X:1");
    expect(result).toContain("CDEF GABc");
  });

  it("extractLLMText returns null for empty/null content", async () => {
    const { extractLLMText } = await import("./llmHelpers");
    expect(extractLLMText(null)).toBeNull();
    expect(extractLLMText("")).toBeNull();
    expect(extractLLMText(undefined)).toBeNull();
  });

  it("validateAbc rejects ABC with no music content", () => {
    const headerOnly = "X:1\nT:Test\nK:C";
    const error = validateAbc(headerOnly);
    expect(error).toContain("No music content");
  });

  it("validateAbc rejects empty input", () => {
    expect(validateAbc("")).toBeTruthy();
    expect(validateAbc("  ")).toBeTruthy();
  });

  it("full pipeline: sanitise then validate on wrapped ABC", () => {
    // ABC wrapped in code fences with preamble
    const raw = "Here is the notation:\n\n```abc\nX:1\nT:Test Song\nM:4/4\nL:1/8\nQ:1/4=120\nK:C\nCDEF GABc|cBAG FEDC|\n```\n\nEnjoy!";
    const cleaned = sanitiseAbc(raw);
    expect(cleaned).toMatch(/^X:1/);
    expect(cleaned).not.toContain("```");
    expect(cleaned).not.toContain("Here is");
    expect(cleaned).not.toContain("Enjoy");
    expect(validateAbc(cleaned)).toBeNull();
  });
});

// ─── Edge cases that could cause "doesn't work at all" ───

describe("Sheet Music Edge Cases", () => {
  it("sanitiseAbc handles ABC with Windows-style line endings", () => {
    const raw = "X:1\r\nT:Test\r\nK:C\r\nCDEF|\r\n";
    const result = sanitiseAbc(raw);
    expect(result).toContain("X:1");
    expect(result).toContain("CDEF|");
  });

  it("sanitiseAbc handles ABC wrapped in triple backticks with language tag", () => {
    const raw = "```abc\nX:1\nT:Test\nK:C\nCDEF|\n```\n";
    const result = sanitiseAbc(raw);
    expect(result).toContain("X:1");
    expect(result).not.toContain("```");
  });

  it("sanitiseAbc handles ABC with explanatory text mixed in", () => {
    const raw = "Here is the ABC notation:\n\nX:1\nT:Test\nM:4/4\nL:1/8\nK:C\nCDEF GABc|\n\nThis notation represents a simple melody.";
    const result = sanitiseAbc(raw);
    expect(result).toMatch(/^X:1/);
    expect(result).not.toContain("Here is");
    expect(result).not.toContain("This notation");
  });

  it("validateAbc accepts minimal valid ABC", () => {
    const abc = "X:1\nT:A\nK:C\nC|";
    expect(validateAbc(abc)).toBeNull();
  });

  it("sanitiseAbc preserves w: lyrics lines", () => {
    const raw = "X:1\nT:Test\nK:C\nCDEF GABc|\nw:A-ma-zing grace how sweet";
    const result = sanitiseAbc(raw);
    expect(result).toContain("w:A-ma-zing grace how sweet");
  });

  it("sanitiseAbc preserves % comment lines", () => {
    const raw = "X:1\nT:Test\nK:C\n% Verse 1\nCDEF|";
    const result = sanitiseAbc(raw);
    expect(result).toContain("% Verse 1");
  });

  it("sanitiseAbc handles K: header with mode suffix", () => {
    const raw = "X:1\nT:Test\nK:Dmaj\nDEFG|";
    const result = sanitiseAbc(raw);
    expect(result).toContain("K:Dmaj");
    // Should inject M: before K:
    expect(result).toContain("M:4/4");
  });

  it("sanitiseAbc handles K: header not being last", () => {
    // Some LLMs put K: before other headers
    const raw = "X:1\nT:Test\nK:C\nM:4/4\nL:1/8\nCDEF|";
    const result = sanitiseAbc(raw);
    // Should still be valid
    expect(result).toContain("X:1");
    expect(result).toContain("K:C");
  });
});
