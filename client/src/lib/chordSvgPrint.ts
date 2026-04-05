import { CHORD_DB, normalizeChord } from "@/components/GuitarChordChart";

/**
 * Generate an SVG string for a single chord diagram (for print layout).
 * Mirrors the ChordDiagram component but outputs raw SVG markup.
 */
function chordDiagramSvg(name: string): string {
  const normalized = normalizeChord(name);
  const fingering = CHORD_DB[normalized];

  if (!fingering) {
    // Unknown chord placeholder
    return `
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
        <span style="font-size:12px;font-weight:bold;">${name}</span>
        <div style="width:80px;height:100px;display:flex;align-items:center;justify-content:center;border:1px dashed #999;border-radius:4px;font-size:11px;color:#999;">
          No diagram
        </div>
      </div>
    `;
  }

  const width = 80;
  const height = 100;
  const padding = { top: 22, left: 16, right: 10, bottom: 8 };
  const numFrets = 4;
  const numStrings = 6;
  const fretWidth = (width - padding.left - padding.right) / (numStrings - 1);
  const fretHeight = (height - padding.top - padding.bottom) / numFrets;

  const stringX = (s: number) => padding.left + s * fretWidth;
  const fretY = (f: number) => padding.top + f * fretHeight;

  let svgContent = "";

  // Nut or fret position indicator
  if (fingering.startFret === 1) {
    svgContent += `<line x1="${stringX(0)}" y1="${padding.top}" x2="${stringX(5)}" y2="${padding.top}" stroke="#000" stroke-width="3"/>`;
  } else {
    svgContent += `<text x="${padding.left - 12}" y="${fretY(0.5) + 4}" font-size="9" fill="#000" text-anchor="middle">${fingering.startFret}</text>`;
  }

  // Fret lines
  for (let i = 0; i <= numFrets; i++) {
    svgContent += `<line x1="${stringX(0)}" y1="${fretY(i)}" x2="${stringX(5)}" y2="${fretY(i)}" stroke="#000" stroke-width="0.5" opacity="0.4"/>`;
  }

  // String lines
  for (let i = 0; i < numStrings; i++) {
    svgContent += `<line x1="${stringX(i)}" y1="${padding.top}" x2="${stringX(i)}" y2="${fretY(numFrets)}" stroke="#000" stroke-width="0.5" opacity="0.4"/>`;
  }

  // Finger positions, mutes, and opens
  fingering.frets.forEach((fret, stringIdx) => {
    const x = stringX(stringIdx);

    if (fret === -1) {
      // Muted string: X above nut
      svgContent += `<text x="${x}" y="${padding.top - 6}" font-size="10" fill="#000" text-anchor="middle" font-weight="bold">×</text>`;
    } else if (fret === 0) {
      // Open string: O above nut
      svgContent += `<circle cx="${x}" cy="${padding.top - 8}" r="4" fill="none" stroke="#000" stroke-width="1"/>`;
    } else {
      // Fretted note: filled circle
      const relativeFret = fret - fingering.startFret + 1;
      if (relativeFret >= 1 && relativeFret <= numFrets) {
        svgContent += `<circle cx="${x}" cy="${fretY(relativeFret) - fretHeight / 2}" r="5" fill="#000"/>`;
      }
    }
  });

  return `
    <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
      <span style="font-size:12px;font-weight:bold;">${name}</span>
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        ${svgContent}
      </svg>
    </div>
  `;
}

/**
 * Generate the full chord diagrams HTML section for the print layout.
 */
export function generateChordDiagramsHtml(chords: string[]): string {
  if (chords.length === 0) return "";

  const diagramsHtml = chords.map((chord) => chordDiagramSvg(chord)).join("\n");

  return `
    <div class="chord-section">
      <div class="chord-section-title">
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#000" stroke-width="2" style="vertical-align:middle;margin-right:6px;">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
        </svg>
        Guitar Chord Diagrams
      </div>
      <div class="chord-grid">
        ${diagramsHtml}
      </div>
    </div>
  `;
}
