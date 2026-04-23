/**
 * Arrangement Streaming Endpoint
 * 
 * Express endpoint for Server-Sent Events (SSE) streaming
 * of real-time arrangement generation progress.
 */

import { Router, Request, Response } from "express";
import ArrangementStreamingService from "./arrangementStreamingService";

export const createArrangementStreamingRouter = () => {
  const router = Router();

  /**
   * SSE endpoint for streaming arrangement generation
   * GET /api/stream/arrangement
   * 
   * Query parameters:
   * - songTitle: string
   * - genre: string
   * - mood: string
   * - tempo: number
   * - keySignature: string
   * - timeSignature: string (optional, default "4/4")
   * - lyrics: string (optional)
   */
  router.get("/arrangement", async (req: Request, res: Response) => {
    const {
      songTitle,
      genre,
      mood,
      tempo,
      keySignature,
      timeSignature = "4/4",
      lyrics
    } = req.query;

    // Validate required parameters
    if (!songTitle || !genre || !mood || !tempo || !keySignature) {
      return res.status(400).json({
        error: "Missing required parameters: songTitle, genre, mood, tempo, keySignature"
      });
    }

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timeouts: NodeJS.Timeout[] = [];

    // Register stream
    ArrangementStreamingService.registerStream(streamId, timeouts);

    // Send initial connection message
    res.write(`:connected\n\n`);

    try {
      // Generate arrangement parts with streaming
      const generator = ArrangementStreamingService.generateArrangementStream(
        String(songTitle),
        "", // mainMelody - would be provided in real scenario
        "", // chordProgression - would be provided in real scenario
        Number(tempo),
        String(keySignature),
        String(timeSignature),
        [], // arrangementParts - would be provided in real scenario
        lyrics ? String(lyrics) : undefined
      );

      // Stream each progress update
      for await (const progress of generator) {
        const data = JSON.stringify(progress);
        res.write(`data: ${data}\n\n`);

        // Allow client to close connection gracefully
        if (req.socket.destroyed) {
          break;
        }
      }

      // Send completion event
      res.write(`event: complete\ndata: {}\n\n`);
    } catch (error) {
      console.error("Error in arrangement streaming:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.write(`event: error\ndata: ${JSON.stringify({ error: errorMessage })}\n\n`);
    } finally {
      // Clean up
      ArrangementStreamingService.unregisterStream(streamId);
      res.end();
    }
  });

  /**
   * Health check endpoint for streaming service
   * GET /api/stream/health
   */
  router.get("/health", (req: Request, res: Response) => {
    res.json({
      status: "ok",
      activeStreams: ArrangementStreamingService.getActiveStreamCount(),
      timestamp: new Date().toISOString()
    });
  });

  return router;
};

export default createArrangementStreamingRouter;
