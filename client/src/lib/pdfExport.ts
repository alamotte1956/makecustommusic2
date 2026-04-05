/**
 * Shared PDF export utility for consistent document formatting.
 * Uses jsPDF for proper pagination, margins, and no content overflow.
 *
 * MARGIN RULES:
 * - All content must stay within the safe zone: MARGIN_TOP to (PAGE_HEIGHT - MARGIN_BOTTOM - FOOTER_RESERVE)
 * - The footer occupies the last FOOTER_RESERVE mm of each page
 * - checkPageBreak accounts for the full needed height including any padding above/below elements
 * - After a page break, y resets to MARGIN_TOP (never above it)
 * - Rectangles and boxes must never extend above MARGIN_TOP or below the safe bottom
 */
import jsPDF from "jspdf";

// ─── Page Constants ───
const PAGE_WIDTH = 210; // A4 mm
const PAGE_HEIGHT = 297;
const MARGIN_TOP = 25;
const MARGIN_BOTTOM = 25;
const MARGIN_LEFT = 20;
const MARGIN_RIGHT = 20;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const FOOTER_RESERVE = 12; // Space reserved for footer at bottom of each page
const SAFE_BOTTOM = PAGE_HEIGHT - MARGIN_BOTTOM - FOOTER_RESERVE; // Content must not go below this
const USABLE_HEIGHT = SAFE_BOTTOM - MARGIN_TOP;

// ─── Font sizes (pt) ───
const TITLE_SIZE = 22;
const SUBTITLE_SIZE = 11;
const HEADING_SIZE = 14;
const BODY_SIZE = 11;
const SMALL_SIZE = 9;
const FOOTER_SIZE = 8;

const FOOTER_TEXT = "Generated with Create Christian Music \u2022 createchristianmusic.com";

/**
 * Add footer to all pages. Footer is placed in the FOOTER_RESERVE zone
 * below SAFE_BOTTOM, ensuring it never overlaps content.
 */
function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  const footerY = PAGE_HEIGHT - MARGIN_BOTTOM + 2; // Just inside the bottom margin area
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(FOOTER_SIZE);
    doc.setTextColor(160, 160, 160);
    doc.setFont("helvetica", "normal");
    doc.text(FOOTER_TEXT, PAGE_WIDTH / 2, footerY, { align: "center" });
    doc.text(`Page ${i} of ${pageCount}`, PAGE_WIDTH - MARGIN_RIGHT, footerY, { align: "right" });
  }
}

/**
 * Check if content of the given height fits on the current page.
 * If not, add a new page and return MARGIN_TOP.
 * The `needed` parameter must include ALL vertical space the element
 * occupies, including any padding above/below.
 */
function checkPageBreak(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > SAFE_BOTTOM) {
    doc.addPage();
    return MARGIN_TOP;
  }
  return y;
}

/**
 * Parse SVG viewBox to get reliable dimensions even when the element is hidden.
 */
export function getSvgDimensions(svgElement: SVGElement): { width: number; height: number } {
  // Try viewBox first (most reliable, works even when element is hidden)
  const viewBox = svgElement.getAttribute("viewBox");
  if (viewBox) {
    const parts = viewBox.split(/[\s,]+/).map(Number);
    if (parts.length >= 4 && parts[2] > 0 && parts[3] > 0) {
      return { width: parts[2], height: parts[3] };
    }
  }

  // Try explicit width/height attributes
  const attrW = parseFloat(svgElement.getAttribute("width") || "0");
  const attrH = parseFloat(svgElement.getAttribute("height") || "0");
  if (attrW > 0 && attrH > 0) {
    return { width: attrW, height: attrH };
  }

  // Fall back to getBoundingClientRect
  const bbox = svgElement.getBoundingClientRect();
  return {
    width: bbox.width > 0 ? bbox.width : 700,
    height: bbox.height > 0 ? bbox.height : 400,
  };
}

/**
 * Sanitize an SVG element for safe serialization:
 * - Ensures xmlns is set
 * - Removes external references that could taint canvas
 * - Inlines computed styles for text elements
 */
export function sanitizeSvgForExport(svgElement: SVGElement, width: number, height: number): SVGElement {
  const svgClone = svgElement.cloneNode(true) as SVGElement;
  svgClone.setAttribute("width", String(width));
  svgClone.setAttribute("height", String(height));
  svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svgClone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

  // Remove any external image references that could taint the canvas
  svgClone.querySelectorAll("image").forEach((img) => {
    const href = img.getAttribute("href") || img.getAttributeNS("http://www.w3.org/1999/xlink", "href");
    if (href && !href.startsWith("data:")) {
      img.remove();
    }
  });

  return svgClone;
}

/**
 * Load an SVG as an Image with timeout and fallback approaches.
 * Returns a loaded Image element ready to be drawn on canvas.
 */
export function loadSvgAsImage(
  svgClone: SVGElement,
  timeoutMs = 15000
): Promise<HTMLImageElement> {
  const svgData = new XMLSerializer().serializeToString(svgClone);

  // Strategy 1: Blob URL (faster, works in most browsers)
  // Strategy 2: Data URI (fallback, works in Safari Private Browsing)
  const strategies: (() => string)[] = [
    () => {
      const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      return URL.createObjectURL(blob);
    },
    () => {
      return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgData);
    },
  ];

  return new Promise((resolve, reject) => {
    let strategyIndex = 0;
    let currentUrl: string | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function cleanup() {
      if (timer) clearTimeout(timer);
      // Only revoke blob URLs, not data URIs
      if (currentUrl && currentUrl.startsWith("blob:")) {
        URL.revokeObjectURL(currentUrl);
      }
    }

    function tryNextStrategy() {
      if (strategyIndex >= strategies.length) {
        cleanup();
        reject(new Error("Failed to load SVG as image after all strategies"));
        return;
      }

      // Clean up previous attempt
      if (currentUrl && currentUrl.startsWith("blob:")) {
        URL.revokeObjectURL(currentUrl);
      }

      currentUrl = strategies[strategyIndex]();
      strategyIndex++;

      const img = new Image();

      // Set timeout for this attempt
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        console.warn(`[PDF] Image load timed out (strategy ${strategyIndex}), trying next...`);
        img.onload = null;
        img.onerror = null;
        tryNextStrategy();
      }, timeoutMs);

      img.onload = () => {
        cleanup();
        resolve(img);
      };

      img.onerror = () => {
        console.warn(`[PDF] Image load failed (strategy ${strategyIndex}), trying next...`);
        tryNextStrategy();
      };

      // For data URIs, we don't need crossOrigin; for blob URLs we do
      if (currentUrl.startsWith("blob:")) {
        img.crossOrigin = "anonymous";
      }

      img.src = currentUrl;
    }

    tryNextStrategy();
  });
}

/**
 * Render an SVG to a canvas and return the canvas + PNG data URL.
 * Handles tainted canvas errors gracefully.
 */
export async function renderSvgToCanvas(
  svgElement: SVGElement,
  scale = 3
): Promise<{ canvas: HTMLCanvasElement; dataUrl: string; width: number; height: number }> {
  const { width, height } = getSvgDimensions(svgElement);
  const svgClone = sanitizeSvgForExport(svgElement, width, height);

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas 2D context");

  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const img = await loadSvgAsImage(svgClone);
  ctx.drawImage(img, 0, 0, width, height);

  // Revoke blob URL from the image if applicable
  if (img.src.startsWith("blob:")) {
    URL.revokeObjectURL(img.src);
  }

  let dataUrl: string;
  try {
    dataUrl = canvas.toDataURL("image/png", 1.0);
  } catch (e) {
    // Canvas may be tainted — try without the image (text-only fallback)
    console.warn("[PDF] Canvas tainted, attempting text-only render");
    const fallbackCanvas = document.createElement("canvas");
    fallbackCanvas.width = width * scale;
    fallbackCanvas.height = height * scale;
    const fallbackCtx = fallbackCanvas.getContext("2d")!;
    fallbackCtx.scale(scale, scale);
    fallbackCtx.fillStyle = "#ffffff";
    fallbackCtx.fillRect(0, 0, width, height);
    fallbackCtx.fillStyle = "#333333";
    fallbackCtx.font = "14px sans-serif";
    fallbackCtx.fillText("Sheet music could not be rendered to image.", 20, 30);
    fallbackCtx.fillText("Please use the Print function instead.", 20, 50);
    dataUrl = fallbackCanvas.toDataURL("image/png", 1.0);
  }

  return { canvas, dataUrl, width, height };
}

// ─── Sheet Music PDF ───
export async function exportSheetMusicPDF(
  svgElement: SVGElement,
  songTitle: string
): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Title — start below top margin with enough room for text height
  let y = MARGIN_TOP + 6;
  doc.setFontSize(TITLE_SIZE);
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "bold");
  doc.text(songTitle, PAGE_WIDTH / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(SUBTITLE_SIZE);
  doc.setTextColor(120, 120, 120);
  doc.setFont("helvetica", "normal");
  doc.text("Sheet Music \u2022 Lead Sheet", PAGE_WIDTH / 2, y, { align: "center" });
  y += 5;

  // Divider line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
  y += 8;

  // Render SVG to canvas then to image
  const { canvas, dataUrl: imgData, width: svgWidth, height: svgHeight } = await renderSvgToCanvas(svgElement);

  // Calculate how to fit the image on pages with proper scaling
  const imgAspect = svgWidth / svgHeight;
  const fitWidth = CONTENT_WIDTH;
  const fitHeight = fitWidth / imgAspect;

  // How much vertical space remains on the current page
  const remainingOnPage = SAFE_BOTTOM - y;

  if (fitHeight <= remainingOnPage) {
    // Image fits entirely on current page
    doc.addImage(imgData, "PNG", MARGIN_LEFT, y, fitWidth, fitHeight);
  } else {
    // Split across pages using tiling
    const totalImageHeightMM = fitHeight;
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d")!;

    let remainingMM = totalImageHeightMM;
    let sourceYOffset = 0;
    let currentY = y;
    let isFirstPage = true;

    while (remainingMM > 0) {
      const availableHeight = isFirstPage ? remainingOnPage : USABLE_HEIGHT;
      const sliceHeightMM = Math.min(remainingMM, availableHeight);
      const sliceHeightPx = (sliceHeightMM / totalImageHeightMM) * canvas.height;

      // Create a slice of the image
      tempCanvas.width = canvas.width;
      tempCanvas.height = Math.ceil(sliceHeightPx);
      tempCtx.fillStyle = "#ffffff";
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      tempCtx.drawImage(
        canvas,
        0, sourceYOffset, canvas.width, sliceHeightPx,
        0, 0, tempCanvas.width, tempCanvas.height
      );

      let sliceData: string;
      try {
        sliceData = tempCanvas.toDataURL("image/png", 1.0);
      } catch {
        console.warn("[PDF] Slice canvas tainted, skipping slice");
        break;
      }
      doc.addImage(sliceData, "PNG", MARGIN_LEFT, currentY, fitWidth, sliceHeightMM);

      sourceYOffset += sliceHeightPx;
      remainingMM -= sliceHeightMM;

      if (remainingMM > 0) {
        doc.addPage();
        currentY = MARGIN_TOP;
        isFirstPage = false;
      }
    }
  }

  addFooter(doc);
  doc.save(`${songTitle} - Sheet Music.pdf`);
}

// ─── Guitar Chord PDF ───
export interface ChordPDFSection {
  section: string;
  chords: string[];
  strummingPattern: string;
  bpm: number;
}

export interface ChordPDFData {
  key: string;
  capo: number;
  capoRecommendation?: {
    capoFret: number;
    originalKey: string;
    capoKey: string;
    simplifiedChords: string[];
    reason: string;
  } | null;
  tempo: number;
  timeSignature: string;
  sections: ChordPDFSection[];
  notes: string;
}

export async function exportChordPDF(
  data: ChordPDFData,
  songTitle: string,
  diagramSvgs?: SVGElement[]
): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

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
  doc.text("Guitar Chord Chart", PAGE_WIDTH / 2, y, { align: "center" });
  y += 5;

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
  y += 8;

  // Metadata row — draw boxes with text baseline inside the box (no negative offsets)
  const metaItems: string[] = [];
  metaItems.push(`Key: ${data.key}`);
  if (data.capo > 0) metaItems.push(`Capo: Fret ${data.capo}`);
  metaItems.push(`Tempo: ${data.tempo} BPM`);
  metaItems.push(`Time: ${data.timeSignature}`);

  doc.setFontSize(SMALL_SIZE);
  const boxHeight = 7;
  let metaX = MARGIN_LEFT;

  for (const item of metaItems) {
    const textWidth = doc.getTextWidth(item);
    const boxWidth = textWidth + 8;

    // Check if box fits on current line
    if (metaX + boxWidth > PAGE_WIDTH - MARGIN_RIGHT) {
      metaX = MARGIN_LEFT;
      y += boxHeight + 3;
    }

    y = checkPageBreak(doc, y, boxHeight + 2);

    doc.setFillColor(243, 244, 246);
    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(metaX, y, boxWidth, boxHeight, 2, 2, "FD");
    doc.setTextColor(60, 60, 60);
    doc.text(item, metaX + 4, y + 5); // Text baseline inside the box
    metaX += boxWidth + 4;
  }
  y += boxHeight + 8;

  // Capo Recommendation (if present)
  if (data.capoRecommendation && data.capoRecommendation.capoFret > 0) {
    const rec = data.capoRecommendation;
    const recLines = [
      `Capo Fret ${rec.capoFret}: Play in ${rec.capoKey} shapes (sounds as ${rec.originalKey})`,
      `Simplified chords: ${rec.simplifiedChords.join(", ")}`,
      rec.reason,
    ];

    const recLineHeight = 5;
    const recTotalHeight = 10 + recLines.length * recLineHeight + 4;
    y = checkPageBreak(doc, y, recTotalHeight);

    doc.setFillColor(255, 251, 235); // Warm yellow background
    doc.setDrawColor(251, 191, 36);
    doc.setLineWidth(0.4);
    doc.roundedRect(MARGIN_LEFT, y, CONTENT_WIDTH, recTotalHeight, 2, 2, "FD");

    doc.setFontSize(SMALL_SIZE + 1);
    doc.setTextColor(146, 64, 14);
    doc.setFont("helvetica", "bold");
    doc.text("\u{1F3B8} Capo Recommendation", MARGIN_LEFT + 5, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(SMALL_SIZE);
    doc.setTextColor(120, 53, 15);

    let recY = y + 12;
    for (const line of recLines) {
      const wrapped = doc.splitTextToSize(line, CONTENT_WIDTH - 12);
      for (const wl of wrapped) {
        doc.text(wl, MARGIN_LEFT + 5, recY);
        recY += recLineHeight;
      }
    }

    y += recTotalHeight + 6;
  }

  // Chord Diagrams as images (if SVGs provided)
  if (diagramSvgs && diagramSvgs.length > 0) {
    y = checkPageBreak(doc, y, 42);
    doc.setFontSize(HEADING_SIZE);
    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "bold");
    doc.text("Chord Diagrams", MARGIN_LEFT, y);
    y += 8;
    doc.setFont("helvetica", "normal");

    // Render each chord diagram SVG to canvas and add to PDF
    const diagramWidth = 25;
    const diagramHeight = 35;
    let dx = MARGIN_LEFT;

    for (const svg of diagramSvgs) {
      if (dx + diagramWidth > PAGE_WIDTH - MARGIN_RIGHT) {
        dx = MARGIN_LEFT;
        y += diagramHeight + 4;
      }
      y = checkPageBreak(doc, y, diagramHeight + 4);

      try {
        const { dataUrl: imgDataUrl } = await renderSvgToCanvas(svg, 3);
        doc.addImage(imgDataUrl, "PNG", dx, y, diagramWidth, diagramHeight);
      } catch {
        // Skip diagram on error
      }

      dx += diagramWidth + 3;
    }
    y += diagramHeight + 6;
  }

  // Sections
  for (const section of data.sections) {
    // Calculate total height needed for this section
    doc.setFontSize(14);
    doc.setFont("courier", "bold");
    const chordText = section.chords.join("   \u2192   ");
    const chordLines = doc.splitTextToSize(chordText, CONTENT_WIDTH - 10);
    const chordHeight = chordLines.length * 6;
    const strumHeight = section.strummingPattern ? 6 : 0;
    const sectionTotalHeight = 8 + chordHeight + strumHeight + 12; // padding top + chords + strum + padding bottom

    y = checkPageBreak(doc, y, sectionTotalHeight);

    // Section background — starts at y, extends down by sectionTotalHeight
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(230, 230, 230);
    doc.roundedRect(MARGIN_LEFT, y, CONTENT_WIDTH, sectionTotalHeight, 2, 2, "FD");

    // Section title
    const titleY = y + 6;
    doc.setFontSize(HEADING_SIZE);
    doc.setTextColor(79, 70, 229);
    doc.setFont("helvetica", "bold");
    doc.text(section.section, MARGIN_LEFT + 5, titleY);

    // BPM on the right
    if (section.bpm) {
      doc.setFontSize(SMALL_SIZE);
      doc.setTextColor(140, 140, 140);
      doc.setFont("helvetica", "normal");
      doc.text(`${section.bpm} BPM`, PAGE_WIDTH - MARGIN_RIGHT - 5, titleY, { align: "right" });
    }

    // Chord progression
    let chordY = titleY + 8;
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.setFont("courier", "bold");
    for (const line of chordLines) {
      doc.text(line, MARGIN_LEFT + 5, chordY);
      chordY += 6;
    }

    // Strumming pattern
    if (section.strummingPattern) {
      doc.setFontSize(SMALL_SIZE);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      doc.text(`Strum: ${section.strummingPattern}`, MARGIN_LEFT + 5, chordY);
    }

    y += sectionTotalHeight + 4;
  }

  // Playing tips
  if (data.notes) {
    doc.setFontSize(BODY_SIZE);
    doc.setFont("helvetica", "normal");
    const notesLines = doc.splitTextToSize(data.notes, CONTENT_WIDTH - 14);
    const notesHeight = 10 + notesLines.length * 5 + 6;

    y = checkPageBreak(doc, y, notesHeight);

    doc.setFillColor(245, 245, 250);
    doc.setDrawColor(220, 220, 230);
    doc.roundedRect(MARGIN_LEFT, y, CONTENT_WIDTH, notesHeight, 2, 2, "FD");

    doc.setFontSize(BODY_SIZE);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 60, 60);
    doc.text("Playing Tips", MARGIN_LEFT + 5, y + 7);

    let notesY = y + 14;
    doc.setFontSize(SMALL_SIZE);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    for (const line of notesLines) {
      doc.text(line, MARGIN_LEFT + 7, notesY);
      notesY += 5;
    }
  }

  addFooter(doc);
  doc.save(`${songTitle} - Guitar Chords.pdf`);
}

// ─── Lyrics PDF ───
export function exportLyricsPDF(
  lyrics: string,
  songTitle: string,
  metadata?: {
    genre?: string;
    mood?: string;
    key?: string;
    tempo?: number;
    vocalType?: string;
  }
): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

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
  doc.text("Lyrics", PAGE_WIDTH / 2, y, { align: "center" });
  y += 5;

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
  y += 6;

  // Metadata row
  if (metadata) {
    const metaItems: string[] = [];
    if (metadata.genre) metaItems.push(`Genre: ${metadata.genre}`);
    if (metadata.mood) metaItems.push(`Mood: ${metadata.mood}`);
    if (metadata.key) metaItems.push(`Key: ${metadata.key}`);
    if (metadata.tempo) metaItems.push(`Tempo: ${metadata.tempo} BPM`);
    if (metadata.vocalType && metadata.vocalType !== "none") {
      metaItems.push(`Vocals: ${metadata.vocalType}`);
    }

    if (metaItems.length > 0) {
      doc.setFontSize(SMALL_SIZE);
      const mBoxHeight = 7;
      let metaX = MARGIN_LEFT;

      for (const item of metaItems) {
        const textWidth = doc.getTextWidth(item);
        const boxWidth = textWidth + 8;

        if (metaX + boxWidth > PAGE_WIDTH - MARGIN_RIGHT) {
          metaX = MARGIN_LEFT;
          y += mBoxHeight + 3;
        }

        y = checkPageBreak(doc, y, mBoxHeight + 2);

        doc.setFillColor(243, 244, 246);
        doc.setDrawColor(220, 220, 220);
        doc.roundedRect(metaX, y, boxWidth, mBoxHeight, 2, 2, "FD");
        doc.setTextColor(60, 60, 60);
        doc.text(item, metaX + 4, y + 5); // Text baseline inside the box
        metaX += boxWidth + 4;
      }
      y += mBoxHeight + 8;
    }
  }

  // Lyrics body
  const lines = lyrics.split("\n");
  doc.setFontSize(BODY_SIZE);
  const lineHeight = 5.5;

  for (const line of lines) {
    const trimmed = line.trim();

    // Section headers like [Verse 1], [Chorus], etc.
    if (/^\[.*\]$/.test(trimmed)) {
      y = checkPageBreak(doc, y, lineHeight * 2 + 6);
      y += 5; // Extra space before section header
      doc.setFontSize(HEADING_SIZE);
      doc.setTextColor(79, 70, 229);
      doc.setFont("helvetica", "bold");
      doc.text(trimmed.replace(/[\[\]]/g, ""), MARGIN_LEFT, y);
      y += lineHeight + 2;
      doc.setFontSize(BODY_SIZE);
      doc.setFont("helvetica", "normal");
      continue;
    }

    // Empty lines = paragraph break
    if (trimmed === "") {
      y += lineHeight * 0.6;
      continue;
    }

    // Regular lyrics line — wrap if too long
    doc.setTextColor(40, 40, 40);
    doc.setFont("helvetica", "normal");
    const wrappedLines = doc.splitTextToSize(trimmed, CONTENT_WIDTH);
    for (const wl of wrappedLines) {
      y = checkPageBreak(doc, y, lineHeight);
      doc.text(wl, MARGIN_LEFT, y);
      y += lineHeight;
    }
  }

  addFooter(doc);
  doc.save(`${songTitle} - Lyrics.pdf`);
}
