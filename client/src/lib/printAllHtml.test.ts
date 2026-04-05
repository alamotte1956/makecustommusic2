/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { generatePrintAllHtml, type PrintAllOptions } from "./printAllHtml";

function createMockSvg(): SVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 800 600");
  svg.setAttribute("width", "800");
  // Add a staff group so the splitting logic has something to work with
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.classList.add("abcjs-staff-group");
  svg.appendChild(g);
  return svg;
}

function createDefaultOptions(overrides: Partial<PrintAllOptions> = {}): PrintAllOptions {
  return {
    svgElement: createMockSvg(),
    leadSheet: {
      title: "Amazing Grace",
      key: "G",
      meter: "4/4",
      sections: [
        {
          label: "Verse 1",
          lines: [
            { chords: "G       C       G", lyrics: "Amazing grace how sweet the sound" },
            { chords: "G       D", lyrics: "That saved a wretch like me" },
          ],
        },
        {
          label: "Chorus",
          lines: [
            { chords: "G       C", lyrics: "I once was lost but now am found" },
          ],
        },
      ],
    },
    songTitle: "Amazing Grace",
    keyLabel: "Key: G",
    chords: ["G", "C", "D"],
    convertChordLine: vi.fn((line: string, _key: string) =>
      line.replace(/G/g, "1").replace(/C/g, "4").replace(/D/g, "5")
    ),
    generateChordDiagramsHtml: vi.fn((chords: string[]) =>
      chords.length > 0
        ? `<div class="chord-section"><div class="chord-grid">${chords.map(c => `<div>${c}</div>`).join("")}</div></div>`
        : ""
    ),
    ...overrides,
  };
}

describe("generatePrintAllHtml", () => {
  describe("basic HTML structure", () => {
    it("returns a valid HTML document", () => {
      const html = generatePrintAllHtml(createDefaultOptions());
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<html>");
      expect(html).toContain("</html>");
      expect(html).toContain("<head>");
      expect(html).toContain("<body>");
    });

    it("includes the song title in the page title", () => {
      const html = generatePrintAllHtml(createDefaultOptions({ songTitle: "How Great Is Our God" }));
      expect(html).toContain("<title>Amazing Grace - Complete Sheet Music</title>");
    });

    it("includes print-friendly CSS with @page rule", () => {
      const html = generatePrintAllHtml(createDefaultOptions());
      expect(html).toContain("@page");
      expect(html).toContain("size: letter portrait");
    });
  });

  describe("print toolbar", () => {
    it("includes a print button bar with Print All and Close buttons", () => {
      const html = generatePrintAllHtml(createDefaultOptions());
      expect(html).toContain("print-btn-bar");
      expect(html).toContain("Print All");
      expect(html).toContain("window.print()");
      expect(html).toContain("window.close()");
    });

    it("marks the toolbar as no-print", () => {
      const html = generatePrintAllHtml(createDefaultOptions());
      expect(html).toContain('class="print-btn-bar no-print"');
    });

    it("shows 'Complete Sheet Music Preview' label", () => {
      const html = generatePrintAllHtml(createDefaultOptions());
      expect(html).toContain("Complete Sheet Music Preview");
    });
  });

  describe("section dividers", () => {
    it("includes three numbered section dividers", () => {
      const html = generatePrintAllHtml(createDefaultOptions());
      // Check for numbered dividers
      expect(html).toContain('class="format-divider-number">1</div>');
      expect(html).toContain('class="format-divider-number">2</div>');
      expect(html).toContain('class="format-divider-number">3</div>');
    });

    it("includes section titles for all three formats", () => {
      const html = generatePrintAllHtml(createDefaultOptions());
      expect(html).toContain("Full Notation");
      expect(html).toContain("Lead Sheet");
      expect(html).toContain("Nashville Number Chart");
    });

    it("includes descriptions for each section", () => {
      const html = generatePrintAllHtml(createDefaultOptions());
      expect(html).toContain("Complete musical score with melody, rhythm, and chord symbols");
      expect(html).toContain("Lyrics with chord symbols for vocalists and instrumentalists");
      expect(html).toContain("Number-based chord notation for easy transposition");
    });

    it("uses page-break-before for sections 2 and 3", () => {
      const html = generatePrintAllHtml(createDefaultOptions());
      expect(html).toContain("page-break-before: always");
    });
  });

  describe("full notation section", () => {
    it("renders the SVG notation", () => {
      const html = generatePrintAllHtml(createDefaultOptions());
      expect(html).toContain("print-content");
      expect(html).toContain("<svg");
    });

    it("includes chord diagrams", () => {
      const opts = createDefaultOptions();
      const html = generatePrintAllHtml(opts);
      expect(opts.generateChordDiagramsHtml).toHaveBeenCalledWith(["G", "C", "D"]);
      expect(html).toContain("chord-section");
    });

    it("shows key and meter in the header", () => {
      const html = generatePrintAllHtml(createDefaultOptions());
      expect(html).toContain("Key: G");
      expect(html).toContain("Time: 4/4");
    });
  });

  describe("lead sheet section", () => {
    it("renders section labels", () => {
      const html = generatePrintAllHtml(createDefaultOptions());
      expect(html).toContain("Verse 1");
      expect(html).toContain("Chorus");
    });

    it("renders chord lines with lead-chord class", () => {
      const html = generatePrintAllHtml(createDefaultOptions());
      expect(html).toContain("lead-chord");
    });

    it("renders lyrics", () => {
      const html = generatePrintAllHtml(createDefaultOptions());
      expect(html).toContain("Amazing grace how sweet the sound");
      expect(html).toContain("That saved a wretch like me");
    });

    it("uses blue color for lead sheet chords", () => {
      const html = generatePrintAllHtml(createDefaultOptions());
      expect(html).toContain(".lead-chord");
      expect(html).toContain("color: #1a56db");
    });
  });

  describe("Nashville section", () => {
    it("calls convertChordLine with the correct key", () => {
      const convertFn = vi.fn((line: string) => line);
      generatePrintAllHtml(createDefaultOptions({ convertChordLine: convertFn }));
      expect(convertFn).toHaveBeenCalledWith(expect.any(String), "G");
    });

    it("renders Nashville chords with nashville-chord class", () => {
      const html = generatePrintAllHtml(createDefaultOptions());
      expect(html).toContain("nashville-chord");
    });

    it("uses purple color for Nashville chords", () => {
      const html = generatePrintAllHtml(createDefaultOptions());
      expect(html).toContain(".nashville-chord");
      expect(html).toContain("color: #9333ea");
    });

    it("includes the NNS legend", () => {
      const html = generatePrintAllHtml(createDefaultOptions());
      expect(html).toContain("Nashville Number System:");
      expect(html).toContain("1 = Root");
      expect(html).toContain("m = minor");
    });
  });

  describe("footer", () => {
    it("includes copyright notice with Albert LaMotte", () => {
      const html = generatePrintAllHtml(createDefaultOptions());
      expect(html).toContain("Albert LaMotte");
    });

    it("includes 'Generated by Create Christian Music'", () => {
      const html = generatePrintAllHtml(createDefaultOptions());
      expect(html).toContain("Generated by Create Christian Music");
    });

    it("includes the current year", () => {
      const html = generatePrintAllHtml(createDefaultOptions());
      const currentYear = new Date().getFullYear().toString();
      expect(html).toContain(currentYear);
    });
  });

  describe("edge cases", () => {
    it("handles empty sections", () => {
      const html = generatePrintAllHtml(
        createDefaultOptions({
          leadSheet: { title: "", key: "C", meter: "4/4", sections: [] },
          chords: [],
        })
      );
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("Full Notation");
    });

    it("handles missing key label", () => {
      const html = generatePrintAllHtml(createDefaultOptions({ keyLabel: "" }));
      expect(html).toContain("<!DOCTYPE html>");
    });

    it("handles sections without labels", () => {
      const html = generatePrintAllHtml(
        createDefaultOptions({
          leadSheet: {
            title: "Test",
            key: "C",
            meter: "4/4",
            sections: [
              { label: "", lines: [{ chords: "C G", lyrics: "No label section" }] },
            ],
          },
        })
      );
      expect(html).toContain("No label section");
    });

    it("handles lines with chords but no lyrics", () => {
      const html = generatePrintAllHtml(
        createDefaultOptions({
          leadSheet: {
            title: "Test",
            key: "C",
            meter: "4/4",
            sections: [
              { label: "Intro", lines: [{ chords: "C G Am F", lyrics: "" }] },
            ],
          },
        })
      );
      expect(html).toContain("<!DOCTYPE html>");
    });

    it("escapes HTML entities in song title", () => {
      const html = generatePrintAllHtml(
        createDefaultOptions({
          songTitle: "Rock & Roll <Angels>",
          leadSheet: {
            title: "Rock & Roll <Angels>",
            key: "C",
            meter: "4/4",
            sections: [{ label: "V", lines: [{ chords: "C", lyrics: "Test" }] }],
          },
        })
      );
      expect(html).toContain("Rock &amp; Roll &lt;Angels&gt;");
      expect(html).not.toContain("<Angels>");
    });

    it("handles no chords (empty chord diagrams)", () => {
      const generateChordDiagramsHtml = vi.fn(() => "");
      const html = generatePrintAllHtml(
        createDefaultOptions({
          chords: [],
          generateChordDiagramsHtml,
        })
      );
      expect(generateChordDiagramsHtml).toHaveBeenCalledWith([]);
      expect(html).toContain("<!DOCTYPE html>");
    });
  });
});
