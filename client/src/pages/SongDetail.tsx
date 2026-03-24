import { useState } from "react";
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
import ListenToLyricsButton from "@/components/ListenToLyricsButton";
import { exportLyricsPDF } from "@/lib/pdfExport";
import {
  Music, FileText, Guitar, Download, Share2, ArrowLeft,
  Clock, Gauge, Tag, Mic, Loader2, FileAudio
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
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Music className="w-6 h-6 text-primary shrink-0" />
                <span className="truncate">{song.title}</span>
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
                  ElevenLabs
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
            {song.lyrics && (
              <ListenToLyricsButton lyrics={song.lyrics} />
            )}
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Lyrics / Sheet Music / Guitar Chords */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
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

      </Tabs>
    </div>
  );
}
