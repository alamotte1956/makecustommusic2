/**
 * Arrangement Streaming Service
 * 
 * Provides real-time streaming updates for arrangement generation
 * using Server-Sent Events (SSE) for live progress tracking.
 */

import { MelodyLine } from "./multiPartMelodyGenerator";
import { ArrangementPart } from "./arrangementAnalyzer";

export interface StreamingProgress {
  type: "progress" | "part_generated" | "complete" | "error";
  timestamp: number;
  data: {
    currentPart?: number;
    totalParts?: number;
    partName?: string;
    partType?: "vocal" | "instrument";
    percentage?: number;
    message?: string;
    melodyLine?: MelodyLine;
    error?: string;
  };
}

export class ArrangementStreamingService {
  private static activeStreams = new Map<string, NodeJS.Timeout[]>();

  /**
   * Create a streaming generator for arrangement parts
   */
  static async* generateArrangementStream(
    songTitle: string,
    mainMelody: string,
    chordProgression: string,
    tempo: number,
    keySignature: string,
    timeSignature: string,
    arrangementParts: ArrangementPart[],
    lyrics?: string
  ): AsyncGenerator<StreamingProgress> {
    const totalParts = arrangementParts.length;
    let currentPartIndex = 0;

    try {
      // Initial progress
      yield {
        type: "progress",
        timestamp: Date.now(),
        data: {
          currentPart: 0,
          totalParts,
          percentage: 0,
          message: `Starting arrangement generation for ${songTitle}...`
        }
      };

      // Generate each part with streaming updates
      for (const part of arrangementParts) {
        currentPartIndex++;
        const percentage = Math.round((currentPartIndex / totalParts) * 100);

        // Send part generation started
        yield {
          type: "progress",
          timestamp: Date.now(),
          data: {
            currentPart: currentPartIndex,
            totalParts,
            partName: part.name,
            partType: part.type,
            percentage,
            message: `Generating ${part.name}...`
          }
        };

        try {
          // Simulate generation with delays for demo
          // In production, this would call the actual melody generator
          const melodyLine = await this.generatePartWithProgress(
            part,
            mainMelody,
            chordProgression,
            tempo,
            keySignature,
            timeSignature,
            lyrics
          );

          // Send part completed
          yield {
            type: "part_generated",
            timestamp: Date.now(),
            data: {
              currentPart: currentPartIndex,
              totalParts,
              partName: part.name,
              partType: part.type,
              percentage,
              message: `${part.name} generated successfully`,
              melodyLine
            }
          };
        } catch (error) {
          yield {
            type: "error",
            timestamp: Date.now(),
            data: {
              currentPart: currentPartIndex,
              totalParts,
              partName: part.name,
              percentage,
              message: `Error generating ${part.name}`,
              error: error instanceof Error ? error.message : "Unknown error"
            }
          };
        }
      }

      // Final completion
      yield {
        type: "complete",
        timestamp: Date.now(),
        data: {
          currentPart: totalParts,
          totalParts,
          percentage: 100,
          message: "Arrangement generation complete!"
        }
      };
    } catch (error) {
      yield {
        type: "error",
        timestamp: Date.now(),
        data: {
          message: "Arrangement generation failed",
          error: error instanceof Error ? error.message : "Unknown error"
        }
      };
    }
  }

  /**
   * Generate a single part with progress simulation
   */
  private static async generatePartWithProgress(
    part: ArrangementPart,
    mainMelody: string,
    chordProgression: string,
    tempo: number,
    keySignature: string,
    timeSignature: string,
    lyrics?: string
  ): Promise<MelodyLine> {
    // Simulate generation delay (1-3 seconds per part)
    const delay = Math.random() * 2000 + 1000;
    await new Promise(resolve => setTimeout(resolve, delay));

    // Return a generated melody line
    return {
      partName: part.name,
      partType: part.type,
      voiceType: part.voiceType,
      clef: part.clef,
      range: part.range,
      abcNotation: this.generateSampleAbc(part, keySignature, timeSignature),
      description: part.description
    };
  }

  /**
   * Generate sample ABC notation for demonstration
   */
  private static generateSampleAbc(
    part: ArrangementPart,
    keySignature: string,
    timeSignature: string
  ): string {
    const key = keySignature.split(" ")[0].toLowerCase();
    const meter = timeSignature || "4/4";

    if (part.type === "vocal") {
      return `X:1
T:${part.name}
M:${meter}
L:1/4
K:${key}
c2 d2 | e2 f2 | g2 a2 | b2 c'2 |
c'2 b2 | a2 g2 | f2 e2 | d2 c2 |]`;
    } else {
      return `X:1
T:${part.name}
M:${meter}
L:1/4
K:${key}
C2 D2 | E2 F2 | G2 A2 | B2 c2 |
c2 B2 | A2 G2 | F2 E2 | D2 C2 |]`;
    }
  }

  /**
   * Register a streaming session
   */
  static registerStream(streamId: string, timeouts: NodeJS.Timeout[]): void {
    this.activeStreams.set(streamId, timeouts);
  }

  /**
   * Unregister a streaming session and clean up
   */
  static unregisterStream(streamId: string): void {
    const timeouts = this.activeStreams.get(streamId);
    if (timeouts) {
      timeouts.forEach(timeout => clearTimeout(timeout));
      this.activeStreams.delete(streamId);
    }
  }

  /**
   * Get active stream count
   */
  static getActiveStreamCount(): number {
    return this.activeStreams.size;
  }
}

export default ArrangementStreamingService;
