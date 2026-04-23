import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Loader2,
  Download,
  Music,
  Mic2,
  Guitar,
  Piano,
  Drum,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { exportSheetMusicPDF } from "@/lib/pdfExport";

interface InstrumentPartsSectionProps {
  jobId: number;
  songTitle: string;
}

// Map part names to icons and colors
const PART_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string; borderColor: string }> = {
  vocals: { icon: Mic2, color: "text-rose-600", bgColor: "bg-rose-50", borderColor: "border-rose-200" },
  bass: { icon: Guitar, color: "text-amber-600", bgColor: "bg-amber-50", borderColor: "border-amber-200" },
  piano: { icon: Piano, color: "text-blue-600", bgColor: "bg-blue-50", borderColor: "border-blue-200" },
};

function sanitisePartAbc(abc: string): string {
  const lines = abc
    .split("\n")
    .filter((l) => {
      const t = l.trim();
      if (t.startsWith("V:") || t.startsWith("%%staves")) return false;
      if (/^![pmf]{1,3}!$/.test(t)) return false;
      return true;
    });
  // Remove blank lines between K: header and first music line
  const kIdx = lines.findIndex((l) => l.trim().startsWith("K:"));
  if (kIdx >= 0) {
    let i = kIdx + 1;
    while (i < lines.length && lines[i].trim() === "") {
      lines.splice(i, 1);
    }
  }
  return lines.join("\n").trim();
}

function PartRenderer({ abc, partName, songTitle }: { abc: string; partName: string; songTitle: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [exporting, setExporting] = useState(false);
  const hasRenderedOnceRef = useRef(false);

  const sanitisedAbc = useMemo(() => sanitisePartAbc(abc), [abc]);

  // Reset when ABC changes
  useEffect(() => {
    hasRenderedOnceRef.current = false;
    setIsRendered(false);
  }, [abc]);

  // Render ABC with abcjs
  useEffect(() => {
    if (!sanitisedAbc || !containerRef.current) return;
    if (hasRenderedOnceRef.current && isRendered) return;

    let cancelled = false;

    async function doRender() {
      const container = containerRef.current;
      if (!container || cancelled) return;

      const rect = container.getBoundingClientRect();
      if (rect.width < 10) {
        setTimeout(() => {
          if (!cancelled && containerRef.current) {
            setIsRendered(false); // trigger re-render
          }
        }, 300);
        return;
      }

      try {
        const mod = await import("abcjs");
        if (cancelled) return;
        const abcjs = mod.default || mod;
        if (!containerRef.current) return;
        containerRef.current.innerHTML = "";

        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        if (cancelled || !containerRef.current) return;

        const postRafRect = containerRef.current.getBoundingClientRect();
        if (postRafRect.width < 10) return;

        abcjs.renderAbc(containerRef.current, sanitisedAbc, {
          responsive: "resize",
          staffwidth: Math.max(500, Math.floor(postRafRect.width - 40)),
          paddingtop: 15,
          paddingbottom: 15,
          paddingleft: 10,
          paddingright: 10,
          add_classes: true,
        });

        const svg = containerRef.current.querySelector("svg");
        if (svg) {
          const paths = svg.querySelectorAll("path");
          if (paths.length > 3) {
            hasRenderedOnceRef.current = true;
            setIsRendered(true);
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error(`[InstrumentPart:${partName}] Render error:`, err);
        }
      }
    }

    doRender();
    return () => { cancelled = true; };
  }, [sanitisedAbc, isRendered, partName]);

  // Safety net
  useEffect(() => {
    if (isRendered || !sanitisedAbc) return;
    const timer = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;
      const svg = container.querySelector("svg");
      const paths = svg?.querySelectorAll("path");
      if (paths && paths.length > 3) {
        hasRenderedOnceRef.current = true;
        setIsRendered(true);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [isRendered, sanitisedAbc]);

  const handleDownloadPDF = useCallback(async () => {
    if (!containerRef.current) return;
    const svgElement = containerRef.current.querySelector("svg");
    if (!svgElement) {
      toast.error("No sheet music to export");
      return;
    }
    setExporting(true);
    try {
      const config = PART_CONFIG[partName];
      const label = config ? partName.charAt(0).toUpperCase() + partName.slice(1) : partName;
      await exportSheetMusicPDF(svgElement, `${songTitle} - ${label}`);
      toast.success(`${label} part PDF downloaded!`);
    } catch (err) {
      toast.error("Failed to export PDF");
      console.error(`[InstrumentPart:${partName}] PDF export error:`, err);
    } finally {
      setExporting(false);
    }
  }, [partName, songTitle]);

  const config = PART_CONFIG[partName] || PART_CONFIG.vocals;
  const Icon = config.icon;
  const label = partName.charAt(0).toUpperCase() + partName.slice(1);

  return (
    <div className={`rounded-lg border ${config.borderColor} overflow-hidden`}>
      <div className={`flex items-center justify-between px-4 py-2.5 ${config.bgColor}`}>
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${config.color}`} />
          <span className={`font-medium text-sm ${config.color}`}>{label}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadPDF}
          disabled={!isRendered || exporting}
          className="gap-1.5 h-7 text-xs"
        >
          {exporting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Download className="w-3 h-3" />
          )}
          PDF
        </Button>
      </div>
      <div className="relative">
        {!isRendered && sanitisedAbc && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        <div
          ref={containerRef}
          className={`bg-white p-3 min-h-[120px] overflow-x-auto transition-opacity duration-300 ${
            isRendered ? "opacity-100" : "opacity-0"
          }`}
          style={{ colorScheme: "light" }}
        />
      </div>
    </div>
  );
}

export function InstrumentPartsSection({ jobId, songTitle }: InstrumentPartsSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: partsData, isLoading, refetch } = trpc.songs.getInstrumentParts.useQuery(
    { jobId },
    {
      enabled: expanded,
      refetchInterval: isGenerating ? 3000 : false,
    }
  );

  const generateMutation = trpc.songs.generateInstrumentParts.useMutation({
    onSuccess: () => {
      setIsGenerating(true);
      toast.info("Generating instrument parts... This may take 30-60 seconds.");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to start parts generation");
    },
  });

  // Track generation status from polling
  useEffect(() => {
    if (!partsData) return;
    if (partsData.partsStatus === "done" || partsData.partsStatus === "error") {
      if (isGenerating) {
        setIsGenerating(false);
        if (partsData.partsStatus === "done") {
          toast.success("Instrument parts generated!");
        } else {
          toast.error("Failed to generate some instrument parts. Try again.");
        }
      }
    } else if (partsData.partsStatus === "generating") {
      setIsGenerating(true);
    }
  }, [partsData?.partsStatus, isGenerating]);

  const hasParts = partsData && partsData.partsStatus === "done" && Object.keys(partsData.parts).length > 0;
  const isIdle = !partsData || partsData.partsStatus === "idle" || partsData.partsStatus === null;
  const isError = partsData?.partsStatus === "error";

  return (
    <div className="bg-card rounded-xl border">
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-3">
          <div className="flex -space-x-1">
            <Mic2 className="h-4 w-4 text-rose-500" />
            <Guitar className="h-4 w-4 text-amber-500" />
            <Piano className="h-4 w-4 text-blue-500" />
          </div>
          <span className="font-semibold text-black">Instrument Parts</span>
          {hasParts && (
            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              {Object.keys(partsData.parts).length} parts ready
            </span>
          )}
          {isGenerating && (
            <span className="text-xs text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Generating...
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-6 pb-6 space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && (isIdle || isError) && !isGenerating && (
            <div className="text-center py-6 space-y-3">
              <p className="text-sm text-muted-foreground">
                Generate separate sheet music for each instrument part — Vocals, Bass, and Piano.
                Each part can be downloaded as an individual PDF.
              </p>
              <Button
                onClick={() => generateMutation.mutate({ jobId })}
                disabled={generateMutation.isPending || isGenerating}
                className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Music className="h-4 w-4" />
                )}
                {isError ? "Retry Generation" : "Generate Instrument Parts"}
              </Button>
              {isError && (
                <p className="text-xs text-red-500">
                  Previous generation failed. Click above to try again.
                </p>
              )}
            </div>
          )}

          {isGenerating && (
            <div className="text-center py-6 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500 mx-auto" />
              <p className="text-sm text-muted-foreground">
                Generating Vocals, Bass, and Piano parts with AI...
              </p>
              <p className="text-xs text-muted-foreground">
                This usually takes 30-60 seconds.
              </p>
            </div>
          )}

          {hasParts && !isGenerating && (
            <div className="space-y-3">
              {partsData.availableParts
                .filter((p) => p.hasAbc)
                .map((part) => (
                  <PartRenderer
                    key={part.name}
                    abc={partsData.parts[part.name]}
                    partName={part.name}
                    songTitle={songTitle}
                  />
                ))}

              {/* Regenerate button */}
              <div className="flex justify-center pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => generateMutation.mutate({ jobId })}
                  disabled={generateMutation.isPending}
                  className="gap-1.5 text-muted-foreground"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Regenerate Parts
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
