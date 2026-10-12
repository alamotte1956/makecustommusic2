// Preconfigured storage helpers for Manus WebDev templates
// Uses the Biz-provided storage proxy (Authorization: Bearer <token>).
// When those credentials are unset (local dev), files are written under
// .local-storage and served from /local-storage.

import fs from "node:fs/promises";
import path from "node:path";
import type { Express } from "express";
import { ENV } from './_core/env';

const LOCAL_STORAGE_DIR = path.resolve(process.cwd(), ".local-storage");

type StorageConfig = { baseUrl: string; apiKey: string };

function getStorageConfig(): StorageConfig {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

function buildUploadUrl(baseUrl: string, relKey: string): URL {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}

async function buildDownloadUrl(
  baseUrl: string,
  relKey: string,
  apiKey: string
): Promise<string> {
  const downloadApiUrl = new URL(
    "v1/storage/downloadUrl",
    ensureTrailingSlash(baseUrl)
  );
  downloadApiUrl.searchParams.set("path", normalizeKey(relKey));
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(apiKey),
  });
  return (await response.json()).url;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function forgeConfigured(): boolean {
  return Boolean(ENV.forgeApiUrl && ENV.forgeApiKey);
}

function assertSafeKey(relKey: string): string {
  const key = normalizeKey(relKey);
  if (!key || key.includes("\\") || key.includes("\0")) {
    throw new Error("Invalid storage path");
  }
  const parts = key.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) {
    throw new Error("Invalid storage path");
  }
  const root = path.resolve(LOCAL_STORAGE_DIR);
  const filePath = path.resolve(root, key);
  if (filePath !== root && !filePath.startsWith(root + path.sep)) {
    throw new Error("Invalid storage path");
  }
  return key;
}

function localPublicUrl(key: string): string {
  const port = process.env.PORT || "3000";
  const origin = (process.env.LOCAL_STORAGE_ORIGIN || `http://127.0.0.1:${port}`).replace(/\/+$/, "");
  const encoded = key.split("/").map((part) => encodeURIComponent(part)).join("/");
  return `${origin}/local-storage/${encoded}`;
}

async function localPut(
  relKey: string,
  data: Buffer | Uint8Array | string
): Promise<{ key: string; url: string }> {
  const key = assertSafeKey(relKey);
  const filePath = path.resolve(LOCAL_STORAGE_DIR, key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const bytes = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
  await fs.writeFile(filePath, bytes);
  return { key, url: localPublicUrl(key) };
}

export function registerLocalStorageRoute(app: Express): void {
  app.use("/local-storage", (req, res) => {
    let key: string;
    try {
      key = decodeURIComponent(req.path.replace(/^\/+/, ""));
      key = assertSafeKey(key);
    } catch {
      res.status(400).end();
      return;
    }
    const filePath = path.resolve(LOCAL_STORAGE_DIR, key);
    res.sendFile(filePath, (err) => {
      if (err && !res.headersSent) {
        res.status(404).end();
      }
    });
  });
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string
): FormData {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  if (!forgeConfigured()) {
    return localPut(relKey, data);
  }
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string; }> {
  if (!forgeConfigured()) {
    const key = assertSafeKey(relKey);
    return { key, url: localPublicUrl(key) };
  }
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  return {
    key,
    url: await buildDownloadUrl(baseUrl, key, apiKey),
  };
}
