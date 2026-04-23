/**
 * Enhanced Arrangement Preview Component
 * 
 * Real-time preview with animations, visual feedback, and WebSocket support
 */

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Music, CheckCircle2, AlertCircle, Loader2, Zap, Volume2 } from "lucide-react";

interface ArrangementPart {
  name: string;
  type: "vocal" | "instrument";
  status: "pending" | "generating" | "complete" | "error";
  percentage: number;
  abcNotation?: string;
  error?: string;
  completedAt?: number;
}

interface ArrangementPreviewEnhancedProps {
  songTitle: string;
  genre: string;
  mood: string;
  tempo: number;
  keySignature: string;
  timeSignature?: string;
  useWebSocket?: boolean;
  onComplete?: (parts: ArrangementPart[]) => void;
  onError?: (error: string) => void;
}

export const ArrangementPreviewEnhanced: React.FC<ArrangementPreviewEnhancedProps> = ({
  songTitle,
  genre,
  mood,
  tempo,
  keySignature,
  timeSignature = "4/4",
  useWebSocket = false,
  onComplete,
  onError
}) => {
  const [parts, setParts] = useState<ArrangementPart[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [isStreaming, setIsStreaming] = useState(true);
  const [message, setMessage] = useState("Starting arrangement generation...");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const startTimeRef = useRef(Date.now());
  const [expandedPart, setExpandedPart] = useState<string | null>(null);
  const [animatingParts, setAnimatingParts] = useState<Set<string>>(new Set());

  // Update elapsed time
  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsedTime(elapsed);

      // Estimate time remaining
      if (overallProgress > 0 && overallProgress < 100) {
        const estimatedTotal = (elapsed / overallProgress) * 100;
        const remaining = Math.ceil(estimatedTotal - elapsed);
        setEstimatedTimeRemaining(Math.max(0, remaining));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [overallProgress]);

  useEffect(() => {
    if (useWebSocket) {
      connectWebSocket();
    } else {
      connectSSE();
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [songTitle, genre, mood, tempo, keySignature, timeSignature, useWebSocket]);

  const connectSSE = async () => {
    try {
      const params = new URLSearchParams({
        songTitle,
        genre,
        mood,
        tempo: String(tempo),
        keySignature,
        timeSignature
      });

      const eventSource = new EventSource(`/api/stream/arrangement?${params}`);
      eventSourceRef.current = eventSource;

      eventSource.addEventListener("message", (event) => {
        handleStreamUpdate(JSON.parse(event.data));
      });

      eventSource.addEventListener("error", () => {
        setIsStreaming(false);
        setMessage("Connection error");
        if (onError) onError("Connection error");
        eventSource.close();
      });
    } catch (error) {
      setIsStreaming(false);
      setMessage("Error starting stream");
      if (onError) onError(error instanceof Error ? error.message : "Unknown error");
    }
  };

  const connectWebSocket = async () => {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws/arrangement`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        // Subscribe to stream
        ws.send(JSON.stringify({
          type: "subscribe",
          streamId: `arrangement_${Date.now()}`
        }));
      };

      ws.onmessage = (event) => {
        handleStreamUpdate(JSON.parse(event.data));
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsStreaming(false);
        setMessage("WebSocket connection error");
        if (onError) onError("WebSocket connection error");
      };

      ws.onclose = () => {
        console.log("WebSocket closed");
      };
    } catch (error) {
      setIsStreaming(false);
      setMessage("Error connecting WebSocket");
      if (onError) onError(error instanceof Error ? error.message : "Unknown error");
    }
  };

  const handleStreamUpdate = (progress: any) => {
    if (progress.type === "progress") {
      setMessage(progress.data.message || "Generating...");
      setOverallProgress(progress.data.percentage || 0);
    } else if (progress.type === "part_generated") {
      const { partName, partType, percentage, melodyLine } = progress.data;

      // Add animation
      setAnimatingParts((prev) => new Set(prev).add(partName));
      setTimeout(() => {
        setAnimatingParts((prev) => {
          const next = new Set(prev);
          next.delete(partName);
          return next;
        });
      }, 600);

      setParts((prevParts) => {
        const existingPart = prevParts.find((p) => p.name === partName);
        if (existingPart) {
          return prevParts.map((p) =>
            p.name === partName
              ? {
                  ...p,
                  status: "complete",
                  percentage: 100,
                  abcNotation: melodyLine?.abcNotation,
                  completedAt: Date.now()
                }
              : p
          );
        } else {
          return [
            ...prevParts,
            {
              name: partName,
              type: partType,
              status: "complete",
              percentage: 100,
              abcNotation: melodyLine?.abcNotation,
              completedAt: Date.now()
            }
          ];
        }
      });

      setOverallProgress(percentage || 0);
    } else if (progress.type === "error") {
      const { partName, error } = progress.data;
      setParts((prevParts) => {
        const existingPart = prevParts.find((p) => p.name === partName);
        if (existingPart) {
          return prevParts.map((p) =>
            p.name === partName ? { ...p, status: "error", error } : p
          );
        } else {
          return [
            ...prevParts,
            {
              name: partName,
              type: "instrument",
              status: "error",
              percentage: 0,
              error
            }
          ];
        }
      });

      if (onError) onError(error || "Unknown error");
    } else if (progress.type === "complete") {
      setIsStreaming(false);
      setMessage("✨ Arrangement generation complete!");
      setOverallProgress(100);

      if (onComplete) {
        onComplete(parts);
      }
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full space-y-6">
      {/* Header with Metadata */}
      <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950 border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Music className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            Arrangement Preview
          </CardTitle>
          <CardDescription className="text-sm">
            {songTitle} • {genre} • {mood} • {tempo} BPM • {keySignature}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Overall Progress with Timing */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{message}</CardTitle>
              <CardDescription className="mt-1">
                Elapsed: {formatTime(elapsedTime)}
                {estimatedTimeRemaining !== null && (
                  <span className="ml-4">
                    Estimated remaining: {formatTime(estimatedTimeRemaining)}
                  </span>
                )}
              </CardDescription>
            </div>
            {isStreaming && (
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500 animate-pulse" />
                <span className="text-sm font-medium">Live</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={overallProgress} className="h-3" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{overallProgress}% complete</span>
            <span>
              {parts.filter((p) => p.status === "complete").length} / {parts.length} parts
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Parts Grid */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Volume2 className="h-4 w-4" />
          Arrangement Parts
        </h3>

        {parts.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 opacity-50" />
              Waiting for arrangement parts...
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {parts.map((part) => (
              <Card
                key={part.name}
                className={`cursor-pointer transition-all ${
                  animatingParts.has(part.name)
                    ? "ring-2 ring-green-400 scale-102"
                    : "hover:bg-accent"
                } ${expandedPart === part.name ? "ring-2 ring-primary" : ""}`}
                onClick={() =>
                  setExpandedPart(expandedPart === part.name ? null : part.name)
                }
              >
                <CardContent className="pt-6">
                  {/* Part Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      {part.status === "complete" && (
                        <div className="relative">
                          <CheckCircle2 className="h-5 w-5 text-green-500 animate-bounce" />
                        </div>
                      )}
                      {part.status === "generating" && (
                        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                      )}
                      {part.status === "error" && (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                      {part.status === "pending" && (
                        <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 animate-pulse" />
                      )}

                      <div className="flex-1">
                        <div className="font-medium">{part.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {part.type === "vocal" ? "🎤 Vocal" : "🎸 Instrument"}
                        </div>
                      </div>
                    </div>

                    <Badge
                      variant={
                        part.status === "complete"
                          ? "default"
                          : part.status === "error"
                            ? "destructive"
                            : "secondary"
                      }
                      className="animate-pulse"
                    >
                      {part.status === "complete" && "✓ Done"}
                      {part.status === "generating" && "⏳ Generating"}
                      {part.status === "error" && "✕ Error"}
                      {part.status === "pending" && "○ Pending"}
                    </Badge>
                  </div>

                  {/* Progress Bar */}
                  {part.status !== "complete" && part.status !== "error" && (
                    <Progress value={part.percentage} className="h-1 mb-3" />
                  )}

                  {/* Error Message */}
                  {part.status === "error" && part.error && (
                    <div className="text-xs text-red-500 mb-3 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {part.error}
                    </div>
                  )}

                  {/* Expanded ABC Preview */}
                  {expandedPart === part.name && part.abcNotation && (
                    <div className="mt-4 pt-4 border-t animate-in fade-in slide-in-from-top-2">
                      <div className="text-xs font-semibold mb-2">ABC Notation:</div>
                      <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-40 font-mono border border-muted-foreground/20">
                        {part.abcNotation}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {!isStreaming && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {parts.length}
                </div>
                <div className="text-xs text-muted-foreground">Total Parts</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {parts.filter((p) => p.status === "complete").length}
                </div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {parts.filter((p) => p.status === "error").length}
                </div>
                <div className="text-xs text-muted-foreground">Errors</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {formatTime(elapsedTime)}
                </div>
                <div className="text-xs text-muted-foreground">Total Time</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ArrangementPreviewEnhanced;
