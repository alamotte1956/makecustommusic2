import { trpc } from "@/lib/trpc";
import { useState, useMemo, useRef, useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Play, Square, Volume2 } from "lucide-react";

interface VoiceSelectorProps {
  value: string;
  onValueChange: (voiceId: string) => void;
  disabled?: boolean;
  className?: string;
  showPreview?: boolean;
}

export default function VoiceSelector({
  value,
  onValueChange,
  disabled = false,
  className = "",
  showPreview = true,
}: VoiceSelectorProps) {
  const { data: voices, isLoading } = trpc.songs.voices.useQuery();
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  // Get the currently selected voice's preview_url
  const selectedVoice = useMemo(() => {
    if (!voices || !value) return null;
    return voices.find((v) => v.voice_id === value) || null;
  }, [voices, value]);

  const stopPreview = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setPreviewingVoiceId(null);
    setPreviewLoading(false);
  }, []);

  const playPreview = useCallback(
    (voiceId: string, previewUrl: string) => {
      // If already playing this voice, stop it
      if (previewingVoiceId === voiceId) {
        stopPreview();
        return;
      }

      // Stop any current preview
      stopPreview();

      setPreviewLoading(true);
      setPreviewingVoiceId(voiceId);

      const audio = new Audio(previewUrl);
      audioRef.current = audio;

      audio.addEventListener("canplaythrough", () => {
        setPreviewLoading(false);
        audio.play().catch(() => {
          setPreviewLoading(false);
          setPreviewingVoiceId(null);
        });
      });

      audio.addEventListener("ended", () => {
        setPreviewingVoiceId(null);
        audioRef.current = null;
      });

      audio.addEventListener("error", () => {
        setPreviewLoading(false);
        setPreviewingVoiceId(null);
        audioRef.current = null;
      });

      audio.load();
    },
    [previewingVoiceId, stopPreview]
  );

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
    <div className={`flex items-center gap-2 ${className}`}>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className="w-full">
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
                    {voice.preview_url && (
                      <Volume2 className="w-3 h-3 text-muted-foreground/50" />
                    )}
                  </div>
                </SelectItem>
              ))}
            </div>
          ))}
        </SelectContent>
      </Select>

      {/* Preview button — appears when a voice with preview_url is selected */}
      {showPreview && selectedVoice?.preview_url && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0 h-9 w-9"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            playPreview(selectedVoice.voice_id, selectedVoice.preview_url!);
          }}
          disabled={disabled}
          title={
            previewingVoiceId === selectedVoice.voice_id
              ? "Stop preview"
              : `Preview ${selectedVoice.name}'s voice`
          }
          aria-label={
            previewingVoiceId === selectedVoice.voice_id
              ? "Stop preview"
              : `Preview ${selectedVoice.name}'s voice`
          }
        >
          {previewLoading && previewingVoiceId === selectedVoice.voice_id ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : previewingVoiceId === selectedVoice.voice_id ? (
            <Square className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </Button>
      )}
    </div>
  );
}
