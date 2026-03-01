import { useEffect, useState, useRef, useCallback } from "react";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { createPortal } from "react-dom";

export default function TourTooltip() {
  const {
    isActive,
    currentStep,
    currentTourStep,
    totalSteps,
    nextStep,
    prevStep,
    skipTour,
  } = useOnboarding();

  const [tooltipPos, setTooltipPos] = useState<{
    top: number;
    left: number;
    arrowSide: "top" | "bottom" | "left" | "right";
  } | null>(null);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [ready, setReady] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const calculatePosition = useCallback(
    (rect: DOMRect) => {
      const placement = currentTourStep?.placement ?? "bottom";
      const tooltipWidth = 360;
      const tooltipHeight = 200;
      const gap = 16;

      let top = 0;
      let left = 0;
      let arrowSide: "top" | "bottom" | "left" | "right" = "top";

      switch (placement) {
        case "bottom":
          top = rect.bottom + gap;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          arrowSide = "top";
          break;
        case "top":
          top = rect.top - tooltipHeight - gap;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          arrowSide = "bottom";
          break;
        case "left":
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.left - tooltipWidth - gap;
          arrowSide = "right";
          break;
        case "right":
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.right + gap;
          arrowSide = "left";
          break;
      }

      // Clamp to viewport
      left = Math.max(12, Math.min(left, window.innerWidth - tooltipWidth - 12));
      top = Math.max(12, Math.min(top, window.innerHeight - tooltipHeight - 12));

      setTooltipPos({ top, left, arrowSide });
    },
    [currentTourStep]
  );

  const positionTooltip = useCallback(() => {
    if (!currentTourStep) return;

    const el = document.querySelector(currentTourStep.target);
    if (!el) {
      setHighlightRect(null);
      setTooltipPos(null);
      setReady(false);
      return;
    }

    const rect = el.getBoundingClientRect();
    setHighlightRect(rect);

    // Scroll element into view if needed
    const isInView = rect.top >= 70 && rect.bottom <= window.innerHeight - 40;
    if (!isInView) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        const newRect = el.getBoundingClientRect();
        setHighlightRect(newRect);
        calculatePosition(newRect);
        setReady(true);
      }, 450);
      return;
    }

    calculatePosition(rect);
    setReady(true);
  }, [currentTourStep, calculatePosition]);

  // Reposition on step change, scroll, resize
  useEffect(() => {
    if (!isActive || !currentTourStep) {
      setReady(false);
      return;
    }

    setReady(false);
    const timer = setTimeout(positionTooltip, 180);

    const handleReposition = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(positionTooltip);
    };

    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [isActive, currentTourStep, positionTooltip]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        skipTour();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        nextStep();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevStep();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, nextStep, prevStep, skipTour]);

  if (!isActive || !currentTourStep) return null;

  const progress = ((currentStep + 1) / totalSteps) * 100;
  const isGeneratorPhase = currentStep < 5;

  return createPortal(
    <>
      {/* Full-screen overlay — blocks interaction and dismisses on click */}
      <div
        className="fixed inset-0 z-[9998]"
        onClick={skipTour}
        style={{
          background: highlightRect
            ? `radial-gradient(ellipse ${Math.max(highlightRect.width, highlightRect.height) * 1.2 + 80}px ${Math.max(highlightRect.width, highlightRect.height) * 1.2 + 80}px at ${highlightRect.left + highlightRect.width / 2}px ${highlightRect.top + highlightRect.height / 2}px, transparent 0%, rgba(0,0,0,0.55) 100%)`
            : "rgba(0,0,0,0.55)",
          transition: "background 0.3s ease",
        }}
      />

      {/* Highlight ring around target element */}
      {highlightRect && ready && (
        <div
          className="fixed z-[9999] pointer-events-none rounded-xl ring-2 ring-primary/70 shadow-[0_0_24px_rgba(139,92,246,0.25)]"
          style={{
            top: highlightRect.top - 6,
            left: highlightRect.left - 6,
            width: highlightRect.width + 12,
            height: highlightRect.height + 12,
            transition: "all 0.3s ease-in-out",
          }}
        />
      )}

      {/* Tooltip card */}
      {ready && tooltipPos && (
        <div
          ref={tooltipRef}
          className="fixed z-[10000] w-[340px] sm:w-[360px] bg-card text-card-foreground border border-border rounded-xl shadow-2xl overflow-hidden"
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
            transition: "top 0.3s ease, left 0.3s ease",
            animation: "tourFadeIn 0.25s ease-out",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Phase label + close */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-primary/5 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-primary" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {isGeneratorPhase ? "Creating Music" : "Song Results"} — {currentStep + 1}/{totalSteps}
              </span>
            </div>
            <button
              onClick={skipTour}
              className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Close tour (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-5 py-4">
            <h3 className="font-semibold text-sm text-foreground mb-1.5">
              {currentTourStep.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {currentTourStep.description}
            </p>
          </div>

          {/* Progress bar */}
          <div className="px-5 pb-3">
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={skipTour}
              className="text-muted-foreground text-xs h-8"
            >
              Skip Tour
            </Button>
            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button variant="outline" size="sm" onClick={prevStep} className="h-8 px-3 text-xs">
                  <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
                  Back
                </Button>
              )}
              <Button size="sm" onClick={nextStep} className="h-8 px-3 text-xs">
                {currentStep === totalSteps - 1 ? (
                  "Finish"
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Inline animation keyframes */}
      <style>{`
        @keyframes tourFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>,
    document.body
  );
}
