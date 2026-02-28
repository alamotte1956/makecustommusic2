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
import {
  History as HistoryIcon, Music, Download, Printer, Trash2,
  Loader2, ChevronDown, ChevronUp, Disc3, Play
} from "lucide-react";
import { getLoginUrl } from "@/const";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function History() {
  const { isAuthenticated } = useAuth({ redirectOnUnauthenticated: true });
  const { data: songs, isLoading } = trpc.songs.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: albums } = trpc.albums.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const deleteMutation = trpc.songs.delete.useMutation();
  const addToAlbumMutation = trpc.albums.addSong.useMutation();
  const createAlbumMutation = trpc.albums.create.useMutation();
  const utils = trpc.useUtils();

  const [expandedSong, setExpandedSong] = useState<number | null>(null);
  const [playingSong, setPlayingSong] = useState<number | null>(null);
  const [audioUrls, setAudioUrls] = useState<Record<number, string>>({});
  const [synthesizing, setSynthesizing] = useState<number | null>(null);
  const [albumDialogSongId, setAlbumDialogSongId] = useState<number | null>(null);
  const [newAlbumTitle, setNewAlbumTitle] = useState("");
  const [newAlbumDesc, setNewAlbumDesc] = useState("");
  const [selectedSongs, setSelectedSongs] = useState<Set<number>>(new Set());
  const [showBulkAlbumDialog, setShowBulkAlbumDialog] = useState(false);

  const handlePlay = useCallback(async (song: any) => {
    if (audioUrls[song.id]) {
      setPlayingSong(song.id);
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

  const handleDelete = useCallback(async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      utils.songs.list.invalidate();
      toast.success("Song deleted");
    } catch {
      toast.error("Failed to delete song");
    }
  }, [deleteMutation, utils]);

  const handlePrint = useCallback((song: any) => {
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

  const handleAddToAlbum = useCallback(async (albumId: number, songId: number) => {
    try {
      await addToAlbumMutation.mutateAsync({ albumId, songId });
      utils.albums.list.invalidate();
      utils.albums.getById.invalidate({ id: albumId });
      setAlbumDialogSongId(null);
      toast.success("Song added to album!");
    } catch {
      toast.error("Failed to add song to album");
    }
  }, [addToAlbumMutation, utils]);

  const handleCreateAlbumWithSongs = useCallback(async () => {
    if (!newAlbumTitle.trim()) {
      toast.error("Please enter an album title");
      return;
    }
    const songIds = showBulkAlbumDialog ? Array.from(selectedSongs) : albumDialogSongId ? [albumDialogSongId] : [];
    try {
      await createAlbumMutation.mutateAsync({
        title: newAlbumTitle.trim(),
        description: newAlbumDesc.trim() || undefined,
        songIds,
      });
      utils.albums.list.invalidate();
      setAlbumDialogSongId(null);
      setShowBulkAlbumDialog(false);
      setNewAlbumTitle("");
      setNewAlbumDesc("");
      setSelectedSongs(new Set());
      toast.success("Album created!");
    } catch {
      toast.error("Failed to create album");
    }
  }, [newAlbumTitle, newAlbumDesc, albumDialogSongId, selectedSongs, showBulkAlbumDialog, createAlbumMutation, utils]);

  const toggleSongSelection = useCallback((id: number) => {
    setSelectedSongs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  if (!isAuthenticated) return null;

  return (
    <div className="container py-8 md:py-12 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <HistoryIcon className="w-8 h-8 text-primary" />
            My Songs
          </h1>
          <p className="text-muted-foreground">
            {songs?.length ?? 0} song{(songs?.length ?? 0) !== 1 ? "s" : ""} generated
          </p>
        </div>
        {selectedSongs.size > 0 && (
          <Button onClick={() => setShowBulkAlbumDialog(true)}>
            <Disc3 className="w-4 h-4 mr-2" />
            Create Album ({selectedSongs.size} songs)
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
            <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No songs yet</h3>
            <p className="text-muted-foreground mb-4">
              Start creating music to see your history here
            </p>
            <Button asChild>
              <a href="/generate">Create Your First Song</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {songs.map((song) => (
            <Card key={song.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    {/* Selection checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedSongs.has(song.id)}
                      onChange={() => toggleSongSelection(song.id)}
                      className="mt-1.5 h-4 w-4 rounded border-border accent-primary"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground truncate">{song.title}</h3>
                          <p className="text-sm text-muted-foreground mt-0.5 truncate">
                            Keywords: {song.keywords}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(song.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Badges */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {song.genre && <Badge variant="secondary" className="text-xs">{song.genre}</Badge>}
                        {song.mood && <Badge variant="secondary" className="text-xs">{song.mood}</Badge>}
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
                          disabled={synthesizing === song.id}
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
                          disabled={synthesizing === song.id}
                        >
                          <Download className="w-3.5 h-3.5 mr-1.5" />
                          MP3
                        </Button>
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAlbumDialogSongId(song.id)}
                        >
                          <Disc3 className="w-3.5 h-3.5 mr-1.5" />
                          Add to Album
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Song</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{song.title}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(song.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Sheet Music */}
                {expandedSong === song.id && (
                  <div className="border-t border-border p-4 bg-muted/30">
                    <SheetMusic abcNotation={song.abcNotation} />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add to Album Dialog */}
      <Dialog open={albumDialogSongId !== null} onOpenChange={(open) => !open && setAlbumDialogSongId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Album</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {albums && albums.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Existing Albums</p>
                {albums.map((album) => (
                  <button
                    key={album.id}
                    onClick={() => albumDialogSongId && handleAddToAlbum(album.id, albumDialogSongId)}
                    className="w-full text-left p-3 rounded-lg border border-border hover:bg-accent transition-colors"
                  >
                    <span className="font-medium">{album.title}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      ({album.songCount} songs)
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-sm font-medium">Create New Album</p>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={newAlbumTitle}
                  onChange={(e) => setNewAlbumTitle(e.target.value)}
                  placeholder="Album title"
                />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea
                  value={newAlbumDesc}
                  onChange={(e) => setNewAlbumDesc(e.target.value)}
                  placeholder="Album description"
                  rows={2}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAlbumDialogSongId(null)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAlbumWithSongs} disabled={!newAlbumTitle.trim()}>
              Create Album
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Album Dialog */}
      <Dialog open={showBulkAlbumDialog} onOpenChange={setShowBulkAlbumDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Album with {selectedSongs.size} Songs</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Album Title</Label>
              <Input
                value={newAlbumTitle}
                onChange={(e) => setNewAlbumTitle(e.target.value)}
                placeholder="Album title"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={newAlbumDesc}
                onChange={(e) => setNewAlbumDesc(e.target.value)}
                placeholder="Album description"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkAlbumDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAlbumWithSongs} disabled={!newAlbumTitle.trim()}>
              Create Album
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
