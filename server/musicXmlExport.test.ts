import { describe, it, expect } from "vitest";

/**
 * Tests for the custom ABC-to-MusicXML converter.
 * We import the converter directly and verify the generated XML.
 */

// Since the module is a client-side file, we test the logic by importing it
// The converter has no browser-specific dependencies (no DOM calls in abcToMusicXml)
import { abcToMusicXml } from "../client/src/lib/musicXmlExport";

describe("MusicXML Export", () => {
  describe("ABC to MusicXML conversion", () => {
    it("should convert simple ABC notation to valid MusicXML", () => {
      const abc = `X:1
T:Test Song
M:4/4
L:1/8
K:C
Q:1/4=120
CDEF GABc | cBAG FEDC |`;

      const xml = abcToMusicXml(abc);

      expect(xml).toContain('<?xml version="1.0"');
      expect(xml).toContain("<score-partwise");
      expect(xml).toContain("Test Song");
    });

    it("should preserve the title in the MusicXML output", () => {
      const abc = `X:1
T:Amazing Grace
M:3/4
L:1/4
K:G
D | G2 B | A2 G |`;

      const xml = abcToMusicXml(abc);
      expect(xml).toContain("Amazing Grace");
    });

    it("should handle ABC with key signatures", () => {
      const abc = `X:1
T:Key Test
M:4/4
L:1/8
K:D
Q:1/4=100
DEFG ABcd |`;

      const xml = abcToMusicXml(abc);

      expect(xml).toContain("<score-partwise");
      expect(xml).toContain("<key>");
      expect(xml).toContain("<fifths>2</fifths>"); // D major = 2 sharps
    });

    it("should handle ABC with chord symbols", () => {
      const abc = `X:1
T:Chord Test
M:4/4
L:1/4
K:C
"C"C E G c | "Am"A, C E A |`;

      const xml = abcToMusicXml(abc);

      expect(xml).toContain("<score-partwise");
      expect(xml).toContain("<harmony>");
      expect(xml).toContain("<root-step>C</root-step>");
    });

    it("should handle ABC with rests", () => {
      const abc = `X:1
T:Rest Test
M:4/4
L:1/4
K:C
C D z E | z2 G A |`;

      const xml = abcToMusicXml(abc);

      expect(xml).toContain("<score-partwise");
      expect(xml).toContain("<rest/>");
    });

    it("should handle ABC with accidentals", () => {
      const abc = `X:1
T:Accidental Test
M:4/4
L:1/8
K:C
^C D _E =F G A B c |`;

      const xml = abcToMusicXml(abc);

      expect(xml).toContain("<score-partwise");
      expect(xml).toContain("<alter>1</alter>"); // sharp
      expect(xml).toContain("<alter>-1</alter>"); // flat
    });

    it("should handle ABC with time signature", () => {
      const abc = `X:1
T:Meter Test
M:3/4
L:1/4
K:C
C D E | F G A |`;

      const xml = abcToMusicXml(abc);

      expect(xml).toContain("<beats>3</beats>");
      expect(xml).toContain("<beat-type>4</beat-type>");
    });

    it("should produce valid MusicXML 4.0 document", () => {
      const abc = `X:1
T:Version Test
M:4/4
L:1/8
K:C
CDEF GABc |`;

      const xml = abcToMusicXml(abc);

      expect(xml).toContain('version="4.0"');
      expect(xml).toContain("<!DOCTYPE score-partwise");
    });

    it("should handle empty or minimal ABC gracefully", () => {
      const abc = `X:1
T:Minimal
M:4/4
L:1/8
K:C
C |`;

      const xml = abcToMusicXml(abc);
      expect(xml).toContain("<score-partwise");
    });

    it("should handle ABC with octave modifiers", () => {
      const abc = `X:1
T:Octave Test
M:4/4
L:1/4
K:C
C, D, E, F, | c' d' e' f' |`;

      const xml = abcToMusicXml(abc);

      expect(xml).toContain("<score-partwise");
      expect(xml).toContain("<octave>");
    });

    it("should include tempo marking", () => {
      const abc = `X:1
T:Tempo Test
M:4/4
L:1/8
K:C
Q:1/4=140
CDEF GABc |`;

      const xml = abcToMusicXml(abc);

      expect(xml).toContain("<metronome>");
      expect(xml).toContain("<per-minute>140</per-minute>");
    });

    it("should include composer when provided", () => {
      const abc = `X:1
T:Composer Test
C:J.S. Bach
M:4/4
L:1/8
K:C
CDEF GABc |`;

      const xml = abcToMusicXml(abc);

      expect(xml).toContain('type="composer"');
      expect(xml).toContain("J.S. Bach");
    });

    it("should handle minor keys correctly", () => {
      const abc = `X:1
T:Minor Key Test
M:4/4
L:1/8
K:Am
ABCD EFGa |`;

      const xml = abcToMusicXml(abc);

      expect(xml).toContain("<fifths>0</fifths>"); // Am = 0 sharps/flats
      expect(xml).toContain("<mode>minor</mode>");
    });

    it("should throw on empty input", () => {
      expect(() => abcToMusicXml("")).toThrow("Empty ABC notation");
      expect(() => abcToMusicXml("   ")).toThrow("Empty ABC notation");
    });

    it("should inject missing headers", () => {
      // ABC with no headers at all — just notes
      const abc = `C D E F | G A B c |`;

      const xml = abcToMusicXml(abc);

      // Should still produce valid XML with default headers
      expect(xml).toContain("<score-partwise");
      expect(xml).toContain("<beats>");
    });

    it("should handle chord kinds correctly", () => {
      const abc = `X:1
T:Chord Kinds
M:4/4
L:1/4
K:C
"Cmaj7"C "Dm7"D "G7"G "Am"A |`;

      const xml = abcToMusicXml(abc);

      expect(xml).toContain("<kind>major-seventh</kind>");
      expect(xml).toContain("<kind>dominant</kind>");
      expect(xml).toContain("<kind>minor</kind>");
    });
  });

  describe("Edge cases", () => {
    it("should handle ABC with no notes (headers only)", () => {
      const abc = `X:1
T:Headers Only
M:4/4
L:1/8
K:C`;

      const xml = abcToMusicXml(abc);
      expect(xml).toContain("<score-partwise");
      // Should have at least one measure (empty)
      expect(xml).toContain('measure number="1"');
    });

    it("should handle ABC with repeat bars", () => {
      const abc = `X:1
T:Repeat Test
M:4/4
L:1/4
K:C
|: C D E F | G A B c :|`;

      const xml = abcToMusicXml(abc);
      expect(xml).toContain("<score-partwise");
    });

    it("should include software identification", () => {
      const abc = `X:1
T:Software Test
M:4/4
L:1/8
K:C
CDEF GABc |`;

      const xml = abcToMusicXml(abc);
      expect(xml).toContain("Create Christian Music");
    });
  });
});
