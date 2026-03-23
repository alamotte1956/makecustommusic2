import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Music, FileAudio, X, Loader2, CheckCircle2, AlertCircle,
  Download, Play, Pause, Volume2, VolumeX, RefreshCw,
} from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { exportSheetMusicPDF } from "@/lib/pdfExport";
import { COMMON_KEYS, detectKeyFromABC, transposeABC } from "@/lib/transpose";
import { downloadMidi, extractChordsFromABC } from "@/lib/midiExport";
import { GuitarChordChart } from "@/components/GuitarChordChart";
import { PlaybackControls } from "@/components/PlaybackControls";

const AUDIO_TYPES = ["audio/mpeg", "audio/wav", "audio/flac", "audio/ogg", "audio/mp4", "audio/x-m4a", "audio/aac"];
const AUDIO_ACCEPT = ".mp3,.wav,.flac,.ogg,.m4a,.aac";
const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB for Whisper

type ProcessingStep = "idle" | "uploading" | "transcribing" | "analyzing" | "generating" | "done" | "error";

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
    title: "MP3 to Sheet Music",
    description: "Convert your MP3 audio files into professional sheet music with AI. Upload any song and get printable lead sheets with melody, chords, and lyrics.",
    canonicalPath: "/mp3-to-sheet-music",
  });

  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [step, setStep] = useState<ProcessingStep>("idle");
  const [abcNotation, setAbcNotation] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string>("original");
  const [exporting, setExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isRendered, setIsRendered] = useState(false);

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

  const generateMutation = trpc.songs.generateSheetMusicFromMp3.useMutation();

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

  // Extract chords from the currently displayed (transposed) ABC notation
  const chords = useMemo(() => {
    if (!displayAbc) return [];
    return extractChordsFromABC(displayAbc);
  }, [displayAbc]);

  const handleDownloadMIDI = useCallback(() => {
    if (!displayAbc) return;
    try {
      const title = file?.name.replace(/\.[^/.]+$/, "") || "Sheet Music";
      const keyLabel = selectedKey === "original"
        ? (originalKey ? `-${originalKey}` : "")
        : `-${selectedKey}`;
      downloadMidi(displayAbc, `${title}${keyLabel}`);
      toast.success("MIDI file downloaded!");
    } catch {
      toast.error("Failed to export MIDI file");
    }
  }, [displayAbc, file, selectedKey, originalKey]);

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
    audio.addEventListener("loadedmetadata", () => setAudioDuration(audio.duration));
    audio.addEventListener("timeupdate", () => setCurrentTime(audio.currentTime));
    audio.addEventListener("ended", () => { setIsPlaying(false); setCurrentTime(0); });
    audio.volume = volume;
    audioRef.current = audio;
  }, [stopPreview, volume]);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
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
    if (!AUDIO_TYPES.some(t => f.type === t)) {
      toast.error("Please upload an audio file (MP3, WAV, FLAC, OGG, M4A, AAC)");
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

  const handleGenerate = useCallback(async () => {
    if (!file) return;
    setStep("uploading");
    try {
      const base64 = await readFileAsBase64(file);
      setStep("analyzing");
      const result = await generateMutation.mutateAsync({
        fileData: base64,
        fileName: file.name,
        mimeType: file.type || "audio/mpeg",
      });
      setAbcNotation(result.abcNotation);
      setLyrics(result.lyrics || null);
      setStep("done");
      toast.success("Sheet music generated successfully!");
    } catch (err: any) {
      setStep("error");
      toast.error(err.message || "Failed to generate sheet music. Please try again.");
    }
  }, [file, readFileAsBase64, generateMutation]);

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

  const handleReset = useCallback(() => {
    stopPreview();
    setFile(null);
    setAbcNotation(null);
    setLyrics(null);
    setStep("idle");
    setSelectedKey("original");
    setIsRendered(false);
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
                    <div className="flex items-center gap-3">
                      <button
                        onClick={togglePlayPause}
                        className="flex-shrink-0 w-10 h-10 rounded-full bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center transition-colors shadow-sm"
                      >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div
                          ref={progressRef}
                          onClick={handleSeek}
                          className="relative h-2 bg-violet-100 rounded-full cursor-pointer group"
                        >
                          <div
                            className="absolute inset-y-0 left-0 bg-violet-500 rounded-full transition-all"
                            style={{ width: audioDuration ? `${(currentTime / audioDuration) * 100}%` : "0%" }}
                          />
                          <div
                            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-violet-600 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ left: audioDuration ? `calc(${(currentTime / audioDuration) * 100}% - 7px)` : "0" }}
                          />
                        </div>
                        <div className="flex justify-between mt-1">
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
              <div>
                <p className="font-semibold text-black">{STEP_LABELS[step]}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This may take 30-60 seconds depending on the audio length.
                </p>
              </div>
            </div>

            {/* Progress steps */}
            <div className="mt-6 space-y-3">
              {(["uploading", "analyzing", "generating"] as ProcessingStep[]).map((s, i) => {
                const stepOrder = ["uploading", "analyzing", "generating"];
                const currentIdx = stepOrder.indexOf(step);
                const thisIdx = i;
                const isDone = thisIdx < currentIdx;
                const isCurrent = s === step;
                return (
                  <div key={s} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isDone ? "bg-green-500 text-white" :
                      isCurrent ? "bg-violet-600 text-white" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {isDone ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                    </div>
                    <span className={`text-sm ${
                      isDone ? "text-green-600 font-medium" :
                      isCurrent ? "text-black font-medium" :
                      "text-muted-foreground"
                    }`}>
                      {["Upload & prepare audio", "Analyze musical elements with AI", "Generate ABC notation"][i]}
                    </span>
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
        {step === "error" && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="font-semibold text-red-700 mb-2">Generation Failed</p>
            <p className="text-sm text-red-600 mb-4">
              The AI couldn't generate sheet music from this audio. Try a different file or a clearer recording.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={handleReset}>
                Try Another File
              </Button>
              <Button onClick={handleGenerate} className="bg-violet-600 hover:bg-violet-700 text-white">
                <RefreshCw className="mr-2 h-4 w-4" /> Retry
              </Button>
            </div>
          </div>
        )}

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

              {/* Playback controls */}
              <PlaybackControls abc={displayAbc} className="mb-4" />

              {/* Sheet music rendering area */}
              <div
                ref={sheetRef}
                className="bg-white rounded-lg border border-border p-4 min-h-[200px] overflow-x-auto"
                style={{ colorScheme: "light" }}
              />

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
