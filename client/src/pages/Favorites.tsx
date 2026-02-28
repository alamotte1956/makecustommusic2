import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import FavoriteButton from "@/components/FavoriteButton";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Heart, Download, Loader2,
  ChevronDown, ChevronUp, Play, Share2, ListMusic, Pause
} from "lucide-react";
import { useQueuePlayer, type QueueSong } from "@/contexts/QueuePlayerContext";

export default function Favorites() {
  const { isAuthenticated } = useAuth({ redirectOnUnauthenticated: true });
  const { data: songs, isLoading } = trpc.favorites.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const shareMutation = trpc.songs.createShareLink.useMutation();
  const {
    loadQueue, currentSong, isPlaying, togglePlay, queueName,
  } = useQueuePlayer();

  const [expandedLyrics, setExpandedLyrics] = useState<number | null>(null);

  const isFavoritesQueue = queueName === "Favorites";

  const toQueueSongs = useCallback((list: any[]): QueueSong[] => {
    return list
      .filter((s) => s.audioUrl || s.mp3Url)
      .map((s) => ({
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
      }));
  }, []);

  const handlePlayAll = useCallback(
    (startIndex = 0) => {
      if (!songs || songs.length === 0) return;
      const playable = toQueueSongs(songs);
      if (playable.length === 0) {
        toast.error("No playable songs in favorites");
        return;
      }
      loadQueue(playable, startIndex, "Favorites");
    },
    [songs, loadQueue, toQueueSongs]
  );

  const handlePlaySong = useCallback(
    (song: any) => {
      if (!songs) return;
      const playable = songs.filter((s: any) => s.audioUrl || s.mp3Url);
      const idx = playable.findIndex((s: any) => s.id === song.id);
      if (isFavoritesQueue && currentSong?.id === song.id) {
        togglePlay();
      } else {
        handlePlayAll(idx >= 0 ? idx : 0);
      }
    },
    [songs, isFavoritesQueue, currentSong, togglePlay, handlePlayAll]
  );

  const handleDownload = useCallback((song: any) => {
    const url = song.audioUrl || song.mp3Url;
    if (!url) {
      toast.error("No audio available for download");
      return;
    }
    const filename = `${song.title.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_")}.mp3`;
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Download started!");
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

  const playableSongs = songs?.filter((s: any) => s.audioUrl || s.mp3Url) ?? [];

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
          {songs.map((song: any) => {
            const audioUrl = song.audioUrl || song.mp3Url;
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
                      {/* Play indicator */}
                      <button
                        onClick={() => handlePlaySong(song)}
                        disabled={!audioUrl}
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${
                          isCurrentlyPlaying
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary"
                        } ${!audioUrl ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
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
                          <Badge variant="default" className="text-xs bg-gradient-to-r from-purple-600 to-indigo-600">
                            Suno V5
                          </Badge>
                          {song.genre && <Badge variant="secondary" className="text-xs">{song.genre}</Badge>}
                          {song.mood && <Badge variant="secondary" className="text-xs">{song.mood}</Badge>}
                          {song.vocalType && song.vocalType !== "none" && (
                            <Badge variant="outline" className="text-xs capitalize">{song.vocalType} Vocals</Badge>
                          )}
                          {song.tempo && <Badge variant="outline" className="text-xs">{song.tempo} BPM</Badge>}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {audioUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(song)}
                            >
                              <Download className="w-3.5 h-3.5 mr-1.5" />
                              MP3
                            </Button>
                          )}
                          {song.lyrics && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setExpandedLyrics(expandedLyrics === song.id ? null : song.id)}
                            >
                              {expandedLyrics === song.id ? (
                                <ChevronUp className="w-3.5 h-3.5 mr-1.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 mr-1.5" />
                              )}
                              Lyrics
                            </Button>
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

                  {/* Expanded Lyrics */}
                  {expandedLyrics === song.id && song.lyrics && (
                    <div className="border-t border-border p-4 bg-muted/30">
                      <pre className="whitespace-pre-wrap text-sm text-foreground font-sans leading-relaxed">
                        {song.lyrics}
                      </pre>
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
