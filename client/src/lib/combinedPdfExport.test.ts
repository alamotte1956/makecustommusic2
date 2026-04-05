/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock jsPDF before importing the module
const mockDoc = {
  addPage: vi.fn(),
  setPage: vi.fn(),
  setFontSize: vi.fn(),
  setTextColor: vi.fn(),
  setFont: vi.fn(),
  setDrawColor: vi.fn(),
  setFillColor: vi.fn(),
  setLineWidth: vi.fn(),
  text: vi.fn(),
  line: vi.fn(),
  circle: vi.fn(),
  roundedRect: vi.fn(),
  addImage: vi.fn(),
  save: vi.fn(),
  getNumberOfPages: vi.fn(() => 5),
  splitTextToSize: vi.fn((text: string) => [text]),
  getTextWidth: vi.fn((text: string) => text.length * 2),
};

vi.mock("jspdf", () => ({
  default: vi.fn(() => mockDoc),
}));

function createMockSvg() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  // Override getBoundingClientRect since jsdom returns zeros
  Object.defineProperty(svg, "getBoundingClientRect", {
    value: () => ({
      width: 700,
      height: 400,
      top: 0,
      left: 0,
      right: 700,
      bottom: 400,
      x: 0,
      y: 0,
      toJSON: () => {},
    }),
  });
  return svg;
}

function createDefaultOptions(overrides: Record<string, any> = {}) {
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
            {
              chords: "G       C       G",
              lyrics: "Amazing grace how sweet the sound",
            },
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
      line
        .replace(/G/g, "1")
        .replace(/C/g, "4")
        .replace(/D/g, "5")
    ),
    generateChordDiagramsSvgs: vi.fn(() => []),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  // Mock URL.createObjectURL / revokeObjectURL
  globalThis.URL.createObjectURL = vi.fn(() => "blob:mock-url");
  globalThis.URL.revokeObjectURL = vi.fn();

  // Mock Image to auto-trigger onload
  const OriginalImage = globalThis.Image;
  vi.spyOn(globalThis, "Image").mockImplementation(function (this: any) {
    const img = new OriginalImage();
    // Auto-trigger onload after src is set
    const origSrcDescriptor = Object.getOwnPropertyDescriptor(
      HTMLImageElement.prototype,
      "src"
    );
    Object.defineProperty(img, "src", {
      set(val: string) {
        origSrcDescriptor?.set?.call(this, val);
        setTimeout(() => {
          if (img.onload) img.onload(new Event("load"));
        }, 0);
      },
      get() {
        return origSrcDescriptor?.get?.call(this) ?? "";
      },
    });
    return img;
  } as any);

  // Mock canvas getContext to return a usable 2d context
  const origCreateElement = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
    const el = origCreateElement(tag);
    if (tag === "canvas") {
      (el as any).getContext = vi.fn(() => ({
        scale: vi.fn(),
        fillStyle: "",
        fillRect: vi.fn(),
        drawImage: vi.fn(),
      }));
      (el as any).toDataURL = vi.fn(() => "data:image/png;base64,mockdata");
    }
    return el;
  });

  // Mock XMLSerializer
  (globalThis as any).XMLSerializer = class {
    serializeToString() {
      return '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
    }
  };
});

describe("combinedPdfExport", () => {
  describe("module exports", () => {
    it("exports exportCombinedPdf function", async () => {
      const mod = await import("./combinedPdfExport");
      expect(mod.exportCombinedPdf).toBeDefined();
      expect(typeof mod.exportCombinedPdf).toBe("function");
    });
  });

  describe("PDF document creation", () => {
    it("creates an A4 portrait PDF", async () => {
      const jsPDF = (await import("jspdf")).default;
      const { exportCombinedPdf } = await import("./combinedPdfExport");
      await exportCombinedPdf(createDefaultOptions());

      expect(jsPDF).toHaveBeenCalledWith({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
    });

    it("saves with correct filename pattern", async () => {
      const { exportCombinedPdf } = await import("./combinedPdfExport");
      await exportCombinedPdf(
        createDefaultOptions({ songTitle: "How Great Is Our God" })
      );
      expect(mockDoc.save).toHaveBeenCalledWith(
        "How Great Is Our God - Complete Sheet Music.pdf"
      );
    });

    it("adds at least 6 pages (cover + 3 dividers + 3 content)", async () => {
      const { exportCombinedPdf } = await import("./combinedPdfExport");
      await exportCombinedPdf(createDefaultOptions());
      // cover (page 1) + divider1 + content1 + divider2 + content2 + divider3 + content3 = 6 addPage calls
      expect(mockDoc.addPage.mock.calls.length).toBeGreaterThanOrEqual(6);
    });

    it("adds footer to every page", async () => {
      const { exportCombinedPdf } = await import("./combinedPdfExport");
      mockDoc.getNumberOfPages.mockReturnValue(7);
      await exportCombinedPdf(createDefaultOptions());

      // setPage should be called for each page
      for (let i = 1; i <= 7; i++) {
        expect(mockDoc.setPage).toHaveBeenCalledWith(i);
      }
    });
  });

  describe("cover page content", () => {
    it("includes the song title", async () => {
      const { exportCombinedPdf } = await import("./combinedPdfExport");
      await exportCombinedPdf(
        createDefaultOptions({ songTitle: "10,000 Reasons" })
      );

      const textCalls = mockDoc.text.mock.calls.map((c: any[]) => c[0]);
      expect(textCalls).toContain("10,000 Reasons");
    });

    it("includes 'Complete Sheet Music Package' subtitle", async () => {
      const { exportCombinedPdf } = await import("./combinedPdfExport");
      await exportCombinedPdf(createDefaultOptions());

      const textCalls = mockDoc.text.mock.calls.map((c: any[]) => c[0]);
      expect(textCalls).toContain("Complete Sheet Music Package");
    });

    it("includes table of contents with all three sections", async () => {
      const { exportCombinedPdf } = await import("./combinedPdfExport");
      await exportCombinedPdf(createDefaultOptions());

      const textCalls = mockDoc.text.mock.calls.map((c: any[]) => c[0]);
      expect(textCalls).toContain("Full Notation");
      expect(textCalls).toContain("Lead Sheet");
      expect(textCalls).toContain("Nashville Number Chart");
    });

    it("includes copyright notice", async () => {
      const { exportCombinedPdf } = await import("./combinedPdfExport");
      await exportCombinedPdf(createDefaultOptions());

      const textCalls = mockDoc.text.mock.calls.map((c: any[]) => c[0]);
      const hasCopyright = textCalls.some(
        (t: string) =>
          typeof t === "string" && t.includes("Albert LaMotte")
      );
      expect(hasCopyright).toBe(true);
    });
  });

  describe("lead sheet section", () => {
    it("renders section labels in uppercase", async () => {
      const { exportCombinedPdf } = await import("./combinedPdfExport");
      await exportCombinedPdf(createDefaultOptions());

      const textCalls = mockDoc.text.mock.calls.map((c: any[]) => c[0]);
      // Lead sheet section should have VERSE 1 and CHORUS
      expect(textCalls.filter((t: string) => t === "VERSE 1").length).toBeGreaterThanOrEqual(1);
      expect(textCalls.filter((t: string) => t === "CHORUS").length).toBeGreaterThanOrEqual(1);
    });

    it("renders chord lines and lyrics", async () => {
      const { exportCombinedPdf } = await import("./combinedPdfExport");
      await exportCombinedPdf(createDefaultOptions());

      const textCalls = mockDoc.text.mock.calls.map((c: any[]) => c[0]);
      expect(textCalls).toContain("Amazing grace how sweet the sound");
    });
  });

  describe("Nashville section", () => {
    it("calls convertChordLine with correct key", async () => {
      const { exportCombinedPdf } = await import("./combinedPdfExport");
      const convertFn = vi.fn((line: string) => line);
      await exportCombinedPdf(
        createDefaultOptions({ convertChordLine: convertFn })
      );

      // Should be called with the key from leadSheet
      expect(convertFn).toHaveBeenCalledWith(
        expect.any(String),
        "G" // leadSheet.key
      );
    });

    it("includes NNS legend", async () => {
      const { exportCombinedPdf } = await import("./combinedPdfExport");
      await exportCombinedPdf(createDefaultOptions());

      const textCalls = mockDoc.text.mock.calls.map((c: any[]) => c[0]);
      const hasLegend = textCalls.some(
        (t: string) =>
          typeof t === "string" && t.includes("Nashville Number System")
      );
      expect(hasLegend).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles empty sections without crashing", async () => {
      const { exportCombinedPdf } = await import("./combinedPdfExport");
      await expect(
        exportCombinedPdf(
          createDefaultOptions({
            leadSheet: { title: "", key: "C", meter: "4/4", sections: [] },
            chords: [],
          })
        )
      ).resolves.not.toThrow();
    });

    it("handles missing key label", async () => {
      const { exportCombinedPdf } = await import("./combinedPdfExport");
      await expect(
        exportCombinedPdf(createDefaultOptions({ keyLabel: "" }))
      ).resolves.not.toThrow();
    });

    it("handles sections without labels", async () => {
      const { exportCombinedPdf } = await import("./combinedPdfExport");
      await expect(
        exportCombinedPdf(
          createDefaultOptions({
            leadSheet: {
              title: "Test",
              key: "C",
              meter: "4/4",
              sections: [
                {
                  label: "",
                  lines: [{ chords: "C G", lyrics: "No label section" }],
                },
              ],
            },
          })
        )
      ).resolves.not.toThrow();
    });

    it("handles lines with chords but no lyrics", async () => {
      const { exportCombinedPdf } = await import("./combinedPdfExport");
      await expect(
        exportCombinedPdf(
          createDefaultOptions({
            leadSheet: {
              title: "Test",
              key: "C",
              meter: "4/4",
              sections: [
                {
                  label: "Intro",
                  lines: [{ chords: "C G Am F", lyrics: "" }],
                },
              ],
            },
          })
        )
      ).resolves.not.toThrow();
    });

    it("handles lines with lyrics but no chords", async () => {
      const { exportCombinedPdf } = await import("./combinedPdfExport");
      await expect(
        exportCombinedPdf(
          createDefaultOptions({
            leadSheet: {
              title: "Test",
              key: "C",
              meter: "4/4",
              sections: [
                {
                  label: "Spoken",
                  lines: [{ chords: "", lyrics: "Spoken word section" }],
                },
              ],
            },
          })
        )
      ).resolves.not.toThrow();
    });
  });
});
