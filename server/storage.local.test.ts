import { afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { registerLocalStorageRoute, storageGet, storagePut } from "./storage";

const LOCAL_DIR = path.resolve(process.cwd(), ".local-storage");
const createdKeys: string[] = [];

async function removeKey(key: string) {
  await fs.rm(path.resolve(LOCAL_DIR, key), { force: true });
}

async function listen(app: express.Express): Promise<{ port: number; close: () => Promise<void> }> {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    port,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

describe("local storage fallback", () => {
  afterEach(async () => {
    vi.unstubAllGlobals();
    delete process.env.BUILT_IN_FORGE_API_URL;
    delete process.env.BUILT_IN_FORGE_API_KEY;
    for (const key of createdKeys.splice(0)) {
      await removeKey(key);
    }
  });

  it("writes the exact bytes under .local-storage and returns a local URL when forge credentials are unset", async () => {
    expect(process.env.BUILT_IN_FORGE_API_URL ?? "").toBe("");
    expect(process.env.BUILT_IN_FORGE_API_KEY ?? "").toBe("");

    const payload = Buffer.from([0x49, 0x44, 0x33, 0x00, 0xff, 0xfe, 0x0a, 0x0d, 0x7f]);
    const key = `uploads/vitest/${Date.now()}-tone.mp3`;
    createdKeys.push(key);

    const result = await storagePut(key, payload, "audio/mpeg");

    expect(result.key).toBe(key);
    expect(result.url).toBe(
      `http://127.0.0.1:${process.env.PORT || "3000"}/local-storage/${key.split("/").map(encodeURIComponent).join("/")}`
    );
    expect(await storageGet(key)).toEqual({ key, url: result.url });

    const written = await fs.readFile(path.resolve(LOCAL_DIR, key));
    expect(Buffer.compare(written, payload)).toBe(0);
  });

  it("serves the stored file over HTTP with an audio content type", async () => {
    const payload = Buffer.from([0xff, 0xfb, 0x90, 0x64, 0x00, 0x01, 0x02, 0x03]);
    const key = `uploads/vitest/${Date.now()}-served.mp3`;
    createdKeys.push(key);
    await storagePut(key, payload, "audio/mpeg");

    const app = express();
    registerLocalStorageRoute(app);
    const server = await listen(app);
    try {
      const response = await fetch(`http://127.0.0.1:${server.port}/local-storage/${key}`);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type") ?? "").toMatch(/audio\/mpeg/i);
      const body = Buffer.from(await response.arrayBuffer());
      expect(Buffer.compare(body, payload)).toBe(0);

      const traversal = await fetch(
        `http://127.0.0.1:${server.port}/local-storage/uploads/%2e%2e/%2e%2e/package.json`
      );
      expect(traversal.status).toBeGreaterThanOrEqual(400);
      expect(traversal.status).toBeLessThan(500);
    } finally {
      await server.close();
    }
  });

  it("throws on path traversal and does not write outside .local-storage", async () => {
    const outsideName = "storage-traversal-should-not-exist.bin";
    const outside = path.resolve(LOCAL_DIR, "..", outsideName);
    await fs.rm(outside, { force: true });

    await expect(storagePut(`../${outsideName}`, Buffer.from("no"))).rejects.toThrow(/Invalid storage path/);
    await expect(storagePut(`uploads/../../${outsideName}`, Buffer.from("no"))).rejects.toThrow(
      /Invalid storage path/
    );
    await expect(storageGet(`../${outsideName}`)).rejects.toThrow(/Invalid storage path/);

    await expect(fs.access(outside)).rejects.toThrow();
  });

  it("keeps the Forge upload path when credentials are set", async () => {
    process.env.BUILT_IN_FORGE_API_URL = "https://forge.example";
    process.env.BUILT_IN_FORGE_API_KEY = "test-key";
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ url: "https://cdn.example/file.mp3" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const key = `uploads/vitest/${Date.now()}-forge.mp3`;
    const result = await storagePut(key, Buffer.from([1, 2, 3, 4]), "audio/mpeg");

    expect(result).toEqual({ key, url: "https://cdn.example/file.mp3" });
    expect(fetchMock).toHaveBeenCalledOnce();
    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toContain("https://forge.example/v1/storage/upload");
    await expect(fs.access(path.resolve(LOCAL_DIR, key))).rejects.toThrow();
  });
});
