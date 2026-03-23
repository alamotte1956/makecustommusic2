/**
 * ABC Notation to MIDI File Converter
 * Parses ABC notation and generates a standard MIDI file (SMF Type 0)
 * for download and use in digital audio workstations.
 */

// ─── MIDI Constants ───
const MIDI_HEADER = [0x4d, 0x54, 0x68, 0x64]; // "MThd"
const MIDI_TRACK_HEADER = [0x4d, 0x54, 0x72, 0x6b]; // "MTrk"
const TICKS_PER_QUARTER = 480;

// ABC note to MIDI pitch mapping (middle C = 60)
const NOTE_MAP: Record<string, number> = {
  C: 60, D: 62, E: 64, F: 65, G: 67, A: 69, B: 71,
  c: 72, d: 74, e: 76, f: 77, g: 79, a: 81, b: 83,
};

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
      // Parse tempo: "1/4=120" or just "120"
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
}

function parseDuration(
  durationStr: string,
  defaultLength: [number, number]
): number {
  const defaultTicks = (defaultLength[0] / defaultLength[1]) * 4 * TICKS_PER_QUARTER;

  if (!durationStr || durationStr.length === 0) return defaultTicks;

  // Handle multipliers: "2" means 2x default, "/2" means half, "3/2" means 1.5x
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
  let currentVelocity = 80; // Default mf

  // Dynamics mapping
  const dynamicsMap: Record<string, number> = {
    "ppp": 20, "pp": 35, "p": 50, "mp": 65,
    "mf": 80, "f": 95, "ff": 110, "fff": 125,
  };

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip header lines
    if (/^[A-Z]:/.test(trimmed) && !trimmed.startsWith("w:")) continue;
    // Skip lyrics lines
    if (trimmed.startsWith("w:")) continue;
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("%")) continue;

    // Process note-by-note
    let i = 0;
    while (i < trimmed.length) {
      const ch = trimmed[i];

      // Skip bar lines, repeat signs, decorations
      if (ch === "|" || ch === ":" || ch === "[" || ch === "]") {
        i++;
        continue;
      }

      // Handle dynamics decorations !p!, !f!, etc.
      if (ch === "!") {
        const endBang = trimmed.indexOf("!", i + 1);
        if (endBang > i) {
          const dyn = trimmed.substring(i + 1, endBang);
          if (dynamicsMap[dyn]) currentVelocity = dynamicsMap[dyn];
          i = endBang + 1;
          continue;
        }
        i++;
        continue;
      }

      // Skip quoted chord symbols "Am", "G7", etc.
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
        // Parse duration
        let durStr = "";
        while (i < trimmed.length && /[\d\/]/.test(trimmed[i])) {
          durStr += trimmed[i];
          i++;
        }
        const duration = parseDuration(durStr, headers.defaultNoteLength);
        // Rest = note with pitch 0 and velocity 0
        notes.push({ pitch: 0, duration, velocity: 0 });
        continue;
      }

      // Handle accidentals
      let accidental = 0;
      if (ch === "^") {
        accidental = 1;
        i++;
        if (i < trimmed.length && trimmed[i] === "^") { accidental = 2; i++; }
      } else if (ch === "_") {
        accidental = -1;
        i++;
        if (i < trimmed.length && trimmed[i] === "_") { accidental = -2; i++; }
      } else if (ch === "=") {
        accidental = 0; // natural
        i++;
      }

      // Check for note letter
      if (i < trimmed.length && /[A-Ga-g]/.test(trimmed[i])) {
        const noteLetter = trimmed[i];
        let pitch = NOTE_MAP[noteLetter];
        if (pitch === undefined) {
          i++;
          continue;
        }

        pitch += accidental;
        i++;

        // Handle octave modifiers: ' (up) and , (down)
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

        // Handle ties (skip the dash, duration will be combined later)
        // For simplicity, we just add the note
        const duration = parseDuration(durStr, headers.defaultNoteLength);

        notes.push({ pitch, duration, velocity: currentVelocity });
        continue;
      }

      // Skip decorations like ~ (trill), . (staccato), H (fermata), etc.
      if (ch === "~" || ch === "." || ch === "H" || ch === "(" || ch === ")") {
        i++;
        continue;
      }

      // Skip spaces and other characters
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
    num, denLog2, 24, 8 // 24 MIDI clocks per metronome click, 8 32nd notes per quarter
  );

  // Track name meta event
  const titleBytes = Array.from(new TextEncoder().encode(headers.title));
  trackEvents.push(0x00, 0xff, 0x03, ...encodeVLQ(titleBytes.length), ...titleBytes);

  // Program change: acoustic grand piano (program 0) on channel 0
  trackEvents.push(0x00, 0xc0, 0x00);

  // Add note events
  for (const note of notes) {
    if (note.pitch === 0 || note.velocity === 0) {
      // Rest: just advance time
      trackEvents.push(...encodeVLQ(Math.round(note.duration)));
      // Need a no-op event — use a controller event that does nothing visible
      // Actually, we can just accumulate delta time on the next note-on
      // For simplicity, we'll skip rests by tracking cumulative delta
      // But since we already pushed the VLQ, let's use a dummy meta event
      trackEvents.push(0xff, 0x06, 0x00); // marker with empty text
      continue;
    }

    // Note on (channel 0)
    trackEvents.push(0x00); // delta time (0 = simultaneous with previous)
    trackEvents.push(0x90, note.pitch & 0x7f, note.velocity & 0x7f);

    // Note off after duration
    trackEvents.push(...encodeVLQ(Math.round(note.duration)));
    trackEvents.push(0x80, note.pitch & 0x7f, 0x40);
  }

  // End of track
  trackEvents.push(0x00, 0xff, 0x2f, 0x00);

  // Build complete MIDI file
  const fileBytes: number[] = [];

  // File header: MThd, length=6, format=0, tracks=1, division=TICKS_PER_QUARTER
  fileBytes.push(...MIDI_HEADER);
  fileBytes.push(...write32(6)); // header length
  fileBytes.push(...write16(0)); // format 0
  fileBytes.push(...write16(1)); // 1 track
  fileBytes.push(...write16(TICKS_PER_QUARTER)); // ticks per quarter note

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
