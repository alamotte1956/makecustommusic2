import { useState, useRef, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { copyToClipboard } from "@/lib/clipboard";
import { downloadFile, sanitizeFilename } from "@/lib/safariDownload";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AudioPlayer from "@/components/AudioPlayer";
import FavoriteButton from "@/components/FavoriteButton";
import SheetMusicViewer from "@/components/SheetMusicViewer";
import GuitarChordViewer from "@/components/GuitarChordViewer";
import SingabilityAnalysis from "@/components/SingabilityAnalysis";
import { exportLyricsPDF } from "@/lib/pdfExport";
import {
  Music, FileText, Guitar, Download, Share2, ArrowLeft,
  Clock, Gauge, Tag, Mic, Loader2, FileAudio, Pencil, Check, X,
  Scissors, Play, Pause, Volume2, DollarSign, BarChart3
} from "lucide-react";
import { toast } from "sonner";

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function SongDetail() {
  const [, params] = useRoute("/songs/:id");
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const songId = params?.id ? parseInt(params.id, 10) : null;

  const { data: song, isLoading } = trpc.songs.getById.useQuery(
    { id: songId! },
    {
      enabled: !!songId && !!user,
      // Poll every 5s while sheet music is still being generated in the background
      refetchInterval: (query) => {
        const data = query.state.data;
        if (data && !data.sheetMusicAbc) return 5000;
        return false;
      },
    }
  );

  const [activeTab, setActiveTab] = useState("lyrics");
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const renameMutation = trpc.songs.update.useMutation({
    onSuccess: () => {
      utils.songs.getById.invalidate({ id: songId! });
      utils.songs.list.invalidate();
      setIsRenaming(false);
      toast.success("Song renamed!");
    },
    onError: (err) => toast.error(err.message || "Failed to rename song"),
  });

  const startRename = () => {
    if (song) {
      setRenameValue(song.title);
      setIsRenaming(true);
    }
  };

  const confirmRename = () => {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      toast.error("Title cannot be empty");
      return;
    }
    if (trimmed === song?.title) {
      setIsRenaming(false);
      return;
    }
    renameMutation.mutate({ id: songId!, title: trimmed });
  };

  const cancelRename = () => {
    setIsRenaming(false);
    setRenameValue("");
  };

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  if (authLoading || isLoading) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="text-center py-20 space-y-4">
          <Music className="w-12 h-12 mx-auto text-muted-foreground/40" />
          <p className="text-muted-foreground">Please sign in to view song details.</p>
        </div>
      </div>
    );
  }

  if (!song) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="text-center py-20 space-y-4">
          <Music className="w-12 h-12 mx-auto text-muted-foreground/40" />
          <p className="text-muted-foreground">Song not found.</p>
          <Button variant="outline" onClick={() => navigate("/history")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Songs
          </Button>
        </div>
      </div>
    );
  }

  const handleDownload = async () => {
    // Prefer mixed URL > audio URL > mp3 URL
    const url = song.mixedUrl || song.audioUrl || song.mp3Url;
    if (!url) {
      toast.error("No audio file available");
      return;
    }
    toast.info("Preparing download...");
    await downloadFile(url, sanitizeFilename(song.title));
    toast.success("Download started!");
  };

  const handleShare = async () => {
    try {
      await copyToClipboard(window.location.href);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => navigate("/history")} className="gap-1.5 -ml-2">
        <ArrowLeft className="w-4 h-4" />
        Back to My Songs
      </Button>

      {/* Song header card */}
      <Card className="glow-card glow-card-active">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Music className="w-6 h-6 text-primary shrink-0" />
                {isRenaming ? (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <input
                      ref={renameInputRef}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") confirmRename();
                        if (e.key === "Escape") cancelRename();
                      }}
                      maxLength={255}
                      disabled={renameMutation.isPending}
                      className="flex-1 min-w-0 bg-muted/50 border border-border rounded-md px-2 py-1 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={confirmRename}
                      disabled={renameMutation.isPending}
                      className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-colors"
                      title="Save"
                    >
                      {renameMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={cancelRename}
                      disabled={renameMutation.isPending}
                      className="p-1 text-muted-foreground hover:bg-muted rounded transition-colors"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <span
                    className="truncate group cursor-pointer hover:text-primary transition-colors"
                    onClick={startRename}
                    title="Click to rename"
                  >
                    {song.title}
                    <Pencil className="w-3.5 h-3.5 inline-block ml-2 opacity-0 group-hover:opacity-60 transition-opacity" />
                  </span>
                )}
              </CardTitle>
              {song.musicDescription && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {song.musicDescription}
                </p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              {song.postProcessPreset && song.postProcessPreset !== "raw" && (
                <Badge variant="outline" className="text-xs">
                  {song.postProcessPreset}
                </Badge>
              )}
              {song.engine === "mp3-transcription" ? (
                <Badge variant="default" className="bg-teal-600 hover:bg-teal-700 gap-1">
                  <FileAudio className="w-3 h-3" />
                  Transcribed from Audio
                </Badge>
              ) : (
                <Badge variant="default" className="bg-violet-600 hover:bg-violet-700">
                  Suno
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Cover image */}
          {song.imageUrl && (
            <div className="rounded-lg overflow-hidden w-full max-w-xs">
              <img src={song.imageUrl} alt={song.title} width={320} height={320} className="w-full h-auto" />
            </div>
          )}

          {/* Metadata badges */}
          <div className="flex flex-wrap gap-2">
            {song.genre && (
              <Badge variant="secondary" className="gap-1">
                <Guitar className="w-3 h-3" />
                {song.genre}
              </Badge>
            )}
            {song.mood && <Badge variant="secondary">{song.mood}</Badge>}
            {song.vocalType && song.vocalType !== "none" && (
              <Badge variant="secondary" className="gap-1">
                <Mic className="w-3 h-3" />
                {song.vocalType} vocals
              </Badge>
            )}
            {song.keySignature && <Badge variant="outline">{song.keySignature}</Badge>}
            {song.timeSignature && (
              <Badge variant="outline" className="gap-1">
                <Clock className="w-3 h-3" />
                {song.timeSignature}
              </Badge>
            )}
            {song.tempo && (
              <Badge variant="outline" className="gap-1">
                <Gauge className="w-3 h-3" />
                {song.tempo} BPM
              </Badge>
            )}
            {song.duration && (
              <Badge variant="outline" className="gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(song.duration)}
              </Badge>
            )}
            {song.styleTags && (
              <Badge variant="outline" className="gap-1">
                <Tag className="w-3 h-3" />
                {song.styleTags}
              </Badge>
            )}
          </div>

          {/* Audio Player — prefer mixed URL if available */}
          {(song.mixedUrl || song.audioUrl || song.mp3Url) && (
            <div data-tour="audio-player">
              <AudioPlayer
                src={(song.mixedUrl || song.audioUrl || song.mp3Url)!}
                title={song.title}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={handleDownload} disabled={!song.audioUrl && !song.mp3Url && !song.mixedUrl}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <FavoriteButton songId={song.id} variant="outline" showLabel />
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Lyrics / Sheet Music / Guitar Chords / Stems */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="lyrics" className="gap-1.5" data-tour="lyrics-tab">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Lyrics</span>
          </TabsTrigger>
          <TabsTrigger value="sheet-music" className="gap-1.5" data-tour="sheet-music-tab">
            <Music className="w-4 h-4" />
            <span className="hidden sm:inline">Sheet Music</span>
          </TabsTrigger>
          <TabsTrigger value="guitar" className="gap-1.5" data-tour="chords-tab">
            <Guitar className="w-4 h-4" />
            <span className="hidden sm:inline">Guitar</span>
          </TabsTrigger>
          <TabsTrigger value="singability" className="gap-1.5">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Analysis</span>
          </TabsTrigger>
          <TabsTrigger value="stems" className="gap-1.5">
            <Scissors className="w-4 h-4" />
            <span className="hidden sm:inline">Stems</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lyrics">
          <Card>
            <CardContent className="pt-6">
              {song.lyrics ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Song Lyrics</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => {
                        try {
                          exportLyricsPDF(song.lyrics!, song.title, {
                            genre: song.genre ?? undefined,
                            mood: song.mood ?? undefined,
                            key: song.keySignature ?? undefined,
                            tempo: song.tempo ?? undefined,
                            vocalType: song.vocalType ?? undefined,
                          });
                          toast.success("Lyrics PDF downloaded!");
                        } catch {
                          toast.error("Failed to export lyrics PDF");
                        }
                      }}
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download PDF
                    </Button>
                  </div>
                  <pre className="whitespace-pre-wrap text-sm text-foreground font-sans leading-relaxed">
                    {song.lyrics}
                  </pre>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 space-y-2">
                  <FileText className="w-12 h-12 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No lyrics available for this song.</p>
                  <p className="text-xs text-muted-foreground">
                    Generate a new song with lyrics in the Generator to see them here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sheet-music">
          <Card>
            <CardContent className="pt-6">
              <SheetMusicViewer
                songId={song.id}
                abcNotation={song.sheetMusicAbc}
                songTitle={song.title}
                songKeySignature={song.keySignature}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guitar">
          <Card>
            <CardContent className="pt-6">
              <GuitarChordViewer
                songId={song.id}
                chordProgression={song.chordProgression as any}
                songTitle={song.title}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="singability">
          <Card>
            <CardContent className="pt-6">
              <SingabilityAnalysis songId={song.id} hasLyrics={!!song.lyrics} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stems">
          <StemSeparationPanel songId={song.id} songTitle={song.title} hasAudio={!!(song.audioUrl || song.mp3Url || song.mixedUrl)} />
        </TabsContent>

      </Tabs>
    </div>
  );
}

// ─── Stem Separation Panel ──────────────────────────────────────────────────

function StemSeparationPanel({ songId, songTitle, hasAudio }: { songId: number; songTitle: string; hasAudio: boolean }) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [playingStem, setPlayingStem] = useState<string | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  const { data: stemStatus, isLoading: stemsLoading } = trpc.songs.getStemStatus.useQuery(
    { songId },
    {
      enabled: !!user,
      refetchInterval: (query) => {
        const data = query.state.data;
        if (data && data.status === "processing") return 5000;
        return false;
      },
    }
  );

  const createCheckout = trpc.songs.createStemCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        toast.info("Redirecting to checkout...");
        window.open(data.url, "_blank");
      }
    },
    onError: (err) => toast.error(err.message || "Failed to create checkout"),
  });

  const handlePurchase = () => {
    const origin = window.location.origin;
    createCheckout.mutate({
      songId,
      successUrl: `${origin}/songs/${songId}?stems=success`,
      cancelUrl: `${origin}/songs/${songId}?stems=cancel`,
    });
  };

  const togglePlay = (stemKey: string, url: string) => {
    if (playingStem === stemKey) {
      audioRefs.current[stemKey]?.pause();
      setPlayingStem(null);
    } else {
      // Pause any currently playing stem
      if (playingStem && audioRefs.current[playingStem]) {
        audioRefs.current[playingStem].pause();
      }
      if (!audioRefs.current[stemKey]) {
        audioRefs.current[stemKey] = new Audio(url);
        audioRefs.current[stemKey].addEventListener("ended", () => setPlayingStem(null));
      }
      audioRefs.current[stemKey].play();
      setPlayingStem(stemKey);
    }
  };

  const handleDownloadStem = (url: string, stemType: string) => {
    const filename = sanitizeFilename(`${songTitle} - ${stemType}`) + ".mp3";
    downloadFile(url, filename);
    toast.success(`Downloading ${stemType}...`);
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      Object.values(audioRefs.current).forEach((audio) => {
        audio.pause();
        audio.src = "";
      });
    };
  }, []);

  const stemLabels: { key: string; label: string; icon: string }[] = [
    { key: "vocalUrl", label: "Vocals", icon: "🎤" },
    { key: "instrumentalUrl", label: "Instrumental", icon: "🎵" },
    { key: "backingVocalsUrl", label: "Backing Vocals", icon: "🎶" },
    { key: "drumsUrl", label: "Drums", icon: "🥁" },
    { key: "bassUrl", label: "Bass", icon: "🎸" },
    { key: "guitarUrl", label: "Guitar", icon: "🎸" },
    { key: "keyboardUrl", label: "Keyboard", icon: "🎹" },
    { key: "percussionUrl", label: "Percussion", icon: "🪘" },
    { key: "stringsUrl", label: "Strings", icon: "🎻" },
    { key: "synthUrl", label: "Synth", icon: "🎛️" },
    { key: "fxUrl", label: "FX", icon: "✨" },
    { key: "brassUrl", label: "Brass", icon: "🎺" },
    { key: "woodwindsUrl", label: "Woodwinds", icon: "🪈" },
  ];

  if (stemsLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not purchased yet
  if (!stemStatus || stemStatus.status === "pending_payment") {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 space-y-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Scissors className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center space-y-2 max-w-md">
              <h3 className="text-lg font-semibold">Stem Separation</h3>
              <p className="text-sm text-muted-foreground">
                Isolate individual parts of your song — vocals, drums, bass, guitar, keyboard, strings, and more.
                Perfect for remixing, karaoke, or studying individual instruments.
              </p>
            </div>
            <div className="text-center space-y-1">
              <p className="text-2xl font-bold">$5.00</p>
              <p className="text-xs text-muted-foreground">Includes MN Hennepin County sales tax (8.53%)</p>
            </div>
            {!hasAudio ? (
              <p className="text-sm text-muted-foreground">This song has no audio to separate.</p>
            ) : (
              <Button
                onClick={handlePurchase}
                disabled={createCheckout.isPending}
                className="gap-2"
                size="lg"
              >
                {createCheckout.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <DollarSign className="w-4 h-4" />
                )}
                Purchase Stem Separation
              </Button>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
              {stemLabels.slice(0, 6).map((s) => (
                <div key={s.key} className="flex items-center gap-1.5 bg-muted/50 rounded-md px-2 py-1.5">
                  <span>{s.icon}</span>
                  <span>{s.label}</span>
                </div>
              ))}
              <div className="col-span-2 sm:col-span-3 text-center text-muted-foreground/60">
                + 7 more instrument stems
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Processing
  if (stemStatus.status === "processing") {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <div className="text-center space-y-1">
              <h3 className="text-lg font-semibold">Separating Stems...</h3>
              <p className="text-sm text-muted-foreground">
                Our AI is isolating the individual tracks from your song. This usually takes 2-5 minutes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Failed
  if (stemStatus.status === "failed") {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <X className="w-10 h-10 text-destructive" />
            <div className="text-center space-y-1">
              <h3 className="text-lg font-semibold">Stem Separation Failed</h3>
              <p className="text-sm text-muted-foreground">
                Something went wrong during processing. Please contact support for a refund or to retry.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Completed — show stems
  const availableStems = stemLabels.filter((s) => {
    const val = (stemStatus as any)[s.key];
    return val && typeof val === "string" && val.length > 0;
  });

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Separated Stems ({availableStems.length} tracks)</span>
          </div>

          {availableStems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No stems were extracted from this song.</p>
          ) : (
            <div className="grid gap-2">
              {availableStems.map((stem) => {
                const url = (stemStatus as any)[stem.key] as string;
                const isPlaying = playingStem === stem.key;
                return (
                  <div
                    key={stem.key}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <span className="text-lg shrink-0">{stem.icon}</span>
                    <span className="text-sm font-medium flex-1">{stem.label}</span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => togglePlay(stem.key, url)}
                        title={isPlaying ? "Pause" : "Play"}
                      >
                        {isPlaying ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleDownloadStem(url, stem.label)}
                        title={`Download ${stem.label}`}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
