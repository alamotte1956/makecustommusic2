import { describe, it, expect } from "vitest";

/**
 * Bar count logic extracted from SheetMusicViewer for testability.
 * This mirrors the useMemo logic in the component.
 */
function countBarsFromAbc(abc: string | null): number {
  if (!abc) return 0;
  const lines = abc.split("\n");
  const musicLines = lines.filter((l) => {
    const trimmed = l.trim();
    if (!trimmed) return false;
    // Skip header lines and lyric lines
    if (/^[A-Za-z]:/.test(trimmed) && !trimmed.startsWith("|")) return false;
    if (trimmed.startsWith("w:") || trimmed.startsWith("W:")) return false;
    if (trimmed.startsWith("%")) return false;
    return true;
  });
  const musicText = musicLines.join(" ");
  const barLines = (musicText.match(/\|/g) || []).length;
  return Math.max(0, barLines);
}

describe("countBarsFromAbc", () => {
  it("returns 0 for null input", () => {
    expect(countBarsFromAbc(null)).toBe(0);
  });

  it("returns 0 for empty string", () => {
    expect(countBarsFromAbc("")).toBe(0);
  });

  it("returns 0 for header-only ABC", () => {
    const abc = `X: 1\nT: Test Song\nM: 4/4\nL: 1/4\nK: C`;
    expect(countBarsFromAbc(abc)).toBe(0);
  });

  it("counts bars in a simple ABC tune", () => {
    const abc = `X: 1\nT: Test\nM: 4/4\nL: 1/4\nK: C\nCDEF|GABc|cdec|BAGF|`;
    expect(countBarsFromAbc(abc)).toBe(4);
  });

  it("counts bars across multiple lines", () => {
    const abc = `X: 1\nT: Test\nM: 4/4\nL: 1/4\nK: C\nCDEF|GABc|\ncdec|BAGF|\nEDEF|GABc|`;
    expect(countBarsFromAbc(abc)).toBe(6);
  });

  it("counts bars with repeat markers", () => {
    const abc = `X: 1\nT: Test\nM: 4/4\nL: 1/4\nK: C\n|:CDEF|GABc|cdec|BAGF:|`;
    // |: counts as 1 bar line, :| counts as 1 bar line, plus 3 internal = 5 total pipe chars
    expect(countBarsFromAbc(abc)).toBe(5);
  });

  it("ignores lyric lines (w:)", () => {
    const abc = `X: 1\nT: Test\nM: 4/4\nL: 1/4\nK: C\nCDEF|GABc|cdec|BAGF|\nw: la la la | la la la | la la | la la |`;
    expect(countBarsFromAbc(abc)).toBe(4);
  });

  it("ignores comment lines (%)", () => {
    const abc = `X: 1\nT: Test\nM: 4/4\nL: 1/4\nK: C\n% This is a comment with | pipes\nCDEF|GABc|cdec|BAGF|`;
    expect(countBarsFromAbc(abc)).toBe(4);
  });

  it("counts bars in a longer piece (24+ bars)", () => {
    const abc = `X: 1\nT: Long Song\nM: 4/4\nL: 1/4\nK: C\n` +
      `CDEF|GABc|cdec|BAGF|EDEF|GABc|d2c2|B4|\n` +
      `CDEF|GABc|cdec|BAGF|EDEF|GABc|d2c2|B4|\n` +
      `CDEF|GABc|cdec|BAGF|EDEF|GABc|d2c2|B4|`;
    expect(countBarsFromAbc(abc)).toBe(24);
  });

  it("handles lines starting with | (bar line at start of music line)", () => {
    const abc = `X: 1\nT: Test\nM: 4/4\nL: 1/4\nK: C\n|CDEF|GABc|cdec|BAGF|`;
    expect(countBarsFromAbc(abc)).toBe(5);
  });

  it("handles double bar lines ||", () => {
    const abc = `X: 1\nT: Test\nM: 4/4\nL: 1/4\nK: C\nCDEF|GABc||cdec|BAGF|`;
    // || is 2 pipe characters
    expect(countBarsFromAbc(abc)).toBe(5);
  });

  it("handles ABC with chord symbols", () => {
    const abc = `X: 1\nT: Test\nM: 4/4\nL: 1/4\nK: C\n"C"CDEF|"G"GABc|"Am"cdec|"F"BAGF|`;
    expect(countBarsFromAbc(abc)).toBe(4);
  });
});
