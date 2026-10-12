// Preconfigured storage helpers for Manus WebDev templates
// Uses the Biz-provided storage proxy (Authorization: Bearer <token>).
// When those credentials are unset, files are written under .local-storage
// and served from /local-storage.

import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { Express } from "express";
import { ENV } from "./_core/env";

const LOCAL_STORAGE_DIR = path.resolve(process.cwd(), ".local-storage");

const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".wave": "audio/wav",
  ".flac": "audio/flac",
  ".ogg": "audio/ogg",
  ".oga": "audio/ogg",
  ".m4a": "audio/mp4",
  ".mp4": "audio/mp4",
  ".aac": "audio/aac",
  ".aiff": "audio/aiff",
  ".aif": "audio/aiff",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
  ".xml": "application/xml",
};

type StorageConfig = { baseUrl: string; apiKey: string };

function forgeCredentials(): StorageConfig | null {
  const baseUrl = (process.env.BUILT_IN_FORGE_API_URL ?? ENV.forgeApiUrl ?? "").trim();
  const apiKey = (process.env.BUILT_IN_FORGE_API_KEY ?? ENV.forgeApiKey ?? "").trim();
  if (!baseUrl || !apiKey) return null;
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

function assertSafeKey(relKey: string): string {
  const key = normalizeKey(relKey).replace(/\\/g, "/");
  if (!key || key.includes("\0")) {
    throw new Error("Invalid storage path");
  }
  const parts = key.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) {
    throw new Error("Invalid storage path");
  }
  const root = path.resolve(LOCAL_STORAGE_DIR);
  const filePath = path.resolve(root, ...parts);
  const relative = path.relative(root, filePath);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Invalid storage path");
  }
  return parts.join("/");
}

function localPublicUrl(key: string): string {
  const port = process.env.PORT || "3000";
  const encoded = key.split("/").map((part) => encodeURIComponent(part)).join("/");
  return `http://127.0.0.1:${port}/local-storage/${encoded}`;
}

function contentTypeForKey(key: string): string {
  const ext = path.extname(key).toLowerCase();
  return EXTENSION_CONTENT_TYPES[ext] ?? "application/octet-stream";
}

function toNodeBuffer(data: Buffer | Uint8Array | string): Buffer {
  if (typeof data === "string") return Buffer.from(data);
  if (Buffer.isBuffer(data)) return data;
  return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
}

async function localPut(
  relKey: string,
  data: Buffer | Uint8Array | string
): Promise<{ key: string; url: string }> {
  const key = assertSafeKey(relKey);
  const filePath = path.resolve(LOCAL_STORAGE_DIR, key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, toNodeBuffer(data));
  return { key, url: localPublicUrl(key) };
}

export function registerLocalStorageRoute(app: Express): void {
  app.use("/local-storage", (req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.status(405).end();
      return;
    }
    let key: string;
    try {
      key = assertSafeKey(req.path.replace(/^\/+/, ""));
    } catch {
      res.status(400).end();
      return;
    }
    const filePath = path.resolve(LOCAL_STORAGE_DIR, key);
    fs.stat(filePath)
      .then((stat) => {
        if (!stat.isFile()) {
          res.status(404).end();
          return;
        }
        res.status(200);
        res.setHeader("Content-Type", contentTypeForKey(key));
        res.setHeader("Content-Length", stat.size);
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("X-Content-Type-Options", "nosniff");
        if (req.method === "HEAD") {
          res.end();
          return;
        }
        createReadStream(filePath).pipe(res);
      })
      .catch(() => {
        if (!res.headersSent) res.status(404).end();
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
      : new Blob([data as BlobPart], { type: contentType });
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
  const forge = forgeCredentials();
  if (!forge) {
    return localPut(relKey, data);
  }
  const { baseUrl, apiKey } = forge;
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

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const forge = forgeCredentials();
  if (!forge) {
    const key = assertSafeKey(relKey);
    return { key, url: localPublicUrl(key) };
  }
  const { baseUrl, apiKey } = forge;
  const key = normalizeKey(relKey);
  return {
    key,
    url: await buildDownloadUrl(baseUrl, key, apiKey),
  };
}
