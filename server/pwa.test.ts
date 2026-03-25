import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("PWA Configuration", () => {
  const manifestPath = path.resolve(__dirname, "../client/public/manifest.json");

  it("manifest.json exists", () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
  });

  it("manifest.json is valid JSON", () => {
    const raw = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(raw);
    expect(manifest).toBeDefined();
  });

  it("manifest has required PWA fields", () => {
    const raw = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(raw);

    expect(manifest.name).toBe("Make Custom Music");
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.background_color).toBeTruthy();
    expect(manifest.theme_color).toBeTruthy();
  });

  it("manifest has icons in required sizes", () => {
    const raw = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(raw);

    expect(manifest.icons).toBeDefined();
    expect(Array.isArray(manifest.icons)).toBe(true);

    const sizes = manifest.icons.map((i: any) => i.sizes);
    // PWA requires at least 192x192 and 512x512
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
  });

  it("manifest has maskable icons", () => {
    const raw = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(raw);

    const maskable = manifest.icons.filter((i: any) => i.purpose === "maskable");
    expect(maskable.length).toBeGreaterThanOrEqual(1);
  });

  it("manifest has app shortcuts", () => {
    const raw = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(raw);

    expect(manifest.shortcuts).toBeDefined();
    expect(Array.isArray(manifest.shortcuts)).toBe(true);
    expect(manifest.shortcuts.length).toBeGreaterThanOrEqual(1);

    // Each shortcut should have name and url
    for (const shortcut of manifest.shortcuts) {
      expect(shortcut.name).toBeTruthy();
      expect(shortcut.url).toBeTruthy();
    }
  });

  it("service worker file exists", () => {
    const swPath = path.resolve(__dirname, "../client/public/sw.js");
    expect(fs.existsSync(swPath)).toBe(true);
  });

  it("service worker has audio caching support", () => {
    const swPath = path.resolve(__dirname, "../client/public/sw.js");
    const swContent = fs.readFileSync(swPath, "utf-8");

    expect(swContent).toContain("AUDIO_CACHE_NAME");
    expect(swContent).toContain("audioCacheFirst");
    expect(swContent).toContain("isAudioFile");
    expect(swContent).toContain("cacheAudio");
  });

  it("service worker has offline fallback for navigation", () => {
    const swPath = path.resolve(__dirname, "../client/public/sw.js");
    const swContent = fs.readFileSync(swPath, "utf-8");

    expect(swContent).toContain("networkFirst");
    expect(swContent).toContain("navigate");
  });

  it("index.html has manifest link", () => {
    const htmlPath = path.resolve(__dirname, "../client/index.html");
    const html = fs.readFileSync(htmlPath, "utf-8");

    expect(html).toContain('rel="manifest"');
    expect(html).toContain("/manifest.json");
  });

  it("index.html has apple-touch-icon", () => {
    const htmlPath = path.resolve(__dirname, "../client/index.html");
    const html = fs.readFileSync(htmlPath, "utf-8");

    expect(html).toContain('rel="apple-touch-icon"');
  });

  it("index.html has theme-color meta tag", () => {
    const htmlPath = path.resolve(__dirname, "../client/index.html");
    const html = fs.readFileSync(htmlPath, "utf-8");

    expect(html).toContain('name="theme-color"');
  });

  it("index.html has apple-mobile-web-app-capable meta tag", () => {
    const htmlPath = path.resolve(__dirname, "../client/index.html");
    const html = fs.readFileSync(htmlPath, "utf-8");

    expect(html).toContain('name="apple-mobile-web-app-capable"');
    expect(html).toContain('content="yes"');
  });

  it("all icon URLs are valid CDN URLs", () => {
    const raw = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(raw);

    for (const icon of manifest.icons) {
      expect(icon.src).toMatch(/^https:\/\/.*cloudfront\.net\//);
      expect(icon.type).toBe("image/png");
    }
  });
});
