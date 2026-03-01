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
import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Sparkles, Download, Music, Loader2,
  ChevronDown, ChevronUp, Clock, Guitar, Gauge,
  Share2, RefreshCw, Mic, MicOff, Crown,
  FileText, Tag, Wand2
} from "lucide-react";
import FavoriteButton from "@/components/FavoriteButton";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";

type GeneratedSong = {
  id: number;
  title: string;
  keywords: string;
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

  // Mode state
  const [mode, setMode] = useState<"simple" | "custom">("simple");

  // Common fields
  const [keywords, setKeywords] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [vocalType, setVocalType] = useState<"none" | "male" | "female" | "mixed">("none");
  const [duration, setDuration] = useState(30);

  // Custom Mode fields
  const [customTitle, setCustomTitle] = useState("");
  const [customLyrics, setCustomLyrics] = useState("");
  const [customStyle, setCustomStyle] = useState("");

  // Lyrics generation state
  const [lyricsSubject, setLyricsSubject] = useState("");
  const [lyricsLength, setLyricsLength] = useState<"standard" | "extended">("standard");
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);
  const generateLyricsMutation = trpc.songs.generateLyrics.useMutation();

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [generatedSong, setGeneratedSong] = useState<GeneratedSong | null>(null);
  const [showLyrics, setShowLyrics] = useState(false);

  // Queries & mutations
  const enginesQuery = trpc.songs.engines.useQuery();
  const generateMutation = trpc.songs.generate.useMutation();
  const shareMutation = trpc.songs.createShareLink.useMutation();
  const utils = trpc.useUtils();

  const isElevenLabsAvailable = enginesQuery.data?.elevenlabs ?? false;

  const handleGenerate = useCallback(async () => {
    if (!keywords.trim() && !(mode === "custom" && customLyrics.trim())) {
      toast.error("Please enter keywords or lyrics to describe your music");
      return;
    }

    if (!isElevenLabsAvailable) {
      toast.error("ElevenLabs engine is not available. Please configure the ELEVENLABS_API_KEY in Settings.");
      return;
    }

    setGeneratedSong(null);
    setShowLyrics(false);

    try {
      setIsGenerating(true);
      setProgressMessage("ElevenLabs is composing your music... (this may take 30-120 seconds)");
      setProgress(15);

      const song = await generateMutation.mutateAsync({
        keywords: keywords.trim() || (mode === "custom" ? customTitle || "Custom Song" : ""),
        engine: "elevenlabs",
        genre: selectedGenre || undefined,
        mood: selectedMood || undefined,
        vocalType,
        duration,
        mode,
        customTitle: mode === "custom" ? customTitle : undefined,
        customLyrics: mode === "custom" ? customLyrics : undefined,
        customStyle: mode === "custom" ? customStyle : undefined,
      });

      if (!song) throw new Error("Failed to generate song");

      setGeneratedSong(song as GeneratedSong);
      setProgress(100);
      setProgressMessage("Done!");
      utils.songs.list.invalidate();
      toast.success("Music generated with ElevenLabs!");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate music");
      setProgress(0);
      setProgressMessage("");
    } finally {
      setIsGenerating(false);
    }
  }, [keywords, mode, selectedGenre, selectedMood, vocalType, duration, customTitle, customLyrics, customStyle, generateMutation, utils, isElevenLabsAvailable]);

  const handleRegenerate = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  const handleDownload = useCallback(() => {
    if (!generatedSong) return;

    const downloadUrl = generatedSong.audioUrl || generatedSong.mp3Url;
    if (!downloadUrl) return;

    const filename = `${generatedSong.title.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_")}.mp3`;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = filename;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    toast.success("Download started!");
  }, [generatedSong]);

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

  const hasDownloadable = generatedSong?.audioUrl || generatedSong?.mp3Url;

  return (
    <div className="container py-8 md:py-12 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary" />
          Create Music
        </h1>
        <p className="text-muted-foreground">
          Describe the music you want and let ElevenLabs compose it for you
        </p>
      </div>

      {/* Generator Card */}
      <Card>
        <CardContent className="pt-6 space-y-6">
          {/* Engine badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-primary bg-primary/5">
              <Crown className="w-5 h-5 text-amber-500" />
              <div>
                <div className="font-medium text-foreground flex items-center gap-2">
                  ElevenLabs
                  <Badge variant="default" className="text-xs bg-amber-500 hover:bg-amber-600">Pro</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {isElevenLabsAvailable
                    ? "Studio-quality AI music with vocals, lyrics, and production."
                    : "Add ELEVENLABS_API_KEY in Settings to unlock."}
                </p>
              </div>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Mode</label>
            <Tabs value={mode} onValueChange={(v) => setMode(v as "simple" | "custom")}>
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
              {mode === "simple"
                ? "Describe your music and ElevenLabs creates everything — melody, lyrics, and production."
                : "Write your own lyrics, set style tags, and name your track for full creative control."}
            </p>
          </div>

          {/* Keywords / Prompt (shown for simple mode) */}
          {mode !== "custom" && (
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
                disabled={isGenerating}
                className="resize-none text-base"
              />
              <p className="text-xs text-muted-foreground text-right">
                {keywords.length}/500
              </p>
            </div>
          )}

          {/* Custom Mode Fields */}
          {mode === "custom" && (
            <div className="space-y-4">
              {/* AI Lyrics Generator */}
              <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-4 space-y-3">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-primary" />
                  AI Lyrics Generator
                </label>
                <p className="text-xs text-muted-foreground">
                  Enter a subject or topic and let AI write lyrics for you. The generated lyrics will fill the field below.
                </p>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground">Length:</span>
                  <button
                    type="button"
                    onClick={() => setLyricsLength("standard")}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      lyricsLength === "standard"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-transparent text-muted-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    Standard
                  </button>
                  <button
                    type="button"
                    onClick={() => setLyricsLength("extended")}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      lyricsLength === "extended"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-transparent text-muted-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    Extended (3+ verses, bridge, outro)
                  </button>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., falling in love on a summer night, overcoming challenges, road trip with friends..."
                    value={lyricsSubject}
                    onChange={(e) => setLyricsSubject(e.target.value)}
                    maxLength={500}
                    disabled={isGenerating || isGeneratingLyrics}
                    className="flex-1"
                  />
                  <Button
                    onClick={async () => {
                      if (!lyricsSubject.trim()) {
                        toast.error("Please enter a subject for the lyrics");
                        return;
                      }
                      try {
                        setIsGeneratingLyrics(true);
                        const result = await generateLyricsMutation.mutateAsync({
                          subject: lyricsSubject.trim(),
                          genre: selectedGenre || undefined,
                          mood: selectedMood || undefined,
                          vocalType,
                          length: lyricsLength,
                        });
                        setCustomLyrics(result.lyrics);
                        toast.success("Lyrics generated! Review and edit them below.");
                      } catch (error: any) {
                        toast.error(error.message || "Failed to generate lyrics");
                      } finally {
                        setIsGeneratingLyrics(false);
                      }
                    }}
                    disabled={!lyricsSubject.trim() || isGenerating || isGeneratingLyrics}
                    size="sm"
                    className="shrink-0 gap-1.5"
                  >
                    {isGeneratingLyrics ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Writing...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4" />
                        Generate
                      </>
                    )}
                  </Button>
                </div>
              </div>

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
                  disabled={isGenerating}
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
                  disabled={isGenerating}
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
                  disabled={isGenerating}
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
                  disabled={isGenerating}
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
                  disabled={isGenerating}
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
                  disabled={isGenerating}
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
                  disabled={isGenerating}
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
              disabled={isGenerating}
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
              disabled={isGenerating || !isElevenLabsAvailable || (!keywords.trim() && !(mode === "custom" && customLyrics.trim()))}
              size="lg"
              className="flex-1 sm:flex-none"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Crown className="w-5 h-5 mr-2" />
                  Generate with ElevenLabs
                </>
              )}
            </Button>
            {!isElevenLabsAvailable && (
              <p className="text-sm text-destructive self-center">
                ElevenLabs API key required. Add it in Settings to start creating.
              </p>
            )}
          </div>

          {/* Progress */}
          {isGenerating && (
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
      {!generatedSong && !isGenerating && mode !== "custom" && (
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
      {generatedSong && !isGenerating && (
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
                <Badge variant="default" className="bg-violet-600 hover:bg-violet-700">
                  ElevenLabs
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Cover image */}
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
              {(generatedSong.audioUrl || generatedSong.mp3Url) && (
                <AudioPlayer src={(generatedSong.audioUrl || generatedSong.mp3Url)!} title={generatedSong.title} />
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
                <Link href={`/songs/${generatedSong.id}`}>
                  <Button variant="outline">
                    <Music className="w-4 h-4 mr-2" />
                    Sheet Music & Chords
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

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
