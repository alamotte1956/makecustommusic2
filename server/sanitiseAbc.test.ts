import { describe, it, expect } from "vitest";
import { sanitiseAbc, validateAbc } from "./backgroundSheetMusic";

describe("sanitiseAbc blank line fix", () => {
  it("should remove blank lines between K: header and music body", () => {
    const abcWithBlankLine = `X: 1
T: Wild Breakaway
M: 4/4
L: 1/8
Q: 1/4=120
K: C

"C" D4 A4 |
E4 B4 |
"G/B" F4 c4 |
G4 C4 |`;

    const result = sanitiseAbc(abcWithBlankLine);
    const lines = result.split("\n");

    // Find K: line
    const kIdx = lines.findIndex((l) => l.trim().startsWith("K:"));
    expect(kIdx).toBeGreaterThan(-1);

    // The line immediately after K: should NOT be blank
    expect(lines[kIdx + 1]?.trim()).not.toBe("");
    // It should be the first music line
    expect(lines[kIdx + 1]).toContain("D4 A4");
  });

  it("should preserve ABC without blank lines (no regression)", () => {
    const abcNoBlankLine = `X:1
T:Test Song
M:4/4
L:1/8
Q:1/4=120
K:C
"C" CDEF GABc |
cBAG FEDC |`;

    const result = sanitiseAbc(abcNoBlankLine);
    const lines = result.split("\n");

    const kIdx = lines.findIndex((l) => l.trim().startsWith("K:"));
    expect(kIdx).toBeGreaterThan(-1);
    expect(lines[kIdx + 1]).toContain("CDEF");
  });

  it("should handle multiple blank lines between K: and music", () => {
    const abcMultiBlank = `X: 1
T: Test
M: 4/4
L: 1/8
K: C



"Am" A2 B2 C2 D2 |`;

    const result = sanitiseAbc(abcMultiBlank);
    const lines = result.split("\n");

    const kIdx = lines.findIndex((l) => l.trim().startsWith("K:"));
    expect(kIdx).toBeGreaterThan(-1);
    expect(lines[kIdx + 1]?.trim()).not.toBe("");
    expect(lines[kIdx + 1]).toContain("A2 B2");
  });

  it("should produce valid ABC that abcjs can render (no blank line separator)", () => {
    const abcWithBlankLine = `X: 1
T: Test Song
M: 4/4
L: 1/8
Q: 1/4=120
K: C

"C" C2 D2 E2 F2 | G2 A2 B2 c2 |
"Am" A2 B2 C2 D2 | E2 F2 G2 A2 |
"F" F2 G2 A2 B2 | c2 D2 E2 F2 |
"G" G2 A2 B2 c2 | D2 E2 F2 G2 |
"C" C2 D2 E2 F2 | G2 A2 B2 c2 |
"Am" A2 B2 C2 D2 | E2 F2 G2 A2 |
"F" F2 G2 A2 B2 | c2 D2 E2 F2 |
"G" G2 A2 B2 c2 | D2 E2 F2 G2 |
"C" C2 D2 E2 F2 | G2 A2 B2 c2 |`;

    const result = sanitiseAbc(abcWithBlankLine);

    // The sanitised ABC should NOT contain a blank line between headers and music
    const lines = result.split("\n");
    const kIdx = lines.findIndex((l) => l.trim().startsWith("K:"));
    for (let i = kIdx + 1; i < lines.length; i++) {
      if (lines[i].trim() === "") {
        // Blank lines within the music body are OK, but not right after K:
        if (i === kIdx + 1) {
          throw new Error("Blank line found immediately after K: header");
        }
      }
    }

    // Should also pass validation
    const validationError = validateAbc(result);
    expect(validationError).toBeNull();
  });
});
