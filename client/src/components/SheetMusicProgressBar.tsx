import { memo } from "react";

interface SheetMusicProgressBarProps {
  /** Playback progress from 0 to 100 */
  progress: number;
  /** Whether playback is actively playing (not paused/stopped) */
  isActive: boolean;
  /** Whether any playback session is in progress (playing or paused) */
  isPlaying: boolean;
}

/**
 * A thin progress bar that sits directly above the sheet music container.
 * It shows the current playback position as a colored bar that fills
 * from left to right, with a glowing leading edge for visual clarity.
 *
 * The bar is only visible during active playback or when paused mid-song.
 */
export const SheetMusicProgressBar = memo(function SheetMusicProgressBar({
  progress,
  isActive,
  isPlaying,
}: SheetMusicProgressBarProps) {
  if (!isPlaying && progress === 0) return null;

  return (
    <div
      className="relative w-full h-1.5 bg-muted/50 rounded-full overflow-hidden"
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Playback progress"
    >
      {/* Filled portion */}
      <div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{
          width: `${Math.min(100, Math.max(0, progress))}%`,
          background: "linear-gradient(90deg, #7c3aed 0%, #a78bfa 100%)",
          transition: isActive ? "width 0.15s linear" : "width 0.3s ease-out",
        }}
      />

      {/* Glowing leading edge indicator */}
      {isActive && progress > 0 && progress < 100 && (
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
          style={{
            left: `${Math.min(100, Math.max(0, progress))}%`,
            transform: "translate(-50%, -50%)",
            background: "#7c3aed",
            boxShadow: "0 0 6px 2px rgba(124, 58, 237, 0.6), 0 0 12px 4px rgba(124, 58, 237, 0.3)",
          }}
        />
      )}

      {/* Paused indicator: pulsing dot at current position */}
      {!isActive && isPlaying && progress > 0 && (
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full animate-pulse"
          style={{
            left: `${Math.min(100, Math.max(0, progress))}%`,
            transform: "translate(-50%, -50%)",
            background: "#7c3aed",
            boxShadow: "0 0 4px 1px rgba(124, 58, 237, 0.4)",
          }}
        />
      )}
    </div>
  );
});
