import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Guitar, RefreshCw, Info } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { exportChordPDF, type ChordPDFData } from "@/lib/pdfExport";

interface ChordSection {
  section: string;
  chords: string[];
  strummingPattern: string;
  bpm: number;
}

interface GuitarChordDiagram {
  name: string;
  frets: number[];
  fingers: number[];
  barres: { fromString: number; toString: number; fret: number }[];
  baseFret: number;
}

interface ChordProgressionData {
  key: string;
  capo: number;
  tempo: number;
  timeSignature: string;
  sections: ChordSection[];
  chordDiagrams: GuitarChordDiagram[];
  notes: string;
}

interface GuitarChordViewerProps {
  songId: number;
  chordProgression?: ChordProgressionData | null;
  songTitle: string;
}

// Render a single chord diagram as SVG
function ChordDiagramSVG({ chord }: { chord: GuitarChordDiagram }) {
  const width = 100;
  const height = 140;
  const startX = 20;
  const startY = 35;
  const stringSpacing = 12;
  const fretSpacing = 20;
  const numFrets = 5;
  const numStrings = 6;

  const stringX = (i: number) => startX + i * stringSpacing;
  const fretY = (i: number) => startY + i * fretSpacing;

  return (
    <div className="flex flex-col items-center">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="text-foreground">
        {/* Title */}
        <text x={width / 2} y={14} textAnchor="middle" className="fill-current" fontSize="14" fontWeight="bold">
          {chord.name}
        </text>

        {/* Base fret indicator */}
        {chord.baseFret > 1 && (
          <text x={startX - 14} y={fretY(0) + fretSpacing / 2 + 4} className="fill-current" fontSize="10" textAnchor="middle">
            {chord.baseFret}fr
          </text>
        )}

        {/* Nut (thick line at top if baseFret is 1) */}
        {chord.baseFret <= 1 && (
          <line x1={startX} y1={startY} x2={startX + (numStrings - 1) * stringSpacing} y2={startY} stroke="currentColor" strokeWidth="3" />
        )}

        {/* Fret lines */}
        {Array.from({ length: numFrets + 1 }).map((_, i) => (
          <line key={`fret-${i}`} x1={startX} y1={fretY(i)} x2={startX + (numStrings - 1) * stringSpacing} y2={fretY(i)} stroke="currentColor" strokeWidth="1" opacity="0.5" />
        ))}

        {/* String lines */}
        {Array.from({ length: numStrings }).map((_, i) => (
          <line key={`string-${i}`} x1={stringX(i)} y1={startY} x2={stringX(i)} y2={fretY(numFrets)} stroke="currentColor" strokeWidth="1" opacity="0.6" />
        ))}

        {/* Barre indicators */}
        {chord.barres?.map((barre, i) => {
          const fromX = stringX(numStrings - barre.fromString);
          const toX = stringX(numStrings - barre.toString);
          const y = fretY(barre.fret - (chord.baseFret > 1 ? chord.baseFret - 1 : 0)) - fretSpacing / 2;
          return (
            <rect key={`barre-${i}`} x={Math.min(fromX, toX) - 4} y={y - 5} width={Math.abs(toX - fromX) + 8} height={10} rx="5" className="fill-current" opacity="0.8" />
          );
        })}

        {/* Finger dots and open/muted indicators */}
        {chord.frets.map((fret, i) => {
          const x = stringX(i);
          if (fret === -1) {
            return (
              <text key={`dot-${i}`} x={x} y={startY - 6} textAnchor="middle" className="fill-current" fontSize="10" fontWeight="bold">
                ×
              </text>
            );
          }
          if (fret === 0) {
            return (
              <circle key={`dot-${i}`} cx={x} cy={startY - 8} r="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
            );
          }
          const adjustedFret = chord.baseFret > 1 ? fret - (chord.baseFret - 1) : fret;
          const y = fretY(adjustedFret) - fretSpacing / 2;
          return (
            <g key={`dot-${i}`}>
              <circle cx={x} cy={y} r="5" className="fill-current" />
              {chord.fingers[i] > 0 && (
                <text x={x} y={y + 3.5} textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">
                  {chord.fingers[i]}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function GuitarChordViewer({ songId, chordProgression: initialData, songTitle }: GuitarChordViewerProps) {
  const [data, setData] = useState<ChordProgressionData | null>(initialData ?? null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const generateMutation = trpc.songs.generateChordProgression.useMutation();
  const utils = trpc.useUtils();

  const handleGenerate = useCallback(async () => {
    try {
      const result = await generateMutation.mutateAsync({ songId });
      setData(result.chordProgression);
      utils.songs.getById.invalidate({ id: songId });
      toast.success("Chord progression generated!");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate chord progression");
    }
  }, [songId, generateMutation, utils]);

  const handleDownloadPDF = useCallback(() => {
    if (!data) return;
    setExporting(true);
    try {
      // Collect SVG elements from the chord diagrams
      const svgs = contentRef.current?.querySelectorAll("svg");
      const diagramSvgs = svgs ? Array.from(svgs) as SVGElement[] : undefined;

      const pdfData: ChordPDFData = {
        key: data.key,
        capo: data.capo,
        tempo: data.tempo,
        timeSignature: data.timeSignature,
        sections: data.sections,
        notes: data.notes,
      };

      exportChordPDF(pdfData, songTitle, diagramSvgs);
      toast.success("Chord chart PDF downloaded!");
    } catch {
      toast.error("Failed to export chord chart PDF");
    } finally {
      setExporting(false);
    }
  }, [data, songTitle]);

  // No data yet — show generate button
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Guitar className="w-12 h-12 text-muted-foreground/40" />
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-foreground">No chord progression yet</p>
          <p className="text-xs text-muted-foreground">
            Generate guitar-friendly chord diagrams, strumming patterns, and capo recommendations
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generateMutation.isPending}
          className="gap-2"
        >
          {generateMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing Song...
            </>
          ) : (
            <>
              <Guitar className="w-4 h-4" />
              Generate Guitar Chords
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Guitar className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Acoustic Guitar</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            disabled={exporting}
            className="gap-1.5"
          >
            {exporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            Download PDF
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="gap-1.5"
          >
            {generateMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            Regenerate
          </Button>
        </div>
      </div>

      <div ref={contentRef} className="space-y-6">
        {/* Song metadata */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="default" className="bg-indigo-600">Key: {data.key}</Badge>
          {data.capo > 0 && <Badge variant="secondary">Capo: Fret {data.capo}</Badge>}
          <Badge variant="secondary">{data.tempo} BPM</Badge>
          <Badge variant="secondary">{data.timeSignature}</Badge>
        </div>

        {/* Chord diagrams */}
        {data.chordDiagrams && data.chordDiagrams.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Chord Diagrams</p>
            <div className="flex flex-wrap gap-3 justify-start">
              {data.chordDiagrams.map((chord, i) => (
                <div key={i} className="bg-card border border-border rounded-lg p-2">
                  <ChordDiagramSVG chord={chord} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sections */}
        <div className="space-y-4">
          {data.sections.map((section, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-primary">{section.section}</h4>
                {section.bpm && (
                  <span className="text-xs text-muted-foreground">{section.bpm} BPM</span>
                )}
              </div>
              <div className="font-mono text-lg font-bold tracking-wider text-foreground">
                {section.chords.join("  \u2192  ")}
              </div>
              {section.strummingPattern && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Strum:</span>{" "}
                  <span className="font-mono tracking-widest">{section.strummingPattern}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Playing notes */}
        {data.notes && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <Info className="w-3.5 h-3.5" />
              Playing Tips
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{data.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
