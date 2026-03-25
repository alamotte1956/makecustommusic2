import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { classifyAudioError, audioRetryToast } from "@/lib/audioRetryToast";

interface AudioPlayerProps {
  src: string;
  title?: string;
  compact?: boolean;
}

const BAR_COUNT = 80;
const COMPACT_BAR_COUNT = 50;

/**
 * Extract waveform peaks from an audio source URL.
 * Uses Web Audio API to decode the audio buffer and compute
 * amplitude peaks for each bar in the visualization.
 * Includes Safari/webkit fallback.
 */
async function extractWaveformData(src: string, barCount: number): Promise<number[]> {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) throw new Error("No AudioContext");

    const audioContext = new AudioCtx();
    const response = await fetch(src);
    const arrayBuffer = await response.arrayBuffer();

    // Safari needs callback-based decodeAudioData in some versions
    const audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
      audioContext.decodeAudioData(
        arrayBuffer,
        (buffer) => resolve(buffer),
        (err) => reject(err)
      );
    });

    const channelData = audioBuffer.getChannelData(0);
    const samplesPerBar = Math.floor(channelData.length / barCount);
    const peaks: number[] = [];

    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      const start = i * samplesPerBar;
      const end = Math.min(start + samplesPerBar, channelData.length);
      for (let j = start; j < end; j++) {
        sum += Math.abs(channelData[j]);
      }
      peaks.push(sum / (end - start));
    }

    // Normalize peaks to 0-1 range
    const maxPeak = Math.max(...peaks, 0.001);
    const normalized = peaks.map((p) => Math.max(p / maxPeak, 0.05));

    audioContext.close();
    return normalized;
  } catch {
    // Fallback: generate deterministic waveform if decoding fails
    return Array.from({ length: barCount }, (_, i) => {
      const x = i / barCount;
      return 0.2 + 0.6 * Math.abs(Math.sin(x * Math.PI * 3)) * (0.5 + 0.5 * Math.abs(Math.cos(x * Math.PI * 5.3)));
    });
  }
}

/**
 * Draw a rounded rectangle with fallback for browsers that don't support roundRect.
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    // Manual fallback for older Safari/Firefox
    const r = Math.min(radius, width / 2, height / 2);
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.arcTo(x + width, y, x + width, y + r, r);
    ctx.lineTo(x + width, y + height - r);
    ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
    ctx.lineTo(x + r, y + height);
    ctx.arcTo(x, y + height, x, y + height - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}

/**
 * Waveform component that renders bars on a canvas element.
 * Supports click-to-seek, touch-to-seek, and shows played/unplayed sections.
 */
function Waveform({
  peaks,
  progress,
  onSeek,
  height = 48,
  compact = false,
}: {
  peaks: number[];
  progress: number;
  onSeek: (progress: number) => void;
  height?: number;
  compact?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredProgress, setHoveredProgress] = useState<number | null>(null);
  const animationRef = useRef<number>(0);

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
    const gap = compact ? 1.5 : 2;
    const barWidth = (w - gap * (barCount - 1)) / barCount;
    const minBarHeight = 3;
    const maxBarHeight = h - 4;
    const borderRadius = Math.max(barWidth / 2, 1.5);

    ctx.clearRect(0, 0, w, h);

    const computedStyle = getComputedStyle(canvas);
    const playedColor = computedStyle.getPropertyValue("--waveform-played").trim() || "#7c3aed";
    const unplayedColor = computedStyle.getPropertyValue("--waveform-unplayed").trim() || "#3f3f46";
    const hoverColor = computedStyle.getPropertyValue("--waveform-hover").trim() || "#a78bfa";

    for (let i = 0; i < barCount; i++) {
      const peak = peaks[i] ?? 0.05;
      const barHeight = Math.max(minBarHeight, peak * maxBarHeight);
      const x = i * (barWidth + gap);
      const y = (h - barHeight) / 2;
      const barProgress = (i + 0.5) / barCount;

      let color: string;
      if (barProgress <= progress) {
        color = playedColor;
      } else if (hoveredProgress !== null && barProgress <= hoveredProgress) {
        color = hoverColor;
      } else {
        color = unplayedColor;
      }

      ctx.fillStyle = color;
      ctx.beginPath();
      drawRoundedRect(ctx, x, y, barWidth, barHeight, borderRadius);
      ctx.fill();
    }
  }, [peaks, progress, hoveredProgress, compact]);

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
    <div ref={containerRef} className="w-full touch-none" style={{ height }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer"
        style={{
          ["--waveform-played" as any]: "oklch(0.541 0.281 293.009)",
          ["--waveform-unplayed" as any]: "oklch(0.4 0.05 293)",
          ["--waveform-hover" as any]: "oklch(0.7 0.15 293)",
        }}
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

export default function AudioPlayer({ src, title, compact = false }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [isLoadingWaveform, setIsLoadingWaveform] = useState(true);

  const barCount = compact ? COMPACT_BAR_COUNT : BAR_COUNT;

  // Extract waveform data when src changes
  useEffect(() => {
    let cancelled = false;
    setIsLoadingWaveform(true);

    // Generate a placeholder waveform immediately
    const placeholder = Array.from({ length: barCount }, (_, i) => {
      const x = i / barCount;
      return 0.15 + 0.3 * Math.abs(Math.sin(x * Math.PI * 4));
    });
    setPeaks(placeholder);

    extractWaveformData(src, barCount).then((data) => {
      if (!cancelled) {
        setPeaks(data);
        setIsLoadingWaveform(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [src, barCount]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };
    // Safari sometimes fires durationchange instead of loadedmetadata
    const handleDurationChange = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const handleEnded = () => setIsPlaying(false);
    const handleError = () => {
      setIsPlaying(false);
      const msg = classifyAudioError(audio.error ?? undefined);
      audioRetryToast(msg, () => {
        audio.load();
      }, `audio-player-${src}`);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [src]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        // Use play() promise for proper error handling across browsers
        await audio.play();
        setIsPlaying(true);
      }
    } catch (err) {
      // Handle autoplay restrictions (common on mobile Safari/Chrome)
      console.warn("Playback failed:", err);
      setIsPlaying(false);
      const msg = classifyAudioError(err);
      audioRetryToast(msg, () => {
        audioRef.current?.load();
      }, `audio-player-${src}`);
    }
  }, [isPlaying]);

  const handleWaveformSeek = useCallback(
    (progress: number) => {
      const audio = audioRef.current;
      if (audio && duration) {
        const newTime = progress * duration;
        audio.currentTime = newTime;
        setCurrentTime(newTime);
      }
    },
    [duration]
  );

  const progress = useMemo(
    () => (duration > 0 ? currentTime / duration : 0),
    [currentTime, duration]
  );

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <audio ref={audioRef} src={src} preload="metadata" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <div className="flex-1 min-w-0">
          <Waveform
            peaks={peaks}
            progress={progress}
            onSeek={handleWaveformSeek}
            height={28}
            compact
          />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
          {formatTime(currentTime)}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-3 sm:p-4 space-y-3">
      <audio ref={audioRef} src={src} preload="metadata" />

      {title && (
        <p className="text-sm font-medium text-card-foreground truncate">{title}</p>
      )}

      {/* Waveform */}
      <div className="space-y-1.5">
        <Waveform
          peaks={peaks}
          progress={progress}
          onSeek={handleWaveformSeek}
          height={56}
        />
        <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <Button
          variant="default"
          size="icon"
          className="h-10 w-10 rounded-full"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsMuted(!isMuted)}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume]}
            max={1}
            step={0.01}
            onValueChange={(v) => {
              setVolume(v[0]);
              setIsMuted(false);
            }}
            className="w-20 sm:w-24"
          />
        </div>
      </div>
    </div>
  );
}
