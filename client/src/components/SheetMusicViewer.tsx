import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Download, Music, RefreshCw, FileAudio, FileText, AlertCircle, WifiOff } from "lucide-react";
import { SheetMusicSkeleton } from "@/components/SheetMusicSkeleton";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { exportSheetMusicPDF } from "@/lib/pdfExport";
import { COMMON_KEYS, detectKeyFromABC, transposeABC } from "@/lib/transpose";
import { downloadMidi, extractChordsFromABC } from "@/lib/midiExport";
import { downloadMusicXml } from "@/lib/musicXmlExport";
import { GuitarChordChart } from "@/components/GuitarChordChart";
import { PlaybackControls } from "@/components/PlaybackControls";
import { SheetMusicProgressBar } from "@/components/SheetMusicProgressBar";
import type { PlaybackState } from "@/lib/abcPlayer";

interface SheetMusicViewerProps {
  songId: number;
  abcNotation?: string | null;
  songTitle: string;
  songKeySignature?: string | null;
  sheetMusicStatus?: string | null;
  sheetMusicError?: string | null;
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
 * This only strips V: directives and %%staves as a safety net in case old data
 * was stored before the backend sanitiser was improved.
 */
function sanitiseAbcForRender(raw: string): string {
  return raw
    .split("\n")
    .filter((l) => {
      const t = l.trim();
      if (t.startsWith("V:") || t.startsWith("%%staves")) return false;
      return true;
    })
    .join("\n")
    .trim();
}

export default function SheetMusicViewer({ songId, abcNotation: initialAbc, songTitle, songKeySignature, sheetMusicStatus, sheetMusicError }: SheetMusicViewerProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const prevHighlightRef = useRef<Element | null>(null);
  const [abc, setAbc] = useState<string | null>(initialAbc ?? null);
  const [isRendered, setIsRendered] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string>("original");
  const [generateInKey, setGenerateInKey] = useState<string>("auto");
  const [error, setError] = useState<ErrorState | null>(null);
  // Counter to force re-render attempts
  const [renderAttempt, setRenderAttempt] = useState(0);
  // Track whether the container has a non-zero width (visible)
  const [containerVisible, setContainerVisible] = useState(false);
  const generateMutation = trpc.songs.generateSheetMusic.useMutation();
  const utils = trpc.useUtils();

  // Sync local abc state when the parent passes updated initialAbc (e.g. from background generation)
  useEffect(() => {
    if (initialAbc) {
      setAbc(initialAbc);
      setRenderAttempt((n) => n + 1);
    }
  }, [initialAbc]);

  // Progress bar state
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [playbackIsActive, setPlaybackIsActive] = useState(false);
  const [playbackIsPlaying, setPlaybackIsPlaying] = useState(false);

  const handlePlaybackStateChange = useCallback((state: PlaybackState) => {
    const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;
    setPlaybackProgress(progress);
    setPlaybackIsActive(state.isPlaying && !state.isPaused);
    setPlaybackIsPlaying(state.isPlaying);
  }, []);

  // Note highlighting callback
  const onActiveNoteChange = useCallback((noteIndex: number) => {
    const container = sheetRef.current;
    if (!container) return;
    if (prevHighlightRef.current) {
      prevHighlightRef.current.classList.remove("abcjs-note-active");
      prevHighlightRef.current = null;
    }
    if (noteIndex < 0) return;
    const noteEl = container.querySelector(`.abcjs-n${noteIndex}`);
    if (noteEl) {
      noteEl.classList.add("abcjs-note-active");
      prevHighlightRef.current = noteEl;
      // Auto-scroll to keep active note visible
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
    }
  }, []);

  // ─── ResizeObserver: detect when the container becomes visible (non-zero width) ───
  // This is critical for tabs: when the sheet music tab is hidden, the container has
  // width 0. abcjs with responsive:'resize' computes staff width from container width,
  // producing a minimal SVG with only the title when width is 0.
  useEffect(() => {
    const container = sheetRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (width > 0) {
          setContainerVisible(true);
          // Force a re-render when the container becomes visible
          setRenderAttempt((n) => n + 1);
        } else {
          setContainerVisible(false);
        }
      }
    });

    observer.observe(container);

    // Check initial width
    const rect = container.getBoundingClientRect();
    if (rect.width > 0) {
      setContainerVisible(true);
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

  const handleGenerate = useCallback(async () => {
    setError(null);
    try {
      const keyParam = generateInKey === "auto" ? undefined : generateInKey;
      const result = await generateMutation.mutateAsync({ songId, key: keyParam });
      setAbc(result.abcNotation);
      setSelectedKey("original");
      setRenderAttempt((n) => n + 1);
      utils.songs.getById.invalidate({ id: songId });
      toast.success("Sheet music generated!");
    } catch (err: any) {
      const errorState = classifyError(err);
      setError(errorState);
    }
  }, [songId, generateInKey, generateMutation, utils]);

  // ─── Core rendering effect ───
  // Renders the ABC notation using abcjs when:
  // 1. We have sanitised ABC notation
  // 2. The container is in the DOM
  // 3. The container has a non-zero width (visible — not in a hidden tab)
  // Uses renderAttempt as a dependency to allow forced re-renders.
  useEffect(() => {
    if (!sanitisedDisplayAbc) return;

    let cancelled = false;

    async function doRender() {
      const container = sheetRef.current;
      if (!container) return;

      // CRITICAL: Check that the container has a non-zero width.
      // When inside a hidden tab (e.g., Radix TabsContent), the container exists
      // in the DOM but has width 0. abcjs with responsive:'resize' computes staff
      // width from the container width — with width 0, it produces a minimal SVG
      // containing only the title text and no musical notation.
      const rect = container.getBoundingClientRect();
      if (rect.width < 10) {
        // Container is not visible yet — the ResizeObserver will trigger
        // a re-render when it becomes visible
        return;
      }

      setIsRendered(false);
      setError((prev) => (prev?.type === "rendering" ? null : prev));

      try {
        const mod = await import("abcjs");
        if (cancelled) return;

        const abcjs = mod.default || mod;
        const renderTarget = container;

        // Clear previous content
        renderTarget.innerHTML = "";

        // Ensure the container has an ID
        if (!renderTarget.id) renderTarget.id = "sheet-music-render";

        // Wait for next animation frame to ensure layout is fully computed
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        if (cancelled) return;

        // Double-check width after rAF
        const postRafRect = renderTarget.getBoundingClientRect();
        if (postRafRect.width < 10) return;

        // Render the ABC notation
        const visualObj = abcjs.renderAbc(renderTarget, sanitisedDisplayAbc!, {
          responsive: "resize",
          staffwidth: Math.max(600, Math.floor(postRafRect.width - 40)),
          paddingtop: 20,
          paddingbottom: 20,
          paddingleft: 15,
          paddingright: 15,
          add_classes: true,
        });

        if (cancelled) return;

        // Log warnings for debugging
        if (visualObj?.[0]?.warnings?.length) {
          console.warn("[SheetMusic] abcjs warnings:", visualObj[0].warnings);
        }

        // Verify that actual music content was rendered (not just title)
        const svg = renderTarget.querySelector("svg");
        if (svg) {
          const noteElements = renderTarget.querySelectorAll("[data-name]");
          const pathElements = svg.querySelectorAll("path");
          const noteClasses = renderTarget.querySelectorAll("[class*='abcjs-n']");
          console.log(`[SheetMusic] Rendered: SVG found, ${pathElements.length} paths, ${noteElements.length} data-name elements, ${noteClasses.length} note classes, container width: ${postRafRect.width}`);

          // If we got an SVG but no paths (just title), the render failed silently
          if (pathElements.length < 5) {
            console.warn("[SheetMusic] Very few paths rendered — possible zero-width issue. Will retry on next resize.");
          }
        }

        setIsRendered(true);
      } catch (err: any) {
        if (!cancelled) {
          console.error("[SheetMusic] Render error:", err);
          setError({ type: "rendering", message: "Failed to render the sheet music notation.", detail: err?.message });
        }
      }
    }

    doRender();

    return () => {
      cancelled = true;
    };
  }, [sanitisedDisplayAbc, renderAttempt, containerVisible]);

  const handleDownloadPDF = useCallback(async () => {
    if (!sheetRef.current) return;
    const svgElement = sheetRef.current.querySelector("svg");
    if (!svgElement) {
      toast.error("No sheet music to export");
      return;
    }
    setExporting(true);
    try {
      const keyLabel = selectedKey === "original"
        ? (originalKey ? ` (Key: ${originalKey})` : "")
        : ` (Key: ${selectedKey})`;
      await exportSheetMusicPDF(svgElement, songTitle + keyLabel);
      toast.success("Sheet music PDF downloaded!");
    } catch {
      toast.error("Failed to export sheet music PDF");
    } finally {
      setExporting(false);
    }
  }, [songTitle, selectedKey, originalKey]);

  const handleDownloadMIDI = useCallback(() => {
    if (!sanitisedDisplayAbc) return;
    try {
      const keyLabel = selectedKey === "original"
        ? (originalKey ? `-${originalKey}` : "")
        : `-${selectedKey}`;
      downloadMidi(sanitisedDisplayAbc, `${songTitle}${keyLabel}`);
      toast.success("MIDI file downloaded!");
    } catch {
      toast.error("Failed to export MIDI file");
    }
  }, [sanitisedDisplayAbc, songTitle, selectedKey, originalKey]);

  const handleDownloadMusicXml = useCallback(() => {
    if (!sanitisedDisplayAbc) return;
    try {
      const keyLabel = selectedKey === "original"
        ? (originalKey ? `-${originalKey}` : "")
        : `-${selectedKey}`;
      downloadMusicXml(sanitisedDisplayAbc, `${songTitle}${keyLabel}`);
      toast.success("MusicXML file downloaded! Open it in MuseScore, Finale, or Sibelius.");
    } catch (e: any) {
      toast.error(e?.message || "Failed to export MusicXML file");
    }
  }, [sanitisedDisplayAbc, songTitle, selectedKey, originalKey]);

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
                Sheet music is being generated automatically. This usually takes 15–30 seconds.
              </p>
            </div>
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
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Key selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Transpose to:</span>
            <Select value={selectedKey} onValueChange={setSelectedKey}>
              <SelectTrigger className="w-[100px] h-8 text-xs">
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

          {/* Download PDF */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            disabled={!isRendered || exporting}
            className="gap-1.5"
          >
            {exporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            PDF
          </Button>

          {/* Download MIDI */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadMIDI}
            disabled={!isRendered}
            className="gap-1.5"
          >
            <FileAudio className="w-3.5 h-3.5" />
            MIDI
          </Button>

          {/* Download MusicXML */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadMusicXml}
            disabled={!isRendered}
            className="gap-1.5"
            title="Download MusicXML for Finale, MuseScore, Sibelius"
          >
            <FileText className="w-3.5 h-3.5" />
            MusicXML
          </Button>

          {/* Regenerate with key selection */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Regenerate in:</span>
            <Select value={generateInKey} onValueChange={setGenerateInKey}>
              <SelectTrigger className="w-[100px] h-8 text-xs">
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
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="gap-1.5"
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

      {/* Sheet music rendering area with skeleton overlay */}
      <div className="relative">
        {/* Skeleton shown while rendering */}
        {sanitisedDisplayAbc && !isRendered && !error?.type && (
          <div className="absolute inset-0 z-10">
            <SheetMusicSkeleton />
          </div>
        )}
        {/* Actual rendering container — always in the DOM with full width so
            abcjs can compute staff layout. Opacity transitions to reveal once rendered. */}
        <div
          id="sheet-music-render"
          ref={sheetRef}
          className={`bg-white rounded-lg border border-border p-4 min-h-[200px] overflow-x-auto scroll-smooth transition-opacity duration-500 ease-in-out ${
            isRendered ? "opacity-100" : "opacity-0"
          }`}
          style={{ colorScheme: "light" }}
        />
      </div>

      {/* Guitar chord diagrams */}
      {chords.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-4">
          <GuitarChordChart chords={chords} />
        </div>
      )}
    </div>
  );
}
