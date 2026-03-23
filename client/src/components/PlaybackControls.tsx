import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Square, Minus, Plus } from "lucide-react";
import { ABCPlayer, PlaybackState, formatTime, getPlayer } from "@/lib/abcPlayer";

interface PlaybackControlsProps {
  abc: string | null;
  className?: string;
  /** Called on every animation frame with the index of the currently-sounding note (-1 = none). */
  onActiveNoteChange?: (index: number) => void;
}

const DEFAULT_STATE: PlaybackState = {
  isPlaying: false,
  isPaused: false,
  currentTime: 0,
  duration: 0,
  tempo: 120,
  activeNoteIndex: -1,
};

export function PlaybackControls({ abc, className = "", onActiveNoteChange }: PlaybackControlsProps) {
  const playerRef = useRef<ABCPlayer>(getPlayer());
  const [state, setState] = useState<PlaybackState>(DEFAULT_STATE);
  const [tempoMultiplier, setTempoMultiplier] = useState(1);
  const onActiveNoteChangeRef = useRef(onActiveNoteChange);
  onActiveNoteChangeRef.current = onActiveNoteChange;

  // Load ABC when it changes
  useEffect(() => {
    const player = playerRef.current;
    if (abc) {
      player.load(abc);
    } else {
      player.stop();
    }
    // Reset tempo multiplier when ABC changes
    setTempoMultiplier(1);
  }, [abc]);

  // Subscribe to state updates
  useEffect(() => {
    const player = playerRef.current;
    player.onStateChange((newState) => {
      setState(newState);
      onActiveNoteChangeRef.current?.(newState.activeNoteIndex);
    });

    return () => {
      player.stop();
    };
  }, []);

  const handlePlayPause = useCallback(() => {
    const player = playerRef.current;
    if (player.isPlaying && !player.isPaused) {
      player.pause();
    } else {
      player.play();
    }
  }, []);

  const handleStop = useCallback(() => {
    playerRef.current.stop();
  }, []);

  const handleSeek = useCallback((value: number[]) => {
    if (state.duration <= 0) return;
    const position = value[0] / 100;
    playerRef.current.seek(position);
  }, [state.duration]);

  const handleTempoChange = useCallback((delta: number) => {
    setTempoMultiplier((prev) => {
      const next = Math.max(0.25, Math.min(4, prev + delta));
      playerRef.current.setTempoMultiplier(next);
      return next;
    });
  }, []);

  if (!abc) return null;

  const progress = state.duration > 0
    ? (state.currentTime / state.duration) * 100
    : 0;

  const isActive = state.isPlaying && !state.isPaused;

  return (
    <div className={`bg-card border rounded-lg p-3 ${className}`}>
      <div className="flex items-center gap-3">
        {/* Play/Pause button */}
        <Button
          variant="outline"
          size="icon"
          onClick={handlePlayPause}
          className="h-9 w-9 shrink-0"
          aria-label={isActive ? "Pause" : "Play"}
        >
          {isActive ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 ml-0.5" />
          )}
        </Button>

        {/* Stop button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleStop}
          disabled={!state.isPlaying}
          className="h-9 w-9 shrink-0"
          aria-label="Stop"
        >
          <Square className="h-3.5 w-3.5" />
        </Button>

        {/* Time display */}
        <span className="text-xs text-muted-foreground font-mono whitespace-nowrap min-w-[70px]">
          {formatTime(state.currentTime)} / {formatTime(state.duration)}
        </span>

        {/* Progress bar */}
        <div className="flex-1 min-w-0">
          <Slider
            value={[progress]}
            onValueChange={handleSeek}
            max={100}
            step={0.5}
            className="cursor-pointer"
            aria-label="Playback position"
          />
        </div>

        {/* Tempo controls */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleTempoChange(-0.25)}
            disabled={tempoMultiplier <= 0.25}
            className="h-7 w-7"
            aria-label="Decrease tempo"
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="text-xs text-muted-foreground font-mono min-w-[60px] text-center">
            {state.tempo} BPM
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleTempoChange(0.25)}
            disabled={tempoMultiplier >= 4}
            className="h-7 w-7"
            aria-label="Increase tempo"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
