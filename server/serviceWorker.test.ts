import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const SW_PATH = path.resolve(__dirname, "../client/public/sw.js");
const REGISTER_SW_PATH = path.resolve(__dirname, "../client/src/lib/registerSW.ts");
const MAIN_TSX_PATH = path.resolve(__dirname, "../client/src/main.tsx");

describe("Service Worker", () => {
  describe("sw.js file", () => {
    it("exists in client/public directory", () => {
      expect(fs.existsSync(SW_PATH)).toBe(true);
    });

    it("contains a valid cache name", () => {
      const content = fs.readFileSync(SW_PATH, "utf-8");
      expect(content).toMatch(/CACHE_NAME\s*=\s*["']mcm-cache-v\d+["']/);
    });

    it("registers install event listener", () => {
      const content = fs.readFileSync(SW_PATH, "utf-8");
      expect(content).toContain('addEventListener("install"');
    });

    it("registers activate event listener", () => {
      const content = fs.readFileSync(SW_PATH, "utf-8");
      expect(content).toContain('addEventListener("activate"');
    });

    it("registers fetch event listener", () => {
      const content = fs.readFileSync(SW_PATH, "utf-8");
      expect(content).toContain('addEventListener("fetch"');
    });

    it("registers message event listener for skipWaiting", () => {
      const content = fs.readFileSync(SW_PATH, "utf-8");
      expect(content).toContain('addEventListener("message"');
      expect(content).toContain('"skipWaiting"');
    });

    it("skips API requests from caching", () => {
      const content = fs.readFileSync(SW_PATH, "utf-8");
      expect(content).toContain('url.pathname.startsWith("/api/")');
    });

    it("uses cache-first strategy for CDN assets", () => {
      const content = fs.readFileSync(SW_PATH, "utf-8");
      expect(content).toContain("cloudfront.net");
      expect(content).toContain("cacheFirst");
    });

    it("uses cache-first strategy for Google Fonts files", () => {
      const content = fs.readFileSync(SW_PATH, "utf-8");
      expect(content).toContain("fonts.gstatic.com");
    });

    it("uses stale-while-revalidate for Google Fonts CSS", () => {
      const content = fs.readFileSync(SW_PATH, "utf-8");
      expect(content).toContain("fonts.googleapis.com");
      expect(content).toContain("staleWhileRevalidate");
    });

    it("uses network-first strategy for HTML navigation", () => {
      const content = fs.readFileSync(SW_PATH, "utf-8");
      expect(content).toContain("networkFirst");
      expect(content).toContain('request.mode === "navigate"');
    });

    it("implements isHashedAsset helper for Vite-built files", () => {
      const content = fs.readFileSync(SW_PATH, "utf-8");
      expect(content).toContain("isHashedAsset");
      // Should match patterns like /assets/index-abc12345.js
      expect(content).toMatch(/\\\/assets\\\//);
    });

    it("calls skipWaiting on install", () => {
      const content = fs.readFileSync(SW_PATH, "utf-8");
      expect(content).toContain("self.skipWaiting()");
    });

    it("calls clients.claim on activate", () => {
      const content = fs.readFileSync(SW_PATH, "utf-8");
      expect(content).toContain("self.clients.claim()");
    });

    it("cleans up old caches on activate", () => {
      const content = fs.readFileSync(SW_PATH, "utf-8");
      expect(content).toContain("caches.keys()");
      expect(content).toContain("caches.delete");
    });

    it("skips analytics and manus debug endpoints", () => {
      const content = fs.readFileSync(SW_PATH, "utf-8");
      expect(content).toContain("/umami");
      expect(content).toContain("/__manus__");
    });

    it("supports clearCache message", () => {
      const content = fs.readFileSync(SW_PATH, "utf-8");
      expect(content).toContain('"clearCache"');
    });
  });

  describe("registerSW.ts module", () => {
    it("exists in client/src/lib directory", () => {
      expect(fs.existsSync(REGISTER_SW_PATH)).toBe(true);
    });

    it("exports registerServiceWorker function", () => {
      const content = fs.readFileSync(REGISTER_SW_PATH, "utf-8");
      expect(content).toContain("export function registerServiceWorker");
    });

    it("exports unregisterServiceWorker function", () => {
      const content = fs.readFileSync(REGISTER_SW_PATH, "utf-8");
      expect(content).toContain("export async function unregisterServiceWorker");
    });

    it("checks for serviceWorker support in navigator", () => {
      const content = fs.readFileSync(REGISTER_SW_PATH, "utf-8");
      expect(content).toContain('"serviceWorker" in navigator');
    });

    it("skips registration in development mode", () => {
      const content = fs.readFileSync(REGISTER_SW_PATH, "utf-8");
      expect(content).toContain("import.meta.env.DEV");
    });

    it("registers the service worker at /sw.js", () => {
      const content = fs.readFileSync(REGISTER_SW_PATH, "utf-8");
      expect(content).toContain('"/sw.js"');
      expect(content).toContain("navigator.serviceWorker.register");
    });

    it("sets up periodic update checks", () => {
      const content = fs.readFileSync(REGISTER_SW_PATH, "utf-8");
      expect(content).toContain("setInterval");
      expect(content).toContain("registration.update");
    });

    it("handles controllerchange for auto-reload", () => {
      const content = fs.readFileSync(REGISTER_SW_PATH, "utf-8");
      expect(content).toContain("controllerchange");
      expect(content).toContain("window.location.reload");
    });

    it("clears caches on unregister", () => {
      const content = fs.readFileSync(REGISTER_SW_PATH, "utf-8");
      expect(content).toContain("caches.keys");
      expect(content).toContain("caches.delete");
    });
  });

  describe("main.tsx integration", () => {
    it("imports registerServiceWorker", () => {
      const content = fs.readFileSync(MAIN_TSX_PATH, "utf-8");
      expect(content).toContain('import { registerServiceWorker } from "./lib/registerSW"');
    });

    it("calls registerServiceWorker", () => {
      const content = fs.readFileSync(MAIN_TSX_PATH, "utf-8");
      expect(content).toContain("registerServiceWorker()");
    });
  });
});
