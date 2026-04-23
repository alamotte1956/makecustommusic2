/**
 * Arrangement Parts Panel Component
 * Displays multi-part arrangement with real-time preview and PDF export
 */

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Music, Loader2, Download, Music2, Zap, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import InstrumentationCustomizer, { InstrumentationConfig } from "./InstrumentationCustomizer";

interface ArrangementPartsPanelProps {
  songId: number;
  songTitle: string;
}

export default function ArrangementPartsPanel({ songId, songTitle }: ArrangementPartsPanelProps) {
  const { data: song } = trpc.songs.getById.useQuery({ id: songId });
  const [isGenerating, setIsGenerating] = useState(false);
  const [arrangementAnalysis, setArrangementAnalysis] = useState<any>(null);
  const [generatedMelodies, setGeneratedMelodies] = useState<any>(null);
  const [instrumentationConfig, setInstrumentationConfig] = useState<InstrumentationConfig | null>(null);

  const analyzeSongMutation = trpc.arrangement.analyzeSong.useMutation({
    onSuccess: (data: any) => {
      if (data.success) {
        setArrangementAnalysis(data.analysis);
        toast.success("Song analyzed! Generating melodies...");
        // Proceed to generate melodies
        generateMelodies(data.analysis);
      } else {
        toast.error(data.error || "Failed to analyze song");
        setIsGenerating(false);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to analyze song");
      setIsGenerating(false);
    },
  });

  const generateMelodiesMutation = trpc.arrangement.generateMultiPartMelodies.useMutation({
    onSuccess: (data: any) => {
      if (data.success) {
        setGeneratedMelodies(data.melodyLines);
        toast.success("Arrangement parts generated successfully!");
        setIsGenerating(false);
      } else {
        toast.error(data.error || "Failed to generate melodies");
        setIsGenerating(false);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to generate melodies");
      setIsGenerating(false);
    },
  });

  const generateMelodies = (analysis: any) => {
    if (!song) return;

    // Filter parts based on instrumentation config
    let partsToUse = analysis.parts || [];
    if (instrumentationConfig) {
      partsToUse = partsToUse.filter(
        (part: any) => instrumentationConfig.parts[part.name]?.enabled
      );
    }

    generateMelodiesMutation.mutate({
      songTitle: song.title,
      mainMelody: "C D E F G A B C", // Placeholder - would come from song data
      chordProgression: song.chordProgression ? JSON.stringify(song.chordProgression) : "C F G C",
      tempo: song.tempo || 120,
      keySignature: song.keySignature || "C",
      timeSignature: song.timeSignature || "4/4",
      arrangementParts: partsToUse,
      lyrics: song.lyrics || undefined,
    });
  };

  const handleGenerateArrangement = async () => {
    if (!song) return;

    setIsGenerating(true);

    // Step 1: Analyze the song
    analyzeSongMutation.mutate({
      songTitle: song.title,
      genre: song.genre || "Pop",
      mood: song.mood || "Uplifting",
      tempo: song.tempo || 120,
      keySignature: song.keySignature || "C",
      timeSignature: song.timeSignature || "4/4",
      lyrics: song.lyrics || undefined,
    });
  };

  const handleInstrumentationConfirm = (config: InstrumentationConfig) => {
    setInstrumentationConfig(config);
    setIsGenerating(true);

    // Step 1: Analyze the song
    analyzeSongMutation.mutate({
      songTitle: song?.title || "Untitled",
      genre: song?.genre || "Pop",
      mood: song?.mood || "Uplifting",
      tempo: song?.tempo || 120,
      keySignature: song?.keySignature || "C",
      timeSignature: song?.timeSignature || "4/4",
      lyrics: song?.lyrics || undefined,
    });
  };

  if (!song) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Music2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <h3 className="text-lg font-semibold">Multi-Part Arrangement</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Generate individual sheet music parts for each instrument and vocal harmony in your song.
        </p>
      </div>

      {/* Generate Button */}
      {!arrangementAnalysis && (
        <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950 border-purple-200 dark:border-purple-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Ready to create arrangement parts?</p>
                <p className="text-sm text-muted-foreground">
                  Generate separate sheet music for Lead Vocal, Harmonies, Piano, Guitar, Bass, and Drums.
                </p>
              </div>
              <div className="flex gap-2">
                <InstrumentationCustomizer
                  onConfirm={handleInstrumentationConfirm}
                  isLoading={isGenerating}
                />
                <Button
                  onClick={handleGenerateArrangement}
                  disabled={isGenerating}
                  size="lg"
                  className="gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Generate Arrangement
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {arrangementAnalysis && (
        <div className="space-y-4">
          <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Music className="h-4 w-4" />
                ✓ Arrangement Analysis Complete
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {arrangementAnalysis.instrumentCount || 0} instruments and {arrangementAnalysis.vocalPartCount || 0} vocal parts identified.
              </p>
            </CardContent>
          </Card>

          {generatedMelodies && (
            <div className="space-y-3">
              <h4 className="font-semibold">Generated Parts</h4>
              {generatedMelodies.map((part: any, idx: number) => (
                <Card key={idx} className="hover:bg-accent transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{part.partName}</p>
                        <p className="text-xs text-muted-foreground">
                          {part.partType === "vocal" ? "🎤 Vocal" : "🎸 Instrument"}
                        </p>
                      </div>
                      <Badge variant="default" className="bg-green-600">
                        ✓ Ready
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Music className="h-4 w-4" />
            About Arrangement Parts
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <p>
            Each part is generated as a separate PDF file, perfect for distributing to musicians in your band or choir.
          </p>
          <p>
            Parts include: Lead Vocal, Alto Harmony, Tenor Harmony, Bass Harmony, Piano, Guitar, Bass Guitar, and Drums.
          </p>
          <p>
            All parts are transposed to the same key and tempo, making them easy to play together.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
