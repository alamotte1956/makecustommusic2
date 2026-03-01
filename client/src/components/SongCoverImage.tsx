import { Music } from "lucide-react";

interface SongCoverImageProps {
  imageUrl?: string | null;
  title: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-12 h-12",
  md: "w-20 h-20",
  lg: "w-32 h-32",
};

export default function SongCoverImage({
  imageUrl,
  title,
  size = "sm",
  className = "",
}: SongCoverImageProps) {
  if (!imageUrl) return null;

  return (
    <div
      className={`rounded-lg overflow-hidden shrink-0 bg-muted ${sizeClasses[size]} ${className}`}
    >
      <img
        src={imageUrl}
        alt={`${title} cover`}
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
  );
}
