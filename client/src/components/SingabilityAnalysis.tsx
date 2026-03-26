import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Loader2, BarChart3, Mic2, Music2, Heart, Users, Sparkles,
  CheckCircle2, Lightbulb, ChevronDown, ChevronUp
} from "lucide-react";
import { toast } from "sonner";

interface SingabilityScore {
  overall: number;
  melodicFlow: number;
  rhymeScheme: number;
  syllableBalance: number;
  emotionalArc: number;
  worshipReadiness: number;
  hookStrength: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  rhymeMap: { section: string; scheme: string }[];
}

function getScoreColor(score: number): string {
  if (score >= 90) return "text-emerald-500";
  if (score >= 75) return "text-green-500";
  if (score >= 60) return "text-yellow-500";
  if (score >= 40) return "text-orange-500";
  return "text-red-500";
}

function getScoreLabel(score: number): string {
  if (score >= 90) return "Exceptional";
  if (score >= 75) return "Strong";
  if (score >= 60) return "Good";
  if (score >= 40) return "Developing";
  return "Needs Work";
}

function getProgressColor(score: number): string {
  if (score >= 90) return "bg-emerald-500";
  if (score >= 75) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  if (score >= 40) return "bg-orange-500";
  return "bg-red-500";
}

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 90 ? "#10b981" : score >= 75 ? "#22c55e" : score >= 60 ? "#eab308" : score >= 40 ? "#f97316" : "#ef4444";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{getScoreLabel(score)}</span>
      </div>
    </div>
  );
}

function ScoreBar({ label, score, icon }: { label: string; score: number; icon: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5">
          {icon}
          <span className="font-medium">{label}</span>
        </div>
        <span className={`font-semibold ${getScoreColor(score)}`}>{score}</span>
      </div>
      <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${getProgressColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export default function SingabilityAnalysis({ songId, hasLyrics }: { songId: number; hasLyrics: boolean }) {
  const [analysis, setAnalysis] = useState<SingabilityScore | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const analyzeMutation = trpc.songs.analyzeSingability.useMutation({
    onSuccess: (data) => {
      setAnalysis(data);
      toast.success("Singability analysis complete!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to analyze singability");
    },
  });

  if (!hasLyrics) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-2">
        <BarChart3 className="w-12 h-12 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No lyrics available to analyze.</p>
        <p className="text-xs text-muted-foreground">
          Generate a song with lyrics first to use the singability analyzer.
        </p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <BarChart3 className="w-8 h-8 text-primary" />
        </div>
        <div className="text-center space-y-2 max-w-md">
          <h3 className="text-lg font-semibold">Singability Analysis</h3>
          <p className="text-sm text-muted-foreground">
            Our AI analyzes your lyrics for melodic flow, rhyme quality, syllable balance,
            emotional arc, worship readiness, and hook strength — giving you a detailed
            singability score with actionable improvement suggestions.
          </p>
        </div>
        <Button
          onClick={() => analyzeMutation.mutate({ songId })}
          disabled={analyzeMutation.isPending}
          size="lg"
          className="gap-2"
        >
          {analyzeMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Analyze Singability
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Score + Summary */}
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <ScoreRing score={analysis.overall} />
        <div className="flex-1 space-y-2 text-center sm:text-left">
          <h3 className="text-lg font-semibold">Overall Singability</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{analysis.summary}</p>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="grid gap-3">
        <ScoreBar label="Melodic Flow" score={analysis.melodicFlow} icon={<Music2 className="w-3.5 h-3.5 text-blue-500" />} />
        <ScoreBar label="Rhyme Scheme" score={analysis.rhymeScheme} icon={<Mic2 className="w-3.5 h-3.5 text-purple-500" />} />
        <ScoreBar label="Syllable Balance" score={analysis.syllableBalance} icon={<BarChart3 className="w-3.5 h-3.5 text-cyan-500" />} />
        <ScoreBar label="Emotional Arc" score={analysis.emotionalArc} icon={<Heart className="w-3.5 h-3.5 text-rose-500" />} />
        <ScoreBar label="Worship Readiness" score={analysis.worshipReadiness} icon={<Users className="w-3.5 h-3.5 text-amber-500" />} />
        <ScoreBar label="Hook Strength" score={analysis.hookStrength} icon={<Sparkles className="w-3.5 h-3.5 text-emerald-500" />} />
      </div>

      {/* Expandable Details */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowDetails(!showDetails)}
        className="w-full gap-1.5"
      >
        {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {showDetails ? "Hide Details" : "Show Strengths, Suggestions & Rhyme Map"}
      </Button>

      {showDetails && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Strengths */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-semibold">Strengths</span>
              </div>
              <ul className="space-y-2">
                {analysis.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-emerald-500 mt-0.5 shrink-0">+</span>
                    {s}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Improvements */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold">Suggestions for Improvement</span>
              </div>
              <ul className="space-y-2">
                {analysis.improvements.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-amber-500 mt-0.5 shrink-0">→</span>
                    {s}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Rhyme Map */}
          {analysis.rhymeMap.length > 0 && (
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Mic2 className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-semibold">Rhyme Scheme Map</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {analysis.rhymeMap.map((r, i) => (
                    <Badge key={i} variant="secondary" className="gap-1.5 text-xs">
                      <span className="font-medium">{r.section}:</span>
                      <span className="font-mono">{r.scheme}</span>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Re-analyze button */}
      <div className="flex justify-center pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => analyzeMutation.mutate({ songId })}
          disabled={analyzeMutation.isPending}
          className="gap-1.5"
        >
          {analyzeMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          Re-analyze
        </Button>
      </div>
    </div>
  );
}
