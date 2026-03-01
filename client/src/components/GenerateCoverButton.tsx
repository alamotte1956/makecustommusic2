import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2 } from "lucide-react";

interface GenerateCoverButtonProps {
  songId: number;
  hasImage?: boolean;
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "outline" | "default" | "ghost" | "secondary";
  showLabel?: boolean;
  onGenerated?: (imageUrl: string) => void;
}

export default function GenerateCoverButton({
  songId,
  hasImage = false,
  size = "sm",
  variant = "outline",
  showLabel = true,
  onGenerated,
}: GenerateCoverButtonProps) {
  const [generating, setGenerating] = useState(false);
  const generateCover = trpc.songs.generateCover.useMutation();
  const utils = trpc.useUtils();

  const handleClick = async () => {
    setGenerating(true);
    try {
      const result = await generateCover.mutateAsync({ songId });
      utils.songs.list.invalidate();
      utils.songs.getById.invalidate({ id: songId });
      utils.favorites.list.invalidate();
      utils.favorites.ids.invalidate();
      if (result.imageUrl && onGenerated) {
        onGenerated(result.imageUrl);
      }
      toast.success(hasImage ? "Cover art regenerated!" : "Cover art generated!");
    } catch {
      toast.error("Failed to generate cover art. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={generating}
      title={hasImage ? "Regenerate cover art" : "Generate cover art"}
    >
      {generating ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <ImagePlus className="w-3.5 h-3.5" />
      )}
      {showLabel && (
        <span className="ml-1.5">
          {generating ? "Generating..." : hasImage ? "New Cover" : "Cover Art"}
        </span>
      )}
    </Button>
  );
}
