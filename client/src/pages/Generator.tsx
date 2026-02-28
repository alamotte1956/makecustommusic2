import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AudioPlayer from "@/components/AudioPlayer";
import SheetMusic from "@/components/SheetMusic";
import { useState, useCallback, useRef, useMemo } from "react";
import { synthesizeAudio, createAudioUrl, revokeAudioUrl } from "@/lib/audioSynthesizer";
import { toast } from "sonner";
import {
  Sparkles, Download, Printer, Music, Loader2,
  ChevronDown, ChevronUp, Clock, Guitar, Gauge,
  Share2, RefreshCw, Mic, MicOff, Zap, Crown,
  FileText, Tag
} from "lucide-react";
import FavoriteButton from "@/components/FavoriteButton";
import { getLoginUrl } from "@/const";

type GeneratedSong = {
  id: number;
  title: string;
  keywords: string;
  abcNotation: string | null;
  musicDescription: string | null;
  audioUrl: string | null;
  mp3Url: string | null;
  genre: string | null;
  mood: string | null;
  tempo: number | null;
  keySignature: string | null;
  timeSignature: string | null;
  instruments: string[] | null;
  engine: string | null;
  vocalType: string | null;
  lyrics: string | null;
  styleTags: string | null;
  imageUrl: string | null;
  duration: number | null;
};

const GENRES = [
  "Jazz", "Classical", "Electronic", "Rock", "Ambient", "Pop",
  "Hip Hop", "Country", "R&B", "Folk", "Reggae", "Blues",
];

const MOODS = [
  "Happy", "Melancholic", "Energetic", "Calm", "Epic",
  "Romantic", "Dark", "Uplifting", "Mysterious", "Playful",
];

const VOCAL_OPTIONS = [
  { value: "none", label: "No Vocals", desc: "Instrumental only", icon: MicOff, color: "text-muted-foreground" },
  { value: "male", label: "Male Singer", desc: "Male vocal performance", icon: Mic, color: "text-blue-500" },
  { value: "female", label: "Female Singer", desc: "Female vocal performance", icon: Mic, color: "text-pink-500" },
  { value: "mixed", label: "Both Singers", desc: "Male & female duet", icon: Mic, color: "text-purple-500" },
] as const;

const DURATION_MARKS = [15, 30, 60, 90, 120, 180, 240];

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`;
}

export default function Generator() {
  const { isAuthenticated } = useAuth({ redirectOnUnauthenticated: true });

  // Engine & mode state
  const [selectedEngine, setSelectedEngine] = useState<"free" | "suno">("free");
  const [sunoMode, setSunoMode] = useState<"simple" | "custom">("simple");

  // Common fields
  const [keywords, setKeywords] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [vocalType, setVocalType] = useState<"none" | "male" | "female" | "mixed">("none");
  const [duration, setDuration] = useState(30);

  // Suno Custom Mode fields
  const [customTitle, setCustomTitle] = useState("");
  const [customLyrics, setCustomLyrics] = useState("");
  const [customStyle, setCustomStyle] = useState("");

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [generatedSong, setGeneratedSong] = useState<GeneratedSong | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [mp3Blob, setMp3Blob] = useState<Blob | null>(null);
  const [showSheetMusic, setShowSheetMusic] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const audioUrlRef = useRef<string | null>(null);

  // Queries & mutations
  const enginesQuery = trpc.songs.engines.useQuery();
  const generateMutation = trpc.songs.generate.useMutation();
  const saveMp3Mutation = trpc.songs.saveMp3.useMutation();
  const shareMutation = trpc.songs.createShareLink.useMutation();
  const utils = trpc.useUtils();

  const isSunoAvailable = enginesQuery.data?.suno ?? false;

  const handleGenerate = useCallback(async () => {
    if (!keywords.trim() && !(selectedEngine === "suno" && sunoMode === "custom" && customLyrics.trim())) {
      toast.error("Please enter keywords or lyrics to describe your music");
      return;
    }

    // Clean up previous audio
    if (audioUrlRef.current) {
      revokeAudioUrl(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setAudioUrl(null);
    setMp3Blob(null);
    setGeneratedSong(null);
    setShowSheetMusic(false);
    setShowLyrics(false);

    try {
      setIsGenerating(true);
      setProgress(10);

      if (selectedEngine === "suno") {
        setProgressMessage("Suno V5 is creating your music... (this may take 30-60 seconds)");
        setProgress(15);

        const song = await generateMutation.mutateAsync({
          keywords: keywords.trim() || (sunoMode === "custom" ? customTitle || "Custom Song" : ""),
          engine: "suno",
          genre: selectedGenre || undefined,
          mood: selectedMood || undefined,
          vocalType,
          duration,
          sunoMode,
          customTitle: sunoMode === "custom" ? customTitle : undefined,
          customLyrics: sunoMode === "custom" ? customLyrics : undefined,
          customStyle: sunoMode === "custom" ? customStyle : undefined,
        });

        if (!song) throw new Error("Failed to generate song");

        setGeneratedSong(song as GeneratedSong);

        // Suno returns a direct audio URL
        if (song.audioUrl) {
          setAudioUrl(song.audioUrl);
        }

        setProgress(100);
        setProgressMessage("Done!");
        utils.songs.list.invalidate();
        toast.success("Music generated with Suno V5!");
      } else {
        // Free engine: LLM + ABC notation + client synthesis
        setProgressMessage("AI is composing your music...");

        const song = await generateMutation.mutateAsync({
          keywords: keywords.trim(),
          engine: "free",
          genre: selectedGenre || undefined,
          mood: selectedMood || undefined,
          vocalType,
          duration,
        });

        if (!song) throw new Error("Failed to generate song");

        setGeneratedSong(song as GeneratedSong);
        setProgress(40);
        setProgressMessage("Synthesizing audio...");
        setIsGenerating(false);
        setIsSynthesizing(true);

        // Synthesize from ABC notation
        const { blob } = await synthesizeAudio(
          song.abcNotation || "",
          song.tempo || 120,
          (p) => {
            setProgress(40 + Math.round(p * 0.5));
            if (p < 50) setProgressMessage("Rendering notes...");
            else if (p < 80) setProgressMessage("Processing audio...");
            else setProgressMessage("Finalizing...");
          }
        );

        const url = createAudioUrl(blob);
        audioUrlRef.current = url;
        setAudioUrl(url);
        setMp3Blob(blob);
        setProgress(95);
        setProgressMessage("Saving audio...");

        // Upload to S3
        try {
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              const result = reader.result as string;
              resolve(result.split(",")[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          await saveMp3Mutation.mutateAsync({
            songId: song.id,
            mp3Base64: base64,
          });
        } catch {
          console.warn("Failed to upload audio to storage");
        }

        setProgress(100);
        setProgressMessage("Done!");
        utils.songs.list.invalidate();
        toast.success("Music generated successfully!");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to generate music");
      setProgress(0);
      setProgressMessage("");
    } finally {
      setIsGenerating(false);
      setIsSynthesizing(false);
    }
  }, [keywords, selectedEngine, sunoMode, selectedGenre, selectedMood, vocalType, duration, customTitle, customLyrics, customStyle, generateMutation, saveMp3Mutation, utils]);

  const handleRegenerate = useCallback(() => {
    // Re-run generation with same settings
    handleGenerate();
  }, [handleGenerate]);

  const handleDownload = useCallback(() => {
    if (!generatedSong) return;

    // For Suno songs, download from the audio URL
    const downloadUrl = audioUrl || generatedSong.audioUrl || generatedSong.mp3Url;
    if (!downloadUrl && !mp3Blob) return;

    const filename = `${generatedSong.title.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_")}.mp3`;

    if (mp3Blob) {
      const url = URL.createObjectURL(mp3Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (downloadUrl) {
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    toast.success("Download started!");
  }, [audioUrl, mp3Blob, generatedSong]);

  const handleShare = useCallback(async () => {
    if (!generatedSong) return;
    try {
      const result = await shareMutation.mutateAsync({ songId: generatedSong.id });
      const shareUrl = `${window.location.origin}/share/${result.shareToken}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied to clipboard!");
    } catch {
      toast.error("Failed to create share link");
    }
  }, [generatedSong, shareMutation]);

  const handlePrintSheetMusic = useCallback(() => {
    if (!generatedSong || !generatedSong.abcNotation) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow pop-ups to print sheet music");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${generatedSong.title} - Sheet Music</title>
          <script src="https://cdn.jsdelivr.net/npm/abcjs@6.6.2/dist/abcjs-basic-min.js"><\/script>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            h1 { font-size: 24px; margin-bottom: 8px; }
            .meta { color: #666; font-size: 14px; margin-bottom: 24px; }
            .sheet-music { margin-top: 20px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <h1>${generatedSong.title}</h1>
          <div class="meta">
            ${generatedSong.genre ? `Genre: ${generatedSong.genre}` : ""}
            ${generatedSong.keySignature ? ` | Key: ${generatedSong.keySignature}` : ""}
            ${generatedSong.tempo ? ` | Tempo: ${generatedSong.tempo} BPM` : ""}
          </div>
          <div id="sheet-music" class="sheet-music"></div>
          <script>
            window.onload = function() {
              ABCJS.renderAbc("sheet-music", ${JSON.stringify(generatedSong.abcNotation)}, {
                staffwidth: 700,
                paddingtop: 10,
                paddingbottom: 10,
              });
              setTimeout(function() { window.print(); }, 500);
            };
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }, [generatedSong]);

  if (!isAuthenticated) {
    return (
      <div className="container py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">Sign in to create music</h2>
        <Button asChild>
          <a href={getLoginUrl()}>Sign In</a>
        </Button>
      </div>
    );
  }

  const isWorking = isGenerating || isSynthesizing;
  const hasDownloadable = mp3Blob || generatedSong?.audioUrl || generatedSong?.mp3Url;

  return (
    <div className="container py-8 md:py-12 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary" />
          Create Music
        </h1>
        <p className="text-muted-foreground">
          Describe the music you want and let AI compose it for you
        </p>
      </div>

      {/* Engine Selector */}
      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Engine</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Free Engine */}
              <button
                onClick={() => setSelectedEngine("free")}
                disabled={isWorking}
                className={`relative flex items-start gap-3 p-4 rounded-lg border-2 transition-all text-left ${
                  selectedEngine === "free"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <Zap className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium text-foreground flex items-center gap-2">
                    Built-in AI
                    <Badge variant="secondary" className="text-xs">Free</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    LLM-generated compositions with sheet music. Instant, no API key needed.
                  </p>
                </div>
              </button>

              {/* Suno Engine */}
              <button
                onClick={() => isSunoAvailable && setSelectedEngine("suno")}
                disabled={isWorking || !isSunoAvailable}
                className={`relative flex items-start gap-3 p-4 rounded-lg border-2 transition-all text-left ${
                  selectedEngine === "suno"
                    ? "border-primary bg-primary/5"
                    : isSunoAvailable
                    ? "border-border hover:border-muted-foreground/30"
                    : "border-border opacity-50 cursor-not-allowed"
                }`}
              >
                <Crown className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium text-foreground flex items-center gap-2">
                    Suno V5
                    <Badge variant="default" className="text-xs bg-amber-500 hover:bg-amber-600">Pro</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isSunoAvailable
                      ? "Studio-quality music with real vocals, lyrics, and production."
                      : "Add SUNO_API_KEY in Settings to unlock."}
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Suno Mode Toggle (only when Suno is selected) */}
          {selectedEngine === "suno" && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Suno Mode</label>
              <Tabs value={sunoMode} onValueChange={(v) => setSunoMode(v as "simple" | "custom")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="simple" className="gap-2">
                    <Sparkles className="w-4 h-4" />
                    Simple
                  </TabsTrigger>
                  <TabsTrigger value="custom" className="gap-2">
                    <FileText className="w-4 h-4" />
                    Custom
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <p className="text-xs text-muted-foreground">
                {sunoMode === "simple"
                  ? "Describe your music and Suno creates everything — melody, lyrics, and production."
                  : "Write your own lyrics, set style tags, and name your track for full creative control."}
              </p>
            </div>
          )}

          {/* Keywords / Prompt (always shown for simple mode, optional for custom) */}
          {!(selectedEngine === "suno" && sunoMode === "custom") && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Describe your music
              </label>
              <Textarea
                placeholder="e.g., happy jazz piano, relaxing ambient rain, epic orchestral adventure..."
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                rows={3}
                maxLength={500}
                disabled={isWorking}
                className="resize-none text-base"
              />
              <p className="text-xs text-muted-foreground text-right">
                {keywords.length}/500
              </p>
            </div>
          )}

          {/* Suno Custom Mode Fields */}
          {selectedEngine === "suno" && sunoMode === "custom" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Music className="w-4 h-4" />
                  Song Title
                </label>
                <Input
                  placeholder="e.g., Midnight in Paris"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  maxLength={255}
                  disabled={isWorking}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Lyrics
                </label>
                <Textarea
                  placeholder={`[Verse 1]\nWalking through the city lights\nEvery shadow tells a story tonight\n\n[Chorus]\nWe're dancing in the moonlight\nEverything feels so right...`}
                  value={customLyrics}
                  onChange={(e) => setCustomLyrics(e.target.value)}
                  rows={8}
                  maxLength={5000}
                  disabled={isWorking}
                  className="resize-none text-sm font-mono"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {customLyrics.length}/5000
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Style Tags
                </label>
                <Input
                  placeholder="e.g., synthwave, female vocals, dreamy, slow tempo, reverb"
                  value={customStyle}
                  onChange={(e) => setCustomStyle(e.target.value)}
                  maxLength={500}
                  disabled={isWorking}
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated style descriptors that guide the sound and production.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Keywords (optional context)
                </label>
                <Input
                  placeholder="Additional context for the generation..."
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  maxLength={500}
                  disabled={isWorking}
                />
              </div>
            </div>
          )}

          {/* Genre Presets */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Genre</label>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGenre(selectedGenre === g ? null : g)}
                  disabled={isWorking}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    selectedGenre === g
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Mood Presets */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Mood</label>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <button
                  key={m}
                  onClick={() => setSelectedMood(selectedMood === m ? null : m)}
                  disabled={isWorking}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    selectedMood === m
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Vocal Type */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Mic className="w-4 h-4" />
              Vocals
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {VOCAL_OPTIONS.map(({ value, label, desc, icon: Icon, color }) => (
                <button
                  key={value}
                  onClick={() => setVocalType(value)}
                  disabled={isWorking}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all ${
                    vocalType === value
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border bg-card hover:border-muted-foreground/30 hover:bg-accent/50"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${vocalType === value ? "text-primary" : color}`} />
                  <span className={`text-sm font-semibold ${vocalType === value ? "text-primary" : "text-foreground"}`}>
                    {label}
                  </span>
                  <span className="text-[10px] text-muted-foreground leading-tight text-center">
                    {desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Duration Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Duration
              </label>
              <span className="text-sm font-mono text-primary font-semibold">
                {formatDuration(duration)}
              </span>
            </div>
            <Slider
              value={[duration]}
              onValueChange={([v]) => setDuration(v)}
              min={15}
              max={240}
              step={15}
              disabled={isWorking}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              {DURATION_MARKS.map((d) => (
                <span key={d} className={duration === d ? "text-primary font-medium" : ""}>
                  {formatDuration(d)}
                </span>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={handleGenerate}
              disabled={isWorking || (!keywords.trim() && !(selectedEngine === "suno" && sunoMode === "custom" && customLyrics.trim()))}
              size="lg"
              className="flex-1 sm:flex-none"
            >
              {isWorking ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  {selectedEngine === "suno" ? (
                    <Crown className="w-5 h-5 mr-2" />
                  ) : (
                    <Sparkles className="w-5 h-5 mr-2" />
                  )}
                  Generate with {selectedEngine === "suno" ? "Suno V5" : "Built-in AI"}
                </>
              )}
            </Button>
          </div>

          {/* Progress */}
          {isWorking && (
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{progressMessage}</span>
                <span className="text-muted-foreground tabular-nums">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suggestion chips (only when no result and not working, for simple mode) */}
      {!generatedSong && !isWorking && !(selectedEngine === "suno" && sunoMode === "custom") && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Try these ideas:</p>
          <div className="flex flex-wrap gap-2">
            {[
              "happy jazz piano",
              "epic orchestral adventure",
              "calm acoustic guitar",
              "energetic electronic dance",
              "melancholic classical violin",
              "tropical reggae vibes",
              "dark cinematic suspense",
              "cheerful folk ukulele",
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setKeywords(suggestion)}
                className="px-3 py-1.5 rounded-full text-sm border border-border bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Generated Song Result */}
      {generatedSong && !isWorking && (
        <div className="space-y-6">
          {/* Song Info Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Music className="w-5 h-5 text-primary" />
                    {generatedSong.title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {generatedSong.musicDescription}
                  </p>
                </div>
                <Badge variant={generatedSong.engine === "suno" ? "default" : "secondary"} className={generatedSong.engine === "suno" ? "bg-amber-500 hover:bg-amber-600" : ""}>
                  {generatedSong.engine === "suno" ? "Suno V5" : "Built-in AI"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Cover image (Suno) */}
              {generatedSong.imageUrl && (
                <div className="rounded-lg overflow-hidden w-full max-w-xs">
                  <img src={generatedSong.imageUrl} alt={generatedSong.title} className="w-full h-auto" />
                </div>
              )}

              {/* Metadata badges */}
              <div className="flex flex-wrap gap-2">
                {generatedSong.genre && (
                  <Badge variant="secondary" className="gap-1">
                    <Guitar className="w-3 h-3" />
                    {generatedSong.genre}
                  </Badge>
                )}
                {generatedSong.mood && (
                  <Badge variant="secondary">{generatedSong.mood}</Badge>
                )}
                {generatedSong.vocalType && generatedSong.vocalType !== "none" && (
                  <Badge variant="secondary" className="gap-1">
                    <Mic className="w-3 h-3" />
                    {generatedSong.vocalType} vocals
                  </Badge>
                )}
                {generatedSong.keySignature && (
                  <Badge variant="outline">{generatedSong.keySignature}</Badge>
                )}
                {generatedSong.timeSignature && (
                  <Badge variant="outline" className="gap-1">
                    <Clock className="w-3 h-3" />
                    {generatedSong.timeSignature}
                  </Badge>
                )}
                {generatedSong.tempo && (
                  <Badge variant="outline" className="gap-1">
                    <Gauge className="w-3 h-3" />
                    {generatedSong.tempo} BPM
                  </Badge>
                )}
                {generatedSong.duration && (
                  <Badge variant="outline" className="gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(generatedSong.duration)}
                  </Badge>
                )}
                {generatedSong.styleTags && (
                  <Badge variant="outline" className="gap-1">
                    <Tag className="w-3 h-3" />
                    {generatedSong.styleTags}
                  </Badge>
                )}
              </div>

              {/* Instruments */}
              {generatedSong.instruments && generatedSong.instruments.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Instruments:</span>{" "}
                  {generatedSong.instruments.join(", ")}
                </div>
              )}

              {/* Audio Player */}
              {audioUrl && (
                <AudioPlayer src={audioUrl} title={generatedSong.title} />
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-2">
                <Button onClick={handleDownload} disabled={!hasDownloadable}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <FavoriteButton songId={generatedSong.id} variant="outline" showLabel />
                <Button variant="outline" onClick={handleRegenerate}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Regenerate
                </Button>
                <Button variant="outline" onClick={handleShare}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                {generatedSong.abcNotation && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setShowSheetMusic(!showSheetMusic)}
                    >
                      {showSheetMusic ? (
                        <ChevronUp className="w-4 h-4 mr-2" />
                      ) : (
                        <ChevronDown className="w-4 h-4 mr-2" />
                      )}
                      {showSheetMusic ? "Hide" : "View"} Sheet Music
                    </Button>
                    <Button variant="outline" onClick={handlePrintSheetMusic}>
                      <Printer className="w-4 h-4 mr-2" />
                      Print
                    </Button>
                  </>
                )}
                {generatedSong.lyrics && (
                  <Button
                    variant="outline"
                    onClick={() => setShowLyrics(!showLyrics)}
                  >
                    {showLyrics ? (
                      <ChevronUp className="w-4 h-4 mr-2" />
                    ) : (
                      <ChevronDown className="w-4 h-4 mr-2" />
                    )}
                    {showLyrics ? "Hide" : "View"} Lyrics
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sheet Music */}
          {showSheetMusic && generatedSong.abcNotation && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Music className="w-5 h-5 text-primary" />
                  Sheet Music
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SheetMusic abcNotation={generatedSong.abcNotation} />
              </CardContent>
            </Card>
          )}

          {/* Lyrics */}
          {showLyrics && generatedSong.lyrics && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Lyrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap text-sm text-foreground font-sans leading-relaxed">
                  {generatedSong.lyrics}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
