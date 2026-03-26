import { useState } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { copyToClipboard } from "@/lib/clipboard";
import { downloadFile, sanitizeFilename } from "@/lib/safariDownload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AudioPlayer from "@/components/AudioPlayer";
import SheetMusicViewer from "@/components/SheetMusicViewer";
import {
  Music, FileText, Guitar, Download, ArrowLeft,
  Clock, Gauge, Tag, Mic, Loader2, Share2
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function SharedSong() {
  const [, params] = useRoute("/share/:token");
  const token = params?.token || "";

  const { data: song, isLoading, error } = trpc.songs.getShared.useQuery(
    { shareToken: token },
    { enabled: !!token, retry: false }
  );

  const [activeTab, setActiveTab] = useState("lyrics");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading shared song...</p>
        </div>
      </div>
    );
  }

  if (!song || error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <Music className="w-16 h-16 text-muted-foreground/30 mx-auto" />
          <h2 className="text-2xl font-bold text-foreground">Song Not Found</h2>
          <p className="text-muted-foreground">
            This share link may have expired or the song may no longer be available.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </Link>
            <Link href="/discover">
              <Button className="bg-violet-600 hover:bg-violet-700 text-white">
                Discover Music
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleDownload = async () => {
    const url = song.audioUrl || song.mp3Url;
    if (!url) {
      toast.error("No audio file available");
      return;
    }
    toast.info("Preparing download...");
    await downloadFile(url, sanitizeFilename(song.title));
    toast.success("Download started!");
  };

  const handleCopyLink = async () => {
    try {
      await copyToClipboard(window.location.href);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl py-8 space-y-6">
        {/* Shared badge */}
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="gap-1.5 px-3 py-1">
            <Share2 className="w-3.5 h-3.5" />
            Shared Song
          </Badge>
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <Music className="w-4 h-4" />
              Create Christian Music
            </Button>
          </Link>
        </div>

        {/* Song header card */}
        <Card className="glow-card glow-card-active">
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
              {song.engine && (
                <Badge variant="default" className="bg-violet-600 hover:bg-violet-700 shrink-0">
                  {song.engine === "suno" ? "Suno" : song.engine === "elevenlabs" ? "Suno" : song.engine}
                </Badge>
              )}
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

            {/* Audio Player */}
            {(song.audioUrl || song.mp3Url) && (
              <AudioPlayer
                src={(song.audioUrl || song.mp3Url)!}
                title={song.title}
              />
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-2">
              <Button onClick={handleDownload} disabled={!song.audioUrl && !song.mp3Url}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button variant="outline" onClick={handleCopyLink}>
                <Share2 className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs: Lyrics / Sheet Music */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="lyrics" className="gap-1.5">
              <FileText className="w-4 h-4" />
              Lyrics
            </TabsTrigger>
            <TabsTrigger value="sheet-music" className="gap-1.5">
              <Music className="w-4 h-4" />
              Sheet Music
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lyrics">
            <Card>
              <CardContent className="pt-6">
                {song.lyrics ? (
                  <pre className="whitespace-pre-wrap text-sm text-foreground font-sans leading-relaxed">
                    {song.lyrics}
                  </pre>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 space-y-2">
                    <FileText className="w-12 h-12 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No lyrics available for this song.</p>
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
                  abcNotation={song.abcNotation}
                  songTitle={song.title}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* CTA to create own music */}
        <Card className="border-violet-200 bg-violet-50/50">
          <CardContent className="py-6 text-center space-y-3">
            <h3 className="text-lg font-semibold text-foreground">Want to create your own music?</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Create Christian Music lets you generate professional songs from text descriptions, your own lyrics, or even sheet music.
            </p>
            <Link href="/generate">
              <Button className="bg-violet-600 hover:bg-violet-700 text-white">
                Start Creating Music
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
