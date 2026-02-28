import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface SongFilters {
  search: string;
  genre: string;
  mood: string;
}

interface SongFiltersProps {
  filters: SongFilters;
  onFiltersChange: (filters: SongFilters) => void;
  songs: any[] | undefined;
}

/** Extract unique non-null values from a field across all songs */
function uniqueValues(songs: any[] | undefined, field: string): string[] {
  if (!songs) return [];
  const set = new Set<string>();
  for (const s of songs) {
    const val = s[field];
    if (val && typeof val === "string" && val.trim()) {
      set.add(val.trim());
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/** Filter a list of songs by the current filter state */
export function filterSongs<T extends Record<string, any>>(
  songs: (T | undefined)[] | undefined,
  filters: SongFilters
): T[] {
  if (!songs) return [];
  const q = filters.search.toLowerCase().trim();
  const defined = songs.filter((s): s is T => s !== undefined);
  return defined.filter((song) => {
    // Search: match title or keywords
    if (q) {
      const title = (song.title || "").toLowerCase();
      const keywords = (song.keywords || "").toLowerCase();
      if (!title.includes(q) && !keywords.includes(q)) return false;
    }
    // Genre filter
    if (filters.genre && filters.genre !== "__all__") {
      if ((song.genre || "") !== filters.genre) return false;
    }
    // Mood filter
    if (filters.mood && filters.mood !== "__all__") {
      if ((song.mood || "") !== filters.mood) return false;
    }
    return true;
  });
}

export default function SongFiltersBar({
  filters,
  onFiltersChange,
  songs,
}: SongFiltersProps) {
  const genres = useMemo(() => uniqueValues(songs, "genre"), [songs]);
  const moods = useMemo(() => uniqueValues(songs, "mood"), [songs]);

  const hasActiveFilters =
    filters.search.trim() !== "" ||
    (filters.genre !== "" && filters.genre !== "__all__") ||
    (filters.mood !== "" && filters.mood !== "__all__");

  const clearFilters = () =>
    onFiltersChange({ search: "", genre: "__all__", mood: "__all__" });

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
      {/* Search */}
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search by title or keywords…"
          value={filters.search}
          onChange={(e) =>
            onFiltersChange({ ...filters, search: e.target.value })
          }
          className="pl-9 h-10"
        />
      </div>

      {/* Genre */}
      {genres.length > 0 && (
        <Select
          value={filters.genre || "__all__"}
          onValueChange={(v) => onFiltersChange({ ...filters, genre: v })}
        >
          <SelectTrigger className="w-full sm:w-[160px] h-10">
            <SelectValue placeholder="All Genres" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Genres</SelectItem>
            {genres.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Mood */}
      {moods.length > 0 && (
        <Select
          value={filters.mood || "__all__"}
          onValueChange={(v) => onFiltersChange({ ...filters, mood: v })}
        >
          <SelectTrigger className="w-full sm:w-[160px] h-10">
            <SelectValue placeholder="All Moods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Moods</SelectItem>
            {moods.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Clear */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
