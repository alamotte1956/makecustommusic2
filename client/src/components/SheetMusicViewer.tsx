import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Download, Music, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { exportSheetMusicPDF } from "@/lib/pdfExport";
import { COMMON_KEYS, detectKeyFromABC, transposeABC } from "@/lib/transpose";

interface SheetMusicViewerProps {
  songId: number;
  abcNotation?: string | null;
  songTitle: string;
}

export default function SheetMusicViewer({ songId, abcNotation: initialAbc, songTitle }: SheetMusicViewerProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [abc, setAbc] = useState<string | null>(initialAbc ?? null);
  const [isRendered, setIsRendered] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string>("original");
  const generateMutation = trpc.songs.generateSheetMusic.useMutation();
  const utils = trpc.useUtils();

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

  const handleGenerate = useCallback(async () => {
    try {
      const result = await generateMutation.mutateAsync({ songId });
      setAbc(result.abcNotation);
      setSelectedKey("original");
      utils.songs.getById.invalidate({ id: songId });
      toast.success("Sheet music generated!");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate sheet music");
    }
  }, [songId, generateMutation, utils]);

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

  // No ABC notation yet — show generate button
  if (!abc) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Music className="w-12 h-12 text-muted-foreground/40" />
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-foreground">No sheet music yet</p>
          <p className="text-xs text-muted-foreground">
            Generate a professional lead sheet with melody notation and chord symbols
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
            Download PDF
          </Button>
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

      {/* Sheet music rendering area */}
      <div
        ref={sheetRef}
        className="bg-white rounded-lg border border-border p-4 min-h-[200px] overflow-x-auto"
        style={{ colorScheme: "light" }}
      />
    </div>
  );
}
