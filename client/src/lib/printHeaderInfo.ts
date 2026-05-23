/**
 * Shared utility for generating chord summary and capo info
 * for print headers across all print functions.
 */

import { getBestCapoPositions, getCapoLabel } from "@/lib/capoChart";

export interface PrintHeaderInfo {
  /** Formatted capo label, e.g. "Capo 2nd Fret (play in E)" or empty string */
  capoLabel: string;
  /** Formatted chord summary, e.g. "Chords: C  Am  F  G" or empty string */
  chordSummary: string;
}

/**
 * Calculate the best capo position and format chord summary for print headers.
 */
export function getPrintHeaderInfo(
  songKey: string | null | undefined,
  chords: string[]
): PrintHeaderInfo {
  let capoLabel = "";
  let chordSummary = "";

  // Calculate best capo position
  if (songKey && chords.length > 0) {
    const bestCapos = getBestCapoPositions(songKey, chords, 1);
    if (bestCapos.length > 0 && bestCapos[0].fret > 0) {
      const capo = bestCapos[0];
      capoLabel = `${getCapoLabel(capo.fret)} (play in ${capo.playKey})`;
    }
  }

  // Generate chord summary — unique chords in order of appearance
  if (chords.length > 0) {
    chordSummary = chords.join("  ");
  }

  return { capoLabel, chordSummary };
}

/**
 * Generate the HTML for the meta line containing key, capo, and chord summary.
 * Used in print headers.
 */
export function generatePrintMetaHtml(
  keyLabel: string,
  capoLabel: string,
  chordSummary: string
): string {
  const parts: string[] = [];
  if (keyLabel) parts.push(keyLabel);
  if (capoLabel) parts.push(capoLabel);

  const metaLine = parts.length > 0
    ? `<div class="print-meta-line">${parts.join(" &middot; ")}</div>`
    : "";

  const chordLine = chordSummary
    ? `<div class="print-chord-summary">Chords: ${chordSummary}</div>`
    : "";

  return metaLine + chordLine;
}
