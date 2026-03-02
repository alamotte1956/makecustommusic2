import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import AudioPlayer from "@/components/AudioPlayer";
import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  Sparkles, Download, Music, Loader2,
  ChevronDown, ChevronUp, Clock, Guitar, Gauge,
  Share2, RefreshCw, Mic, MicOff,
  FileText, Tag, Wand2, PenLine, MessageSquareText
} from "lucide-react";
import FavoriteButton from "@/components/FavoriteButton";
import { getLoginUrl } from "@/const";
import { copyToClipboard } from "@/lib/clipboard";
import { Link } from "wouter";
import { useOnboarding } from "@/contexts/OnboardingContext";
import GenerateCoverButton from "@/components/GenerateCoverButton";
import { usePageMeta } from "@/hooks/usePageMeta";

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
  { value: "none", label: "No Vocals", icon: MicOff },
  { value: "male", label: "Male", icon: Mic },
  { value: "female", label: "Female", icon: Mic },
  { value: "mixed", label: "Duet", icon: Mic },
] as const;

const DURATION_PRESETS = [
  { value: 15, label: "15s" },
  { value: 30, label: "30s" },
  { value: 60, label: "1:00" },
  { value: 120, label: "2:00" },
  { value: 180, label: "3:00" },
  { value: 240, label: "4:00" },
];

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`;
}

type CreationMode = "describe" | "write-lyrics" | "ai-lyrics";

const LYRIC_TEMPLATES = [
  {
    label: "Love Song",
    template: "[Verse 1]\n\n\n[Pre-Chorus]\n\n\n[Chorus]\n\n\n[Verse 2]\n\n\n[Chorus]\n\n\n[Bridge]\n\n\n[Chorus]",
  },
  {
    label: "Story Song",
    template: "[Intro]\n\n\n[Verse 1]\n\n\n[Verse 2]\n\n\n[Chorus]\n\n\n[Verse 3]\n\n\n[Chorus]\n\n\n[Outro]",
  },
  {
    label: "Hip Hop / Rap",
    template: "[Intro]\n\n\n[Verse 1]\n\n\n[Hook]\n\n\n[Verse 2]\n\n\n[Hook]\n\n\n[Bridge]\n\n\n[Hook]",
  },
  {
    label: "Verse-Chorus",
    template: "[Verse 1]\n\n\n[Chorus]\n\n\n[Verse 2]\n\n\n[Chorus]",
  },
];

/* ─────────────────────────────────────────────────────── */
/* Step label helper                                       */
/* ─────────────────────────────────────────────────────── */
function StepHeader({ step, title, subtitle }: { step: number; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0 mt-0.5">
        {step}
      </span>
      <div>
        <h3 className="text-sm font-semibold text-foreground leading-tight">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/* Chip selector (for genre, mood)                         */
/* ─────────────────────────────────────────────────────── */
function ChipGroup({
  options,
  selected,
  onSelect,
  disabled,
}: {
  options: string[];
  selected: string | null;
  onSelect: (v: string | null) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onSelect(selected === opt ? null : opt)}
          disabled={disabled}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
            selected === opt
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/* Main Component                                          */
/* ─────────────────────────────────────────────────────── */
export default function Generator() {
  usePageMeta({
    title: "Create Music",
    description: "Generate unique AI-composed songs. Describe your music, choose genre, mood, and vocal style, then create in seconds.",
    canonicalPath: "/generator",
  });
  const { isAuthenticated } = useAuth({ redirectOnUnauthenticated: true });

  // Step 1: Creation mode
  const [creationMode, setCreationMode] = useState<CreationMode>("describe");

  // Step 2: Content
  const [keywords, setKeywords] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [customLyrics, setCustomLyrics] = useState("");
  const [customStyle, setCustomStyle] = useState("");

  // AI Lyrics sub-state
  const [lyricsSubject, setLyricsSubject] = useState("");
  const [lyricsLength, setLyricsLength] = useState<"standard" | "extended">("standard");
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);
  const generateLyricsMutation = trpc.songs.generateLyrics.useMutation();

  // AI Lyrics Refinement
  const [refineMode, setRefineMode] = useState<"polish" | "rhyme" | "restructure" | "rewrite">("polish");
  const [isRefining, setIsRefining] = useState(false);
  const refineLyricsMutation = trpc.songs.refineLyrics.useMutation();

  // Step 3: Style
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  // Step 4: Voice & Duration
  const [vocalType, setVocalType] = useState<"none" | "male" | "female" | "mixed">("none");
  const [duration, setDuration] = useState(30);

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
  const isCustomMode = creationMode === "write-lyrics" || creationMode === "ai-lyrics";

  // Auto-trigger onboarding tour for first-time users
  const { hasCompletedTour, startTour, isActive: tourIsActive } = useOnboarding();
  useEffect(() => {
    if (!hasCompletedTour && !tourIsActive && isAuthenticated) {
      const timer = setTimeout(() => startTour(), 800);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedTour, tourIsActive, isAuthenticated, startTour]);

  /* ── Handlers ── */

  const handleGenerateLyrics = useCallback(async () => {
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
  }, [lyricsSubject, selectedGenre, selectedMood, vocalType, lyricsLength, generateLyricsMutation]);

  const handleRefineLyrics = useCallback(async () => {
    if (!customLyrics.trim()) {
      toast.error("Please enter lyrics first");
      return;
    }
    try {
      setIsRefining(true);
      const result = await refineLyricsMutation.mutateAsync({
        lyrics: customLyrics.trim(),
        mode: refineMode,
        genre: selectedGenre || undefined,
        mood: selectedMood || undefined,
      });
      setCustomLyrics(result.lyrics);
      toast.success(`Lyrics ${refineMode === "polish" ? "polished" : refineMode === "rhyme" ? "rhyme-enhanced" : refineMode === "restructure" ? "restructured" : "rewritten"}!`);
    } catch (error: any) {
      toast.error(error.message || "Failed to refine lyrics");
    } finally {
      setIsRefining(false);
    }
  }, [customLyrics, refineMode, selectedGenre, selectedMood, refineLyricsMutation]);

  const handleGenerate = useCallback(async () => {
    if (creationMode === "describe" && !keywords.trim()) {
      toast.error("Please describe the music you want to create");
      return;
    }
    if (isCustomMode && !customLyrics.trim()) {
      toast.error("Please enter or generate lyrics first");
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
      setProgressMessage("Composing your music... (this may take 30-120 seconds)");
      setProgress(15);

      const song = await generateMutation.mutateAsync({
        keywords: isCustomMode
          ? (customTitle || keywords.trim() || "Custom Song")
          : keywords.trim(),
        engine: "elevenlabs",
        genre: selectedGenre || undefined,
        mood: selectedMood || undefined,
        vocalType,
        duration,
        mode: isCustomMode ? "custom" : "simple",
        customTitle: isCustomMode ? customTitle : undefined,
        customLyrics: isCustomMode ? customLyrics : undefined,
        customStyle: isCustomMode ? customStyle : undefined,
      });

      if (!song) throw new Error("Failed to generate song");

      setGeneratedSong(song as GeneratedSong);
      setProgress(100);
      setProgressMessage("Done!");
      utils.songs.list.invalidate();
      toast.success("Your song is ready!");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate music");
      setProgress(0);
      setProgressMessage("");
    } finally {
      setIsGenerating(false);
    }
  }, [keywords, creationMode, isCustomMode, selectedGenre, selectedMood, vocalType, duration, customTitle, customLyrics, customStyle, generateMutation, utils, isElevenLabsAvailable]);

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
      await copyToClipboard(shareUrl);
      toast.success("Share link copied to clipboard!");
    } catch {
      toast.error("Failed to create share link");
    }
  }, [generatedSong, shareMutation]);

  /* ── Auth gate ── */
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
  const canGenerate = isElevenLabsAvailable && !isGenerating && (
    creationMode === "describe" ? keywords.trim().length > 0 : customLyrics.trim().length > 0
  );

  return (
    <div className="container py-8 md:py-12 max-w-3xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          Create Music
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Follow the steps below to create your song.
        </p>
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* STEP 1 — Choose how to create                  */}
      {/* ═══════════════════════════════════════════════ */}
      <Card data-tour="creation-mode">
        <CardContent className="pt-5 pb-5 space-y-3">
          <StepHeader step={1} title="How do you want to create?" />

          <div className="grid grid-cols-3 gap-2 pl-10">
            {([
              { value: "describe" as CreationMode, label: "Describe", icon: MessageSquareText, hint: "AI creates everything" },
              { value: "write-lyrics" as CreationMode, label: "My Lyrics", icon: PenLine, hint: "Type or paste lyrics" },
              { value: "ai-lyrics" as CreationMode, label: "AI Lyrics", icon: Wand2, hint: "AI writes for you" },
            ]).map(({ value, label, icon: Icon, hint }) => (
              <button
                key={value}
                onClick={() => setCreationMode(value)}
                disabled={isGenerating}
                className={`relative flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all text-center ${
                  creationMode === value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/40"
                }`}
              >
                <Icon className={`w-5 h-5 ${creationMode === value ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-xs font-semibold ${creationMode === value ? "text-primary" : "text-foreground"}`}>
                  {label}
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight">{hint}</span>
                {value === "write-lyrics" && (
                  <Badge variant="secondary" className="absolute -top-2 -right-2 text-[9px] px-1 py-0 bg-violet-100 text-violet-700 border-0">
                    Popular
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════ */}
      {/* STEP 2 — Your content                          */}
      {/* ═══════════════════════════════════════════════ */}
      <Card data-tour="content-input">
        <CardContent className="pt-5 pb-5 space-y-4">
          <StepHeader
            step={2}
            title={
              creationMode === "describe"
                ? "Describe your song"
                : creationMode === "write-lyrics"
                ? "Write your lyrics"
                : "Tell AI what to write about"
            }
            subtitle={
              creationMode === "describe"
                ? "Be as specific or creative as you like."
                : creationMode === "write-lyrics"
                ? "Paste or type lyrics with section markers like [Verse], [Chorus]."
                : "Describe the topic or feeling and AI will write professional lyrics."
            }
          />

          <div className="pl-10 space-y-4">
            {/* ── DESCRIBE MODE ── */}
            {creationMode === "describe" && (
              <>
                <Textarea
                  placeholder="e.g., happy jazz piano, relaxing ambient rain, epic orchestral adventure, upbeat pop song about summer love..."
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  rows={3}
                  maxLength={500}
                  disabled={isGenerating}
                  className="resize-none text-sm"
                />
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground">{keywords.length}/500</p>
                </div>

                {/* Quick suggestions */}
                {!keywords && (
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "happy jazz piano",
                      "epic orchestral adventure",
                      "calm acoustic guitar",
                      "energetic electronic dance",
                      "melancholic classical violin",
                      "tropical reggae vibes",
                    ].map((s) => (
                      <button
                        key={s}
                        onClick={() => setKeywords(s)}
                        className="px-2.5 py-1 rounded-full text-[11px] border border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── WRITE LYRICS MODE ── */}
            {creationMode === "write-lyrics" && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Song Title</label>
                  <Input
                    placeholder="e.g., Midnight in Paris"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    maxLength={255}
                    disabled={isGenerating}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Your Lyrics</label>
                  <Textarea
                    placeholder={`Paste or type your lyrics here.\n\nUse section markers like [Verse], [Chorus], [Bridge].\n\nExample:\n[Verse 1]\nWalking through the city lights\nEvery shadow tells a story tonight\n\n[Chorus]\nWe're dancing in the moonlight`}
                    value={customLyrics}
                    onChange={(e) => setCustomLyrics(e.target.value)}
                    rows={10}
                    maxLength={5000}
                    disabled={isGenerating}
                    className="resize-none text-sm font-mono leading-relaxed"
                  />
                  <p className="text-[11px] text-muted-foreground text-right">{customLyrics.length}/5000</p>
                </div>

                {/* AI Refine Panel — shown when lyrics exist */}
                {customLyrics.trim().length > 20 && (
                  <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Wand2 className="w-3.5 h-3.5 text-violet-600" />
                      <span className="text-xs font-semibold text-violet-700">AI Refine</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(["polish", "rhyme", "restructure", "rewrite"] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => setRefineMode(m)}
                          className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors capitalize ${
                            refineMode === m
                              ? "bg-violet-600 text-white border-violet-600"
                              : "bg-white text-violet-700 border-violet-200 hover:border-violet-400"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                    <Button
                      onClick={handleRefineLyrics}
                      disabled={isRefining || isGenerating}
                      size="sm"
                      variant="outline"
                      className="w-full gap-1.5 text-xs h-8 border-violet-300 text-violet-700 hover:bg-violet-100"
                    >
                      {isRefining ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Refining...</>
                      ) : (
                        <><Wand2 className="w-3.5 h-3.5" /> Refine with AI ({refineMode})</>
                      )}
                    </Button>
                  </div>
                )}

                {/* Templates — only when lyrics area is empty */}
                {!customLyrics && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Or start from a template:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {LYRIC_TEMPLATES.map((t) => (
                        <button
                          key={t.label}
                          onClick={() => setCustomLyrics(t.template)}
                          className="flex items-center gap-2 p-2 rounded-md border border-border bg-card text-card-foreground hover:bg-accent transition-colors text-left"
                        >
                          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="text-xs font-medium">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Style Tags <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <Input
                    placeholder="e.g., synthwave, dreamy, slow tempo, reverb, acoustic"
                    value={customStyle}
                    onChange={(e) => setCustomStyle(e.target.value)}
                    maxLength={500}
                    disabled={isGenerating}
                    className="text-sm"
                  />
                </div>
              </>
            )}

            {/* ── AI LYRICS MODE ── */}
            {creationMode === "ai-lyrics" && (
              <>
                {/* AI prompt area */}
                <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 space-y-3">
                  <Input
                    placeholder="e.g., falling in love on a summer night, overcoming challenges, road trip with friends..."
                    value={lyricsSubject}
                    onChange={(e) => setLyricsSubject(e.target.value)}
                    maxLength={500}
                    disabled={isGenerating || isGeneratingLyrics}
                    className="text-sm"
                  />

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-muted-foreground">Length:</span>
                      {(["standard", "extended"] as const).map((len) => (
                        <button
                          key={len}
                          onClick={() => setLyricsLength(len)}
                          className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                            lyricsLength === len
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-transparent text-muted-foreground border-border hover:border-primary/50"
                          }`}
                        >
                          {len === "standard" ? "Standard" : "Extended"}
                        </button>
                      ))}
                    </div>

                    <Button
                      onClick={handleGenerateLyrics}
                      disabled={!lyricsSubject.trim() || isGenerating || isGeneratingLyrics}
                      size="sm"
                      className="shrink-0 gap-1 text-xs h-7"
                    >
                      {isGeneratingLyrics ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Writing...</>
                      ) : (
                        <><Wand2 className="w-3.5 h-3.5" /> Generate Lyrics</>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Song title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Song Title <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <Input
                    placeholder="e.g., Midnight in Paris"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    maxLength={255}
                    disabled={isGenerating}
                    className="text-sm"
                  />
                </div>

                {/* Editable lyrics */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    Lyrics
                    {customLyrics && (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0">Editable</Badge>
                    )}
                  </label>
                  <Textarea
                    placeholder="Your lyrics will appear here after generation. You can also type or paste lyrics directly."
                    value={customLyrics}
                    onChange={(e) => setCustomLyrics(e.target.value)}
                    rows={10}
                    maxLength={5000}
                    disabled={isGenerating}
                    className="resize-none text-sm font-mono leading-relaxed"
                  />
                  <p className="text-[11px] text-muted-foreground text-right">{customLyrics.length}/5000</p>
                </div>

                {/* AI Refine Panel — shown when lyrics exist */}
                {customLyrics.trim().length > 20 && (
                  <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Wand2 className="w-3.5 h-3.5 text-violet-600" />
                      <span className="text-xs font-semibold text-violet-700">AI Refine</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(["polish", "rhyme", "restructure", "rewrite"] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => setRefineMode(m)}
                          className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors capitalize ${
                            refineMode === m
                              ? "bg-violet-600 text-white border-violet-600"
                              : "bg-white text-violet-700 border-violet-200 hover:border-violet-400"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                    <Button
                      onClick={handleRefineLyrics}
                      disabled={isRefining || isGenerating}
                      size="sm"
                      variant="outline"
                      className="w-full gap-1.5 text-xs h-8 border-violet-300 text-violet-700 hover:bg-violet-100"
                    >
                      {isRefining ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Refining...</>
                      ) : (
                        <><Wand2 className="w-3.5 h-3.5" /> Refine with AI ({refineMode})</>
                      )}
                    </Button>
                  </div>
                )}

                {/* Style tags */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Style Tags <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <Input
                    placeholder="e.g., synthwave, dreamy, slow tempo, reverb, acoustic"
                    value={customStyle}
                    onChange={(e) => setCustomStyle(e.target.value)}
                    maxLength={500}
                    disabled={isGenerating}
                    className="text-sm"
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════ */}
      {/* STEP 3 — Genre & Mood                          */}
      {/* ═══════════════════════════════════════════════ */}
      <Card data-tour="genre-mood">
        <CardContent className="pt-5 pb-5 space-y-4">
          <StepHeader step={3} title="Choose a genre and mood" subtitle="Pick one of each, or skip to let AI decide." />

          <div className="pl-10 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Genre</label>
              <ChipGroup options={GENRES} selected={selectedGenre} onSelect={setSelectedGenre} disabled={isGenerating} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mood</label>
              <ChipGroup options={MOODS} selected={selectedMood} onSelect={setSelectedMood} disabled={isGenerating} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════ */}
      {/* STEP 4 — Vocals & Duration                     */}
      {/* ═══════════════════════════════════════════════ */}
      <Card data-tour="vocals-duration">
        <CardContent className="pt-5 pb-5 space-y-4">
          <StepHeader step={4} title="Vocals and duration" />

          <div className="pl-10 space-y-5">
            {/* Vocals — compact row */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vocals</label>
              <div className="flex gap-2">
                {VOCAL_OPTIONS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setVocalType(value)}
                    disabled={isGenerating}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 transition-all text-xs font-medium ${
                      vocalType === value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-muted-foreground/40"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration — preset buttons + slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Duration</label>
                <span className="text-xs font-mono text-primary font-semibold">{formatDuration(duration)}</span>
              </div>

              <div className="flex gap-1.5 mb-2">
                {DURATION_PRESETS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setDuration(value)}
                    disabled={isGenerating}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all ${
                      duration === value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-muted-foreground/40"
                    }`}
                  >
                    {label}
                  </button>
                ))}
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════ */}
      {/* STEP 5 — Generate                              */}
      {/* ═══════════════════════════════════════════════ */}
      <Card data-tour="generate-button" className={canGenerate ? "border-primary/50 shadow-sm" : ""}>
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1">
              <StepHeader step={5} title="Generate your song" subtitle={
                !isElevenLabsAvailable
                  ? "ElevenLabs API key required — add it in Settings."
                  : isGenerating
                  ? progressMessage
                  : "Everything looks good. Hit the button to create!"
              } />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!canGenerate}
              size="lg"
              className="shrink-0 gap-2 px-8"
            >
              {isGenerating ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Generating...</>
              ) : (
                <><Sparkles className="w-5 h-5" /> {isCustomMode ? "Create Song" : "Generate Song"}</>
              )}
            </Button>
          </div>

          {/* Progress bar */}
          {isGenerating && (
            <div className="mt-4 space-y-1">
              <Progress value={progress} className="h-2" />
              <p className="text-[11px] text-muted-foreground text-right tabular-nums">{progress}%</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════ */}
      {/* RESULT                                         */}
      {/* ═══════════════════════════════════════════════ */}
      {generatedSong && !isGenerating && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Music className="w-5 h-5 text-primary" />
                    {generatedSong.title}
                  </CardTitle>
                  {generatedSong.musicDescription && (
                    <p className="text-sm text-muted-foreground">{generatedSong.musicDescription}</p>
                  )}
                </div>
                <Badge variant="default" className="bg-violet-600 hover:bg-violet-700">ElevenLabs</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Cover image */}
              {generatedSong.imageUrl && (
                <div className="rounded-lg overflow-hidden w-full max-w-xs">
                  <img src={generatedSong.imageUrl} alt={generatedSong.title} width={320} height={320} className="w-full h-auto" />
                </div>
              )}

              {/* Metadata badges */}
              <div className="flex flex-wrap gap-2">
                {generatedSong.genre && (
                  <Badge variant="secondary" className="gap-1"><Guitar className="w-3 h-3" />{generatedSong.genre}</Badge>
                )}
                {generatedSong.mood && <Badge variant="secondary">{generatedSong.mood}</Badge>}
                {generatedSong.vocalType && generatedSong.vocalType !== "none" && (
                  <Badge variant="secondary" className="gap-1"><Mic className="w-3 h-3" />{generatedSong.vocalType} vocals</Badge>
                )}
                {generatedSong.keySignature && <Badge variant="outline">{generatedSong.keySignature}</Badge>}
                {generatedSong.timeSignature && (
                  <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" />{generatedSong.timeSignature}</Badge>
                )}
                {generatedSong.tempo && (
                  <Badge variant="outline" className="gap-1"><Gauge className="w-3 h-3" />{generatedSong.tempo} BPM</Badge>
                )}
                {generatedSong.duration && (
                  <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" />{formatDuration(generatedSong.duration)}</Badge>
                )}
                {generatedSong.styleTags && (
                  <Badge variant="outline" className="gap-1"><Tag className="w-3 h-3" />{generatedSong.styleTags}</Badge>
                )}
              </div>

              {/* Instruments */}
              {generatedSong.instruments && generatedSong.instruments.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Instruments:</span> {generatedSong.instruments.join(", ")}
                </p>
              )}

              {/* Audio Player */}
              {(generatedSong.audioUrl || generatedSong.mp3Url) && (
                <AudioPlayer src={(generatedSong.audioUrl || generatedSong.mp3Url)!} title={generatedSong.title} />
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" onClick={handleDownload} disabled={!hasDownloadable}>
                  <Download className="w-4 h-4 mr-1.5" /> Download
                </Button>
                <FavoriteButton songId={generatedSong.id} variant="outline" showLabel />
                <Button size="sm" variant="outline" onClick={() => handleGenerate()}>
                  <RefreshCw className="w-4 h-4 mr-1.5" /> Regenerate
                </Button>
                <Button size="sm" variant="outline" onClick={handleShare}>
                  <Share2 className="w-4 h-4 mr-1.5" /> Share
                </Button>
                {generatedSong.lyrics && (
                  <Button size="sm" variant="outline" onClick={() => setShowLyrics(!showLyrics)}>
                    {showLyrics ? <ChevronUp className="w-4 h-4 mr-1.5" /> : <ChevronDown className="w-4 h-4 mr-1.5" />}
                    {showLyrics ? "Hide" : "View"} Lyrics
                  </Button>
                )}
                <GenerateCoverButton
                  songId={generatedSong.id}
                  hasImage={!!generatedSong.imageUrl}
                  size="sm"
                  variant="outline"
                  onGenerated={(url) => setGeneratedSong(prev => prev ? { ...prev, imageUrl: url } : prev)}
                />
                <Link href={`/songs/${generatedSong.id}`}>
                  <Button size="sm" variant="outline">
                    <Music className="w-4 h-4 mr-1.5" /> Sheet Music
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Lyrics panel */}
          {showLyrics && generatedSong.lyrics && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" /> Lyrics
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
