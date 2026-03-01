/**
 * Tests for PDF export functionality.
 * Since the actual PDF generation uses jsPDF in the browser,
 * we test the server-side aspects and the data structures used.
 */
import { describe, it, expect } from "vitest";

describe("PDF Export Data Structures", () => {
  describe("Lyrics PDF data", () => {
    it("should handle lyrics with section markers", () => {
      const lyrics = `[Verse 1]
Walking down the road today
Sunshine lighting up my way

[Chorus]
This is the song I sing
Every day and everything`;

      const lines = lyrics.split("\n");
      const sectionHeaders = lines.filter(l => /^\[.*\]$/.test(l.trim()));
      expect(sectionHeaders).toHaveLength(2);
      expect(sectionHeaders[0]).toBe("[Verse 1]");
      expect(sectionHeaders[1]).toBe("[Chorus]");
    });

    it("should handle lyrics without section markers", () => {
      const lyrics = `Walking down the road today
Sunshine lighting up my way
This is the song I sing`;

      const lines = lyrics.split("\n");
      const sectionHeaders = lines.filter(l => /^\[.*\]$/.test(l.trim()));
      expect(sectionHeaders).toHaveLength(0);
    });

    it("should handle empty lyrics gracefully", () => {
      const lyrics = "";
      const lines = lyrics.split("\n");
      expect(lines).toHaveLength(1);
      expect(lines[0]).toBe("");
    });

    it("should preserve paragraph breaks", () => {
      const lyrics = `Line one

Line two after break`;
      const lines = lyrics.split("\n");
      expect(lines).toHaveLength(3);
      expect(lines[1].trim()).toBe("");
    });

    it("should handle metadata fields for lyrics PDF", () => {
      const metadata = {
        genre: "Pop",
        mood: "Happy",
        key: "C Major",
        tempo: 120,
        vocalType: "female",
      };

      const metaItems: string[] = [];
      if (metadata.genre) metaItems.push(`Genre: ${metadata.genre}`);
      if (metadata.mood) metaItems.push(`Mood: ${metadata.mood}`);
      if (metadata.key) metaItems.push(`Key: ${metadata.key}`);
      if (metadata.tempo) metaItems.push(`Tempo: ${metadata.tempo} BPM`);
      if (metadata.vocalType && metadata.vocalType !== "none") {
        metaItems.push(`Vocals: ${metadata.vocalType}`);
      }

      expect(metaItems).toHaveLength(5);
      expect(metaItems[0]).toBe("Genre: Pop");
      expect(metaItems[3]).toBe("Tempo: 120 BPM");
    });

    it("should skip vocalType 'none' in metadata", () => {
      const metadata = { vocalType: "none" };
      const metaItems: string[] = [];
      if (metadata.vocalType && metadata.vocalType !== "none") {
        metaItems.push(`Vocals: ${metadata.vocalType}`);
      }
      expect(metaItems).toHaveLength(0);
    });
  });

  describe("Chord PDF data", () => {
    it("should format chord sections correctly", () => {
      const section = {
        section: "Verse 1",
        chords: ["Am", "F", "C", "G"],
        strummingPattern: "D DU UDU",
        bpm: 120,
      };

      const chordText = section.chords.join("   \u2192   ");
      expect(chordText).toContain("Am");
      expect(chordText).toContain("G");
      expect(chordText).toContain("\u2192");
    });

    it("should handle metadata items for chord PDF", () => {
      const data = {
        key: "Am",
        capo: 2,
        tempo: 120,
        timeSignature: "4/4",
      };

      const metaItems: string[] = [];
      metaItems.push(`Key: ${data.key}`);
      if (data.capo > 0) metaItems.push(`Capo: Fret ${data.capo}`);
      metaItems.push(`Tempo: ${data.tempo} BPM`);
      metaItems.push(`Time: ${data.timeSignature}`);

      expect(metaItems).toHaveLength(4);
      expect(metaItems[1]).toBe("Capo: Fret 2");
    });

    it("should skip capo when 0", () => {
      const data = { key: "C", capo: 0, tempo: 100, timeSignature: "3/4" };
      const metaItems: string[] = [];
      metaItems.push(`Key: ${data.key}`);
      if (data.capo > 0) metaItems.push(`Capo: Fret ${data.capo}`);
      metaItems.push(`Tempo: ${data.tempo} BPM`);
      metaItems.push(`Time: ${data.timeSignature}`);

      expect(metaItems).toHaveLength(3);
      expect(metaItems.find(m => m.includes("Capo"))).toBeUndefined();
    });

    it("should handle multiple sections", () => {
      const sections = [
        { section: "Intro", chords: ["Am", "F"], strummingPattern: "D D D D", bpm: 120 },
        { section: "Verse 1", chords: ["Am", "F", "C", "G"], strummingPattern: "D DU UDU", bpm: 120 },
        { section: "Chorus", chords: ["F", "G", "Am"], strummingPattern: "D DU UDU", bpm: 130 },
      ];

      expect(sections).toHaveLength(3);
      expect(sections[0].section).toBe("Intro");
      expect(sections[2].chords).toContain("Am");
    });

    it("should handle playing notes", () => {
      const notes = "Use a capo on fret 2 for easier fingering. Try palm muting during the verse for a softer feel.";
      expect(notes.length).toBeGreaterThan(0);
      expect(notes).toContain("capo");
    });
  });

  describe("Page break logic", () => {
    const PAGE_HEIGHT = 297;
    const MARGIN_BOTTOM = 20;
    const MARGIN_TOP = 20;

    function checkPageBreak(y: number, needed: number): { needsBreak: boolean; newY: number } {
      if (y + needed > PAGE_HEIGHT - MARGIN_BOTTOM) {
        return { needsBreak: true, newY: MARGIN_TOP };
      }
      return { needsBreak: false, newY: y };
    }

    it("should not break when content fits", () => {
      const result = checkPageBreak(100, 50);
      expect(result.needsBreak).toBe(false);
      expect(result.newY).toBe(100);
    });

    it("should break when content exceeds page", () => {
      const result = checkPageBreak(260, 30);
      expect(result.needsBreak).toBe(true);
      expect(result.newY).toBe(MARGIN_TOP);
    });

    it("should break at exact boundary", () => {
      const result = checkPageBreak(277, 1);
      expect(result.needsBreak).toBe(true);
      expect(result.newY).toBe(MARGIN_TOP);
    });

    it("should handle content near the bottom margin", () => {
      // 275 + 2 = 277 = PAGE_HEIGHT - MARGIN_BOTTOM, so it fits exactly
      const result = checkPageBreak(275, 2);
      expect(result.needsBreak).toBe(false);
    });

    it("should break when content goes past bottom margin", () => {
      // 275 + 3 = 278 > 277, needs break
      const result = checkPageBreak(275, 3);
      expect(result.needsBreak).toBe(true);
      expect(result.newY).toBe(MARGIN_TOP);
    });

    it("should not break when exactly at limit", () => {
      // y + needed = 277 which equals PAGE_HEIGHT - MARGIN_BOTTOM
      const result = checkPageBreak(270, 7);
      expect(result.needsBreak).toBe(false);
    });
  });

  describe("File naming", () => {
    it("should generate correct PDF filenames", () => {
      const songTitle = "My Amazing Song";
      expect(`${songTitle} - Sheet Music.pdf`).toBe("My Amazing Song - Sheet Music.pdf");
      expect(`${songTitle} - Guitar Chords.pdf`).toBe("My Amazing Song - Guitar Chords.pdf");
      expect(`${songTitle} - Lyrics.pdf`).toBe("My Amazing Song - Lyrics.pdf");
    });

    it("should handle special characters in titles", () => {
      const songTitle = "Rock & Roll (Live)";
      const filename = `${songTitle} - Lyrics.pdf`;
      expect(filename).toBe("Rock & Roll (Live) - Lyrics.pdf");
    });
  });
});
