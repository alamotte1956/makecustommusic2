import { describe, it, expect } from "vitest";
import {
  parseLyricsIntoSections,
  splitIntoSyllables,
  assembleAbc,
} from "./multiPassSheetMusicGenerator";

describe("parseLyricsIntoSections", () => {
  it("parses lyrics with explicit section headers", () => {
    const lyrics = `[Verse 1]
Amazing grace how sweet the sound
That saved a wretch like me

[Chorus]
I once was lost but now am found
Was blind but now I see`;

    const sections = parseLyricsIntoSections(lyrics);
    expect(sections.length).toBe(2);
    expect(sections[0].name).toContain("Verse");
    expect(sections[0].type).toBe("verse");
    expect(sections[0].lines.length).toBe(2);
    expect(sections[1].name).toContain("Chorus");
    expect(sections[1].type).toBe("chorus");
    expect(sections[1].lines.length).toBe(2);
  });

  it("parses lyrics with blank line separators", () => {
    const lyrics = `Amazing grace how sweet the sound
That saved a wretch like me

I once was lost but now am found
Was blind but now I see`;

    const sections = parseLyricsIntoSections(lyrics);
    expect(sections.length).toBe(2);
    expect(sections[0].lines.length).toBe(2);
    expect(sections[1].lines.length).toBe(2);
  });

  it("handles parenthetical section headers", () => {
    const lyrics = `(Verse 1)
Line one of verse
Line two of verse

(Chorus)
Chorus line one
Chorus line two`;

    const sections = parseLyricsIntoSections(lyrics);
    expect(sections.length).toBe(2);
    expect(sections[0].type).toBe("verse");
    expect(sections[1].type).toBe("chorus");
  });

  it("counts syllables correctly for each line", () => {
    const lyrics = `[Verse 1]
Amazing grace how sweet the sound`;

    const sections = parseLyricsIntoSections(lyrics);
    const line = sections[0].lines[0];
    // "A-ma-zing grace how sweet the sound" = 8 syllables
    expect(line.syllableCount).toBeGreaterThanOrEqual(7);
    expect(line.syllableCount).toBeLessThanOrEqual(9);
  });

  it("handles empty lyrics", () => {
    const sections = parseLyricsIntoSections("");
    expect(sections.length).toBe(0);
  });

  it("handles lyrics with only whitespace", () => {
    const sections = parseLyricsIntoSections("   \n  \n  ");
    expect(sections.length).toBe(0);
  });

  it("detects bridge sections", () => {
    const lyrics = `[Bridge]
Something different here
A new perspective`;

    const sections = parseLyricsIntoSections(lyrics);
    expect(sections[0].type).toBe("bridge");
  });

  it("detects pre-chorus sections", () => {
    const lyrics = `[Pre-Chorus]
Building up to something
Getting closer now`;

    const sections = parseLyricsIntoSections(lyrics);
    expect(sections[0].type).toBe("pre-chorus");
  });
});

describe("splitIntoSyllables", () => {
  it("splits simple one-syllable words", () => {
    const result = splitIntoSyllables("the cat sat");
    expect(result.length).toBe(3);
  });

  it("splits multi-syllable words", () => {
    const result = splitIntoSyllables("amazing");
    // "a-ma-zing" = 3 syllables
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it("handles a full sentence", () => {
    const result = splitIntoSyllables("Amazing grace how sweet the sound");
    // Each word: A-ma-zing(3) grace(1) how(1) sweet(1) the(1) sound(1) = 8
    expect(result.length).toBeGreaterThanOrEqual(7);
    expect(result.length).toBeLessThanOrEqual(9);
  });

  it("handles empty string", () => {
    const result = splitIntoSyllables("");
    expect(result.length).toBe(0);
  });

  it("handles punctuation", () => {
    const result = splitIntoSyllables("Hello, world!");
    expect(result.length).toBe(3); // Hel-lo, world
  });
});

describe("assembleAbc", () => {
  it("produces valid ABC with correct headers", () => {
    const sections = [{
      name: "Verse 1",
      type: "verse" as const,
      lines: [
        { text: "Hello world", syllables: ["Hel", "lo", "world"], syllableCount: 3 },
      ],
    }];

    const chords = [{
      sectionName: "Verse 1",
      chordsPerMeasure: ["C", "G"],
      measuresPerLine: [2],
    }];

    const melodies = [{
      sectionName: "Verse 1",
      lines: [{ abcNotes: "C2 D2 | E2 F2 |", noteCount: 3 }],
    }];

    const abc = assembleAbc("Test Song", "C", "4/4", 120, sections, chords, melodies);

    expect(abc).toContain("X: 1");
    expect(abc).toContain("T: Test Song");
    expect(abc).toContain("M: 4/4");
    expect(abc).toContain("L: 1/8");
    expect(abc).toContain("Q: 1/4=120");
    expect(abc).toContain("K: C");
  });

  it("includes section comments", () => {
    const sections = [{
      name: "Chorus",
      type: "chorus" as const,
      lines: [
        { text: "Sing along", syllables: ["Sing", "a", "long"], syllableCount: 3 },
      ],
    }];

    const chords = [{
      sectionName: "Chorus",
      chordsPerMeasure: ["C"],
      measuresPerLine: [1],
    }];

    const melodies = [{
      sectionName: "Chorus",
      lines: [{ abcNotes: "c2 d2 e2 |", noteCount: 3 }],
    }];

    const abc = assembleAbc("Test", "C", "4/4", 120, sections, chords, melodies);
    expect(abc).toContain("% Chorus");
  });

  it("includes w: lyrics lines", () => {
    const sections = [{
      name: "Verse 1",
      type: "verse" as const,
      lines: [
        { text: "Amazing grace", syllables: ["A", "ma", "zing", "grace"], syllableCount: 4 },
      ],
    }];

    const chords = [{
      sectionName: "Verse 1",
      chordsPerMeasure: ["C", "G"],
      measuresPerLine: [2],
    }];

    const melodies = [{
      sectionName: "Verse 1",
      lines: [{ abcNotes: "C2 D2 E2 F2 |", noteCount: 4 }],
    }];

    const abc = assembleAbc("Test", "C", "4/4", 120, sections, chords, melodies);
    expect(abc).toContain("w:");
    expect(abc).toContain("A");
    expect(abc).toContain("grace");
  });

  it("K: is the last header line", () => {
    const sections = [{
      name: "Verse 1",
      type: "verse" as const,
      lines: [{ text: "Test", syllables: ["Test"], syllableCount: 1 }],
    }];
    const chords = [{ sectionName: "Verse 1", chordsPerMeasure: ["C"], measuresPerLine: [1] }];
    const melodies = [{ sectionName: "Verse 1", lines: [{ abcNotes: "C2 |", noteCount: 1 }] }];

    const abc = assembleAbc("Test", "G", "4/4", 120, sections, chords, melodies);
    const lines = abc.split("\n");
    const kLineIdx = lines.findIndex(l => l.startsWith("K:"));
    // No other header lines after K:
    for (let i = kLineIdx + 1; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (/^[A-Z]:/.test(trimmed) && !trimmed.startsWith("w:") && !trimmed.startsWith("W:")) {
        expect(trimmed).not.toMatch(/^[A-Z]:/); // Should fail if found
      }
    }
  });
});
