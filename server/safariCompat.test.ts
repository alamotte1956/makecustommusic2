import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Safari & macOS Compatibility", () => {
  describe("Safari-safe download utility", () => {
    it("should export downloadFile and sanitizeFilename", async () => {
      const filePath = path.resolve("client/src/lib/safariDownload.ts");
      const content = fs.readFileSync(filePath, "utf-8");
      expect(content).toContain("export async function downloadFile");
      expect(content).toContain("export function sanitizeFilename");
    });

    it("downloadFile should fetch as blob before triggering download", () => {
      const filePath = path.resolve("client/src/lib/safariDownload.ts");
      const content = fs.readFileSync(filePath, "utf-8");
      expect(content).toContain("response.blob()");
      expect(content).toContain("URL.createObjectURL(blob)");
      expect(content).toContain("URL.revokeObjectURL");
    });

    it("downloadFile should have fallback to window.open", () => {
      const filePath = path.resolve("client/src/lib/safariDownload.ts");
      const content = fs.readFileSync(filePath, "utf-8");
      expect(content).toContain("window.open(url");
    });

    it("sanitizeFilename should handle special characters", () => {
      const filePath = path.resolve("client/src/lib/safariDownload.ts");
      const content = fs.readFileSync(filePath, "utf-8");
      expect(content).toContain("replace(/[^a-zA-Z0-9\\s-]/g");
      expect(content).toContain("replace(/\\s+/g");
    });
  });

  describe("All pages use Safari-safe download", () => {
    const pagesToCheck = [
      "client/src/pages/Generator.tsx",
      "client/src/pages/History.tsx",
      "client/src/pages/Favorites.tsx",
      "client/src/pages/AlbumDetail.tsx",
      "client/src/pages/SongDetail.tsx",
      "client/src/pages/SharedSong.tsx",
    ];

    for (const page of pagesToCheck) {
      it(`${path.basename(page)} should import Safari-safe download`, () => {
        const content = fs.readFileSync(path.resolve(page), "utf-8");
        expect(content).toContain("from \"@/lib/safariDownload\"");
      });
    }

    // StudioProducer.tsx was removed; no additional component checks needed
  });

  describe("Audio preview durationchange handler (Safari)", () => {
    const audioPreviewPages = [
      "client/src/pages/Upload.tsx",
      "client/src/pages/Mp3ToSheetMusic.tsx",
    ];

    for (const page of audioPreviewPages) {
      it(`${path.basename(page)} should have durationchange handler`, () => {
        const content = fs.readFileSync(path.resolve(page), "utf-8");
        expect(content).toContain("durationchange");
        expect(content).toContain("isFinite(audio.duration)");
      });

      it(`${path.basename(page)} should set audio.preload = metadata`, () => {
        const content = fs.readFileSync(path.resolve(page), "utf-8");
        expect(content).toContain('audio.preload = "metadata"');
      });
    }
  });

  describe("Autoplay error handling (Safari)", () => {
    const filesToCheck = [
      "client/src/pages/Upload.tsx",
      "client/src/pages/Mp3ToSheetMusic.tsx",
    ];

    for (const file of filesToCheck) {
      it(`${path.basename(file)} should handle autoplay rejection with .then/.catch`, () => {
        const content = fs.readFileSync(path.resolve(file), "utf-8");
        // Should use .play().then() pattern instead of bare .play()
        expect(content).toContain(".play().then(");
      });
    }
  });

  describe("QueuePlayerContext Safari handling", () => {
    it("should have durationchange handler", () => {
      const content = fs.readFileSync(
        path.resolve("client/src/contexts/QueuePlayerContext.tsx"),
        "utf-8"
      );
      expect(content).toContain("durationchange");
      expect(content).toContain("isFinite(audio.duration)");
    });

    it("should handle autoplay rejection gracefully", () => {
      const content = fs.readFileSync(
        path.resolve("client/src/contexts/QueuePlayerContext.tsx"),
        "utf-8"
      );
      expect(content).toContain("Playback blocked");
      expect(content).toContain(".catch(");
    });
  });

  describe("CSS Safari compatibility", () => {
    it("should include -webkit-backdrop-filter prefix", () => {
      const content = fs.readFileSync(
        path.resolve("client/src/index.css"),
        "utf-8"
      );
      expect(content).toContain("-webkit-backdrop-filter");
    });

    it("should include -webkit-overflow-scrolling for smooth scrolling", () => {
      const content = fs.readFileSync(
        path.resolve("client/src/index.css"),
        "utf-8"
      );
      expect(content).toContain("-webkit-overflow-scrolling: touch");
    });

    it("should include -webkit-appearance fix for inputs", () => {
      const content = fs.readFileSync(
        path.resolve("client/src/index.css"),
        "utf-8"
      );
      expect(content).toContain("-webkit-appearance: none");
    });

    it("should include range input webkit fix", () => {
      const content = fs.readFileSync(
        path.resolve("client/src/index.css"),
        "utf-8"
      );
      expect(content).toContain("::-webkit-slider-thumb");
    });
  });

  describe("M4A/macOS audio format support", () => {
    it("Upload page should accept audio/x-m4a and audio/mp4", () => {
      const content = fs.readFileSync(
        path.resolve("client/src/pages/Upload.tsx"),
        "utf-8"
      );
      expect(content).toContain("audio/x-m4a");
      expect(content).toContain("audio/mp4");
      expect(content).toContain(".m4a");
    });

    it("Mp3ToSheetMusic page should accept audio/x-m4a and audio/mp4", () => {
      const content = fs.readFileSync(
        path.resolve("client/src/pages/Mp3ToSheetMusic.tsx"),
        "utf-8"
      );
      expect(content).toContain("audio/x-m4a");
      expect(content).toContain("audio/mp4");
      expect(content).toContain(".m4a");
    });

    it("Server should accept audio/x-m4a and audio/mp4 MIME types", () => {
      const content = fs.readFileSync(
        path.resolve("server/routers.ts"),
        "utf-8"
      );
      expect(content).toContain("audio/x-m4a");
      expect(content).toContain("audio/mp4");
    });
  });
});
