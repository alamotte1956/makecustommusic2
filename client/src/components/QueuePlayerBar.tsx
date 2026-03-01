import { useQueuePlayer } from "@/contexts/QueuePlayerContext";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  X, Loader2, ListMusic, Music, Shuffle, ChevronUp, ChevronDown
} from "lucide-react";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";

function formatTime(time: number): string {
  if (isNaN(time) || time < 0) return "0:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Mini waveform visualization for the queue player bar.
 * Supports both mouse and touch events for cross-browser/mobile compatibility.
 */
function MiniWaveform({
  progress,
  onSeek,
}: {
  progress: number;
  onSeek: (progress: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredProgress, setHoveredProgress] = useState<number | null>(null);
  const animationRef = useRef(0);

  const peaks = useMemo(() => {
    const barCount = 60;
    return Array.from({ length: barCount }, (_, i) => {
      const x = i / barCount;
      return 0.2 + 0.6 * Math.abs(Math.sin(x * Math.PI * 3.7)) * (0.4 + 0.6 * Math.abs(Math.cos(x * Math.PI * 7.3)));
    });
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const barCount = peaks.length;
    const gap = 1.5;
    const barWidth = (w - gap * (barCount - 1)) / barCount;
    const minBarHeight = 2;
    const maxBarHeight = h - 2;
    const borderRadius = Math.max(barWidth / 2, 1);

    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < barCount; i++) {
      const peak = peaks[i];
      const barHeight = Math.max(minBarHeight, peak * maxBarHeight);
      const x = i * (barWidth + gap);
      const y = (h - barHeight) / 2;
      const barProgress = (i + 0.5) / barCount;

      let color: string;
      if (barProgress <= progress) {
        color = "oklch(0.541 0.281 293.009)";
      } else if (hoveredProgress !== null && barProgress <= hoveredProgress) {
        color = "oklch(0.7 0.15 293)";
      } else {
        color = "oklch(0.4 0.05 293)";
      }

      ctx.fillStyle = color;
      ctx.beginPath();
      // roundRect fallback for older browsers
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(x, y, barWidth, barHeight, borderRadius);
      } else {
        // Fallback: simple rect
        ctx.rect(x, y, barWidth, barHeight);
      }
      ctx.fill();
    }
  }, [peaks, progress, hoveredProgress]);

  useEffect(() => {
    const animate = () => {
      draw();
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [draw]);

  useEffect(() => {
    const observer = new ResizeObserver(() => draw());
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [draw]);

  const getProgressFromEvent = useCallback((clientX: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  return (
    <div ref={containerRef} className="w-full h-8 touch-none">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer"
        onClick={(e) => onSeek(getProgressFromEvent(e.clientX))}
        onMouseMove={(e) => setHoveredProgress(getProgressFromEvent(e.clientX))}
        onMouseLeave={() => setHoveredProgress(null)}
        onTouchStart={(e) => {
          e.preventDefault();
          const touch = e.touches[0];
          if (touch) onSeek(getProgressFromEvent(touch.clientX));
        }}
        onTouchMove={(e) => {
          e.preventDefault();
          const touch = e.touches[0];
          if (touch) onSeek(getProgressFromEvent(touch.clientX));
        }}
      />
    </div>
  );
}

/**
 * Simple progress bar fallback for very small screens.
 */
function ProgressBar({
  progress,
  onSeek,
}: {
  progress: number;
  onSeek: (progress: number) => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);

  const getProgressFromEvent = useCallback((clientX: number) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  return (
    <div
      ref={barRef}
      className="w-full h-1.5 bg-muted rounded-full cursor-pointer touch-none relative"
      onClick={(e) => onSeek(getProgressFromEvent(e.clientX))}
      onTouchStart={(e) => {
        e.preventDefault();
        const touch = e.touches[0];
        if (touch) onSeek(getProgressFromEvent(touch.clientX));
      }}
      onTouchMove={(e) => {
        e.preventDefault();
        const touch = e.touches[0];
        if (touch) onSeek(getProgressFromEvent(touch.clientX));
      }}
    >
      <div
        className="absolute inset-y-0 left-0 bg-primary rounded-full transition-[width] duration-100"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}

export default function QueuePlayerBar() {
  const {
    queue,
    currentIndex,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    volume,
    isMuted,
    queueName,
    isShuffled,
    playOrder,
    playOrderPosition,
    togglePlay,
    next,
    previous,
    seekTo,
    setVolume,
    toggleMute,
    toggleShuffle,
    clearQueue,
    currentSong,
    jumpTo,
  } = useQueuePlayer();

  const [showQueue, setShowQueue] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (queue.length === 0) return null;

  const progress = duration > 0 ? currentTime / duration : 0;
  const hasNext = playOrderPosition < playOrder.length - 1;
  const hasPrevious = playOrderPosition > 0;

  const displayOrder = isShuffled ? playOrder : queue.map((_, i) => i);

  return (
    <>
      {/* Queue list overlay */}
      {showQueue && (
        <div className="fixed inset-0 z-[59] bg-black/30" onClick={() => setShowQueue(false)}>
          <div
            className="absolute bottom-[72px] sm:bottom-[72px] right-2 sm:right-4 left-2 sm:left-auto sm:w-80 max-h-[60vh] sm:max-h-96 bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-border flex items-center justify-between">
              <span className="text-sm font-semibold text-card-foreground">
                {queueName || "Queue"} ({queue.length} songs)
                {isShuffled && (
                  <span className="ml-1.5 text-xs text-primary font-normal">
                    — Shuffled
                  </span>
                )}
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowQueue(false)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="overflow-y-auto max-h-[calc(60vh-48px)] sm:max-h-[320px]">
              {displayOrder.map((queueIdx, displayPos) => {
                const song = queue[queueIdx];
                if (!song) return null;
                return (
                  <button
                    key={`${song.id}-${displayPos}`}
                    onClick={() => {
                      jumpTo(queueIdx);
                      setShowQueue(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors hover:bg-accent active:bg-accent ${
                      queueIdx === currentIndex ? "bg-primary/10" : ""
                    }`}
                  >
                    <span className="text-xs text-muted-foreground font-mono w-5 text-right shrink-0">
                      {queueIdx === currentIndex && isPlaying ? (
                        <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
                      ) : (
                        displayPos + 1
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm truncate ${queueIdx === currentIndex ? "font-semibold text-primary" : "text-card-foreground"}`}>
                        {song.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[song.genre, song.mood].filter(Boolean).join(" · ") || song.keywords}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Player bar */}
      <div className="fixed bottom-0 left-0 right-0 z-[60] border-t border-border bg-card/95 backdrop-blur-lg shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        {/* ─── MOBILE LAYOUT (< sm) ─── */}
        <div className="sm:hidden">
          {/* Compact bar */}
          <div className="flex items-center gap-2 h-[56px] px-3">
            {/* Song icon */}
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              {isLoading ? (
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              ) : (
                <Music className="w-4 h-4 text-primary" />
              )}
            </div>

            {/* Song info */}
            <div className="min-w-0 flex-1" onClick={() => setExpanded(!expanded)}>
              <p className="text-sm font-medium text-card-foreground truncate">
                {currentSong?.title || "No song"}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {formatTime(currentTime)} / {formatTime(duration)}
              </p>
            </div>

            {/* Core controls */}
            <div className="flex items-center gap-0.5 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={previous}
                disabled={!hasPrevious && currentTime < 3}
              >
                <SkipBack className="w-4 h-4" />
              </Button>
              <Button
                variant="default"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={togglePlay}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4 ml-0.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={next}
                disabled={!hasNext}
              >
                <SkipForward className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Progress bar (always visible on mobile) */}
          <div className="px-3 pb-1">
            <ProgressBar
              progress={progress}
              onSeek={(p) => seekTo(p * duration)}
            />
          </div>

          {/* Expanded mobile controls */}
          {expanded && (
            <div className="px-3 pb-3 pt-1 space-y-2 border-t border-border/50">
              {/* Waveform */}
              <MiniWaveform
                progress={progress}
                onSeek={(p) => seekTo(p * duration)}
              />

              {/* Time display */}
              <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>

              {/* Extra controls row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 ${isShuffled ? "text-primary" : ""}`}
                    onClick={toggleShuffle}
                  >
                    <Shuffle className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={toggleMute}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    max={1}
                    step={0.01}
                    onValueChange={(v) => setVolume(v[0])}
                    className="w-20"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShowQueue(!showQueue)}
                  >
                    <ListMusic className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={clearQueue}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── DESKTOP LAYOUT (>= sm) ─── */}
        <div className="hidden sm:block">
          <div className="container flex items-center gap-3 h-[72px] px-4">
            {/* Song info */}
            <div className="flex items-center gap-3 w-48 shrink-0">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                {isLoading ? (
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                ) : (
                  <Music className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-card-foreground truncate">
                  {currentSong?.title || "No song"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {currentSong
                    ? [currentSong.genre, currentSong.mood].filter(Boolean).join(" · ") || currentSong.keywords
                    : ""}
                </p>
              </div>
            </div>

            {/* Center controls + waveform */}
            <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
              {/* Transport controls */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 ${isShuffled ? "text-primary" : ""}`}
                  onClick={toggleShuffle}
                  title={isShuffled ? "Disable shuffle" : "Enable shuffle"}
                >
                  <Shuffle className="w-4 h-4" />
                  {isShuffled && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={previous}
                  disabled={!hasPrevious && currentTime < 3}
                >
                  <SkipBack className="w-4 h-4" />
                </Button>
                <Button
                  variant="default"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={togglePlay}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4 ml-0.5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={next}
                  disabled={!hasNext}
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
              </div>

              {/* Waveform + time */}
              <div className="flex items-center gap-2 w-full max-w-lg">
                <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right shrink-0">
                  {formatTime(currentTime)}
                </span>
                <MiniWaveform
                  progress={progress}
                  onSeek={(p) => seekTo(p * duration)}
                />
                <span className="text-[10px] text-muted-foreground tabular-nums w-8 shrink-0">
                  {formatTime(duration)}
                </span>
              </div>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={toggleMute}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.01}
                onValueChange={(v) => setVolume(v[0])}
                className="w-20"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 ml-1"
                onClick={() => setShowQueue(!showQueue)}
                title="Show queue"
              >
                <ListMusic className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={clearQueue}
                title="Close player"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
