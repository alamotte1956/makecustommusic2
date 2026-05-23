import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Printer, Download, X, ZoomIn, ZoomOut, RotateCcw, Maximize2, Hash } from "lucide-react";
import { generateCreditsFooterHtml, generateSubtitleHtml, CREDITS_CSS, type PrintCreditsData } from "@/lib/printCreditsHtml";
import { generateChordDiagramsHtml } from "@/lib/chordSvgPrint";

export interface PrintPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The ABC notation to render for print preview */
  abcNotation: string | null;
  /** Song title */
  songTitle: string;
  /** Key label (e.g., "Key: G") */
  keyLabel: string;
  /** Capo label (e.g., "Capo 2nd Fret (play in E)") */
  capoLabel: string;
  /** Chord summary string (e.g., "G C D Em") */
  chordSummary: string;
  /** Array of chord names for chord diagrams */
  chords: string[];
  /** Credits/metadata for the footer */
  credits: PrintCreditsData;
  /** Print margins in inches */
  margins: { top: number; right: number; bottom: number; left: number };
  /** Callback to trigger actual print */
  onPrint: () => void;
  /** Callback to trigger PDF download */
  onDownloadPdf: () => void;
  /** Whether PDF export is in progress */
  exporting?: boolean;
}

/**
 * PrintPreviewModal — Shows a realistic paper-like preview of how the sheet music
 * will look when printed on 8.5x11 US Letter paper. Re-renders the ABC notation
 * at a fixed staffwidth optimized for print (520px ≈ 7.5in at 72dpi).
 */
export function PrintPreviewModal({
  open,
  onOpenChange,
  abcNotation,
  songTitle,
  keyLabel,
  capoLabel,
  chordSummary,
  chords,
  credits,
  margins,
  onPrint,
  onDownloadPdf,
  exporting = false,
}: PrintPreviewModalProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [renderedHtml, setRenderedHtml] = useState<string>("");
  const [zoom, setZoom] = useState(100);
  const [pageCount, setPageCount] = useState(1);
  const [showPageFooter, setShowPageFooter] = useState(true);

  // Re-render ABC at print-optimized dimensions when modal opens
  useEffect(() => {
    if (!open || !abcNotation) {
      setRenderedHtml("");
      return;
    }

    let cancelled = false;
    setLoading(true);

    const renderForPreview = async () => {
      try {
        // Create a hidden container to render the ABC at print width
        const container = document.createElement("div");
        container.style.position = "absolute";
        container.style.left = "-9999px";
        container.style.top = "0";
        container.style.width = "540px";
        document.body.appendChild(container);

        const abcjs = (await import("abcjs")).default;
        abcjs.renderAbc(container, abcNotation, {
          staffwidth: 520,
          paddingtop: 10,
          paddingbottom: 10,
          paddingleft: 5,
          paddingright: 5,
          add_classes: true,
          wrap: { minSpacing: 1.5, maxSpacing: 2.8, preferredMeasuresPerLine: 4 },
        });

        const svg = container.querySelector("svg");
        let svgHtml = "";
        if (svg) {
          // Split the single SVG into individual staff-system SVGs so that
          // each system can have page-break-inside: avoid applied via CSS.
          // This prevents bars from being cut off at page boundaries.
          const staffGroups = svg.querySelectorAll("g.abcjs-staff-group");
          if (staffGroups.length > 1) {
            const svgNS = "http://www.w3.org/2000/svg";
            const parts: string[] = [];
            staffGroups.forEach((group) => {
              const bbox = (group as SVGGraphicsElement).getBBox();
              const miniSvg = document.createElementNS(svgNS, "svg");
              miniSvg.setAttribute("xmlns", svgNS);
              miniSvg.setAttribute("width", "100%");
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
            svgHtml = parts.join("\n");
          } else {
            svg.setAttribute("width", "100%");
            svg.removeAttribute("height");
            svg.style.maxWidth = "100%";
            svg.style.height = "auto";
            svg.style.display = "block";
            svgHtml = svg.outerHTML;
          }
        }

        document.body.removeChild(container);

        if (cancelled) return;

        // Build the full page HTML
        const subtitleHtml = generateSubtitleHtml(credits.subtitle);
        const metaLine = [keyLabel, capoLabel].filter(Boolean).join(" \u00B7 ");
        const chordDiagramsHtml = generateChordDiagramsHtml(chords);
        const creditsHtml = generateCreditsFooterHtml(credits);

        const fullHtml = `
          <div class="print-header">
            <div class="print-title">${escapeHtml(songTitle)}</div>
            ${subtitleHtml}
            ${metaLine ? `<div class="print-meta">${metaLine}</div>` : ""}
            ${chordSummary ? `<div class="print-chord-summary">Chords: ${chordSummary}</div>` : ""}
          </div>
          <div class="print-content">
            ${svgHtml}
          </div>
          ${chordDiagramsHtml}
          ${creditsHtml}
        `;

        setRenderedHtml(fullHtml);

        // Estimate page count based on content height
        // 8.5x11 at 72dpi = 612x792px, minus margins
        requestAnimationFrame(() => {
          if (previewRef.current) {
            const contentHeight = previewRef.current.scrollHeight;
            const pageHeight = 792 - (margins.top + margins.bottom) * 72;
            setPageCount(Math.max(1, Math.ceil(contentHeight / pageHeight)));
          }
        });
      } catch (err) {
        console.error("[PrintPreview] Failed to render:", err);
        if (!cancelled) {
          setRenderedHtml("<p style='color:red;text-align:center;padding:2rem;'>Failed to render preview. Please try again.</p>");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    renderForPreview();
    return () => { cancelled = true; };
  }, [open, abcNotation, songTitle, keyLabel, capoLabel, chordSummary, chords, credits, margins]);

  // Reset zoom when modal closes
  useEffect(() => {
    if (!open) setZoom(100);
  }, [open]);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + 10, 200));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - 10, 25));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(100);
  }, []);

  const handleFitToWidth = useCallback(() => {
    // Calculate zoom to fit 8.5in page width within the preview container
    const container = previewRef.current?.parentElement?.parentElement;
    if (container) {
      const containerWidth = container.clientWidth - 48; // subtract padding
      const pageWidthPx = 8.5 * 96; // 8.5in at 96dpi
      const fitZoom = Math.round((containerWidth / pageWidthPx) * 100);
      setZoom(Math.max(25, Math.min(200, fitZoom)));
    }
  }, []);

  const zoomPresets = [25, 50, 75, 100, 125, 150, 175, 200];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[95vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div>
            <DialogHeader className="space-y-0">
              <DialogTitle className="text-lg">Print Preview</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {songTitle} — {pageCount > 1 ? `${pageCount} pages` : "1 page"} · US Letter (8.5" × 11")
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="flex items-center gap-2">
            {/* Zoom controls */}
            <div className="flex items-center gap-1 mr-2 border border-border rounded-md px-1 py-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleZoomOut}
                disabled={zoom <= 25}
                title="Zoom out (−10%)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </Button>
              {/* Zoom level dropdown */}
              <div className="relative group">
                <button
                  className="text-xs font-medium w-12 text-center tabular-nums py-1 px-1 rounded hover:bg-accent cursor-pointer"
                  title="Click to select zoom level"
                >
                  {zoom}%
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-popover border border-border rounded-md shadow-lg py-1 z-50 hidden group-hover:block min-w-[80px]">
                  {zoomPresets.map((preset) => (
                    <button
                      key={preset}
                      className={`block w-full text-left px-3 py-1 text-xs hover:bg-accent transition-colors ${
                        zoom === preset ? "font-bold text-violet-600" : ""
                      }`}
                      onClick={() => setZoom(preset)}
                    >
                      {preset}%
                    </button>
                  ))}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleZoomIn}
                disabled={zoom >= 200}
                title="Zoom in (+10%)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </Button>
              <div className="w-px h-4 bg-border mx-0.5" />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleFitToWidth}
                title="Fit to width"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleZoomReset}
                disabled={zoom === 100}
                title="Reset to 100%"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
              <div className="w-px h-4 bg-border mx-0.5" />
              <Button
                variant={showPageFooter ? "default" : "ghost"}
                size="icon"
                className={`h-7 w-7 ${showPageFooter ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-200" : ""}`}
                onClick={() => setShowPageFooter((v) => !v)}
                title={showPageFooter ? "Hide page numbers" : "Show page numbers"}
              >
                <Hash className="w-3.5 h-3.5" />
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onDownloadPdf();
              }}
              disabled={exporting || loading}
              className="gap-1.5"
            >
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              PDF
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onPrint();
              }}
              disabled={loading}
              className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </Button>
          </div>
        </div>

        {/* Preview area with paper simulation */}
        <div className="flex-1 overflow-auto bg-neutral-200 dark:bg-neutral-900 p-6 flex justify-center">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
              <p className="text-sm text-muted-foreground">Rendering print preview...</p>
            </div>
          ) : renderedHtml ? (
            <div
              className="transition-transform duration-200 origin-top"
              style={{ transform: `scale(${zoom / 100})`, width: zoom > 100 ? `${(100 / zoom) * 100}%` : "auto" }}
            >
              {/* Paper page simulation */}
              <div
                ref={previewRef}
                className="print-preview-page"
                style={{
                  width: "8.5in",
                  minHeight: "11in",
                  background: "white",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.15), 0 1px 4px rgba(0,0,0,0.1)",
                  borderRadius: "2px",
                  padding: `${margins.top}in ${margins.right}in ${margins.bottom}in ${margins.left}in`,
                  paddingBottom: `${Math.max(margins.bottom, 0.75)}in`,
                  fontFamily: "'Georgia', 'Times New Roman', serif",
                  color: "#000",
                  colorScheme: "light",
                  position: "relative",
                }}
              >
                <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
                {/* Page footer indicator */}
                {showPageFooter && (
                  <div
                    className="print-preview-page-footer"
                    style={{
                      position: "absolute",
                      bottom: "0.25in",
                      left: 0,
                      right: 0,
                      textAlign: "center",
                      fontSize: "10px",
                      color: "#999",
                      fontFamily: "'Georgia', 'Times New Roman', serif",
                    }}
                  >
                    Page 1 of {pageCount}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-20">
              <p className="text-sm text-muted-foreground">No content to preview</p>
            </div>
          )}
        </div>

        {/* Inline styles for the preview content */}
        <style>{`
          .print-preview-page .print-header {
            text-align: center;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 2px solid #333;
          }
          .print-preview-page .print-title {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 4px;
            letter-spacing: 0.5px;
            color: #000;
          }
          .print-preview-page .print-subtitle {
            font-size: 14px;
            color: #666;
            font-style: italic;
            margin-bottom: 4px;
          }
          .print-preview-page .print-meta {
            font-size: 14px;
            color: #555;
            margin-top: 4px;
          }
          .print-preview-page .print-chord-summary {
            font-family: 'Courier New', 'Consolas', monospace;
            font-size: 13px;
            font-weight: bold;
            color: #1a56db;
            margin-top: 8px;
            letter-spacing: 0.3px;
          }
          .print-preview-page .print-content {
            width: 100%;
            overflow: visible;
          }
          .print-preview-page .print-content svg {
            width: 100%;
            height: auto;
            display: block;
            max-width: 100%;
            margin: 0 auto;
          }
          .print-preview-page .staff-system-wrapper {
            page-break-inside: avoid;
            break-inside: avoid;
            margin-bottom: 2px;
          }
          .print-preview-page .staff-system-wrapper svg {
            width: 100%;
            height: auto;
            display: block;
            max-width: 100%;
            overflow: visible;
          }
          .print-preview-page .chord-section {
            margin-top: 32px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
          }
          .print-preview-page .chord-section-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            color: #000;
          }
          .print-preview-page .chord-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
            justify-content: flex-start;
          }
          .print-preview-page .credits-block {
            margin-top: 32px;
            padding-top: 12px;
            border-top: 1px solid #ccc;
            text-align: center;
            font-size: 10px;
            color: #666;
            line-height: 1.6;
          }
          .print-preview-page .credits-line {
            margin-bottom: 2px;
          }
          .print-preview-page .credits-label {
            font-weight: 600;
            color: #444;
          }
          .print-preview-page .credits-legal {
            margin-top: 4px;
            font-size: 9px;
            color: #888;
            letter-spacing: 0.2px;
          }
          .print-preview-page .credits-ccli {
            margin-top: 4px;
            font-size: 9px;
            font-weight: 600;
            color: #555;
            letter-spacing: 0.3px;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
