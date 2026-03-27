import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { classifyAudioError, audioRetryToast } from "@/lib/audioRetryToast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Music, FileAudio, X, Loader2, CheckCircle2, AlertCircle,
  Download, Play, Pause, Volume2, VolumeX, RefreshCw, WifiOff,
  Clock, Trash2, ChevronDown, ChevronUp, Eye, Library, Save, RotateCcw,
} from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { exportSheetMusicPDF } from "@/lib/pdfExport";
import { COMMON_KEYS, detectKeyFromABC, transposeABC } from "@/lib/transpose";
import { downloadMidi, extractChordsFromABC } from "@/lib/midiExport";
import { downloadMusicXml } from "@/lib/musicXmlExport";
import { GuitarChordChart } from "@/components/GuitarChordChart";
import { PlaybackControls } from "@/components/PlaybackControls";
import { SheetMusicProgressBar } from "@/components/SheetMusicProgressBar";
import { SheetMusicSkeleton } from "@/components/SheetMusicSkeleton";
import AudioWaveform from "@/components/AudioWaveform";
import { useNoteHighlight } from "@/hooks/useNoteHighlight";
import type { PlaybackState } from "@/lib/abcPlayer";

const AUDIO_TYPES = ["audio/mpeg", "audio/wav", "audio/flac", "audio/ogg", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/aiff", "audio/x-aiff"];
const AUDIO_ACCEPT = ".mp3,.wav,.flac,.ogg,.m4a,.aac,.aiff,.aif";
const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB for Whisper

type ProcessingStep = "idle" | "uploading" | "transcribing" | "analyzing" | "generating" | "done" | "error";
type ErrorType = "network" | "file_too_large" | "empty_file" | "unsupported_format" | "insufficient_credits" | "audio_too_long" | "transcription_failed" | "transcription_timeout" | "generation_failed" | "generation_timeout" | "validation_failed" | "credit_error" | "unknown";

function mapErrorCodeToType(errorCode?: string | null, message?: string): ErrorType {
  if (errorCode) {
    const mapping: Record<string, ErrorType> = {
      audio_too_long: "audio_too_long",
      transcription_failed: "transcription_failed",
      transcription_timeout: "transcription_timeout",
      audio_download_failed: "network",
      generation_failed: "generation_failed",
      generation_timeout: "generation_timeout",
      validation_failed: "validation_failed",
      credit_error: "credit_error",
      unknown: "unknown",
    };
    return mapping[errorCode] || "unknown";
  }
  const lowerMsg = (message || "").toLowerCase();
  if (lowerMsg.includes("network") || lowerMsg.includes("fetch") || lowerMsg.includes("connection")) return "network";
  if (lowerMsg.includes("too large") || lowerMsg.includes("file size")) return "file_too_large";
  if (lowerMsg.includes("empty")) return "empty_file";
  if (lowerMsg.includes("unsupported") || lowerMsg.includes("format")) return "unsupported_format";
  if (lowerMsg.includes("credit") || lowerMsg.includes("insufficient")) return "insufficient_credits";
  if (lowerMsg.includes("timeout") || lowerMsg.includes("timed out")) return "generation_timeout";
  return "unknown";
}

function getErrorDisplay(type: ErrorType): { icon: "wifi" | "file" | "clock" | "alert" | "credit"; title: string; suggestion: string } {
  const displays: Record<ErrorType, { icon: "wifi" | "file" | "clock" | "alert" | "credit"; title: string; suggestion: string }> = {
    network: { icon: "wifi", title: "Connection Error", suggestion: "Check your internet connection and try again." },
    file_too_large: { icon: "file", title: "File Too Large", suggestion: "Compress or trim your audio file to under 16MB and try again." },
    empty_file: { icon: "file", title: "Empty File", suggestion: "The uploaded file appears to be empty. Please select a valid audio file." },
    unsupported_format: { icon: "file", title: "Unsupported Format", suggestion: "Please upload an MP3, WAV, FLAC, OGG, or M4A file." },
    insufficient_credits: { icon: "credit", title: "Insufficient Credits", suggestion: "You need at least 1 credit. Please upgrade your plan or purchase more credits." },
    audio_too_long: { icon: "clock", title: "Audio Too Long", suggestion: "Maximum supported duration is 10 minutes. Please trim the audio and try again." },
    transcription_failed: { icon: "alert", title: "Transcription Failed", suggestion: "The audio could not be transcribed. Try a clearer recording or a different audio format." },
    transcription_timeout: { icon: "clock", title: "Transcription Timed Out", suggestion: "The audio file may be too long or the service is busy. Try a shorter clip or try again later." },
    generation_failed: { icon: "alert", title: "Sheet Music Generation Failed", suggestion: "The AI could not generate notation from this audio. Try a different file or a clearer recording." },
    generation_timeout: { icon: "clock", title: "Generation Timed Out", suggestion: "The AI service is temporarily busy. Please try again in a few minutes." },
    validation_failed: { icon: "alert", title: "Notation Validation Failed", suggestion: "The AI-generated notation had formatting issues. Try again — results may vary between attempts." },
    credit_error: { icon: "credit", title: "Credit Processing Error", suggestion: "Could not process credits. Please check your account balance and try again." },
    unknown: { icon: "alert", title: "Something Went Wrong", suggestion: "An unexpected error occurred. Please try again or try a different audio file." },
  };
  return displays[type] || displays.unknown;
}

const STEP_LABELS: Record<ProcessingStep, string> = {
  idle: "",
  uploading: "Uploading audio file...",
  transcribing: "Transcribing audio with Whisper...",
  analyzing: "Analyzing musical elements with AI...",
  generating: "Generating ABC notation...",
  done: "Sheet music ready!",
  error: "Generation failed",
};

export default function Mp3ToSheetMusic() {
  usePageMeta({
    title: "MP3 to Sheet Music Converter",
    description: "Convert worship songs and hymns from MP3 to professional sheet music with AI. Get printable lead sheets with chords and lyrics.",
    keywords: "MP3 to sheet music, worship song transcription, hymn sheet music converter, church music notation, chord chart generator, lead sheet maker, worship chord charts, gospel sheet music, church choir music notation, praise song chords",
    canonicalPath: "/mp3-to-sheet-music",
  });

  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [file, setFile] = useState<File | null>(null);
  const [savedSongId, setSavedSongId] = useState<number | null>(null);
  const [saveTitle, setSaveTitle] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [step, setStep] = useState<ProcessingStep>("idle");
  const [abcNotation, setAbcNotation] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string>("original");
  const [exporting, setExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { sheetRef, onActiveNoteChange } = useNoteHighlight();
  const [isRendered, setIsRendered] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{ type: ErrorType; message: string; detail?: string } | null>(null);

  // Progress bar state for sheet music playback
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [playbackIsActive, setPlaybackIsActive] = useState(false);
  const [playbackIsPlaying, setPlaybackIsPlaying] = useState(false);

  const handlePlaybackStateChange = useCallback((state: PlaybackState) => {
    const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;
    setPlaybackProgress(progress);
    setPlaybackIsActive(state.isPlaying && !state.isPaused);
    setPlaybackIsPlaying(state.isPlaying);
  }, []);

  // Audio preview state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const prevVolumeRef = useRef(1);
  const progressRef = useRef<HTMLDivElement>(null);

  const startJobMutation = trpc.songs.startMp3SheetJob.useMutation();
  const saveToLibraryMutation = trpc.songs.saveMp3SheetToLibrary.useMutation();
  const trpcUtils = trpc.useUtils();
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [activeJobId, setActiveJobId] = useState<number | null>(null);
  const [completedJobId, setCompletedJobId] = useState<number | null>(null);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Detect original key from ABC
  const originalKey = useMemo(() => {
    if (!abcNotation) return null;
    return detectKeyFromABC(abcNotation);
  }, [abcNotation]);

  // Compute transposed ABC
  const displayAbc = useMemo(() => {
    if (!abcNotation || selectedKey === "original" || !originalKey) return abcNotation;
    return transposeABC(abcNotation, originalKey, selectedKey);
  }, [abcNotation, selectedKey, originalKey]);

  // Frontend-side ABC sanitisation: strip V: directives and %%staves as a safety net
  const sanitisedDisplayAbc = useMemo(() => {
    if (!displayAbc) return null;
    return displayAbc
      .split("\n")
      .filter((l) => {
        const t = l.trim();
        if (t.startsWith("V:") || t.startsWith("%%staves")) return false;
        if (/^![pmf]{1,3}!$/.test(t)) return false;
        return true;
      })
      .map((l) => {
        const t = l.trim();
        if (/^\[P:.*\]$/.test(t)) return `% ${t}`;
        return l;
      })
      .join("\n")
      .trim();
  }, [displayAbc]);

  // Extract chords from the currently displayed (transposed) ABC notation
  const chords = useMemo(() => {
    if (!sanitisedDisplayAbc) return [];
    return extractChordsFromABC(sanitisedDisplayAbc);
  }, [sanitisedDisplayAbc]);

  const handleDownloadMIDI = useCallback(() => {
    if (!sanitisedDisplayAbc) return;
    try {
      const title = file?.name.replace(/\.[^/.]+$/, "") || "Sheet Music";
      const keyLabel = selectedKey === "original"
        ? (originalKey ? `-${originalKey}` : "")
        : `-${selectedKey}`;
      downloadMidi(sanitisedDisplayAbc, `${title}${keyLabel}`);
      toast.success("MIDI file downloaded!");
    } catch {
      toast.error("Failed to export MIDI file");
    }
  }, [sanitisedDisplayAbc, file, selectedKey, originalKey]);

  const handleDownloadMusicXml = useCallback(() => {
    if (!sanitisedDisplayAbc) return;
    try {
      const title = file?.name.replace(/\.[^/.]+$/, "") || "Sheet Music";
      const keyLabel = selectedKey === "original"
        ? (originalKey ? `-${originalKey}` : "")
        : `-${selectedKey}`;
      downloadMusicXml(sanitisedDisplayAbc, `${title}${keyLabel}`);
      toast.success("MusicXML file downloaded! Open it in MuseScore, Finale, or Sibelius.");
    } catch (e: any) {
      toast.error(e?.message || "Failed to export MusicXML file");
    }
  }, [sanitisedDisplayAbc, file, selectedKey, originalKey]);

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [previewUrl]);

  // Track render attempt counter for ResizeObserver-triggered re-renders
  const [renderAttempt, setRenderAttempt] = useState(0);
  const [containerVisible, setContainerVisible] = useState(false);

  // ResizeObserver: detect when the container becomes visible (non-zero width)
  // This prevents abcjs from rendering into a zero-width container, which produces
  // a minimal SVG with only the title text and no musical notation.
  useEffect(() => {
    const container = sheetRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerVisible(true);
          setRenderAttempt((n) => n + 1);
        }
      }
    });

    observer.observe(container);

    // Also check immediately in case the container is already visible
    const rect = container.getBoundingClientRect();
    if (rect.width > 10) {
      setContainerVisible(true);
    }

    return () => observer.disconnect();
  }, [sanitisedDisplayAbc, step]);

  // Render ABC notation using abcjs
  useEffect(() => {
    if (!sanitisedDisplayAbc || !sheetRef.current) return;

    let cancelled = false;

    async function doRender() {
      const container = sheetRef.current;
      if (!container || cancelled) return;

      const rect = container.getBoundingClientRect();
      // CRITICAL: Do not render if container has zero width (hidden tab, collapsed section)
      if (rect.width < 10) {
        // Schedule a retry — the container may not be laid out yet
        const retryTimer = setTimeout(() => {
          if (!cancelled) setRenderAttempt((n) => n + 1);
        }, 200);
        return () => clearTimeout(retryTimer);
      }

      setIsRendered(false);

      try {
        const mod = await import("abcjs");
        if (cancelled) return;
        const abcjs = mod.default || mod;
        if (!sheetRef.current) return;
        sheetRef.current.innerHTML = "";
        if (!sheetRef.current.id) sheetRef.current.id = "mp3-sheet-music-render";

        // Wait for next animation frame to ensure layout is fully computed
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        if (cancelled || !sheetRef.current) return;

        const postRafRect = sheetRef.current.getBoundingClientRect();
        if (postRafRect.width < 10) {
          // Still not visible — retry
          setTimeout(() => { if (!cancelled) setRenderAttempt((n) => n + 1); }, 300);
          return;
        }

        const visualObj = abcjs.renderAbc(sheetRef.current, sanitisedDisplayAbc!, {
          responsive: "resize",
          staffwidth: Math.max(600, Math.floor(postRafRect.width - 40)),
          paddingtop: 20,
          paddingbottom: 20,
          paddingleft: 15,
          paddingright: 15,
          add_classes: true,
        });
        if (visualObj && visualObj.length > 0 && visualObj[0].warnings && visualObj[0].warnings.length > 0) {
          console.warn("[SheetMusic] abcjs warnings:", visualObj[0].warnings);
        }

        // Verify SVG was actually rendered with content
        const svg = sheetRef.current.querySelector("svg");
        if (svg) {
          const paths = svg.querySelectorAll("path");
          console.log(`[Mp3SheetMusic] Rendered: ${paths.length} paths, container width: ${postRafRect.width}`);
          if (paths.length < 5) {
            // Very few paths — likely a failed render, retry
            console.warn("[Mp3SheetMusic] Very few paths rendered, scheduling retry");
            setTimeout(() => { if (!cancelled) setRenderAttempt((n) => n + 1); }, 500);
            return;
          }
        }

        if (!cancelled) setIsRendered(true);
      } catch (renderErr: any) {
        if (!cancelled) {
          console.error("Sheet music render error:", renderErr);
          toast.error("Failed to render sheet music notation");
        }
      }
    }

    doRender();

    return () => { cancelled = true; };
  }, [sanitisedDisplayAbc, renderAttempt, containerVisible]);

  const stopPreview = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setAudioDuration(0);
  }, [previewUrl]);

  const setupPreview = useCallback((f: File) => {
    stopPreview();
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    const audio = new Audio(url);
    audio.preload = "metadata";
    audio.addEventListener("loadedmetadata", () => {
      if (audio.duration && isFinite(audio.duration)) setAudioDuration(audio.duration);
    });
    // Safari sometimes fires durationchange instead of loadedmetadata
    audio.addEventListener("durationchange", () => {
      if (audio.duration && isFinite(audio.duration)) setAudioDuration(audio.duration);
    });
    audio.addEventListener("timeupdate", () => setCurrentTime(audio.currentTime));
    audio.addEventListener("ended", () => { setIsPlaying(false); setCurrentTime(0); });
    audio.addEventListener("error", () => {
      setIsPlaying(false);
      const msg = classifyAudioError(audio.error ?? undefined);
      audioRetryToast(msg, () => { audio.load(); }, "mp3-sheet-preview-error");
    });
    audio.volume = volume;
    audioRef.current = audio;
  }, [stopPreview, volume]);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        setIsPlaying(false);
        const msg = classifyAudioError(err);
        audioRetryToast(msg, () => {
          audioRef.current?.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        }, "mp3-sheet-play-error");
      });
    }
  }, [isPlaying]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressRef.current || !audioDuration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = pct * audioDuration;
    setCurrentTime(audioRef.current.currentTime);
  }, [audioDuration]);

  const handleVolumeChange = useCallback((newVolume: number) => {
    const clamped = Math.max(0, Math.min(1, newVolume));
    setVolume(clamped);
    setIsMuted(clamped === 0);
    if (audioRef.current) audioRef.current.volume = clamped;
    if (clamped > 0) prevVolumeRef.current = clamped;
  }, []);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      const restored = prevVolumeRef.current > 0 ? prevVolumeRef.current : 1;
      setVolume(restored);
      setIsMuted(false);
      if (audioRef.current) audioRef.current.volume = restored;
    } else {
      prevVolumeRef.current = volume;
      setVolume(0);
      setIsMuted(true);
      if (audioRef.current) audioRef.current.volume = 0;
    }
  }, [isMuted, volume]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const validateAndSetFile = useCallback((f: File) => {
    if (!AUDIO_TYPES.some(t => f.type === t) && !/\.(aiff?|m4a)$/i.test(f.name)) {
      toast.error("Please upload an audio file (MP3, WAV, FLAC, OGG, M4A, AAC, AIFF)");
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      toast.error(`File too large (${(f.size / (1024 * 1024)).toFixed(1)}MB). Maximum size is 16MB.`);
      return;
    }
    setFile(f);
    setAbcNotation(null);
    setLyrics(null);
    setStep("idle");
    setSelectedKey("original");
    setIsRendered(false);
    setupPreview(f);
  }, [setupPreview]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) validateAndSetFile(dropped);
  }, [validateAndSetFile]);

  const readFileAsBase64 = useCallback((f: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });
  }, []);

  const pollJobStatus = useCallback((jobId: number) => {
    // Clear any existing polling
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const result = await trpcUtils.songs.getMp3SheetJobStatus.fetch({ jobId });

        // Update step based on server status
        if (result.status === "transcribing") {
          setStep("transcribing");
        } else if (result.status === "generating") {
          setStep("generating");
        } else if (result.status === "done") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;
          setCompletedJobId(jobId); // Preserve jobId for save-to-library
          setActiveJobId(null);
          setAbcNotation(result.abcNotation || null);
          setLyrics(result.lyrics || null);
          setStep("done");
          toast.success("Sheet music generated successfully!");
        } else if (result.status === "error") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;
          setActiveJobId(null);
          setStep("error");
          const errType = mapErrorCodeToType(result.errorCode ?? undefined, result.errorMessage ?? undefined);
          setErrorInfo({
            type: errType,
            message: result.errorMessage || "Sheet music generation failed. Please try again.",
            detail: result.errorCode || undefined,
          });
        }
      } catch (pollErr: any) {
        // Don't stop polling on transient network errors — just log
        console.warn("[Mp3Sheet] Poll error:", pollErr?.message);
      }
    }, 3000);
  }, [trpcUtils]);

  const handleGenerate = useCallback(async () => {
    if (!file) return;
    setStep("uploading");
    setErrorInfo(null);
    try {
      const base64 = await readFileAsBase64(file);
      setStep("transcribing");
      const { jobId } = await startJobMutation.mutateAsync({
        fileData: base64,
        fileName: file.name,
        mimeType: file.type || "audio/mpeg",
      });
      setActiveJobId(jobId);
      // Start polling for job completion
      pollJobStatus(jobId);
    } catch (err: any) {
      setStep("error");
      const msg = err?.message || "";
      const errType = mapErrorCodeToType(null, msg);
      setErrorInfo({
        type: errType,
        message: msg || "Failed to start sheet music generation.",
        detail: msg || undefined,
      });
    }
  }, [file, readFileAsBase64, startJobMutation, pollJobStatus]);

  const handleDownloadPDF = useCallback(async () => {
    if (!sheetRef.current) return;
    const svgElement = sheetRef.current.querySelector("svg");
    if (!svgElement) {
      toast.error("No sheet music to export");
      return;
    }
    setExporting(true);
    try {
      const title = file?.name.replace(/\.[^/.]+$/, "") || "Sheet Music";
      const keyLabel = selectedKey === "original"
        ? (originalKey ? ` (Key: ${originalKey})` : "")
        : ` (Key: ${selectedKey})`;
      await exportSheetMusicPDF(svgElement, title + keyLabel);
      toast.success("Sheet music PDF downloaded!");
    } catch {
      toast.error("Failed to export PDF");
    } finally {
      setExporting(false);
    }
  }, [file, selectedKey, originalKey]);

  const handleSaveToLibrary = useCallback(async () => {
    const jobId = completedJobId || activeJobId;
    if (!jobId && !abcNotation) return;
    if (!jobId) {
      toast.error("No completed job to save");
      return;
    }
    try {
      const result = await saveToLibraryMutation.mutateAsync({
        jobId,
        title: saveTitle.trim() || undefined,
      });
      setSavedSongId(result.songId);
      setShowSaveDialog(false);
      toast.success(`"${result.title}" saved to your library!`, {
        action: {
          label: "View Song",
          onClick: () => navigate(`/songs/${result.songId}`),
        },
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to save to library");
    }
  }, [completedJobId, activeJobId, abcNotation, saveTitle, saveToLibraryMutation, navigate]);

  const handleReset = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setActiveJobId(null);
    setCompletedJobId(null);
    stopPreview();
    setFile(null);
    setAbcNotation(null);
    setLyrics(null);
    setStep("idle");
    setSelectedKey("original");
    setIsRendered(false);
    setErrorInfo(null);
    setSavedSongId(null);
    setSaveTitle("");
    setShowSaveDialog(false);
  }, [stopPreview]);

  // ─── AUTH GATE ───
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <FileAudio className="h-16 w-16 text-violet-400 mx-auto" />
          <h2 className="text-2xl font-bold text-black">MP3 to Sheet Music</h2>
          <p className="text-muted-foreground mb-6">Sign in to convert your audio files into sheet music.</p>
          <a href={getLoginUrl()}>
            <Button className="bg-violet-600 hover:bg-violet-700 text-white">Sign In to Get Started</Button>
          </a>
        </div>
      </div>
    );
  }

  const isProcessing = step !== "idle" && step !== "done" && step !== "error";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-sm font-medium mb-4">
            <FileAudio className="h-4 w-4" />
            AI-Powered Transcription
          </div>
          <h1 className="text-3xl font-bold text-black">MP3 to Sheet Music</h1>
          <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
            Upload any audio file and our AI will transcribe it into professional sheet music
            with melody notation, chord symbols, and lyrics.
          </p>
        </div>

        {/* Drop Zone */}
        {!abcNotation && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
              isProcessing ? "cursor-default" :
              dragOver
                ? "border-violet-500 bg-violet-50 cursor-pointer"
                : file
                  ? "border-green-400 bg-green-50/50 cursor-pointer"
                  : "border-border hover:border-violet-300 hover:bg-violet-50/30 cursor-pointer"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={AUDIO_ACCEPT}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) validateAndSetFile(f);
              }}
              className="hidden"
            />

            {file ? (
              <div className="space-y-0">
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                  <div className="text-left">
                    <p className="font-semibold text-black">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / (1024 * 1024)).toFixed(1)} MB
                      {audioDuration > 0 && ` · ${formatTime(audioDuration)}`}
                    </p>
                    {/* File size indicator bar */}
                    {(() => {
                      const pct = Math.min((file.size / MAX_FILE_SIZE) * 100, 100);
                      const sizeMB = file.size / (1024 * 1024);
                      const remainMB = Math.max(16 - sizeMB, 0);
                      const barColor = pct < 50 ? "bg-green-500" : pct < 80 ? "bg-amber-500" : "bg-red-500";
                      const textColor = pct < 50 ? "text-green-600" : pct < 80 ? "text-amber-600" : "text-red-600";
                      return (
                        <div className="mt-1.5 w-44">
                          <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className={`text-[10px] mt-0.5 ${textColor} font-medium`}>
                            {pct < 100
                              ? `${remainMB.toFixed(1)} MB remaining of 16 MB`
                              : "At file size limit"}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                  {!isProcessing && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleReset(); }}
                      className="ml-4 p-1 rounded-full hover:bg-gray-200"
                    >
                      <X className="h-5 w-5 text-muted-foreground" />
                    </button>
                  )}
                </div>

                {/* Audio Preview Player */}
                {previewUrl && (
                  <div
                    className="mt-4 bg-white/80 rounded-xl border border-violet-200 p-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Waveform Visualization */}
                    <div className="mb-3">
                      <AudioWaveform
                        file={file}
                        currentTime={currentTime}
                        duration={audioDuration}
                        onSeek={(time) => {
                          if (audioRef.current) audioRef.current.currentTime = time;
                        }}
                        isPlaying={isPlaying}
                        height={56}
                      />
                    </div>

                    {/* Controls row */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={togglePlayPause}
                        className="flex-shrink-0 w-10 h-10 rounded-full bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center transition-colors shadow-sm"
                      >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground font-mono">{formatTime(currentTime)}</span>
                          <span className="text-xs text-muted-foreground font-mono">{formatTime(audioDuration)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={toggleMute}
                          className="p-1 rounded-full hover:bg-violet-100 transition-colors"
                          title={isMuted ? "Unmute" : "Mute"}
                        >
                          {isMuted || volume === 0 ? (
                            <VolumeX className="h-4 w-4 text-violet-400" />
                          ) : (
                            <Volume2 className="h-4 w-4 text-violet-400" />
                          )}
                        </button>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={isMuted ? 0 : volume}
                          onChange={(e) => handleVolumeChange(Number(e.target.value))}
                          className="w-16 h-1.5 accent-violet-500 cursor-pointer"
                          title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <FileAudio className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-medium text-foreground">
                  Drop your audio file here
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  MP3, WAV, FLAC, OGG, M4A &middot; Max 16MB
                </p>
              </>
            )}
          </div>
        )}

        {/* Processing Status */}
        {isProcessing && (
          <div className="mt-6 bg-card rounded-xl border p-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-black">{STEP_LABELS[step]}</p>
                  <span className="text-sm font-medium text-violet-600">
                    {step === "uploading" ? "15%" : step === "transcribing" ? "40%" : step === "analyzing" ? "60%" : step === "generating" ? "80%" : ""}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {step === "uploading"
                    ? "Preparing your audio file..."
                    : step === "transcribing"
                    ? "Estimated time: 20-40 seconds remaining"
                    : step === "generating"
                    ? "Estimated time: 15-30 seconds remaining"
                    : "Processing..."}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4 h-2 bg-violet-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-violet-600 rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: step === "uploading" ? "15%" : step === "transcribing" ? "40%" : step === "analyzing" ? "60%" : step === "generating" ? "80%" : "0%",
                }}
              />
            </div>

            {/* Progress steps */}
            <div className="mt-6 space-y-3">
              {(["uploading", "transcribing", "generating"] as ProcessingStep[]).map((s, i) => {
                const stepOrder = ["uploading", "transcribing", "generating"];
                const currentIdx = stepOrder.indexOf(step);
                const thisIdx = i;
                const isDone = thisIdx < currentIdx;
                const isCurrent = s === step || (step === "analyzing" && s === "transcribing");
                const isDoneOrPast = isDone || (step === "generating" && s === "transcribing") || (step === "analyzing" && s === "uploading");
                return (
                  <div key={s} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isDoneOrPast ? "bg-green-500 text-white" :
                      isCurrent ? "bg-violet-600 text-white" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {isDoneOrPast ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                    </div>
                    <span className={`text-sm ${
                      isDoneOrPast ? "text-green-600 font-medium" :
                      isCurrent ? "text-black font-medium" :
                      "text-muted-foreground"
                    }`}>
                      {["Upload & prepare audio", "Transcribe audio with AI", "Generate sheet music notation"][i]}
                    </span>
                    {isCurrent && !isDoneOrPast && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Generate Button */}
        {file && step === "idle" && !abcNotation && (
          <div className="mt-6 bg-card rounded-xl border p-6">
            <h3 className="font-semibold text-black flex items-center gap-2 mb-3">
              <Music className="h-4 w-4 text-violet-500" /> Generate Sheet Music
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Our AI will listen to the audio, identify the melody, chords, key, tempo, and structure,
              then generate a professional lead sheet in ABC notation. If vocals are detected, lyrics will be aligned beneath the notes.
            </p>
            <Button
              onClick={handleGenerate}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white"
            >
              <Music className="mr-2 h-4 w-4" /> Generate Sheet Music (1 credit)
            </Button>
          </div>
        )}

        {/* Error state */}
        {step === "error" && errorInfo && (() => {
          const display = getErrorDisplay(errorInfo.type);
          const IconComponent = display.icon === "wifi" ? WifiOff
            : display.icon === "file" ? FileAudio
            : display.icon === "clock" ? Clock
            : display.icon === "credit" ? AlertCircle
            : AlertCircle;
          const isRetryable = !["file_too_large", "empty_file", "unsupported_format", "insufficient_credits"].includes(errorInfo.type);
          return (
            <div className="mt-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <IconComponent className="h-6 w-6 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-red-700 dark:text-red-400">
                    {display.title}
                  </h4>
                  <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                    {errorInfo.message}
                  </p>
                  <p className="text-xs text-red-500/80 dark:text-red-400/60 mt-1.5">
                    {display.suggestion}
                  </p>
                  {errorInfo.detail && errorInfo.detail !== errorInfo.message && (
                    <details className="mt-2">
                      <summary className="text-xs text-red-400 dark:text-red-500 cursor-pointer hover:text-red-500 dark:hover:text-red-400">
                        Technical details
                      </summary>
                      <pre className="text-xs text-red-400 dark:text-red-500 mt-1 whitespace-pre-wrap break-all bg-red-100/50 dark:bg-red-900/20 rounded p-2">
                        {errorInfo.detail}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
              <div className="flex gap-3 mt-4 ml-9">
                <Button variant="outline" onClick={handleReset}>
                  {errorInfo.type === "insufficient_credits" ? "Back" : "Try Another File"}
                </Button>
                {isRetryable && (
                  <Button onClick={() => { setErrorInfo(null); handleGenerate(); }} className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5">
                    <RefreshCw className="h-4 w-4" /> Try Again
                  </Button>
                )}
              </div>
            </div>
          );
        })()}

        {/* Sheet Music Result */}
        {abcNotation && step === "done" && (
          <div className="mt-6 space-y-4">
            {/* Action bar */}
            <div className="bg-card rounded-xl border p-6">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="font-semibold text-black">Sheet Music Generated</span>
                  {originalKey && (
                    <span className="text-xs text-muted-foreground">(Key: {originalKey})</span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Transpose */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Transpose:</span>
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
                    PDF
                  </Button>

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

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadMusicXml}
                    disabled={!isRendered}
                    className="gap-1.5"
                    title="Download MusicXML for Finale, MuseScore, Sibelius"
                  >
                    <FileAudio className="w-3.5 h-3.5" />
                    MusicXML
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerate}
                    disabled={startJobMutation.isPending || !!activeJobId}
                    className="gap-1.5"
                  >
                    {startJobMutation.isPending || !!activeJobId ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    Regenerate
                  </Button>

                  {/* Save to Library */}
                  {savedSongId ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-green-300 text-green-700 hover:bg-green-50"
                      onClick={() => navigate(`/songs/${savedSongId}`)}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      View in Library
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
                      onClick={() => {
                        const defaultTitle = file?.name?.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "";
                        setSaveTitle(defaultTitle);
                        setShowSaveDialog(true);
                      }}
                      disabled={saveToLibraryMutation.isPending}
                    >
                      {saveToLibraryMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Library className="w-3.5 h-3.5" />
                      )}
                      Save to Library
                    </Button>
                  )}
                </div>
              </div>

              {/* Save to Library dialog */}
              {showSaveDialog && (
                <div className="bg-violet-50 border border-violet-200 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-end gap-3">
                  <div className="flex-1 w-full">
                    <label className="text-sm font-medium text-violet-900 mb-1 block">Song Title</label>
                    <Input
                      value={saveTitle}
                      onChange={(e) => setSaveTitle(e.target.value)}
                      placeholder="Enter a title for this song..."
                      className="bg-white"
                      onKeyDown={(e) => { if (e.key === "Enter") handleSaveToLibrary(); }}
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground mt-1">This will appear in your song library alongside your AI-generated songs.</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
                    <Button
                      size="sm"
                      className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
                      onClick={handleSaveToLibrary}
                      disabled={saveToLibraryMutation.isPending}
                    >
                      {saveToLibraryMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      Save
                    </Button>
                  </div>
                </div>
              )}

              {/* Playback controls with note highlighting and progress tracking */}
              <PlaybackControls
                abc={sanitisedDisplayAbc}
                className="mb-4"
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
                {sanitisedDisplayAbc && !isRendered && (
                  <div className="absolute inset-0 z-10">
                    <SheetMusicSkeleton />
                  </div>
                )}
                {/* Actual rendering container — always in the DOM with full width */}
                <div
                  id="mp3-sheet-music-render"
                  ref={sheetRef}
                  className={`bg-white rounded-lg border border-border p-4 min-h-[200px] overflow-x-auto scroll-smooth transition-opacity duration-500 ease-in-out ${
                    isRendered ? "opacity-100" : "opacity-0"
                  }`}
                  style={{ colorScheme: "light" }}
                />
              </div>

              {/* Guitar chord diagrams */}
              {chords.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <GuitarChordChart chords={chords} />
                </div>
              )}
            </div>

            {/* Detected Lyrics */}
            {lyrics && (
              <div className="bg-card rounded-xl border p-6">
                <h3 className="font-semibold text-black flex items-center gap-2 mb-3">
                  <Music className="h-4 w-4 text-violet-500" /> Detected Lyrics
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {lyrics}
                </p>
              </div>
            )}

            {/* Start Over */}
            <div className="text-center">
              <Button variant="outline" onClick={handleReset} className="gap-2">
                <FileAudio className="h-4 w-4" /> Convert Another File
              </Button>
            </div>
          </div>
        )}

        {/* Recent Jobs */}
        <RecentJobsSection
          onLoadJob={(job) => {
            setAbcNotation(job.abcNotation);
            setLyrics(job.lyrics || null);
            setStep("done");
            setSelectedKey("original");
            setIsRendered(false);
            toast.success(`Loaded sheet music for "${job.fileName}"`);
          }}
        />

        {/* Info Box */}
        <div className="mt-8 bg-muted/50 rounded-xl p-5 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-violet-500 mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">How It Works</p>
            <p>
              Our AI uses audio transcription and advanced music analysis to identify melody, chords,
              key signature, tempo, and song structure from your audio file. The result is a professional
              lead sheet in ABC notation that you can transpose to any key and download as PDF or MIDI.
              Guitar chord diagrams are shown automatically. Each conversion costs 1 credit.
              Best results come from clear recordings with prominent melody lines.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── Recent Jobs Section ───

interface RecentJob {
  id: number;
  fileName: string;
  status: string;
  abcNotation: string | null;
  lyrics: string | null;
  audioUrl: string | null;
  errorMessage: string | null;
  createdAt: Date;
}

function RecentJobsSection({ onLoadJob }: { onLoadJob: (job: RecentJob) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [pollActive, setPollActive] = useState(false);
  const { data: jobs, isLoading, refetch } = trpc.songs.getRecentMp3SheetJobs.useQuery(
    undefined,
    {
      enabled: expanded,
      refetchInterval: pollActive ? 3000 : false,
    }
  );

  // Update polling state whenever jobs data changes
  useEffect(() => {
    if (!jobs) {
      setPollActive(false);
      return;
    }
    const hasProcessing = jobs.some((j) =>
      ["uploading", "transcribing", "generating"].includes(j.status)
    );
    setPollActive(hasProcessing);
  }, [jobs]);
  const deleteMutation = trpc.songs.deleteMp3SheetJob.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Job deleted");
    },
    onError: () => toast.error("Failed to delete job"),
  });
  const retryMutation = trpc.songs.retryMp3SheetJob.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Retrying conversion...");
    },
    onError: (err) => toast.error(err.message || "Failed to retry job"),
  });

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "done":
        return <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full"><CheckCircle2 className="h-3 w-3" /> Done</span>;
      case "error":
        return <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full"><AlertCircle className="h-3 w-3" /> Failed</span>;
      case "transcribing":
      case "generating":
      case "uploading":
        return <span className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full"><Loader2 className="h-3 w-3 animate-spin" /> Processing</span>;
      default:
        return <span className="inline-flex items-center text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{status}</span>;
    }
  };

  return (
    <div className="mt-8">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 bg-card rounded-xl border hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-violet-500" />
          <span className="font-semibold text-sm text-foreground">Recent Conversions</span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="mt-2 bg-card rounded-xl border overflow-hidden">
          {isLoading ? (
            <div className="p-6 text-center">
              <Loader2 className="h-5 w-5 animate-spin text-violet-500 mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">Loading history...</p>
            </div>
          ) : !jobs || jobs.length === 0 ? (
            <div className="p-6 text-center">
              <FileAudio className="h-8 w-8 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">No previous conversions yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Your converted sheet music will appear here.</p>
            </div>
          ) : (
            <div className="divide-y">
              {jobs.map((job) => (
                <div key={job.id} className="flex items-center gap-3 p-4 hover:bg-accent/30 transition-colors">
                  <div className="flex-shrink-0">
                    <Music className="h-5 w-5 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{job.fileName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {statusBadge(job.status)}
                      <span className="text-xs text-muted-foreground">{formatDate(job.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {job.status === "done" && job.abcNotation && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onLoadJob(job as RecentJob)}
                        className="h-8 px-2.5 text-violet-600 hover:text-violet-700 hover:bg-violet-50 gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </Button>
                    )}
                    {job.status === "error" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => retryMutation.mutate({ jobId: job.id })}
                        disabled={retryMutation.isPending}
                        className="h-8 px-2.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 gap-1"
                      >
                        {retryMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        Retry
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate({ jobId: job.id })}
                      disabled={deleteMutation.isPending}
                      className="h-8 px-2 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
