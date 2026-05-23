import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Download, Music, RefreshCw, FileAudio, FileText, AlertCircle, WifiOff, ThumbsUp, ThumbsDown, Printer, FileType, Hash, PackageOpen, Layers, Clock, Pencil, RotateCcw, Minus, Plus, ChevronDown, Settings2, Eye } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SheetMusicSkeleton } from "@/components/SheetMusicSkeleton";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { exportSheetMusicPDF, validatePdfContent } from "@/lib/pdfExport";
import { exportCombinedPdf } from "@/lib/combinedPdfExport";
import { COMMON_KEYS, detectKeyFromABC, transposeABC } from "@/lib/transpose";
import { getBestCapoPositions } from "@/lib/capoChart";
import { extractChordsFromABC } from "@/lib/midiExport";

import { GuitarChordChart } from "@/components/GuitarChordChart";
import { generateChordDiagramsHtml } from "@/lib/chordSvgPrint";
import { generatePrintAllHtml } from "@/lib/printAllHtml";
import { extractLeadSheet, generateLeadSheetHtml, generateNashvilleLeadSheetHtml } from "@/lib/leadSheetExtractor";
import { convertChordLineToNashville } from "@/lib/nashvilleNumbers";
import { CapoChart } from "@/components/CapoChart";
import { SheetMusicMetadata, type SheetMusicMetadataValues } from "@/components/SheetMusicMetadata";
import { generateCreditsFooterHtml, generateSubtitleHtml, CREDITS_CSS } from "@/lib/printCreditsHtml";
import { PlaybackControls } from "@/components/PlaybackControls";
import { SheetMusicProgressBar } from "@/components/SheetMusicProgressBar";
import { SheetMusicEditor } from "@/components/SheetMusicEditor";
import { PrintPreviewModal } from "@/components/PrintPreviewModal";
import type { PlaybackState } from "@/lib/abcPlayer";

interface SheetMusicViewerProps {
  songId: number;
  abcNotation?: string | null;
  songTitle: string;
  songKeySignature?: string | null;
  sheetMusicStatus?: string | null;
  sheetMusicError?: string | null;
  sheetMusicFeedback?: string | null;
}

type ErrorType = "network" | "generation" | "rendering" | null;

interface ErrorState {
  type: ErrorType;
  message: string;
  detail?: string;
}

const ERROR_INFO: Record<NonNullable<ErrorType>, { icon: typeof AlertCircle; title: string; suggestion: string }> = {
  network: {
    icon: WifiOff,
    title: "Connection Error",
    suggestion: "Check your internet connection and try again.",
  },
  generation: {
    icon: AlertCircle,
    title: "Generation Failed",
    suggestion: "The AI could not generate sheet music for this song. Try regenerating or choosing a different key.",
  },
  rendering: {
    icon: AlertCircle,
    title: "Rendering Error",
    suggestion: "The sheet music notation could not be displayed. Try regenerating the sheet music.",
  },
};

function classifyError(error: any): ErrorState {
  const message = error?.message || String(error) || "An unexpected error occurred";
  const lowerMsg = message.toLowerCase();

  // Detect HTML response errors (server returned HTML instead of JSON)
  if (
    lowerMsg.includes("unexpected token '<'") ||
    lowerMsg.includes("unexpected token '<'") ||
    lowerMsg.includes("<!doctype") ||
    lowerMsg.includes("is not valid json") ||
    (lowerMsg.includes("unexpected token") && lowerMsg.includes("json"))
  ) {
    return {
      type: "network",
      message: "The server encountered an error processing the request.",
      detail: "The request may have timed out or the server was temporarily unavailable. Please try again.",
    };
  }

  if (
    lowerMsg.includes("network") ||
    lowerMsg.includes("fetch") ||
    lowerMsg.includes("timeout") ||
    lowerMsg.includes("econnrefused") ||
    lowerMsg.includes("failed to fetch") ||
    lowerMsg.includes("aborted")
  ) {
    return { type: "network", message: "Unable to reach the server.", detail: message };
  }

  if (
    lowerMsg.includes("render") ||
    lowerMsg.includes("abcjs") ||
    lowerMsg.includes("svg")
  ) {
    return { type: "rendering", message: "Failed to render the sheet music.", detail: message };
  }

  const friendlyMessage = lowerMsg.includes("sheet music generation failed")
    ? "Sheet music generation failed. The AI service may be temporarily unavailable."
    : message;

  return { type: "generation", message: friendlyMessage, detail: message !== friendlyMessage ? message : undefined };
}

/**
 * Minimal frontend safety pass for ABC notation.
 * The primary sanitisation happens on the backend (backgroundSheetMusic.sanitiseAbc).
 * This strips V: directives, %%staves, and — critically — ALL blank lines in the
 * music body. In ABC notation, a blank line is a TUNE SEPARATOR that tells abcjs
 * to start a new tune. If the LLM inserts blank lines between sections (e.g.,
 * between Intro and Verse 1), abcjs only renders the first "tune" (typically 4 bars)
 * and silently discards the rest. This was the ROOT CAUSE of the truncation bug.
 */
function sanitiseAbcForRender(raw: string): string {
  const lines = raw
    .split("\n")
    .filter((l) => {
      const t = l.trim();
      if (t.startsWith("V:") || t.startsWith("%%staves")) return false;
      return true;
    });

  // CRITICAL FIX: Remove ALL blank lines from the entire ABC notation.
  // In ABC, blank lines are tune separators. The LLM often inserts them between
  // sections (e.g., between "% Intro" and "% Verse 1") for readability, but this
  // causes abcjs to only render the first section (4-8 bars) and discard the rest.
  // Comments (% Section Name) provide sufficient visual separation without breaking
  // the tune into multiple fragments.
  const filtered = lines.filter((l) => l.trim() !== "");

  return filtered.join("\n").trim();
}

export default function SheetMusicViewer({ songId, abcNotation: initialAbc, songTitle, songKeySignature, sheetMusicStatus, sheetMusicError, sheetMusicFeedback: initialFeedback }: SheetMusicViewerProps) {
  // Top-level log to verify component renders
  console.log("[SheetMusicViewer] Component rendering with songId:", songId, "initialAbc length:", initialAbc?.length);
  if (initialAbc) {
    console.log("[SheetMusicViewer] ABC notation:", initialAbc.substring(0, 500));
  }
  
  const { user } = useAuth();
  const sheetRef = useRef<HTMLDivElement>(null);
  const prevHighlightRef = useRef<Element | null>(null);
  const barHighlightRef = useRef<SVGRectElement | null>(null);
  const prevBarKeyRef = useRef<string>("");
  const [abc, setAbc] = useState<string | null>(initialAbc ?? null);
  const [isRendered, setIsRendered] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string>("original");
  // User overrides for tempo and time signature
  const [bpmOverride, setBpmOverride] = useState<number | null>(null);
  const [timeSigOverride, setTimeSigOverride] = useState<string | null>(null);
  const [generateInKey, setGenerateInKey] = useState<string>("auto");
  const [error, setError] = useState<ErrorState | null>(null);
  // Print margin customization
  const [showMarginSettings, setShowMarginSettings] = useState(false);
  const [printOrientation, setPrintOrientation] = useState<'landscape' | 'portrait'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('printOrientation');
      if (saved === 'portrait' || saved === 'landscape') {
        return saved;
      }
    }
    return 'landscape';
  });
  const [printMargins, setPrintMargins] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('printMargins');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          // Fall back to defaults if parsing fails
        }
      }
    }
    return { top: 0.5, right: 0.5, bottom: 0.75, left: 0.5 };
  });
  const [customPresets, setCustomPresets] = useState<Array<{ name: string; margins: typeof printMargins; orientation: 'landscape' | 'portrait' }>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('printPresets');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          // Fall back to empty array if parsing fails
        }
      }
    }
    return [];
  });
  const [presetName, setPresetName] = useState('');
  const [showPresetInput, setShowPresetInput] = useState(false);
  // Counter to force re-render attempts
  const [renderAttempt, setRenderAttempt] = useState(0);
  // Track whether the container has a non-zero width (visible)
  const [containerVisible, setContainerVisible] = useState(false);
  // Ref to prevent ResizeObserver from triggering re-renders after initial render
  const hasRenderedOnceRef = useRef(false);
  // Ref to prevent re-entry into the render function
  const isRenderingRef = useRef(false);
  // Track the last rendered ABC to avoid unnecessary re-renders
  const lastRenderedAbcRef = useRef<string | null>(null);
  // Sheet music metadata (subtitle, copyright, rights)
  const metadataRef = useRef<SheetMusicMetadataValues>({
    subtitle: "",
    copyright: "",
    writer: "",
    publisher: "",
    producer: "",
    phonographic: "",
    ccli: "",
  });
  const handleMetadataChange = useCallback((metadata: SheetMusicMetadataValues) => {
    metadataRef.current = metadata;
  }, []);
  // Lyrics input for pre-generation context
  const [lyricsInput, setLyricsInput] = useState("");
  const [showLyricsInput, setShowLyricsInput] = useState(false);
  const generateMutation = trpc.songs.generateSheetMusic.useMutation();
  const utils = trpc.useUtils();

  // Save margin settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('printMargins', JSON.stringify(printMargins));
  }, [printMargins]);

  // Save orientation settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('printOrientation', printOrientation);
  }, [printOrientation]);

  // Save custom presets to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('printPresets', JSON.stringify(customPresets));
  }, [customPresets]);

  // Save current settings as a custom preset
  const saveAsPreset = () => {
    if (!presetName.trim()) {
      alert('Please enter a preset name');
      return;
    }
    const newPreset = {
      name: presetName,
      margins: printMargins,
      orientation: printOrientation,
    };
    setCustomPresets([...customPresets, newPreset]);
    setPresetName('');
    setShowPresetInput(false);
  };

  // Load a custom preset
  const loadPreset = (preset: typeof customPresets[0]) => {
    setPrintMargins(preset.margins);
    setPrintOrientation(preset.orientation);
  };

  // Delete a custom preset
  const deletePreset = (index: number) => {
    setCustomPresets(customPresets.filter((_, i) => i !== index));
  };

  // Sync local abc state when the parent passes updated initialAbc (e.g. from background generation)
  useEffect(() => {
    if (initialAbc) {
      setAbc(initialAbc);
      // Reset render tracking so the new ABC will be rendered
      hasRenderedOnceRef.current = false;
      lastRenderedAbcRef.current = null;
      setRenderAttempt((n) => n + 1);
    }
  }, [initialAbc]);

  // Auto-generate sheet music if it's missing when component mounts
  useEffect(() => {
    console.log("[SheetMusic] Auto-gen effect running:", { abc: !!abc, error: !!error, isPending: generateMutation.isPending, songId });
    if (!abc && !error && !generateMutation.isPending) {
      console.log("[SheetMusic] No ABC notation available, auto-generating for song", songId);
      (async () => {
        try {
          const result = await generateMutation.mutateAsync({ songId, key: undefined });
          console.log("[SheetMusic] Auto-generation succeeded, ABC length:", result.abcNotation?.length);
          setAbc(result.abcNotation || null);
          hasRenderedOnceRef.current = false;
          lastRenderedAbcRef.current = null;
          setRenderAttempt((n) => n + 1);
        } catch (err: any) {
          console.error("[SheetMusic] Auto-generation failed:", err);
          const errorState = classifyError(err);
          setError(errorState);
        }
      })();
    }
  }, [songId, abc, error, generateMutation.isPending]); // Run when dependencies change

  // Progress bar state
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [playbackIsActive, setPlaybackIsActive] = useState(false);
  const [playbackIsPlaying, setPlaybackIsPlaying] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfPreviewSvg, setPdfPreviewSvg] = useState<SVGElement | null>(null);
  const [previewFormat, setPreviewFormat] = useState<'pdf' | 'lead-sheet' | 'nashville'>('pdf');
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const handlePlaybackStateChange = useCallback((state: PlaybackState) => {
    const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;
    setPlaybackProgress(progress);
    setPlaybackIsActive(state.isPlaying && !state.isPaused);
    setPlaybackIsPlaying(state.isPlaying);
  }, []);

  // Note highlighting + bar highlighting callback
  const onActiveNoteChange = useCallback((noteIndex: number) => {
    const container = sheetRef.current;
    if (!container) return;

    // ── Note highlight ──
    if (prevHighlightRef.current) {
      prevHighlightRef.current.classList.remove("abcjs-note-active");
      prevHighlightRef.current = null;
    }

    if (noteIndex < 0) {
      // Playback stopped — remove bar highlight too
      if (barHighlightRef.current) {
        barHighlightRef.current.remove();
        barHighlightRef.current = null;
        prevBarKeyRef.current = "";
      }
      return;
    }

    const noteEl = container.querySelector(`.abcjs-n${noteIndex}`);
    if (!noteEl) return;

    noteEl.classList.add("abcjs-note-active");
    prevHighlightRef.current = noteEl;

    // ── Bar highlight ──
    // Find the staff wrapper that contains this note
    const staffGroup = noteEl.closest(".abcjs-staff-wrapper") as SVGGElement | null;
    if (staffGroup) {
      // Collect all bar line elements in this staff group
      const barLines = Array.from(staffGroup.querySelectorAll(".abcjs-bar")) as SVGElement[];
      // Get the note's x-position in SVG coordinates
      const noteBox = (noteEl as unknown as SVGGraphicsElement).getBBox();
      const noteCenterX = noteBox.x + noteBox.width / 2;

      // Find the bar region: the bar line just before and just after the note
      let leftX = 0;
      let rightX = 0;
      const staffBox = staffGroup.getBBox();

      // Sort bar lines by x position
      const barPositions = barLines.map((bl) => {
        const bbox = (bl as unknown as SVGGraphicsElement).getBBox();
        return bbox.x + bbox.width / 2;
      }).sort((a, b) => a - b);

      // Find left and right boundaries
      leftX = staffBox.x; // default: start of staff
      rightX = staffBox.x + staffBox.width; // default: end of staff
      for (let i = 0; i < barPositions.length; i++) {
        if (barPositions[i] <= noteCenterX) {
          leftX = barPositions[i];
        }
        if (barPositions[i] > noteCenterX) {
          rightX = barPositions[i];
          break;
        }
      }

      // Create a unique key for this bar region to avoid redundant updates
      const barKey = `${Math.round(leftX)}-${Math.round(rightX)}-${Math.round(staffBox.y)}`;
      if (barKey !== prevBarKeyRef.current) {
        prevBarKeyRef.current = barKey;

        // Find the SVG element to insert the highlight
        const svg = staffGroup.closest("svg");
        if (svg) {
          // Remove old highlight
          if (barHighlightRef.current) {
            barHighlightRef.current.remove();
          }

          // Create highlight rectangle
          const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          rect.setAttribute("x", String(leftX));
          rect.setAttribute("y", String(staffBox.y));
          rect.setAttribute("width", String(Math.max(rightX - leftX, 10)));
          rect.setAttribute("height", String(staffBox.height));
          rect.setAttribute("rx", "4");
          rect.setAttribute("class", "abcjs-bar-highlight");

          // Insert before the staff group so it renders behind the notes
          staffGroup.insertBefore(rect, staffGroup.firstChild);
          barHighlightRef.current = rect;
        }
      }
    }

    // ── Auto-scroll to keep active note visible ──
    const containerRect = container.getBoundingClientRect();
    const noteRect = noteEl.getBoundingClientRect();
    if (noteRect.left < containerRect.left + 60) {
      container.scrollBy({ left: noteRect.left - containerRect.left - 60, behavior: "smooth" });
    } else if (noteRect.right > containerRect.right - 60) {
      container.scrollBy({ left: noteRect.right - containerRect.right + 60, behavior: "smooth" });
    }
    if (noteRect.top < containerRect.top + 40) {
      container.scrollBy({ top: noteRect.top - containerRect.top - 40, behavior: "smooth" });
    } else if (noteRect.bottom > containerRect.bottom - 40) {
      container.scrollBy({ top: noteRect.bottom - containerRect.bottom + 40, behavior: "smooth" });
    }
  }, []);

  // ─── ResizeObserver: detect when the container becomes visible (non-zero width) ───
  // This is critical for tabs: when the sheet music tab is hidden, the container has
  // width 0. abcjs with responsive:'resize' computes staff width from container width,
  // producing a minimal SVG with only the title when width is 0.
  // IMPORTANT: Only trigger a re-render when transitioning from invisible (width=0)
  // to visible (width>0), NOT on every resize event, to avoid infinite loops.
  useEffect(() => {
    const container = sheetRef.current;
    if (!container) return;

    // Guard against ResizeObserver not being available (some browsers/environments)
    if (typeof ResizeObserver === 'undefined') {
      console.warn("[SheetMusic] ResizeObserver not available, setting containerVisible=true");
      setContainerVisible(true);
      setRenderAttempt((n) => n + 1);
      return;
    }

    let wasVisible = false;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        const isNowVisible = width > 10;
        if (isNowVisible && !wasVisible) {
          // Transition from invisible to visible — trigger render
          wasVisible = true;
          setContainerVisible(true);
          // Always bump renderAttempt on visibility transition
          setRenderAttempt((n) => n + 1);
        } else if (!isNowVisible && wasVisible) {
          wasVisible = false;
          setContainerVisible(false);
        }
      }
    });

    observer.observe(container);

    // Check initial width and trigger render immediately if visible
    const rect = container.getBoundingClientRect();
    if (rect.width > 10) {
      wasVisible = true;
      setContainerVisible(true);
      // Trigger render on next tick to ensure layout is ready
      setTimeout(() => {
        setRenderAttempt((n) => n + 1);
      }, 0);
    }

    return () => observer.disconnect();
  }, [abc]); // Re-attach when abc changes (component may re-mount)

  // Detect the original key from ABC notation
  const originalKey = useMemo(() => {
    if (!abc) return null;
    return detectKeyFromABC(abc);
  }, [abc]);

  // Compute the transposed ABC notation
  const displayAbc = useMemo(() => {
    if (!abc || selectedKey === "original" || !originalKey) return abc;
    return transposeABC(abc, originalKey, selectedKey);
  }, [abc, selectedKey, originalKey]);

  // Extract chords from the currently displayed (transposed) ABC notation
  const chords = useMemo(() => {
    if (!displayAbc) return [];
    return extractChordsFromABC(displayAbc);
  }, [displayAbc]);

  // Frontend-side ABC sanitisation
  const sanitisedDisplayAbc = useMemo(() => {
    if (!displayAbc) return null;
    return sanitiseAbcForRender(displayAbc);
  }, [displayAbc]);

  // Count bars from the ABC notation for the bar count indicator
  const barCount = useMemo(() => {
    if (!sanitisedDisplayAbc) return 0;
    // Extract only the music lines (skip headers like X:, T:, M:, K:, L:, w:, W:, etc.)
    const lines = sanitisedDisplayAbc.split("\n");
    const musicLines = lines.filter(l => {
      const trimmed = l.trim();
      if (!trimmed) return false;
      // Skip header lines and lyric lines
      if (/^[A-Za-z]:/.test(trimmed) && !trimmed.startsWith("|")) return false;
      if (trimmed.startsWith("w:") || trimmed.startsWith("W:")) return false;
      if (trimmed.startsWith("%")) return false;
      return true;
    });
    const musicText = musicLines.join(" ");
    // Count bar lines (|) but exclude special markers like |: :| [| |] || |1 |2
    const barLines = (musicText.match(/\|/g) || []).length;
    return Math.max(0, barLines);
  }, [sanitisedDisplayAbc]);

  // Detect tempo and time signature from ABC notation
  const detectedMusicInfo = useMemo(() => {
    if (!sanitisedDisplayAbc) return null;

    // Extract time signature (M: field) — defaults to 4/4
    const mMatch = sanitisedDisplayAbc.match(/M:\s*(\d+)\/(\d+)/);
    const beatsPerBar = mMatch ? parseInt(mMatch[1], 10) : 4;
    const beatUnit = mMatch ? parseInt(mMatch[2], 10) : 4;
    const timeSig = `${beatsPerBar}/${beatUnit}`;
    const timeSigDetected = !!mMatch;

    // Extract tempo (Q: field)
    let bpm = 120;
    let tempoNoteLength = 1 / 4;
    let tempoNoteName = "\u2669";
    const qMatch = sanitisedDisplayAbc.match(/Q:\s*(?:(\d+)\/(\d+)\s*=\s*)?(\d+)/);
    const tempoDetected = !!qMatch;
    if (qMatch) {
      if (qMatch[1] && qMatch[2]) {
        tempoNoteLength = parseInt(qMatch[1], 10) / parseInt(qMatch[2], 10);
        const noteVal = tempoNoteLength;
        if (noteVal === 0.125) tempoNoteName = "\u266A";
        else if (noteVal === 0.375) tempoNoteName = "\u2669.";
        else if (noteVal === 0.5) tempoNoteName = "\uD834\uDD5E";
        else if (noteVal === 1) tempoNoteName = "\uD834\uDD5D";
      }
      bpm = parseInt(qMatch[3], 10);
    }

    return { bpm, timeSig, tempoNoteName, tempoDetected, timeSigDetected, tempoNoteLength };
  }, [sanitisedDisplayAbc]);

  // Compute duration using overrides if set, otherwise detected values
  const durationInfo = useMemo(() => {
    if (!detectedMusicInfo || barCount <= 0) return null;

    const effectiveBpm = bpmOverride ?? detectedMusicInfo.bpm;
    const effectiveTimeSig = timeSigOverride ?? detectedMusicInfo.timeSig;
    const [num, den] = effectiveTimeSig.split("/").map(Number);
    const beatsPerBar = num || 4;
    const beatUnit = den || 4;
    const tempoNoteLength = detectedMusicInfo.tempoNoteLength;

    const barDurationSeconds = (beatsPerBar / beatUnit) / tempoNoteLength / effectiveBpm * 60;
    const totalSeconds = Math.round(barCount * barDurationSeconds);

    if (totalSeconds <= 0 || !isFinite(totalSeconds)) return null;

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const formatted = `~${minutes}:${seconds.toString().padStart(2, "0")}`;

    const hasOverride = bpmOverride !== null || timeSigOverride !== null;

    return {
      formatted,
      bpm: effectiveBpm,
      timeSig: effectiveTimeSig,
      tempoNoteName: detectedMusicInfo.tempoNoteName,
      tempoDetected: detectedMusicInfo.tempoDetected,
      timeSigDetected: detectedMusicInfo.timeSigDetected,
      hasOverride,
    };
  }, [detectedMusicInfo, barCount, bpmOverride, timeSigOverride]);

  const handleGenerate = useCallback(async () => {
    setError(null);
    try {
      const startTime = Date.now();
      const keyParam = generateInKey === "auto" ? undefined : generateInKey;
      // Pass force: true to bypass cache and regenerate with improved generator
      const result = await generateMutation.mutateAsync({ songId, key: keyParam, force: true, lyrics: lyricsInput.trim() || undefined });
      const regenerationTime = ((Date.now() - startTime) / 1000).toFixed(1);
      setAbc(result.abcNotation || null);
      setSelectedKey("original");
      // Reset render tracking so the new ABC will be rendered fresh
      hasRenderedOnceRef.current = false;
      lastRenderedAbcRef.current = null;
      setRenderAttempt((n) => n + 1);
      utils.songs.getById.invalidate({ id: songId });
      toast.success(`Sheet music regenerated for "${songTitle}"`, {
        description: `Generated in ${regenerationTime}s. All formats ready to download.`,
        duration: 4000,
      });
    } catch (err: any) {
      const errorState = classifyError(err);
      setError(errorState);
    }
  }, [songId, generateInKey, generateMutation, utils, lyricsInput]);

  // ─── Core rendering effect ───
  // Renders the ABC notation using abcjs when:
  // 1. We have sanitised ABC notation
  // 2. The container is in the DOM
  // 3. The container has a non-zero width (visible — not in a hidden tab)
  // Uses renderAttempt as a dependency to allow forced re-renders.
  // IMPORTANT: Guards against re-entry and infinite loops from ResizeObserver.
  useEffect(() => {
    if (!sanitisedDisplayAbc) {
      console.log('[SheetMusicViewer] Render effect skipped: no sanitisedDisplayAbc');
      return;
    }
    console.log('[SheetMusicViewer] Render effect triggered, ABC length:', sanitisedDisplayAbc.length, 'renderAttempt:', renderAttempt, 'containerVisible:', containerVisible);

    // Skip if the same ABC was already rendered successfully (no need to re-render)
    // BUT allow re-render if renderAttempt changed (user clicked Re-render)
    if (lastRenderedAbcRef.current === sanitisedDisplayAbc && hasRenderedOnceRef.current) {
      // Ensure isRendered is true in case it was reset by a cancelled render
      setIsRendered(true);
      return;
    }

    // If a previous render is in progress, schedule a retry after it finishes
    // instead of silently dropping this render attempt
    if (isRenderingRef.current) {
      const retryTimer = setTimeout(() => {
        setRenderAttempt((n) => n + 1);
      }, 200);
      return () => clearTimeout(retryTimer);
    }

    let cancelled = false;

    async function doRender() {
      const container = sheetRef.current;
      if (!container) {
        console.log('[SheetMusicViewer] doRender: no container ref');
        return;
      }
      console.log('[SheetMusicViewer] doRender starting, container:', container.id || 'no-id');

      // CRITICAL: Check that the container has a non-zero width.
      const rect = container.getBoundingClientRect();
      console.log('[SheetMusicViewer] Container width:', rect.width);
      if (rect.width < 10) {
        console.log('[SheetMusicViewer] Container too narrow, scheduling retry');
        // Schedule a retry — the container may become visible soon
        if (!cancelled) {
          setTimeout(() => {
            if (!cancelled) setRenderAttempt((n) => n + 1);
          }, 500);
        }
        return;
      }

      // Set rendering guard
      isRenderingRef.current = true;
      setIsRendered(false);
      setError((prev) => (prev?.type === "rendering" ? null : prev));

      try {
        const mod = await import("abcjs");
        if (cancelled) { isRenderingRef.current = false; return; }

        const abcjs = mod.default || mod;
        const renderTarget = container;

        // Clear previous content
        renderTarget.innerHTML = "";

        // Ensure the container has an ID
        if (!renderTarget.id) renderTarget.id = "sheet-music-render";

        // Wait for next animation frame to ensure layout is fully computed
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        if (cancelled) { isRenderingRef.current = false; return; }

        // Double-check width after rAF
        const postRafRect = renderTarget.getBoundingClientRect();
        if (postRafRect.width < 10) {
          isRenderingRef.current = false;
          // Schedule a retry
          if (!cancelled) {
            setTimeout(() => {
              if (!cancelled) setRenderAttempt((n) => n + 1);
            }, 500);
          }
          return;
        }

        // Render the ABC notation with optimized settings for longer pieces
        console.log("[SheetMusic] About to render ABC:", sanitisedDisplayAbc?.substring(0, 300));
        console.log("[SheetMusic] Container width:", postRafRect.width);
        // Calculate staff width: use container width minus padding, but ensure it's reasonable
        const staffWidth = Math.max(300, Math.floor(postRafRect.width - 40));
        console.log("[SheetMusic] Staff width:", staffWidth);
        
        // Render the full ABC notation — no timeout-based fallback to avoid truncation.
        // abcjs.renderAbc is synchronous (returns immediately), so a timeout race
        // would only fire if the Promise.resolve microtask was delayed by layout,
        // which incorrectly replaced the full song with an 8-bar dummy.
        let visualObj;
        try {
          visualObj = abcjs.renderAbc(renderTarget, sanitisedDisplayAbc!, {
            responsive: "resize",
            staffwidth: staffWidth,
            paddingtop: 10,
            paddingbottom: 10,
            paddingleft: 5,
            paddingright: 5,
            add_classes: true,
            wrap: {
              minSpacing: 1.8,
              maxSpacing: 2.8,
              preferredMeasuresPerLine: 4,
            },
          });
        } catch (renderErr) {
          if (cancelled) { isRenderingRef.current = false; return; }
          console.error("[SheetMusic] Rendering failed:", renderErr);
          // Show the error to the user instead of silently truncating
          setError({
            type: "rendering",
            message: "Failed to render the full sheet music. Please try regenerating.",
            detail: String(renderErr),
          });
          isRenderingRef.current = false;
          return;
        }

        // Hide the reference number (X:) that abcjs renders at the top
        if (visualObj) {
          const svgs = renderTarget.querySelectorAll('svg');
          svgs.forEach((svg) => {
            const textElements = svg.querySelectorAll('text');
            textElements.forEach((text) => {
              const content = text.textContent?.trim();
              // Hide numeric reference numbers that appear alone (e.g., "1")
              if (content && /^\d+$/.test(content)) {
                (text as SVGTextElement).style.display = 'none';
              }
            });
          });
        }

        if (cancelled) { isRenderingRef.current = false; return; }

        // Log warnings for debugging
        console.log("[SheetMusic] abcjs returned:", visualObj);
        if (visualObj?.[0]?.warnings?.length) {
          console.warn("[SheetMusic] abcjs warnings:", visualObj[0].warnings);
        }

        // Mark as successfully rendered — SVG was created by abcjs
        const svg = renderTarget.querySelector("svg");
        if (svg) {
          const pathElements = svg.querySelectorAll("path");
          console.log(`[SheetMusic] Rendered: SVG found, ${pathElements.length} paths, container width: ${postRafRect.width}`);
          // Don't check path count — abcjs may render minimal SVG for simple notation
          // Just mark as rendered if SVG exists
        }

        // Mark as successfully rendered — even if the SVG is minimal,
        // allow the user to download whatever was produced
        hasRenderedOnceRef.current = true;
        lastRenderedAbcRef.current = sanitisedDisplayAbc;
        setIsRendered(true);
      } catch (err: any) {
        if (!cancelled) {
          console.error("[SheetMusic] Render error:", err);
          setError({ type: "rendering", message: "Failed to render the sheet music notation.", detail: err?.message });
          // Even on error, if there's an SVG in the container, allow PDF download
          const svg = sheetRef.current?.querySelector("svg");
          if (svg) {
            hasRenderedOnceRef.current = true;
            lastRenderedAbcRef.current = sanitisedDisplayAbc;
            setIsRendered(true);
          }
        }
      } finally {
        isRenderingRef.current = false;
      }
    }

    doRender();

    return () => {
      cancelled = true;
      // If the render was cancelled but we had a previous successful render
      // of the same ABC, restore isRendered so buttons stay enabled
      if (lastRenderedAbcRef.current === sanitisedDisplayAbc && hasRenderedOnceRef.current) {
        setIsRendered(true);
      }
    };
  }, [sanitisedDisplayAbc, renderAttempt, containerVisible]);

  // ─── Rendering timeout: prevent stuck renders ───
  useEffect(() => {
    if (isRenderingRef.current && sanitisedDisplayAbc) {
      const timeoutId = setTimeout(() => {
        if (isRenderingRef.current) {
          console.warn("[SheetMusic] Rendering timeout - force completion");
          isRenderingRef.current = false;
          setIsRendered(true);
        }
      }, 10000); // 10 second timeout
      return () => clearTimeout(timeoutId);
    }
  }, [isRenderingRef.current, sanitisedDisplayAbc]);

  // ─── Safety net: if we have ABC and an SVG but isRendered is false, fix it ───
  // This catches edge cases where rapid state changes leave isRendered stuck at false
  useEffect(() => {
    if (sanitisedDisplayAbc && !isRendered && !isRenderingRef.current) {
      const timer = setTimeout(() => {
        const svg = sheetRef.current?.querySelector("svg");
        if (svg && !isRenderingRef.current) {
          console.log("[SheetMusic] Safety net: SVG found but isRendered was false, fixing.");
          hasRenderedOnceRef.current = true;
          lastRenderedAbcRef.current = sanitisedDisplayAbc;
          setIsRendered(true);
        }
      }, 3000); // Wait 3 seconds before applying safety net
      return () => clearTimeout(timer);
    }
  }, [sanitisedDisplayAbc, isRendered]);

  // ─── Aggressive safety net: Force enable PDF button after 8 seconds ───
  // If rendering is taking too long, allow user to download whatever was rendered
  // This prevents the PDF button from being stuck disabled indefinitely
  useEffect(() => {
    if (sanitisedDisplayAbc && !isRendered) {
      const aggressiveTimer = setTimeout(() => {
        if (!isRendered && !isRenderingRef.current) {
          console.warn("[SheetMusic] Aggressive safety net: Forcing isRendered=true after 8s timeout");
          hasRenderedOnceRef.current = true;
          lastRenderedAbcRef.current = sanitisedDisplayAbc;
          setIsRendered(true);
        }
      }, 8000); // Force enable after 8 seconds
      return () => clearTimeout(aggressiveTimer);
    }
  }, [sanitisedDisplayAbc, isRendered]);

  const handleShowPdfPreview = useCallback(async () => {
    if (!sheetRef.current) return;
    
    const svgElement = sheetRef.current.querySelector("svg");
    if (!svgElement) {
      toast.error("No sheet music to preview");
      return;
    }
    
    // Clone the SVG for preview and fix dimensions
    const svgClone = svgElement.cloneNode(true) as SVGElement;
    
    // Ensure the SVG has a proper viewBox so it scales correctly in the modal.
    // abcjs sets width/height attributes but may not set viewBox, causing clipping.
    const origWidth = svgElement.getAttribute("width") || svgElement.getBoundingClientRect().width.toString();
    const origHeight = svgElement.getAttribute("height") || svgElement.getBoundingClientRect().height.toString();
    if (!svgClone.getAttribute("viewBox") && origWidth && origHeight) {
      const w = parseFloat(origWidth);
      const h = parseFloat(origHeight);
      if (w > 0 && h > 0) {
        svgClone.setAttribute("viewBox", `0 0 ${w} ${h}`);
      }
    }
    // Remove fixed width/height so SVG scales to container
    svgClone.removeAttribute("width");
    svgClone.removeAttribute("height");
    svgClone.style.width = "100%";
    svgClone.style.height = "auto";
    svgClone.style.maxWidth = "100%";
    svgClone.style.overflow = "visible";
    
    setPdfPreviewSvg(svgClone);
    setShowPdfPreview(true);
  }, []);

  const handleDownloadPDF = useCallback(async () => {
    if (!sheetRef.current) return;
    
    // Debug: Log what's in the container
    console.log("[PDF] Container HTML:", sheetRef.current.innerHTML.substring(0, 500));
    console.log("[PDF] Container children count:", sheetRef.current.children.length);
    
    const svgElement = sheetRef.current.querySelector("svg");
    if (!svgElement) {
      console.error("[PDF] No SVG found in container");
      console.log("[PDF] Container content:", sheetRef.current.innerHTML);
      toast.error("No sheet music to export");
      return;
    }
    
    // Debug: Log SVG details
    console.log("[PDF] SVG found, element count:", svgElement.children.length);
    console.log("[PDF] SVG paths:", svgElement.querySelectorAll("path").length);
    console.log("[PDF] SVG lines:", svgElement.querySelectorAll("line").length);
    console.log("[PDF] SVG texts:", svgElement.querySelectorAll("text").length);
    console.log("[PDF] SVG rects:", svgElement.querySelectorAll("rect").length);
    console.log("[PDF] SVG viewBox:", svgElement.getAttribute("viewBox"));
    
    // Validate PDF content before exporting
    const validation = validatePdfContent(svgElement);
    if (!validation.isValid) {
      const errorMsg = validation.errors.join("; ");
      console.warn("[PDF] Validation warnings:", validation.errors);
      // Show warning but allow download to proceed
      toast.warning(`Sheet music may be incomplete: ${errorMsg}`);
    }
    
    setExporting(true);
    try {
      const keyLabel = selectedKey === "original"
        ? (originalKey ? ` (Key: ${originalKey})` : "")
        : ` (Key: ${selectedKey})`;
      // Wrap in a timeout to prevent infinite hangs
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("PDF generation timed out after 30 seconds")), 30000)
      );
      // Calculate best capo position for the PDF
      const currentKey = selectedKey === "original" ? originalKey : selectedKey;
      let capoInfo: { fret: number; playKey: string } | null = null;
      if (currentKey && chords.length > 0) {
        const bestCapos = getBestCapoPositions(currentKey, chords, 1);
        if (bestCapos.length > 0 && bestCapos[0].fret > 0) {
          capoInfo = { fret: bestCapos[0].fret, playKey: bestCapos[0].playKey };
        }
      }

      // Build metadata for the PDF from the metadata panel
      const meta = metadataRef.current;
      const pdfMetadata = {
        subtitle: meta.subtitle || undefined,
        copyright: meta.copyright || undefined,
        writer: meta.writer || undefined,
        publisher: meta.publisher || undefined,
        producer: meta.producer || undefined,
        phonographic: meta.phonographic || undefined,
        ccli: meta.ccli || undefined,
        chordSummary: chords.length > 0 ? chords.join("  ") : undefined,
        keyLabel: currentKey ? `Key: ${currentKey}` : undefined,
      };

      await Promise.race([
        exportSheetMusicPDF(svgElement, songTitle, user?.name || undefined, capoInfo, pdfMetadata),
        timeoutPromise,
      ]);
      toast.success("Sheet music PDF downloaded!");
    } catch (err: any) {
      console.error("[PDF] Export error:", err);
      const message = err?.message?.includes("timed out")
        ? "PDF generation timed out. Try refreshing the page and trying again."
        : "Failed to export sheet music PDF. Try using Print instead.";
      toast.error(message);
    } finally {
      setExporting(false);
    }
  }, [songTitle, selectedKey, originalKey, chords]);





  const handlePrint = useCallback(async () => {
    if (!sheetRef.current) return;
    const svgElement = sheetRef.current.querySelector("svg");
    if (!svgElement) {
      toast.error("No sheet music to print");
      return;
    }

    const keyLabel = selectedKey === "original"
      ? (originalKey ? `Key: ${originalKey}` : "")
      : `Key: ${selectedKey}`;

    // Calculate capo info and chord summary for the header
    const currentKey = selectedKey === "original" ? originalKey : selectedKey;
    let capoLabel = "";
    if (currentKey && chords.length > 0) {
      const bestCapos = getBestCapoPositions(currentKey, chords, 1);
      if (bestCapos.length > 0 && bestCapos[0].fret > 0) {
        const ordinal = bestCapos[0].fret === 1 ? "1st" : bestCapos[0].fret === 2 ? "2nd" : bestCapos[0].fret === 3 ? "3rd" : `${bestCapos[0].fret}th`;
        capoLabel = `Capo ${ordinal} Fret (play in ${bestCapos[0].playKey})`;
      }
    }
    const chordSummary = chords.length > 0 ? chords.join("  ") : "";

    // Create a new window with print-friendly layout
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Pop-up blocked. Please allow pop-ups for this site.");
      return;
    }

    // Re-render the ABC specifically for print at a fixed width optimized for 8.5x11 paper.
    // 8.5in - margins (0.5in each side) = 7.5in printable width ≈ 540px at 72dpi.
    // This ensures proper line breaks, lyrics alignment, and page fitting.
    const printContainer = document.createElement("div");
    printContainer.style.position = "absolute";
    printContainer.style.left = "-9999px";
    printContainer.style.top = "0";
    printContainer.style.width = "540px";
    document.body.appendChild(printContainer);

    try {
      const abcjs = (await import("abcjs")).default;
      const abcToRender = displayAbc || "";
      abcjs.renderAbc(printContainer, abcToRender, {
        staffwidth: 520,
        paddingtop: 10,
        paddingbottom: 10,
        paddingleft: 5,
        paddingright: 5,
        add_classes: true,
        wrap: { minSpacing: 1.5, maxSpacing: 2.8, preferredMeasuresPerLine: 4 },
      });
    } catch (e) {
      console.error("[Print] Failed to re-render ABC for print:", e);
    }

    const printSvg = printContainer.querySelector("svg");
    let staffSystemsHtml = "";
    if (printSvg) {
      // Split the single SVG into individual staff-system SVGs so that
      // each system can have page-break-inside: avoid applied via CSS.
      // This prevents bars from being cut off at page boundaries.
      const staffGroups = printSvg.querySelectorAll("g.abcjs-staff-wrapper");
      if (staffGroups.length > 1) {
        // Extract each staff group into its own wrapper div with break-inside: avoid
        const svgNS = "http://www.w3.org/2000/svg";
        const viewBox = printSvg.getAttribute("viewBox");
        const svgWidth = parseFloat(printSvg.getAttribute("width") || "520");
        const parts: string[] = [];
        staffGroups.forEach((group) => {
          // Get the bounding box of this staff group
          const bbox = (group as SVGGraphicsElement).getBBox();
          // Create a mini-SVG for just this staff system
          const miniSvg = document.createElementNS(svgNS, "svg");
          miniSvg.setAttribute("xmlns", svgNS);
          miniSvg.setAttribute("width", "100%");
          // Add padding around the staff group (4px top/bottom)
          const padY = 4;
          miniSvg.setAttribute("viewBox", `${bbox.x} ${bbox.y - padY} ${bbox.width} ${bbox.height + padY * 2}`);
          miniSvg.setAttribute("preserveAspectRatio", "xMinYMin meet");
          miniSvg.style.display = "block";
          miniSvg.style.maxWidth = "100%";
          miniSvg.style.height = "auto";
          miniSvg.style.overflow = "visible";
          miniSvg.appendChild(group.cloneNode(true));
          parts.push(`<div class="staff-system-wrapper">${miniSvg.outerHTML}</div>`);
        });
        staffSystemsHtml = parts.join("\n");
      } else {
        // Single staff group or no class names — use the full SVG
        printSvg.setAttribute("width", "100%");
        printSvg.removeAttribute("height");
        printSvg.style.maxWidth = "100%";
        printSvg.style.height = "auto";
        printSvg.style.display = "block";
        staffSystemsHtml = printSvg.outerHTML;
      }
    } else {
      // Fallback: use the on-screen SVG clone
      const svgClone = svgElement.cloneNode(true) as SVGElement;
      svgClone.setAttribute("width", "100%");
      svgClone.removeAttribute("height");
      svgClone.style.maxWidth = "100%";
      svgClone.style.height = "auto";
      svgClone.style.display = "block";
      staffSystemsHtml = svgClone.outerHTML;
    }
    document.body.removeChild(printContainer);

    // Get metadata from the ref
    const meta = metadataRef.current;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${songTitle} - Sheet Music</title>
        <style>
          @page {
            size: 8.5in 11in;
            margin: ${printMargins.top}in ${printMargins.right}in ${printMargins.bottom}in ${printMargins.left}in;
            @bottom-center {
              content: "Page " counter(page) " of " counter(pages);
              font-size: 10px;
              color: #999;
              font-family: 'Georgia', 'Times New Roman', serif;
            }
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Georgia', 'Times New Roman', serif;
            color: #000;
            background: #fff;
            max-width: 8.5in;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-header {
            text-align: center;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 2px solid #333;
          }
          .print-title {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 4px;
            letter-spacing: 0.5px;
          }
          .print-subtitle {
            font-size: 14px;
            color: #666;
            font-style: italic;
            margin-bottom: 4px;
          }
          .print-meta {
            font-size: 14px;
            color: #555;
            margin-top: 4px;
          }
          .print-chord-summary {
            font-family: 'Courier New', 'Consolas', monospace;
            font-size: 13px;
            font-weight: bold;
            color: #1a56db;
            margin-top: 8px;
            letter-spacing: 0.3px;
          }
          .print-content {
            width: 100%;
            overflow: visible;
          }
          .print-content svg {
            width: 100%;
            height: auto;
            display: block;
            max-width: 7.5in;
            margin: 0 auto;
          }
          .chord-section {
            margin-top: 32px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
          }
          .chord-section-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
          }
          .chord-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
            justify-content: flex-start;
          }
          ${CREDITS_CSS}
          /* Staff group page-break rules — prevent bars from being cut off */
          .staff-system-wrapper {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .staff-system-wrapper svg {
            width: 100%;
            height: auto;
            display: block;
            max-width: 7.5in;
            overflow: visible;
          }
          .print-content svg g.abcjs-staff-wrapper {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          @media print {
            @page {
              size: 8.5in 11in;
              margin: ${printMargins.top}in ${printMargins.right}in ${printMargins.bottom}in ${printMargins.left}in;
              @bottom-center {
                content: "Page " counter(page) " of " counter(pages);
                font-size: 10px;
                color: #999;
                font-family: 'Georgia', 'Times New Roman', serif;
              }
            }
            body { 
              margin: 0;
              padding: 0;
              width: 100%;
            }
            .no-print { display: none !important; }
            .print-btn-bar { display: none !important; }
            .print-body { margin-top: 0 !important; }
            /* Page number footer — fixed position repeats on every printed page */
            .page-footer {
              display: block;
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
              text-align: center;
              font-size: 10px;
              color: #999;
              font-family: 'Georgia', 'Times New Roman', serif;
              padding-bottom: 4px;
            }
            .print-header {
              page-break-after: avoid;
              break-after: avoid;
            }
            .print-content {
              width: 100%;
              overflow: visible;
            }
            .print-content svg {
              width: 100% !important;
              max-width: 7.5in !important;
              height: auto !important;
              display: block;
              overflow: visible !important;
            }
            /* CRITICAL: Prevent staff lines from being split across pages */
            .staff-system-wrapper {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .staff-system-wrapper svg {
              width: 100% !important;
              max-width: 7.5in !important;
              height: auto !important;
              display: block;
              overflow: visible !important;
            }
            .print-content svg g.abcjs-staff-wrapper {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .chord-section {
              page-break-before: auto;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .chord-grid {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .credits-block {
              page-break-before: avoid;
              page-break-inside: avoid;
              break-inside: avoid;
            }
          }
          .print-btn-bar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #f0f0f0;
            padding: 12px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            z-index: 100;
          }
          .print-btn-bar button {
            padding: 8px 24px;
            font-size: 14px;
            font-weight: 600;
            border: none;
            border-radius: 6px;
            cursor: pointer;
          }
          .print-btn {
            background: #2563eb;
            color: #fff;
          }
          .print-btn:hover { background: #1d4ed8; }
          .close-btn {
            background: #e5e7eb;
            color: #374151;
          }
          .close-btn:hover { background: #d1d5db; }
          .page-footer {
            display: none;
          }
          .print-body {
            margin-top: 64px;
          }
        </style>
      </head>
      <body>
        <div class="print-btn-bar no-print">
          <span style="font-size:14px;color:#555;">Print Preview</span>
          <div style="display:flex;gap:8px;">
            <button class="close-btn" onclick="window.close()">Close</button>
            <button class="print-btn" onclick="window.print()">Print</button>
          </div>
        </div>
        <div class="page-footer no-screen"></div>
        <div class="print-body">
          <div class="print-header">
            <div class="print-title">${songTitle}</div>
            ${generateSubtitleHtml(meta.subtitle)}
            ${keyLabel || capoLabel ? `<div class="print-meta">${[keyLabel, capoLabel].filter(Boolean).join(" \u00B7 ")}</div>` : ""}
            ${chordSummary ? `<div class="print-chord-summary">Chords: ${chordSummary}</div>` : ""}
          </div>
          <div class="print-content">
            ${staffSystemsHtml}
          </div>
          ${generateChordDiagramsHtml(chords)}
          ${generateCreditsFooterHtml(meta)}
        </div>
        <script>
          // Calculate total pages and inject page footer text
          (function() {
            function updatePageCount() {
              var body = document.querySelector('.print-body');
              if (!body) return;
              var totalHeight = body.scrollHeight;
              // Page height: 11in - top margin - bottom margin at 96dpi
              var pageH = (11 - ${printMargins.top} - ${printMargins.bottom}) * 96;
              var totalPages = Math.max(1, Math.ceil(totalHeight / pageH));
              var footer = document.querySelector('.page-footer');
              if (footer) {
                footer.textContent = 'Page 1 of ' + totalPages;
              }
            }
            // Run after content loads
            if (document.readyState === 'complete') {
              setTimeout(updatePageCount, 100);
            } else {
              window.addEventListener('load', function() { setTimeout(updatePageCount, 100); });
            }
          })();
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();

    // Auto-trigger print dialog after content loads
    printWindow.onload = () => {
      printWindow.focus();
    };
  }, [songTitle, selectedKey, originalKey, chords, printOrientation, printMargins, displayAbc]);

  // Print lead sheet (lyrics with chord symbols)
  const handlePrintLeadSheet = useCallback(() => {
    if (!displayAbc) {
      toast.error("No sheet music available to generate a lead sheet");
      return;
    }

    const keyLabel = selectedKey === "original"
      ? (originalKey ? `Key: ${originalKey}` : "")
      : `Key: ${selectedKey}`;

    // Calculate capo info
    const currentKey = selectedKey === "original" ? originalKey : selectedKey;
    let capoLabel = "";
    if (currentKey && chords.length > 0) {
      const bestCapos = getBestCapoPositions(currentKey, chords, 1);
      if (bestCapos.length > 0 && bestCapos[0].fret > 0) {
        const ordinal = bestCapos[0].fret === 1 ? "1st" : bestCapos[0].fret === 2 ? "2nd" : bestCapos[0].fret === 3 ? "3rd" : `${bestCapos[0].fret}th`;
        capoLabel = `Capo ${ordinal} Fret (play in ${bestCapos[0].playKey})`;
      }
    }
    const combinedKeyLabel = [keyLabel, capoLabel].filter(Boolean).join(" \u00B7 ");
    const chordSummary = chords.length > 0 ? chords.join("  ") : "";

    const leadSheet = extractLeadSheet(displayAbc);

    if (leadSheet.sections.length === 0 || leadSheet.sections.every(s => s.lines.length === 0)) {
      toast.error("Could not extract lyrics from the sheet music. The song may not have lyrics.");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Pop-up blocked. Please allow pop-ups for this site.");
      return;
    }

    const meta = metadataRef.current;
    const html = generateLeadSheetHtml(leadSheet, songTitle, combinedKeyLabel, printMargins, chordSummary, meta.subtitle, meta);
    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();
    };
  }, [displayAbc, songTitle, selectedKey, originalKey, chords]);

  // Download All — combined PDF with all sheet music variations
  const handleDownloadAll = useCallback(async () => {
    if (!sheetRef.current || !displayAbc) return;
    const svgElement = sheetRef.current.querySelector("svg");
    if (!svgElement) {
      toast.error("No sheet music to export");
      return;
    }

    const { extractLeadSheet: extractLS } = await import("@/lib/leadSheetExtractor");
    const leadSheet = extractLS(displayAbc);

    if (leadSheet.sections.length === 0 || leadSheet.sections.every(s => s.lines.length === 0)) {
      toast.error("Could not extract lyrics for the lead sheet and Nashville chart. Only the notation PDF will be generated.");
      // Fall back to single PDF
      handleDownloadPDF();
      return;
    }

    setExporting(true);
    try {
      const keyLabel = selectedKey === "original"
        ? (originalKey ? `Key: ${originalKey}` : "")
        : `Key: ${selectedKey}`;

      // Get chord diagram SVGs from the rendered GuitarChordChart component
      const generateChordDiagramsSvgs = (): SVGElement[] => {
        const chordSection = sheetRef.current?.parentElement?.querySelector(".guitar-chord-chart-container");
        if (!chordSection) return [];
        return Array.from(chordSection.querySelectorAll("svg")) as SVGElement[];
      };

      // Wrap in a timeout to prevent infinite hangs
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("PDF generation timed out after 45 seconds")), 45000)
      );
      await Promise.race([
        exportCombinedPdf({
          svgElement,
          leadSheet,
          songTitle,
          keyLabel,
          chords,
          convertChordLine: convertChordLineToNashville,
          generateChordDiagramsSvgs,
        }),
        timeoutPromise,
      ]);
      toast.success("Complete sheet music package downloaded!");
    } catch (err: any) {
      console.error("[CombinedPDF] Export error:", err);
      const message = err?.message?.includes("timed out")
        ? "PDF generation timed out. Try refreshing the page and trying again."
        : "Failed to generate combined PDF. Try using Print All instead.";
      toast.error(message);
    } finally {
      setExporting(false);
    }
  }, [displayAbc, songTitle, selectedKey, originalKey, chords, handleDownloadPDF]);

  // Print All — open a single print-friendly window with all three formats
  const handlePrintAll = useCallback(() => {
    if (!sheetRef.current || !displayAbc) return;
    const svgElement = sheetRef.current.querySelector("svg");
    if (!svgElement) {
      toast.error("No sheet music to print");
      return;
    }

    const leadSheet = extractLeadSheet(displayAbc);

    if (leadSheet.sections.length === 0 || leadSheet.sections.every(s => s.lines.length === 0)) {
      toast.error("Could not extract lyrics. Falling back to notation-only print.");
      handlePrint();
      return;
    }

    const keyLabel = selectedKey === "original"
      ? (originalKey ? `Key: ${originalKey}` : "")
      : `Key: ${selectedKey}`;

    // Calculate capo info
    const currentKey = selectedKey === "original" ? originalKey : selectedKey;
    let capoLabel = "";
    if (currentKey && chords.length > 0) {
      const bestCapos = getBestCapoPositions(currentKey, chords, 1);
      if (bestCapos.length > 0 && bestCapos[0].fret > 0) {
        const ordinal = bestCapos[0].fret === 1 ? "1st" : bestCapos[0].fret === 2 ? "2nd" : bestCapos[0].fret === 3 ? "3rd" : `${bestCapos[0].fret}th`;
        capoLabel = `Capo ${ordinal} Fret (play in ${bestCapos[0].playKey})`;
      }
    }
    const combinedKeyLabel = [keyLabel, capoLabel].filter(Boolean).join(" \u00B7 ");
    const chordSummary = chords.length > 0 ? chords.join("  ") : "";

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Pop-up blocked. Please allow pop-ups for this site.");
      return;
    }

    const meta = metadataRef.current;
    const html = generatePrintAllHtml({
      svgElement,
      leadSheet,
      songTitle,
      keyLabel: combinedKeyLabel,
      chords,
      chordSummary,
      convertChordLine: convertChordLineToNashville,
      generateChordDiagramsHtml,
      subtitle: meta.subtitle,
      credits: meta,
    });
    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();
    };
  }, [displayAbc, songTitle, selectedKey, originalKey, chords, handlePrint]);

  // Print Nashville Number System lead sheet
  const handlePrintNashville = useCallback(() => {
    if (!displayAbc) {
      toast.error("No sheet music available to generate a Nashville chart");
      return;
    }

    const keyLabel = selectedKey === "original"
      ? (originalKey ? `Key: ${originalKey}` : "")
      : `Key: ${selectedKey}`;

    // Calculate capo info
    const currentKey = selectedKey === "original" ? originalKey : selectedKey;
    let capoLabel = "";
    if (currentKey && chords.length > 0) {
      const bestCapos = getBestCapoPositions(currentKey, chords, 1);
      if (bestCapos.length > 0 && bestCapos[0].fret > 0) {
        const ordinal = bestCapos[0].fret === 1 ? "1st" : bestCapos[0].fret === 2 ? "2nd" : bestCapos[0].fret === 3 ? "3rd" : `${bestCapos[0].fret}th`;
        capoLabel = `Capo ${ordinal} Fret (play in ${bestCapos[0].playKey})`;
      }
    }
    const combinedKeyLabel = [keyLabel, capoLabel].filter(Boolean).join(" \u00B7 ");
    const chordSummary = chords.length > 0 ? chords.join("  ") : "";

    const leadSheet = extractLeadSheet(displayAbc);

    if (leadSheet.sections.length === 0 || leadSheet.sections.every(s => s.lines.length === 0)) {
      toast.error("Could not extract lyrics from the sheet music. The song may not have lyrics.");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Pop-up blocked. Please allow pop-ups for this site.");
      return;
    }

    const meta = metadataRef.current;
    const html = generateNashvilleLeadSheetHtml(leadSheet, songTitle, combinedKeyLabel, convertChordLineToNashville, printMargins, chordSummary, meta.subtitle, meta);
    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();
    };
  }, [displayAbc, songTitle, selectedKey, originalKey, chords]);

  // Shared error banner component
  const renderErrorBanner = () => {
    if (!error) return null;
    const info = ERROR_INFO[error.type || "generation"];
    const Icon = info.icon;
    return (
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-5">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <Icon className="h-5 w-5 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-red-700 dark:text-red-400">{info.title}</h4>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">{error.message}</p>
            <p className="text-xs text-red-500/80 dark:text-red-400/60 mt-1.5">{info.suggestion}</p>
            {error.detail && (
              <details className="mt-2">
                <summary className="text-xs text-red-400 dark:text-red-500 cursor-pointer hover:text-red-500 dark:hover:text-red-400">
                  Technical details
                </summary>
                <pre className="text-xs text-red-400 dark:text-red-500 mt-1 whitespace-pre-wrap break-all bg-red-100/50 dark:bg-red-900/20 rounded p-2">
                  {error.detail}
                </pre>
              </details>
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-4 ml-8">
          <Button
            size="sm"
            onClick={() => {
              setError(null);
              handleGenerate();
            }}
            disabled={generateMutation.isPending}
            className="gap-1.5"
          >
            {generateMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            Try Again
          </Button>
          {error.type === "rendering" && abc && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setError(null);
                setRenderAttempt((n) => n + 1);
              }}
            >
              Re-render
            </Button>
          )}
        </div>
      </div>
    );
  };

  // Check if background generation might still be in progress
  const isBackgroundFailed = sheetMusicStatus === "failed";
  const isBackgroundGenerating = sheetMusicStatus === "generating" || sheetMusicStatus === "pending";
  // Only show "Preparing..." spinner when background generation is actively in progress
  // If status is null/undefined (never started) or failed, show the generate button instead
  const isPreparing = !abc && !error && !generateMutation.isPending && !isBackgroundFailed && isBackgroundGenerating;

  // Track how long we've been in "preparing" state to detect stuck jobs
  const [preparingStartTime] = useState(() => isPreparing ? Date.now() : 0);
  const [isStuckGenerating, setIsStuckGenerating] = useState(false);
  useEffect(() => {
    if (!isPreparing) {
      setIsStuckGenerating(false);
      return;
    }
    // If stuck in preparing for more than 90 seconds, show a retry option
    const timer = setTimeout(() => {
      setIsStuckGenerating(true);
    }, 90000);
    return () => clearTimeout(timer);
  }, [isPreparing, preparingStartTime]);

  // No ABC notation yet — show preparing state, key picker + generate button, or error
  if (!abc) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-6">
        {error ? (
          <div className="w-full max-w-md">
            {renderErrorBanner()}
          </div>
        ) : isBackgroundFailed ? (
          <>
            <div className="w-full max-w-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-5">
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-8 h-8 text-amber-500 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400">Sheet Music Generation Failed</h4>
                    <p className="text-xs text-amber-600 dark:text-amber-300 mt-1">
                      {sheetMusicError || "The automatic generation did not complete successfully."}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-amber-500/80 dark:text-amber-400/60 text-center">
                  You can try regenerating the sheet music below. Choose a key or let the AI decide.
                </p>
              </div>
            </div>
          </>
        ) : isPreparing ? (
          <>
            <div className="relative">
              <Music className="w-12 h-12 text-violet-400 animate-pulse" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-violet-100 rounded-full flex items-center justify-center">
                <Loader2 className="w-3 h-3 text-violet-600 animate-spin" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground">Preparing sheet music...</p>
              <p className="text-xs text-muted-foreground">
                {isStuckGenerating
                  ? "This is taking longer than expected. You can try regenerating below."
                  : "Sheet music is being generated automatically. This usually takes 15\u201330 seconds."}
              </p>
            </div>
            {isStuckGenerating && (
              <Button
                size="sm"
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-50"
                onClick={() => {
                  setIsStuckGenerating(false);
                  generateMutation.mutateAsync({ songId, key: undefined, force: true }).then((result) => {
                    if (result.abcNotation) {
                      setAbc(result.abcNotation);
                      hasRenderedOnceRef.current = false;
                      lastRenderedAbcRef.current = null;
                      setRenderAttempt((n) => n + 1);
                    }
                  }).catch((err: any) => {
                    setError(classifyError(err));
                  });
                }}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Retry Generation
              </Button>
            )}
          </>
        ) : (
          <>
            <Music className="w-12 h-12 text-muted-foreground/40" />
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground">No sheet music yet</p>
              <p className="text-xs text-muted-foreground">
                Generate a professional lead sheet with melody notation and chord symbols
              </p>
            </div>
          </>
        )}

        {/* Key selection before generation */}
        <div className="flex flex-col items-center gap-3 w-full max-w-xs">
          <div className="flex items-center gap-2 w-full">
            <label className="text-sm font-medium text-foreground whitespace-nowrap">Key:</label>
            <Select value={generateInKey} onValueChange={setGenerateInKey}>
              <SelectTrigger className="flex-1 h-9">
                <SelectValue placeholder="Select key" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  Auto{songKeySignature ? ` (${songKeySignature})` : ""}
                </SelectItem>
                {COMMON_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {generateInKey === "auto"
              ? songKeySignature
                ? `Will generate in the song's original key (${songKeySignature})`
                : "The AI will choose the best key for this song"
              : `Will generate sheet music in ${generateInKey}`}
          </p>
        </div>

        {isPreparing ? (
          <p className="text-xs text-muted-foreground">
            Or generate manually with a specific key:
          </p>
        ) : null}

        <Button
          onClick={handleGenerate}
          disabled={generateMutation.isPending}
          className={`gap-2 ${isBackgroundFailed ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
          variant={isPreparing ? "outline" : "default"}
          size={isBackgroundFailed ? "lg" : "default"}
        >
          {generateMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating Sheet Music...
            </>
          ) : (
            <>
              {isBackgroundFailed ? (
                <RefreshCw className="w-4 h-4" />
              ) : (
                <Music className="w-4 h-4" />
              )}
              {error ? "Try Again" : isBackgroundFailed ? "Regenerate Sheet Music" : isPreparing ? "Generate Now" : "Generate Sheet Music"}
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error banner (shown inline when sheet music exists but an error occurred) */}
      {error && renderErrorBanner()}

      {/* Action bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Music className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Lead Sheet</span>
          {originalKey && (
            <span className="text-xs text-muted-foreground">
              (Original: {originalKey})
            </span>
          )}
          {barCount > 0 && isRendered && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full cursor-pointer hover:bg-muted/80 transition-colors"
                  title="Click to edit tempo & time signature"
                >
                  <Hash className="w-3 h-3" />
                  {barCount} bars
                  {durationInfo && (
                    <>
                      <span className="text-muted-foreground/50">·</span>
                      <Clock className="w-3 h-3" />
                      {durationInfo.formatted}
                      {durationInfo.hasOverride && (
                        <Pencil className="w-2.5 h-2.5 text-primary" />
                      )}
                    </>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="start">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Duration Settings</h4>
                    {(bpmOverride !== null || timeSigOverride !== null) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs gap-1"
                        onClick={() => {
                          setBpmOverride(null);
                          setTimeSigOverride(null);
                        }}
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reset
                      </Button>
                    )}
                  </div>

                  {/* BPM Input */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Tempo (BPM)
                      {detectedMusicInfo && !detectedMusicInfo.tempoDetected && !bpmOverride && (
                        <span className="ml-1 text-yellow-500">· default</span>
                      )}
                      {bpmOverride !== null && (
                        <span className="ml-1 text-primary">· custom</span>
                      )}
                    </Label>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => {
                          const current = bpmOverride ?? detectedMusicInfo?.bpm ?? 120;
                          setBpmOverride(Math.max(20, current - 5));
                        }}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <Input
                        type="number"
                        min={20}
                        max={300}
                        className="h-7 text-center text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={bpmOverride ?? detectedMusicInfo?.bpm ?? 120}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val >= 20 && val <= 300) {
                            setBpmOverride(val);
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => {
                          const current = bpmOverride ?? detectedMusicInfo?.bpm ?? 120;
                          setBpmOverride(Math.min(300, current + 5));
                        }}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Time Signature Select */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Time Signature
                      {detectedMusicInfo && !detectedMusicInfo.timeSigDetected && !timeSigOverride && (
                        <span className="ml-1 text-yellow-500">· default</span>
                      )}
                      {timeSigOverride !== null && (
                        <span className="ml-1 text-primary">· custom</span>
                      )}
                    </Label>
                    <Select
                      value={timeSigOverride ?? detectedMusicInfo?.timeSig ?? "4/4"}
                      onValueChange={(val) => setTimeSigOverride(val)}
                    >
                      <SelectTrigger className="h-7 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2/4">2/4</SelectItem>
                        <SelectItem value="3/4">3/4</SelectItem>
                        <SelectItem value="4/4">4/4</SelectItem>
                        <SelectItem value="5/4">5/4</SelectItem>
                        <SelectItem value="6/4">6/4</SelectItem>
                        <SelectItem value="3/8">3/8</SelectItem>
                        <SelectItem value="6/8">6/8</SelectItem>
                        <SelectItem value="9/8">9/8</SelectItem>
                        <SelectItem value="12/8">12/8</SelectItem>
                        <SelectItem value="2/2">2/2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Duration display */}
                  {durationInfo && (
                    <div className="pt-1 border-t border-border/50">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Estimated duration</span>
                        <span className="font-medium">{durationInfo.formatted}</span>
                      </div>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* ─── GROUP 1: Key / Transpose ─── */}
          <div className="flex items-center gap-1.5 pr-3 border-r border-border/50">
            <Select value={selectedKey} onValueChange={setSelectedKey}>
              <SelectTrigger className="w-[110px] h-8 text-xs">
                <SelectValue placeholder="Key" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="original">
                  Original{originalKey ? ` (${originalKey})` : ""}
                </SelectItem>
                {COMMON_KEYS.map((key) => (
                  <SelectItem key={key} value={key} disabled={key === originalKey}>
                    {key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ─── GROUP 2: Export / Download (Primary Actions) ─── */}
          <div className="flex items-center gap-1.5 pr-3 border-r border-border/50">
            {/* Export to PDF — primary CTA */}
            <Button
              variant="default"
              size="sm"
              onClick={handleDownloadPDF}
              disabled={!isRendered || exporting}
              className="gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
              title="Export formatted 8.5x11 sheet music as PDF with all metadata"
            >
              {exporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              {exporting ? "Exporting..." : "Export PDF"}
            </Button>

            {/* Download All — combined PDF */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadAll}
              disabled={!isRendered || exporting}
              className="gap-1.5"
              title="Download all formats (notation + lead sheet + Nashville) as one PDF"
            >
              {exporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <PackageOpen className="w-3.5 h-3.5" />
              )}
              All Formats
            </Button>
          </div>

          {/* ─── GROUP 3: Print Options (Dropdown) ─── */}
          <div className="flex items-center gap-1.5 pr-3 border-r border-border/50">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!isRendered}
                  className="gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Print Format</DropdownMenuLabel>
                <DropdownMenuItem onClick={handlePrint}>
                  <Music className="w-4 h-4 mr-2" />
                  Full Notation
                  <span className="ml-auto text-xs text-muted-foreground">Standard</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePrintLeadSheet}>
                  <FileType className="w-4 h-4 mr-2" />
                  Lead Sheet
                  <span className="ml-auto text-xs text-muted-foreground">Lyrics + Chords</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePrintNashville}>
                  <Hash className="w-4 h-4 mr-2" />
                  Nashville Numbers
                  <span className="ml-auto text-xs text-muted-foreground">Session Chart</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handlePrintAll}>
                  <Layers className="w-4 h-4 mr-2" />
                  Print All Formats
                  <span className="ml-auto text-xs text-muted-foreground">Combined</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowMarginSettings(!showMarginSettings)}>
                  <Settings2 className="w-4 h-4 mr-2" />
                  Page Setup & Margins
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Print Preview */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPrintPreview(true)}
              disabled={!isRendered}
              className="gap-1.5"
              title="Preview how sheet music will look on paper"
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </Button>
          </div>

          {/* ─── GROUP 4: Edit ─── */}
          <div className="flex items-center gap-1.5 pr-3 border-r border-border/50">
            <Button
              variant={isEditing ? "default" : "outline"}
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              disabled={!isRendered}
              className="gap-1.5"
              title="Edit lyrics and chords directly"
            >
              <Pencil className="w-3.5 h-3.5" />
              {isEditing ? "Done" : "Edit"}
            </Button>
          </div>

          {/* ─── GROUP 5: Regenerate ─── */}
          <div className="flex items-center gap-1.5">
            <Select value={generateInKey} onValueChange={setGenerateInKey}>
              <SelectTrigger className="w-[95px] h-8 text-xs">
                <SelectValue placeholder="Key" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  Auto{songKeySignature ? ` (${songKeySignature})` : ""}
                </SelectItem>
                {COMMON_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={showLyricsInput ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowLyricsInput(!showLyricsInput)}
              title="Add lyrics before regenerating for better interpretation"
            >
              <FileText className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              className="gap-1.5"
              title="Regenerate sheet music with AI"
            >
              {generateMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Regenerate
            </Button>
          </div>
        </div>
      </div>

      {/* Lyrics Input Panel */}
      {showLyricsInput && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">Lyrics for Sheet Music Generation</h3>
            <button
              onClick={() => setShowLyricsInput(false)}
              className="text-amber-600 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200"
            >
              \u2715
            </button>
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-300 mb-2">
            Paste or type lyrics here before regenerating. The AI will use these words to better interpret the melody and align syllables.
          </p>
          <textarea
            value={lyricsInput}
            onChange={(e) => setLyricsInput(e.target.value)}
            placeholder="Verse 1:\nAmazing grace, how sweet the sound\nThat saved a wretch like me...\n\nChorus:\nI once was lost, but now am found..."
            className="w-full h-32 p-3 text-sm border border-amber-300 dark:border-amber-700 rounded-md bg-white dark:bg-amber-950/50 text-foreground resize-y font-mono"
          />
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            Tip: Include section labels (Verse 1, Chorus, Bridge) for better structure.
          </p>
        </div>
      )}

      {/* Print Margin Settings Panel */}
      {showMarginSettings && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">Print Margins (inches)</h3>
            <button
              onClick={() => setShowMarginSettings(false)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-200"
            >
              ✕
            </button>
          </div>
          {/* Orientation Toggle */}
          <div className="mb-4 pb-4 border-b border-blue-200 dark:border-blue-700">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">Page Orientation:</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPrintOrientation('landscape')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  printOrientation === 'landscape'
                    ? 'bg-blue-500 dark:bg-blue-600 text-white'
                    : 'bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100 hover:bg-blue-300 dark:hover:bg-blue-700'
                }`}
              >
                Landscape
              </button>
              <button
                onClick={() => setPrintOrientation('portrait')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  printOrientation === 'portrait'
                    ? 'bg-blue-500 dark:bg-blue-600 text-white'
                    : 'bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100 hover:bg-blue-300 dark:hover:bg-blue-700'
                }`}
              >
                Portrait
              </button>
            </div>
          </div>

          {/* Preset margin templates */}
          <div className="mb-4 pb-4 border-b border-blue-200 dark:border-blue-700">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">Margin Presets:</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPrintMargins({ top: 0.5, right: 0.5, bottom: 0.5, left: 0.5 })}
                className="px-3 py-1.5 text-xs font-medium bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100 rounded hover:bg-blue-300 dark:hover:bg-blue-700 transition-colors"
              >
                Narrow (0.5")
              </button>
              <button
                onClick={() => setPrintMargins({ top: 0.75, right: 0.75, bottom: 0.75, left: 0.75 })}
                className="px-3 py-1.5 text-xs font-medium bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100 rounded hover:bg-blue-300 dark:hover:bg-blue-700 transition-colors"
              >
                Standard (0.75")
              </button>
              <button
                onClick={() => setPrintMargins({ top: 1.0, right: 1.0, bottom: 1.0, left: 1.0 })}
                className="px-3 py-1.5 text-xs font-medium bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100 rounded hover:bg-blue-300 dark:hover:bg-blue-700 transition-colors"
              >
                Wide (1.0")
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {[
              { key: 'top', label: 'Top' },
              { key: 'right', label: 'Right' },
              { key: 'bottom', label: 'Bottom' },
              { key: 'left', label: 'Left' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs font-medium text-blue-700 dark:text-blue-300 block mb-1">
                  {label}
                </label>
                <input
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={printMargins[key as keyof typeof printMargins]}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setPrintMargins((prev: typeof printMargins) => ({
                      ...prev,
                      [key]: Math.max(0, Math.min(2, val))
                    }));
                  }}
                  className="w-full px-2 py-1 text-xs border border-blue-300 dark:border-blue-600 rounded bg-white dark:bg-blue-900/50 text-blue-900 dark:text-blue-100"
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-3">
            These settings will be saved and applied to all future prints.
          </p>

          {/* Custom Presets Section */}
          <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">Custom Presets:</p>
            
            {/* Save Preset Input */}
            {showPresetInput ? (
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Preset name..."
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && saveAsPreset()}
                  className="flex-1 px-2 py-1.5 text-xs border border-blue-300 dark:border-blue-600 rounded bg-white dark:bg-blue-900/50 text-blue-900 dark:text-blue-100"
                  autoFocus
                />
                <button
                  onClick={saveAsPreset}
                  className="px-3 py-1.5 text-xs font-medium bg-green-500 dark:bg-green-600 text-white rounded hover:bg-green-600 dark:hover:bg-green-700 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowPresetInput(false);
                    setPresetName('');
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded hover:bg-gray-400 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowPresetInput(true)}
                className="w-full px-3 py-1.5 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors mb-3"
              >
                + Save Current Settings as Preset
              </button>
            )}

            {/* Custom Presets List */}
            {customPresets.length > 0 && (
              <div className="space-y-2">
                {customPresets.map((preset, index) => (
                  <div key={index} className="flex items-center justify-between bg-blue-100 dark:bg-blue-900/50 p-2 rounded">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-blue-900 dark:text-blue-100">{preset.name}</p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        {preset.orientation} • {preset.margins.top}" margins
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => loadPreset(preset)}
                        className="px-2 py-1 text-xs font-medium bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => deletePreset(index)}
                        className="px-2 py-1 text-xs font-medium bg-red-500 dark:bg-red-600 text-white rounded hover:bg-red-600 dark:hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sheet Music Credits & Metadata Panel */}
      <SheetMusicMetadata
        songId={songId}
        songTitle={songTitle}
        onChange={handleMetadataChange}
      />

      {/* Playback controls with note highlighting and progress tracking */}
      <PlaybackControls
        abc={sanitisedDisplayAbc}
        onActiveNoteChange={onActiveNoteChange}
        onPlaybackStateChange={handlePlaybackStateChange}
      />

      {/* Progress bar above sheet music */}
      <SheetMusicProgressBar
        progress={playbackProgress}
        isActive={playbackIsActive}
        isPlaying={playbackIsPlaying}
      />

      {/* Sheet music rendering area with floating download button */}
      <div className="relative group">
        {/* Loading indicator shown before first render */}
        {sanitisedDisplayAbc && !isRendered && !error?.type && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Rendering sheet music...</span>
            </div>
          </div>
        )}
        {/* Actual rendering container — always visible, no opacity tricks */}
        <div
          id="sheet-music-render"
          ref={sheetRef}
          className="bg-white rounded-lg border border-border p-4 overflow-auto scroll-smooth"
          style={{ colorScheme: "light", maxHeight: "600px" }}
        />
        
        {/* Floating Download PDF Button - appears on hover */}
        {isRendered && (
          <Button
            onClick={handleDownloadPDF}
            disabled={exporting}
            className="absolute bottom-4 right-4 z-20 rounded-full w-12 h-12 p-0 shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center"
            title="Export formatted 8.5x11 sheet music as PDF with all metadata"
          >
            {exporting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Download className="w-5 h-5" />
            )}
          </Button>
        )}
      </div>

      {/* Guitar chord diagrams */}
      {chords.length > 0 && (
        <div className="guitar-chord-chart-container bg-card rounded-lg border border-border p-4">
          <GuitarChordChart chords={chords} />
        </div>
      )}

      {/* Sheet Music Editor */}
      {isEditing && abc && (
        <SheetMusicEditor
          abc={abc}
          onSave={async (updatedAbc) => {
            setIsSavingEdit(true);
            try {
              // Update local ABC state
              setAbc(updatedAbc);
              // Reset render tracking to re-render with new ABC
              hasRenderedOnceRef.current = false;
              lastRenderedAbcRef.current = null;
              setRenderAttempt((n) => n + 1);
              // Exit edit mode
              setIsEditing(false);
            } finally {
              setIsSavingEdit(false);
            }
          }}
          onCancel={() => setIsEditing(false)}
          isSaving={isSavingEdit}
        />
      )}

      {/* Capo chart for guitarists */}
      {chords.length > 0 && isRendered && (
        <CapoChart
          songKey={selectedKey === "original" ? (originalKey || songKeySignature || "C") : selectedKey}
          chords={chords}
        />
      )}

      {/* Sheet music quality feedback */}
      {isRendered && <SheetMusicFeedback songId={songId} initialFeedback={initialFeedback} />}

      {/* Print Preview Modal */}
      <PrintPreviewModal
        open={showPrintPreview}
        onOpenChange={setShowPrintPreview}
        abcNotation={displayAbc}
        songTitle={songTitle}
        keyLabel={selectedKey === "original" ? (originalKey ? `Key: ${originalKey}` : "") : `Key: ${selectedKey}`}
        capoLabel={(() => {
          const currentKey = selectedKey === "original" ? originalKey : selectedKey;
          if (currentKey && chords.length > 0) {
            const bestCapos = getBestCapoPositions(currentKey, chords, 1);
            if (bestCapos.length > 0 && bestCapos[0].fret > 0) {
              const ordinal = bestCapos[0].fret === 1 ? "1st" : bestCapos[0].fret === 2 ? "2nd" : bestCapos[0].fret === 3 ? "3rd" : `${bestCapos[0].fret}th`;
              return `Capo ${ordinal} Fret (play in ${bestCapos[0].playKey})`;
            }
          }
          return "";
        })()}
        chordSummary={chords.length > 0 ? chords.join("  ") : ""}
        chords={chords}
        credits={metadataRef.current}
        margins={printMargins}
        onPrint={handlePrint}
        onDownloadPdf={handleDownloadPDF}
        exporting={exporting}
      />
    </div>
  );
}

// ─── Feedback Component ─────────────────────────────────────────────────────

function SheetMusicFeedback({ songId, initialFeedback }: { songId: number; initialFeedback?: string | null }) {
  const [feedback, setFeedback] = useState<string | null>(initialFeedback ?? null);
  const [submitted, setSubmitted] = useState(false);
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [comment, setComment] = useState("");

  const feedbackMutation = trpc.songs.sheetMusicFeedback.useMutation({
    onSuccess: (result) => {
      setFeedback(result.feedback ?? null);
      setSubmitted(true);
      setShowCommentBox(false);
      setComment("");
      if (result.feedback === "up") {
        toast.success("Thanks for the positive feedback!");
      } else if (result.feedback === "down") {
        toast("Thanks for your feedback! Our AI is analyzing the issue to help us improve.");
      } else {
        toast("Feedback cleared.");
      }
      setTimeout(() => setSubmitted(false), 3000);
    },
    onError: (err) => toast.error("Failed to submit feedback: " + err.message),
  });

  const handleFeedback = (value: "up" | "down") => {
    if (feedback === value) {
      // Toggle off
      feedbackMutation.mutate({ songId, feedback: null });
      setShowCommentBox(false);
      setComment("");
      return;
    }
    if (value === "down") {
      // Show comment box first before submitting
      setShowCommentBox(true);
      return;
    }
    // Thumbs up — submit immediately
    feedbackMutation.mutate({ songId, feedback: value });
  };

  const submitNegativeFeedback = () => {
    feedbackMutation.mutate({
      songId,
      feedback: "down",
      comment: comment.trim() || undefined,
    });
  };

  const cancelComment = () => {
    setShowCommentBox(false);
    setComment("");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-2.5 border border-border">
        <span className="text-sm text-muted-foreground">
          {submitted
            ? "Thank you for your feedback!"
            : "How is the quality of this sheet music?"}
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className={`gap-1.5 h-8 px-3 transition-colors ${
              feedback === "up"
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "text-muted-foreground hover:text-green-600"
            }`}
            onClick={() => handleFeedback("up")}
            disabled={feedbackMutation.isPending}
          >
            <ThumbsUp className={`w-4 h-4 ${feedback === "up" ? "fill-current" : ""}`} />
            <span className="text-xs">Good</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`gap-1.5 h-8 px-3 transition-colors ${
              feedback === "down" || showCommentBox
                ? "bg-red-100 text-red-700 hover:bg-red-200"
                : "text-muted-foreground hover:text-red-600"
            }`}
            onClick={() => handleFeedback("down")}
            disabled={feedbackMutation.isPending}
          >
            <ThumbsDown className={`w-4 h-4 ${feedback === "down" || showCommentBox ? "fill-current" : ""}`} />
            <span className="text-xs">Needs Work</span>
          </Button>
        </div>
      </div>

      {/* Comment box appears when user clicks thumbs-down */}
      {showCommentBox && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
          <p className="text-sm text-red-700 font-medium">What's wrong with the sheet music?</p>
          <textarea
            className="w-full rounded-md border border-red-200 bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
            placeholder="e.g., The notes don't match the melody, wrong key, lyrics are misaligned... (optional)"
            rows={2}
            maxLength={1000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {comment.length}/1000 — Our AI will analyze your feedback
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={cancelComment} className="h-7 text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={submitNegativeFeedback}
                disabled={feedbackMutation.isPending}
                className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white"
              >
                {feedbackMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : null}
                Submit Feedback
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
