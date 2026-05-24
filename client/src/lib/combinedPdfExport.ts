/**
 * Combined PDF Export
 *
 * Generates a single PDF containing all sheet music variations:
 * 1. Full notation with chord diagrams
 * 2. Lead sheet (lyrics with chord symbols)
 * 3. Nashville Number System chart
 *
 * Uses jsPDF for proper pagination, margins, and section dividers.
 */
import jsPDF from "jspdf";
import type { LeadSheet } from "./leadSheetExtractor";
import { renderSvgToCanvas, getSvgDimensions, getStaffBreakPoints } from "./pdfExport";

// ─── Page Constants (US Letter: 8.5" x 11") ───
const PAGE_WIDTH = 215.9; // 8.5 inches in mm
const PAGE_HEIGHT = 279.4; // 11 inches in mm
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 20;
const MARGIN_LEFT = 19; // ~0.75 inch
const MARGIN_RIGHT = 19;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const FOOTER_RESERVE = 12;
const SAFE_BOTTOM = PAGE_HEIGHT - MARGIN_BOTTOM - FOOTER_RESERVE;
const USABLE_HEIGHT = SAFE_BOTTOM - MARGIN_TOP;

// ─── Font sizes (pt) ───
const TITLE_SIZE = 22;
const SUBTITLE_SIZE = 11;
const SECTION_TITLE_SIZE = 18;
const HEADING_SIZE = 14;
const BODY_SIZE = 12;
const CHORD_SIZE = 13;
const SMALL_SIZE = 9;
const FOOTER_SIZE = 8;

const FOOTER_TEXT = "Generated with Create Christian Music \u2022 createchristianmusic.com";

export interface CombinedPdfOptions {
  /** The SVG element containing the rendered sheet music notation */
  svgElement: SVGElement;
  /** The lead sheet data extracted from ABC notation */
  leadSheet: LeadSheet;
  /** Song title */
  songTitle: string;
  /** Key label (e.g., "Key: G") */
  keyLabel: string;
  /** Array of chord symbols used in the song */
  chords: string[];
  /** Function to convert chord line to Nashville numbers */
  convertChordLine: (chordLine: string, key: string) => string;
  /** Chord diagram SVG HTML generator */
  generateChordDiagramsSvgs: () => SVGElement[];
}

/**
 * Add footer to all pages with page numbers and branding.
 */
function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  const footerY = PAGE_HEIGHT - MARGIN_BOTTOM + 2;
  const currentYear = new Date().getFullYear();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(FOOTER_SIZE);
    doc.setTextColor(160, 160, 160);
    doc.setFont("helvetica", "normal");
    doc.text(
      `\u00A9 ${currentYear} Albert LaMotte \u2022 ${FOOTER_TEXT}`,
      PAGE_WIDTH / 2,
      footerY,
      { align: "center" }
    );
    doc.text(`Page ${i} of ${pageCount}`, PAGE_WIDTH - MARGIN_RIGHT, footerY, {
      align: "right",
    });
  }
}

/**
 * Check if content fits on the current page; if not, add a new page.
 */
function checkPageBreak(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > SAFE_BOTTOM) {
    doc.addPage();
    return MARGIN_TOP;
  }
  return y;
}

// svgToDataUrl replaced by renderSvgToCanvas from pdfExport.ts for robust SVG-to-image conversion

/**
 * Draw a section divider page that introduces a new section of the PDF.
 */
function addSectionDivider(
  doc: jsPDF,
  sectionNumber: number,
  sectionTitle: string,
  sectionSubtitle: string,
  accentColor: [number, number, number]
) {
  doc.addPage();
  let y = PAGE_HEIGHT / 2 - 30;

  // Accent line
  doc.setDrawColor(...accentColor);
  doc.setLineWidth(2);
  doc.line(PAGE_WIDTH / 2 - 30, y, PAGE_WIDTH / 2 + 30, y);
  y += 15;

  // Section number badge
  doc.setFillColor(...accentColor);
  doc.circle(PAGE_WIDTH / 2, y, 12, "F");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text(String(sectionNumber), PAGE_WIDTH / 2, y + 5.5, { align: "center" });
  y += 22;

  // Section title
  doc.setFontSize(SECTION_TITLE_SIZE);
  doc.setTextColor(...accentColor);
  doc.setFont("helvetica", "bold");
  doc.text(sectionTitle, PAGE_WIDTH / 2, y, { align: "center" });
  y += 10;

  // Subtitle
  doc.setFontSize(SUBTITLE_SIZE);
  doc.setTextColor(120, 120, 120);
  doc.setFont("helvetica", "normal");
  doc.text(sectionSubtitle, PAGE_WIDTH / 2, y, { align: "center" });
  y += 15;

  // Bottom accent line
  doc.setDrawColor(...accentColor);
  doc.setLineWidth(0.5);
  doc.line(PAGE_WIDTH / 2 - 30, y, PAGE_WIDTH / 2 + 30, y);
}

/**
 * Add the full notation section (SVG sheet music + chord diagrams).
 */
async function addFullNotationSection(
  doc: jsPDF,
  svgElement: SVGElement,
  songTitle: string,
  keyLabel: string,
  chordDiagramSvgs: SVGElement[]
): Promise<void> {
  // Title
  let y = MARGIN_TOP + 6;
  doc.setFontSize(TITLE_SIZE);
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "bold");
  doc.text(songTitle, PAGE_WIDTH / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(SUBTITLE_SIZE);
  doc.setTextColor(120, 120, 120);
  doc.setFont("helvetica", "normal");
  doc.text("Full Notation \u2022 Lead Sheet", PAGE_WIDTH / 2, y, {
    align: "center",
  });
  y += 4;

  if (keyLabel) {
    doc.setFontSize(SMALL_SIZE);
    doc.text(keyLabel, PAGE_WIDTH / 2, y + 4, { align: "center" });
    y += 8;
  }

  // ─── Guitar Chord Diagrams (at top of first notation page) ───
  if (chordDiagramSvgs.length > 0) {
    const diagramWidth = 22;
    const diagramHeight = 30;
    const diagramGap = 3;
    const maxPerRow = Math.floor((CONTENT_WIDTH + diagramGap) / (diagramWidth + diagramGap));
    const totalRows = Math.ceil(chordDiagramSvgs.length / maxPerRow);
    const chordBlockHeight = totalRows * (diagramHeight + diagramGap) + 10; // 10 for heading

    y = checkPageBreak(doc, y, chordBlockHeight);

    // Light background box for chord diagrams
    doc.setFillColor(248, 248, 250);
    doc.roundedRect(MARGIN_LEFT - 2, y - 2, CONTENT_WIDTH + 4, chordBlockHeight + 4, 2, 2, "F");

    doc.setFontSize(SMALL_SIZE);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "bold");
    doc.text("CHORD DIAGRAMS", MARGIN_LEFT + 2, y + 4);
    y += 10;
    doc.setFont("helvetica", "normal");

    let dx = MARGIN_LEFT;
    for (const svg of chordDiagramSvgs) {
      if (dx + diagramWidth > PAGE_WIDTH - MARGIN_RIGHT) {
        dx = MARGIN_LEFT;
        y += diagramHeight + diagramGap;
      }
      try {
        const { dataUrl: imgDataUrl } = await renderSvgToCanvas(svg, 3);
        doc.addImage(imgDataUrl, "PNG", dx, y, diagramWidth, diagramHeight);
      } catch {
        // Skip diagram on error
      }
      dx += diagramWidth + diagramGap;
    }
    y += diagramHeight + 8;
  }

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
  y += 8;

  // Render the sheet music SVG using robust renderSvgToCanvas
  try {
    const { canvas, dataUrl: imgData, width: svgWidth, height: svgHeight } = await renderSvgToCanvas(svgElement);
    const imgAspect = svgWidth / svgHeight;
    const fitWidth = CONTENT_WIDTH;
    const fitHeight = fitWidth / imgAspect;

    const remainingOnPage = SAFE_BOTTOM - y;

    if (fitHeight <= remainingOnPage) {
      doc.addImage(imgData, "PNG", MARGIN_LEFT, y, fitWidth, fitHeight);
      y += fitHeight + 6;
    } else {
      // Staff-aware pagination
      const staffBreakPoints = getStaffBreakPoints(svgElement, svgHeight);
      const totalImageHeightMM = fitHeight;
      const mmPerPx = totalImageHeightMM / svgHeight;
      const tempCanvas = document.createElement("canvas");
      const tempCtx = tempCanvas.getContext("2d")!;
      const canvasScale = canvas.height / svgHeight;

      let sourceYPx = 0;
      let currentY = y;
      let isFirstPage = true;

      while (sourceYPx < svgHeight - 1) {
        const availableHeightMM = isFirstPage ? remainingOnPage : USABLE_HEIGHT;
        const availableHeightPx = availableHeightMM / mmPerPx;

        let breakPx = sourceYPx + availableHeightPx;

        if (breakPx >= svgHeight) {
          breakPx = svgHeight;
        } else {
          let bestBreak = sourceYPx;
          for (const bp of staffBreakPoints) {
            if (bp <= sourceYPx) continue;
            if (bp - sourceYPx <= availableHeightPx) {
              bestBreak = bp;
            } else {
              break;
            }
          }
          if (bestBreak > sourceYPx) {
            breakPx = bestBreak;
          }
        }

        const sliceHeightPx = breakPx - sourceYPx;
        const sliceHeightMM = sliceHeightPx * mmPerPx;
        const sliceHeightCanvas = sliceHeightPx * canvasScale;
        const sourceYCanvas = sourceYPx * canvasScale;

        tempCanvas.width = canvas.width;
        tempCanvas.height = Math.ceil(sliceHeightCanvas);
        tempCtx.fillStyle = "#ffffff";
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(
          canvas,
          0,
          sourceYCanvas,
          canvas.width,
          sliceHeightCanvas,
          0,
          0,
          tempCanvas.width,
          tempCanvas.height
        );

        let sliceData: string;
        try {
          sliceData = tempCanvas.toDataURL("image/png", 1.0);
        } catch {
          console.warn("[CombinedPDF] Slice canvas tainted, skipping slice");
          break;
        }
        doc.addImage(
          sliceData,
          "PNG",
          MARGIN_LEFT,
          currentY,
          fitWidth,
          sliceHeightMM
        );

        sourceYPx = breakPx;

        if (sourceYPx < svgHeight - 1) {
          doc.addPage();
          currentY = MARGIN_TOP;
          isFirstPage = false;
        } else {
          y = currentY + sliceHeightMM + 6;
        }
      }
    }
  } catch {
    // If SVG rendering fails, add a placeholder message
    y = checkPageBreak(doc, y, 20);
    doc.setFontSize(BODY_SIZE);
    doc.setTextColor(150, 150, 150);
    doc.text(
      "(Sheet music notation could not be rendered to PDF)",
      PAGE_WIDTH / 2,
      y,
      { align: "center" }
    );
    y += 10;
  }

  // (Chord diagrams already rendered at top of first notation page)
}

/**
 * Add the lead sheet section (lyrics with chord symbols above).
 */
function addLeadSheetSection(
  doc: jsPDF,
  leadSheet: LeadSheet,
  songTitle: string,
  keyLabel: string
): void {
  let y = MARGIN_TOP + 6;

  // Title
  doc.setFontSize(TITLE_SIZE);
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "bold");
  doc.text(songTitle, PAGE_WIDTH / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(SUBTITLE_SIZE);
  doc.setTextColor(120, 120, 120);
  doc.setFont("helvetica", "normal");
  doc.text("Lead Sheet \u2022 Chords & Lyrics", PAGE_WIDTH / 2, y, {
    align: "center",
  });
  y += 4;

  if (keyLabel) {
    doc.setFontSize(SMALL_SIZE);
    doc.text(keyLabel, PAGE_WIDTH / 2, y + 4, { align: "center" });
    y += 8;
  }

  const meterLabel = leadSheet.meter ? `Time: ${leadSheet.meter}` : "";
  if (meterLabel) {
    doc.setFontSize(SMALL_SIZE);
    doc.text(meterLabel, PAGE_WIDTH / 2, y + 2, { align: "center" });
    y += 6;
  }

  // Divider
  doc.setDrawColor(37, 99, 235); // Blue accent
  doc.setLineWidth(0.5);
  doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
  y += 10;

  // Sections
  for (const section of leadSheet.sections) {
    // Section label
    if (section.label) {
      y = checkPageBreak(doc, y, 20);
      doc.setFontSize(HEADING_SIZE);
      doc.setTextColor(37, 99, 235); // Blue
      doc.setFont("helvetica", "bold");
      doc.text(section.label.toUpperCase(), MARGIN_LEFT, y);
      y += 3;
      doc.setDrawColor(200, 210, 230);
      doc.setLineWidth(0.3);
      doc.line(MARGIN_LEFT, y, MARGIN_LEFT + 40, y);
      y += 6;
    }

    for (const line of section.lines) {
      const chordLineHeight = line.chords ? 5 : 0;
      const lyricsLineHeight = line.lyrics ? 6 : 0;
      const totalLineHeight = chordLineHeight + lyricsLineHeight + 3;

      y = checkPageBreak(doc, y, totalLineHeight);

      // Chord line
      if (line.chords) {
        doc.setFontSize(CHORD_SIZE);
        doc.setTextColor(37, 99, 235);
        doc.setFont("courier", "bold");
        const wrappedChords = doc.splitTextToSize(line.chords, CONTENT_WIDTH);
        for (const wl of wrappedChords) {
          doc.text(wl, MARGIN_LEFT, y);
          y += 5;
        }
      }

      // Lyrics line
      if (line.lyrics) {
        doc.setFontSize(BODY_SIZE);
        doc.setTextColor(40, 40, 40);
        doc.setFont("helvetica", "normal");
        const wrappedLyrics = doc.splitTextToSize(line.lyrics, CONTENT_WIDTH);
        for (const wl of wrappedLyrics) {
          doc.text(wl, MARGIN_LEFT, y);
          y += 5.5;
        }
      }

      y += 2; // Space between lines
    }

    y += 6; // Space between sections
  }
}

/**
 * Add the Nashville Number System section.
 */
function addNashvilleSection(
  doc: jsPDF,
  leadSheet: LeadSheet,
  songTitle: string,
  keyLabel: string,
  convertChordLine: (chordLine: string, key: string) => string
): void {
  let y = MARGIN_TOP + 6;
  const songKey = leadSheet.key || "C";

  // Title
  doc.setFontSize(TITLE_SIZE);
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "bold");
  doc.text(songTitle, PAGE_WIDTH / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(SUBTITLE_SIZE);
  doc.setTextColor(120, 120, 120);
  doc.setFont("helvetica", "normal");
  doc.text("Nashville Number Chart", PAGE_WIDTH / 2, y, { align: "center" });
  y += 4;

  if (keyLabel) {
    doc.setFontSize(SMALL_SIZE);
    doc.text(keyLabel, PAGE_WIDTH / 2, y + 4, { align: "center" });
    y += 8;
  }

  const meterLabel = leadSheet.meter ? `Time: ${leadSheet.meter}` : "";
  if (meterLabel) {
    doc.setFontSize(SMALL_SIZE);
    doc.text(meterLabel, PAGE_WIDTH / 2, y + 2, { align: "center" });
    y += 6;
  }

  // Divider
  doc.setDrawColor(147, 51, 234); // Purple accent
  doc.setLineWidth(0.5);
  doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
  y += 10;

  // Sections
  for (const section of leadSheet.sections) {
    if (section.label) {
      y = checkPageBreak(doc, y, 20);
      doc.setFontSize(HEADING_SIZE);
      doc.setTextColor(147, 51, 234); // Purple
      doc.setFont("helvetica", "bold");
      doc.text(section.label.toUpperCase(), MARGIN_LEFT, y);
      y += 3;
      doc.setDrawColor(200, 180, 230);
      doc.setLineWidth(0.3);
      doc.line(MARGIN_LEFT, y, MARGIN_LEFT + 40, y);
      y += 6;
    }

    for (const line of section.lines) {
      const chordLineHeight = line.chords ? 5 : 0;
      const lyricsLineHeight = line.lyrics ? 6 : 0;
      const totalLineHeight = chordLineHeight + lyricsLineHeight + 3;

      y = checkPageBreak(doc, y, totalLineHeight);

      // Nashville number line
      if (line.chords) {
        const nashvilleChords = convertChordLine(line.chords, songKey);
        doc.setFontSize(CHORD_SIZE);
        doc.setTextColor(147, 51, 234);
        doc.setFont("courier", "bold");
        const wrappedChords = doc.splitTextToSize(
          nashvilleChords,
          CONTENT_WIDTH
        );
        for (const wl of wrappedChords) {
          doc.text(wl, MARGIN_LEFT, y);
          y += 5;
        }
      }

      // Lyrics line
      if (line.lyrics) {
        doc.setFontSize(BODY_SIZE);
        doc.setTextColor(40, 40, 40);
        doc.setFont("helvetica", "normal");
        const wrappedLyrics = doc.splitTextToSize(line.lyrics, CONTENT_WIDTH);
        for (const wl of wrappedLyrics) {
          doc.text(wl, MARGIN_LEFT, y);
          y += 5.5;
        }
      }

      y += 2;
    }

    y += 6;
  }

  // NNS Legend
  y = checkPageBreak(doc, y, 25);
  y += 4;
  doc.setFillColor(249, 249, 249);
  doc.setDrawColor(229, 229, 229);
  doc.roundedRect(MARGIN_LEFT, y, CONTENT_WIDTH, 20, 2, 2, "FD");
  doc.setFontSize(SMALL_SIZE);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(60, 60, 60);
  doc.text("Nashville Number System:", MARGIN_LEFT + 5, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(
    "1 = Root \u2022 2 = 2nd \u2022 3 = 3rd \u2022 4 = 4th \u2022 5 = 5th \u2022 6 = 6th \u2022 7 = 7th",
    MARGIN_LEFT + 5,
    y + 13
  );
  doc.text(
    "m = minor \u2022 b = flat \u2022 # = sharp \u2022 / = bass note",
    MARGIN_LEFT + 5,
    y + 18
  );
}

/**
 * Add a cover page to the combined PDF.
 */
function addCoverPage(
  doc: jsPDF,
  songTitle: string,
  keyLabel: string
): void {
  const currentYear = new Date().getFullYear();
  let y = PAGE_HEIGHT / 2 - 50;

  // Decorative top line
  doc.setDrawColor(79, 70, 229);
  doc.setLineWidth(1.5);
  doc.line(PAGE_WIDTH / 2 - 40, y, PAGE_WIDTH / 2 + 40, y);
  y += 20;

  // Song title
  doc.setFontSize(28);
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "bold");
  const titleLines = doc.splitTextToSize(songTitle, CONTENT_WIDTH - 20);
  for (const line of titleLines) {
    doc.text(line, PAGE_WIDTH / 2, y, { align: "center" });
    y += 12;
  }
  y += 5;

  // Subtitle
  doc.setFontSize(14);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.text("Complete Sheet Music Package", PAGE_WIDTH / 2, y, {
    align: "center",
  });
  y += 10;

  if (keyLabel) {
    doc.setFontSize(12);
    doc.setTextColor(120, 120, 120);
    doc.text(keyLabel, PAGE_WIDTH / 2, y, { align: "center" });
    y += 10;
  }

  // Decorative bottom line
  y += 5;
  doc.setDrawColor(79, 70, 229);
  doc.setLineWidth(0.5);
  doc.line(PAGE_WIDTH / 2 - 40, y, PAGE_WIDTH / 2 + 40, y);
  y += 20;

  // Table of contents
  doc.setFontSize(SMALL_SIZE + 1);
  doc.setTextColor(80, 80, 80);
  doc.setFont("helvetica", "normal");

  const tocItems = [
    { num: "1", title: "Full Notation", desc: "Complete sheet music with chord diagrams" },
    { num: "2", title: "Lead Sheet", desc: "Lyrics with chord symbols for quick reference" },
    { num: "3", title: "Nashville Number Chart", desc: "Number system for easy transposition" },
  ];

  for (const item of tocItems) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text(`${item.num}.`, PAGE_WIDTH / 2 - 50, y);
    doc.setTextColor(50, 50, 50);
    doc.text(item.title, PAGE_WIDTH / 2 - 42, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(SMALL_SIZE);
    doc.text(`  \u2014 ${item.desc}`, PAGE_WIDTH / 2 - 42 + doc.getTextWidth(item.title), y);
    doc.setFontSize(SMALL_SIZE + 1);
    y += 8;
  }

  // Copyright at bottom
  doc.setFontSize(SMALL_SIZE);
  doc.setTextColor(160, 160, 160);
  doc.setFont("helvetica", "normal");
  doc.text(
    `\u00A9 ${currentYear} Albert LaMotte`,
    PAGE_WIDTH / 2,
    PAGE_HEIGHT - MARGIN_BOTTOM - 10,
    { align: "center" }
  );
  doc.text(
    "Create Christian Music \u2022 createchristianmusic.com",
    PAGE_WIDTH / 2,
    PAGE_HEIGHT - MARGIN_BOTTOM - 4,
    { align: "center" }
  );
}

/**
 * Generate and download a combined PDF with all sheet music variations.
 */
export async function exportCombinedPdf(
  options: CombinedPdfOptions
): Promise<void> {
  const {
    svgElement,
    leadSheet,
    songTitle,
    keyLabel,
    convertChordLine,
    generateChordDiagramsSvgs,
  } = options;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });

  // ─── Cover Page ───
  addCoverPage(doc, songTitle, keyLabel);

  // ─── Section 1: Full Notation ───
  addSectionDivider(
    doc,
    1,
    "Full Notation",
    "Complete sheet music with melody, chords, and guitar chord diagrams",
    [37, 99, 235] // Blue
  );
  doc.addPage();

  const chordDiagramSvgs = generateChordDiagramsSvgs();
  await addFullNotationSection(
    doc,
    svgElement,
    songTitle,
    keyLabel,
    chordDiagramSvgs
  );

  // ─── Section 2: Lead Sheet ───
  addSectionDivider(
    doc,
    2,
    "Lead Sheet",
    "Lyrics with chord symbols above for quick reference during worship",
    [37, 99, 235] // Blue
  );
  doc.addPage();
  addLeadSheetSection(doc, leadSheet, songTitle, keyLabel);

  // ─── Section 3: Nashville Number Chart ───
  addSectionDivider(
    doc,
    3,
    "Nashville Number Chart",
    "Number-based notation for easy transposition to any key",
    [147, 51, 234] // Purple
  );
  doc.addPage();
  addNashvilleSection(doc, leadSheet, songTitle, keyLabel, convertChordLine);

  // ─── Footer on all pages ───
  addFooter(doc);

  // ─── Save ───
  doc.save(`${songTitle} - Complete Sheet Music.pdf`);
}
