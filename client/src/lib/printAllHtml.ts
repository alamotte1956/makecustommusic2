/**
 * Generate a combined print-friendly HTML page containing all three sheet music formats:
 * 1. Full Notation (SVG) with guitar chord diagrams
 * 2. Lead Sheet (lyrics with chord symbols)
 * 3. Nashville Number System chart
 *
 * Each section has a clear divider and page-break-before for clean printing.
 */

import type { LeadSheet } from "./leadSheetExtractor";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface PrintAllOptions {
  /** The SVG element from the rendered sheet music */
  svgElement: SVGElement;
  /** Parsed lead sheet data */
  leadSheet: LeadSheet;
  /** Song title */
  songTitle: string;
  /** Key label (e.g. "Key: G") */
  keyLabel: string;
  /** List of chord names used in the song */
  chords: string[];
  /** Function to convert a chord line to Nashville numbers */
  convertChordLine: (chordLine: string, key: string) => string;
  /** Function to generate chord diagram HTML */
  generateChordDiagramsHtml: (chords: string[]) => string;
}

/**
 * Split the full notation SVG into individual staff systems for clean page breaks.
 */
function splitSvgIntoStaffSystems(svgElement: SVGElement): string {
  const svgClone = svgElement.cloneNode(true) as SVGElement;
  const staffGroups = svgClone.querySelectorAll(".abcjs-staff-group");
  let staffSystemsHtml = "";

  if (staffGroups.length > 1) {
    const svgNS = "http://www.w3.org/2000/svg";
    const originalViewBox = svgElement.getAttribute("viewBox");
    const vbParts = originalViewBox?.split(/\s+/).map(Number) || [0, 0, 800, 600];
    const fullWidth = vbParts[2] || 800;

    staffGroups.forEach((group) => {
      const bbox = (group as SVGGraphicsElement).getBBox?.();
      if (!bbox || bbox.height === 0) return;

      const pad = 5;
      const y = Math.max(0, bbox.y - pad);
      const h = bbox.height + pad * 2;

      const miniSvg = document.createElementNS(svgNS, "svg");
      miniSvg.setAttribute("viewBox", `0 ${y} ${fullWidth} ${h}`);
      miniSvg.setAttribute("width", "100%");
      miniSvg.setAttribute("preserveAspectRatio", "xMinYMin meet");
      miniSvg.style.display = "block";
      miniSvg.style.maxWidth = "100%";
      miniSvg.style.height = "auto";

      const defs = svgClone.querySelector("defs");
      if (defs) miniSvg.appendChild(defs.cloneNode(true));
      svgClone.querySelectorAll("style").forEach((s) => miniSvg.appendChild(s.cloneNode(true)));

      miniSvg.appendChild(group.cloneNode(true));
      staffSystemsHtml += `<div class="staff-system">${miniSvg.outerHTML}</div>`;
    });
  }

  if (!staffSystemsHtml) {
    svgClone.removeAttribute("viewBox");
    svgClone.setAttribute("width", "100%");
    svgClone.style.maxWidth = "100%";
    svgClone.style.height = "auto";
    staffSystemsHtml = svgClone.outerHTML;
  }

  return staffSystemsHtml;
}

/**
 * Build the lead sheet sections HTML (chord symbols above lyrics).
 */
function buildLeadSheetSectionsHtml(leadSheet: LeadSheet): string {
  let html = "";
  for (const section of leadSheet.sections) {
    let sectionContent = "";
    if (section.label) {
      sectionContent += `<div class="section-label">${escapeHtml(section.label)}</div>`;
    }
    for (const line of section.lines) {
      sectionContent += `<div class="lead-line">`;
      if (line.chords) {
        sectionContent += `<pre class="chord-line lead-chord">${escapeHtml(line.chords)}</pre>`;
      }
      if (line.lyrics) {
        sectionContent += `<pre class="lyrics-line">${escapeHtml(line.lyrics)}</pre>`;
      }
      sectionContent += `</div>`;
    }
    html += `<div class="section">${sectionContent}</div>`;
  }
  return html;
}

/**
 * Build the Nashville Number System sections HTML.
 */
function buildNashvilleSectionsHtml(
  leadSheet: LeadSheet,
  convertChordLine: (chordLine: string, key: string) => string
): string {
  const songKey = leadSheet.key || "C";
  let html = "";
  for (const section of leadSheet.sections) {
    let sectionContent = "";
    if (section.label) {
      sectionContent += `<div class="section-label">${escapeHtml(section.label)}</div>`;
    }
    for (const line of section.lines) {
      sectionContent += `<div class="lead-line">`;
      if (line.chords) {
        const nashvilleChords = convertChordLine(line.chords, songKey);
        sectionContent += `<pre class="chord-line nashville-chord">${escapeHtml(nashvilleChords)}</pre>`;
      }
      if (line.lyrics) {
        sectionContent += `<pre class="lyrics-line">${escapeHtml(line.lyrics)}</pre>`;
      }
      sectionContent += `</div>`;
    }
    html += `<div class="section">${sectionContent}</div>`;
  }
  return html;
}

/**
 * Generate the complete Print All HTML document.
 */
export function generatePrintAllHtml(options: PrintAllOptions): string {
  const {
    svgElement,
    leadSheet,
    songTitle,
    keyLabel,
    chords,
    convertChordLine,
    generateChordDiagramsHtml,
  } = options;

  const currentYear = new Date().getFullYear();
  const displayTitle = leadSheet.title || songTitle;
  const displayKey = keyLabel || (leadSheet.key ? `Key: ${leadSheet.key}` : "");
  const displayMeter = leadSheet.meter ? `Time: ${leadSheet.meter}` : "";

  const staffSystemsHtml = splitSvgIntoStaffSystems(svgElement);
  const chordDiagramsHtml = generateChordDiagramsHtml(chords);
  const leadSheetSectionsHtml = buildLeadSheetSectionsHtml(leadSheet);
  const nashvilleSectionsHtml = buildNashvilleSectionsHtml(leadSheet, convertChordLine);

  return `<!DOCTYPE html>
<html>
<head>
  <title>${escapeHtml(displayTitle)} - Complete Sheet Music</title>
  <style>
    @page {
      size: letter portrait;
      margin: 0.75in;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ── Print toolbar ────────────────────────────────── */
    .print-btn-bar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #f0f0f0;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      z-index: 100;
    }
    .print-btn-bar button {
      padding: 8px 24px;
      font-size: 14px;
      font-weight: 600;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }
    .print-btn {
      background: #2563eb;
      color: #fff;
    }
    .print-btn:hover { background: #1d4ed8; }
    .close-btn {
      background: #e5e7eb;
      color: #374151;
    }
    .close-btn:hover { background: #d1d5db; }
    .print-body {
      margin-top: 64px;
    }

    /* ── Section dividers ─────────────────────────────── */
    .format-divider {
      page-break-before: always;
      break-before: page;
      padding: 20px 0 16px;
      margin-bottom: 16px;
      border-bottom: 3px solid #333;
      text-align: center;
    }
    .format-divider:first-of-type {
      page-break-before: avoid;
      break-before: avoid;
    }
    .format-divider-number {
      display: inline-block;
      width: 32px;
      height: 32px;
      line-height: 32px;
      border-radius: 50%;
      background: #333;
      color: #fff;
      font-size: 16px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 8px;
    }
    .format-divider-title {
      font-size: 22px;
      font-weight: bold;
      letter-spacing: 0.5px;
      margin-top: 4px;
    }
    .format-divider-desc {
      font-size: 12px;
      color: #777;
      margin-top: 4px;
    }

    /* ── Shared header ────────────────────────────────── */
    .print-header {
      text-align: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 2px solid #333;
    }
    .print-header.section-header {
      display: none;
    }
    .print-title {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 6px;
      letter-spacing: 0.5px;
    }
    .print-subtitle {
      font-size: 12px;
      color: #888;
      font-style: italic;
      margin-bottom: 4px;
    }
    .print-meta {
      font-size: 14px;
      color: #555;
      display: flex;
      justify-content: center;
      gap: 24px;
      margin-top: 4px;
    }

    /* ── Full notation ────────────────────────────────── */
    .print-content {
      width: 100%;
    }
    .print-content svg {
      width: 100%;
      height: auto;
      display: block;
    }
    .staff-system {
      page-break-inside: avoid;
      break-inside: avoid;
      margin-bottom: 2px;
    }
    .staff-system svg {
      width: 100%;
      height: auto;
      display: block;
    }

    /* ── Chord diagrams ───────────────────────────────── */
    .chord-section {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #ddd;
    }
    .chord-section-title {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
    }
    .chord-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      justify-content: flex-start;
    }

    /* ── Lead sheet & Nashville ────────────────────────── */
    .section {
      margin-bottom: 16px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .section-label {
      font-size: 14px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #444;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid #ddd;
    }
    .lead-line {
      margin-bottom: 2px;
    }
    .chord-line {
      font-family: 'Courier New', 'Consolas', monospace;
      font-size: 13px;
      font-weight: bold;
      line-height: 1.4;
      margin: 0;
      white-space: pre;
    }
    .lead-chord {
      color: #1a56db;
    }
    .nashville-chord {
      color: #9333ea;
    }
    .lyrics-line {
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 15px;
      line-height: 1.5;
      margin: 0 0 8px 0;
      white-space: pre-wrap;
    }

    /* ── Nashville legend ─────────────────────────────── */
    .nns-legend {
      margin-top: 16px;
      padding: 12px 16px;
      background: #f9f9f9;
      border: 1px solid #e5e5e5;
      border-radius: 4px;
      font-size: 11px;
      color: #666;
    }
    .nns-legend strong {
      color: #333;
    }

    /* ── Footer ───────────────────────────────────────── */
    .print-footer {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid #ccc;
      text-align: center;
      font-size: 11px;
      color: #888;
    }

    /* ── Print overrides ──────────────────────────────── */
    @media print {
      body { margin: 0; }
      .no-print { display: none !important; }
      .print-body { margin-top: 0; }
      .print-header { page-break-after: avoid; }
      .print-content { page-break-inside: auto; }
      .print-content svg { page-break-inside: avoid; }
      .chord-section { page-break-before: auto; page-break-inside: avoid; }
      .chord-grid { page-break-inside: avoid; }
      .print-footer { page-break-before: avoid; page-break-inside: avoid; }
      .nns-legend { background: #f9f9f9; }
    }
  </style>
</head>
<body>
  <div class="print-btn-bar no-print">
    <span style="font-size:14px;color:#555;">Complete Sheet Music Preview</span>
    <div style="display:flex;gap:8px;">
      <button class="close-btn" onclick="window.close()">Close</button>
      <button class="print-btn" onclick="window.print()">Print All</button>
    </div>
  </div>
  <div class="print-body">

    <!-- ═══ SECTION 1: Full Notation ═══ -->
    <div class="format-divider" style="page-break-before:avoid;break-before:avoid;">
      <div class="format-divider-number">1</div>
      <div class="format-divider-title">Full Notation</div>
      <div class="format-divider-desc">Complete musical score with melody, rhythm, and chord symbols</div>
    </div>

    <!-- Title is already in the SVG, show only key and meter -->
    <div class="print-header" style="margin-top: 8px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: none;">
      <div class="print-meta">
        ${displayKey ? `<span>${escapeHtml(displayKey)}</span>` : ""}
        ${displayMeter ? `<span>${escapeHtml(displayMeter)}</span>` : ""}
      </div>
    </div>
    <div class="print-content">
      ${staffSystemsHtml}
    </div>
    ${chordDiagramsHtml}

    <!-- ═══ SECTION 2: Lead Sheet ═══ -->
    <div class="format-divider">
      <div class="format-divider-number">2</div>
      <div class="format-divider-title">Lead Sheet</div>
      <div class="format-divider-desc">Lyrics with chord symbols for vocalists and instrumentalists</div>
    </div>

    ${leadSheetSectionsHtml}

    <!-- ═══ SECTION 3: Nashville Number Chart ═══ -->
    <div class="format-divider">
      <div class="format-divider-number">3</div>
      <div class="format-divider-title">Nashville Number Chart</div>
      <div class="format-divider-desc">Number-based chord notation for easy transposition</div>
    </div>

    ${nashvilleSectionsHtml}
    <div class="nns-legend">
      <strong>Nashville Number System:</strong>
      1 = Root &middot; 2 = 2nd &middot; 3 = 3rd &middot; 4 = 4th &middot; 5 = 5th &middot; 6 = 6th &middot; 7 = 7th
      &nbsp;|&nbsp; m = minor &middot; b = flat &middot; # = sharp &middot; / = bass note
    </div>

    <!-- ═══ Footer ═══ -->
    <div class="print-footer">
      &copy; ${currentYear} Albert LaMotte &middot; Generated by Create Christian Music
    </div>
  </div>
</body>
</html>`;
}
