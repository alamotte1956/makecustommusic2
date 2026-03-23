import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Download, Music, RefreshCw, FileAudio, AlertCircle, WifiOff } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { exportSheetMusicPDF } from "@/lib/pdfExport";
import { COMMON_KEYS, detectKeyFromABC, transposeABC } from "@/lib/transpose";
import { downloadMidi, extractChordsFromABC } from "@/lib/midiExport";
import { GuitarChordChart } from "@/components/GuitarChordChart";
import { PlaybackControls } from "@/components/PlaybackControls";
import { SheetMusicProgressBar } from "@/components/SheetMusicProgressBar";
import { useNoteHighlight } from "@/hooks/useNoteHighlight";
import type { PlaybackState } from "@/lib/abcPlayer";

interface SheetMusicViewerProps {
  songId: number;
  abcNotation?: string | null;
  songTitle: string;
  songKeySignature?: string | null;
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

  return { type: "generation", message, detail: undefined };
}

export default function SheetMusicViewer({ songId, abcNotation: initialAbc, songTitle, songKeySignature }: SheetMusicViewerProps) {
  const { sheetRef, onActiveNoteChange } = useNoteHighlight();
  const [abc, setAbc] = useState<string | null>(initialAbc ?? null);
  const [isRendered, setIsRendered] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string>("original");
  const [generateInKey, setGenerateInKey] = useState<string>("auto");
  const [error, setError] = useState<ErrorState | null>(null);
  const generateMutation = trpc.songs.generateSheetMusic.useMutation();
  const utils = trpc.useUtils();

  // Sync local abc state when the parent passes updated initialAbc (e.g. from background generation)
  useEffect(() => {
    if (initialAbc && !abc) {
      setAbc(initialAbc);
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

  const handleGenerate = useCallback(async () => {
    setError(null);
    try {
      const keyParam = generateInKey === "auto" ? undefined : generateInKey;
      const result = await generateMutation.mutateAsync({ songId, key: keyParam });
      setAbc(result.abcNotation);
      setSelectedKey("original");
      utils.songs.getById.invalidate({ id: songId });
      toast.success("Sheet music generated!");
    } catch (err: any) {
      const errorState = classifyError(err);
      setError(errorState);
    }
  }, [songId, generateInKey, generateMutation, utils]);

  // Frontend-side ABC sanitisation: strip V: directives and %%staves as a safety net
  const sanitisedDisplayAbc = useMemo(() => {
    if (!displayAbc) return null;
    return displayAbc
      .split("\n")
      .filter((l) => !l.trim().startsWith("V:") && !l.trim().startsWith("%%staves"))
      .join("\n")
      .trim();
  }, [displayAbc]);

  // Render ABC notation using abcjs
  useEffect(() => {
    if (!sanitisedDisplayAbc || !sheetRef.current) return;

    setIsRendered(false);
    // Clear any previous rendering error when attempting to render new ABC
    setError((prev) => (prev?.type === "rendering" ? null : prev));

    import("abcjs").then((mod) => {
      const abcjs = mod.default || mod;
      if (!sheetRef.current) return;
      sheetRef.current.innerHTML = "";
      try {
        abcjs.renderAbc(sheetRef.current, sanitisedDisplayAbc, {
          responsive: "resize",
          staffwidth: 700,
          paddingtop: 20,
          paddingbottom: 20,
          paddingleft: 15,
          paddingright: 15,
          add_classes: true,
        });
        setIsRendered(true);
      } catch (renderErr: any) {
        setError({ type: "rendering", message: "Failed to render the sheet music notation.", detail: renderErr?.message });
      }
    }).catch((importErr: any) => {
      setError({ type: "rendering", message: "Failed to load the sheet music renderer.", detail: importErr?.message });
    });
  }, [sanitisedDisplayAbc]);

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
                // Force re-render by toggling abc
                const current = abc;
                setAbc(null);
                requestAnimationFrame(() => setAbc(current));
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
  // (song exists but no sheet music yet and no user-triggered error)
  const isPreparing = !abc && !error && !generateMutation.isPending;

  // No ABC notation yet — show preparing state, key picker + generate button, or error
  if (!abc) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-6">
        {error ? (
          <div className="w-full max-w-md">
            {renderErrorBanner()}
          </div>
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
          className="gap-2"
          variant={isPreparing ? "outline" : "default"}
        >
          {generateMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating Sheet Music...
            </>
          ) : (
            <>
              <Music className="w-4 h-4" />
              {error ? "Try Again" : isPreparing ? "Generate Now" : "Generate Sheet Music"}
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

      {/* Sheet music rendering area */}
      <div
        ref={sheetRef}
        className="bg-white rounded-lg border border-border p-4 min-h-[200px] overflow-x-auto scroll-smooth"
        style={{ colorScheme: "light" }}
      />

      {/* Guitar chord diagrams */}
      {chords.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-4">
          <GuitarChordChart chords={chords} />
        </div>
      )}
    </div>
  );
}
