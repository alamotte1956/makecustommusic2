import { useState, useEffect, useRef } from "react";
import { CheckCircle2, Loader2, Music, Headphones, FileAudio, Sparkles } from "lucide-react";

type ProcessingStep = "idle" | "uploading" | "transcribing" | "analyzing" | "generating" | "done" | "error";

interface ProcessingProgressProps {
  step: ProcessingStep;
}

const STEPS = [
  {
    key: "uploading" as const,
    label: "Uploading Audio",
    description: "Preparing and encoding your audio file...",
    icon: FileAudio,
    targetPct: 15,
  },
  {
    key: "transcribing" as const,
    label: "Transcribing Audio",
    description: "AI is listening to your music and identifying notes, chords, and rhythm...",
    icon: Headphones,
    targetPct: 50,
  },
  {
    key: "generating" as const,
    label: "Generating Sheet Music",
    description: "Converting musical analysis into professional notation with chord symbols...",
    icon: Music,
    targetPct: 85,
  },
];

function getStepIndex(step: ProcessingStep): number {
  if (step === "uploading") return 0;
  if (step === "transcribing" || step === "analyzing") return 1;
  if (step === "generating") return 2;
  return -1;
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export function ProcessingProgress({ step }: ProcessingProgressProps) {
  const [elapsed, setElapsed] = useState(0);
  const [smoothPct, setSmoothPct] = useState(0);
  const startTimeRef = useRef(Date.now());
  const animFrameRef = useRef<number | null>(null);

  // Elapsed timer
  useEffect(() => {
    startTimeRef.current = Date.now();
    setElapsed(0);
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Smooth progress animation — interpolates toward target percentage
  useEffect(() => {
    const currentStepIdx = getStepIndex(step);
    const targetPct = currentStepIdx >= 0 ? STEPS[currentStepIdx].targetPct : 0;

    const animate = () => {
      setSmoothPct((prev) => {
        const diff = targetPct - prev;
        if (Math.abs(diff) < 0.3) return targetPct;
        // Ease toward target: faster when far, slower when close
        return prev + diff * 0.04;
      });
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [step]);

  const currentStepIdx = getStepIndex(step);
  const currentStepInfo = currentStepIdx >= 0 ? STEPS[currentStepIdx] : null;
  const CurrentIcon = currentStepInfo?.icon || Sparkles;

  // Estimated time remaining based on step
  const getEstimate = () => {
    if (step === "uploading") return "A few seconds...";
    if (step === "transcribing" || step === "analyzing") return "~20-40 seconds";
    if (step === "generating") return "~15-30 seconds";
    return "";
  };

  return (
    <div className="mt-6 bg-card rounded-xl border border-violet-200/50 overflow-hidden">
      {/* Animated header band */}
      <div className="relative bg-gradient-to-r from-violet-600 via-purple-600 to-violet-600 px-6 py-4 overflow-hidden">
        {/* Shimmer overlay */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
            animation: "shimmer 2s ease-in-out infinite",
          }}
        />

        <div className="relative flex items-center gap-4">
          {/* Animated icon */}
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <CurrentIcon className="h-6 w-6 text-white animate-pulse" />
            </div>
            {/* Rotating ring */}
            <svg className="absolute inset-0 w-12 h-12 animate-spin" style={{ animationDuration: "3s" }} viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="22" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeDasharray="20 120" strokeLinecap="round" />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-lg truncate">
              {currentStepInfo?.label || "Processing..."}
            </p>
            <p className="text-white/70 text-sm truncate">
              {currentStepInfo?.description || "Please wait..."}
            </p>
          </div>

          <div className="text-right flex-shrink-0">
            <p className="text-white font-bold text-2xl tabular-nums">
              {Math.round(smoothPct)}%
            </p>
            <p className="text-white/60 text-xs tabular-nums">
              {formatElapsed(elapsed)} elapsed
            </p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-6 pt-4">
        <div className="relative h-3 bg-violet-100 rounded-full overflow-hidden">
          {/* Background pulse */}
          <div className="absolute inset-0 bg-violet-50 animate-pulse" style={{ animationDuration: "2s" }} />
          {/* Fill bar */}
          <div
            className="relative h-full rounded-full transition-none overflow-hidden"
            style={{
              width: `${smoothPct}%`,
              background: "linear-gradient(90deg, #7c3aed, #8b5cf6, #a78bfa, #8b5cf6, #7c3aed)",
              backgroundSize: "200% 100%",
              animation: "gradientShift 2s ease infinite",
            }}
          >
            {/* Shimmer on the fill */}
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
                animation: "shimmer 1.5s ease-in-out infinite",
              }}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 text-right">
          Estimated: {getEstimate()}
        </p>
      </div>

      {/* Step indicators */}
      <div className="px-6 pb-5 pt-3">
        <div className="flex items-start justify-between gap-2">
          {STEPS.map((s, i) => {
            const isDone = i < currentStepIdx;
            const isCurrent = i === currentStepIdx;
            const isPending = i > currentStepIdx;
            const StepIcon = s.icon;

            return (
              <div key={s.key} className="flex-1 flex flex-col items-center text-center gap-1.5">
                {/* Connector + Circle */}
                <div className="flex items-center w-full">
                  {/* Left connector */}
                  {i > 0 && (
                    <div className={`flex-1 h-0.5 rounded-full transition-colors duration-500 ${
                      isDone || isCurrent ? "bg-violet-500" : "bg-violet-100"
                    }`} />
                  )}
                  {i === 0 && <div className="flex-1" />}

                  {/* Circle */}
                  <div className={`relative w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                    isDone
                      ? "bg-green-500 text-white shadow-md shadow-green-200"
                      : isCurrent
                        ? "bg-violet-600 text-white shadow-lg shadow-violet-300 ring-4 ring-violet-200"
                        : "bg-violet-50 text-violet-300 border-2 border-violet-200"
                  }`}>
                    {isDone ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : isCurrent ? (
                      <StepIcon className="h-5 w-5 animate-pulse" />
                    ) : (
                      <StepIcon className="h-4 w-4" />
                    )}
                    {isCurrent && (
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-violet-400 rounded-full animate-ping" />
                    )}
                  </div>

                  {/* Right connector */}
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 rounded-full transition-colors duration-500 ${
                      isDone ? "bg-violet-500" : "bg-violet-100"
                    }`} />
                  )}
                  {i === STEPS.length - 1 && <div className="flex-1" />}
                </div>

                {/* Label */}
                <span className={`text-xs font-medium leading-tight mt-1 ${
                  isDone ? "text-green-600" : isCurrent ? "text-violet-700" : "text-muted-foreground"
                }`}>
                  {s.label}
                </span>
                {isCurrent && (
                  <Loader2 className="h-3 w-3 animate-spin text-violet-500" />
                )}
                {isDone && (
                  <span className="text-[10px] text-green-500 font-medium">Complete</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}
