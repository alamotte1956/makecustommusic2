import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import AudioPlayer from "@/components/AudioPlayer";
import SheetMusic from "@/components/SheetMusic";
import { useState, useCallback, useRef, useMemo } from "react";
import { synthesizeAudio, createAudioUrl, revokeAudioUrl } from "@/lib/audioSynthesizer";
import { toast } from "sonner";
import {
  Sparkles, Download, Printer, Music, Loader2, Disc3,
  ChevronDown, ChevronUp, Clock, Guitar, Gauge, Mic, MicOff
} from "lucide-react";
import { getLoginUrl } from "@/const";

type VocalType = "none" | "male" | "female" | "mixed";

type GeneratedSong = {
  id: number;
  title: string;
  keywords: string;
  abcNotation: string;
  musicDescription: string | null;
  genre: string | null;
  mood: string | null;
  tempo: number | null;
  keySignature: string | null;
  timeSignature: string | null;
  instruments: string[] | null;
  mp3Url: string | null;
  vocalType: string | null;
};

const GENRE_PRESETS = [
  { label: "Jazz", icon: "🎷", color: "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200" },
  { label: "Classical", icon: "🎻", color: "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200" },
  { label: "Electronic", icon: "🎹", color: "bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200" },
  { label: "Rock", icon: "🎸", color: "bg-red-100 text-red-800 border-red-300 hover:bg-red-200" },
  { label: "Ambient", icon: "🌊", color: "bg-teal-100 text-teal-800 border-teal-300 hover:bg-teal-200" },
  { label: "Pop", icon: "🎤", color: "bg-pink-100 text-pink-800 border-pink-300 hover:bg-pink-200" },
  { label: "Hip Hop", icon: "🥁", color: "bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200" },
  { label: "Country", icon: "🤠", color: "bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200" },
  { label: "R&B", icon: "🎙️", color: "bg-indigo-100 text-indigo-800 border-indigo-300 hover:bg-indigo-200" },
  { label: "Folk", icon: "🪕", color: "bg-green-100 text-green-800 border-green-300 hover:bg-green-200" },
  { label: "Reggae", icon: "🌴", color: "bg-lime-100 text-lime-800 border-lime-300 hover:bg-lime-200" },
  { label: "Blues", icon: "🎺", color: "bg-sky-100 text-sky-800 border-sky-300 hover:bg-sky-200" },
];

const MOOD_PRESETS = [
  { label: "Happy", icon: "😊", color: "bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200" },
  { label: "Melancholic", icon: "😢", color: "bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200" },
  { label: "Energetic", icon: "⚡", color: "bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200" },
  { label: "Calm", icon: "🧘", color: "bg-teal-100 text-teal-800 border-teal-300 hover:bg-teal-200" },
  { label: "Epic", icon: "🏔️", color: "bg-violet-100 text-violet-800 border-violet-300 hover:bg-violet-200" },
  { label: "Romantic", icon: "💕", color: "bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200" },
  { label: "Dark", icon: "🌑", color: "bg-gray-200 text-gray-800 border-gray-400 hover:bg-gray-300" },
  { label: "Uplifting", icon: "🌅", color: "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200" },
  { label: "Mysterious", icon: "🔮", color: "bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200" },
  { label: "Playful", icon: "🎪", color: "bg-pink-100 text-pink-800 border-pink-300 hover:bg-pink-200" },
];

const VOCAL_OPTIONS: { value: VocalType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: "none", label: "No Vocals", icon: <MicOff className="w-4 h-4" />, description: "Instrumental only" },
  { value: "male", label: "Male", icon: <Mic className="w-4 h-4" />, description: "Male vocalist" },
  { value: "female", label: "Female", icon: <Mic className="w-4 h-4" />, description: "Female vocalist" },
  { value: "mixed", label: "Mixed", icon: <Mic className="w-4 h-4" />, description: "Male & female" },
];

export default function Generator() {
  const { isAuthenticated } = useAuth({ redirectOnUnauthenticated: true });
  const [keywords, setKeywords] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedVocal, setSelectedVocal] = useState<VocalType>("none");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [generatedSong, setGeneratedSong] = useState<GeneratedSong | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [mp3Blob, setMp3Blob] = useState<Blob | null>(null);
  const [showSheetMusic, setShowSheetMusic] = useState(false);
  const audioUrlRef = useRef<string | null>(null);

  const generateMutation = trpc.songs.generate.useMutation();
  const saveAudioMutation = trpc.songs.saveAudio.useMutation();
  const utils = trpc.useUtils();

  // Build the full prompt from keywords + presets
  const fullPrompt = useMemo(() => {
    const parts: string[] = [];
    if (keywords.trim()) parts.push(keywords.trim());
    if (selectedGenre && !keywords.toLowerCase().includes(selectedGenre.toLowerCase())) {
      parts.push(selectedGenre);
    }
    if (selectedMood && !keywords.toLowerCase().includes(selectedMood.toLowerCase())) {
      parts.push(selectedMood);
    }
    if (selectedVocal !== "none") {
      parts.push(`${selectedVocal} vocals`);
    }
    return parts.join(", ");
  }, [keywords, selectedGenre, selectedMood, selectedVocal]);

  const handleGenerate = useCallback(async () => {
    if (!keywords.trim() && !selectedGenre && !selectedMood) {
      toast.error("Please enter some keywords or select a genre/mood");
      return;
    }

    // Clean up previous audio
    if (audioUrlRef.current) {
      revokeAudioUrl(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setAudioUrl(null);
    setMp3Blob(null);
    setGeneratedSong(null);
    setShowSheetMusic(false);

    try {
      // Step 1: Generate composition with AI
      setIsGenerating(true);
      setProgress(10);
      setProgressMessage("AI is composing your music...");

      const effectiveKeywords = keywords.trim() || [selectedGenre, selectedMood].filter(Boolean).join(" ");

      const song = await generateMutation.mutateAsync({
        keywords: effectiveKeywords,
        genre: selectedGenre || undefined,
        mood: selectedMood || undefined,
        vocalType: selectedVocal,
      });
      if (!song) throw new Error("Failed to generate song");

      setGeneratedSong(song as GeneratedSong);
      setProgress(40);
      setProgressMessage("Synthesizing audio...");
      setIsGenerating(false);
      setIsSynthesizing(true);

      // Step 2: Synthesize audio from ABC notation
      const { blob } = await synthesizeAudio(
        song.abcNotation,
        song.tempo || 120,
        (p) => {
          setProgress(40 + Math.round(p * 0.5));
          if (p < 50) setProgressMessage("Rendering notes...");
          else if (p < 70) setProgressMessage("Processing audio...");
          else if (p < 90) setProgressMessage("Encoding audio...");
          else setProgressMessage("Finalizing...");
        }
      );

      const url = createAudioUrl(blob);
      audioUrlRef.current = url;
      setAudioUrl(url);
      setMp3Blob(blob);
      setProgress(95);
      setProgressMessage("Uploading audio...");

      // Step 3: Upload audio to storage
      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        await saveAudioMutation.mutateAsync({
          songId: song.id,
          audioBase64: base64,
        });
      } catch {
        console.warn("Failed to upload audio to storage");
      }

      setProgress(100);
      setProgressMessage("Done!");
      utils.songs.list.invalidate();
      toast.success("Music generated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate music");
      setProgress(0);
      setProgressMessage("");
    } finally {
      setIsGenerating(false);
      setIsSynthesizing(false);
    }
  }, [keywords, selectedGenre, selectedMood, selectedVocal, generateMutation, saveAudioMutation, utils]);

  const handleDownload = useCallback(() => {
    if (!mp3Blob || !generatedSong) return;
    const url = URL.createObjectURL(mp3Blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${generatedSong.title.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_")}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Download started!");
  }, [mp3Blob, generatedSong]);

  const handlePrintSheetMusic = useCallback(() => {
    if (!generatedSong) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow pop-ups to print sheet music");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${generatedSong.title} - Sheet Music</title>
          <script src="https://cdn.jsdelivr.net/npm/abcjs@6.6.2/dist/abcjs-basic-min.js"><\/script>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            h1 { font-size: 24px; margin-bottom: 8px; }
            .meta { color: #666; font-size: 14px; margin-bottom: 24px; }
            .sheet-music { margin-top: 20px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <h1>${generatedSong.title}</h1>
          <div class="meta">
            ${generatedSong.genre ? `Genre: ${generatedSong.genre}` : ""}
            ${generatedSong.keySignature ? ` | Key: ${generatedSong.keySignature}` : ""}
            ${generatedSong.tempo ? ` | Tempo: ${generatedSong.tempo} BPM` : ""}
          </div>
          <div id="sheet-music" class="sheet-music"></div>
          <script>
            window.onload = function() {
              ABCJS.renderAbc("sheet-music", ${JSON.stringify(generatedSong.abcNotation)}, {
                staffwidth: 700,
                paddingtop: 10,
                paddingbottom: 10,
              });
              setTimeout(function() { window.print(); }, 500);
            };
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }, [generatedSong]);

  if (!isAuthenticated) {
    return (
      <div className="container py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">Sign in to create music</h2>
        <Button asChild>
          <a href={getLoginUrl()}>Sign In</a>
        </Button>
      </div>
    );
  }

  const isWorking = isGenerating || isSynthesizing;

  return (
    <div className="container py-8 md:py-12 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary" />
          Create Music
        </h1>
        <p className="text-muted-foreground">
          Describe the music you want, pick a style, and let AI compose it for you
        </p>
      </div>

      {/* Input Section */}
      <Card>
        <CardContent className="pt-6 space-y-6">
          {/* Keywords Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Describe your music
            </label>
            <Textarea
              placeholder="e.g., sunset beach vibes, rainy day coffee shop, adventure through mountains..."
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              rows={3}
              maxLength={500}
              disabled={isWorking}
              className="resize-none text-base"
            />
            <p className="text-xs text-muted-foreground text-right">
              {keywords.length}/500
            </p>
          </div>

          {/* Genre Presets */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Guitar className="w-4 h-4 text-primary" />
              Genre
            </label>
            <div className="flex flex-wrap gap-2">
              {GENRE_PRESETS.map((genre) => (
                <button
                  key={genre.label}
                  onClick={() => setSelectedGenre(selectedGenre === genre.label ? null : genre.label)}
                  disabled={isWorking}
                  className={`
                    px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-200
                    ${selectedGenre === genre.label
                      ? `${genre.color} ring-2 ring-primary/50 shadow-sm scale-105`
                      : "bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground"
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <span className="mr-1.5">{genre.icon}</span>
                  {genre.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mood Presets */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Mood
            </label>
            <div className="flex flex-wrap gap-2">
              {MOOD_PRESETS.map((mood) => (
                <button
                  key={mood.label}
                  onClick={() => setSelectedMood(selectedMood === mood.label ? null : mood.label)}
                  disabled={isWorking}
                  className={`
                    px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-200
                    ${selectedMood === mood.label
                      ? `${mood.color} ring-2 ring-primary/50 shadow-sm scale-105`
                      : "bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground"
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <span className="mr-1.5">{mood.icon}</span>
                  {mood.label}
                </button>
              ))}
            </div>
          </div>

          {/* Vocal Type Selector */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Mic className="w-4 h-4 text-primary" />
              Vocals
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {VOCAL_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedVocal(option.value)}
                  disabled={isWorking}
                  className={`
                    flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200
                    ${selectedVocal === option.value
                      ? "border-primary bg-primary/5 text-primary shadow-sm"
                      : "border-border bg-card text-card-foreground hover:border-primary/40 hover:bg-accent"
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    ${selectedVocal === option.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                    }
                  `}>
                    {option.icon}
                  </div>
                  <span className="text-sm font-medium">{option.label}</span>
                  <span className="text-xs text-muted-foreground">{option.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Preview of what will be generated */}
          {fullPrompt && (
            <div className="rounded-lg bg-muted/50 border border-border px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Generation prompt:</p>
              <p className="text-sm text-foreground">{fullPrompt}</p>
            </div>
          )}

          {/* Generate Button */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleGenerate}
              disabled={isWorking || (!keywords.trim() && !selectedGenre && !selectedMood)}
              size="lg"
              className="flex-1 sm:flex-none"
            >
              {isWorking ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Music
                </>
              )}
            </Button>
            {(selectedGenre || selectedMood || selectedVocal !== "none") && !isWorking && (
              <Button
                variant="ghost"
                size="lg"
                onClick={() => {
                  setSelectedGenre(null);
                  setSelectedMood(null);
                  setSelectedVocal("none");
                }}
              >
                Clear Presets
              </Button>
            )}
          </div>

          {/* Progress */}
          {isWorking && (
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{progressMessage}</span>
                <span className="text-muted-foreground tabular-nums">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Ideas (only when no song generated and not working) */}
      {!generatedSong && !isWorking && !keywords && !selectedGenre && !selectedMood && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Quick ideas:</p>
          <div className="flex flex-wrap gap-2">
            {[
              "sunset beach vibes",
              "epic movie soundtrack",
              "cozy rainy afternoon",
              "night drive through the city",
              "morning yoga flow",
              "space exploration theme",
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setKeywords(suggestion)}
                className="px-3 py-1.5 rounded-full text-sm border border-border bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Generated Song Result */}
      {generatedSong && !isWorking && (
        <div className="space-y-6">
          {/* Song Info Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Music className="w-5 h-5 text-primary" />
                    {generatedSong.title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {generatedSong.musicDescription}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Metadata badges */}
              <div className="flex flex-wrap gap-2">
                {generatedSong.genre && (
                  <Badge variant="secondary" className="gap-1">
                    <Guitar className="w-3 h-3" />
                    {generatedSong.genre}
                  </Badge>
                )}
                {generatedSong.mood && (
                  <Badge variant="secondary">{generatedSong.mood}</Badge>
                )}
                {generatedSong.vocalType && generatedSong.vocalType !== "none" && (
                  <Badge variant="secondary" className="gap-1">
                    <Mic className="w-3 h-3" />
                    {generatedSong.vocalType.charAt(0).toUpperCase() + generatedSong.vocalType.slice(1)} Vocals
                  </Badge>
                )}
                {generatedSong.keySignature && (
                  <Badge variant="outline">{generatedSong.keySignature}</Badge>
                )}
                {generatedSong.timeSignature && (
                  <Badge variant="outline" className="gap-1">
                    <Clock className="w-3 h-3" />
                    {generatedSong.timeSignature}
                  </Badge>
                )}
                {generatedSong.tempo && (
                  <Badge variant="outline" className="gap-1">
                    <Gauge className="w-3 h-3" />
                    {generatedSong.tempo} BPM
                  </Badge>
                )}
              </div>

              {/* Instruments */}
              {generatedSong.instruments && generatedSong.instruments.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Instruments:</span>{" "}
                  {generatedSong.instruments.join(", ")}
                </div>
              )}

              {/* Audio Player */}
              {audioUrl && (
                <AudioPlayer src={audioUrl} title={generatedSong.title} />
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-2">
                <Button onClick={handleDownload} disabled={!mp3Blob}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Audio
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowSheetMusic(!showSheetMusic)}
                >
                  {showSheetMusic ? (
                    <ChevronUp className="w-4 h-4 mr-2" />
                  ) : (
                    <ChevronDown className="w-4 h-4 mr-2" />
                  )}
                  {showSheetMusic ? "Hide" : "View"} Sheet Music
                </Button>
                <Button variant="outline" onClick={handlePrintSheetMusic}>
                  <Printer className="w-4 h-4 mr-2" />
                  Print Sheet Music
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sheet Music */}
          {showSheetMusic && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Music className="w-5 h-5 text-primary" />
                  Sheet Music
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SheetMusic abcNotation={generatedSong.abcNotation} />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
