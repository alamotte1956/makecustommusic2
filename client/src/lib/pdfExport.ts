/**
 * Shared PDF export utility for consistent document formatting.
 * Uses jsPDF for proper pagination, margins, and no content overflow.
 */
import jsPDF from "jspdf";

// ─── Constants ───
const PAGE_WIDTH = 210; // A4 mm
const PAGE_HEIGHT = 297;
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 20;
const MARGIN_LEFT = 20;
const MARGIN_RIGHT = 20;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const USABLE_HEIGHT = PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;

// ─── Font sizes (pt) ───
const TITLE_SIZE = 22;
const SUBTITLE_SIZE = 11;
const HEADING_SIZE = 14;
const BODY_SIZE = 11;
const SMALL_SIZE = 9;
const FOOTER_SIZE = 8;

const FOOTER_TEXT = "Generated with Make Custom Music \u2022 makecustommusic.com";

function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(FOOTER_SIZE);
    doc.setTextColor(160, 160, 160);
    doc.text(FOOTER_TEXT, PAGE_WIDTH / 2, PAGE_HEIGHT - 10, { align: "center" });
    doc.text(`Page ${i} of ${pageCount}`, PAGE_WIDTH - MARGIN_RIGHT, PAGE_HEIGHT - 10, { align: "right" });
  }
}

function checkPageBreak(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_HEIGHT - MARGIN_BOTTOM) {
    doc.addPage();
    return MARGIN_TOP;
  }
  return y;
}

// ─── Sheet Music PDF ───
export async function exportSheetMusicPDF(
  svgElement: SVGElement,
  songTitle: string
): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Title
  let y = MARGIN_TOP;
  doc.setFontSize(TITLE_SIZE);
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "bold");
  doc.text(songTitle, PAGE_WIDTH / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(SUBTITLE_SIZE);
  doc.setTextColor(120, 120, 120);
  doc.setFont("helvetica", "normal");
  doc.text("Sheet Music \u2022 Lead Sheet", PAGE_WIDTH / 2, y, { align: "center" });
  y += 4;

  // Divider line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
  y += 8;

  // Render SVG to canvas then to image
  const svgClone = svgElement.cloneNode(true) as SVGElement;
  const bbox = svgElement.getBoundingClientRect();
  const svgWidth = bbox.width || 700;
  const svgHeight = bbox.height || 400;

  svgClone.setAttribute("width", String(svgWidth));
  svgClone.setAttribute("height", String(svgHeight));
  svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  const canvas = document.createElement("canvas");
  const scale = 3; // High resolution
  canvas.width = svgWidth * scale;
  canvas.height = svgHeight * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, svgWidth, svgHeight);

  const svgData = new XMLSerializer().serializeToString(svgClone);
  const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, svgWidth, svgHeight);
      URL.revokeObjectURL(url);

      const imgData = canvas.toDataURL("image/png", 1.0);

      // Calculate how to fit the image on pages with proper scaling
      const imgAspect = svgWidth / svgHeight;
      const fitWidth = CONTENT_WIDTH;
      const fitHeight = fitWidth / imgAspect;

      // If the image fits on the remaining page space, place it
      if (fitHeight <= USABLE_HEIGHT - (y - MARGIN_TOP)) {
        doc.addImage(imgData, "PNG", MARGIN_LEFT, y, fitWidth, fitHeight);
      } else {
        // Split across pages if needed
        // Scale to fit width, then tile vertically
        const totalImageHeightMM = fitHeight;
        const availableFirstPage = PAGE_HEIGHT - MARGIN_BOTTOM - y;
        
        // Use a tiling approach: render portions of the image per page
        const tempCanvas = document.createElement("canvas");
        const tempCtx = tempCanvas.getContext("2d")!;
        
        let remainingMM = totalImageHeightMM;
        let sourceYOffset = 0;
        let currentY = y;
        let isFirstPage = true;
        
        while (remainingMM > 0) {
          const availableHeight = isFirstPage ? availableFirstPage : USABLE_HEIGHT;
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
          
          const sliceData = tempCanvas.toDataURL("image/png", 1.0);
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
      resolve();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to render sheet music image"));
    };
    img.src = url;
  });
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
  tempo: number;
  timeSignature: string;
  sections: ChordPDFSection[];
  notes: string;
}

export function exportChordPDF(
  data: ChordPDFData,
  songTitle: string,
  diagramSvgs?: SVGElement[]
): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Title
  let y = MARGIN_TOP;
  doc.setFontSize(TITLE_SIZE);
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "bold");
  doc.text(songTitle, PAGE_WIDTH / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(SUBTITLE_SIZE);
  doc.setTextColor(120, 120, 120);
  doc.setFont("helvetica", "normal");
  doc.text("Guitar Chord Chart", PAGE_WIDTH / 2, y, { align: "center" });
  y += 4;

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
  y += 8;

  // Metadata row
  doc.setFontSize(BODY_SIZE);
  doc.setTextColor(60, 60, 60);
  const metaItems: string[] = [];
  metaItems.push(`Key: ${data.key}`);
  if (data.capo > 0) metaItems.push(`Capo: Fret ${data.capo}`);
  metaItems.push(`Tempo: ${data.tempo} BPM`);
  metaItems.push(`Time: ${data.timeSignature}`);

  // Draw metadata as a row of rounded boxes
  let metaX = MARGIN_LEFT;
  doc.setFontSize(SMALL_SIZE);
  for (const item of metaItems) {
    const textWidth = doc.getTextWidth(item);
    const boxWidth = textWidth + 8;
    const boxHeight = 7;

    y = checkPageBreak(doc, y, boxHeight + 4);

    doc.setFillColor(243, 244, 246);
    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(metaX, y - 5, boxWidth, boxHeight, 2, 2, "FD");
    doc.setTextColor(60, 60, 60);
    doc.text(item, metaX + 4, y);
    metaX += boxWidth + 4;

    // Wrap to next line if needed
    if (metaX + 40 > PAGE_WIDTH - MARGIN_RIGHT) {
      metaX = MARGIN_LEFT;
      y += boxHeight + 3;
    }
  }
  y += 12;

  // Chord Diagrams as images (if SVGs provided)
  if (diagramSvgs && diagramSvgs.length > 0) {
    y = checkPageBreak(doc, y, 40);
    doc.setFontSize(HEADING_SIZE);
    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "bold");
    doc.text("Chord Diagrams", MARGIN_LEFT, y);
    y += 6;
    doc.setFont("helvetica", "normal");

    // Render each chord diagram SVG to canvas and add to PDF
    const diagramWidth = 25; // mm per diagram
    const diagramHeight = 35;
    let dx = MARGIN_LEFT;

    for (const svg of diagramSvgs) {
      if (dx + diagramWidth > PAGE_WIDTH - MARGIN_RIGHT) {
        dx = MARGIN_LEFT;
        y += diagramHeight + 4;
      }
      y = checkPageBreak(doc, y, diagramHeight + 4);

      try {
        const canvas = document.createElement("canvas");
        const svgBBox = svg.getBoundingClientRect();
        const w = svgBBox.width || 100;
        const h = svgBBox.height || 140;
        canvas.width = w * 3;
        canvas.height = h * 3;
        const ctx = canvas.getContext("2d")!;
        ctx.scale(3, 3);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);

        const svgClone = svg.cloneNode(true) as SVGElement;
        svgClone.setAttribute("width", String(w));
        svgClone.setAttribute("height", String(h));
        svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        // Force black color for all SVG elements
        svgClone.querySelectorAll("*").forEach((el) => {
          if (el instanceof SVGElement) {
            el.style.color = "#1a1a1a";
          }
        });

        const svgData = new XMLSerializer().serializeToString(svgClone);
        const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
        const imgUrl = URL.createObjectURL(blob);

        // Synchronous rendering via pre-loaded image (we'll handle async below)
        // For now, skip inline SVG rendering and just add text placeholders
        URL.revokeObjectURL(imgUrl);
      } catch {
        // Skip diagram on error
      }

      dx += diagramWidth + 3;
    }
    y += diagramHeight + 6;
  }

  // Sections
  for (const section of data.sections) {
    const sectionHeight = 24 + (section.strummingPattern ? 6 : 0);
    y = checkPageBreak(doc, y, sectionHeight);

    // Section background
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(230, 230, 230);
    doc.roundedRect(MARGIN_LEFT, y - 4, CONTENT_WIDTH, sectionHeight, 2, 2, "FD");

    // Section title
    doc.setFontSize(HEADING_SIZE);
    doc.setTextColor(79, 70, 229); // Indigo
    doc.setFont("helvetica", "bold");
    doc.text(section.section, MARGIN_LEFT + 4, y + 2);

    // BPM on the right
    if (section.bpm) {
      doc.setFontSize(SMALL_SIZE);
      doc.setTextColor(140, 140, 140);
      doc.setFont("helvetica", "normal");
      doc.text(`${section.bpm} BPM`, PAGE_WIDTH - MARGIN_RIGHT - 4, y + 2, { align: "right" });
    }

    y += 10;

    // Chord progression
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.setFont("courier", "bold");
    const chordText = section.chords.join("   \u2192   ");
    // Wrap long chord progressions
    const chordLines = doc.splitTextToSize(chordText, CONTENT_WIDTH - 8);
    for (const line of chordLines) {
      y = checkPageBreak(doc, y, 6);
      doc.text(line, MARGIN_LEFT + 4, y);
      y += 6;
    }

    // Strumming pattern
    if (section.strummingPattern) {
      doc.setFontSize(SMALL_SIZE);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      doc.text(`Strum: ${section.strummingPattern}`, MARGIN_LEFT + 4, y);
      y += 6;
    }

    y += 6;
  }

  // Playing tips
  if (data.notes) {
    y = checkPageBreak(doc, y, 20);
    y += 4;

    doc.setFillColor(245, 245, 250);
    doc.setDrawColor(220, 220, 230);

    doc.setFontSize(BODY_SIZE);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 60, 60);
    const notesLines = doc.splitTextToSize(data.notes, CONTENT_WIDTH - 12);
    const notesHeight = notesLines.length * 5 + 14;

    y = checkPageBreak(doc, y, notesHeight);
    doc.roundedRect(MARGIN_LEFT, y - 4, CONTENT_WIDTH, notesHeight, 2, 2, "FD");

    doc.text("Playing Tips", MARGIN_LEFT + 4, y + 2);
    y += 8;

    doc.setFontSize(SMALL_SIZE);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    for (const line of notesLines) {
      y = checkPageBreak(doc, y, 5);
      doc.text(line, MARGIN_LEFT + 6, y);
      y += 5;
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
  let y = MARGIN_TOP;
  doc.setFontSize(TITLE_SIZE);
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "bold");
  doc.text(songTitle, PAGE_WIDTH / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(SUBTITLE_SIZE);
  doc.setTextColor(120, 120, 120);
  doc.setFont("helvetica", "normal");
  doc.text("Lyrics", PAGE_WIDTH / 2, y, { align: "center" });
  y += 4;

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
      let metaX = MARGIN_LEFT;
      for (const item of metaItems) {
        const textWidth = doc.getTextWidth(item);
        const boxWidth = textWidth + 8;
        const boxHeight = 7;

        if (metaX + boxWidth > PAGE_WIDTH - MARGIN_RIGHT) {
          metaX = MARGIN_LEFT;
          y += boxHeight + 3;
        }

        doc.setFillColor(243, 244, 246);
        doc.setDrawColor(220, 220, 220);
        doc.roundedRect(metaX, y - 5, boxWidth, boxHeight, 2, 2, "FD");
        doc.setTextColor(60, 60, 60);
        doc.text(item, metaX + 4, y);
        metaX += boxWidth + 4;
      }
      y += 10;
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
      y = checkPageBreak(doc, y, lineHeight * 2 + 4);
      y += 4; // Extra space before section header
      doc.setFontSize(HEADING_SIZE);
      doc.setTextColor(79, 70, 229); // Indigo
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
