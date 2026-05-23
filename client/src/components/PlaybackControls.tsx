import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Square, Gauge } from "lucide-react";
import { ABCPlayer, PlaybackState, formatTime, getPlayer } from "@/lib/abcPlayer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface PlaybackControlsProps {
  abc: string | null;
  className?: string;
  /** Called on every animation frame with the index of the currently-sounding note (-1 = none). */
  onActiveNoteChange?: (index: number) => void;
  /** Called on every animation frame with the full playback state for progress tracking. */
  onPlaybackStateChange?: (state: PlaybackState) => void;
}

const DEFAULT_STATE: PlaybackState = {
  isPlaying: false,
  isPaused: false,
  currentTime: 0,
  duration: 0,
  tempo: 120,
  activeNoteIndex: -1,
};

/** Speed presets for quick selection */
const SPEED_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

/** Format speed multiplier for display */
function formatSpeed(speed: number): string {
  if (speed === 1) return "1×";
  if (Number.isInteger(speed)) return `${speed}×`;
  // Show at most 2 decimal places, trim trailing zeros
  return `${parseFloat(speed.toFixed(2))}×`;
}

export function PlaybackControls({ abc, className = "", onActiveNoteChange, onPlaybackStateChange }: PlaybackControlsProps) {
  const playerRef = useRef<ABCPlayer>(getPlayer());
  const [state, setState] = useState<PlaybackState>(DEFAULT_STATE);
  const [speed, setSpeed] = useState(1);
  const [speedPopoverOpen, setSpeedPopoverOpen] = useState(false);
  const onActiveNoteChangeRef = useRef(onActiveNoteChange);
  onActiveNoteChangeRef.current = onActiveNoteChange;
  const onPlaybackStateChangeRef = useRef(onPlaybackStateChange);
  onPlaybackStateChangeRef.current = onPlaybackStateChange;

  // Load ABC when it changes
  useEffect(() => {
    const player = playerRef.current;
    if (abc) {
      player.load(abc);
    } else {
      player.stop();
    }
    // Reset speed when ABC changes
    setSpeed(1);
  }, [abc]);

  // Subscribe to state updates
  useEffect(() => {
    const player = playerRef.current;
    player.onStateChange((newState) => {
      setState(newState);
      onActiveNoteChangeRef.current?.(newState.activeNoteIndex);
      onPlaybackStateChangeRef.current?.(newState);
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

  const handleSpeedChange = useCallback((newSpeed: number) => {
    const clamped = Math.max(0.25, Math.min(4, newSpeed));
    setSpeed(clamped);
    playerRef.current.setTempoMultiplier(clamped);
  }, []);

  const handleSpeedSlider = useCallback((value: number[]) => {
    // Slider value is 25-400 (representing 0.25x to 4x, scaled by 100)
    const newSpeed = value[0] / 100;
    handleSpeedChange(newSpeed);
  }, [handleSpeedChange]);

  if (!abc) return null;

  const progress = state.duration > 0
    ? (state.currentTime / state.duration) * 100
    : 0;

  const isActive = state.isPlaying && !state.isPaused;
  const isNonDefaultSpeed = speed !== 1;

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

        {/* Speed control */}
        <Popover open={speedPopoverOpen} onOpenChange={setSpeedPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={isNonDefaultSpeed ? "secondary" : "ghost"}
              size="sm"
              className={`h-8 px-2 gap-1 shrink-0 font-mono text-xs ${
                isNonDefaultSpeed ? "text-primary border-primary/30" : ""
              }`}
              aria-label="Playback speed"
            >
              <Gauge className="h-3.5 w-3.5" />
              <span>{formatSpeed(speed)}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="end" side="top">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Playback Speed</span>
                <span className="text-xs text-muted-foreground font-mono">
                  {state.tempo} BPM
                </span>
              </div>

              {/* Speed slider */}
              <div className="space-y-1.5">
                <Slider
                  value={[speed * 100]}
                  onValueChange={handleSpeedSlider}
                  min={25}
                  max={400}
                  step={5}
                  className="cursor-pointer"
                  aria-label="Speed slider"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>0.25×</span>
                  <span>1×</span>
                  <span>4×</span>
                </div>
              </div>

              {/* Preset buttons */}
              <div className="flex flex-wrap gap-1.5">
                {SPEED_PRESETS.map((preset) => (
                  <Button
                    key={preset}
                    variant={speed === preset ? "default" : "outline"}
                    size="sm"
                    className="h-7 px-2.5 text-xs font-mono"
                    onClick={() => {
                      handleSpeedChange(preset);
                    }}
                  >
                    {formatSpeed(preset)}
                  </Button>
                ))}
              </div>

              {/* Reset button */}
              {isNonDefaultSpeed && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-7 text-xs"
                  onClick={() => handleSpeedChange(1)}
                >
                  Reset to 1×
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
