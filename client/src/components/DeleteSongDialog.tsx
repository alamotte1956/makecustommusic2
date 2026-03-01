import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2 } from "lucide-react";

interface DeleteSongDialogProps {
  songId: number;
  songTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function DeleteSongDialog({
  songId,
  songTitle,
  open,
  onOpenChange,
  onDeleted,
}: DeleteSongDialogProps) {
  const utils = trpc.useUtils();
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteMutation = trpc.songs.delete.useMutation({
    onSuccess: () => {
      // Invalidate all relevant queries
      utils.songs.list.invalidate();
      utils.favorites.list.invalidate();
      utils.favorites.ids.invalidate();
      utils.albums.getById.invalidate();
      utils.albums.list.invalidate();
      onOpenChange(false);
      setIsDeleting(false);
      onDeleted?.();
    },
    onError: () => {
      setIsDeleting(false);
    },
  });

  const handleDelete = () => {
    setIsDeleting(true);
    deleteMutation.mutate({ id: songId });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Delete Song
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">"{songTitle}"</span>?
            This will permanently remove the song from your library, including any
            album associations and favorites. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
