import { useState, useRef, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Upload as UploadIcon, Music, FileMusic, Image, X, Loader2,
  CheckCircle2, AlertCircle, Wand2, ArrowRight, Play, Pause, Volume2, VolumeX,
} from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";

type UploadMode = "audio" | "sheet-music";

const AUDIO_TYPES = ["audio/mpeg", "audio/wav", "audio/flac", "audio/ogg", "audio/mp4", "audio/x-m4a", "audio/aac"];
const SHEET_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf", "text/xml", "application/xml"];
const AUDIO_ACCEPT = ".mp3,.wav,.flac,.ogg,.m4a,.aac,.mp4";
const SHEET_ACCEPT = ".png,.jpg,.jpeg,.webp,.pdf,.xml,.musicxml";

export default function UploadPage() {
  // ─── ALL HOOKS MUST BE CALLED UNCONDITIONALLY AT THE TOP ───
  usePageMeta({
    title: "Upload",
    description: "Upload your own audio or sheet music to Make Custom Music. Import MP3, WAV, or FLAC files and add them to your collection.",
    canonicalPath: "/upload",
  });
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<UploadMode>("audio");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [mood, setMood] = useState("");
  const [copyrightAck, setCopyrightAck] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [vocalType, setVocalType] = useState<"none" | "male" | "female" | "mixed">("none");
  const [duration, setDuration] = useState(60);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const prevVolumeRef = useRef(1);
  const progressRef = useRef<HTMLDivElement>(null);

  // Clean up preview URL and audio when file changes or component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [previewUrl]);

  const uploadAudio = trpc.songs.uploadAudio.useMutation();
  const analyzeSheet = trpc.songs.analyzeSheetMusic.useMutation();
  const generateFromSheet = trpc.songs.generateFromSheetMusic.useMutation();

  const stopPreview = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeEventListener("timeupdate", () => {});
      audioRef.current.removeEventListener("ended", () => {});
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
    if (AUDIO_TYPES.some(t => f.type === t)) {
      const url = URL.createObjectURL(f);
      setPreviewUrl(url);
      const audio = new Audio(url);
      audio.addEventListener("loadedmetadata", () => {
        setAudioDuration(audio.duration);
      });
      audio.addEventListener("timeupdate", () => {
        setCurrentTime(audio.currentTime);
      });
      audio.addEventListener("ended", () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });
      audio.volume = volume;
      audioRef.current = audio;
    }
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
    const validTypes = mode === "audio" ? AUDIO_TYPES : SHEET_TYPES;
    if (!validTypes.some(t => f.type === t || f.name.endsWith(".musicxml"))) {
      toast.error(mode === "audio"
        ? "Please upload an audio file (MP3, WAV, FLAC, OGG, M4A, AAC)"
        : "Please upload an image (PNG, JPG), PDF, or MusicXML file");
      return;
    }
    const maxSize = mode === "audio" ? 50 * 1024 * 1024 : 20 * 1024 * 1024;
    if (f.size > maxSize) {
      toast.error(`File too large. Maximum ${mode === "audio" ? "50MB" : "20MB"}.`);
      return;
    }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ""));
    setAnalysis(null);
    if (mode === "audio") setupPreview(f);
  }, [mode, title, setupPreview]);

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

  const handleUploadAudio = useCallback(async () => {
    if (!file || !copyrightAck) return;
    setUploading(true);
    try {
      const base64 = await readFileAsBase64(file);
      const result = await uploadAudio.mutateAsync({
        fileName: file.name,
        fileData: base64,
        mimeType: file.type || "audio/mpeg",
        title: title || undefined,
        genre: genre || undefined,
        mood: mood || undefined,
      });
      toast.success("Audio uploaded successfully!");
      if (result.song?.id) {
        navigate(`/songs/${result.song.id}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [file, copyrightAck, title, genre, mood, readFileAsBase64, uploadAudio, navigate]);

  const handleAnalyzeSheet = useCallback(async () => {
    if (!file) return;
    setAnalyzing(true);
    try {
      const base64 = await readFileAsBase64(file);
      const result = await analyzeSheet.mutateAsync({
        fileData: base64,
        fileName: file.name,
        mimeType: file.type || "image/png",
      });
      setAnalysis(result.analysis);
      toast.success("Sheet music analyzed! Review the details and generate your song.");
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("Could not extract meaningful")) {
        toast.error(msg, { duration: 8000 });
      } else if (msg.includes("Insufficient credits")) {
        toast.error("Insufficient credits. Please purchase more credits to analyze sheet music.");
      } else {
        toast.error(msg || "Analysis failed. Please try again with a clearer image or PDF.", { duration: 6000 });
      }
    } finally {
      setAnalyzing(false);
    }
  }, [file, readFileAsBase64, analyzeSheet]);

  const handleGenerateFromSheet = useCallback(async () => {
    if (!analysis) return;
    setUploading(true);
    try {
      const result = await generateFromSheet.mutateAsync({
        analysis: {
          title: analysis.title,
          key: analysis.key,
          timeSignature: analysis.timeSignature,
          tempo: analysis.tempo,
          genre: analysis.genre,
          mood: analysis.mood,
          instruments: analysis.instruments,
          description: analysis.description,
          styleTags: analysis.styleTags,
          chordProgression: analysis.chordProgression,
        },
        vocalType,
        duration,
        lyrics: analysis.sections
          ?.filter((s: any) => s.lyrics)
          .map((s: any) => `[${s.name}]\n${s.lyrics}`)
          .join("\n\n") || undefined,
      });
      toast.success("Song generated from sheet music!");
      if (result.song?.id) {
        navigate(`/songs/${result.song.id}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Generation failed");
    } finally {
      setUploading(false);
    }
  }, [analysis, vocalType, duration, generateFromSheet, navigate]);

  // ─── EARLY RETURN AFTER ALL HOOKS ───
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <UploadIcon className="h-12 w-12 text-violet-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-black mb-2">Upload & Remaster</h2>
          <p className="text-muted-foreground mb-6">Sign in to upload your audio files or sheet music.</p>
          <a href={getLoginUrl()}>
            <Button className="bg-violet-600 hover:bg-violet-700 text-white">Sign In to Upload</Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-black">Upload & Remaster</h1>
          <p className="text-muted-foreground mt-2">
            Upload your own audio files or sheet music to remaster, remix, or generate new songs.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <button
            onClick={() => { setMode("audio"); stopPreview(); setFile(null); setAnalysis(null); }}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
              mode === "audio"
                ? "border-violet-500 bg-violet-50 shadow-sm"
                : "border-border hover:border-violet-300"
            }`}
          >
            <Music className={`h-6 w-6 ${mode === "audio" ? "text-violet-600" : "text-muted-foreground"}`} />
            <div className="text-left">
              <p className={`font-semibold ${mode === "audio" ? "text-black" : "text-foreground"}`}>Upload Audio</p>
              <p className="text-xs text-muted-foreground">MP3, WAV, FLAC, OGG, M4A</p>
            </div>
          </button>
          <button
            onClick={() => { setMode("sheet-music"); stopPreview(); setFile(null); setAnalysis(null); }}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
              mode === "sheet-music"
                ? "border-violet-500 bg-violet-50 shadow-sm"
                : "border-border hover:border-violet-300"
            }`}
          >
            <FileMusic className={`h-6 w-6 ${mode === "sheet-music" ? "text-violet-600" : "text-muted-foreground"}`} />
            <div className="text-left">
              <p className={`font-semibold ${mode === "sheet-music" ? "text-black" : "text-foreground"}`}>Sheet Music</p>
              <p className="text-xs text-muted-foreground">PNG, JPG, PDF, MusicXML</p>
            </div>
          </button>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
            dragOver
              ? "border-violet-500 bg-violet-50"
              : file
                ? "border-green-400 bg-green-50/50"
                : "border-border hover:border-violet-300 hover:bg-violet-50/30"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={mode === "audio" ? AUDIO_ACCEPT : SHEET_ACCEPT}
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
                <button
                  onClick={(e) => { e.stopPropagation(); stopPreview(); setFile(null); setAnalysis(null); }}
                  className="ml-4 p-1 rounded-full hover:bg-gray-200"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              {/* Audio Preview Player */}
              {mode === "audio" && previewUrl && (
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

                    {/* Volume Control */}
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
                  <p className="text-xs text-violet-600 mt-2 text-center font-medium">Preview your audio before uploading</p>
                </div>
              )}
            </div>
          ) : (
            <>
              {mode === "audio" ? (
                <Music className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              ) : (
                <Image className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              )}
              <p className="text-lg font-medium text-foreground">
                Drop your {mode === "audio" ? "audio file" : "sheet music"} here
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                or click to browse &middot; Max {mode === "audio" ? "50MB" : "20MB"}
              </p>
            </>
          )}
        </div>

        {/* Audio Upload Details */}
        {mode === "audio" && file && (
          <div className="mt-6 space-y-4 bg-card rounded-xl border p-6">
            <h3 className="font-semibold text-black flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-violet-500" /> Song Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="title" className="text-sm text-muted-foreground">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Song title" />
              </div>
              <div>
                <Label htmlFor="genre" className="text-sm text-muted-foreground">Genre</Label>
                <Input id="genre" value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="e.g., Pop, Rock" />
              </div>
              <div>
                <Label htmlFor="mood" className="text-sm text-muted-foreground">Mood</Label>
                <Input id="mood" value={mood} onChange={(e) => setMood(e.target.value)} placeholder="e.g., Upbeat, Chill" />
              </div>
            </div>

            <label className="flex items-start gap-3 mt-4 cursor-pointer">
              <input
                type="checkbox"
                checked={copyrightAck}
                onChange={(e) => setCopyrightAck(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
              />
              <span className="text-sm text-muted-foreground">
                I confirm that I own the rights to this audio or it is non-copyrighted material. I understand that uploading copyrighted content without permission is prohibited.
              </span>
            </label>

            <Button
              onClick={handleUploadAudio}
              disabled={uploading || !copyrightAck}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white mt-2"
            >
              {uploading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</>
              ) : (
                <><UploadIcon className="mr-2 h-4 w-4" /> Upload & Add to Library</>
              )}
            </Button>
          </div>
        )}

        {/* Sheet Music Analysis Flow */}
        {mode === "sheet-music" && file && !analysis && (
          <div className="mt-6 bg-card rounded-xl border p-6">
            <h3 className="font-semibold text-black flex items-center gap-2 mb-4">
              <Wand2 className="h-4 w-4 text-violet-500" /> Analyze Sheet Music
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Our AI will read the notation, extract key, tempo, chords, and structure, then generate a full audio production from the score.
            </p>
            <Button
              onClick={handleAnalyzeSheet}
              disabled={analyzing}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white"
            >
              {analyzing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing notation...</>
              ) : (
                <><Wand2 className="mr-2 h-4 w-4" /> Analyze Sheet Music</>
              )}
            </Button>
          </div>
        )}

        {/* Analysis Results */}
        {analysis && (
          <div className="mt-6 space-y-4">
            <div className="bg-card rounded-xl border p-6">
              <h3 className="font-semibold text-black text-lg mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" /> Analysis Complete
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Key</p>
                  <p className="font-bold text-black">{analysis.key}</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Time</p>
                  <p className="font-bold text-black">{analysis.timeSignature}</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Tempo</p>
                  <p className="font-bold text-black">{analysis.tempo} BPM</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Genre</p>
                  <p className="font-bold text-black">{analysis.genre}</p>
                </div>
              </div>

              {analysis.chordProgression?.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Chord Progression</p>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.chordProgression.map((chord: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded text-sm font-mono">
                        {chord}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {analysis.sections?.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Sections</p>
                  <div className="space-y-1">
                    {analysis.sections.map((s: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="font-semibold text-violet-600 min-w-[100px]">{s.name}</span>
                        <span className="text-muted-foreground">{s.notes}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-sm text-muted-foreground italic">{analysis.description}</p>
            </div>

            {/* Generation Options */}
            <div className="bg-card rounded-xl border p-6">
              <h3 className="font-semibold text-black mb-4">Generation Options</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Vocals</Label>
                  <div className="flex gap-2 mt-1">
                    {(["none", "male", "female", "mixed"] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setVocalType(v)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          vocalType === v
                            ? "bg-violet-600 text-white"
                            : "bg-muted text-foreground hover:bg-violet-100"
                        }`}
                      >
                        {v === "none" ? "Instrumental" : v.charAt(0).toUpperCase() + v.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Duration: {duration}s</Label>
                  <input
                    type="range"
                    min={15}
                    max={300}
                    step={5}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full mt-2 accent-violet-600"
                  />
                </div>
              </div>

              <Button
                onClick={handleGenerateFromSheet}
                disabled={uploading}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white"
              >
                {uploading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating song...</>
                ) : (
                  <><ArrowRight className="mr-2 h-4 w-4" /> Generate Song from Sheet Music</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-muted/50 rounded-xl p-5 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-violet-500 mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">About Upload & Remaster</p>
            <p>
              Upload your own non-copyrighted audio files (MP3, WAV, FLAC) to add them to your library, 
              then use the Studio tools to remaster with professional presets. Or upload sheet music 
              (images, PDFs, MusicXML) and our AI will read the notation and generate a full audio production.
              Each upload costs 1 credit.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
