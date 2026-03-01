import { useState, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mic2, Download, Play, Pause, Loader2, Wand2, Layers,
  Volume2, Music, CheckCircle2, Headphones, SlidersHorizontal
} from "lucide-react";
import { toast } from "sonner";

type Song = {
  id: number;
  title: string;
  lyrics: string | null;
  audioUrl: string | null;
  genre: string | null;
  mood: string | null;
  instrumentalUrl?: string | null;
  vocalUrl?: string | null;
  mixedUrl?: string | null;
  takes?: any[] | null;
  selectedTakeIndex?: number | null;
  postProcessPreset?: string | null;
};

type Props = {
  song: Song;
};

export default function StudioProducer({ song }: Props) {
  const utils = trpc.useUtils();

  // Voice selection
  const { data: voices } = trpc.songs.voices.useQuery(undefined, {
    staleTime: 60000,
  });
  const [selectedVoiceId, setSelectedVoiceId] = useState("");

  // Processing preset
  const { data: presets } = trpc.songs.processingPresets.useQuery(undefined, {
    staleTime: 60000,
  });
  const [selectedPreset, setSelectedPreset] = useState(
    (song.postProcessPreset as string) || "radio-ready"
  );

  // Mixing controls
  const [vocalLevel, setVocalLevel] = useState(2);
  const [instrumentalLevel, setInstrumentalLevel] = useState(-3);

  // Audio playback
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingTake, setPlayingTake] = useState<number | null>(null);

  // Mutations
  const generateVocalMix = trpc.songs.generateVocalMix.useMutation({
    onSuccess: () => {
      utils.songs.getById.invalidate({ id: song.id });
      toast.success("Vocal mix generated successfully!");
    },
    onError: (err) => toast.error(err.message),
  });

  const generateTakes = trpc.songs.generateTakes.useMutation({
    onSuccess: () => {
      utils.songs.getById.invalidate({ id: song.id });
      toast.success("Multiple takes generated! Audition them below.");
    },
    onError: (err) => toast.error(err.message),
  });

  const selectTake = trpc.songs.selectTake.useMutation({
    onSuccess: (data) => {
      utils.songs.getById.invalidate({ id: song.id });
      toast.success(`Selected ${(song.takes as any[])?.[data.selectedTakeIndex]?.label || "take"}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const postProcess = trpc.songs.postProcess.useMutation({
    onSuccess: () => {
      utils.songs.getById.invalidate({ id: song.id });
      toast.success("Audio post-processing applied!");
    },
    onError: (err) => toast.error(err.message),
  });

  const takes = useMemo(() => (song.takes as any[]) || [], [song.takes]);
  const hasStemsAvailable = !!song.instrumentalUrl && !!song.vocalUrl;
  const hasLyrics = !!song.lyrics;
  const hasAudio = !!song.audioUrl;

  const handlePlayTake = (takeIndex: number, url: string) => {
    if (playingTake === takeIndex && audioRef.current) {
      audioRef.current.pause();
      setPlayingTake(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.play();
    setPlayingTake(takeIndex);
    audio.onended = () => setPlayingTake(null);
  };

  const handleDownloadStem = (url: string, label: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `${song.title} - ${label}.mp3`;
    a.target = "_blank";
    a.click();
  };

  const isGenerating = generateVocalMix.isPending || generateTakes.isPending;

  return (
    <div className="space-y-6">
      {/* Vocal Mix Generator */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Mic2 className="w-5 h-5 text-primary" />
            Vocal Production
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasLyrics && (
            <p className="text-sm text-muted-foreground">
              This song has no lyrics. Generate lyrics first to create vocal tracks.
            </p>
          )}
          {!hasAudio && (
            <p className="text-sm text-muted-foreground">
              This song has no instrumental track. Generate audio first.
            </p>
          )}

          {hasLyrics && hasAudio && (
            <>
              {/* Voice Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Voice</label>
                <Select value={selectedVoiceId} onValueChange={setSelectedVoiceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a voice..." />
                  </SelectTrigger>
                  <SelectContent>
                    {voices?.map((v: any) => (
                      <SelectItem key={v.voice_id} value={v.voice_id}>
                        {v.name} ({v.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Mixing Controls */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium flex items-center gap-1">
                    <Mic2 className="w-3 h-3" />
                    Vocal Level ({vocalLevel > 0 ? "+" : ""}{vocalLevel}dB)
                  </label>
                  <Slider
                    value={[vocalLevel]}
                    onValueChange={([v]) => setVocalLevel(v)}
                    min={-10}
                    max={10}
                    step={1}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium flex items-center gap-1">
                    <Music className="w-3 h-3" />
                    Instrumental ({instrumentalLevel > 0 ? "+" : ""}{instrumentalLevel}dB)
                  </label>
                  <Slider
                    value={[instrumentalLevel]}
                    onValueChange={([v]) => setInstrumentalLevel(v)}
                    min={-10}
                    max={10}
                    step={1}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => {
                    if (!selectedVoiceId) {
                      toast.error("Please select a voice first");
                      return;
                    }
                    generateVocalMix.mutate({
                      songId: song.id,
                      voiceId: selectedVoiceId,
                      vocalLevel,
                      instrumentalLevel,
                      preset: selectedPreset as any,
                    });
                  }}
                  disabled={!selectedVoiceId || isGenerating}
                >
                  {generateVocalMix.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4 mr-2" />
                  )}
                  Generate Vocal Mix
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => {
                    if (!selectedVoiceId) {
                      toast.error("Please select a voice first");
                      return;
                    }
                    generateTakes.mutate({
                      songId: song.id,
                      voiceId: selectedVoiceId,
                      takeCount: 3,
                      preset: selectedPreset as any,
                    });
                  }}
                  disabled={!selectedVoiceId || isGenerating}
                >
                  {generateTakes.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Layers className="w-4 h-4 mr-2" />
                  )}
                  Generate 3 Takes
                </Button>
              </div>

              {isGenerating && (
                <p className="text-xs text-muted-foreground animate-pulse">
                  Generating vocals, mixing, and mastering... This may take 30-60 seconds per take.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Takes Selector */}
      {takes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Headphones className="w-5 h-5 text-primary" />
              Takes
              <Badge variant="secondary" className="text-xs">{takes.length} takes</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {takes.map((take: any, idx: number) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    song.selectedTakeIndex === idx
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => handlePlayTake(idx, take.mixedUrl)}
                  >
                    {playingTake === idx ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{take.label}</p>
                    <p className="text-xs text-muted-foreground">
                      Stability: {take.voiceSettings?.stability?.toFixed(2)} |
                      Similarity: {take.voiceSettings?.similarity_boost?.toFixed(2)} |
                      Style: {take.voiceSettings?.style?.toFixed(2)}
                    </p>
                  </div>

                  {song.selectedTakeIndex === idx ? (
                    <Badge variant="default" className="gap-1 shrink-0">
                      <CheckCircle2 className="w-3 h-3" />
                      Active
                    </Badge>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectTake.mutate({ songId: song.id, takeIndex: idx })}
                      disabled={selectTake.isPending}
                    >
                      Select
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Post-Processing */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-primary" />
            Mastering Preset
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Select value={selectedPreset} onValueChange={setSelectedPreset}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {presets?.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label} — {p.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="secondary"
            onClick={() => {
              postProcess.mutate({
                songId: song.id,
                preset: selectedPreset as any,
              });
            }}
            disabled={!hasAudio || postProcess.isPending}
          >
            {postProcess.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4 mr-2" />
            )}
            Apply Mastering
          </Button>

          {song.postProcessPreset && song.postProcessPreset !== "raw" && (
            <p className="text-xs text-muted-foreground">
              Current preset: <span className="font-medium">{song.postProcessPreset}</span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stem Downloads */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Stem Downloads
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasStemsAvailable ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {song.instrumentalUrl && (
                <Button
                  variant="outline"
                  className="justify-start gap-2"
                  onClick={() => handleDownloadStem(song.instrumentalUrl!, "Instrumental")}
                >
                  <Music className="w-4 h-4 text-blue-500" />
                  Instrumental
                </Button>
              )}
              {song.vocalUrl && (
                <Button
                  variant="outline"
                  className="justify-start gap-2"
                  onClick={() => handleDownloadStem(song.vocalUrl!, "Vocals")}
                >
                  <Mic2 className="w-4 h-4 text-pink-500" />
                  Vocals
                </Button>
              )}
              {song.mixedUrl && (
                <Button
                  variant="outline"
                  className="justify-start gap-2"
                  onClick={() => handleDownloadStem(song.mixedUrl!, "Full Mix")}
                >
                  <Volume2 className="w-4 h-4 text-green-500" />
                  Full Mix
                </Button>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Generate a vocal mix first to access individual stems for download.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
