/**
 * Arrangement Preview Component
 * 
 * Real-time preview of arrangement generation with live progress updates
 * and streaming sheet music preview for each part.
 */

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Music, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface ArrangementPart {
  name: string;
  type: "vocal" | "instrument";
  status: "pending" | "generating" | "complete" | "error";
  percentage: number;
  abcNotation?: string;
  error?: string;
}

interface ArrangementPreviewProps {
  songTitle: string;
  genre: string;
  mood: string;
  tempo: number;
  keySignature: string;
  timeSignature?: string;
  onComplete?: (parts: ArrangementPart[]) => void;
  onError?: (error: string) => void;
}

export const ArrangementPreview: React.FC<ArrangementPreviewProps> = ({
  songTitle,
  genre,
  mood,
  tempo,
  keySignature,
  timeSignature = "4/4",
  onComplete,
  onError
}) => {
  const [parts, setParts] = useState<ArrangementPart[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [isStreaming, setIsStreaming] = useState(true);
  const [message, setMessage] = useState("Starting arrangement generation...");
  const eventSourceRef = useRef<EventSource | null>(null);
  const [expandedPart, setExpandedPart] = useState<string | null>(null);

  useEffect(() => {
    const streamArrangement = async () => {
      try {
        // Build query parameters
        const params = new URLSearchParams({
          songTitle,
          genre,
          mood,
          tempo: String(tempo),
          keySignature,
          timeSignature
        });

        // Connect to SSE endpoint
        const eventSource = new EventSource(`/api/stream/arrangement?${params}`);
        eventSourceRef.current = eventSource;

        eventSource.addEventListener("message", (event) => {
          try {
            const progress = JSON.parse(event.data);

            if (progress.type === "progress") {
              setMessage(progress.data.message || "Generating...");
              setOverallProgress(progress.data.percentage || 0);
            } else if (progress.type === "part_generated") {
              const { partName, partType, percentage, melodyLine } = progress.data;

              setParts((prevParts) => {
                const existingPart = prevParts.find((p) => p.name === partName);
                if (existingPart) {
                  return prevParts.map((p) =>
                    p.name === partName
                      ? {
                          ...p,
                          status: "complete",
                          percentage: 100,
                          abcNotation: melodyLine?.abcNotation
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
                      abcNotation: melodyLine?.abcNotation
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
                    p.name === partName
                      ? {
                          ...p,
                          status: "error",
                          error
                        }
                      : p
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

              if (onError) {
                onError(error || "Unknown error");
              }
            } else if (progress.type === "complete") {
              setIsStreaming(false);
              setMessage("Arrangement generation complete!");
              setOverallProgress(100);

              if (onComplete) {
                onComplete(parts);
              }
            }
          } catch (parseError) {
            console.error("Error parsing SSE message:", parseError);
          }
        });

        eventSource.addEventListener("error", (error) => {
          console.error("SSE error:", error);
          setIsStreaming(false);
          setMessage("Connection error during streaming");

          if (onError) {
            onError("Connection error during streaming");
          }

          eventSource.close();
        });

        eventSource.addEventListener("complete", () => {
          setIsStreaming(false);
          eventSource.close();
        });
      } catch (error) {
        console.error("Error starting arrangement stream:", error);
        setIsStreaming(false);
        setMessage("Error starting arrangement generation");

        if (onError) {
          onError(error instanceof Error ? error.message : "Unknown error");
        }
      }
    };

    streamArrangement();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [songTitle, genre, mood, tempo, keySignature, timeSignature, onComplete, onError]);

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Arrangement Preview
          </CardTitle>
          <CardDescription>
            {songTitle} • {genre} • {mood}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Overall Progress</CardTitle>
              <CardDescription>{message}</CardDescription>
            </div>
            {isStreaming && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={overallProgress} className="h-2" />
          <div className="text-sm text-muted-foreground text-right">
            {overallProgress}% complete
          </div>
        </CardContent>
      </Card>

      {/* Parts List */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Arrangement Parts</h3>

        {parts.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              Waiting for arrangement parts...
            </CardContent>
          </Card>
        ) : (
          parts.map((part) => (
            <Card
              key={part.name}
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() =>
                setExpandedPart(expandedPart === part.name ? null : part.name)
              }
            >
              <CardContent className="pt-6">
                {/* Part Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    {part.status === "complete" && (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                    {part.status === "generating" && (
                      <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                    )}
                    {part.status === "error" && (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                    {part.status === "pending" && (
                      <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                    )}

                    <div className="flex-1">
                      <div className="font-medium">{part.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {part.type === "vocal" ? "Vocal" : "Instrument"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        part.status === "complete"
                          ? "default"
                          : part.status === "error"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {part.status === "complete" && "Done"}
                      {part.status === "generating" && "Generating"}
                      {part.status === "error" && "Error"}
                      {part.status === "pending" && "Pending"}
                    </Badge>
                  </div>
                </div>

                {/* Progress Bar */}
                {part.status !== "complete" && part.status !== "error" && (
                  <Progress value={part.percentage} className="h-1 mb-3" />
                )}

                {/* Error Message */}
                {part.status === "error" && part.error && (
                  <div className="text-xs text-red-500 mb-3">{part.error}</div>
                )}

                {/* Expanded ABC Preview */}
                {expandedPart === part.name && part.abcNotation && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-xs font-semibold mb-2">ABC Notation:</div>
                    <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-40 font-mono">
                      {part.abcNotation}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Summary */}
      {!isStreaming && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{parts.length}</div>
                <div className="text-xs text-muted-foreground">Total Parts</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {parts.filter((p) => p.status === "complete").length}
                </div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {parts.filter((p) => p.status === "error").length}
                </div>
                <div className="text-xs text-muted-foreground">Errors</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ArrangementPreview;
