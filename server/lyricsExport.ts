import type { Express, Request, Response } from "express";
import PDFDocument from "pdfkit";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from "docx";

/* ─── Types ─── */
interface LyricSection {
  type: string;
  label?: string;
  content: string;
}

interface ExportPayload {
  title: string;
  genre?: string;
  mood?: string;
  vocalType?: string;
  sections: LyricSection[];
  format: "pdf" | "txt" | "docx";
}

/* ─── Helpers ─── */

const SECTION_DISPLAY: Record<string, string> = {
  intro: "Intro",
  verse: "Verse",
  "pre-chorus": "Pre-Chorus",
  chorus: "Chorus",
  bridge: "Bridge",
  hook: "Hook",
  interlude: "Interlude",
  "ad-lib": "Ad-lib",
  outro: "Outro",
};

function sectionLabel(s: LyricSection): string {
  return s.label || SECTION_DISPLAY[s.type] || s.type;
}

function sanitize(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, "_")
    .trim()
    .slice(0, 100) || "lyrics";
}

/* ─── Plain Text ─── */
export function buildPlainText(payload: ExportPayload): string {
  const lines: string[] = [];

  lines.push(payload.title || "Untitled Song");
  lines.push("=".repeat((payload.title || "Untitled Song").length));
  lines.push("");

  // Metadata
  const meta: string[] = [];
  if (payload.genre) meta.push(`Genre: ${payload.genre}`);
  if (payload.mood) meta.push(`Mood: ${payload.mood}`);
  if (payload.vocalType && payload.vocalType !== "none") {
    const vocalMap: Record<string, string> = {
      male: "Male", female: "Female", mixed: "Mixed",
      male_and_female: "Male & Female", duet: "Duet", choir: "Choir",
    };
    meta.push(`Vocal: ${vocalMap[payload.vocalType] || payload.vocalType}`);
  }
  if (meta.length > 0) {
    lines.push(meta.join(" | "));
    lines.push("");
  }

  // Sections
  for (const section of payload.sections) {
    if (!section.content.trim()) continue;
    lines.push(`[${sectionLabel(section)}]`);
    lines.push(section.content.trim());
    lines.push("");
  }

  lines.push("---");
  lines.push(`© ${new Date().getFullYear()} Albert LaMotte — Made with Make Custom Music`);

  return lines.join("\n");
}

/* ─── PDF ─── */
export function buildPdf(payload: ExportPayload): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      margins: { top: 72, bottom: 72, left: 72, right: 72 },
      info: {
        Title: payload.title || "Untitled Song",
        Author: "Albert LaMotte",
        Creator: "Make Custom Music",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Title
    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .text(payload.title || "Untitled Song", { align: "center" });

    doc.moveDown(0.3);

    // Metadata line
    const meta: string[] = [];
    if (payload.genre) meta.push(payload.genre);
    if (payload.mood) meta.push(payload.mood);
    if (payload.vocalType && payload.vocalType !== "none") {
      const vocalMap: Record<string, string> = {
        male: "Male Vocal", female: "Female Vocal", mixed: "Mixed Vocals",
        male_and_female: "Male & Female", duet: "Duet", choir: "Choir",
      };
      meta.push(vocalMap[payload.vocalType] || payload.vocalType);
    }
    if (meta.length > 0) {
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#666666")
        .text(meta.join("  •  "), { align: "center" });
    }

    // Divider
    doc.moveDown(0.8);
    doc
      .strokeColor("#cccccc")
      .lineWidth(0.5)
      .moveTo(72, doc.y)
      .lineTo(doc.page.width - 72, doc.y)
      .stroke();
    doc.moveDown(0.8);

    // Sections
    const nonEmpty = payload.sections.filter(s => s.content.trim());
    for (let i = 0; i < nonEmpty.length; i++) {
      const section = nonEmpty[i];

      // Section header
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .fillColor("#333333")
        .text(`[${sectionLabel(section)}]`, { continued: false });

      doc.moveDown(0.2);

      // Section content
      doc
        .fontSize(11)
        .font("Helvetica")
        .fillColor("#000000")
        .text(section.content.trim(), {
          lineGap: 4,
        });

      if (i < nonEmpty.length - 1) {
        doc.moveDown(0.8);
      }
    }

    // Footer
    doc.moveDown(1.5);
    doc
      .strokeColor("#cccccc")
      .lineWidth(0.5)
      .moveTo(72, doc.y)
      .lineTo(doc.page.width - 72, doc.y)
      .stroke();
    doc.moveDown(0.4);
    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor("#999999")
      .text(
        `© ${new Date().getFullYear()} Albert LaMotte — Made with Make Custom Music`,
        { align: "center" }
      );

    doc.end();
  });
}

/* ─── DOCX ─── */
export async function buildDocx(payload: ExportPayload): Promise<Buffer> {
  const children: Paragraph[] = [];

  // Title
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: payload.title || "Untitled Song",
          bold: true,
          size: 48, // 24pt
          font: "Calibri",
        }),
      ],
    })
  );

  // Metadata
  const meta: string[] = [];
  if (payload.genre) meta.push(payload.genre);
  if (payload.mood) meta.push(payload.mood);
  if (payload.vocalType && payload.vocalType !== "none") {
    const vocalMap: Record<string, string> = {
      male: "Male Vocal", female: "Female Vocal", mixed: "Mixed Vocals",
      male_and_female: "Male & Female", duet: "Duet", choir: "Choir",
    };
    meta.push(vocalMap[payload.vocalType] || payload.vocalType);
  }
  if (meta.length > 0) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: meta.join("  •  "),
            size: 20, // 10pt
            color: "666666",
            font: "Calibri",
          }),
        ],
      })
    );
  }

  // Divider
  children.push(
    new Paragraph({
      spacing: { before: 200, after: 200 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      },
      children: [],
    })
  );

  // Sections
  const nonEmpty = payload.sections.filter(s => s.content.trim());
  for (const section of nonEmpty) {
    // Section header
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 80 },
        children: [
          new TextRun({
            text: `[${sectionLabel(section)}]`,
            bold: true,
            size: 24, // 12pt
            font: "Calibri",
            color: "333333",
          }),
        ],
      })
    );

    // Section content — each line as a separate paragraph
    const contentLines = section.content.trim().split("\n");
    for (const line of contentLines) {
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: line,
              size: 22, // 11pt
              font: "Calibri",
            }),
          ],
        })
      );
    }
  }

  // Footer
  children.push(
    new Paragraph({
      spacing: { before: 400 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      },
      children: [],
    })
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100 },
      children: [
        new TextRun({
          text: `© ${new Date().getFullYear()} Albert LaMotte — Made with Make Custom Music`,
          size: 16, // 8pt
          color: "999999",
          font: "Calibri",
        }),
      ],
    })
  );

  const doc = new Document({
    creator: "Make Custom Music",
    title: payload.title || "Untitled Song",
    sections: [{ children }],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

/* ─── Express Route ─── */
export function registerLyricsExportRoute(app: Express) {
  app.post("/api/lyrics/export", async (req: Request, res: Response) => {
    try {
      const body = req.body as ExportPayload;

      // Validate
      if (!body || !body.format || !body.sections || !Array.isArray(body.sections)) {
        res.status(400).json({ error: "Invalid request body" });
        return;
      }
      if (!["pdf", "txt", "docx"].includes(body.format)) {
        res.status(400).json({ error: "Invalid format. Use pdf, txt, or docx." });
        return;
      }
      if (body.sections.length === 0) {
        res.status(400).json({ error: "No sections to export" });
        return;
      }

      const filename = sanitize(body.title || "lyrics");

      if (body.format === "txt") {
        const text = buildPlainText(body);
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}.txt"`);
        res.send(text);
        return;
      }

      if (body.format === "pdf") {
        const buffer = await buildPdf(body);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}.pdf"`);
        res.send(buffer);
        return;
      }

      if (body.format === "docx") {
        const buffer = await buildDocx(body);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}.docx"`);
        res.send(buffer);
        return;
      }
    } catch (error: any) {
      console.error("[LyricsExport] Error:", error);
      res.status(500).json({ error: "Failed to generate export" });
    }
  });
}
