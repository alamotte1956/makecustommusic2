/**
 * ListenToLyricsButton
 *
 * Sends lyrics to the /api/generate-voice endpoint,
 * receives an MP3 audio stream as a blob, and plays it inline.
 *
 * Flow:
 * 1. User clicks "Listen to Lyrics"
 * 2. Opens a popover to select a voice + adjust settings
 * 3. Calls POST /api/generate-voice with lyrics + voiceId + settings
 * 4. Receives arraybuffer → creates blob → plays via Audio element
 * 5. Also stores the persistent S3 URL from the X-Audio-Url header
 */

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import VoiceSelector from "./VoiceSelector";
import { Volume2, Loader2, Square, Play, Pause } from "lucide-react";
import { toast } from "sonner";

interface ListenToLyricsButtonProps {
  lyrics: string;
  size?: "sm" | "default";
  variant?: "outline" | "default" | "ghost";
}

export default function ListenToLyricsButton({
  lyrics,
  size = "sm",
  variant = "outline",
}: ListenToLyricsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [voiceId, setVoiceId] = useState("");
  const [stability, setStability] = useState(0.5);
  const [similarityBoost, setSimilarityBoost] = useState(0.8);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [persistentUrl, setPersistentUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!voiceId) {
      toast.error("Please select a voice first");
      return;
    }

    if (!lyrics || lyrics.trim().length === 0) {
      toast.error("No lyrics to read");
      return;
    }

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }

    // Clean up previous blob URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/api/generate-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lyrics: lyrics.trim(),
          voiceId,
          stability,
          similarityBoost,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Generation failed (${response.status})`);
      }

      // Get the persistent S3 URL from the header
      const s3Url = response.headers.get("X-Audio-Url");
      if (s3Url) {
        setPersistentUrl(s3Url);
      }

      // Create blob from arraybuffer and play
      const audioBlob = await response.blob();
      const blobUrl = URL.createObjectURL(audioBlob);
      setAudioUrl(blobUrl);

      // Create and play audio
      const audio = new Audio(blobUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
      };

      audio.onerror = () => {
        toast.error("Failed to play audio");
        setIsPlaying(false);
      };

      await audio.play();
      setIsPlaying(true);
      toast.success("Playing lyrics audio!");
    } catch (error: any) {
      toast.error(error.message || "Voice generation failed");
    } finally {
      setIsGenerating(false);
    }
  }, [voiceId, lyrics, stability, similarityBoost, audioUrl]);

  const handleTogglePlay = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleStop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, []);

  const handleDownloadTTS = useCallback(() => {
    const url = persistentUrl || audioUrl;
    if (!url) return;

    const a = document.createElement("a");
    a.href = url;
    a.download = "lyrics-audio.mp3";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Download started!");
  }, [persistentUrl, audioUrl]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant={variant} size={size}>
          <Volume2 className="w-3.5 h-3.5 mr-1.5" />
          Listen
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-4" align="start">
        <div className="space-y-1">
          <h4 className="font-medium text-sm text-foreground">Listen to Lyrics</h4>
          <p className="text-xs text-muted-foreground">
            Choose a voice and generate spoken audio of the lyrics
          </p>
        </div>

        {/* Voice Selector */}
        <div className="space-y-2">
          <Label className="text-xs">Voice</Label>
          <VoiceSelector
            value={voiceId}
            onValueChange={setVoiceId}
            disabled={isGenerating}
          />
        </div>

        {/* Stability Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Stability</Label>
            <span className="text-xs text-muted-foreground tabular-nums">{stability.toFixed(2)}</span>
          </div>
          <Slider
            value={[stability]}
            min={0}
            max={1}
            step={0.05}
            onValueChange={(v) => setStability(v[0])}
            disabled={isGenerating}
          />
          <p className="text-[10px] text-muted-foreground">
            Lower = more expressive, Higher = more consistent
          </p>
        </div>

        {/* Similarity Boost Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Similarity Boost</Label>
            <span className="text-xs text-muted-foreground tabular-nums">{similarityBoost.toFixed(2)}</span>
          </div>
          <Slider
            value={[similarityBoost]}
            min={0}
            max={1}
            step={0.05}
            onValueChange={(v) => setSimilarityBoost(v[0])}
            disabled={isGenerating}
          />
          <p className="text-[10px] text-muted-foreground">
            Higher = closer to original voice, Lower = more variation
          </p>
        </div>

        {/* Generate / Playback Controls */}
        <div className="flex gap-2">
          {!audioUrl ? (
            <Button
              className="flex-1"
              size="sm"
              onClick={handleGenerate}
              disabled={isGenerating || !voiceId}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 mr-1.5" />
                  Generate Audio
                </>
              )}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTogglePlay}
              >
                {isPlaying ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleStop}
              >
                <Square className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTTS}
              >
                Download
              </Button>
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "Regenerate"
                )}
              </Button>
            </>
          )}
        </div>

        {/* Preview text */}
        <div className="max-h-20 overflow-y-auto rounded border border-border p-2">
          <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">
            {lyrics.slice(0, 300)}{lyrics.length > 300 ? "..." : ""}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
