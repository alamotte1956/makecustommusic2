import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Download, Music, RefreshCw, FileAudio } from "lucide-react";
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

export default function SheetMusicViewer({ songId, abcNotation: initialAbc, songTitle, songKeySignature }: SheetMusicViewerProps) {
  const { sheetRef, onActiveNoteChange } = useNoteHighlight();
  const [abc, setAbc] = useState<string | null>(initialAbc ?? null);
  const [isRendered, setIsRendered] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string>("original");
  const [generateInKey, setGenerateInKey] = useState<string>("auto");
  const generateMutation = trpc.songs.generateSheetMusic.useMutation();
  const utils = trpc.useUtils();

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
    try {
      const keyParam = generateInKey === "auto" ? undefined : generateInKey;
      const result = await generateMutation.mutateAsync({ songId, key: keyParam });
      setAbc(result.abcNotation);
      setSelectedKey("original");
      utils.songs.getById.invalidate({ id: songId });
      toast.success("Sheet music generated!");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate sheet music");
    }
  }, [songId, generateInKey, generateMutation, utils]);

  // Render ABC notation using abcjs
  useEffect(() => {
    if (!displayAbc || !sheetRef.current) return;

    setIsRendered(false);

    import("abcjs").then((abcjs) => {
      if (!sheetRef.current) return;
      sheetRef.current.innerHTML = "";
      abcjs.renderAbc(sheetRef.current, displayAbc, {
        responsive: "resize",
        staffwidth: 700,
        paddingtop: 20,
        paddingbottom: 20,
        paddingleft: 15,
        paddingright: 15,
        add_classes: true,
      });
      setIsRendered(true);
    }).catch(() => {
      toast.error("Failed to render sheet music");
    });
  }, [displayAbc]);

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
    if (!displayAbc) return;
    try {
      const keyLabel = selectedKey === "original"
        ? (originalKey ? `-${originalKey}` : "")
        : `-${selectedKey}`;
      downloadMidi(displayAbc, `${songTitle}${keyLabel}`);
      toast.success("MIDI file downloaded!");
    } catch {
      toast.error("Failed to export MIDI file");
    }
  }, [displayAbc, songTitle, selectedKey, originalKey]);

  // No ABC notation yet — show key picker + generate button
  if (!abc) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-6">
        <Music className="w-12 h-12 text-muted-foreground/40" />
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-foreground">No sheet music yet</p>
          <p className="text-xs text-muted-foreground">
            Generate a professional lead sheet with melody notation and chord symbols
          </p>
        </div>

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

        <Button
          onClick={handleGenerate}
          disabled={generateMutation.isPending}
          className="gap-2"
        >
          {generateMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating Sheet Music...
            </>
          ) : (
            <>
              <Music className="w-4 h-4" />
              Generate Sheet Music
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
        abc={displayAbc}
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
