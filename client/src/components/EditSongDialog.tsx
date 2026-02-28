import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface EditSongDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  song: {
    id: number;
    title: string;
    lyrics?: string | null;
    genre?: string | null;
    mood?: string | null;
    styleTags?: string | null;
  };
  onSaved?: () => void;
}

export default function EditSongDialog({ open, onOpenChange, song, onSaved }: EditSongDialogProps) {
  const [title, setTitle] = useState(song.title);
  const [lyrics, setLyrics] = useState(song.lyrics || "");
  const [genre, setGenre] = useState(song.genre || "");
  const [mood, setMood] = useState(song.mood || "");
  const [styleTags, setStyleTags] = useState(song.styleTags || "");

  const updateMutation = trpc.songs.update.useMutation();

  // Reset form when song changes or dialog opens
  useEffect(() => {
    if (open) {
      setTitle(song.title);
      setLyrics(song.lyrics || "");
      setGenre(song.genre || "");
      setMood(song.mood || "");
      setStyleTags(song.styleTags || "");
    }
  }, [open, song]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: song.id,
        title: title.trim(),
        lyrics: lyrics.trim() || null,
        genre: genre.trim() || null,
        mood: mood.trim() || null,
        styleTags: styleTags.trim() || null,
      });
      toast.success("Song updated successfully");
      onOpenChange(false);
      onSaved?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to update song");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Song</DialogTitle>
          <DialogDescription>
            Update the title, lyrics, genre, mood, or style tags for this song.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={255}
              placeholder="Song title"
              disabled={updateMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-genre">Genre</Label>
            <Input
              id="edit-genre"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              maxLength={100}
              placeholder="e.g., Pop, Jazz, Rock"
              disabled={updateMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-mood">Mood</Label>
            <Input
              id="edit-mood"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              maxLength={100}
              placeholder="e.g., Happy, Melancholic, Energetic"
              disabled={updateMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-style-tags">Style Tags</Label>
            <Input
              id="edit-style-tags"
              value={styleTags}
              onChange={(e) => setStyleTags(e.target.value)}
              maxLength={500}
              placeholder="e.g., synthwave, dreamy, slow tempo"
              disabled={updateMutation.isPending}
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated style descriptors.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-lyrics">Lyrics</Label>
            <Textarea
              id="edit-lyrics"
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              maxLength={5000}
              rows={8}
              placeholder="Song lyrics..."
              disabled={updateMutation.isPending}
              className="resize-none text-sm font-mono"
            />
            <p className="text-xs text-muted-foreground text-right">
              {lyrics.length}/5000
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending || !title.trim()}
            className="gap-1.5"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
