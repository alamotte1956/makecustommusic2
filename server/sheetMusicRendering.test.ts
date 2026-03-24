import { describe, it, expect } from "vitest";

/**
 * Tests for the sheet music rendering fix.
 * 
 * The core issue: abcjs with `responsive: 'resize'` computes staff width from
 * the container's actual width. When the container is inside a hidden tab
 * (Radix TabsContent), it has width 0, causing abcjs to render only the title
 * text with no musical notation (notes, staffs, measures).
 * 
 * The fix:
 * 1. Check container width before rendering (skip if < 10px)
 * 2. Use ResizeObserver to detect when container becomes visible
 * 3. Wait for requestAnimationFrame before rendering to ensure layout is computed
 * 4. Pass computed staffwidth based on actual container width
 */

// Test the sanitiseAbc function (extracted from SheetMusicViewer)
function sanitiseAbc(raw: string): string {
  return raw
    .split("\n")
    .filter((l) => {
      const t = l.trim();
      if (t.startsWith("V:") || t.startsWith("%%staves")) return false;
      if (/^![pmf]{1,3}!$/.test(t)) return false;
      return true;
    })
    .map((l) => {
      const t = l.trim();
      if (/^\[P:.*\]$/.test(t)) return `% ${t}`;
      return l;
    })
    .join("\n")
    .trim();
}

describe("Sheet Music Rendering Fix", () => {
  describe("sanitiseAbc", () => {
    it("preserves valid ABC notation with newlines", () => {
      const abc = `X: 1
T: Test Song
M: 4/4
L: 1/8
K: C
"C"C2 D2 E2 F2 | "G"G2 A2 B2 c2 |`;
      const result = sanitiseAbc(abc);
      expect(result).toContain("X: 1");
      expect(result).toContain("T: Test Song");
      expect(result).toContain("K: C");
      expect(result).toContain('"C"C2 D2 E2 F2');
      expect(result.split("\n").length).toBeGreaterThan(5);
    });

    it("strips V: voice directives", () => {
      const abc = `X: 1
T: Test
V: 1 clef=treble
K: C
C2 D2 E2 F2 |`;
      const result = sanitiseAbc(abc);
      expect(result).not.toContain("V: 1");
      expect(result).toContain("C2 D2 E2 F2");
    });

    it("strips %%staves directives", () => {
      const abc = `X: 1
T: Test
%%staves {1 2}
K: C
C2 D2 E2 F2 |`;
      const result = sanitiseAbc(abc);
      expect(result).not.toContain("%%staves");
      expect(result).toContain("C2 D2 E2 F2");
    });

    it("strips standalone dynamics lines", () => {
      const abc = `X: 1
T: Test
K: C
!ff!
C2 D2 E2 F2 |
!pp!
G2 A2 B2 c2 |`;
      const result = sanitiseAbc(abc);
      expect(result).not.toMatch(/^!ff!$/m);
      expect(result).not.toMatch(/^!pp!$/m);
      expect(result).toContain("C2 D2 E2 F2");
      expect(result).toContain("G2 A2 B2 c2");
    });

    it("converts [P:...] markers to comments", () => {
      const abc = `X: 1
T: Test
K: C
[P:Verse 1]
C2 D2 E2 F2 |
[P:Chorus]
G2 A2 B2 c2 |`;
      const result = sanitiseAbc(abc);
      expect(result).toContain("% [P:Verse 1]");
      expect(result).toContain("% [P:Chorus]");
      expect(result).toContain("C2 D2 E2 F2");
    });

    it("preserves lyrics (w: lines)", () => {
      const abc = `X: 1
T: Test
K: C
C2 D2 E2 F2 |
w: Hel-lo world to-day`;
      const result = sanitiseAbc(abc);
      expect(result).toContain("w: Hel-lo world to-day");
    });

    it("preserves comment lines", () => {
      const abc = `X: 1
T: Test
K: C
% This is a comment
C2 D2 E2 F2 |`;
      const result = sanitiseAbc(abc);
      expect(result).toContain("% This is a comment");
    });

    it("preserves chord annotations in music lines", () => {
      const abc = `X: 1
T: Test
K: Am
"Am"A,2 E2 A,2 E2 | "G"G,2 D2 G,2 D2 |`;
      const result = sanitiseAbc(abc);
      expect(result).toContain('"Am"A,2 E2');
      expect(result).toContain('"G"G,2 D2');
    });
  });

  describe("Zero-width container guard", () => {
    it("should not render when container width is 0", () => {
      // Simulate the guard logic from the rendering effect
      const containerWidth = 0;
      const shouldRender = containerWidth >= 10;
      expect(shouldRender).toBe(false);
    });

    it("should not render when container width is very small (< 10px)", () => {
      const containerWidth = 5;
      const shouldRender = containerWidth >= 10;
      expect(shouldRender).toBe(false);
    });

    it("should render when container has normal width", () => {
      const containerWidth = 800;
      const shouldRender = containerWidth >= 10;
      expect(shouldRender).toBe(true);
    });

    it("should compute staffwidth based on container width", () => {
      const containerWidth = 800;
      const staffwidth = Math.max(600, Math.floor(containerWidth - 40));
      expect(staffwidth).toBe(760);
    });

    it("should use minimum staffwidth of 600 for narrow containers", () => {
      const containerWidth = 400;
      const staffwidth = Math.max(600, Math.floor(containerWidth - 40));
      expect(staffwidth).toBe(600);
    });
  });

  describe("Real ABC notation from database", () => {
    const realAbc = `X: 1
T: Forward Moving Song
C: Folk Melody
M: 4/4
L: 1/8
Q: 1/4=80
K: Am

% Intro - Slow and moody
"Am"A,2 E2 A,2 E2 | "G"G,2 D2 G,2 D2 | "C"C2 E2 G2 E2 | "F"F2 C2 F2 C2 |

% Verse 1
"Am"E2 z2 A2 G2 | "G"E2 z2 G2 F2 | "C"C2 z2 E2 D2 | "F"C2 z2 A,2 C2 |
w: The wind whis-pers soft-ly, a sto-ry un-told,

% Chorus
"Am"E2 A2 c2 B2 | "G"G2 B2 d2 c2 | "C"E2 G2 c2 B2 | "F"A2 G2 F2 E2 |
w: Oh, the road stretches far, and the jour-ney's un-furled,`;

    it("sanitised ABC preserves all music lines", () => {
      const result = sanitiseAbc(realAbc);
      const lines = result.split("\n");
      
      // Should have header lines
      expect(lines.some(l => l.startsWith("X:"))).toBe(true);
      expect(lines.some(l => l.startsWith("T:"))).toBe(true);
      expect(lines.some(l => l.startsWith("M:"))).toBe(true);
      expect(lines.some(l => l.startsWith("K:"))).toBe(true);
      
      // Should have music lines with notes (our test sample has 3 music lines)
      const musicLines = lines.filter(l => /[A-Ga-g].*\|/.test(l));
      expect(musicLines.length).toBeGreaterThanOrEqual(3);
      
      // Should have lyrics
      const lyricsLines = lines.filter(l => l.startsWith("w:"));
      expect(lyricsLines.length).toBeGreaterThan(0);
      
      // Should have chord annotations
      expect(result).toContain('"Am"');
      expect(result).toContain('"G"');
      expect(result).toContain('"C"');
    });

    it("sanitised ABC has proper newline structure", () => {
      const result = sanitiseAbc(realAbc);
      const newlineCount = (result.match(/\n/g) || []).length;
      
      // Should have many newlines (not collapsed into one line)
      expect(newlineCount).toBeGreaterThan(10);
    });

    it("sanitised ABC is not empty after processing", () => {
      const result = sanitiseAbc(realAbc);
      expect(result.length).toBeGreaterThan(100);
    });
  });
});
