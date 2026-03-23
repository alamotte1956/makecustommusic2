import { useMemo } from "react";

/**
 * Guitar chord fingering data.
 * Each chord has: frets (6 strings, low E to high E), barreInfo, and startFret.
 * -1 = muted string, 0 = open string, 1+ = fret number.
 */
interface ChordFingering {
  frets: number[];
  startFret: number;
  barreString?: number; // barre across strings from this index
}

const CHORD_DB: Record<string, ChordFingering> = {
  // Major chords
  "C":    { frets: [-1, 3, 2, 0, 1, 0], startFret: 1 },
  "D":    { frets: [-1, -1, 0, 2, 3, 2], startFret: 1 },
  "E":    { frets: [0, 2, 2, 1, 0, 0], startFret: 1 },
  "F":    { frets: [1, 3, 3, 2, 1, 1], startFret: 1, barreString: 0 },
  "G":    { frets: [3, 2, 0, 0, 0, 3], startFret: 1 },
  "A":    { frets: [-1, 0, 2, 2, 2, 0], startFret: 1 },
  "B":    { frets: [-1, 2, 4, 4, 4, 2], startFret: 1, barreString: 1 },
  "Bb":   { frets: [-1, 1, 3, 3, 3, 1], startFret: 1, barreString: 1 },
  "Eb":   { frets: [-1, -1, 1, 3, 4, 3], startFret: 1 },
  "Ab":   { frets: [4, 6, 6, 5, 4, 4], startFret: 4, barreString: 0 },
  "Db":   { frets: [-1, 4, 6, 6, 6, 4], startFret: 4, barreString: 1 },
  "F#":   { frets: [2, 4, 4, 3, 2, 2], startFret: 2, barreString: 0 },
  "Gb":   { frets: [2, 4, 4, 3, 2, 2], startFret: 2, barreString: 0 },
  "C#":   { frets: [-1, 4, 6, 6, 6, 4], startFret: 4, barreString: 1 },

  // Minor chords
  "Am":   { frets: [-1, 0, 2, 2, 1, 0], startFret: 1 },
  "Bm":   { frets: [-1, 2, 4, 4, 3, 2], startFret: 1, barreString: 1 },
  "Cm":   { frets: [-1, 3, 5, 5, 4, 3], startFret: 3, barreString: 1 },
  "Dm":   { frets: [-1, -1, 0, 2, 3, 1], startFret: 1 },
  "Em":   { frets: [0, 2, 2, 0, 0, 0], startFret: 1 },
  "Fm":   { frets: [1, 3, 3, 1, 1, 1], startFret: 1, barreString: 0 },
  "Gm":   { frets: [3, 5, 5, 3, 3, 3], startFret: 3, barreString: 0 },
  "F#m":  { frets: [2, 4, 4, 2, 2, 2], startFret: 2, barreString: 0 },
  "Gbm":  { frets: [2, 4, 4, 2, 2, 2], startFret: 2, barreString: 0 },
  "G#m":  { frets: [4, 6, 6, 4, 4, 4], startFret: 4, barreString: 0 },
  "Abm":  { frets: [4, 6, 6, 4, 4, 4], startFret: 4, barreString: 0 },
  "Bbm":  { frets: [-1, 1, 3, 3, 2, 1], startFret: 1, barreString: 1 },
  "C#m":  { frets: [-1, 4, 6, 6, 5, 4], startFret: 4, barreString: 1 },
  "Dbm":  { frets: [-1, 4, 6, 6, 5, 4], startFret: 4, barreString: 1 },
  "Ebm":  { frets: [-1, -1, 1, 3, 4, 2], startFret: 1 },

  // 7th chords
  "A7":   { frets: [-1, 0, 2, 0, 2, 0], startFret: 1 },
  "B7":   { frets: [-1, 2, 1, 2, 0, 2], startFret: 1 },
  "C7":   { frets: [-1, 3, 2, 3, 1, 0], startFret: 1 },
  "D7":   { frets: [-1, -1, 0, 2, 1, 2], startFret: 1 },
  "E7":   { frets: [0, 2, 0, 1, 0, 0], startFret: 1 },
  "F7":   { frets: [1, 3, 1, 2, 1, 1], startFret: 1, barreString: 0 },
  "G7":   { frets: [3, 2, 0, 0, 0, 1], startFret: 1 },
  "Am7":  { frets: [-1, 0, 2, 0, 1, 0], startFret: 1 },
  "Bm7":  { frets: [-1, 2, 0, 2, 0, 2], startFret: 1 },
  "Cm7":  { frets: [-1, 3, 5, 3, 4, 3], startFret: 3, barreString: 1 },
  "Dm7":  { frets: [-1, -1, 0, 2, 1, 1], startFret: 1 },
  "Em7":  { frets: [0, 2, 0, 0, 0, 0], startFret: 1 },
  "Fm7":  { frets: [1, 3, 1, 1, 1, 1], startFret: 1, barreString: 0 },
  "Gm7":  { frets: [3, 5, 3, 3, 3, 3], startFret: 3, barreString: 0 },

  // Major 7th
  "Cmaj7": { frets: [-1, 3, 2, 0, 0, 0], startFret: 1 },
  "Dmaj7": { frets: [-1, -1, 0, 2, 2, 2], startFret: 1 },
  "Emaj7": { frets: [0, 2, 1, 1, 0, 0], startFret: 1 },
  "Fmaj7": { frets: [-1, -1, 3, 2, 1, 0], startFret: 1 },
  "Gmaj7": { frets: [3, 2, 0, 0, 0, 2], startFret: 1 },
  "Amaj7": { frets: [-1, 0, 2, 1, 2, 0], startFret: 1 },

  // Sus chords
  "Asus4": { frets: [-1, 0, 2, 2, 3, 0], startFret: 1 },
  "Asus2": { frets: [-1, 0, 2, 2, 0, 0], startFret: 1 },
  "Dsus4": { frets: [-1, -1, 0, 2, 3, 3], startFret: 1 },
  "Dsus2": { frets: [-1, -1, 0, 2, 3, 0], startFret: 1 },
  "Esus4": { frets: [0, 2, 2, 2, 0, 0], startFret: 1 },

  // Diminished
  "Bdim":  { frets: [-1, 2, 3, 4, 3, -1], startFret: 1 },
  "Cdim":  { frets: [-1, 3, 4, 5, 4, -1], startFret: 3 },
  "Ddim":  { frets: [-1, -1, 0, 1, 3, 1], startFret: 1 },

  // Add9
  "Cadd9": { frets: [-1, 3, 2, 0, 3, 0], startFret: 1 },
  "Gadd9": { frets: [3, 2, 0, 0, 0, 3], startFret: 1 },
};

// Normalize chord name for lookup (handle enharmonic equivalents)
function normalizeChord(chord: string): string {
  // Direct match first
  if (CHORD_DB[chord]) return chord;

  // Try common enharmonic equivalents
  const enharmonic: Record<string, string> = {
    "A#": "Bb", "D#": "Eb", "G#": "Ab",
    "A#m": "Bbm", "D#m": "Ebm", "G#m": "Abm",
    "A#7": "Bb7", "D#7": "Eb7",
    "Cb": "B", "Fb": "E",
  };

  if (enharmonic[chord] && CHORD_DB[enharmonic[chord]]) {
    return enharmonic[chord];
  }

  // Try stripping slash bass notes (e.g., "Am/E" -> "Am")
  const slashIdx = chord.indexOf("/");
  if (slashIdx > 0) {
    const base = chord.substring(0, slashIdx);
    if (CHORD_DB[base]) return base;
    if (enharmonic[base] && CHORD_DB[enharmonic[base]]) return enharmonic[base];
  }

  return chord;
}

// ─── SVG Chord Diagram ───
function ChordDiagram({ name, fingering }: { name: string; fingering: ChordFingering }) {
  const width = 80;
  const height = 100;
  const padding = { top: 22, left: 16, right: 10, bottom: 8 };
  const numFrets = 4;
  const numStrings = 6;
  const fretWidth = (width - padding.left - padding.right) / (numStrings - 1);
  const fretHeight = (height - padding.top - padding.bottom) / numFrets;

  const stringX = (s: number) => padding.left + s * fretWidth;
  const fretY = (f: number) => padding.top + f * fretHeight;

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-bold text-foreground">{name}</span>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Nut or fret position indicator */}
        {fingering.startFret === 1 ? (
          <line
            x1={stringX(0)} y1={padding.top}
            x2={stringX(5)} y2={padding.top}
            stroke="currentColor" strokeWidth={3}
          />
        ) : (
          <text
            x={padding.left - 12} y={fretY(0.5) + 4}
            fontSize={9} fill="currentColor" textAnchor="middle"
          >
            {fingering.startFret}
          </text>
        )}

        {/* Fret lines */}
        {Array.from({ length: numFrets + 1 }, (_, i) => (
          <line
            key={`fret-${i}`}
            x1={stringX(0)} y1={fretY(i)}
            x2={stringX(5)} y2={fretY(i)}
            stroke="currentColor" strokeWidth={0.5} opacity={0.4}
          />
        ))}

        {/* String lines */}
        {Array.from({ length: numStrings }, (_, i) => (
          <line
            key={`string-${i}`}
            x1={stringX(i)} y1={padding.top}
            x2={stringX(i)} y2={fretY(numFrets)}
            stroke="currentColor" strokeWidth={0.5} opacity={0.4}
          />
        ))}

        {/* Finger positions, mutes, and opens */}
        {fingering.frets.map((fret, stringIdx) => {
          const x = stringX(stringIdx);

          if (fret === -1) {
            // Muted string: X above nut
            return (
              <text
                key={`mute-${stringIdx}`}
                x={x} y={padding.top - 6}
                fontSize={10} fill="currentColor" textAnchor="middle"
                fontWeight="bold"
              >
                ×
              </text>
            );
          }

          if (fret === 0) {
            // Open string: O above nut
            return (
              <circle
                key={`open-${stringIdx}`}
                cx={x} cy={padding.top - 8}
                r={4} fill="none" stroke="currentColor" strokeWidth={1}
              />
            );
          }

          // Fretted note: filled circle on the fret
          const relativeFret = fret - fingering.startFret + 1;
          if (relativeFret < 1 || relativeFret > numFrets) return null;

          return (
            <circle
              key={`dot-${stringIdx}`}
              cx={x}
              cy={fretY(relativeFret) - fretHeight / 2}
              r={5}
              fill="currentColor"
            />
          );
        })}
      </svg>
    </div>
  );
}

// ─── Unknown Chord Placeholder ───
function UnknownChord({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-bold text-foreground">{name}</span>
      <div className="w-[80px] h-[100px] flex items-center justify-center border border-dashed border-muted-foreground/30 rounded text-xs text-muted-foreground">
        No diagram
      </div>
    </div>
  );
}

// ─── Main Component ───
interface GuitarChordChartProps {
  chords: string[];
  className?: string;
}

export function GuitarChordChart({ chords, className }: GuitarChordChartProps) {
  const chordDiagrams = useMemo(() => {
    return chords.map((chord) => {
      const normalized = normalizeChord(chord);
      const fingering = CHORD_DB[normalized];
      return { name: chord, fingering };
    });
  }, [chords]);

  if (chords.length === 0) return null;

  return (
    <div className={className}>
      <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
        Guitar Chord Diagrams
      </h3>
      <div className="flex flex-wrap gap-4">
        {chordDiagrams.map(({ name, fingering }, idx) =>
          fingering ? (
            <ChordDiagram key={`${name}-${idx}`} name={name} fingering={fingering} />
          ) : (
            <UnknownChord key={`${name}-${idx}`} name={name} />
          )
        )}
      </div>
    </div>
  );
}
