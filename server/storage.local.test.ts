import { afterEach, describe, expect, it } from "vitest";
import express from "express";
import { createServer } from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { registerLocalStorageRoute, storagePut } from "./storage";

const LOCAL_DIR = path.resolve(process.cwd(), ".local-storage");
const createdKeys: string[] = [];

async function removeKey(key: string) {
  await fs.rm(path.resolve(LOCAL_DIR, key), { force: true });
}

describe("local storage fallback", () => {
  afterEach(async () => {
    for (const key of createdKeys.splice(0)) {
      await removeKey(key);
    }
  });

  it("writes the exact bytes under .local-storage and returns a local URL when forge credentials are unset", async () => {
    expect(process.env.BUILT_IN_FORGE_API_URL ?? "").toBe("");
    expect(process.env.BUILT_IN_FORGE_API_KEY ?? "").toBe("");

    const payload = Buffer.from([0x49, 0x44, 0x33, 0x00, 0xff, 0xfe, 0x0a, 0x0d, 0x7f]);
    const key = `mp3-to-sheet/vitest/${Date.now()}-tone.bin`;
    createdKeys.push(key);

    const result = await storagePut(key, payload, "audio/mpeg");

    expect(result.key).toBe(key);
    expect(result.url).toBe(
      `http://127.0.0.1:${process.env.PORT || "3000"}/local-storage/${key.split("/").map(encodeURIComponent).join("/")}`
    );

    const written = await fs.readFile(path.resolve(LOCAL_DIR, key));
    expect(Buffer.compare(written, payload)).toBe(0);
    expect(written.length).toBe(payload.length);
  });

  it("throws on path traversal and does not write outside .local-storage", async () => {
    const outsideName = "storage-traversal-should-not-exist.bin";
    const outside = path.resolve(LOCAL_DIR, "..", outsideName);
    await fs.rm(outside, { force: true });

    await expect(storagePut(`../${outsideName}`, Buffer.from("no"))).rejects.toThrow(/Invalid storage path/);
    await expect(storagePut(`mp3-to-sheet/../../${outsideName}`, Buffer.from("no"))).rejects.toThrow(
      /Invalid storage path/
    );

    await expect(fs.access(outside)).rejects.toThrow();
  });

  it("serves the stored file over HTTP from the hidden directory", async () => {
    const payload = Buffer.from("sheet-audio-bytes");
    const key = `mp3-to-sheet/vitest/${Date.now()}-serve.mp3`;
    createdKeys.push(key);
    await storagePut(key, payload, "audio/mpeg");

    const app = express();
    registerLocalStorageRoute(app);
    const server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    try {
      const response = await fetch(`http://127.0.0.1:${port}/local-storage/${key}`);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("audio/mpeg");
      const body = Buffer.from(await response.arrayBuffer());
      expect(Buffer.compare(body, payload)).toBe(0);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });
});
