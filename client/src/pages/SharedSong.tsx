import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AudioPlayer from "@/components/AudioPlayer";
import SheetMusic from "@/components/SheetMusic";
import { useState, useCallback, useRef, useEffect } from "react";
import { synthesizeAudio, createAudioUrl, revokeAudioUrl } from "@/lib/audioSynthesizer";
import { toast } from "sonner";
import {
  Music, Download, Printer, Loader2, Sparkles,
  ChevronDown, ChevronUp, Clock, Guitar, Gauge, Mic,
  Timer, FileText, Zap, Crown, Cpu
} from "lucide-react";
import { useParams, Link } from "wouter";

type Engine = "free" | "suno" | "musicgen";

const ENGINE_INFO: Record<Engine, { label: string; badgeColor: string }> = {
  free: { label: "Built-in AI", badgeColor: "bg-green-100 text-green-700 border-green-300" },
  musicgen: { label: "MusicGen", badgeColor: "bg-blue-100 text-blue-700 border-blue-300" },
  suno: { label: "Suno", badgeColor: "bg-purple-100 text-purple-700 border-purple-300" },
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export default function SharedSong() {
  const params = useParams<{ token: string }>();
  const token = params.token || "";

  const { data: song, isLoading, error } = trpc.songs.getShared.useQuery(
    { shareToken: token },
    { enabled: !!token }
  );

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [showSheetMusic, setShowSheetMusic] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const audioUrlRef = useRef<string | null>(null);

  // For free engine songs, synthesize audio client-side
  useEffect(() => {
    if (!song) return;

    if (song.engine !== "free" && song.mp3Url) {
      setAudioUrl(song.mp3Url);
    } else if (song.engine === "free" && song.abcNotation) {
      setIsSynthesizing(true);
      synthesizeAudio(song.abcNotation, song.tempo || 120)
        .then(({ blob }) => {
          const url = createAudioUrl(blob);
          audioUrlRef.current = url;
          setAudioUrl(url);
          setAudioBlob(blob);
        })
        .catch(() => {
          toast.error("Failed to synthesize audio");
        })
        .finally(() => {
          setIsSynthesizing(false);
        });
    }

    return () => {
      if (audioUrlRef.current) {
        revokeAudioUrl(audioUrlRef.current);
      }
    };
  }, [song]);

  const handleDownload = useCallback(async () => {
    if (!song) return;
    const fileName = `${song.title.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_")}`;

    if (song.mp3Url && song.engine !== "free") {
      const a = document.createElement("a");
      a.href = song.mp3Url;
      a.download = `${fileName}.mp3`;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Download started!");
      return;
    }

    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Download started!");
    }
  }, [audioBlob, song]);

  const handlePrintSheetMusic = useCallback(() => {
    if (!song || !song.abcNotation) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow pop-ups to print sheet music");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${song.title} - Sheet Music</title>
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
          <h1>${song.title}</h1>
          <div class="meta">
            ${song.genre ? `Genre: ${song.genre}` : ""}
            ${song.keySignature ? ` | Key: ${song.keySignature}` : ""}
            ${song.tempo ? ` | Tempo: ${song.tempo} BPM` : ""}
          </div>
          <div id="sheet-music" class="sheet-music"></div>
          <script>
            window.onload = function() {
              ABCJS.renderAbc("sheet-music", ${JSON.stringify(song.abcNotation)}, {
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
  }, [song]);

  if (isLoading) {
    return (
      <div className="container py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
        <p className="text-muted-foreground">Loading shared song...</p>
      </div>
    );
  }

  if (!song || error) {
    return (
      <div className="container py-20 text-center space-y-4">
        <Music className="w-12 h-12 mx-auto text-muted-foreground" />
        <h2 className="text-2xl font-bold">Song Not Found</h2>
        <p className="text-muted-foreground">
          This share link may have expired or the song may have been deleted.
        </p>
        <Button asChild>
          <Link href="/">Go Home</Link>
        </Button>
      </div>
    );
  }

  const engineInfo = ENGINE_INFO[song.engine as Engine];

  return (
    <div className="container py-8 md:py-12 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="w-4 h-4 text-primary" />
          Shared Song
        </div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Music className="w-8 h-8 text-primary" />
          {song.title}
        </h1>
        {song.musicDescription && (
          <p className="text-muted-foreground">{song.musicDescription}</p>
        )}
      </div>

      {/* Song Card */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Cover image for Suno tracks */}
          {song.imageUrl && (
            <div className="rounded-xl overflow-hidden border border-border">
              <img
                src={song.imageUrl}
                alt={song.title}
                className="w-full h-48 object-cover"
              />
            </div>
          )}

          {/* Metadata badges */}
          <div className="flex flex-wrap gap-2">
            {engineInfo && (
              <Badge variant="outline" className={engineInfo.badgeColor}>
                {engineInfo.label}
              </Badge>
            )}
            {song.genre && (
              <Badge variant="secondary" className="gap-1">
                <Guitar className="w-3 h-3" />
                {song.genre}
              </Badge>
            )}
            {song.mood && (
              <Badge variant="secondary">{song.mood}</Badge>
            )}
            {song.vocalType && song.vocalType !== "none" && (
              <Badge variant="secondary" className="gap-1">
                <Mic className="w-3 h-3" />
                {song.vocalType.charAt(0).toUpperCase() + song.vocalType.slice(1)} Vocals
              </Badge>
            )}
            {song.keySignature && (
              <Badge variant="outline">{song.keySignature}</Badge>
            )}
            {song.timeSignature && (
              <Badge variant="outline" className="gap-1">
                <Clock className="w-3 h-3" />
                {song.timeSignature}
              </Badge>
            )}
            {song.tempo && (
              <Badge variant="outline" className="gap-1">
                <Gauge className="w-3 h-3" />
                {song.tempo} BPM
              </Badge>
            )}
            {song.duration && (
              <Badge variant="outline" className="gap-1">
                <Timer className="w-3 h-3" />
                {formatDuration(song.duration)}
              </Badge>
            )}
          </div>

          {/* Instruments */}
          {song.instruments && song.instruments.length > 0 && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Instruments:</span>{" "}
              {song.instruments.join(", ")}
            </div>
          )}

          {/* Synthesizing indicator */}
          {isSynthesizing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Synthesizing audio...
            </div>
          )}

          {/* Audio Player */}
          {audioUrl && (
            <AudioPlayer src={audioUrl} title={song.title} />
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={handleDownload} disabled={!audioUrl && !audioBlob}>
              <Download className="w-4 h-4 mr-2" />
              Download {song.engine === "free" ? "WAV" : "MP3"}
            </Button>

            {song.abcNotation && song.engine === "free" && (
              <>
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
              </>
            )}

            {song.lyrics && (
              <Button
                variant="outline"
                onClick={() => setShowLyrics(!showLyrics)}
              >
                <FileText className="w-4 h-4 mr-2" />
                {showLyrics ? "Hide" : "View"} Lyrics
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sheet Music */}
      {showSheetMusic && song.abcNotation && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Music className="w-5 h-5 text-primary" />
              Sheet Music
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SheetMusic abcNotation={song.abcNotation} />
          </CardContent>
        </Card>
      )}

      {/* Lyrics */}
      {showLyrics && song.lyrics && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Lyrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm text-foreground leading-relaxed font-sans">
              {song.lyrics}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* CTA */}
      <div className="text-center py-6 space-y-3">
        <p className="text-muted-foreground">Want to create your own music?</p>
        <Button asChild size="lg">
          <Link href="/generate">
            <Sparkles className="w-5 h-5 mr-2" />
            Start Creating
          </Link>
        </Button>
      </div>
    </div>
  );
}
