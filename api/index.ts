/**
 * Vercel Serverless Function Entry Point
 *
 * This file exports the Express app as a Vercel-compatible serverless function.
 * Vercel routes all requests to this handler via vercel.json rewrites.
 */
import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { registerAlbumZipRoute } from "../server/albumZip";
import { registerGenerateVoiceRoute } from "../server/generateVoice";
import { registerStripeWebhookRoute } from "../server/stripeWebhook";
import { registerSitemapRoute } from "../server/sitemap";
import { registerOgTagsMiddleware } from "../server/ogTags";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";

const app = express();

// Redirect www to non-www for canonical URL consistency
app.use((req, res, next) => {
  const host = req.headers.host || "";
  if (host.startsWith("www.")) {
    const nonWwwHost = host.replace(/^www\./, "");
    const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
    return res.redirect(301, `${protocol}://${nonWwwHost}${req.originalUrl}`);
  }
  next();
});

// Stripe webhook MUST be registered before body parsers (needs raw body)
registerStripeWebhookRoute(app);

// Configure body parser with larger size limit for file uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// OAuth callback under /api/oauth/callback
registerOAuthRoutes(app);

// Album ZIP download
registerAlbumZipRoute(app);

// ElevenLabs TTS voice generation (direct audio streaming)
registerGenerateVoiceRoute(app);

// Dynamic sitemap.xml
registerSitemapRoute(app);

// OG meta tag injection for shared song pages
registerOgTagsMiddleware(app);

// tRPC API
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

export default app;
