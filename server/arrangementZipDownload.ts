/**
 * Arrangement ZIP Download Handler
 * 
 * Generates and streams a ZIP file containing individual PDFs
 * for each arrangement part, ready for distribution to musicians.
 */

import { Response } from "express";
import archiver from "archiver";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { MelodyLine } from "./multiPartMelodyGenerator";
import MultiPartPdfExporter, { PartPdfOptions } from "./multiPartPdfExporter";

export interface ArrangementZipOptions {
  songTitle: string;
  composer: string;
  arranger?: string;
  tempo: number;
  keySignature: string;
  timeSignature: string;
}

export class ArrangementZipDownload {
  /**
   * Generate and stream a ZIP file containing all arrangement parts as PDFs
   */
  static async downloadArrangementPartsAsZip(
    res: Response,
    melodyLines: MelodyLine[],
    options: ArrangementZipOptions
  ): Promise<void> {
    try {
      // Create temporary directory for PDFs
      const tempDir = path.join(os.tmpdir(), `arrangement-${Date.now()}`);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Generate PDFs for all parts
      const pdfOptions: PartPdfOptions = {
        title: options.songTitle,
        composer: options.composer,
        arranger: options.arranger,
        tempo: options.tempo,
        keySignature: options.keySignature,
        timeSignature: options.timeSignature,
        includePageNumbers: true,
        includeHeaderFooter: true
      };

      console.log(`Generating PDFs for ${melodyLines.length} arrangement parts...`);
      const fileMap = await MultiPartPdfExporter.exportAllPartsPdf(
        melodyLines,
        pdfOptions,
        tempDir
      );

      if (fileMap.size === 0) {
        throw new Error("No PDF files were generated");
      }

      console.log(`Generated ${fileMap.size} PDF files, creating ZIP...`);

      // Create ZIP archive
      const archive = archiver("zip", {
        zlib: { level: 9 } // Maximum compression
      });

      // Set response headers
      const zipFileName = this.sanitizeFileName(`${options.songTitle} - Arrangement Parts.zip`);
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${zipFileName}"`);
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      // Pipe archive to response
      archive.pipe(res);

      // Add each PDF to the archive
      const entries = Array.from(fileMap.entries());
      for (const [partName, filePath] of entries) {
        if (fs.existsSync(filePath)) {
          const fileName = path.basename(filePath);
          archive.file(filePath, { name: fileName });
          console.log(`Added ${fileName} to ZIP`);
        }
      }

      // Handle archive events
      archive.on("error", (err: Error) => {
        console.error("Archive error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to create ZIP file" });
        }
      });

      res.on("error", (err: Error) => {
        console.error("Response error:", err);
        archive.destroy();
      });

      // Finalize archive
      archive.on("finish", () => {
        console.log(`ZIP file created successfully (${archive.pointer()} bytes)`);
        
        // Clean up temporary files after a delay
        setTimeout(() => {
          this.cleanupTempDir(tempDir);
        }, 5000);
      });

      await archive.finalize();
    } catch (error) {
      console.error("Error creating arrangement ZIP:", error);
      if (!res.headersSent) {
        res.status(500).json({
          error: error instanceof Error ? error.message : "Failed to create ZIP file"
        });
      }
    }
  }

  /**
   * Sanitize filename to prevent directory traversal and special characters
   */
  private static sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[/\\?%*:|"<>]/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 255);
  }

  /**
   * Clean up temporary directory and files
   */
  private static cleanupTempDir(dirPath: string): void {
    try {
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          const filePath = path.join(dirPath, file);
          fs.unlinkSync(filePath);
        }
        fs.rmdirSync(dirPath);
        console.log(`Cleaned up temporary directory: ${dirPath}`);
      }
    } catch (error) {
      console.error(`Error cleaning up temporary directory ${dirPath}:`, error);
    }
  }
}
