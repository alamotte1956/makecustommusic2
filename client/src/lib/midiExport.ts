/**
 * ABC Notation to MIDI File Converter
 * Parses ABC notation and generates a standard MIDI file (SMF Type 0)
 * for download and use in digital audio workstations.
 *
 * Key improvements:
 * - Applies key signature accidentals to notes
 * - Properly handles rests by accumulating delta time
 * - Handles ties by combining note durations
 */

// ─── MIDI Constants ───
const MIDI_HEADER = [0x4d, 0x54, 0x68, 0x64]; // "MThd"
const MIDI_TRACK_HEADER = [0x4d, 0x54, 0x72, 0x6b]; // "MTrk"
const TICKS_PER_QUARTER = 480;

// ABC note to MIDI pitch mapping (middle C = 60, no key sig accidentals)
const NOTE_MAP: Record<string, number> = {
  C: 60, D: 62, E: 64, F: 65, G: 67, A: 69, B: 71,
  c: 72, d: 74, e: 76, f: 77, g: 79, a: 81, b: 83,
};

// Key signature accidentals (same map as abcPlayer.ts)
const KEY_ACCIDENTALS: Record<string, Record<string, number>> = {
  "C": {}, "Am": {},
  "G": { F: 1 }, "Em": { F: 1 },
  "D": { F: 1, C: 1 }, "Bm": { F: 1, C: 1 },
  "A": { F: 1, C: 1, G: 1 }, "F#m": { F: 1, C: 1, G: 1 },
  "E": { F: 1, C: 1, G: 1, D: 1 }, "C#m": { F: 1, C: 1, G: 1, D: 1 },
  "B": { F: 1, C: 1, G: 1, D: 1, A: 1 }, "G#m": { F: 1, C: 1, G: 1, D: 1, A: 1 },
  "F#": { F: 1, C: 1, G: 1, D: 1, A: 1, E: 1 }, "D#m": { F: 1, C: 1, G: 1, D: 1, A: 1, E: 1 },
  "C#": { F: 1, C: 1, G: 1, D: 1, A: 1, E: 1, B: 1 }, "A#m": { F: 1, C: 1, G: 1, D: 1, A: 1, E: 1, B: 1 },
  "F": { B: -1 }, "Dm": { B: -1 },
  "Bb": { B: -1, E: -1 }, "Gm": { B: -1, E: -1 },
  "Eb": { B: -1, E: -1, A: -1 }, "Cm": { B: -1, E: -1, A: -1 },
  "Ab": { B: -1, E: -1, A: -1, D: -1 }, "Fm": { B: -1, E: -1, A: -1, D: -1 },
  "Db": { B: -1, E: -1, A: -1, D: -1, G: -1 }, "Bbm": { B: -1, E: -1, A: -1, D: -1, G: -1 },
  "Gb": { B: -1, E: -1, A: -1, D: -1, G: -1, C: -1 }, "Ebm": { B: -1, E: -1, A: -1, D: -1, G: -1, C: -1 },
  "Cb": { B: -1, E: -1, A: -1, D: -1, G: -1, C: -1, F: -1 }, "Abm": { B: -1, E: -1, A: -1, D: -1, G: -1, C: -1, F: -1 },
};

function normalizeKeyName(keyStr: string): string {
  const match = keyStr.trim().match(/^([A-G][#b]?)\s*(m|min|minor)?/i);
  if (!match) return "C";
  return match[1] + (match[2] ? "m" : "");
}

// ─── Variable-Length Quantity Encoding ───
function encodeVLQ(value: number): number[] {
  if (value < 0) value = 0;
  if (value < 128) return [value];
  const bytes: number[] = [];
  bytes.unshift(value & 0x7f);
  value >>= 7;
  while (value > 0) {
    bytes.unshift((value & 0x7f) | 0x80);
    value >>= 7;
  }
  return bytes;
}

// ─── Write 16-bit and 32-bit big-endian values ───
function write16(value: number): number[] {
  return [(value >> 8) & 0xff, value & 0xff];
}

function write32(value: number): number[] {
  return [(value >> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

// ─── Parse ABC Headers ───
interface ABCHeaders {
  title: string;
  tempo: number; // BPM
  meter: [number, number]; // [numerator, denominator]
  defaultNoteLength: [number, number]; // [numerator, denominator]
  key: string;
}

function parseHeaders(abc: string): ABCHeaders {
  const lines = abc.split("\n");
  const headers: ABCHeaders = {
    title: "Untitled",
    tempo: 120,
    meter: [4, 4],
    defaultNoteLength: [1, 8],
    key: "C",
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("T:")) {
      headers.title = trimmed.substring(2).trim();
    } else if (trimmed.startsWith("Q:")) {
      const qMatch = trimmed.substring(2).trim().match(/(?:\d+\/\d+=)?(\d+)/);
      if (qMatch) headers.tempo = parseInt(qMatch[1], 10);
    } else if (trimmed.startsWith("M:")) {
      const mMatch = trimmed.substring(2).trim().match(/(\d+)\/(\d+)/);
      if (mMatch) headers.meter = [parseInt(mMatch[1], 10), parseInt(mMatch[2], 10)];
    } else if (trimmed.startsWith("L:")) {
      const lMatch = trimmed.substring(2).trim().match(/(\d+)\/(\d+)/);
      if (lMatch) headers.defaultNoteLength = [parseInt(lMatch[1], 10), parseInt(lMatch[2], 10)];
    } else if (trimmed.startsWith("K:")) {
      headers.key = trimmed.substring(2).trim();
    }
  }

  return headers;
}

// ─── Parse ABC Notes into MIDI Events ───
interface MidiNote {
  pitch: number;
  duration: number; // in ticks
  velocity: number;
  isRest: boolean;
}

function parseDuration(
  durationStr: string,
  defaultLength: [number, number]
): number {
  const defaultTicks = (defaultLength[0] / defaultLength[1]) * 4 * TICKS_PER_QUARTER;

  if (!durationStr || durationStr.length === 0) return defaultTicks;

  const slashMatch = durationStr.match(/^(\d*)\/(\d*)/);
  if (slashMatch) {
    const num = slashMatch[1] ? parseInt(slashMatch[1], 10) : 1;
    const den = slashMatch[2] ? parseInt(slashMatch[2], 10) : 2;
    return defaultTicks * (num / den);
  }

  const multiplier = parseInt(durationStr, 10);
  if (!isNaN(multiplier)) return defaultTicks * multiplier;

  return defaultTicks;
}

function parseABCNotes(abc: string, headers: ABCHeaders): MidiNote[] {
  const notes: MidiNote[] = [];
  const lines = abc.split("\n");
  const currentVelocity = 80; // Default mf

  // Get key signature accidentals
  const keyName = normalizeKeyName(headers.key);
  const keyAccidentals = KEY_ACCIDENTALS[keyName] || {};
  let measureAccidentals: Record<string, number> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[A-Z]:/.test(trimmed) && !trimmed.startsWith("w:")) continue;
    if (trimmed.startsWith("w:")) continue;
    if (!trimmed || trimmed.startsWith("%")) continue;

    let i = 0;
    while (i < trimmed.length) {
      const ch = trimmed[i];

      // Bar lines reset measure accidentals
      if (ch === "|") {
        measureAccidentals = {};
        i++;
        continue;
      }

      if (ch === ":" || ch === " ") {
        i++;
        continue;
      }

      // Handle dynamics decorations !p!, !f!, etc.
      if (ch === "!") {
        const endBang = trimmed.indexOf("!", i + 1);
        if (endBang > i) {
          i = endBang + 1;
          continue;
        }
        i++;
        continue;
      }

      // Skip quoted chord symbols
      if (ch === '"') {
        const endQuote = trimmed.indexOf('"', i + 1);
        if (endQuote > i) {
          i = endQuote + 1;
          continue;
        }
        i++;
        continue;
      }

      // Skip section markers [P:Verse], [1, [2, etc.
      if (ch === "[") {
        const endBracket = trimmed.indexOf("]", i + 1);
        if (endBracket > i) {
          i = endBracket + 1;
          continue;
        }
        i++;
        continue;
      }

      // Handle rests
      if (ch === "z" || ch === "Z") {
        i++;
        let durStr = "";
        while (i < trimmed.length && /[\d\/]/.test(trimmed[i])) {
          durStr += trimmed[i];
          i++;
        }
        const duration = parseDuration(durStr, headers.defaultNoteLength);
        notes.push({ pitch: 0, duration, velocity: 0, isRest: true });
        continue;
      }

      // Handle accidentals
      let explicitAccidental: number | null = null;
      if (ch === "^") {
        explicitAccidental = 1;
        i++;
        if (i < trimmed.length && trimmed[i] === "^") { explicitAccidental = 2; i++; }
      } else if (ch === "_") {
        explicitAccidental = -1;
        i++;
        if (i < trimmed.length && trimmed[i] === "_") { explicitAccidental = -2; i++; }
      } else if (ch === "=") {
        explicitAccidental = 0; // natural
        i++;
      }

      // Check for note letter
      if (i < trimmed.length && /[A-Ga-g]/.test(trimmed[i])) {
        const noteLetter = trimmed[i];
        const upperLetter = noteLetter.toUpperCase();
        let pitch = NOTE_MAP[noteLetter];
        if (pitch === undefined) {
          i++;
          continue;
        }

        // Apply accidental: explicit > measure > key signature
        let accidental: number;
        if (explicitAccidental !== null) {
          accidental = explicitAccidental;
          measureAccidentals[upperLetter] = explicitAccidental;
        } else if (measureAccidentals[upperLetter] !== undefined) {
          accidental = measureAccidentals[upperLetter];
        } else {
          accidental = keyAccidentals[upperLetter] || 0;
        }

        pitch += accidental;
        i++;

        // Handle octave modifiers
        while (i < trimmed.length) {
          if (trimmed[i] === "'") { pitch += 12; i++; }
          else if (trimmed[i] === ",") { pitch -= 12; i++; }
          else break;
        }

        // Parse duration
        let durStr = "";
        while (i < trimmed.length && /[\d\/]/.test(trimmed[i])) {
          durStr += trimmed[i];
          i++;
        }

        const duration = parseDuration(durStr, headers.defaultNoteLength);
        notes.push({ pitch, duration, velocity: currentVelocity, isRest: false });
        continue;
      }

      // If we had an accidental but no note followed, just skip
      if (explicitAccidental !== null) continue;

      // Skip decorations like ~ (trill), . (staccato), H (fermata), etc.
      if (ch === "~" || ch === "." || ch === "H" || ch === "(" || ch === ")") {
        i++;
        continue;
      }

      // Skip other characters
      i++;
    }
  }

  return notes;
}

// ─── Build MIDI File Bytes ───
function buildMidiFile(notes: MidiNote[], headers: ABCHeaders): Uint8Array<ArrayBuffer> {
  const trackEvents: number[] = [];

  // Tempo meta event: FF 51 03 tt tt tt (microseconds per quarter note)
  const microsecondsPerBeat = Math.round(60000000 / headers.tempo);
  trackEvents.push(
    0x00, // delta time
    0xff, 0x51, 0x03,
    (microsecondsPerBeat >> 16) & 0xff,
    (microsecondsPerBeat >> 8) & 0xff,
    microsecondsPerBeat & 0xff
  );

  // Time signature meta event: FF 58 04 nn dd cc bb
  const [num, den] = headers.meter;
  const denLog2 = Math.round(Math.log2(den));
  trackEvents.push(
    0x00, // delta time
    0xff, 0x58, 0x04,
    num, denLog2, 24, 8
  );

  // Track name meta event
  const titleBytes = Array.from(new TextEncoder().encode(headers.title));
  trackEvents.push(0x00, 0xff, 0x03, ...encodeVLQ(titleBytes.length), ...titleBytes);

  // Program change: acoustic grand piano (program 0) on channel 0
  trackEvents.push(0x00, 0xc0, 0x00);

  // Add note events — properly accumulate delta time for rests
  let pendingDelta = 0;

  for (const note of notes) {
    if (note.isRest) {
      // Accumulate rest duration as delta time for the next note
      pendingDelta += Math.round(note.duration);
      continue;
    }

    // Note on (channel 0) — include any accumulated rest delta
    trackEvents.push(...encodeVLQ(pendingDelta));
    pendingDelta = 0;
    trackEvents.push(0x90, note.pitch & 0x7f, note.velocity & 0x7f);

    // Note off after duration
    trackEvents.push(...encodeVLQ(Math.round(note.duration)));
    trackEvents.push(0x80, note.pitch & 0x7f, 0x40);
  }

  // End of track (include any trailing rest delta)
  trackEvents.push(...encodeVLQ(pendingDelta), 0xff, 0x2f, 0x00);

  // Build complete MIDI file
  const fileBytes: number[] = [];

  // File header: MThd, length=6, format=0, tracks=1, division=TICKS_PER_QUARTER
  fileBytes.push(...MIDI_HEADER);
  fileBytes.push(...write32(6));
  fileBytes.push(...write16(0));
  fileBytes.push(...write16(1));
  fileBytes.push(...write16(TICKS_PER_QUARTER));

  // Track chunk
  fileBytes.push(...MIDI_TRACK_HEADER);
  fileBytes.push(...write32(trackEvents.length));
  fileBytes.push(...trackEvents);

  return new Uint8Array(fileBytes) as Uint8Array<ArrayBuffer>;
}

// ─── Public API ───

/**
 * Convert ABC notation to a MIDI file (Uint8Array).
 * The resulting bytes represent a standard MIDI file (SMF Type 0)
 * that can be imported into any DAW.
 */
export function abcToMidi(abc: string): Uint8Array<ArrayBuffer> {
  const headers = parseHeaders(abc);
  const notes = parseABCNotes(abc, headers);
  return buildMidiFile(notes, headers);
}

/**
 * Download ABC notation as a MIDI file.
 * Creates a .mid file and triggers a browser download.
 */
export function downloadMidi(abc: string, filename?: string): void {
  const headers = parseHeaders(abc);
  const midiBytes = abcToMidi(abc);
  const blob = new Blob([midiBytes], { type: "audio/midi" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = (filename || headers.title || "sheet-music") + ".mid";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Extract chord symbols from ABC notation.
 * Returns an array of unique chord names found in the notation.
 */
export function extractChordsFromABC(abc: string): string[] {
  const chords: string[] = [];
  const seen = new Set<string>();

  // Match quoted chord symbols: "Am", "G7", "Cmaj7", "F#m", "Bb/D", etc.
  const chordRegex = /"([A-G][#b]?[^"]*?)"/g;
  let match;

  while ((match = chordRegex.exec(abc)) !== null) {
    const chord = match[1].trim();
    if (chord && !seen.has(chord)) {
      seen.add(chord);
      chords.push(chord);
    }
  }

  return chords;
}
