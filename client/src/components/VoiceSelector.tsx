import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface VoiceSelectorProps {
  value: string;
  onValueChange: (voiceId: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function VoiceSelector({
  value,
  onValueChange,
  disabled = false,
  className = "",
}: VoiceSelectorProps) {
  const { data: voices, isLoading } = trpc.songs.voices.useQuery();

  // Group voices by category
  const groupedVoices = useMemo(() => {
    if (!voices) return {};
    const groups: Record<string, typeof voices> = {};
    for (const voice of voices) {
      const cat = voice.category || "premade";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(voice);
    }
    return groups;
  }, [voices]);

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Loading voices...
      </div>
    );
  }

  if (!voices || voices.length === 0) {
    return (
      <div className={`text-sm text-muted-foreground ${className}`}>
        No voices available
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={`w-full ${className}`}>
        <SelectValue placeholder="Select a voice" />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(groupedVoices).map(([category, categoryVoices]) => (
          <div key={category}>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {category}
            </div>
            {categoryVoices.map((voice) => (
              <SelectItem key={voice.voice_id} value={voice.voice_id}>
                <div className="flex items-center gap-2">
                  <span>{voice.name}</span>
                  {voice.labels && Object.keys(voice.labels).length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({Object.values(voice.labels).slice(0, 2).join(", ")})
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </div>
        ))}
      </SelectContent>
    </Select>
  );
}
