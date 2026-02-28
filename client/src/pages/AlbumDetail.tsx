import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useRoute, Link } from "wouter";
import {
  Disc3, Music, Download, Loader2,
  ArrowLeft, Play, Pause, X, ChevronDown, ChevronUp, ImagePlus, Sparkles, ListMusic, Pencil
} from "lucide-react";
import FavoriteButton from "@/components/FavoriteButton";
import EditSongDialog from "@/components/EditSongDialog";
import { useQueuePlayer, type QueueSong } from "@/contexts/QueuePlayerContext";

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

  const {
    loadQueue, currentSong, isPlaying, togglePlay, queueName,
  } = useQueuePlayer();

  const [expandedLyrics, setExpandedLyrics] = useState<number | null>(null);
  const [generatingCover, setGeneratingCover] = useState(false);
  const [editingSong, setEditingSong] = useState<any>(null);

  const albumQueueName = album ? `Album: ${album.title}` : "";
  const isAlbumQueue = queueName === albumQueueName && albumQueueName !== "";

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
      if (!album?.songs || album.songs.length === 0) return;
      const playable = toQueueSongs(album.songs);
      if (playable.length === 0) {
        toast.error("No playable songs in this album");
        return;
      }
      loadQueue(playable, startIndex, albumQueueName);
    },
    [album, loadQueue, toQueueSongs, albumQueueName]
  );

  const handlePlaySong = useCallback(
    (song: any) => {
      if (!album?.songs) return;
      const playable = album.songs.filter((s: any) => s.audioUrl || s.mp3Url);
      const idx = playable.findIndex((s: any) => s.id === song.id);
      if (isAlbumQueue && currentSong?.id === song.id) {
        togglePlay();
      } else {
        handlePlayAll(idx >= 0 ? idx : 0);
      }
    },
    [album, isAlbumQueue, currentSong, togglePlay, handlePlayAll]
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

  const playableSongs = album.songs?.filter((s: any) => s.audioUrl || s.mp3Url) ?? [];

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
          <div className="flex flex-wrap gap-2 mt-2">
            {playableSongs.length > 0 && (
              <Button
                onClick={() => handlePlayAll(0)}
                size="sm"
                className="gap-2"
              >
                {isAlbumQueue && isPlaying ? (
                  <>
                    <ListMusic className="w-3.5 h-3.5" />
                    Now Playing
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    Play All
                  </>
                )}
              </Button>
            )}
            {!album.coverImageUrl && (album.songs?.length ?? 0) > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateCover}
                disabled={generatingCover}
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
          {album.songs.map((song: any, index: number) => {
            const audioUrl = song.audioUrl || song.mp3Url;
            const isCurrentlyPlaying = isAlbumQueue && currentSong?.id === song.id;
            return (
              <Card
                key={song.id}
                className={`overflow-hidden transition-all ${
                  isCurrentlyPlaying ? "ring-2 ring-primary/50 bg-primary/5" : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Play button / track number */}
                    <button
                      onClick={() => handlePlaySong(song)}
                      disabled={!audioUrl}
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                        isCurrentlyPlaying
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary"
                      } ${!audioUrl ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      {isCurrentlyPlaying && isPlaying ? (
                        <Pause className="w-3.5 h-3.5" />
                      ) : (
                        <Play className="w-3.5 h-3.5 ml-0.5" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className={`font-semibold truncate ${isCurrentlyPlaying ? "text-primary" : "text-foreground"}`}>
                            {song.title}
                          </h3>
                          <div className="flex flex-wrap gap-1.5 mt-1">
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
                        </div>
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
                          onClick={() => setEditingSong(song)}
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1.5" />
                          Edit
                        </Button>
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

                  {/* Expanded Lyrics */}
                  {expandedLyrics === song.id && song.lyrics && (
                    <div className="mt-4 pt-4 border-t border-border">
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

      {/* Edit Song Dialog */}
      {editingSong && (
        <EditSongDialog
          open={!!editingSong}
          onOpenChange={(open) => !open && setEditingSong(null)}
          song={editingSong}
          onSaved={() => {
            utils.albums.getById.invalidate({ id: albumId });
            utils.songs.list.invalidate();
            setEditingSong(null);
          }}
        />
      )}
    </div>
  );
}
