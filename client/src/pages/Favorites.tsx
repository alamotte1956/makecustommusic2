import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AudioPlayer from "@/components/AudioPlayer";
import SheetMusic from "@/components/SheetMusic";
import FavoriteButton from "@/components/FavoriteButton";
import { useState, useCallback } from "react";
import { synthesizeAudio, createAudioUrl } from "@/lib/audioSynthesizer";
import { toast } from "sonner";
import {
  Heart, Music, Download, Printer, Loader2,
  ChevronDown, ChevronUp, Play, Share2
} from "lucide-react";
import { getLoginUrl } from "@/const";

export default function Favorites() {
  const { isAuthenticated } = useAuth({ redirectOnUnauthenticated: true });
  const { data: songs, isLoading } = trpc.favorites.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const shareMutation = trpc.songs.createShareLink.useMutation();

  const [expandedSong, setExpandedSong] = useState<number | null>(null);
  const [playingSong, setPlayingSong] = useState<number | null>(null);
  const [audioUrls, setAudioUrls] = useState<Record<number, string>>({});
  const [synthesizing, setSynthesizing] = useState<number | null>(null);

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
    a.download = `${song.title.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_")}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Download started!");
  }, [audioUrls]);

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

  return (
    <div className="container py-8 md:py-12 max-w-4xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Heart className="w-8 h-8 text-red-500 fill-red-500" />
          My Favorites
        </h1>
        <p className="text-muted-foreground">
          {songs?.length ?? 0} favorite song{(songs?.length ?? 0) !== 1 ? "s" : ""}
        </p>
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
        <div className="space-y-4">
          {songs.map((song: any) => (
            <Card key={song.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground truncate">{song.title}</h3>
                          <p className="text-sm text-muted-foreground mt-0.5 truncate">
                            Keywords: {song.keywords}
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
          ))}
        </div>
      )}
    </div>
  );
}
