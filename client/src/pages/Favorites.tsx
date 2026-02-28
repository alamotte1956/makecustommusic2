import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SheetMusic from "@/components/SheetMusic";
import FavoriteButton from "@/components/FavoriteButton";
import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  Heart, Download, Printer, Loader2,
  ChevronDown, ChevronUp, Play, Share2, ListMusic, Pause
} from "lucide-react";
import { useQueuePlayer, type QueueSong } from "@/contexts/QueuePlayerContext";
import { synthesizeAudio, createAudioUrl } from "@/lib/audioSynthesizer";

export default function Favorites() {
  const { isAuthenticated } = useAuth({ redirectOnUnauthenticated: true });
  const { data: songs, isLoading } = trpc.favorites.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const shareMutation = trpc.songs.createShareLink.useMutation();
  const {
    loadQueue, currentSong, isPlaying, togglePlay, jumpTo, queue, queueName,
  } = useQueuePlayer();

  const [expandedSong, setExpandedSong] = useState<number | null>(null);
  const [synthesizing, setSynthesizing] = useState<number | null>(null);

  const isFavoritesQueue = queueName === "Favorites";

  const toQueueSongs = useCallback((list: any[]): QueueSong[] => {
    return list.map((s) => ({
      id: s.id,
      title: s.title,
      keywords: s.keywords,
      genre: s.genre,
      mood: s.mood,
      tempo: s.tempo,
      engine: s.engine,
      vocalType: s.vocalType,
      audioUrl: s.audioUrl,
      mp3Url: s.mp3Url ?? null,
      abcNotation: s.abcNotation,
    }));
  }, []);

  const handlePlayAll = useCallback(
    (startIndex = 0) => {
      if (!songs || songs.length === 0) return;
      loadQueue(toQueueSongs(songs), startIndex, "Favorites");
    },
    [songs, loadQueue, toQueueSongs]
  );

  const handlePlaySong = useCallback(
    (song: any) => {
      if (!songs) return;
      const idx = songs.findIndex((s: any) => s.id === song.id);
      if (isFavoritesQueue && currentSong?.id === song.id) {
        togglePlay();
      } else {
        handlePlayAll(idx >= 0 ? idx : 0);
      }
    },
    [songs, isFavoritesQueue, currentSong, togglePlay, handlePlayAll]
  );

  const handleDownload = useCallback(async (song: any) => {
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
    setSynthesizing(song.id);
    try {
      const result = await synthesizeAudio(song.abcNotation, song.tempo || 120);
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${song.title.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_")}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Download started!");
    } catch {
      toast.error("Failed to download");
    } finally {
      setSynthesizing(null);
    }
  }, []);

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

  const handleShare = useCallback(async (song: any) => {
    try {
      const result = await shareMutation.mutateAsync({ songId: song.id });
      const shareUrl = `${window.location.origin}/share/${result.shareToken}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied to clipboard!");
    } catch {
      toast.error("Failed to create share link");
    }
  }, [shareMutation]);

  if (!isAuthenticated) return null;

  const playableSongs = songs?.filter((s: any) => s.audioUrl || s.abcNotation) ?? [];

  return (
    <div className="container py-8 md:py-12 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Heart className="w-8 h-8 text-red-500 fill-red-500" />
            My Favorites
          </h1>
          <p className="text-muted-foreground">
            {songs?.length ?? 0} favorite song{(songs?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
        {playableSongs.length > 0 && (
          <Button
            onClick={() => handlePlayAll(0)}
            className="gap-2"
          >
            {isFavoritesQueue && isPlaying ? (
              <>
                <ListMusic className="w-4 h-4" />
                Now Playing
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Play All ({playableSongs.length})
              </>
            )}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !songs || songs.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No favorites yet</h3>
            <p className="text-muted-foreground mb-4">
              Click the heart icon on any song to add it to your favorites
            </p>
            <Button asChild>
              <a href="/history">Browse My Songs</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {songs.map((song: any, idx: number) => {
            const isCurrentlyPlaying = isFavoritesQueue && currentSong?.id === song.id;
            return (
              <Card
                key={song.id}
                className={`overflow-hidden transition-all ${
                  isCurrentlyPlaying
                    ? "ring-2 ring-primary/50 bg-primary/5"
                    : ""
                }`}
              >
                <CardContent className="p-0">
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      {/* Play indicator / track number */}
                      <button
                        onClick={() => handlePlaySong(song)}
                        disabled={!song.audioUrl && !song.abcNotation}
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${
                          isCurrentlyPlaying
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary"
                        } ${!song.audioUrl && !song.abcNotation ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        {isCurrentlyPlaying && isPlaying ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4 ml-0.5" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className={`font-semibold truncate ${isCurrentlyPlaying ? "text-primary" : "text-foreground"}`}>
                              {song.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-0.5 truncate">
                              {song.keywords}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <FavoriteButton songId={song.id} size="sm" />
                            <span className="text-xs text-muted-foreground">
                              {new Date(song.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {isCurrentlyPlaying && (
                            <Badge variant="default" className="text-xs bg-primary animate-pulse">
                              Now Playing
                            </Badge>
                          )}
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

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 mt-3">
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleShare(song)}
                          >
                            <Share2 className="w-3.5 h-3.5 mr-1.5" />
                            Share
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Sheet Music */}
                  {expandedSong === song.id && song.abcNotation && (
                    <div className="border-t border-border p-4 bg-muted/30">
                      <SheetMusic abcNotation={song.abcNotation} />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
