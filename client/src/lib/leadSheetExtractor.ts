/**
 * Extract lyrics with chord positions from ABC notation
 * for generating worship team lead sheets.
 *
 * ABC format reference:
 * - Chords: "Cm" or [Am] inline with notes
 * - Lyrics: w: lines below music lines
 * - Sections: [V:1], [V:2], etc. or %% markers
 */

export interface LeadSheetLine {
  chords: string;   // chord symbols spaced above lyrics
  lyrics: string;   // the lyrics text
}

export interface LeadSheetSection {
  label: string;           // e.g. "Verse 1", "Chorus", "Bridge"
  lines: LeadSheetLine[];
}

export interface LeadSheet {
  title: string;
  key: string;
  meter: string;
  sections: LeadSheetSection[];
}

/**
 * Parse ABC notation and extract a lead sheet with chords above lyrics.
 */
export function extractLeadSheet(abc: string): LeadSheet {
  const lines = abc.split("\n");

  let title = "";
  let key = "";
  let meter = "";

  // Collect music lines and their associated lyrics
  const musicBlocks: { musicLine: string; lyricsLine: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Parse header fields
    if (line.startsWith("T:")) {
      title = line.slice(2).trim();
      continue;
    }
    if (line.startsWith("K:")) {
      key = line.slice(2).trim();
      continue;
    }
    if (line.startsWith("M:")) {
      meter = line.slice(2).trim();
      continue;
    }

    // Skip other header fields and comments
    if (/^[A-Z]:/.test(line) || line.startsWith("%") || line === "") continue;

    // This is a music line - check if the next line is a lyrics line
    const isMusic = /[a-gA-G]/.test(line) || line.includes('"') || line.includes('|');
    if (!isMusic) continue;

    let lyricsLine = "";
    if (i + 1 < lines.length && lines[i + 1].trim().startsWith("w:")) {
      lyricsLine = lines[i + 1].trim().slice(2).trim();
      i++; // skip the lyrics line
    }

    musicBlocks.push({ musicLine: line, lyricsLine });
  }

  // Process each music+lyrics block into lead sheet lines
  const sections: LeadSheetSection[] = [];
  let currentSection: LeadSheetSection = { label: "", lines: [] };

  for (const block of musicBlocks) {
    const { musicLine, lyricsLine } = block;

    // Check for section markers in the music line
    const sectionMatch = musicLine.match(/%%\s*(Verse\s*\d*|Chorus|Bridge|Pre-?Chorus|Outro|Intro|Tag|Coda|Interlude)/i);
    if (sectionMatch) {
      if (currentSection.lines.length > 0) {
        sections.push(currentSection);
      }
      currentSection = { label: sectionMatch[1], lines: [] };
      continue;
    }

    // Extract chords from the music line (quoted chords like "Am" or "G/B")
    const chordPositions: { chord: string; position: number }[] = [];
    const chordRegex = /"([^"]+)"/g;
    let match;

    // Build a version of the music line without chords to estimate positions
    let musicWithoutChords = musicLine;
    const chordMatches: { chord: string; startIdx: number; endIdx: number }[] = [];

    while ((match = chordRegex.exec(musicLine)) !== null) {
      chordMatches.push({
        chord: match[1],
        startIdx: match.index,
        endIdx: match.index + match[0].length,
      });
    }

    // If no lyrics, skip unless there are chords (instrumental section)
    if (!lyricsLine && chordMatches.length === 0) continue;

    // Parse lyrics: split by hyphens and spaces
    // ABC lyrics use: - for syllable break, | for bar line, _ for hold
    const lyricsText = lyricsLine
      .replace(/\|/g, " ")
      .replace(/_/g, "")
      .replace(/\*/g, "")
      .replace(/\s+/g, " ")
      .trim();

    // Map chord positions to lyrics positions
    // Strategy: count notes in the music line before each chord to estimate
    // which syllable/word the chord falls on
    if (chordMatches.length > 0 && lyricsText) {
      // Split lyrics into syllables (split on - and space)
      const syllables = lyricsLine
        .replace(/\|/g, " ")
        .replace(/_/g, " ")
        .replace(/\*/g, "")
        .split(/[\s-]+/)
        .filter(Boolean);

      // Count notes before each chord to map to syllable index
      let noteCount = 0;
      let chordIdx = 0;
      let inChord = false;

      for (let ci = 0; ci < musicLine.length && chordIdx < chordMatches.length; ci++) {
        const ch = musicLine[ci];

        if (ch === '"') {
          if (!inChord) {
            // Chord starts here - map to current note count
            chordPositions.push({
              chord: chordMatches[chordIdx].chord,
              position: noteCount,
            });
            chordIdx++;
          }
          inChord = !inChord;
          continue;
        }

        if (inChord) continue;

        // Count notes (letters a-g, A-G, and z for rest)
        if (/[a-gA-Gz]/.test(ch)) {
          noteCount++;
        }
      }

      // Build the chord line and lyrics line with alignment
      const leadLine = buildAlignedLine(syllables, chordPositions);
      currentSection.lines.push(leadLine);
    } else if (lyricsText) {
      // Lyrics without chords
      currentSection.lines.push({ chords: "", lyrics: lyricsText });
    } else if (chordMatches.length > 0) {
      // Chords without lyrics (instrumental)
      const chordsStr = chordMatches.map((c) => c.chord).join("  ");
      currentSection.lines.push({ chords: chordsStr, lyrics: "(instrumental)" });
    }
  }

  // Push the last section
  if (currentSection.lines.length > 0) {
    sections.push(currentSection);
  }

  // If no sections were created with labels, create a default one
  if (sections.length === 0 && musicBlocks.length > 0) {
    // Try a simpler approach: just extract all chords and lyrics
    const simpleSections = extractSimpleLeadSheet(abc);
    return { title, key, meter, sections: simpleSections };
  }

  return { title, key, meter, sections };
}

/**
 * Build a chord line and lyrics line with proper alignment.
 */
function buildAlignedLine(
  syllables: string[],
  chordPositions: { chord: string; position: number }[]
): LeadSheetLine {
  if (syllables.length === 0) {
    const chordsStr = chordPositions.map((c) => c.chord).join("  ");
    return { chords: chordsStr, lyrics: "" };
  }

  // Build lyrics string by joining syllables
  const lyricsStr = syllables.join(" ");

  // Build chord string aligned above lyrics
  // Map each chord position (note index) to character position in lyrics
  let chordLine = "";
  let lastChordEnd = 0;

  // Calculate character position for each syllable
  const syllablePositions: number[] = [];
  let charPos = 0;
  for (const syl of syllables) {
    syllablePositions.push(charPos);
    charPos += syl.length + 1; // +1 for space
  }

  for (const cp of chordPositions) {
    const sylIdx = Math.min(cp.position, syllablePositions.length - 1);
    const targetPos = sylIdx >= 0 ? syllablePositions[sylIdx] || 0 : 0;
    const padding = Math.max(0, targetPos - lastChordEnd);
    chordLine += " ".repeat(padding) + cp.chord;
    lastChordEnd = chordLine.length + 1;
  }

  return { chords: chordLine, lyrics: lyricsStr };
}

/**
 * Simple fallback: extract chords and lyrics without position mapping.
 */
function extractSimpleLeadSheet(abc: string): LeadSheetSection[] {
  const lines = abc.split("\n");
  const resultLines: LeadSheetLine[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip headers and comments
    if (/^[A-Z]:/.test(line) || line.startsWith("%") || line === "") continue;

    // Extract chords from this music line
    const chords: string[] = [];
    const chordRegex = /"([^"]+)"/g;
    let match;
    while ((match = chordRegex.exec(line)) !== null) {
      chords.push(match[1]);
    }

    // Check for lyrics on next line
    let lyrics = "";
    if (i + 1 < lines.length && lines[i + 1].trim().startsWith("w:")) {
      lyrics = lines[i + 1].trim().slice(2).trim()
        .replace(/\|/g, " ")
        .replace(/_/g, "")
        .replace(/\*/g, "")
        .replace(/-/g, "")
        .replace(/\s+/g, " ")
        .trim();
      i++;
    }

    if (chords.length > 0 || lyrics) {
      resultLines.push({
        chords: chords.join("  "),
        lyrics: lyrics || "(instrumental)",
      });
    }
  }

  return [{ label: "", lines: resultLines }];
}

/**
 * Generate HTML for a lead sheet print layout.
 */
export function generateLeadSheetHtml(
  leadSheet: LeadSheet,
  songTitle: string,
  keyLabel: string,
  margins?: { top: number; right: number; bottom: number; left: number }
): string {
  const currentYear = new Date().getFullYear();
  const displayTitle = leadSheet.title || songTitle;
  const displayKey = keyLabel || (leadSheet.key ? `Key: ${leadSheet.key}` : "");
  const displayMeter = leadSheet.meter ? `Time: ${leadSheet.meter}` : "";

  let sectionsHtml = "";

  for (const section of leadSheet.sections) {
    let sectionContent = "";

    if (section.label) {
      sectionContent += `<div class="section-label">${section.label}</div>`;
    }

    for (const line of section.lines) {
      sectionContent += `<div class="lead-line">`;
      if (line.chords) {
        sectionContent += `<pre class="chord-line">${escapeHtml(line.chords)}</pre>`;
      }
      if (line.lyrics) {
        sectionContent += `<pre class="lyrics-line">${escapeHtml(line.lyrics)}</pre>`;
      }
      sectionContent += `</div>`;
    }

    sectionsHtml += `<div class="section">${sectionContent}</div>`;
  }

  const marginStr = margins 
    ? `${margins.top}in ${margins.right}in ${margins.bottom}in ${margins.left}in`
    : '0.75in';

  return `<!DOCTYPE html>
<html>
<head>
  <title>${escapeHtml(displayTitle)} - Lead Sheet</title>
  <style>
    @page {
      size: letter portrait;
      margin: ${marginStr};
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
    .lead-sheet-header {
      text-align: center;
      margin-bottom: 28px;
      padding-bottom: 16px;
      border-bottom: 2px solid #333;
    }
    .lead-sheet-title {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 6px;
      letter-spacing: 0.5px;
    }
    .lead-sheet-subtitle {
      font-size: 12px;
      color: #888;
      font-style: italic;
      margin-bottom: 4px;
    }
    .lead-sheet-meta {
      font-size: 14px;
      color: #555;
      display: flex;
      justify-content: center;
      gap: 24px;
      margin-top: 4px;
    }
    .section {
      margin-bottom: 24px;
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
      margin-bottom: 4px;
    }
    .chord-line {
      font-family: 'Courier New', 'Consolas', monospace;
      font-size: 13px;
      font-weight: bold;
      color: #1a56db;
      line-height: 1.4;
      margin: 0;
      white-space: pre;
    }
    .lyrics-line {
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 15px;
      line-height: 1.5;
      margin: 0 0 8px 0;
      white-space: pre-wrap;
    }
    .lead-sheet-footer {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid #ccc;
      text-align: center;
      font-size: 11px;
      color: #888;
    }
    @media print {
      body { margin: 0; }
      .no-print { display: none !important; }
    }
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
      padding: 0 20px;
    }
  </style>
</head>
<body>
  <div class="print-btn-bar no-print">
    <span style="font-size:14px;color:#555;">Lead Sheet Preview</span>
    <div style="display:flex;gap:8px;">
      <button class="close-btn" onclick="window.close()">Close</button>
      <button class="print-btn" onclick="window.print()">Print</button>
    </div>
  </div>
  <div class="print-body">
    <div class="lead-sheet-header">
      <div class="lead-sheet-title">${escapeHtml(displayTitle)}</div>
      <div class="lead-sheet-subtitle">Lead Sheet</div>
      <div class="lead-sheet-meta">
        ${displayKey ? `<span>${escapeHtml(displayKey)}</span>` : ""}
        ${displayMeter ? `<span>${escapeHtml(displayMeter)}</span>` : ""}
      </div>
    </div>
    ${sectionsHtml}
    <div class="lead-sheet-footer">
      &copy; ${currentYear} Albert LaMotte &middot; Generated by Create Christian Music
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate HTML for a Nashville Number System lead sheet.
 */
export function generateNashvilleLeadSheetHtml(
  leadSheet: LeadSheet,
  songTitle: string,
  keyLabel: string,
  convertChordLine: (chordLine: string, key: string) => string,
  margins?: { top: number; right: number; bottom: number; left: number }
): string {
  const currentYear = new Date().getFullYear();
  const displayTitle = leadSheet.title || songTitle;
  const displayKey = keyLabel || (leadSheet.key ? `Key: ${leadSheet.key}` : "");
  const displayMeter = leadSheet.meter ? `Time: ${leadSheet.meter}` : "";
  const songKey = leadSheet.key || "C";

  let sectionsHtml = "";

  for (const section of leadSheet.sections) {
    let sectionContent = "";

    if (section.label) {
      sectionContent += `<div class="section-label">${escapeHtml(section.label)}</div>`;
    }

    for (const line of section.lines) {
      sectionContent += `<div class="lead-line">`;
      if (line.chords) {
        const nashvilleChords = convertChordLine(line.chords, songKey);
        sectionContent += `<pre class="chord-line">${escapeHtml(nashvilleChords)}</pre>`;
      }
      if (line.lyrics) {
        sectionContent += `<pre class="lyrics-line">${escapeHtml(line.lyrics)}</pre>`;
      }
      sectionContent += `</div>`;
    }

    sectionsHtml += `<div class="section">${sectionContent}</div>`;
  }

  const marginStr = margins 
    ? `${margins.top}in ${margins.right}in ${margins.bottom}in ${margins.left}in`
    : '0.75in';

  return `<!DOCTYPE html>
<html>
<head>
  <title>${escapeHtml(displayTitle)} - Nashville Number Chart</title>
  <style>
    @page {
      size: letter portrait;
      margin: ${marginStr};
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
    .lead-sheet-header {
      text-align: center;
      margin-bottom: 28px;
      padding-bottom: 16px;
      border-bottom: 2px solid #333;
    }
    .lead-sheet-title {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 6px;
      letter-spacing: 0.5px;
    }
    .lead-sheet-subtitle {
      font-size: 12px;
      color: #888;
      font-style: italic;
      margin-bottom: 4px;
    }
    .lead-sheet-meta {
      font-size: 14px;
      color: #555;
      display: flex;
      justify-content: center;
      gap: 24px;
      margin-top: 4px;
    }
    .section {
      margin-bottom: 24px;
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
      margin-bottom: 4px;
    }
    .chord-line {
      font-family: 'Courier New', 'Consolas', monospace;
      font-size: 14px;
      font-weight: bold;
      color: #9333ea;
      line-height: 1.4;
      margin: 0;
      white-space: pre;
    }
    .lyrics-line {
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 15px;
      line-height: 1.5;
      margin: 0 0 8px 0;
      white-space: pre-wrap;
    }
    .lead-sheet-footer {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid #ccc;
      text-align: center;
      font-size: 11px;
      color: #888;
    }
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
    @media print {
      body { margin: 0; }
      .no-print { display: none !important; }
      .nns-legend { background: #f9f9f9; }
    }
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
      background: #9333ea;
      color: #fff;
    }
    .print-btn:hover { background: #7e22ce; }
    .close-btn {
      background: #e5e7eb;
      color: #374151;
    }
    .close-btn:hover { background: #d1d5db; }
    .print-body {
      margin-top: 64px;
      padding: 0 20px;
    }
  </style>
</head>
<body>
  <div class="print-btn-bar no-print">
    <span style="font-size:14px;color:#555;">Nashville Number Chart Preview</span>
    <div style="display:flex;gap:8px;">
      <button class="close-btn" onclick="window.close()">Close</button>
      <button class="print-btn" onclick="window.print()">Print</button>
    </div>
  </div>
  <div class="print-body">
    <div class="lead-sheet-header">
      <div class="lead-sheet-title">${escapeHtml(displayTitle)}</div>
      <div class="lead-sheet-subtitle">Nashville Number Chart</div>
      <div class="lead-sheet-meta">
        ${displayKey ? `<span>${escapeHtml(displayKey)}</span>` : ""}
        ${displayMeter ? `<span>${escapeHtml(displayMeter)}</span>` : ""}
      </div>
    </div>
    ${sectionsHtml}
    <div class="nns-legend">
      <strong>Nashville Number System:</strong>
      1 = Root &middot; 2 = 2nd &middot; 3 = 3rd &middot; 4 = 4th &middot; 5 = 5th &middot; 6 = 6th &middot; 7 = 7th
      &nbsp;|&nbsp; m = minor &middot; b = flat &middot; # = sharp &middot; / = bass note
    </div>
    <div class="lead-sheet-footer">
      &copy; ${currentYear} Albert LaMotte &middot; Generated by Create Christian Music
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
