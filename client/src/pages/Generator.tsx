import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import AudioPlayer from "@/components/AudioPlayer";
import SheetMusic from "@/components/SheetMusic";
import { useState, useCallback, useRef } from "react";
import { synthesizeAudio, createAudioUrl, revokeAudioUrl } from "@/lib/audioSynthesizer";
import { toast } from "sonner";
import {
  Sparkles, Download, Printer, Music, Loader2, Disc3,
  ChevronDown, ChevronUp, Clock, Guitar, Gauge
} from "lucide-react";
import { getLoginUrl } from "@/const";

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
};

export default function Generator() {
  const { isAuthenticated } = useAuth({ redirectOnUnauthenticated: true });
  const [keywords, setKeywords] = useState("");
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
  const saveMp3Mutation = trpc.songs.saveMp3.useMutation();
  const utils = trpc.useUtils();

  const handleGenerate = useCallback(async () => {
    if (!keywords.trim()) {
      toast.error("Please enter some keywords to describe your music");
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

      const song = await generateMutation.mutateAsync({ keywords: keywords.trim() });
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
          else if (p < 90) setProgressMessage("Encoding MP3...");
          else setProgressMessage("Finalizing...");
        }
      );

      const url = createAudioUrl(blob);
      audioUrlRef.current = url;
      setAudioUrl(url);
      setMp3Blob(blob);
      setProgress(95);
      setProgressMessage("Uploading MP3...");

      // Step 3: Upload MP3 to storage
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

        await saveMp3Mutation.mutateAsync({
          songId: song.id,
          mp3Base64: base64,
        });
      } catch {
        // Non-critical: local playback still works
        console.warn("Failed to upload MP3 to storage");
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
  }, [keywords, generateMutation, saveMp3Mutation, utils]);

  const handleDownload = useCallback(() => {
    if (!mp3Blob || !generatedSong) return;
    const url = URL.createObjectURL(mp3Blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${generatedSong.title.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_")}.mp3`;
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

    // Import abcjs dynamically for the print window
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
          Describe the music you want and let AI compose it for you
        </p>
      </div>

      {/* Input Section */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Describe your music
            </label>
            <Textarea
              placeholder="e.g., happy jazz piano, relaxing ambient rain, epic orchestral adventure, upbeat electronic dance..."
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

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleGenerate}
              disabled={isWorking || !keywords.trim()}
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

      {/* Suggestion chips */}
      {!generatedSong && !isWorking && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Try these ideas:</p>
          <div className="flex flex-wrap gap-2">
            {[
              "happy jazz piano",
              "epic orchestral adventure",
              "calm acoustic guitar",
              "energetic electronic dance",
              "melancholic classical violin",
              "tropical reggae vibes",
              "dark cinematic suspense",
              "cheerful folk ukulele",
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
                  Download MP3
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
