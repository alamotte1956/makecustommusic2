import type { Express, Request, Response } from "express";
import archiver from "archiver";
import { sdk } from "./_core/sdk";
import { getAlbumById, getAlbumSongs } from "./db";

/**
 * Sanitize a string for use as a filename.
 * Removes or replaces characters that are unsafe in file paths.
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200) || "untitled";
}

/**
 * Register the album ZIP download route on the Express app.
 * GET /api/albums/:albumId/download
 */
export function registerAlbumZipRoute(app: Express) {
  app.get("/api/albums/:albumId/download", async (req: Request, res: Response) => {
    try {
      // Authenticate the user
      let user;
      try {
        user = await sdk.authenticateRequest(req);
      } catch {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const albumId = parseInt(req.params.albumId, 10);
      if (isNaN(albumId)) {
        res.status(400).json({ error: "Invalid album ID" });
        return;
      }

      // Verify album exists and belongs to user
      const album = await getAlbumById(albumId);
      if (!album || album.userId !== user.id) {
        res.status(404).json({ error: "Album not found" });
        return;
      }

      // Get album songs
      const songs = await getAlbumSongs(albumId);
      if (!songs || songs.length === 0) {
        res.status(400).json({ error: "Album has no songs" });
        return;
      }

      // Filter songs that have audio URLs
      const downloadableSongs = songs.filter(
        (s: any) => s.audioUrl || s.mp3Url
      );

      if (downloadableSongs.length === 0) {
        res.status(400).json({ error: "No downloadable songs in this album" });
        return;
      }

      // Set response headers for ZIP download
      const albumName = sanitizeFilename(album.title);
      res.setHeader("Content-Type", "application/zip");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${albumName}.zip"`
      );

      // Create ZIP archive
      const archive = archiver("zip", { zlib: { level: 5 } });

      archive.on("error", (err) => {
        console.error("[AlbumZip] Archive error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to create ZIP" });
        }
      });

      // Pipe archive to response
      archive.pipe(res);

      // Fetch and add each song to the archive
      for (let i = 0; i < downloadableSongs.length; i++) {
        const song = downloadableSongs[i] as any;
        const audioUrl = song.mp3Url || song.audioUrl;
        const trackNum = String(i + 1).padStart(2, "0");
        const songTitle = sanitizeFilename(song.title || `Track ${i + 1}`);
        const filename = `${trackNum} - ${songTitle}.mp3`;

        try {
          const response = await fetch(audioUrl);
          if (!response.ok) {
            console.warn(`[AlbumZip] Failed to fetch ${audioUrl}: ${response.status}`);
            continue;
          }

          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          archive.append(buffer, { name: filename });
        } catch (err) {
          console.warn(`[AlbumZip] Error fetching song ${song.id}:`, err);
          // Skip songs that fail to download
          continue;
        }
      }

      // Finalize the archive
      await archive.finalize();
    } catch (err) {
      console.error("[AlbumZip] Unexpected error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });
}
