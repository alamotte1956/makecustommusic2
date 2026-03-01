import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Square, Volume2, VolumeX, ChevronDown, ChevronUp } from "lucide-react";
import { useMetronome, type MetronomeState, type MetronomeControls } from "@/hooks/useMetronome";

interface MetronomeProps {
  bpm: number;
  strummingPattern: string;
  timeSignature: string;
  sectionName?: string;
}

/** Single beat indicator circle */
function BeatIndicator({
  beat,
  isActive,
  index,
}: {
  beat: { direction: string; accent: boolean };
  isActive: boolean;
  index: number;
}) {
  const isDown = beat.direction === "D";
  const isUp = beat.direction === "U";
  const isMuted = beat.direction === "x";
  const isRest = beat.direction === ".";

  // Color based on direction
  let bgColor = "bg-muted";
  let activeColor = "bg-primary";
  let label = "";
  let arrowIcon = null;

  if (isDown) {
    activeColor = "bg-indigo-500";
    label = "D";
    arrowIcon = (
      <ChevronDown className="w-3 h-3" />
    );
  } else if (isUp) {
    activeColor = "bg-violet-500";
    label = "U";
    arrowIcon = (
      <ChevronUp className="w-3 h-3" />
    );
  } else if (isMuted) {
    activeColor = "bg-zinc-500";
    label = "x";
  } else if (isRest) {
    activeColor = "bg-zinc-700";
    label = "·";
  }

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Arrow direction indicator */}
      <div
        className={`transition-all duration-75 ${
          isActive ? "text-white scale-125" : "text-muted-foreground/50 scale-100"
        }`}
      >
        {arrowIcon || <span className="text-[10px] w-3 h-3 flex items-center justify-center">{label}</span>}
      </div>

      {/* Beat circle */}
      <div
        className={`
          w-8 h-8 rounded-full flex items-center justify-center
          transition-all duration-75 font-mono text-xs font-bold
          ${isActive
            ? `${activeColor} text-white shadow-lg shadow-primary/30 scale-110 ring-2 ring-white/30`
            : `${bgColor} text-muted-foreground/60 scale-100`
          }
          ${beat.accent ? "ring-1 ring-primary/30" : ""}
        `}
      >
        {index + 1}
      </div>

      {/* Direction label below */}
      <span
        className={`text-[10px] font-mono transition-colors duration-75 ${
          isActive ? "text-foreground font-bold" : "text-muted-foreground/40"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

/** Strum pattern visualization bar */
function StrumPatternBar({
  state,
}: {
  state: MetronomeState;
}) {
  const { beats, currentBeat } = state;

  return (
    <div className="flex items-center justify-center gap-2 py-2 flex-wrap">
      {beats.map((beat, i) => (
        <BeatIndicator
          key={i}
          beat={beat}
          isActive={currentBeat === i}
          index={i}
        />
      ))}
    </div>
  );
}

/** Main Metronome component */
export default function Metronome({ bpm, strummingPattern, timeSignature, sectionName }: MetronomeProps) {
  const [state, controls] = useMetronome(bpm, strummingPattern, timeSignature);
  const [showControls, setShowControls] = useState(false);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header with play button and info */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant={state.isPlaying ? "destructive" : "default"}
            onClick={controls.toggle}
            className="w-9 h-9 p-0 rounded-full"
          >
            {state.isPlaying ? (
              <Square className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5 ml-0.5" />
            )}
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Metronome</span>
              {sectionName && (
                <span className="text-xs text-muted-foreground">— {sectionName}</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono font-bold text-foreground">{state.bpm} BPM</span>
              <span>·</span>
              <span>{timeSignature}</span>
              <span>·</span>
              <span className="font-mono">{strummingPattern || "D D D D"}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Volume toggle */}
          <Button
            size="sm"
            variant="ghost"
            className="w-8 h-8 p-0"
            onClick={() => controls.setVolume(state.volume > 0 ? 0 : 0.7)}
          >
            {state.volume > 0 ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4 text-muted-foreground" />
            )}
          </Button>
          {/* Settings toggle */}
          <Button
            size="sm"
            variant="ghost"
            className="w-8 h-8 p-0"
            onClick={() => setShowControls(!showControls)}
          >
            {showControls ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Beat visualization */}
      <div className={`px-4 pb-3 ${state.isPlaying ? "" : "opacity-50"}`}>
        <StrumPatternBar state={state} />
      </div>

      {/* Expanded controls */}
      {showControls && (
        <div className="border-t border-border px-4 py-3 space-y-3 bg-muted/30">
          {/* BPM slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Tempo</label>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-7 h-7 p-0 text-xs"
                  onClick={() => controls.setBpm(state.bpm - 1)}
                >
                  −
                </Button>
                <span className="text-sm font-mono font-bold w-12 text-center">{state.bpm}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-7 h-7 p-0 text-xs"
                  onClick={() => controls.setBpm(state.bpm + 1)}
                >
                  +
                </Button>
              </div>
            </div>
            <Slider
              value={[state.bpm]}
              onValueChange={([val]) => controls.setBpm(val)}
              min={30}
              max={300}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground/50">
              <span>30</span>
              <span>300</span>
            </div>
          </div>

          {/* Volume slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Volume</label>
              <span className="text-xs font-mono text-muted-foreground">{Math.round(state.volume * 100)}%</span>
            </div>
            <Slider
              value={[state.volume * 100]}
              onValueChange={([val]) => controls.setVolume(val / 100)}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
          </div>

          {/* Tap tempo */}
          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs"
            onClick={controls.tapTempo}
          >
            Tap Tempo
          </Button>
        </div>
      )}
    </div>
  );
}
