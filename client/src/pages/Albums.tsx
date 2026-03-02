import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import {
  Disc3, Plus, Loader2, Music, Trash2, ArrowRight, ImagePlus
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { usePageMeta } from "@/hooks/usePageMeta";

const COVER_COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4",
  "#3b82f6", "#1d4ed8",
];

export default function Albums() {
  usePageMeta({
    title: "My Albums",
    description: "Create and manage your music album collections. Organize AI-generated songs into albums with custom covers.",
    canonicalPath: "/albums",
  });
  const { isAuthenticated } = useAuth({ redirectOnUnauthenticated: true });
  const { data: albums, isLoading } = trpc.albums.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const createMutation = trpc.albums.create.useMutation();
  const deleteMutation = trpc.albums.delete.useMutation();
  const generateCoverMutation = trpc.albums.generateCover.useMutation();
  const utils = trpc.useUtils();

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverColor, setCoverColor] = useState(COVER_COLORS[0]);
  const [generatingCoverId, setGeneratingCoverId] = useState<number | null>(null);

  const handleCreate = useCallback(async () => {
    if (!title.trim()) {
      toast.error("Please enter an album title");
      return;
    }
    try {
      await createMutation.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        coverColor,
      });
      utils.albums.list.invalidate();
      setShowCreate(false);
      setTitle("");
      setDescription("");
      toast.success("Album created!");
    } catch {
      toast.error("Failed to create album");
    }
  }, [title, description, coverColor, createMutation, utils]);

  const handleDelete = useCallback(async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      utils.albums.list.invalidate();
      toast.success("Album deleted");
    } catch {
      toast.error("Failed to delete album");
    }
  }, [deleteMutation, utils]);

  const handleGenerateCover = useCallback(async (albumId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setGeneratingCoverId(albumId);
    try {
      await generateCoverMutation.mutateAsync({ albumId });
      utils.albums.list.invalidate();
      toast.success("Album cover generated!");
    } catch {
      toast.error("Failed to generate cover. Try adding songs to the album first.");
    } finally {
      setGeneratingCoverId(null);
    }
  }, [generateCoverMutation, utils]);

  if (!isAuthenticated) return null;

  return (
    <div className="container py-8 md:py-12 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Disc3 className="w-8 h-8 text-primary" />
            Albums
          </h1>
          <p className="text-muted-foreground">
            Organize your songs into collections
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Album
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !albums || albums.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Disc3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No albums yet</h3>
            <p className="text-muted-foreground mb-4">
              Create an album to organize your songs into collections
            </p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Album
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {albums.map((album) => (
            <Card key={album.id} className="overflow-hidden group hover:shadow-lg transition-shadow">
              {/* Album Cover */}
              <div
                className="h-40 flex items-center justify-center relative overflow-hidden"
                style={{ backgroundColor: album.coverColor || "#6366f1" }}
              >
                {album.coverImageUrl ? (
                  <img
                    src={album.coverImageUrl}
                    alt={`${album.title} cover`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Disc3 className="w-16 h-16 text-white/30" />
                )}
                {/* Generate Cover Button Overlay */}
                <button
                  onClick={(e) => handleGenerateCover(album.id, e)}
                  disabled={generatingCoverId === album.id}
                  className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                  title={album.coverImageUrl ? "Regenerate cover art" : "Generate cover art"}
                >
                  {generatingCoverId === album.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ImagePlus className="w-4 h-4" />
                  )}
                </button>
              </div>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground truncate">{album.title}</h3>
                    {album.description && (
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {album.description}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                      <Music className="w-3.5 h-3.5" />
                      {album.songCount} song{album.songCount !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Album</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{album.title}"? Songs will not be deleted.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(album.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <Link href={`/albums/${album.id}`}>
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    View Album
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Album Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Album</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Album title"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Album description"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Cover Color</Label>
              <div className="flex flex-wrap gap-2">
                {COVER_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setCoverColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${
                      coverColor === color ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!title.trim() || createMutation.isPending}>
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Create Album
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
