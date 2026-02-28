import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { useCallback } from "react";

interface FavoriteButtonProps {
  songId: number;
  size?: "sm" | "default" | "icon";
  variant?: "ghost" | "outline";
  showLabel?: boolean;
}

export default function FavoriteButton({
  songId,
  size = "sm",
  variant = "ghost",
  showLabel = false,
}: FavoriteButtonProps) {
  const { data: favoriteIds, isLoading } = trpc.favorites.ids.useQuery();
  const toggleMutation = trpc.favorites.toggle.useMutation();
  const utils = trpc.useUtils();

  const isFavorited = favoriteIds?.includes(songId) ?? false;

  const handleToggle = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      // Optimistic update
      const previousIds = favoriteIds ?? [];
      const optimisticIds = isFavorited
        ? previousIds.filter((id) => id !== songId)
        : [...previousIds, songId];

      utils.favorites.ids.setData(undefined, optimisticIds);

      try {
        const result = await toggleMutation.mutateAsync({ songId });
        if (result.isFavorited) {
          toast.success("Added to favorites");
        } else {
          toast.success("Removed from favorites");
        }
        utils.favorites.ids.invalidate();
        utils.favorites.list.invalidate();
      } catch {
        // Rollback on error
        utils.favorites.ids.setData(undefined, previousIds);
        toast.error("Failed to update favorites");
      }
    },
    [songId, isFavorited, favoriteIds, toggleMutation, utils]
  );

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggle}
      disabled={isLoading || toggleMutation.isPending}
      className={`transition-all ${
        isFavorited
          ? "text-red-500 hover:text-red-600"
          : "text-muted-foreground hover:text-red-400"
      }`}
      title={isFavorited ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart
        className={`w-4 h-4 ${isFavorited ? "fill-current" : ""} ${showLabel ? "mr-1.5" : ""}`}
      />
      {showLabel && (isFavorited ? "Favorited" : "Favorite")}
    </Button>
  );
}
