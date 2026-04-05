/**
 * Sheet Music Integration Tests
 * 
 * Tests the full sheet music generation pipeline:
 * 1. buildSongContext - building the LLM prompt
 * 2. sanitiseAbc - cleaning LLM output (single source of truth)
 * 3. validateAbc - validating ABC notation structure
 * 4. generateAbcNotation - full LLM call (mocked)
 * 5. KEY_ACCIDENTALS - key signature accidental map
 * 6. Edge cases that could cause "doesn't work at all"
 */

import { describe, it, expect } from "vitest";
import { buildSongContext, sanitiseAbc, validateAbc, KEY_ACCIDENTALS } from "./backgroundSheetMusic";

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

  it("strips inline dynamics decorations", () => {
    const raw = "X:1\nT:Test\nK:C\n!mf!CDEF !f!GABc|";
    const result = sanitiseAbc(raw);
    expect(result).not.toContain("!mf!");
    expect(result).not.toContain("!f!");
    expect(result).toContain("CDEF");
    expect(result).toContain("GABc|");
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

  it("strips short postamble like 'Enjoy!'", () => {
    const raw = "X:1\nT:Test\nM:4/4\nL:1/8\nQ:1/4=120\nK:C\nCDEF GABc|cBAG FEDC|\n\nEnjoy!";
    const result = sanitiseAbc(raw);
    expect(result).not.toContain("Enjoy");
  });

  it("strips multi-sentence postamble", () => {
    const raw = "X:1\nT:Test\nK:C\nCDEF|\n\nThis notation represents a simple melody. Feel free to modify it.";
    const result = sanitiseAbc(raw);
    expect(result).not.toContain("This notation");
    expect(result).not.toContain("Feel free");
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
    expect(result).toContain("M:3/4");
    expect(result).toContain("L:1/4");
    expect(result).toContain("Q:1/4=80");
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

  it("preserves w: lyrics lines", () => {
    const raw = "X:1\nT:Test\nK:C\nCDEF GABc|\nw:A-ma-zing grace how sweet";
    const result = sanitiseAbc(raw);
    expect(result).toContain("w:A-ma-zing grace how sweet");
  });

  it("preserves % comment lines", () => {
    const raw = "X:1\nT:Test\nK:C\n% Verse 1\nCDEF|";
    const result = sanitiseAbc(raw);
    expect(result).toContain("% Verse 1");
  });

  it("handles Windows-style line endings", () => {
    const raw = "X:1\r\nT:Test\r\nK:C\r\nCDEF|\r\n";
    const result = sanitiseAbc(raw);
    expect(result).toContain("X:1");
    expect(result).toContain("CDEF|");
  });

  it("handles K: header with mode suffix", () => {
    const raw = "X:1\nT:Test\nK:Dmaj\nDEFG|";
    const result = sanitiseAbc(raw);
    expect(result).toContain("K:Dmaj");
    expect(result).toContain("M:4/4");
  });

  it("strips unsupported decorations like !fermata! and !accent!", () => {
    const raw = "X:1\nT:Test\nK:C\n!accent!C2 !fermata!D2 !trill!E2 F2|";
    const result = sanitiseAbc(raw);
    expect(result).not.toContain("!accent!");
    expect(result).not.toContain("!fermata!");
    expect(result).not.toContain("!trill!");
    expect(result).toContain("C2");
    expect(result).toContain("D2");
  });
});

// ─── validateAbc tests ───

describe("validateAbc", () => {
  it("returns null for valid ABC", () => {
    const abc = "X:1\nT:Test Song\nM:4/4\nL:1/8\nQ:1/4=120\nK:C\nCDEF GABc|cBAG FEDC|\nGABc cBAG|FEDC DEFG|\nABcd dcBA|";
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

  it("rejects music without bar lines", () => {
    const abc = "X:1\nT:Test\nK:C\nCDEF GABc";
    const error = validateAbc(abc);
    expect(error).toContain("No bar lines");
  });

  it("rejects very short music (less than 3 music lines)", () => {
    const abc = "X:1\nT:Test\nK:C\nC|";
    const error = validateAbc(abc);
    expect(error).toContain("too short");
  });

  it("accepts ABC with lyrics lines", () => {
    const abc = "X:1\nT:Test\nK:C\nCDEF GABc|cBAG FEDC|\nGABc cBAG|FEDC DEFG|\nABcd dcBA|GFED CDEF|\nw:Ama-zing grace how sweet";
    expect(validateAbc(abc)).toBeNull();
  });

  it("accepts ABC with comments", () => {
    const abc = "X:1\nT:Test\nK:C\n% Verse 1\nCDEF GABc|cBAG FEDC|\nGABc cBAG|FEDC DEFG|\nABcd dcBA|";
    expect(validateAbc(abc)).toBeNull();
  });

  it("accepts ABC with chord symbols", () => {
    const abc = 'X:1\nT:Test\nK:C\n"Am"A2 B2 "F"c2 d2|"C"e2 d2 "G"c2 B2|\n"Am"A2 B2 "F"c2 d2|"G"e2 d2 c2 B2|\n"C"E2 F2 G2 A2|';
    expect(validateAbc(abc)).toBeNull();
  });

  it("validates key signature format", () => {
    const abc = "X:1\nT:Test\nK:XYZ\nCDEF|GABc|\ncBAG|";
    const error = validateAbc(abc);
    expect(error).toContain("Invalid key signature");
  });

  it("accepts valid key signatures with modes", () => {
    const abc = "X:1\nT:Test\nK:Dmix\nDEFG|ABcd|\ndefg|ABcd|\nDEFG|";
    expect(validateAbc(abc)).toBeNull();
  });
});

// ─── KEY_ACCIDENTALS tests ───

describe("KEY_ACCIDENTALS", () => {
  it("C major has no accidentals", () => {
    expect(KEY_ACCIDENTALS["C"]).toEqual({});
  });

  it("G major has F#", () => {
    expect(KEY_ACCIDENTALS["G"]).toEqual({ F: 1 });
  });

  it("D major has F# and C#", () => {
    expect(KEY_ACCIDENTALS["D"]).toEqual({ F: 1, C: 1 });
  });

  it("F major has Bb", () => {
    expect(KEY_ACCIDENTALS["F"]).toEqual({ B: -1 });
  });

  it("Bb major has Bb and Eb", () => {
    expect(KEY_ACCIDENTALS["Bb"]).toEqual({ B: -1, E: -1 });
  });

  it("Am has no accidentals (relative minor of C)", () => {
    expect(KEY_ACCIDENTALS["Am"]).toEqual({});
  });

  it("Em has F# (relative minor of G)", () => {
    expect(KEY_ACCIDENTALS["Em"]).toEqual({ F: 1 });
  });

  it("Dm has Bb (relative minor of F)", () => {
    expect(KEY_ACCIDENTALS["Dm"]).toEqual({ B: -1 });
  });

  it("all major keys are present", () => {
    const majorKeys = ["C", "G", "D", "A", "E", "B", "F#", "C#", "F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"];
    for (const key of majorKeys) {
      expect(KEY_ACCIDENTALS).toHaveProperty(key);
    }
  });

  it("all minor keys are present", () => {
    const minorKeys = ["Am", "Em", "Bm", "F#m", "C#m", "G#m", "D#m", "A#m", "Dm", "Gm", "Cm", "Fm", "Bbm", "Ebm", "Abm"];
    for (const key of minorKeys) {
      expect(KEY_ACCIDENTALS).toHaveProperty(key);
    }
  });
});

// ─── Full pipeline tests ───

describe("Full pipeline: sanitise + validate", () => {
  it("handles ABC wrapped in code fences with preamble and postamble", () => {
    const raw = "Here is the notation:\n\n```abc\nX:1\nT:Test Song\nM:4/4\nL:1/8\nQ:1/4=120\nK:C\nCDEF GABc|cBAG FEDC|\nGABc cBAG|FEDC DEFG|\nABcd dcBA|\n```\n\nEnjoy!";
    const cleaned = sanitiseAbc(raw);
    expect(cleaned).toMatch(/^X:1/);
    expect(cleaned).not.toContain("```");
    expect(cleaned).not.toContain("Here is");
    expect(cleaned).not.toContain("Enjoy");
    expect(validateAbc(cleaned)).toBeNull();
  });

  it("handles valid ABC directly", () => {
    const validAbc = "X:1\nT:Test Song\nM:4/4\nL:1/8\nQ:1/4=120\nK:C\nCDEF GABc|cBAG FEDC|\nGABc cBAG|FEDC DEFG|\nABcd dcBA|";
    const cleaned = sanitiseAbc(validAbc);
    expect(cleaned).toContain("X:1");
    expect(cleaned).toContain("T:Test Song");
    expect(validateAbc(cleaned)).toBeNull();
  });

  it("handles ABC with V: directives and dynamics", () => {
    const raw = "X:1\nT:Test\nM:4/4\nL:1/8\nK:C\nV:1 clef=treble\n!mf!CDEF GABc|!f!cBAG FEDC|\nGABc cBAG|FEDC DEFG|\nABcd dcBA|";
    const cleaned = sanitiseAbc(raw);
    expect(cleaned).not.toContain("V:1");
    expect(cleaned).not.toContain("!mf!");
    expect(cleaned).not.toContain("!f!");
    expect(validateAbc(cleaned)).toBeNull();
  });
});

// ─── extractLLMText tests ───

describe("extractLLMText", () => {
  it("handles array content (Claude thinking blocks)", async () => {
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

  it("returns null for empty/null content", async () => {
    const { extractLLMText } = await import("./llmHelpers");
    expect(extractLLMText(null)).toBeNull();
    expect(extractLLMText("")).toBeNull();
    expect(extractLLMText(undefined)).toBeNull();
  });

  it("handles plain string content", async () => {
    const { extractLLMText } = await import("./llmHelpers");
    const result = extractLLMText("X:1\nT:Test\nK:C\nCDEF|");
    expect(result).toContain("X:1");
  });
});

// ─── Edge cases ───

describe("Sheet Music Edge Cases", () => {
  it("sanitiseAbc handles K: header not being last", () => {
    const raw = "X:1\nT:Test\nK:C\nM:4/4\nL:1/8\nCDEF|GABc|\ncBAG|";
    const result = sanitiseAbc(raw);
    expect(result).toContain("X:1");
    expect(result).toContain("K:C");
  });

  it("sanitiseAbc handles multiple X: blocks (takes first)", () => {
    const raw = "X:1\nT:Song 1\nK:C\nCDEF|GABc|\ncBAG|\n\nX:2\nT:Song 2\nK:G\nGABc|";
    const result = sanitiseAbc(raw);
    expect(result).toContain("X:1");
    expect(result).toContain("T:Song 1");
  });

  it("sanitiseAbc handles ABC with repeat signs", () => {
    const raw = "X:1\nT:Test\nK:C\n|:CDEF GABc:|cBAG FEDC|\nGABc cBAG|";
    const result = sanitiseAbc(raw);
    expect(result).toContain("|:");
    expect(result).toContain(":|");
  });

  it("sanitiseAbc handles ABC with chord symbols in quotes", () => {
    const raw = 'X:1\nT:Test\nK:C\n"Am"A2 "G"B2 "F"c2 "E"B2|"Am"A2 "G"B2 "F"c2 "E"B2|\n"Am"A2 "G"B2|';
    const result = sanitiseAbc(raw);
    expect(result).toContain('"Am"');
    expect(result).toContain('"G"');
  });

  it("sanitiseAbc handles ABC with W: (uppercase) lyrics", () => {
    const raw = "X:1\nT:Test\nK:C\nCDEF|GABc|\nW:Amazing grace how sweet the sound\ncBAG|";
    const result = sanitiseAbc(raw);
    expect(result).toContain("W:Amazing grace");
  });
});
