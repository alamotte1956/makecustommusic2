import type { Express } from "express";
import { getDb } from "./db";
import { songs } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";

const BASE_URL = "https://makecustommusic.com";

// Static routes with their change frequency and priority
const STATIC_ROUTES: { path: string; changefreq: string; priority: number }[] = [
  { path: "/", changefreq: "weekly", priority: 1.0 },
  { path: "/generate", changefreq: "weekly", priority: 0.9 },
  { path: "/discover", changefreq: "daily", priority: 0.8 },
  { path: "/pricing", changefreq: "monthly", priority: 0.8 },
  { path: "/upload", changefreq: "monthly", priority: 0.6 },
  { path: "/faq", changefreq: "monthly", priority: 0.5 },
  { path: "/privacy", changefreq: "yearly", priority: 0.3 },
  { path: "/terms", changefreq: "yearly", priority: 0.3 },
];

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function registerSitemapRoute(app: Express) {
  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const urls: string[] = [];

      // Add static routes
      for (const route of STATIC_ROUTES) {
        urls.push(`  <url>
    <loc>${escapeXml(BASE_URL + route.path)}</loc>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority.toFixed(1)}</priority>
  </url>`);
      }

      // Add public shared songs from the database
      const db = await getDb();
      if (db) {
        const publicSongs = await db
          .select({
            shareToken: songs.shareToken,
            updatedAt: songs.updatedAt,
          })
          .from(songs)
          .where(eq(songs.visibility, "public"))
          .orderBy(desc(songs.publishedAt));

        for (const song of publicSongs) {
          if (!song.shareToken) continue;
          const lastmod = song.updatedAt ? formatDate(song.updatedAt) : formatDate(new Date());
          urls.push(`  <url>
    <loc>${escapeXml(BASE_URL + "/share/" + song.shareToken)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`);
        }
      }

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

      res.set("Content-Type", "application/xml; charset=utf-8");
      res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
      res.send(xml);
    } catch (error) {
      console.error("[Sitemap] Error generating sitemap:", error);
      res.status(500).send("Error generating sitemap");
    }
  });
}
