import { useState, useCallback, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  FileAudio, X, Loader2, CheckCircle2, AlertCircle,
  Play, Trash2, RefreshCw, Eye, Music, Upload, Layers,
  ChevronDown, ChevronUp, Edit2, Clock, Download, Archive,
} from "lucide-react";
import { generateSheetMusicPDFBytes } from "@/lib/pdfExport";

const AUDIO_TYPES = ["audio/mpeg", "audio/wav", "audio/flac", "audio/ogg", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/aiff", "audio/x-aiff"];
const MAX_FILE_SIZE = 16 * 1024 * 1024;
const MAX_BATCH_SIZE = 20;

type BatchItemStatus = "queued" | "uploading" | "transcribing" | "generating" | "done" | "error";

interface BatchItem {
  id: string;
  file: File;
  title: string;
  status: BatchItemStatus;
  jobId?: number;
  abcNotation?: string;
  lyrics?: string;
  errorMessage?: string;
}

interface BatchConverterProps {
  onViewResult: (abc: string, title: string, lyrics?: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function titleFromFilename(name: string): string {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Sanitize a string for use as a filename */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

export function BatchConverter({ onViewResult }: BatchConverterProps) {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);

  const startJobMutation = trpc.songs.startMp3SheetJob.useMutation();
  const trpcUtils = trpc.useUtils();

  // Add files to the batch queue
  const addFiles = useCallback((files: FileList | File[]) => {
    const newItems: BatchItem[] = [];
    const fileArray = Array.from(files);

    for (const f of fileArray) {
      // Validate file type
      if (!AUDIO_TYPES.some(t => f.type === t) && !/\.(aiff?|m4a|mp3|wav|flac|ogg)$/i.test(f.name)) {
        toast.error(`Skipped "${f.name}" — unsupported format`);
        continue;
      }
      // Validate file size
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`Skipped "${f.name}" — exceeds 16MB limit (${formatFileSize(f.size)})`);
        continue;
      }

      newItems.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file: f,
        title: titleFromFilename(f.name),
        status: "queued",
      });
    }

    if (newItems.length === 0) return;

    setItems(prev => {
      const total = prev.length + newItems.length;
      if (total > MAX_BATCH_SIZE) {
        toast.error(`Maximum ${MAX_BATCH_SIZE} files per batch. ${total - MAX_BATCH_SIZE} files were not added.`);
        return [...prev, ...newItems.slice(0, MAX_BATCH_SIZE - prev.length)];
      }
      return [...prev, ...newItems];
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const updateItemTitle = useCallback((id: string, title: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, title } : item));
  }, []);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Read file as base64
  const readFileAsBase64 = (f: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });
  };

  // Attempt start with retry for transient errors
  const attemptStart = async (base64: string, fileName: string, mimeType: string, retries = 2): Promise<{ jobId: number }> => {
    try {
      return await startJobMutation.mutateAsync({
        fileData: base64,
        fileName,
        mimeType,
      });
    } catch (err: any) {
      const msg = (err?.message || "").toLowerCase();
      const isTransient = msg.includes("service unavailable") ||
        msg.includes("503") || msg.includes("fetch failed") ||
        msg.includes("network") || msg.includes("failed to fetch") ||
        msg.includes("load failed");
      if (isTransient && retries > 0) {
        const delay = retries === 2 ? 3000 : 6000;
        await new Promise(r => setTimeout(r, delay));
        return attemptStart(base64, fileName, mimeType, retries - 1);
      }
      throw err;
    }
  };

  // Poll a single job until done or error
  const pollUntilDone = (jobId: number): Promise<{ abcNotation?: string; lyrics?: string; error?: string }> => {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const TIMEOUT = 5 * 60 * 1000;

      const interval = setInterval(async () => {
        if (abortRef.current) {
          clearInterval(interval);
          resolve({ error: "Batch processing cancelled" });
          return;
        }

        if (Date.now() - startTime > TIMEOUT) {
          clearInterval(interval);
          resolve({ error: "Processing timed out after 5 minutes" });
          return;
        }

        try {
          const result = await trpcUtils.songs.getMp3SheetJobStatus.fetch({ jobId });
          if (result.status === "done") {
            clearInterval(interval);
            resolve({ abcNotation: result.abcNotation || undefined, lyrics: result.lyrics || undefined });
          } else if (result.status === "error") {
            clearInterval(interval);
            resolve({ error: result.errorMessage || "Processing failed" });
          }
          // transcribing/generating — keep polling
        } catch {
          // Transient poll error — keep polling
        }
      }, 3000);
    });
  };

  // Process all queued items sequentially
  const processAll = useCallback(async () => {
    abortRef.current = false;
    setIsProcessing(true);

    const queuedItems = items.filter(i => i.status === "queued" || i.status === "error");

    for (const item of queuedItems) {
      if (abortRef.current) break;

      // Upload phase
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: "uploading" as const, errorMessage: undefined } : i));

      try {
        const base64 = await readFileAsBase64(item.file);

        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: "transcribing" as const } : i));

        const { jobId } = await attemptStart(base64, item.file.name, item.file.type || "audio/mpeg");

        setItems(prev => prev.map(i => i.id === item.id ? { ...i, jobId, status: "transcribing" as const } : i));

        // Poll until done
        const result = await pollUntilDone(jobId);

        if (result.error) {
          setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: "error" as const, errorMessage: result.error } : i));
        } else {
          setItems(prev => prev.map(i => i.id === item.id ? {
            ...i,
            status: "done" as const,
            abcNotation: result.abcNotation,
            lyrics: result.lyrics,
          } : i));
        }
      } catch (err: any) {
        const rawMsg = err?.message || "Upload failed";
        let msg = rawMsg;
        const lower = rawMsg.toLowerCase();
        if (lower.includes("service unavailable") || lower.includes("503")) {
          msg = "Server temporarily unavailable. Try again.";
        } else if (lower.includes("insufficient credits")) {
          msg = "Insufficient credits — please upgrade your plan.";
          // Stop processing remaining items if out of credits
          setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: "error" as const, errorMessage: msg } : i));
          abortRef.current = true;
          toast.error("Batch stopped — insufficient credits for remaining files.");
          break;
        }
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: "error" as const, errorMessage: msg } : i));
      }

      // Small delay between files to avoid overwhelming the server
      if (!abortRef.current) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    setIsProcessing(false);
  }, [items, startJobMutation, trpcUtils]);

  // Cancel batch processing
  const cancelProcessing = useCallback(() => {
    abortRef.current = true;
    toast.info("Stopping batch processing after current file completes...");
  }, []);

  // Retry a single failed item
  const retryItem = useCallback((id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: "queued" as const, errorMessage: undefined, jobId: undefined } : i));
  }, []);

  // Clear all completed/errored items
  const clearCompleted = useCallback(() => {
    setItems(prev => prev.filter(i => i.status === "queued" || i.status === "uploading" || i.status === "transcribing" || i.status === "generating"));
  }, []);

  // Download All as ZIP — generates PDFs from ABC notation and bundles them
  const downloadAllAsZip = useCallback(async () => {
    const completedItems = items.filter(i => i.status === "done" && i.abcNotation);
    if (completedItems.length === 0) {
      toast.error("No completed sheet music to download.");
      return;
    }

    setIsGeneratingZip(true);
    setZipProgress(0);

    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      let processed = 0;
      let failed = 0;

      for (const item of completedItems) {
        try {
          const pdfBytes = await generateSheetMusicPDFBytes(item.abcNotation!, item.title);
          const filename = `${sanitizeFilename(item.title)} - Sheet Music.pdf`;
          zip.file(filename, pdfBytes);
        } catch (err) {
          console.warn(`[ZIP] Failed to generate PDF for "${item.title}":`, err);
          failed++;
        }
        processed++;
        setZipProgress(Math.round((processed / completedItems.length) * 100));
      }

      if (processed - failed === 0) {
        toast.error("Failed to generate any PDFs for the ZIP file.");
        return;
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Sheet Music Batch (${completedItems.length} files).zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (failed > 0) {
        toast.warning(`ZIP downloaded with ${processed - failed} of ${completedItems.length} PDFs. ${failed} failed to generate.`);
      } else {
        toast.success(`Downloaded ${completedItems.length} sheet music PDF${completedItems.length !== 1 ? "s" : ""} as ZIP!`);
      }
    } catch (err) {
      console.error("[ZIP] Failed to generate ZIP:", err);
      toast.error("Failed to generate ZIP file. Please try again.");
    } finally {
      setIsGeneratingZip(false);
      setZipProgress(0);
    }
  }, [items]);

  // Stats
  const totalCount = items.length;
  const doneCount = items.filter(i => i.status === "done").length;
  const errorCount = items.filter(i => i.status === "error").length;
  const queuedCount = items.filter(i => i.status === "queued").length;
  const processingCount = items.filter(i => ["uploading", "transcribing", "generating"].includes(i.status)).length;
  const overallProgress = totalCount > 0 ? Math.round(((doneCount + errorCount) / totalCount) * 100) : 0;

  const statusIcon = (status: BatchItemStatus) => {
    switch (status) {
      case "queued": return <Clock className="h-4 w-4 text-muted-foreground" />;
      case "uploading": return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case "transcribing": return <Loader2 className="h-4 w-4 text-violet-500 animate-spin" />;
      case "generating": return <Loader2 className="h-4 w-4 text-amber-500 animate-spin" />;
      case "done": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "error": return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const statusLabel = (status: BatchItemStatus) => {
    switch (status) {
      case "queued": return "Queued";
      case "uploading": return "Uploading...";
      case "transcribing": return "Transcribing...";
      case "generating": return "Generating...";
      case "done": return "Complete";
      case "error": return "Failed";
    }
  };

  return (
    <div className="space-y-6">
      {/* Drop Zone for Multiple Files */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
          isProcessing ? "cursor-default opacity-60" :
          dragOver
            ? "border-violet-500 bg-violet-50 cursor-pointer"
            : "border-border hover:border-violet-300 hover:bg-violet-50/30 cursor-pointer"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.wav,.flac,.ogg,.m4a,.aac,.aiff,.aif"
          multiple
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              addFiles(e.target.files);
              e.target.value = "";
            }
          }}
          className="hidden"
        />
        <Layers className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
        <p className="text-lg font-medium text-foreground">
          Drop multiple audio files here
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Select up to {MAX_BATCH_SIZE} files &middot; MP3, WAV, FLAC, OGG, M4A &middot; Max 16MB each
        </p>
      </div>

      {/* Batch Queue */}
      {items.length > 0 && (
        <div className="bg-card rounded-xl border overflow-hidden">
          {/* Header with overall progress */}
          <div className="p-4 border-b bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-black flex items-center gap-2">
                <Music className="h-4 w-4 text-violet-500" />
                Batch Queue
                <span className="text-sm font-normal text-muted-foreground">
                  ({doneCount} of {totalCount} complete{errorCount > 0 ? `, ${errorCount} failed` : ""})
                </span>
              </h3>
              <div className="flex items-center gap-2">
                {doneCount + errorCount > 0 && !isProcessing && (
                  <Button variant="ghost" size="sm" onClick={clearCompleted} className="text-xs gap-1">
                    <Trash2 className="h-3 w-3" /> Clear Finished
                  </Button>
                )}
                {!isProcessing && items.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => { setItems([]); }} className="text-xs gap-1 text-red-500 hover:text-red-600">
                    <X className="h-3 w-3" /> Clear All
                  </Button>
                )}
              </div>
            </div>
            {(isProcessing || doneCount > 0) && (
              <Progress value={overallProgress} className="h-2" />
            )}
          </div>

          {/* File List */}
          <div className="divide-y max-h-[500px] overflow-y-auto">
            {items.map((item) => (
              <div key={item.id} className="group">
                <div className="flex items-center gap-3 p-3 hover:bg-muted/20 transition-colors">
                  {/* Status Icon */}
                  <div className="flex-shrink-0">
                    {statusIcon(item.status)}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {expandedItems.has(item.id) && item.status === "queued" ? (
                        <Input
                          value={item.title}
                          onChange={(e) => updateItemTitle(item.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-7 text-sm bg-white"
                          autoFocus
                          onBlur={() => toggleExpanded(item.id)}
                          onKeyDown={(e) => { if (e.key === "Enter") toggleExpanded(item.id); }}
                        />
                      ) : (
                        <span className="text-sm font-medium text-foreground truncate">
                          {item.title}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground truncate">{item.file.name}</span>
                      <span className="text-xs text-muted-foreground">&middot;</span>
                      <span className="text-xs text-muted-foreground">{formatFileSize(item.file.size)}</span>
                      <span className="text-xs text-muted-foreground">&middot;</span>
                      <span className={`text-xs font-medium ${
                        item.status === "done" ? "text-green-600" :
                        item.status === "error" ? "text-red-500" :
                        ["uploading", "transcribing", "generating"].includes(item.status) ? "text-violet-600" :
                        "text-muted-foreground"
                      }`}>
                        {statusLabel(item.status)}
                      </span>
                    </div>
                    {item.status === "error" && item.errorMessage && (
                      <p className="text-xs text-red-500 mt-1">{item.errorMessage}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {item.status === "queued" && !isProcessing && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => toggleExpanded(item.id)}
                          title="Edit title"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-400 hover:text-red-600"
                          onClick={() => removeItem(item.id)}
                          title="Remove"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    {item.status === "done" && item.abcNotation && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1 text-violet-600 hover:text-violet-700"
                        onClick={() => onViewResult(item.abcNotation!, item.title, item.lyrics)}
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </Button>
                    )}
                    {item.status === "error" && !isProcessing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => retryItem(item.id)}
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Retry
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Bar */}
          <div className="p-4 border-t bg-muted/20">
            {/* ZIP generation progress */}
            {isGeneratingZip && (
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Generating PDFs for ZIP...
                  </span>
                  <span>{zipProgress}%</span>
                </div>
                <Progress value={zipProgress} className="h-1.5" />
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {isProcessing
                  ? `Processing... ${doneCount + errorCount} of ${totalCount} files`
                  : queuedCount > 0
                    ? `${queuedCount} file${queuedCount !== 1 ? "s" : ""} ready to process (1 credit each)`
                    : doneCount === totalCount && totalCount > 0
                      ? "All files processed!"
                      : `${errorCount} failed — click Retry to reprocess`
                }
              </p>
              <div className="flex gap-2">
                {/* Download All as ZIP — shown when there are completed results */}
                {doneCount >= 2 && !isProcessing && (
                  <Button
                    variant="outline"
                    onClick={downloadAllAsZip}
                    disabled={isGeneratingZip}
                    className="gap-1.5"
                  >
                    {isGeneratingZip ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    {isGeneratingZip ? "Generating..." : `Download All (${doneCount} PDFs)`}
                  </Button>
                )}

                {isProcessing ? (
                  <Button
                    variant="outline"
                    onClick={cancelProcessing}
                    className="gap-1.5"
                  >
                    <X className="h-4 w-4" /> Stop
                  </Button>
                ) : (
                  <>
                    {(queuedCount > 0 || errorCount > 0) && (
                      <Button
                        onClick={processAll}
                        className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
                      >
                        <Play className="h-4 w-4" />
                        {errorCount > 0 && queuedCount === 0
                          ? `Retry ${errorCount} Failed`
                          : `Process ${queuedCount + errorCount} File${(queuedCount + errorCount) !== 1 ? "s" : ""}`
                        }
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
