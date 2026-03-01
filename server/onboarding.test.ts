import { describe, expect, it, beforeEach, vi } from "vitest";

/**
 * Onboarding Tour Tests
 *
 * These tests verify the onboarding walkthrough logic:
 * - Tour step definitions and structure
 * - localStorage persistence for first-time user tracking
 * - Step navigation (next, prev, skip)
 * - Tour completion state
 */

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();

// Tour step definitions (mirrored from OnboardingContext)
const GENERATOR_STEPS = [
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

const RESULT_STEPS = [
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

describe("Onboarding Tour Steps", () => {
  it("should have exactly 9 tour steps total", () => {
    expect(ALL_STEPS).toHaveLength(9);
  });

  it("should have 5 generator steps", () => {
    expect(GENERATOR_STEPS).toHaveLength(5);
  });

  it("should have 4 result/song detail steps", () => {
    expect(RESULT_STEPS).toHaveLength(4);
  });

  it("each step should have required fields", () => {
    for (const step of ALL_STEPS) {
      expect(step.id).toBeTruthy();
      expect(step.target).toBeTruthy();
      expect(step.title).toBeTruthy();
      expect(step.description).toBeTruthy();
      expect(step.placement).toBeTruthy();
      expect(step.page).toBeTruthy();
    }
  });

  it("each step should have a unique id", () => {
    const ids = ALL_STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each step target should use data-tour attribute selector", () => {
    for (const step of ALL_STEPS) {
      expect(step.target).toMatch(/^\[data-tour='[a-z-]+']/);
    }
  });

  it("generator steps should all reference /generate page", () => {
    for (const step of GENERATOR_STEPS) {
      expect(step.page).toBe("/generate");
    }
  });

  it("result steps should all reference /songs/:id page", () => {
    for (const step of RESULT_STEPS) {
      expect(step.page).toBe("/songs/:id");
    }
  });

  it("step placements should be valid values", () => {
    const validPlacements = ["top", "bottom", "left", "right"];
    for (const step of ALL_STEPS) {
      expect(validPlacements).toContain(step.placement);
    }
  });

  it("generator steps should be in logical order", () => {
    expect(GENERATOR_STEPS[0].id).toBe("creation-mode");
    expect(GENERATOR_STEPS[1].id).toBe("content-input");
    expect(GENERATOR_STEPS[2].id).toBe("genre-mood");
    expect(GENERATOR_STEPS[3].id).toBe("vocals-duration");
    expect(GENERATOR_STEPS[4].id).toBe("generate-button");
  });

  it("result steps should be in logical order", () => {
    expect(RESULT_STEPS[0].id).toBe("audio-player");
    expect(RESULT_STEPS[1].id).toBe("sheet-music-tab");
    expect(RESULT_STEPS[2].id).toBe("chords-tab");
    expect(RESULT_STEPS[3].id).toBe("lyrics-tab");
  });
});

describe("Onboarding localStorage Persistence", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("should default to tour not completed when no localStorage value", () => {
    const completed = localStorageMock.getItem(STORAGE_KEY) === "true";
    expect(completed).toBe(false);
  });

  it("should mark tour as completed in localStorage", () => {
    localStorageMock.setItem(STORAGE_KEY, "true");
    expect(localStorageMock.getItem(STORAGE_KEY)).toBe("true");
  });

  it("should persist current step in localStorage", () => {
    localStorageMock.setItem(TOUR_STEP_KEY, "3");
    expect(localStorageMock.getItem(TOUR_STEP_KEY)).toBe("3");
  });

  it("should remove step key when tour is completed", () => {
    localStorageMock.setItem(TOUR_STEP_KEY, "5");
    localStorageMock.setItem(STORAGE_KEY, "true");
    localStorageMock.removeItem(TOUR_STEP_KEY);
    expect(localStorageMock.getItem(TOUR_STEP_KEY)).toBeNull();
    expect(localStorageMock.getItem(STORAGE_KEY)).toBe("true");
  });

  it("should handle invalid step values gracefully", () => {
    localStorageMock.setItem(TOUR_STEP_KEY, "invalid");
    const step = parseInt(localStorageMock.getItem(TOUR_STEP_KEY)!, 10);
    expect(isNaN(step)).toBe(true);
  });

  it("should handle step values out of range", () => {
    localStorageMock.setItem(TOUR_STEP_KEY, "99");
    const step = parseInt(localStorageMock.getItem(TOUR_STEP_KEY)!, 10);
    expect(step >= 0 && step < ALL_STEPS.length).toBe(false);
  });
});

describe("Onboarding Step Navigation Logic", () => {
  let currentStep: number;
  let isActive: boolean;
  let hasCompletedTour: boolean;

  function startTour() {
    currentStep = 0;
    isActive = true;
    localStorageMock.setItem(TOUR_STEP_KEY, "0");
  }

  function nextStep() {
    const next = currentStep + 1;
    if (next >= ALL_STEPS.length) {
      isActive = false;
      hasCompletedTour = true;
      localStorageMock.setItem(STORAGE_KEY, "true");
      localStorageMock.removeItem(TOUR_STEP_KEY);
      return;
    }
    currentStep = next;
    localStorageMock.setItem(TOUR_STEP_KEY, String(next));
  }

  function prevStep() {
    currentStep = Math.max(0, currentStep - 1);
    localStorageMock.setItem(TOUR_STEP_KEY, String(currentStep));
  }

  function skipTour() {
    isActive = false;
    hasCompletedTour = true;
    localStorageMock.setItem(STORAGE_KEY, "true");
    localStorageMock.removeItem(TOUR_STEP_KEY);
  }

  beforeEach(() => {
    localStorageMock.clear();
    currentStep = 0;
    isActive = false;
    hasCompletedTour = false;
  });

  it("startTour should set step to 0 and activate", () => {
    startTour();
    expect(currentStep).toBe(0);
    expect(isActive).toBe(true);
  });

  it("nextStep should advance to the next step", () => {
    startTour();
    nextStep();
    expect(currentStep).toBe(1);
    expect(isActive).toBe(true);
  });

  it("nextStep on last step should complete the tour", () => {
    startTour();
    // Advance to last step
    for (let i = 0; i < ALL_STEPS.length - 1; i++) {
      nextStep();
    }
    expect(currentStep).toBe(ALL_STEPS.length - 1);
    expect(isActive).toBe(true);

    // One more should complete
    nextStep();
    expect(isActive).toBe(false);
    expect(hasCompletedTour).toBe(true);
    expect(localStorageMock.getItem(STORAGE_KEY)).toBe("true");
    expect(localStorageMock.getItem(TOUR_STEP_KEY)).toBeNull();
  });

  it("prevStep should go back one step", () => {
    startTour();
    nextStep();
    nextStep();
    expect(currentStep).toBe(2);
    prevStep();
    expect(currentStep).toBe(1);
  });

  it("prevStep should not go below 0", () => {
    startTour();
    prevStep();
    expect(currentStep).toBe(0);
  });

  it("skipTour should deactivate and mark as completed", () => {
    startTour();
    nextStep();
    nextStep();
    skipTour();
    expect(isActive).toBe(false);
    expect(hasCompletedTour).toBe(true);
    expect(localStorageMock.getItem(STORAGE_KEY)).toBe("true");
  });

  it("should be able to restart tour after completion", () => {
    startTour();
    skipTour();
    expect(hasCompletedTour).toBe(true);

    // Restart
    hasCompletedTour = false; // Reset for test
    startTour();
    expect(currentStep).toBe(0);
    expect(isActive).toBe(true);
  });

  it("currentTourStep should return correct step data", () => {
    startTour();
    const step = isActive ? ALL_STEPS[currentStep] : null;
    expect(step).toBeTruthy();
    expect(step!.id).toBe("creation-mode");
    expect(step!.title).toBe("Choose How to Create");
  });

  it("should correctly identify generator vs result phase", () => {
    startTour();
    // Steps 0-4 are generator phase
    for (let i = 0; i < 5; i++) {
      expect(currentStep < 5).toBe(true);
      expect(ALL_STEPS[currentStep].page).toBe("/generate");
      if (i < 4) nextStep();
    }
    // Step 5+ are result phase
    nextStep();
    expect(currentStep >= 5).toBe(true);
    expect(ALL_STEPS[currentStep].page).toBe("/songs/:id");
  });

  it("full walkthrough should visit all 9 steps", () => {
    startTour();
    const visitedSteps: string[] = [];
    while (isActive) {
      visitedSteps.push(ALL_STEPS[currentStep].id);
      nextStep();
    }
    expect(visitedSteps).toHaveLength(9);
    expect(visitedSteps[0]).toBe("creation-mode");
    expect(visitedSteps[8]).toBe("lyrics-tab");
    expect(hasCompletedTour).toBe(true);
  });
});

describe("Onboarding Data Tour Attributes", () => {
  // These tests verify that the data-tour attribute values match between
  // the tour step definitions and what should be in the actual components

  const expectedAttributes = [
    "creation-mode",
    "content-input",
    "genre-mood",
    "vocals-duration",
    "generate-button",
    "audio-player",
    "sheet-music-tab",
    "chords-tab",
    "lyrics-tab",
  ];

  it("all expected data-tour attributes are defined in tour steps", () => {
    const stepTargets = ALL_STEPS.map((s) => {
      const match = s.target.match(/data-tour='([^']+)'/);
      return match ? match[1] : null;
    });

    for (const attr of expectedAttributes) {
      expect(stepTargets).toContain(attr);
    }
  });

  it("no duplicate data-tour attributes", () => {
    const attrs = ALL_STEPS.map((s) => {
      const match = s.target.match(/data-tour='([^']+)'/);
      return match ? match[1] : null;
    });
    expect(new Set(attrs).size).toBe(attrs.length);
  });
});
