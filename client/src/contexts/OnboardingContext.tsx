import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export interface TourStep {
  id: string;
  target: string; // CSS selector for the element to highlight
  title: string;
  description: string;
  placement?: "top" | "bottom" | "left" | "right";
  page?: string; // route this step belongs to
}

const GENERATOR_STEPS: TourStep[] = [
  {
    id: "creation-mode",
    target: "[data-tour='creation-mode']",
    title: "Choose How to Create",
    description: "Pick a creation mode: describe your song with keywords, write your own lyrics, or let AI generate lyrics for you.",
    placement: "bottom",
    page: "/generate",
  },
  {
    id: "content-input",
    target: "[data-tour='content-input']",
    title: "Enter Your Content",
    description: "Type your keywords, lyrics, or a description. The more detail you give, the better your song will sound.",
    placement: "bottom",
    page: "/generate",
  },
  {
    id: "genre-mood",
    target: "[data-tour='genre-mood']",
    title: "Set Genre & Mood",
    description: "Choose a genre like Pop, Rock, or Jazz, and set the mood. These shape the style and feel of your music.",
    placement: "bottom",
    page: "/generate",
  },
  {
    id: "vocals-duration",
    target: "[data-tour='vocals-duration']",
    title: "Vocals & Duration",
    description: "Pick a vocal style and set how long your song should be. Longer songs have more complete arrangements.",
    placement: "bottom",
    page: "/generate",
  },
  {
    id: "generate-button",
    target: "[data-tour='generate-button']",
    title: "Generate Your Song",
    description: "Hit the Generate button and our AI will compose, arrange, and produce your song. It usually takes about 30 seconds.",
    placement: "top",
    page: "/generate",
  },
];

const RESULT_STEPS: TourStep[] = [
  {
    id: "audio-player",
    target: "[data-tour='audio-player']",
    title: "Listen to Your Song",
    description: "Your song is ready! Press play to hear it. You can also download the MP3 file.",
    placement: "bottom",
    page: "/songs/:id",
  },
  {
    id: "sheet-music-tab",
    target: "[data-tour='sheet-music-tab']",
    title: "View Sheet Music",
    description: "Click the Sheet Music tab to see the musical notation. You can transpose to any key and download as a PDF.",
    placement: "bottom",
    page: "/songs/:id",
  },
  {
    id: "chords-tab",
    target: "[data-tour='chords-tab']",
    title: "Guitar Chords",
    description: "The Chords tab shows guitar chord diagrams with fingering positions. Transpose and download as PDF too.",
    placement: "bottom",
    page: "/songs/:id",
  },
  {
    id: "lyrics-tab",
    target: "[data-tour='lyrics-tab']",
    title: "Lyrics & Download",
    description: "View the full lyrics here. You can download them as a clean, formatted PDF document.",
    placement: "bottom",
    page: "/songs/:id",
  },
];

const ALL_STEPS = [...GENERATOR_STEPS, ...RESULT_STEPS];

const STORAGE_KEY = "onboarding_completed";
const TOUR_STEP_KEY = "onboarding_step";

interface OnboardingContextType {
  isActive: boolean;
  currentStep: number;
  currentTourStep: TourStep | null;
  totalSteps: number;
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  hasCompletedTour: boolean;
  generatorSteps: TourStep[];
  resultSteps: TourStep[];
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompletedTour, setHasCompletedTour] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  // Restore step on mount
  useEffect(() => {
    try {
      const savedStep = localStorage.getItem(TOUR_STEP_KEY);
      if (savedStep) {
        const step = parseInt(savedStep, 10);
        if (!isNaN(step) && step >= 0 && step < ALL_STEPS.length) {
          setCurrentStep(step);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
    try {
      localStorage.setItem(TOUR_STEP_KEY, "0");
    } catch {
      // ignore
    }
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => {
      const next = prev + 1;
      if (next >= ALL_STEPS.length) {
        setIsActive(false);
        setHasCompletedTour(true);
        try {
          localStorage.setItem(STORAGE_KEY, "true");
          localStorage.removeItem(TOUR_STEP_KEY);
        } catch {
          // ignore
        }
        return prev;
      }
      try {
        localStorage.setItem(TOUR_STEP_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => {
      const next = Math.max(0, prev - 1);
      try {
        localStorage.setItem(TOUR_STEP_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const skipTour = useCallback(() => {
    setIsActive(false);
    setHasCompletedTour(true);
    try {
      localStorage.setItem(STORAGE_KEY, "true");
      localStorage.removeItem(TOUR_STEP_KEY);
    } catch {
      // ignore
    }
  }, []);

  const currentTourStep = isActive ? ALL_STEPS[currentStep] ?? null : null;

  return (
    <OnboardingContext.Provider
      value={{
        isActive,
        currentStep,
        currentTourStep,
        totalSteps: ALL_STEPS.length,
        startTour,
        nextStep,
        prevStep,
        skipTour,
        hasCompletedTour,
        generatorSteps: GENERATOR_STEPS,
        resultSteps: RESULT_STEPS,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}
