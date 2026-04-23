/**
 * Arrangement ZIP Download Route Handler
 * 
 * Registers Express route for downloading arrangement parts as ZIP
 */

import { Express, Request, Response } from "express";
import { ArrangementZipDownload, ArrangementZipOptions } from "./arrangementZipDownload";
import { MelodyLine } from "./multiPartMelodyGenerator";

export function registerArrangementZipRoute(app: Express): void {
  /**
   * POST /api/arrangements/download-zip
   * 
   * Downloads all arrangement parts as a ZIP file
   * 
   * Request body:
   * {
   *   songTitle: string,
   *   composer: string,
   *   arranger?: string,
   *   tempo: number,
   *   keySignature: string,
   *   timeSignature: string,
   *   melodyLines: MelodyLine[]
   * }
   */
  app.post("/api/arrangements/download-zip", async (req: Request, res: Response) => {
    try {
      const {
        songTitle,
        composer,
        arranger,
        tempo,
        keySignature,
        timeSignature,
        melodyLines
      } = req.body;

      // Validate required fields
      if (!songTitle || !composer || !tempo || !keySignature || !timeSignature) {
        return res.status(400).json({
          error: "Missing required fields: songTitle, composer, tempo, keySignature, timeSignature"
        });
      }

      if (!Array.isArray(melodyLines) || melodyLines.length === 0) {
        return res.status(400).json({
          error: "melodyLines must be a non-empty array"
        });
      }

      // Prepare options
      const options: ArrangementZipOptions = {
        songTitle,
        composer,
        arranger,
        tempo,
        keySignature,
        timeSignature
      };

      // Generate and stream ZIP
      console.log(`Generating ZIP for arrangement: ${songTitle}`);
      await ArrangementZipDownload.downloadArrangementPartsAsZip(
        res,
        melodyLines as MelodyLine[],
        options
      );
    } catch (error) {
      console.error("Error in arrangement ZIP route:", error);
      if (!res.headersSent) {
        res.status(500).json({
          error: error instanceof Error ? error.message : "Failed to create ZIP file"
        });
      }
    }
  });

  console.log("Arrangement ZIP download route registered at /api/arrangements/download-zip");
}
