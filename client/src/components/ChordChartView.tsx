import { useState, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Printer, Guitar, Music, Loader2, Copy, Check } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { COMMON_KEYS, detectKeyFromABC, transposeABC } from "@/lib/transpose";
import { extractLeadSheet, type LeadSheet, type LeadSheetSection } from "@/lib/leadSheetExtractor";
import { GuitarChordChart } from "@/components/GuitarChordChart";
import { CapoChart } from "@/components/CapoChart";
import { extractChordsFromABC } from "@/lib/midiExport";
import { getBestCapoPositions } from "@/lib/capoChart";
import { exportLyricsPDF } from "@/lib/pdfExport";

interface ChordChartViewProps {
  /** ABC notation string */
  abc: string;
  /** Song title */
  songTitle: string;
  /** Original key signature from metadata */
  songKeySignature?: string | null;
}

/**
 * ChordChartView — a worship-team-friendly lead sheet view that shows
 * chord symbols above lyrics in a clean, readable format.
 * This is the format most commonly used by worship leaders and guitarists.
 */
export function ChordChartView({ abc, songTitle, songKeySignature }: ChordChartViewProps) {
  const { user } = useAuth();
  const contentRef = useRef<HTMLDivElement>(null);
  const [selectedKey, setSelectedKey] = useState<string>("original");
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState<"sm" | "md" | "lg">("md");

  // Detect original key from ABC
  const originalKey = useMemo(() => {
    if (!abc) return songKeySignature || null;
    return detectKeyFromABC(abc) || songKeySignature || null;
  }, [abc, songKeySignature]);

  // Transpose ABC if needed
  const displayAbc = useMemo(() => {
    if (!abc) return null;
    if (selectedKey === "original" || !originalKey) return abc;
    return transposeABC(abc, originalKey, selectedKey);
  }, [abc, selectedKey, originalKey]);

  // Extract lead sheet from ABC
  const leadSheet = useMemo<LeadSheet | null>(() => {
    if (!displayAbc) return null;
    return extractLeadSheet(displayAbc);
  }, [displayAbc]);

  // Extract chords for chord diagrams and capo chart
  const chords = useMemo(() => {
    if (!displayAbc) return [];
    return extractChordsFromABC(displayAbc);
  }, [displayAbc]);

  // Current display key
  const displayKey = selectedKey === "original" ? originalKey : selectedKey;

  // Best capo position
  const capoInfo = useMemo(() => {
    if (!displayKey || chords.length === 0) return null;
    const best = getBestCapoPositions(displayKey, chords, 1);
    if (best.length > 0 && best[0].fret > 0) {
      return { fret: best[0].fret, playKey: best[0].playKey };
    }
    return null;
  }, [displayKey, chords]);

  // Font size classes
  const fontClasses = {
    sm: { chord: "text-xs", lyrics: "text-sm", section: "text-xs" },
    md: { chord: "text-sm", lyrics: "text-base", section: "text-sm" },
    lg: { chord: "text-base", lyrics: "text-lg", section: "text-base" },
  };
  const fc = fontClasses[fontSize];

  // Print the chord chart
  const handlePrint = useCallback(() => {
    if (!leadSheet) return;
    const currentYear = new Date().getFullYear();
    const keyLabel = displayKey ? `Key: ${displayKey}` : "";
    const capoLabel = capoInfo ? `Capo: Fret ${capoInfo.fret} (play in ${capoInfo.playKey})` : "";
    const copyrightName = user?.name || "Albert LaMotte";

    let sectionsHtml = "";
    for (const section of leadSheet.sections) {
      let sectionContent = "";
      if (section.label) {
        sectionContent += `<div class="section-label">${escapeHtml(section.label)}</div>`;
      }
      for (const line of section.lines) {
        sectionContent += `<div class="lead-line">`;
        if (line.chords) {
          sectionContent += `<pre class="chord-line">${escapeHtml(line.chords)}</pre>`;
        }
        if (line.lyrics) {
          sectionContent += `<pre class="lyrics-line">${escapeHtml(line.lyrics)}</pre>`;
        }
        sectionContent += `</div>`;
      }
      sectionsHtml += `<div class="section">${sectionContent}</div>`;
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>${escapeHtml(songTitle)} - Chord Chart</title>
  <style>
    @page { size: letter portrait; margin: 0.75in; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      color: #000; background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header {
      text-align: center;
      margin-bottom: 24px;
      padding-bottom: 12px;
      border-bottom: 2px solid #333;
    }
    .title { font-size: 26px; font-weight: bold; margin-bottom: 4px; }
    .subtitle { font-size: 12px; color: #666; font-style: italic; }
    .meta {
      display: flex; justify-content: center; gap: 20px;
      font-size: 13px; color: #444; margin-top: 6px;
    }
    .meta-item { font-weight: 600; }
    .capo-badge {
      background: #fef3c7; color: #92400e; padding: 2px 10px;
      border-radius: 4px; font-weight: 600; border: 1px solid #fcd34d;
    }
    .section { margin-bottom: 20px; page-break-inside: avoid; break-inside: avoid; }
    .section-label {
      font-size: 13px; font-weight: bold; text-transform: uppercase;
      letter-spacing: 1px; color: #444; margin-bottom: 6px;
      padding-bottom: 3px; border-bottom: 1px solid #ddd;
    }
    .lead-line { margin-bottom: 2px; }
    .chord-line {
      font-family: 'Courier New', monospace;
      font-size: 13px; font-weight: bold; color: #1a56db;
      line-height: 1.4; margin: 0; white-space: pre;
    }
    .lyrics-line {
      font-family: 'Georgia', serif;
      font-size: 14px; line-height: 1.5; margin: 0 0 6px 0;
      white-space: pre-wrap;
    }
    .footer {
      margin-top: 28px; padding-top: 10px;
      border-top: 1px solid #ccc; text-align: center;
      font-size: 10px; color: #999;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">${escapeHtml(songTitle)}</div>
    <div class="subtitle">Chord Chart &bull; Lead Sheet</div>
    <div class="meta">
      ${keyLabel ? `<span class="meta-item">${keyLabel}</span>` : ""}
      ${leadSheet.meter ? `<span class="meta-item">Time: ${leadSheet.meter}</span>` : ""}
      ${capoLabel ? `<span class="capo-badge">${capoLabel}</span>` : ""}
    </div>
  </div>
  ${sectionsHtml}
  <div class="footer">
    &copy; ${currentYear} ${escapeHtml(copyrightName)} &middot; Generated with Create Christian Music &middot; createchristianmusic.com
  </div>
</body>
</html>`;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Pop-up blocked. Please allow pop-ups for this site.");
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => printWindow.focus();
  }, [leadSheet, songTitle, displayKey, capoInfo, user?.name]);

  // Copy chord chart as plain text
  const handleCopy = useCallback(() => {
    if (!leadSheet) return;
    let text = `${songTitle}\n`;
    if (displayKey) text += `Key: ${displayKey}\n`;
    if (capoInfo) text += `Capo: Fret ${capoInfo.fret} (play in ${capoInfo.playKey})\n`;
    text += "\n";

    for (const section of leadSheet.sections) {
      if (section.label) text += `[${section.label}]\n`;
      for (const line of section.lines) {
        if (line.chords) text += `${line.chords}\n`;
        if (line.lyrics) text += `${line.lyrics}\n`;
      }
      text += "\n";
    }

    navigator.clipboard.writeText(text.trim()).then(() => {
      setCopied(true);
      toast.success("Chord chart copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast.error("Failed to copy to clipboard");
    });
  }, [leadSheet, songTitle, displayKey, capoInfo]);

  // Download as PDF (uses lyrics PDF format with chord info)
  const handleDownloadPDF = useCallback(async () => {
    if (!leadSheet) return;
    setExporting(true);
    try {
      // Build a text version with chords above lyrics
      let fullText = "";
      for (const section of leadSheet.sections) {
        if (section.label) fullText += `[${section.label}]\n\n`;
        for (const line of section.lines) {
          if (line.chords) fullText += `${line.chords}\n`;
          if (line.lyrics) fullText += `${line.lyrics}\n`;
        }
        fullText += "\n";
      }

      const keyLabel = displayKey
        ? selectedKey !== "original"
          ? ` (Key: ${selectedKey})`
          : ` (Key: ${originalKey})`
        : "";

      const copyrightName = user?.name || undefined;
      exportLyricsPDF(
        fullText.trim(),
        songTitle + keyLabel,
        {
          key: displayKey || undefined,
        },
        copyrightName,
      );
      toast.success("Chord chart PDF downloaded!");
    } catch {
      toast.error("Failed to export PDF");
    } finally {
      setExporting(false);
    }
  }, [leadSheet, songTitle, displayKey, selectedKey, originalKey, user?.name]);

  if (!abc) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Music className="w-10 h-10 mb-3 opacity-40" />
        <p className="text-sm">No sheet music available to generate chord chart from.</p>
      </div>
    );
  }

  if (!leadSheet || leadSheet.sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Guitar className="w-10 h-10 mb-3 opacity-40" />
        <p className="text-sm">Could not extract chord chart from the sheet music.</p>
        <p className="text-xs mt-1">Try regenerating the sheet music first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Guitar className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-medium">Chord Chart</span>
          {originalKey && (
            <Badge variant="outline" className="text-xs">
              Key: {displayKey || originalKey}
            </Badge>
          )}
          {capoInfo && (
            <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              Capo {capoInfo.fret} (play {capoInfo.playKey})
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Transpose */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Key:</span>
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

          {/* Font size */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Size:</span>
            <Select value={fontSize} onValueChange={(v) => setFontSize(v as "sm" | "md" | "lg")}>
              <SelectTrigger className="w-[70px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sm">Small</SelectItem>
                <SelectItem value="md">Medium</SelectItem>
                <SelectItem value="lg">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Copy */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>

          {/* Print */}
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </Button>

          {/* Download PDF */}
          <Button
            variant="default"
            size="sm"
            onClick={handleDownloadPDF}
            disabled={exporting}
            className="gap-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
          >
            {exporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            PDF
          </Button>
        </div>
      </div>

      {/* Chord chart content */}
      <div
        ref={contentRef}
        className="bg-white rounded-lg border border-border p-6 space-y-5"
        style={{ colorScheme: "light" }}
      >
        {/* Header */}
        <div className="text-center border-b border-gray-200 pb-4">
          <h2 className="text-xl font-bold text-gray-900">{songTitle}</h2>
          <div className="flex items-center justify-center gap-3 mt-2 text-xs text-gray-500">
            {displayKey && <span className="font-semibold">Key: {displayKey}</span>}
            {leadSheet.meter && <span>Time: {leadSheet.meter}</span>}
            {capoInfo && (
              <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-semibold">
                Capo {capoInfo.fret} (play {capoInfo.playKey})
              </span>
            )}
          </div>
        </div>

        {/* Sections */}
        {leadSheet.sections.map((section, sIdx) => (
          <ChordChartSection key={sIdx} section={section} fontClasses={fc} />
        ))}

        {/* Copyright */}
        <div className="text-center text-[10px] text-gray-400 pt-3 border-t border-gray-100">
          &copy; {new Date().getFullYear()} {user?.name || "Albert LaMotte"} &middot; Generated with Create Christian Music
        </div>
      </div>

      {/* Guitar chord diagrams */}
      {chords.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-4">
          <GuitarChordChart chords={chords} />
        </div>
      )}

      {/* Capo chart */}
      {chords.length > 0 && displayKey && (
        <CapoChart songKey={displayKey} chords={chords} />
      )}
    </div>
  );
}

/** Render a single section of the chord chart */
function ChordChartSection({
  section,
  fontClasses,
}: {
  section: LeadSheetSection;
  fontClasses: { chord: string; lyrics: string; section: string };
}) {
  return (
    <div className="space-y-1">
      {section.label && (
        <div className={`font-bold uppercase tracking-wider text-gray-500 ${fontClasses.section} mb-1 pb-0.5 border-b border-gray-100`}>
          {section.label}
        </div>
      )}
      {section.lines.map((line, lIdx) => (
        <div key={lIdx} className="leading-tight">
          {line.chords && (
            <pre className={`font-mono font-bold text-blue-700 ${fontClasses.chord} whitespace-pre leading-snug`}>
              {line.chords}
            </pre>
          )}
          {line.lyrics && (
            <pre className={`font-serif text-gray-800 ${fontClasses.lyrics} whitespace-pre-wrap leading-relaxed`}>
              {line.lyrics}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}

/** Escape HTML special characters */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
