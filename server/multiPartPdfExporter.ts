/**
 * Multi-Part PDF Exporter
 * 
 * Generates individual PDF files for each arrangement part
 * suitable for distribution to musicians.
 */

import { PDFDocument, PDFPage, rgb } from "pdf-lib";
import * as fs from "fs";
import * as path from "path";
import { MelodyLine } from "./multiPartMelodyGenerator";

export interface PartPdfOptions {
  title: string;
  composer: string;
  arranger?: string;
  tempo: number;
  keySignature: string;
  timeSignature: string;
  includePageNumbers?: boolean;
  includeHeaderFooter?: boolean;
}

export class MultiPartPdfExporter {
  /**
   * Export all arrangement parts as individual PDFs
   */
  static async exportAllPartsPdf(
    melodyLines: MelodyLine[],
    options: PartPdfOptions,
    outputDirectory: string
  ): Promise<Map<string, string>> {
    const fileMap = new Map<string, string>();

    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDirectory)) {
      fs.mkdirSync(outputDirectory, { recursive: true });
    }

    for (const melodyLine of melodyLines) {
      try {
        const fileName = await this.exportPartPdf(
          melodyLine,
          options,
          outputDirectory
        );
        fileMap.set(melodyLine.partName, fileName);
      } catch (error) {
        console.error(`Error exporting PDF for ${melodyLine.partName}:`, error);
      }
    }

    return fileMap;
  }

  /**
   * Export a single part as PDF
   */
  static async exportPartPdf(
    melodyLine: MelodyLine,
    options: PartPdfOptions,
    outputDirectory: string
  ): Promise<string> {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Letter size
    const { width, height } = page.getSize();

    // Draw header
    this.drawHeader(page, melodyLine, options, width, height);

    // Draw part information
    this.drawPartInfo(page, melodyLine, options, width, height);

    // Draw sheet music area (placeholder for abcjs rendering)
    this.drawSheetMusicArea(page, melodyLine, options, width, height);

    // Draw footer
    if (options.includeHeaderFooter !== false) {
      this.drawFooter(page, options, width, height);
    }

    // Save PDF
    const fileName = this.sanitizeFileName(`${options.title} - ${melodyLine.partName}.pdf`);
    const filePath = path.join(outputDirectory, fileName);

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(filePath, pdfBytes);

    return filePath;
  }

  /**
   * Draw PDF header with title and composer
   */
  private static drawHeader(
    page: PDFPage,
    melodyLine: MelodyLine,
    options: PartPdfOptions,
    width: number,
    height: number
  ): void {
    const margin = 40;
    const titleFontSize = 24;
    const subtitleFontSize = 12;

    // Title
    page.drawText(options.title, {
      x: margin,
      y: height - margin - titleFontSize,
      size: titleFontSize,
      color: rgb(0, 0, 0),
      maxWidth: width - 2 * margin
    });

    // Part name
    page.drawText(`${melodyLine.partName}`, {
      x: margin,
      y: height - margin - titleFontSize - 25,
      size: subtitleFontSize + 2,
      color: rgb(0.2, 0.2, 0.2)
    });

    // Composer and arranger
    let composerY = height - margin - titleFontSize - 50;

    if (options.composer) {
      page.drawText(`Composer: ${options.composer}`, {
        x: margin,
        y: composerY,
        size: subtitleFontSize,
        color: rgb(0.4, 0.4, 0.4)
      });
      composerY -= 18;
    }

    if (options.arranger) {
      page.drawText(`Arranger: ${options.arranger}`, {
        x: margin,
        y: composerY,
        size: subtitleFontSize,
        color: rgb(0.4, 0.4, 0.4)
      });
      composerY -= 18;
    }

    // Metadata line
    const metadata = `${options.tempo} BPM | ${options.keySignature} | ${options.timeSignature}`;
    page.drawText(metadata, {
      x: margin,
      y: composerY - 10,
      size: subtitleFontSize - 2,
      color: rgb(0.5, 0.5, 0.5)
    });
  }

  /**
   * Draw part information section
   */
  private static drawPartInfo(
    page: PDFPage,
    melodyLine: MelodyLine,
    options: PartPdfOptions,
    width: number,
    height: number
  ): void {
    const margin = 40;
    const infoY = height - 200;
    const fontSize = 11;

    // Part type and details
    const details = [
      `Part Type: ${melodyLine.partType}`,
      `Clef: ${melodyLine.clef}`,
      ...(melodyLine.voiceType ? [`Voice Type: ${melodyLine.voiceType}`] : []),
      `Range: MIDI ${melodyLine.range.low}-${melodyLine.range.high}`,
      `Description: ${melodyLine.description}`
    ];

    let currentY = infoY;
    for (const detail of details) {
      page.drawText(detail, {
        x: margin,
        y: currentY,
        size: fontSize,
        color: rgb(0.3, 0.3, 0.3)
      });
      currentY -= 18;
    }
  }

  /**
   * Draw sheet music area (placeholder)
   */
  private static drawSheetMusicArea(
    page: PDFPage,
    melodyLine: MelodyLine,
    options: PartPdfOptions,
    width: number,
    height: number
  ): void {
    const margin = 40;
    const musicAreaY = height - 350;
    const musicAreaHeight = 300;

    // Draw border for sheet music area
    page.drawRectangle({
      x: margin,
      y: musicAreaY - musicAreaHeight,
      width: width - 2 * margin,
      height: musicAreaHeight,
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1
    });

    // Add staff lines (5 lines for musical staff)
    const staffLineY = musicAreaY - 50;
    const lineSpacing = 15;
    const staffWidth = width - 2 * margin - 20;

    for (let i = 0; i < 5; i++) {
      page.drawLine({
        start: { x: margin + 10, y: staffLineY - i * lineSpacing },
        end: { x: margin + 10 + staffWidth, y: staffLineY - i * lineSpacing },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7)
      });
    }

    // Add clef symbol (simplified text representation)
    const clefSymbol = this.getClefSymbol(melodyLine.clef);
    page.drawText(clefSymbol, {
      x: margin + 15,
      y: staffLineY - 30,
      size: 36,
      color: rgb(0, 0, 0)
    });

    // Add ABC notation as reference
    const abcLines = melodyLine.abcNotation.split("\n").slice(0, 5); // First 5 lines
    let abcY = musicAreaY - musicAreaHeight + 20;

    page.drawText("ABC Notation Reference:", {
      x: margin + 10,
      y: abcY,
      size: 9,
      color: rgb(0.6, 0.6, 0.6)
    });

    abcY -= 15;
    for (const line of abcLines) {
      page.drawText(line, {
        x: margin + 10,
        y: abcY,
        size: 8,
        color: rgb(0.7, 0.7, 0.7),
        maxWidth: width - 2 * margin - 20
      });
      abcY -= 12;
    }

    // Add note about rendering
    page.drawText(
      "Note: This PDF contains the ABC notation. Use abcjs or MuseScore to render the sheet music.",
      {
        x: margin + 10,
        y: musicAreaY - musicAreaHeight + 5,
        size: 8,
        color: rgb(0.8, 0.4, 0.4)
      }
    );
  }

  /**
   * Draw PDF footer with page numbers and copyright
   */
  private static drawFooter(
    page: PDFPage,
    options: PartPdfOptions,
    width: number,
    height: number
  ): void {
    const margin = 40;
    const footerY = 30;
    const fontSize = 9;

    // Copyright notice
    const copyright = `© ${new Date().getFullYear()} ${options.composer}. All rights reserved.`;
    page.drawText(copyright, {
      x: margin,
      y: footerY,
      size: fontSize,
      color: rgb(0.6, 0.6, 0.6)
    });

    // Page number (right aligned)
    page.drawText("Page 1", {
      x: width - margin - 40,
      y: footerY,
      size: fontSize,
      color: rgb(0.6, 0.6, 0.6)
    });
  }

  /**
   * Get clef symbol for display
   */
  private static getClefSymbol(clef: string): string {
    switch (clef) {
      case "treble":
        return "𝄞"; // Treble clef Unicode
      case "bass":
        return "𝄢"; // Bass clef Unicode
      case "alto":
        return "𝄡"; // Alto clef Unicode
      default:
        return "𝄞";
    }
  }

  /**
   * Sanitize file name
   */
  private static sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-z0-9]/gi, "_")
      .replace(/_+/g, "_")
      .toLowerCase() + ".pdf";
  }

  /**
   * Create a combined score PDF with all parts
   */
  static async exportCombinedScorePdf(
    melodyLines: MelodyLine[],
    options: PartPdfOptions,
    outputDirectory: string
  ): Promise<string> {
    const pdfDoc = await PDFDocument.create();

    // Title page
    const titlePage = pdfDoc.addPage([612, 792]);
    this.drawTitlePage(titlePage, options, melodyLines);

    // Part pages
    for (const melodyLine of melodyLines) {
      const page = pdfDoc.addPage([612, 792]);
      this.drawHeader(page, melodyLine, options, 612, 792);
      this.drawPartInfo(page, melodyLine, options, 612, 792);
      this.drawSheetMusicArea(page, melodyLine, options, 612, 792);
      this.drawFooter(page, options, 612, 792);
    }

    // Save combined PDF
    const fileName = this.sanitizeFileName(`${options.title} - Full Score.pdf`);
    const filePath = path.join(outputDirectory, fileName);

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(filePath, pdfBytes);

    return filePath;
  }

  /**
   * Draw title page for combined score
   */
  private static drawTitlePage(
    page: PDFPage,
    options: PartPdfOptions,
    melodyLines: MelodyLine[]
  ): void {
    const { width, height } = page.getSize();
    const margin = 40;

    // Title (centered)
    page.drawText(options.title, {
      x: margin,
      y: height / 2 + 100,
      size: 36,
      color: rgb(0, 0, 0),
      maxWidth: width - 2 * margin
    });

    // Composer
    if (options.composer) {
      page.drawText(`by ${options.composer}`, {
        x: margin,
        y: height / 2 + 40,
        size: 18,
        color: rgb(0.3, 0.3, 0.3),
        maxWidth: width - 2 * margin
      });
    }

    // Arrangement info
    let infoY = height / 2 - 40;

    page.drawText(`Tempo: ${options.tempo} BPM`, {
      x: margin,
      y: infoY,
      size: 12,
      color: rgb(0.5, 0.5, 0.5)
    });

    infoY -= 25;
    page.drawText(`Key: ${options.keySignature}`, {
      x: margin,
      y: infoY,
      size: 12,
      color: rgb(0.5, 0.5, 0.5)
    });

    infoY -= 25;
    page.drawText(`Time Signature: ${options.timeSignature}`, {
      x: margin,
      y: infoY,
      size: 12,
      color: rgb(0.5, 0.5, 0.5)
    });

    // Parts list
    infoY -= 60;
    page.drawText("Parts:", {
      x: margin,
      y: infoY,
      size: 14,
      color: rgb(0, 0, 0)
    });

    infoY -= 25;
    for (const line of melodyLines) {
      page.drawText(`• ${line.partName} (${line.partType})`, {
        x: margin + 20,
        y: infoY,
        size: 11,
        color: rgb(0.3, 0.3, 0.3)
      });
      infoY -= 20;
    }
  }
}

export default MultiPartPdfExporter;
