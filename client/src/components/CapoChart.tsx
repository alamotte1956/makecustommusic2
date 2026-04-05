import { useMemo, useState } from "react";
import { calculateCapoChart, getBestCapoPositions, getCapoLabel } from "@/lib/capoChart";
import type { CapoPosition } from "@/lib/capoChart";
import { ChevronDown, ChevronUp, Guitar, Star, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CapoChartProps {
  /** The song's current key (e.g. "G", "Am", "F# minor") */
  songKey: string;
  /** Array of chord symbols used in the song */
  chords: string[];
}

/**
 * CapoChart displays a visual chart showing guitarists which capo position
 * to use for simpler open chord shapes. It highlights recommended positions
 * and shows the chord shapes you'd actually finger at each fret.
 */
export function CapoChart({ songKey, chords }: CapoChartProps) {
  const [expanded, setExpanded] = useState(false);

  const allPositions = useMemo(
    () => calculateCapoChart(songKey, chords),
    [songKey, chords]
  );

  const bestPositions = useMemo(
    () => getBestCapoPositions(songKey, chords, 3),
    [songKey, chords]
  );

  // The "no capo" position (fret 0)
  const noCapo = allPositions[0];

  // Unique original chords for the table header
  const uniqueChords = useMemo(() => {
    const seen = new Set<string>();
    return chords.filter((c) => {
      if (!c || seen.has(c)) return false;
      seen.add(c);
      return true;
    });
  }, [chords]);

  if (uniqueChords.length === 0) return null;

  // Check if the song is already in an easy key with easy chords
  const alreadyEasy = noCapo.recommended || (noCapo.easyPercent >= 80 && noCapo.isEasyKey);

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Guitar className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-semibold text-foreground">Capo Chart</span>
          {bestPositions.length > 0 && !alreadyEasy && (
            <span className="inline-flex items-center gap-1 text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
              <Star className="w-3 h-3 fill-current" />
              {bestPositions.length} recommended
            </span>
          )}
          {alreadyEasy && (
            <span className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2 py-0.5 rounded-full">
              Already in an easy key
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border px-4 pb-4 space-y-4">
          {/* Best recommendations */}
          {bestPositions.length > 0 && !alreadyEasy && (
            <div className="pt-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Info className="w-3.5 h-3.5" />
                <span>Recommended capo positions for easier chord shapes:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {bestPositions.map((pos) => (
                  <RecommendedCard key={pos.fret} position={pos} uniqueChords={uniqueChords} />
                ))}
              </div>
            </div>
          )}

          {alreadyEasy && (
            <div className="pt-3">
              <div className="flex items-start gap-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">No capo needed!</p>
                  <p className="text-xs mt-0.5 text-green-600 dark:text-green-500">
                    This song is already in <strong>{noCapo.playKey}</strong> with {noCapo.easyPercent}% easy open chords.
                    You can play it comfortably without a capo.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Full chart table */}
          <div className="pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground mb-2"
              onClick={(e) => {
                e.stopPropagation();
                const table = document.getElementById("capo-full-table");
                if (table) table.classList.toggle("hidden");
              }}
            >
              Show full capo chart
            </Button>
            <div id="capo-full-table" className="hidden">
              <FullCapoTable
                positions={allPositions}
                uniqueChords={uniqueChords}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Card showing a recommended capo position */
function RecommendedCard({
  position,
  uniqueChords,
}: {
  position: CapoPosition;
  uniqueChords: string[];
}) {
  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-amber-800 dark:text-amber-300">
          {getCapoLabel(position.fret)}
        </span>
        <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-800/50 px-1.5 py-0.5 rounded">
          Play in {position.playKey}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <EasyMeter percent={position.easyPercent} />
        <span className="text-xs text-amber-700 dark:text-amber-400">
          {position.easyPercent}% easy chords
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 pt-1">
        {uniqueChords.map((chord) => {
          const shape = position.chordShapes[chord];
          if (!shape) return null;
          const isEasy = isEasyOpenChord(shape);
          return (
            <span
              key={chord}
              className={`inline-flex items-center text-xs px-1.5 py-0.5 rounded font-mono ${
                isEasy
                  ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
              }`}
              title={`${chord} → ${shape}`}
            >
              {shape}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** Small progress meter showing percentage of easy chords */
function EasyMeter({ percent }: { percent: number }) {
  return (
    <div className="w-16 h-1.5 bg-amber-200 dark:bg-amber-800 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{
          width: `${percent}%`,
          backgroundColor:
            percent >= 80 ? "#22c55e" : percent >= 60 ? "#eab308" : "#f97316",
        }}
      />
    </div>
  );
}

/** Full table showing all capo positions (0-9) */
function FullCapoTable({
  positions,
  uniqueChords,
}: {
  positions: CapoPosition[];
  uniqueChords: string[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/50">
            <th className="text-left px-3 py-2 font-semibold text-foreground whitespace-nowrap sticky left-0 bg-muted/50 z-10">
              Capo
            </th>
            <th className="text-left px-3 py-2 font-semibold text-foreground whitespace-nowrap">
              Play Key
            </th>
            {uniqueChords.map((chord) => (
              <th
                key={chord}
                className="text-center px-2 py-2 font-semibold text-foreground whitespace-nowrap font-mono"
              >
                {chord}
              </th>
            ))}
            <th className="text-center px-3 py-2 font-semibold text-foreground whitespace-nowrap">
              Easy %
            </th>
          </tr>
        </thead>
        <tbody>
          {positions.map((pos) => (
            <tr
              key={pos.fret}
              className={`border-t border-border transition-colors ${
                pos.recommended
                  ? "bg-amber-50 dark:bg-amber-900/15"
                  : pos.fret === 0
                  ? "bg-blue-50/50 dark:bg-blue-900/10"
                  : "hover:bg-muted/20"
              }`}
            >
              <td className="px-3 py-2 font-medium whitespace-nowrap sticky left-0 bg-inherit z-10">
                <div className="flex items-center gap-1.5">
                  {pos.recommended && (
                    <Star className="w-3 h-3 text-amber-500 fill-current flex-shrink-0" />
                  )}
                  <span>{pos.fret === 0 ? "No Capo" : `Fret ${pos.fret}`}</span>
                </div>
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <span
                  className={`font-semibold ${
                    pos.isEasyKey
                      ? "text-green-700 dark:text-green-400"
                      : "text-foreground"
                  }`}
                >
                  {pos.playKey}
                </span>
              </td>
              {uniqueChords.map((chord) => {
                const shape = pos.chordShapes[chord];
                const easy = shape ? isEasyOpenChord(shape) : false;
                return (
                  <td key={chord} className="text-center px-2 py-2 font-mono whitespace-nowrap">
                    <span
                      className={
                        easy
                          ? "text-green-700 dark:text-green-400 font-semibold"
                          : "text-muted-foreground"
                      }
                    >
                      {shape || "—"}
                    </span>
                  </td>
                );
              })}
              <td className="text-center px-3 py-2">
                <span
                  className={`font-semibold ${
                    pos.easyPercent >= 80
                      ? "text-green-600"
                      : pos.easyPercent >= 60
                      ? "text-amber-600"
                      : "text-muted-foreground"
                  }`}
                >
                  {pos.easyPercent}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Quick check if a chord is an easy open chord (mirrors the logic in capoChart.ts) */
function isEasyOpenChord(chord: string): boolean {
  const EASY = new Set([
    "C", "G", "D", "A", "E", "F",
    "Am", "Em", "Dm",
    "C7", "G7", "D7", "A7", "E7", "B7",
    "Cmaj7", "Gmaj7", "Dmaj7", "Amaj7", "Emaj7",
    "Am7", "Em7", "Dm7",
    "Cadd9", "Gadd9", "Dadd9",
    "Csus2", "Dsus2", "Asus2",
    "Csus4", "Dsus4", "Asus4", "Esus4",
  ]);
  const mainChord = chord.includes("/") ? chord.split("/")[0] : chord;
  return EASY.has(mainChord);
}
