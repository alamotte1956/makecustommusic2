/**
 * SheetMusicSkeleton — a music-themed loading skeleton that mimics
 * the appearance of sheet music (staff lines, clef, notes, measures)
 * while abcjs is rendering the actual notation.
 */

const STAFF_COUNT = 3; // Number of staff groups to show
const LINES_PER_STAFF = 5; // Standard music staff has 5 lines

/** A single staff group with 5 lines, a clef placeholder, and animated note placeholders */
function StaffGroup({ delay }: { delay: number }) {
  return (
    <div
      className="relative py-3 animate-pulse"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Staff lines */}
      <div className="relative h-[52px]">
        {Array.from({ length: LINES_PER_STAFF }).map((_, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 h-px bg-gray-200"
            style={{ top: `${i * 13}px` }}
          />
        ))}

        {/* Treble clef placeholder */}
        <div className="absolute left-2 -top-1 w-5 h-[56px] flex items-center justify-center">
          <svg
            viewBox="0 0 24 56"
            className="w-5 h-14 text-gray-200"
            fill="currentColor"
          >
            <path d="M12 4c-2 4-6 8-6 16s4 12 6 14c2-2 6-6 6-14S14 8 12 4z" opacity="0.5" />
            <circle cx="12" cy="38" r="4" opacity="0.4" />
            <rect x="11" y="4" width="2" height="34" rx="1" opacity="0.3" />
          </svg>
        </div>

        {/* Note placeholders — randomly placed ovals on/between staff lines */}
        <div className="absolute left-10 right-4 top-0 h-full flex items-center gap-[3%]">
          {[
            { top: "0px", w: "6%" },
            { top: "13px", w: "5%" },
            { top: "6px", w: "7%" },
            { top: "26px", w: "5%" },
            { top: "19px", w: "6%" },
            { top: "39px", w: "5%" },
            { top: "6px", w: "6%" },
            { top: "32px", w: "7%" },
            { top: "13px", w: "5%" },
            { top: "26px", w: "6%" },
            { top: "0px", w: "5%" },
            { top: "39px", w: "6%" },
          ].map((note, i) => (
            <div
              key={i}
              className="relative flex-shrink-0"
              style={{ width: note.w }}
            >
              {/* Note head (oval) */}
              <div
                className="absolute w-[10px] h-[8px] rounded-[50%] bg-gray-200"
                style={{ top: note.top }}
              />
              {/* Note stem */}
              <div
                className="absolute w-[1.5px] bg-gray-200"
                style={{
                  left: "9px",
                  top: `${parseInt(note.top) - 20}px`,
                  height: "22px",
                }}
              />
            </div>
          ))}
        </div>

        {/* Measure bar lines */}
        {[25, 50, 75, 100].map((pct) => (
          <div
            key={pct}
            className="absolute top-0 h-[52px] w-px bg-gray-200"
            style={{ left: `${pct}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function SheetMusicSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-border p-4 min-h-[200px] space-y-4">
      {/* Title placeholder */}
      <div className="flex flex-col items-center gap-2 mb-4 animate-pulse">
        <div className="h-5 w-48 bg-gray-200 rounded" />
        <div className="h-3 w-32 bg-gray-100 rounded" />
      </div>

      {/* Staff groups */}
      {Array.from({ length: STAFF_COUNT }).map((_, i) => (
        <StaffGroup key={i} delay={i * 150} />
      ))}

      {/* Loading indicator */}
      <div className="flex items-center justify-center gap-2 pt-2 animate-pulse">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-violet-300 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">Rendering notation...</span>
      </div>
    </div>
  );
}
