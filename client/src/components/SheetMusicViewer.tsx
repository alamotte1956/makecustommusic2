import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Download, Music, RefreshCw, FileAudio, FileText, AlertCircle, WifiOff, ThumbsUp, ThumbsDown, Printer, FileType, Hash, PackageOpen, Layers } from "lucide-react";
import { SheetMusicSkeleton } from "@/components/SheetMusicSkeleton";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { exportSheetMusicPDF } from "@/lib/pdfExport";
import { exportCombinedPdf } from "@/lib/combinedPdfExport";
import { COMMON_KEYS, detectKeyFromABC, transposeABC } from "@/lib/transpose";
import { downloadMidi, extractChordsFromABC } from "@/lib/midiExport";
import { downloadMusicXml } from "@/lib/musicXmlExport";
import { GuitarChordChart } from "@/components/GuitarChordChart";
import { generateChordDiagramsHtml } from "@/lib/chordSvgPrint";
import { generatePrintAllHtml } from "@/lib/printAllHtml";
import { extractLeadSheet, generateLeadSheetHtml, generateNashvilleLeadSheetHtml } from "@/lib/leadSheetExtractor";
import { convertChordLineToNashville } from "@/lib/nashvilleNumbers";
import { CapoChart } from "@/components/CapoChart";
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

export default function SheetMusicViewer({ songId, abcNotation: initialAbc, songTitle, songKeySignature, sheetMusicStatus, sheetMusicError, sheetMusicFeedback: initialFeedback }: SheetMusicViewerProps) {
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
  // Ref to prevent ResizeObserver from triggering re-renders after initial render
  const hasRenderedOnceRef = useRef(false);
  // Ref to prevent re-entry into the render function
  const isRenderingRef = useRef(false);
  // Track the last rendered ABC to avoid unnecessary re-renders
  const lastRenderedAbcRef = useRef<string | null>(null);
  const generateMutation = trpc.songs.generateSheetMusic.useMutation();
  const utils = trpc.useUtils();

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
  // IMPORTANT: Only trigger a re-render when transitioning from invisible (width=0)
  // to visible (width>0), NOT on every resize event, to avoid infinite loops.
  useEffect(() => {
    const container = sheetRef.current;
    if (!container) return;

    let wasVisible = false;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        const isNowVisible = width > 10;
        if (isNowVisible && !wasVisible) {
          // Transition from invisible to visible — trigger one render
          wasVisible = true;
          setContainerVisible(true);
          if (!hasRenderedOnceRef.current) {
            setRenderAttempt((n) => n + 1);
          }
        } else if (!isNowVisible && wasVisible) {
          wasVisible = false;
          setContainerVisible(false);
        }
      }
    });

    observer.observe(container);

    // Check initial width
    const rect = container.getBoundingClientRect();
    if (rect.width > 10) {
      wasVisible = true;
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
      // Reset render tracking so the new ABC will be rendered fresh
      hasRenderedOnceRef.current = false;
      lastRenderedAbcRef.current = null;
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
  // IMPORTANT: Guards against re-entry and infinite loops from ResizeObserver.
  useEffect(() => {
    if (!sanitisedDisplayAbc) return;

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
      if (!container) return;

      // CRITICAL: Check that the container has a non-zero width.
      const rect = container.getBoundingClientRect();
      if (rect.width < 10) {
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

        if (cancelled) { isRenderingRef.current = false; return; }

        // Log warnings for debugging
        if (visualObj?.[0]?.warnings?.length) {
          console.warn("[SheetMusic] abcjs warnings:", visualObj[0].warnings);
        }

        // Verify that actual music content was rendered (not just title)
        const svg = renderTarget.querySelector("svg");
        if (svg) {
          const pathElements = svg.querySelectorAll("path");
          console.log(`[SheetMusic] Rendered: SVG found, ${pathElements.length} paths, container width: ${postRafRect.width}`);

          if (pathElements.length < 5) {
            console.warn("[SheetMusic] Very few paths rendered — possible rendering issue.");
          }
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
      // Wrap in a timeout to prevent infinite hangs
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("PDF generation timed out after 30 seconds")), 30000)
      );
      await Promise.race([
        exportSheetMusicPDF(svgElement, songTitle + keyLabel),
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

  const handlePrint = useCallback(() => {
    if (!sheetRef.current) return;
    const svgElement = sheetRef.current.querySelector("svg");
    if (!svgElement) {
      toast.error("No sheet music to print");
      return;
    }

    const keyLabel = selectedKey === "original"
      ? (originalKey ? `Key: ${originalKey}` : "")
      : `Key: ${selectedKey}`;

    // Create a new window with print-friendly layout
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Pop-up blocked. Please allow pop-ups for this site.");
      return;
    }

    // Split the SVG into individual staff systems for clean page breaks
    const svgClone = svgElement.cloneNode(true) as SVGElement;
    const staffGroups = svgClone.querySelectorAll(".abcjs-staff-group");
    let staffSystemsHtml = "";

    if (staffGroups.length > 1) {
      // Extract each staff group as a separate SVG for page-break-inside:avoid
      const svgNS = "http://www.w3.org/2000/svg";
      const originalViewBox = svgElement.getAttribute("viewBox");
      const vbParts = originalViewBox?.split(/\s+/).map(Number) || [0, 0, 800, 600];
      const fullWidth = vbParts[2] || 800;

      staffGroups.forEach((group) => {
        const bbox = (group as SVGGraphicsElement).getBBox?.();
        if (!bbox || bbox.height === 0) return;

        // Add padding around each staff system
        const pad = 5;
        const y = Math.max(0, bbox.y - pad);
        const h = bbox.height + pad * 2;

        const miniSvg = document.createElementNS(svgNS, "svg");
        miniSvg.setAttribute("viewBox", `0 ${y} ${fullWidth} ${h}`);
        miniSvg.setAttribute("width", "100%");
        miniSvg.setAttribute("preserveAspectRatio", "xMinYMin meet");
        miniSvg.style.display = "block";
        miniSvg.style.maxWidth = "100%";
        miniSvg.style.height = "auto";

        // Copy defs (fonts, styles) from original
        const defs = svgClone.querySelector("defs");
        if (defs) miniSvg.appendChild(defs.cloneNode(true));
        // Copy style elements
        svgClone.querySelectorAll("style").forEach((s) => miniSvg.appendChild(s.cloneNode(true)));

        miniSvg.appendChild(group.cloneNode(true));
        staffSystemsHtml += `<div class="staff-system">${miniSvg.outerHTML}</div>`;
      });
    }

    // Fallback: if splitting failed or only one staff group, use the full SVG
    if (!staffSystemsHtml) {
      svgClone.removeAttribute("viewBox");
      svgClone.setAttribute("width", "100%");
      svgClone.style.maxWidth = "100%";
      svgClone.style.height = "auto";
      staffSystemsHtml = svgClone.outerHTML;
    }

    const currentYear = new Date().getFullYear();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${songTitle} - Sheet Music</title>
        <style>
          @page {
            size: letter portrait;
            margin: 0.75in;
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
            margin-bottom: 6px;
            letter-spacing: 0.5px;
          }
          .print-meta {
            font-size: 14px;
            color: #555;
            margin-top: 4px;
          }
          .print-content {
            width: 100%;
          }
          .print-content svg {
            width: 100%;
            height: auto;
            display: block;
          }
          .staff-system {
            page-break-inside: avoid;
            break-inside: avoid;
            margin-bottom: 2px;
          }
          .staff-system svg {
            width: 100%;
            height: auto;
            display: block;
          }
          .print-footer {
            margin-top: 32px;
            padding-top: 12px;
            border-top: 1px solid #ccc;
            text-align: center;
            font-size: 11px;
            color: #888;
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
          @media print {
            body { margin: 0; }
            .no-print { display: none !important; }
            .print-header {
              page-break-after: avoid;
            }
            .print-content {
              page-break-inside: auto;
            }
            .print-content svg {
              page-break-inside: avoid;
            }
            .chord-section {
              page-break-before: auto;
              page-break-inside: avoid;
            }
            .chord-grid {
              page-break-inside: avoid;
            }
            .print-footer {
              page-break-before: avoid;
              page-break-inside: avoid;
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
        <div class="print-body">
          <div class="print-header">
            <div class="print-title">${songTitle}</div>
            ${keyLabel ? `<div class="print-meta">${keyLabel}</div>` : ""}
          </div>
          <div class="print-content">
            ${staffSystemsHtml}
          </div>
          ${generateChordDiagramsHtml(chords)}
          <div class="print-footer">
            &copy; ${currentYear} Albert LaMotte &middot; Generated by Create Christian Music
          </div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();

    // Auto-trigger print dialog after content loads
    printWindow.onload = () => {
      printWindow.focus();
    };
  }, [songTitle, selectedKey, originalKey, chords]);

  // Print lead sheet (lyrics with chord symbols)
  const handlePrintLeadSheet = useCallback(() => {
    if (!displayAbc) {
      toast.error("No sheet music available to generate a lead sheet");
      return;
    }

    const keyLabel = selectedKey === "original"
      ? (originalKey ? `Key: ${originalKey}` : "")
      : `Key: ${selectedKey}`;

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

    const html = generateLeadSheetHtml(leadSheet, songTitle, keyLabel);
    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();
    };
  }, [displayAbc, songTitle, selectedKey, originalKey]);

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

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Pop-up blocked. Please allow pop-ups for this site.");
      return;
    }

    const html = generatePrintAllHtml({
      svgElement,
      leadSheet,
      songTitle,
      keyLabel,
      chords,
      convertChordLine: convertChordLineToNashville,
      generateChordDiagramsHtml,
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

    const html = generateNashvilleLeadSheetHtml(leadSheet, songTitle, keyLabel, convertChordLineToNashville);
    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();
    };
  }, [displayAbc, songTitle, selectedKey, originalKey]);

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

          {/* Print */}
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            disabled={!isRendered}
            className="gap-1.5"
            title="Open print-friendly view"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </Button>

          {/* Print Lead Sheet */}
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintLeadSheet}
            disabled={!isRendered}
            className="gap-1.5"
            title="Print lyrics with chord symbols (lead sheet)"
          >
            <FileType className="w-3.5 h-3.5" />
            Lead Sheet
          </Button>

          {/* Nashville Number Chart */}
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintNashville}
            disabled={!isRendered}
            className="gap-1.5"
            title="Print Nashville Number System chart"
          >
            <Hash className="w-3.5 h-3.5" />
            Nashville
          </Button>

          {/* Print All — all formats in one print-friendly window */}
          <Button
            variant="default"
            size="sm"
            onClick={handlePrintAll}
            disabled={!isRendered}
            className="gap-1.5"
            title="Print all sheet music formats in one window"
          >
            <Layers className="w-3.5 h-3.5" />
            Print All
          </Button>

          {/* Download All — combined PDF */}
          <Button
            variant="default"
            size="sm"
            onClick={handleDownloadAll}
            disabled={!isRendered || exporting}
            className="gap-1.5"
            title="Download all sheet music formats as a single PDF"
          >
            {exporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <PackageOpen className="w-3.5 h-3.5" />
            )}
            Download All
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
        <div className="guitar-chord-chart-container bg-card rounded-lg border border-border p-4">
          <GuitarChordChart chords={chords} />
        </div>
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
