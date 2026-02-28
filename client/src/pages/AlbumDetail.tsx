import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AudioPlayer from "@/components/AudioPlayer";
import SheetMusic from "@/components/SheetMusic";
import { useState, useCallback } from "react";
import { synthesizeAudio, createAudioUrl } from "@/lib/audioSynthesizer";
import { toast } from "sonner";
import { useRoute, Link } from "wouter";
import {
  Disc3, Music, Download, Printer, Loader2,
  ArrowLeft, Play, X, ChevronDown, ChevronUp, ImagePlus, Sparkles
} from "lucide-react";
import FavoriteButton from "@/components/FavoriteButton";

export default function AlbumDetail() {
  const { isAuthenticated } = useAuth({ redirectOnUnauthenticated: true });
  const [, params] = useRoute("/albums/:id");
  const albumId = params?.id ? parseInt(params.id) : 0;

  const { data: album, isLoading } = trpc.albums.getById.useQuery(
    { id: albumId },
    { enabled: isAuthenticated && albumId > 0 }
  );
  const removeSongMutation = trpc.albums.removeSong.useMutation();
  const generateCoverMutation = trpc.albums.generateCover.useMutation();
  const utils = trpc.useUtils();

  const [playingSong, setPlayingSong] = useState<number | null>(null);
  const [audioUrls, setAudioUrls] = useState<Record<number, string>>({});
  const [synthesizing, setSynthesizing] = useState<number | null>(null);
  const [expandedSong, setExpandedSong] = useState<number | null>(null);
  const [generatingCover, setGeneratingCover] = useState(false);

  const handlePlay = useCallback(async (song: any) => {
    // If song has an audioUrl from Suno/external, use it directly
    if (song.audioUrl) {
      setAudioUrls(prev => ({ ...prev, [song.id]: song.audioUrl }));
      setPlayingSong(song.id);
      return;
    }
    if (audioUrls[song.id]) {
      setPlayingSong(song.id);
      return;
    }
    if (!song.abcNotation) {
      toast.error("No audio available for this song");
      return;
    }
    setSynthesizing(song.id);
    try {
      const { blob } = await synthesizeAudio(song.abcNotation, song.tempo || 120);
      const url = createAudioUrl(blob);
      setAudioUrls(prev => ({ ...prev, [song.id]: url }));
      setPlayingSong(song.id);
    } catch {
      toast.error("Failed to synthesize audio");
    } finally {
      setSynthesizing(null);
    }
  }, [audioUrls]);

  const handleDownload = useCallback(async (song: any) => {
    // If song has an audioUrl from Suno/external, download it directly
    if (song.audioUrl) {
      const a = document.createElement("a");
      a.href = song.audioUrl;
      a.download = `${song.title.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_")}.mp3`;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Download started!");
      return;
    }

    if (!song.abcNotation) {
      toast.error("No audio available for this song");
      return;
    }

    let blob: Blob;
    if (audioUrls[song.id]) {
      const response = await fetch(audioUrls[song.id]);
      blob = await response.blob();
    } else {
      setSynthesizing(song.id);
      try {
        const result = await synthesizeAudio(song.abcNotation, song.tempo || 120);
        blob = result.blob;
        const url = createAudioUrl(result.blob);
        setAudioUrls(prev => ({ ...prev, [song.id]: url }));
      } finally {
        setSynthesizing(null);
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${song.title.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_")}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Download started!");
  }, [audioUrls]);

  const handleRemoveSong = useCallback(async (songId: number) => {
    try {
      await removeSongMutation.mutateAsync({ albumId, songId });
      utils.albums.getById.invalidate({ id: albumId });
      utils.albums.list.invalidate();
      toast.success("Song removed from album");
    } catch {
      toast.error("Failed to remove song");
    }
  }, [albumId, removeSongMutation, utils]);

  const handleGenerateCover = useCallback(async () => {
    setGeneratingCover(true);
    try {
      await generateCoverMutation.mutateAsync({ albumId });
      utils.albums.getById.invalidate({ id: albumId });
      utils.albums.list.invalidate();
      toast.success("Album cover generated!");
    } catch {
      toast.error("Failed to generate cover. Try adding songs first.");
    } finally {
      setGeneratingCover(false);
    }
  }, [albumId, generateCoverMutation, utils]);

  const handlePrint = useCallback((song: any) => {
    if (!song.abcNotation) {
      toast.error("Sheet music not available for this song");
      return;
    }
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow pop-ups to print sheet music");
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${song.title} - Sheet Music</title>
          <script src="https://cdn.jsdelivr.net/npm/abcjs@6.6.2/dist/abcjs-basic-min.js"><\/script>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            h1 { font-size: 24px; margin-bottom: 8px; }
            .meta { color: #666; font-size: 14px; margin-bottom: 24px; }
          </style>
        </head>
        <body>
          <h1>${song.title}</h1>
          <div class="meta">
            ${song.genre ? `Genre: ${song.genre}` : ""}
            ${song.keySignature ? ` | Key: ${song.keySignature}` : ""}
            ${song.tempo ? ` | Tempo: ${song.tempo} BPM` : ""}
          </div>
          <div id="sheet-music"></div>
          <script>
            window.onload = function() {
              ABCJS.renderAbc("sheet-music", ${JSON.stringify(song.abcNotation)}, { staffwidth: 700 });
              setTimeout(function() { window.print(); }, 500);
            };
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }, []);

  if (!isAuthenticated) return null;

  if (isLoading) {
    return (
      <div className="container py-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!album) {
    return (
      <div className="container py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">Album not found</h2>
        <Button asChild variant="outline">
          <Link href="/albums">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Albums
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-8 md:py-12 max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <Link href="/albums">
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Albums
        </Button>
      </Link>

      {/* Album Header with Cover Image */}
      <div className="flex items-start gap-6">
        <div className="relative group shrink-0">
          <div
            className="w-28 h-28 sm:w-36 sm:h-36 rounded-xl flex items-center justify-center overflow-hidden shadow-lg"
            style={{ backgroundColor: album.coverColor || "#6366f1" }}
          >
            {album.coverImageUrl ? (
              <img
                src={album.coverImageUrl}
                alt={`${album.title} cover`}
                className="w-full h-full object-cover"
              />
            ) : (
              <Disc3 className="w-12 h-12 sm:w-16 sm:h-16 text-white/30" />
            )}
          </div>
          {/* Generate Cover Overlay */}
          <button
            onClick={handleGenerateCover}
            disabled={generatingCover}
            className="absolute inset-0 rounded-xl bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-70"
          >
            {generatingCover ? (
              <>
                <Loader2 className="w-6 h-6 text-white animate-spin mb-1" />
                <span className="text-white text-xs font-medium">Generating...</span>
              </>
            ) : (
              <>
                <ImagePlus className="w-6 h-6 text-white mb-1" />
                <span className="text-white text-xs font-medium">
                  {album.coverImageUrl ? "Regenerate" : "Generate"} Cover
                </span>
              </>
            )}
          </button>
        </div>
        <div className="space-y-2 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{album.title}</h1>
          {album.description && (
            <p className="text-muted-foreground">{album.description}</p>
          )}
          <p className="text-sm text-muted-foreground">
            {album.songs?.length ?? 0} song{(album.songs?.length ?? 0) !== 1 ? "s" : ""}
          </p>
          {!album.coverImageUrl && (album.songs?.length ?? 0) > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateCover}
              disabled={generatingCover}
              className="mt-2"
            >
              {generatingCover ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              )}
              Generate AI Cover Art
            </Button>
          )}
        </div>
      </div>

      {/* Songs List */}
      {!album.songs || album.songs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Music className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No songs in this album</h3>
            <p className="text-muted-foreground mb-4">
              Go to My Songs to add songs to this album
            </p>
            <Button asChild variant="outline">
              <Link href="/history">Go to My Songs</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {album.songs.map((song: any, index: number) => (
            <Card key={song.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-sm text-muted-foreground font-mono mt-1 w-6 text-right shrink-0">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{song.title}</h3>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {song.engine && song.engine !== "free" && (
                            <Badge variant="default" className="text-xs bg-gradient-to-r from-purple-600 to-indigo-600">
                              {song.engine === "suno" ? "Suno V5" : "MusicGen"}
                            </Badge>
                          )}
                          {song.genre && <Badge variant="secondary" className="text-xs">{song.genre}</Badge>}
                          {song.mood && <Badge variant="secondary" className="text-xs">{song.mood}</Badge>}
                          {song.vocalType && song.vocalType !== "none" && (
                            <Badge variant="outline" className="text-xs capitalize">{song.vocalType} Vocals</Badge>
                          )}
                          {song.tempo && <Badge variant="outline" className="text-xs">{song.tempo} BPM</Badge>}
                        </div>
                      </div>
                    </div>

                    {/* Player */}
                    {playingSong === song.id && audioUrls[song.id] && (
                      <div className="mt-3">
                        <AudioPlayer src={audioUrls[song.id]} compact />
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePlay(song)}
                        disabled={synthesizing === song.id || (!song.audioUrl && !song.abcNotation)}
                      >
                        {synthesizing === song.id ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <Play className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        Play
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(song)}
                        disabled={synthesizing === song.id || (!song.audioUrl && !song.abcNotation)}
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        {song.audioUrl ? "MP3" : "WAV"}
                      </Button>
                      {song.abcNotation && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setExpandedSong(expandedSong === song.id ? null : song.id)}
                          >
                            {expandedSong === song.id ? (
                              <ChevronUp className="w-3.5 h-3.5 mr-1.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            Sheet Music
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrint(song)}
                          >
                            <Printer className="w-3.5 h-3.5 mr-1.5" />
                            Print
                          </Button>
                        </>
                      )}
                      <FavoriteButton songId={song.id} size="sm" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveSong(song.id)}
                      >
                        <X className="w-3.5 h-3.5 mr-1.5" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expanded Sheet Music */}
                {expandedSong === song.id && song.abcNotation && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <SheetMusic abcNotation={song.abcNotation} />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
