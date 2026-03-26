import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useQueuePlayer } from "@/contexts/QueuePlayerContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Globe, Play, Pause, Heart, Music, Clock, ChevronDown,
  Headphones, Sparkles, User, Loader2, FileAudio
} from "lucide-react";
import { Link } from "wouter";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function Discover() {
  usePageMeta({
    title: "Discover",
    description: "Explore AI-generated songs shared by the community. Listen, download, and get inspired by music created with Create Christian Music.",
    canonicalPath: "/discover",
  });
  const { user } = useAuth();
  const { currentSong, isPlaying, togglePlay, loadQueue } = useQueuePlayer();
  const [offset, setOffset] = useState(0);
  const limit = 24;

  const { data, isLoading } = trpc.community.discover.useQuery({ limit, offset });
  const favoriteIds = trpc.favorites.ids.useQuery(undefined, { enabled: !!user });
  const toggleFav = trpc.favorites.toggle.useMutation({
    onSuccess: () => {
      favoriteIds.refetch();
    },
  });

  const songs = data?.songs ?? [];
  const totalCount = data?.totalCount ?? 0;
  const hasMore = data?.hasMore ?? false;

  const handlePlayAll = () => {
    if (songs.length === 0) return;
    const queueSongs = songs
      .filter((s: any) => s.audioUrl || s.mp3Url)
      .map((s: any) => ({
        id: s.id,
        title: s.title,
        keywords: s.keywords || "",
        genre: s.genre,
        mood: s.mood,
        tempo: s.tempo,
        engine: s.engine,
        vocalType: s.vocalType,
        audioUrl: s.audioUrl,
        mp3Url: s.mp3Url,
      }));
    loadQueue(queueSongs, 0);
  };

  const handlePlaySong = (song: any, index: number) => {
    if (currentSong?.id === song.id) {
      togglePlay();
      return;
    }
    const queueSongs = songs
      .filter((s: any) => s.audioUrl || s.mp3Url)
      .map((s: any) => ({
        id: s.id,
        title: s.title,
        keywords: s.keywords || "",
        genre: s.genre,
        mood: s.mood,
        tempo: s.tempo,
        engine: s.engine,
        vocalType: s.vocalType,
        audioUrl: s.audioUrl,
        mp3Url: s.mp3Url,
      }));
    const queueIndex = queueSongs.findIndex((s: any) => s.id === song.id);
    loadQueue(queueSongs, queueIndex >= 0 ? queueIndex : 0);
  };

  const handleToggleFavorite = (songId: number) => {
    if (!user) {
      toast.info("Sign in to save favorites");
      return;
    }
    toggleFav.mutate({ songId });
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-purple-500/10 border-b">
        <div className="container py-12 md:py-16">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="flex items-center gap-2 text-primary">
              <Globe className="w-5 h-5" />
              <span className="text-sm font-semibold uppercase tracking-wider">Community</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground">
              Discover <span className="text-primary">New Music</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl">
              Explore songs shared by creators from around the world. Listen, get inspired, and share your own.
            </p>
            {songs.length > 0 && (
              <div className="flex items-center gap-4 mt-2">
                <Button onClick={handlePlayAll} size="lg" className="gap-2">
                  <Headphones className="w-4 h-4" />
                  Play All
                </Button>
                <span className="text-sm text-muted-foreground">
                  {totalCount} {totalCount === 1 ? "song" : "songs"} shared
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Song Grid */}
      <div className="container py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-0">
                  <Skeleton className="h-40 w-full" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : songs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Music className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">No songs shared yet</h2>
            <p className="text-muted-foreground max-w-md">
              Be the first to share your music with the community. Create a song and click the publish button to share it here.
            </p>
            <Link href="/generator">
              <Button className="gap-2 mt-2">
                <Sparkles className="w-4 h-4" />
                Create a Song
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {songs.map((song: any, index: number) => {
                const isCurrent = currentSong?.id === song.id;
                const isCurrentPlaying = isCurrent && isPlaying;
                const isFav = favoriteIds.data?.includes(song.id);

                return (
                  <Card
                    key={song.id}
                    className={`group overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5 ${
                      isCurrent ? "ring-2 ring-primary shadow-lg" : ""
                    }`}
                  >
                    <CardContent className="p-0">
                      {/* Album art / gradient header */}
                      <div className="relative h-36 bg-gradient-to-br from-primary/20 via-purple-500/20 to-pink-500/20 flex items-center justify-center">
                        <Music className="w-12 h-12 text-primary/30" />
                        {/* Play overlay */}
                        <button
                          onClick={() => handlePlaySong(song, index)}
                          className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all"
                        >
                          <div className={`w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg transition-all ${
                            isCurrent ? "scale-100 opacity-100" : "scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100"
                          }`}>
                            {isCurrentPlaying ? (
                              <Pause className="w-5 h-5" />
                            ) : (
                              <Play className="w-5 h-5 ml-0.5" />
                            )}
                          </div>
                        </button>
                        {/* Badges */}
                        <div className="absolute top-2 left-2 flex gap-1">
                          {song.engine === "mp3-transcription" && (
                            <Badge variant="default" className="text-xs bg-teal-600/90 text-white border-0 backdrop-blur-sm gap-1">
                              <FileAudio className="w-3 h-3" />
                              Transcribed
                            </Badge>
                          )}
                          {song.genre && (
                            <Badge variant="secondary" className="text-xs bg-black/40 text-white border-0 backdrop-blur-sm">
                              {song.genre}
                            </Badge>
                          )}
                        </div>
                        {/* Duration */}
                        <div className="absolute bottom-2 right-2">
                          <Badge variant="secondary" className="text-xs bg-black/40 text-white border-0 backdrop-blur-sm gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(song.duration)}
                          </Badge>
                        </div>
                      </div>

                      {/* Song info */}
                      <div className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <Link href={`/songs/${song.id}`}>
                              <h3 className="font-semibold text-foreground truncate hover:text-primary transition-colors cursor-pointer">
                                {song.title}
                              </h3>
                            </Link>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                              <User className="w-3 h-3" />
                              <span className="truncate">{song.creatorName}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleToggleFavorite(song.id)}
                            disabled={toggleFav.isPending}
                            className="shrink-0 p-1.5 rounded-full hover:bg-muted transition-colors"
                          >
                            <Heart
                              className={`w-4 h-4 transition-colors ${
                                isFav ? "fill-red-500 text-red-500" : "text-muted-foreground hover:text-red-500"
                              }`}
                            />
                          </button>
                        </div>

                        {song.mood && (
                          <Badge variant="outline" className="text-xs">
                            {song.mood}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center mt-8">
                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2"
                  onClick={() => setOffset(prev => prev + limit)}
                >
                  <ChevronDown className="w-4 h-4" />
                  Load More Songs
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
