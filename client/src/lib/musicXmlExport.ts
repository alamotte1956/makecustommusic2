/**
 * ABC Notation to MusicXML Converter (Browser-compatible)
 * Converts ABC notation to MusicXML 4.0 format without any Node.js dependencies.
 * MusicXML files can be imported into Finale, MuseScore, Sibelius, and other
 * notation software for professional editing and printing.
 */

// ─── ABC Header Parsing ────────────────────────────────────────────────────

interface ABCHeaders {
  referenceNumber: number;
  title: string;
  meter: [number, number];
  unitNoteLength: [number, number];
  key: string;
  tempo: number;
  composer: string;
}

function parseHeaders(abc: string): ABCHeaders {
  const headers: ABCHeaders = {
    referenceNumber: 1,
    title: "Untitled",
    meter: [4, 4],
    unitNoteLength: [1, 8],
    key: "C",
    tempo: 120,
    composer: "",
  };

  for (const line of abc.split("\n")) {
    const t = line.trim();
    if (t.startsWith("X:")) headers.referenceNumber = parseInt(t.slice(2).trim(), 10) || 1;
    else if (t.startsWith("T:")) headers.title = t.slice(2).trim();
    else if (t.startsWith("C:")) headers.composer = t.slice(2).trim();
    else if (t.startsWith("M:")) {
      const m = t.slice(2).trim().match(/(\d+)\/(\d+)/);
      if (m) headers.meter = [parseInt(m[1], 10), parseInt(m[2], 10)];
    } else if (t.startsWith("L:")) {
      const l = t.slice(2).trim().match(/(\d+)\/(\d+)/);
      if (l) headers.unitNoteLength = [parseInt(l[1], 10), parseInt(l[2], 10)];
    } else if (t.startsWith("K:")) {
      headers.key = t.slice(2).trim();
    } else if (t.startsWith("Q:")) {
      const q = t.slice(2).trim().match(/(?:\d+\/\d+=)?(\d+)/);
      if (q) headers.tempo = parseInt(q[1], 10);
    }
  }
  return headers;
}

// ─── ABC Note Parsing ───────────────────────────────────────────────────────

interface ParsedNote {
  type: "note" | "rest" | "barline" | "chord_symbol";
  // For notes
  step?: string;       // C, D, E, F, G, A, B
  octave?: number;     // MusicXML octave (4 = middle C octave)
  alter?: number;      // -1 flat, 0 natural, 1 sharp
  duration?: number;   // in divisions (based on unit note length)
  // For chord symbols
  chordText?: string;
  // For barlines
  barType?: string;
}

const ABC_STEPS: Record<string, { step: string; baseOctave: number }> = {
  C: { step: "C", baseOctave: 4 }, D: { step: "D", baseOctave: 4 },
  E: { step: "E", baseOctave: 4 }, F: { step: "F", baseOctave: 4 },
  G: { step: "G", baseOctave: 4 }, A: { step: "A", baseOctave: 4 },
  B: { step: "B", baseOctave: 4 },
  c: { step: "C", baseOctave: 5 }, d: { step: "D", baseOctave: 5 },
  e: { step: "E", baseOctave: 5 }, f: { step: "F", baseOctave: 5 },
  g: { step: "G", baseOctave: 5 }, a: { step: "A", baseOctave: 5 },
  b: { step: "B", baseOctave: 5 },
};

function parseDurationMultiplier(durStr: string): number {
  if (!durStr) return 1;
  const slashMatch = durStr.match(/^(\d*)\/(\d*)/);
  if (slashMatch) {
    const num = slashMatch[1] ? parseInt(slashMatch[1], 10) : 1;
    const den = slashMatch[2] ? parseInt(slashMatch[2], 10) : 2;
    return num / den;
  }
  const mult = parseInt(durStr, 10);
  return isNaN(mult) ? 1 : mult;
}

function parseABCBody(abc: string): ParsedNote[] {
  const notes: ParsedNote[] = [];
  const lines = abc.split("\n");

  for (const line of lines) {
    const t = line.trim();
    if (/^[A-Za-z]:/.test(t) || !t || t.startsWith("%")) continue;
    if (t.startsWith("w:") || t.startsWith("W:")) continue;

    let i = 0;
    while (i < t.length) {
      const ch = t[i];

      // Bar lines
      if (ch === "|") {
        let bar = "|";
        i++;
        if (i < t.length && t[i] === "|") { bar = "||"; i++; }
        else if (i < t.length && t[i] === ":") { bar = "|:"; i++; }
        else if (i < t.length && t[i] === "]") { bar = "|]"; i++; }
        notes.push({ type: "barline", barType: bar });
        continue;
      }
      if (ch === ":" && i + 1 < t.length && t[i + 1] === "|") {
        notes.push({ type: "barline", barType: ":|" });
        i += 2;
        continue;
      }

      // Chord symbols "Am7"
      if (ch === '"') {
        const end = t.indexOf('"', i + 1);
        if (end > i) {
          notes.push({ type: "chord_symbol", chordText: t.substring(i + 1, end) });
          i = end + 1;
          continue;
        }
        i++;
        continue;
      }

      // Decorations !...!
      if (ch === "!") {
        const end = t.indexOf("!", i + 1);
        i = end > i ? end + 1 : i + 1;
        continue;
      }

      // Section markers [P:...] or [1 [2
      if (ch === "[") {
        const end = t.indexOf("]", i + 1);
        if (end > i) { i = end + 1; continue; }
        i++;
        continue;
      }
      if (ch === "]") { i++; continue; }

      // Rests
      if (ch === "z" || ch === "Z") {
        i++;
        let durStr = "";
        while (i < t.length && /[\d/]/.test(t[i])) { durStr += t[i]; i++; }
        const mult = parseDurationMultiplier(durStr);
        notes.push({ type: "rest", duration: mult });
        continue;
      }

      // Accidentals
      let alter = 0;
      let hasAccidental = false;
      if (ch === "^") { alter = 1; i++; hasAccidental = true; if (i < t.length && t[i] === "^") { alter = 2; i++; } }
      else if (ch === "_") { alter = -1; i++; hasAccidental = true; if (i < t.length && t[i] === "_") { alter = -2; i++; } }
      else if (ch === "=") { alter = 0; i++; hasAccidental = true; }

      // Note letter
      if (i < t.length && /[A-Ga-g]/.test(t[i])) {
        const noteLetter = t[i];
        const info = ABC_STEPS[noteLetter];
        if (!info) { i++; continue; }

        let octave = info.baseOctave;
        i++;

        // Octave modifiers
        while (i < t.length) {
          if (t[i] === "'") { octave++; i++; }
          else if (t[i] === ",") { octave--; i++; }
          else break;
        }

        // Duration
        let durStr = "";
        while (i < t.length && /[\d/]/.test(t[i])) { durStr += t[i]; i++; }
        const mult = parseDurationMultiplier(durStr);

        // Skip ties
        if (i < t.length && t[i] === "-") i++;

        notes.push({
          type: "note",
          step: info.step,
          octave,
          alter: hasAccidental ? alter : 0,
          duration: mult,
        });
        continue;
      }

      // Skip decorations, slurs, spaces, etc.
      i++;
    }
  }

  return notes;
}

// ─── Key Signature Mapping ──────────────────────────────────────────────────

interface KeyInfo {
  fifths: number;
  mode: string;
}

const KEY_MAP: Record<string, KeyInfo> = {
  "Cb": { fifths: -7, mode: "major" }, "Gb": { fifths: -6, mode: "major" },
  "Db": { fifths: -5, mode: "major" }, "Ab": { fifths: -4, mode: "major" },
  "Eb": { fifths: -3, mode: "major" }, "Bb": { fifths: -2, mode: "major" },
  "F":  { fifths: -1, mode: "major" }, "C":  { fifths: 0,  mode: "major" },
  "G":  { fifths: 1,  mode: "major" }, "D":  { fifths: 2,  mode: "major" },
  "A":  { fifths: 3,  mode: "major" }, "E":  { fifths: 4,  mode: "major" },
  "B":  { fifths: 5,  mode: "major" }, "F#": { fifths: 6,  mode: "major" },
  "C#": { fifths: 7,  mode: "major" },
  // Minor keys
  "Abm": { fifths: -7, mode: "minor" }, "Ebm": { fifths: -6, mode: "minor" },
  "Bbm": { fifths: -5, mode: "minor" }, "Fm":  { fifths: -4, mode: "minor" },
  "Cm":  { fifths: -3, mode: "minor" }, "Gm":  { fifths: -2, mode: "minor" },
  "Dm":  { fifths: -1, mode: "minor" }, "Am":  { fifths: 0,  mode: "minor" },
  "Em":  { fifths: 1,  mode: "minor" }, "Bm":  { fifths: 2,  mode: "minor" },
  "F#m": { fifths: 3,  mode: "minor" }, "C#m": { fifths: 4,  mode: "minor" },
  "G#m": { fifths: 5,  mode: "minor" }, "D#m": { fifths: 6,  mode: "minor" },
  "A#m": { fifths: 7,  mode: "minor" },
};

function parseKeySignature(keyStr: string): KeyInfo {
  // Handle modes: "G major", "Am", "D minor", "Dmix", etc.
  const cleaned = keyStr.replace(/\s*(major|maj)\s*/i, "")
    .replace(/\s*(minor|min)\s*/i, "m")
    .replace(/\s*(mix|mixolydian|dor|dorian|phr|phrygian|lyd|lydian|loc|locrian)\s*/i, "")
    .trim();

  if (KEY_MAP[cleaned]) return KEY_MAP[cleaned];

  // Try just the root note
  const root = cleaned.replace(/m$/, "");
  const isMinor = cleaned.endsWith("m");
  const key = isMinor ? root + "m" : root;
  return KEY_MAP[key] || { fifths: 0, mode: "major" };
}

// ─── MusicXML Generation ────────────────────────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Map a duration multiplier to MusicXML note type and dots */
function durationToNoteType(mult: number): { type: string; dots: number } {
  // Common mappings: 1=eighth, 2=quarter, 4=half, 8=whole, etc.
  // These are relative to the unit note length (typically 1/8)
  if (mult <= 0.25) return { type: "32nd", dots: 0 };
  if (mult <= 0.375) return { type: "32nd", dots: 1 };
  if (mult <= 0.5) return { type: "16th", dots: 0 };
  if (mult <= 0.75) return { type: "16th", dots: 1 };
  if (mult <= 1) return { type: "eighth", dots: 0 };
  if (mult <= 1.5) return { type: "eighth", dots: 1 };
  if (mult <= 2) return { type: "quarter", dots: 0 };
  if (mult <= 3) return { type: "quarter", dots: 1 };
  if (mult <= 4) return { type: "half", dots: 0 };
  if (mult <= 6) return { type: "half", dots: 1 };
  if (mult <= 8) return { type: "whole", dots: 0 };
  if (mult <= 12) return { type: "whole", dots: 1 };
  return { type: "whole", dots: 0 };
}

/**
 * Convert ABC notation string to MusicXML 4.0 string.
 */
export function abcToMusicXml(abc: string): string {
  if (!abc || !abc.trim()) {
    throw new Error("Empty ABC notation provided");
  }

  const normalised = ensureAbcHeaders(abc);
  const headers = parseHeaders(normalised);
  const parsedNotes = parseABCBody(normalised);
  const keyInfo = parseKeySignature(headers.key);

  // Divisions: number of divisions per quarter note
  // If unit note length is 1/8, then 1 unit = half a quarter = divisions/2
  const divisions = 8; // 8 divisions per quarter note (allows 32nd notes)
  const unitDivisions = divisions * 4 * (headers.unitNoteLength[0] / headers.unitNoteLength[1]);

  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">');
  lines.push('<score-partwise version="4.0">');

  // Work / movement title
  lines.push(`  <movement-title>${escapeXml(headers.title)}</movement-title>`);

  // Identification
  lines.push("  <identification>");
  if (headers.composer) {
    lines.push(`    <creator type="composer">${escapeXml(headers.composer)}</creator>`);
  }
  lines.push("    <encoding>");
  lines.push("      <software>Create Christian Music - AI Music Generator</software>");
  lines.push(`      <encoding-date>${new Date().toISOString().split("T")[0]}</encoding-date>`);
  lines.push("    </encoding>");
  lines.push("  </identification>");

  // Part list
  lines.push("  <part-list>");
  lines.push('    <score-part id="P1">');
  lines.push("      <part-name>Music</part-name>");
  lines.push("    </score-part>");
  lines.push("  </part-list>");

  // Part with measures
  lines.push('  <part id="P1">');

  let measureNumber = 1;
  let currentDivisionsInMeasure = 0;
  const beatsPerMeasure = headers.meter[0];
  const beatType = headers.meter[1];
  const divisionsPerMeasure = divisions * 4 * (beatsPerMeasure / beatType);
  let measureNotes: string[] = [];
  let isFirstMeasure = true;
  let pendingChord: string | null = null;

  function flushMeasure(isFinal = false) {
    lines.push(`    <measure number="${measureNumber}">`);

    if (isFirstMeasure) {
      lines.push("      <attributes>");
      lines.push(`        <divisions>${divisions}</divisions>`);
      lines.push("        <key>");
      lines.push(`          <fifths>${keyInfo.fifths}</fifths>`);
      if (keyInfo.mode !== "major") {
        lines.push(`          <mode>${keyInfo.mode}</mode>`);
      }
      lines.push("        </key>");
      lines.push("        <time>");
      lines.push(`          <beats>${beatsPerMeasure}</beats>`);
      lines.push(`          <beat-type>${beatType}</beat-type>`);
      lines.push("        </time>");
      lines.push("        <clef>");
      lines.push("          <sign>G</sign>");
      lines.push("          <line>2</line>");
      lines.push("        </clef>");
      lines.push("      </attributes>");

      // Tempo direction
      lines.push("      <direction placement=\"above\">");
      lines.push("        <direction-type>");
      lines.push("          <metronome>");
      lines.push("            <beat-unit>quarter</beat-unit>");
      lines.push(`            <per-minute>${headers.tempo}</per-minute>`);
      lines.push("          </metronome>");
      lines.push("        </direction-type>");
      lines.push("        <sound tempo=\"" + headers.tempo + "\"/>");
      lines.push("      </direction>");
      isFirstMeasure = false;
    }

    for (const noteLine of measureNotes) {
      lines.push(noteLine);
    }

    if (isFinal) {
      lines.push('      <barline location="right">');
      lines.push("        <bar-style>light-heavy</bar-style>");
      lines.push("      </barline>");
    }

    lines.push("    </measure>");
    measureNumber++;
    measureNotes = [];
    currentDivisionsInMeasure = 0;
  }

  for (const item of parsedNotes) {
    if (item.type === "chord_symbol") {
      pendingChord = item.chordText || null;
      continue;
    }

    if (item.type === "barline") {
      // Flush current measure if it has content
      if (measureNotes.length > 0) {
        // Pad with rest if measure is incomplete
        if (currentDivisionsInMeasure < divisionsPerMeasure) {
          const remaining = Math.round(divisionsPerMeasure - currentDivisionsInMeasure);
          if (remaining > 0) {
            const restMult = remaining / unitDivisions;
            const { type: restType, dots: restDots } = durationToNoteType(restMult);
            const restLines: string[] = [];
            restLines.push("      <note>");
            restLines.push("        <rest/>");
            restLines.push(`        <duration>${remaining}</duration>`);
            restLines.push(`        <type>${restType}</type>`);
            for (let d = 0; d < restDots; d++) restLines.push("        <dot/>");
            restLines.push("      </note>");
            measureNotes.push(restLines.join("\n"));
          }
        }
        flushMeasure();
      }
      continue;
    }

    if (item.type === "rest") {
      const dur = Math.round((item.duration || 1) * unitDivisions);
      const mult = item.duration || 1;
      const { type: noteType, dots } = durationToNoteType(mult);

      // Check if this rest would overflow the measure
      if (currentDivisionsInMeasure + dur > divisionsPerMeasure && measureNotes.length > 0) {
        flushMeasure();
      }

      const restLines: string[] = [];
      restLines.push("      <note>");
      restLines.push("        <rest/>");
      restLines.push(`        <duration>${dur}</duration>`);
      restLines.push(`        <type>${noteType}</type>`);
      for (let d = 0; d < dots; d++) restLines.push("        <dot/>");
      restLines.push("      </note>");
      measureNotes.push(restLines.join("\n"));
      currentDivisionsInMeasure += dur;
      continue;
    }

    if (item.type === "note") {
      const dur = Math.round((item.duration || 1) * unitDivisions);
      const mult = item.duration || 1;
      const { type: noteType, dots } = durationToNoteType(mult);

      // Check if this note would overflow the measure
      if (currentDivisionsInMeasure + dur > divisionsPerMeasure && measureNotes.length > 0) {
        // Pad current measure
        const remaining = Math.round(divisionsPerMeasure - currentDivisionsInMeasure);
        if (remaining > 0) {
          const restMult = remaining / unitDivisions;
          const { type: rt, dots: rd } = durationToNoteType(restMult);
          const padLines: string[] = [];
          padLines.push("      <note>");
          padLines.push("        <rest/>");
          padLines.push(`        <duration>${remaining}</duration>`);
          padLines.push(`        <type>${rt}</type>`);
          for (let d = 0; d < rd; d++) padLines.push("        <dot/>");
          padLines.push("      </note>");
          measureNotes.push(padLines.join("\n"));
        }
        flushMeasure();
      }

      const noteLines: string[] = [];
      noteLines.push("      <note>");
      noteLines.push("        <pitch>");
      noteLines.push(`          <step>${item.step}</step>`);
      if (item.alter && item.alter !== 0) {
        noteLines.push(`          <alter>${item.alter}</alter>`);
      }
      noteLines.push(`          <octave>${item.octave}</octave>`);
      noteLines.push("        </pitch>");
      noteLines.push(`        <duration>${dur}</duration>`);
      noteLines.push(`        <type>${noteType}</type>`);
      for (let d = 0; d < dots; d++) noteLines.push("        <dot/>");

      // Add chord symbol as lyric (harmony element)
      if (pendingChord) {
        // Close note first, then add harmony before it
        // Actually, harmony goes before the note in MusicXML
        const harmonyLines: string[] = [];
        harmonyLines.push("      <harmony>");
        harmonyLines.push("        <root>");
        const rootMatch = pendingChord.match(/^([A-G][#b]?)/);
        if (rootMatch) {
          const rootStep = rootMatch[1][0];
          harmonyLines.push(`          <root-step>${rootStep}</root-step>`);
          if (rootMatch[1].length > 1) {
            const rootAlter = rootMatch[1][1] === "#" ? 1 : -1;
            harmonyLines.push(`          <root-alter>${rootAlter}</root-alter>`);
          }
        }
        harmonyLines.push("        </root>");

        // Determine chord kind
        const chordSuffix = pendingChord.replace(/^[A-G][#b]?/, "");
        let kind = "major";
        if (chordSuffix.startsWith("m") && !chordSuffix.startsWith("maj")) kind = "minor";
        else if (chordSuffix.includes("7") && chordSuffix.includes("maj")) kind = "major-seventh";
        else if (chordSuffix.includes("7")) kind = "dominant";
        else if (chordSuffix.includes("dim")) kind = "diminished";
        else if (chordSuffix.includes("aug")) kind = "augmented";
        else if (chordSuffix.includes("sus4")) kind = "suspended-fourth";
        else if (chordSuffix.includes("sus2")) kind = "suspended-second";
        harmonyLines.push(`        <kind>${kind}</kind>`);
        harmonyLines.push("      </harmony>");

        // Insert harmony before the note
        measureNotes.push(harmonyLines.join("\n"));
        pendingChord = null;
      }

      noteLines.push("      </note>");
      measureNotes.push(noteLines.join("\n"));
      currentDivisionsInMeasure += dur;
    }
  }

  // Flush any remaining notes
  if (measureNotes.length > 0) {
    flushMeasure(true);
  }

  // If no measures were written, add an empty measure
  if (measureNumber === 1) {
    lines.push('    <measure number="1">');
    lines.push("      <attributes>");
    lines.push(`        <divisions>${divisions}</divisions>`);
    lines.push("        <key>");
    lines.push(`          <fifths>${keyInfo.fifths}</fifths>`);
    lines.push("        </key>");
    lines.push("        <time>");
    lines.push(`          <beats>${beatsPerMeasure}</beats>`);
    lines.push(`          <beat-type>${beatType}</beat-type>`);
    lines.push("        </time>");
    lines.push("        <clef>");
    lines.push("          <sign>G</sign>");
    lines.push("          <line>2</line>");
    lines.push("        </clef>");
    lines.push("      </attributes>");
    lines.push("      <note>");
    lines.push("        <rest/>");
    lines.push(`        <duration>${divisionsPerMeasure}</duration>`);
    lines.push("        <type>whole</type>");
    lines.push("      </note>");
    lines.push("    </measure>");
  }

  lines.push("  </part>");
  lines.push("</score-partwise>");

  return lines.join("\n");
}

/**
 * Download ABC notation as a MusicXML file.
 * Creates a .musicxml file and triggers a browser download.
 */
export function downloadMusicXml(abc: string, filename?: string): void {
  const title = extractTitle(abc);
  const xml = abcToMusicXml(abc);

  const blob = new Blob([xml], { type: "application/vnd.recordare.musicxml+xml" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = sanitiseFilename(filename || title || "sheet-music") + ".musicxml";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractTitle(abc: string): string {
  const match = abc.match(/^T:\s*(.+)$/m);
  return match ? match[1].trim() : "Untitled";
}

function ensureAbcHeaders(abc: string): string {
  let result = abc.trim();
  if (!/^X:\s*\d/m.test(result)) result = "X:1\n" + result;
  if (!/^M:/m.test(result)) result = result.replace(/(^X:.*$)/m, "$1\nM:4/4");
  if (!/^L:/m.test(result)) result = result.replace(/(^M:.*$)/m, "$1\nL:1/8");
  if (!/^K:/m.test(result)) result = result.replace(/(^L:.*$)/m, "$1\nK:C");
  return result;
}

function sanitiseFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "").replace(/\s+/g, "-").substring(0, 100);
}
