import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { downloadFile, sanitizeFilename } from "@/lib/safariDownload";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AudioPlayer from "@/components/AudioPlayer";
import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  History as HistoryIcon, Music, Download, Trash2,
  Loader2, ChevronDown, ChevronUp, Disc3, Play, Pause, Pencil, ListMusic, FileText, Globe, Lock, FileAudio, Check, X
} from "lucide-react";
import { Link } from "wouter";
import FavoriteButton from "@/components/FavoriteButton";
import EditSongDialog from "@/components/EditSongDialog";
import SongFiltersBar, { filterSongs, type SongFilters } from "@/components/SongFilters";
import { useQueuePlayer, type QueueSong } from "@/contexts/QueuePlayerContext";
import { getLoginUrl } from "@/const";
import { DeleteSongDialog } from "@/components/DeleteSongDialog";
import GenerateCoverButton from "@/components/GenerateCoverButton";
import SongCoverImage from "@/components/SongCoverImage";
import { usePageMeta } from "@/hooks/usePageMeta";
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
  usePageMeta({
    title: "My Songs",
    description: "Browse and manage your AI-generated song collection. Play, download, edit, and organize your music.",
    canonicalPath: "/history",
  });
  const { isAuthenticated } = useAuth({ redirectOnUnauthenticated: true });
  const { data: songs, isLoading } = trpc.songs.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: albums } = trpc.albums.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const addToAlbumMutation = trpc.albums.addSong.useMutation();
  const createAlbumMutation = trpc.albums.create.useMutation();
  const utils = trpc.useUtils();

  const {
    loadQueue, currentSong, isPlaying, togglePlay, queueName,
  } = useQueuePlayer();

  const [playingSong, setPlayingSong] = useState<number | null>(null);
  const [albumDialogSongId, setAlbumDialogSongId] = useState<number | null>(null);
  const [newAlbumTitle, setNewAlbumTitle] = useState("");
  const [newAlbumDesc, setNewAlbumDesc] = useState("");
  const [selectedSongs, setSelectedSongs] = useState<Set<number>>(new Set());
  const [showBulkAlbumDialog, setShowBulkAlbumDialog] = useState(false);
  const [expandedLyrics, setExpandedLyrics] = useState<number | null>(null);
  const [filters, setFilters] = useState<SongFilters>({ search: "", genre: "__all__", mood: "__all__" });
  const [editingSong, setEditingSong] = useState<any>(null);
  const [deletingSong, setDeletingSong] = useState<{ id: number; title: string } | null>(null);
  const [renamingSongId, setRenamingSongId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  const renameMutation = trpc.songs.update.useMutation({
    onSuccess: () => {
      utils.songs.list.invalidate();
      setRenamingSongId(null);
      setRenameValue("");
      toast.success("Song renamed!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to rename"),
  });

  const startRename = useCallback((song: any) => {
    setRenamingSongId(song.id);
    setRenameValue(song.title);
  }, []);

  const confirmRename = useCallback(() => {
    const trimmed = renameValue.trim();
    if (!trimmed) { toast.error("Title cannot be empty"); return; }
    if (renamingSongId === null) return;
    const currentSong = songs?.find((s) => s.id === renamingSongId);
    if (trimmed === currentSong?.title) { setRenamingSongId(null); return; }
    renameMutation.mutate({ id: renamingSongId, title: trimmed });
  }, [renameValue, renamingSongId, songs, renameMutation]);

  const cancelRename = useCallback(() => {
    setRenamingSongId(null);
    setRenameValue("");
  }, []);

  useEffect(() => {
    if (renamingSongId !== null && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingSongId]);

  const filteredSongs = filterSongs(songs, filters);

  const publishMutation = trpc.community.publish.useMutation({
    onSuccess: () => { utils.songs.list.invalidate(); toast.success("Song published to community!"); },
    onError: () => toast.error("Failed to publish song"),
  });
  const unpublishMutation = trpc.community.unpublish.useMutation({
    onSuccess: () => { utils.songs.list.invalidate(); toast.success("Song set to private"); },
    onError: () => toast.error("Failed to unpublish song"),
  });

  function PublishToggle({ songId, visibility }: { songId: number; visibility?: string | null }) {
    const isPublic = visibility === "public";
    const isPending = publishMutation.isPending || unpublishMutation.isPending;
    return (
      <Button
        variant={isPublic ? "default" : "outline"}
        size="sm"
        disabled={isPending}
        onClick={() => isPublic ? unpublishMutation.mutate({ songId }) : publishMutation.mutate({ songId })}
        title={isPublic ? "Make private" : "Share with community"}
      >
        {isPublic ? <Globe className="w-3.5 h-3.5 mr-1.5" /> : <Lock className="w-3.5 h-3.5 mr-1.5" />}
        {isPublic ? "Public" : "Private"}
      </Button>
    );
  }

  const historyQueueName = "My Songs";
  const isHistoryQueue = queueName === historyQueueName;

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

  const playableSongs = useMemo(() => {
    return filteredSongs.filter((s) => s.audioUrl || s.mp3Url);
  }, [filteredSongs]);

  const handlePlayAll = useCallback(
    (startIndex = 0) => {
      if (playableSongs.length === 0) {
        toast.error("No playable songs");
        return;
      }
      loadQueue(toQueueSongs(playableSongs), startIndex, historyQueueName);
    },
    [playableSongs, loadQueue, toQueueSongs, historyQueueName]
  );

  const handlePlaySong = useCallback(
    (song: any) => {
      const idx = playableSongs.findIndex((s) => s.id === song.id);
      if (isHistoryQueue && currentSong?.id === song.id) {
        togglePlay();
      } else {
        handlePlayAll(idx >= 0 ? idx : 0);
      }
    },
    [playableSongs, isHistoryQueue, currentSong, togglePlay, handlePlayAll]
  );

  const getAudioUrl = (song: any): string | null => {
    return song.audioUrl || song.mp3Url || null;
  };

  const handlePlay = useCallback((song: any) => {
    const url = getAudioUrl(song);
    if (url) {
      setPlayingSong(song.id);
    } else {
      toast.error("No audio available for this song");
    }
  }, []);

  const handleDownload = useCallback(async (song: any) => {
    const url = getAudioUrl(song);
    if (!url) {
      toast.error("No audio available for download");
      return;
    }
    toast.info("Preparing download...");
    await downloadFile(url, sanitizeFilename(song.title));
    toast.success("Download started!");
  }, []);

  const handleAddToAlbum = useCallback(async (albumId: number, songId: number) => {
    try {
      await addToAlbumMutation.mutateAsync({ albumId, songId });
      utils.albums.list.invalidate();
      utils.albums.getById.invalidate({ id: albumId });
      setAlbumDialogSongId(null);
      toast.success("Song added to album!");
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("already in")) {
        toast.error("This song is already in that album");
      } else {
        toast.error("Failed to add song to album");
      }
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
            {songs && filteredSongs.length !== songs.length && ` · ${filteredSongs.length} shown`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {playableSongs.length > 0 && (
            <Button
              onClick={() => handlePlayAll(0)}
              size="sm"
              className="gap-2"
            >
              {isHistoryQueue && isPlaying ? (
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
          {selectedSongs.size > 0 && (
            <Button onClick={() => setShowBulkAlbumDialog(true)} size="sm" variant="outline">
              <Disc3 className="w-4 h-4 mr-2" />
              Create Album ({selectedSongs.size} songs)
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      {songs && songs.length > 0 && (
        <SongFiltersBar filters={filters} onFiltersChange={setFilters} songs={songs} />
      )}

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
        filteredSongs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No songs match your filters</p>
            <Button variant="link" onClick={() => setFilters({ search: "", genre: "__all__", mood: "__all__" })}>
              Clear filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSongs.map((song) => {
            const audioUrl = getAudioUrl(song);
            return (
              <Card
                key={song.id}
                className={`overflow-hidden transition-all ${
                  isHistoryQueue && currentSong?.id === song.id
                    ? "ring-2 ring-primary/50 bg-primary/5"
                    : ""
                }`}
              >
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

                      {/* Song cover image */}
                      <SongCoverImage imageUrl={song.imageUrl} title={song.title} size="sm" />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            {renamingSongId === song.id ? (
                              <div className="flex items-center gap-1.5">
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
                                  className="flex-1 min-w-0 bg-muted/50 border border-border rounded px-1.5 py-0.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                                <button
                                  onClick={confirmRename}
                                  disabled={renameMutation.isPending}
                                  className="p-0.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-colors"
                                  title="Save"
                                >
                                  {renameMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  onClick={cancelRename}
                                  disabled={renameMutation.isPending}
                                  className="p-0.5 text-muted-foreground hover:bg-muted rounded transition-colors"
                                  title="Cancel"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <h3
                                className="font-semibold text-foreground truncate group/title cursor-pointer hover:text-primary transition-colors"
                                onClick={() => startRename(song)}
                                title="Click to rename"
                              >
                                {song.title}
                                <Pencil className="w-3 h-3 inline-block ml-1.5 opacity-0 group-hover/title:opacity-60 transition-opacity" />
                              </h3>
                            )}
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
                          {song.engine === "mp3-transcription" && (
                            <Badge variant="default" className="text-xs bg-teal-600 hover:bg-teal-700 gap-1">
                              <FileAudio className="w-3 h-3" />
                              Transcribed
                            </Badge>
                          )}
                           {song.genre && <Badge variant="secondary" className="text-xs">{song.genre}</Badge>}
                           {song.mood && <Badge variant="secondary" className="text-xs">{song.mood}</Badge>}
                          {song.tempo && <Badge variant="outline" className="text-xs">{song.tempo} BPM</Badge>}
                          {song.duration && <Badge variant="outline" className="text-xs">{Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, "0")}</Badge>}
                        </div>

                        {/* Player */}
                        {playingSong === song.id && audioUrl && (
                          <div className="mt-3">
                            <AudioPlayer src={audioUrl} title={song.title} />
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {audioUrl && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePlaySong(song)}
                              >
                                {isHistoryQueue && currentSong?.id === song.id && isPlaying ? (
                                  <Pause className="w-3.5 h-3.5 mr-1.5" />
                                ) : (
                                  <Play className="w-3.5 h-3.5 mr-1.5" />
                                )}
                                {isHistoryQueue && currentSong?.id === song.id ? (isPlaying ? "Pause" : "Resume") : "Play"}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownload(song)}
                              >
                                <Download className="w-3.5 h-3.5 mr-1.5" />
                                MP3
                              </Button>
                            </>
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
                            onClick={() => setAlbumDialogSongId(song.id)}
                          >
                            <Disc3 className="w-3.5 h-3.5 mr-1.5" />
                            Add to Album
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingSong(song)}
                          >
                            <Pencil className="w-3.5 h-3.5 mr-1.5" />
                            Edit
                          </Button>
                          <Link href={`/songs/${song.id}`}>
                            <Button variant="outline" size="sm">
                              <FileText className="w-3.5 h-3.5 mr-1.5" />
                              Details
                            </Button>
                          </Link>
                          <FavoriteButton songId={song.id} size="sm" />
                          <GenerateCoverButton songId={song.id} hasImage={!!song.imageUrl} size="sm" />
                          <PublishToggle songId={song.id} visibility={song.visibility} />

                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeletingSong({ id: song.id, title: song.title })}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      ))}

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

      {/* Delete Song Dialog */}
      {deletingSong && (
        <DeleteSongDialog
          songId={deletingSong.id}
          songTitle={deletingSong.title}
          open={!!deletingSong}
          onOpenChange={(open) => !open && setDeletingSong(null)}
          onDeleted={() => {
            toast.success("Song deleted");
            setDeletingSong(null);
          }}
        />
      )}

      {/* Edit Song Dialog */}
      {editingSong && (
        <EditSongDialog
          open={!!editingSong}
          onOpenChange={(open) => !open && setEditingSong(null)}
          song={editingSong}
          onSaved={() => {
            utils.songs.list.invalidate();
            setEditingSong(null);
          }}
        />
      )}

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
