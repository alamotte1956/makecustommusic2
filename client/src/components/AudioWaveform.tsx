import { useRef, useEffect, useState, useCallback, useMemo } from "react";

/**
 * Extract normalised amplitude peaks from an AudioBuffer.
 * Returns an array of values in [0, 1] representing the waveform shape.
 */
export function extractPeaks(audioBuffer: AudioBuffer, barCount: number): number[] {
  const channelData = audioBuffer.getChannelData(0); // mono or left channel
  const samplesPerBar = Math.floor(channelData.length / barCount);
  const peaks: number[] = [];

  for (let i = 0; i < barCount; i++) {
    let max = 0;
    const start = i * samplesPerBar;
    const end = Math.min(start + samplesPerBar, channelData.length);
    for (let j = start; j < end; j++) {
      const abs = Math.abs(channelData[j]);
      if (abs > max) max = abs;
    }
    peaks.push(max);
  }

  // Normalise to [0, 1]
  const globalMax = Math.max(...peaks, 0.001);
  return peaks.map((p) => p / globalMax);
}

interface AudioWaveformProps {
  /** The File object to decode and visualise */
  file: File;
  /** Current playback position in seconds */
  currentTime: number;
  /** Total duration of the audio in seconds */
  duration: number;
  /** Called when the user clicks on the waveform to seek */
  onSeek: (time: number) => void;
  /** Whether audio is currently playing */
  isPlaying?: boolean;
  /** Height of the waveform in pixels */
  height?: number;
  /** Color for the played portion */
  playedColor?: string;
  /** Color for the unplayed portion */
  unplayedColor?: string;
  /** Color for the cursor line */
  cursorColor?: string;
}

export default function AudioWaveform({
  file,
  currentTime,
  duration,
  onSeek,
  isPlaying = false,
  height = 64,
  playedColor = "#7c3aed",   // violet-600
  unplayedColor = "#e0d4f5", // light violet
  cursorColor = "#5b21b6",   // violet-800
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [peaks, setPeaks] = useState<number[] | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [hoverX, setHoverX] = useState<number | null>(null);

  // Number of bars based on container width (one bar every ~3px)
  const barCount = useMemo(() => Math.max(50, Math.floor(containerWidth / 3)), [containerWidth]);

  // Decode the audio file to extract peaks
  useEffect(() => {
    let cancelled = false;
    setIsDecoding(true);
    setPeaks(null);

    const decode = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const audioCtx = new AudioContext();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        if (!cancelled) {
          const extracted = extractPeaks(audioBuffer, barCount);
          setPeaks(extracted);
        }
        await audioCtx.close();
      } catch (err) {
        console.warn("[AudioWaveform] Failed to decode audio:", err);
        if (!cancelled) setPeaks(null);
      } finally {
        if (!cancelled) setIsDecoding(false);
      }
    };

    if (barCount > 0) decode();
    return () => { cancelled = true; };
  }, [file, barCount]);

  // Track container width via ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(Math.floor(entry.contentRect.width));
        }
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Draw the waveform on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !peaks || peaks.length === 0 || containerWidth === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = containerWidth;
    const h = height;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    const barWidth = Math.max(1, (w / peaks.length) - 1);
    const gap = 1;
    const playedFraction = duration > 0 ? currentTime / duration : 0;
    const playedX = playedFraction * w;

    const centerY = h / 2;
    const maxBarHeight = h * 0.85; // leave some padding
    const minBarHeight = 2;

    for (let i = 0; i < peaks.length; i++) {
      const x = (i / peaks.length) * w;
      const barH = Math.max(minBarHeight, peaks[i] * maxBarHeight);
      const y = centerY - barH / 2;

      // Color based on whether this bar is in the played region
      ctx.fillStyle = x < playedX ? playedColor : unplayedColor;
      ctx.beginPath();
      // Rounded bars
      const radius = Math.min(barWidth / 2, 1.5);
      ctx.roundRect(x, y, barWidth, barH, radius);
      ctx.fill();
    }

    // Draw cursor line at current position
    if (duration > 0 && currentTime > 0) {
      ctx.strokeStyle = cursorColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(playedX, 2);
      ctx.lineTo(playedX, h - 2);
      ctx.stroke();
    }

    // Draw hover indicator
    if (hoverX !== null) {
      ctx.strokeStyle = "rgba(124, 58, 237, 0.3)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hoverX, 2);
      ctx.lineTo(hoverX, h - 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [peaks, currentTime, duration, containerWidth, height, playedColor, unplayedColor, cursorColor, hoverX]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || duration <= 0) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const fraction = Math.max(0, Math.min(1, x / rect.width));
      onSeek(fraction * duration);
    },
    [duration, onSeek]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      setHoverX(e.clientX - rect.left);
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setHoverX(null);
  }, []);

  return (
    <div ref={containerRef} className="w-full relative">
      {isDecoding && !peaks ? (
        <div
          className="w-full flex items-center justify-center"
          style={{ height }}
        >
          {/* Skeleton bars while decoding */}
          <div className="flex items-center gap-[1px] w-full h-full px-1">
            {Array.from({ length: 60 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 bg-violet-100 rounded-full animate-pulse"
                style={{
                  height: `${20 + Math.sin(i * 0.3) * 30 + Math.random() * 20}%`,
                  animationDelay: `${i * 20}ms`,
                }}
              />
            ))}
          </div>
        </div>
      ) : peaks && peaks.length > 0 ? (
        <canvas
          ref={canvasRef}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full cursor-pointer"
          style={{ height }}
        />
      ) : null}
    </div>
  );
}
