import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const HOOK_PATH = path.resolve(__dirname, "../client/src/hooks/useOnlineStatus.ts");
const COMPONENT_PATH = path.resolve(__dirname, "../client/src/components/OfflineIndicator.tsx");
const APP_PATH = path.resolve(__dirname, "../client/src/App.tsx");

describe("Offline Indicator", () => {
  describe("useOnlineStatus hook", () => {
    it("exists in hooks directory", () => {
      expect(fs.existsSync(HOOK_PATH)).toBe(true);
    });

    it("exports useOnlineStatus function", () => {
      const content = fs.readFileSync(HOOK_PATH, "utf-8");
      expect(content).toContain("export function useOnlineStatus");
    });

    it("exports useReconnected function", () => {
      const content = fs.readFileSync(HOOK_PATH, "utf-8");
      expect(content).toContain("export function useReconnected");
    });

    it("uses useSyncExternalStore for tear-free reads", () => {
      const content = fs.readFileSync(HOOK_PATH, "utf-8");
      expect(content).toContain("useSyncExternalStore");
    });

    it("subscribes to online and offline window events", () => {
      const content = fs.readFileSync(HOOK_PATH, "utf-8");
      expect(content).toContain('addEventListener("online"');
      expect(content).toContain('addEventListener("offline"');
    });

    it("unsubscribes from events on cleanup", () => {
      const content = fs.readFileSync(HOOK_PATH, "utf-8");
      expect(content).toContain('removeEventListener("online"');
      expect(content).toContain('removeEventListener("offline"');
    });

    it("reads navigator.onLine as the snapshot", () => {
      const content = fs.readFileSync(HOOK_PATH, "utf-8");
      expect(content).toContain("navigator.onLine");
    });

    it("provides a server snapshot that defaults to true", () => {
      const content = fs.readFileSync(HOOK_PATH, "utf-8");
      expect(content).toContain("getServerSnapshot");
      expect(content).toMatch(/return\s+true/);
    });

    it("useReconnected accepts a configurable duration", () => {
      const content = fs.readFileSync(HOOK_PATH, "utf-8");
      expect(content).toMatch(/useReconnected\(duration\s*=\s*\d+\)/);
    });

    it("useReconnected clears timeout on cleanup", () => {
      const content = fs.readFileSync(HOOK_PATH, "utf-8");
      expect(content).toContain("clearTimeout");
    });
  });

  describe("OfflineIndicator component", () => {
    it("exists in components directory", () => {
      expect(fs.existsSync(COMPONENT_PATH)).toBe(true);
    });

    it("imports useOnlineStatus and useReconnected hooks", () => {
      const content = fs.readFileSync(COMPONENT_PATH, "utf-8");
      expect(content).toContain("useOnlineStatus");
      expect(content).toContain("useReconnected");
    });

    it("uses WifiOff icon for offline state", () => {
      const content = fs.readFileSync(COMPONENT_PATH, "utf-8");
      expect(content).toContain("WifiOff");
    });

    it("uses Wifi icon for reconnected state", () => {
      const content = fs.readFileSync(COMPONENT_PATH, "utf-8");
      expect(content).toContain("Wifi");
    });

    it("has role=alert for accessibility", () => {
      const content = fs.readFileSync(COMPONENT_PATH, "utf-8");
      expect(content).toContain('role="alert"');
    });

    it("has aria-live=assertive for screen readers", () => {
      const content = fs.readFileSync(COMPONENT_PATH, "utf-8");
      expect(content).toContain('aria-live="assertive"');
    });

    it("returns null when online and not recently reconnected", () => {
      const content = fs.readFileSync(COMPONENT_PATH, "utf-8");
      expect(content).toContain("return null");
    });

    it("shows offline message when disconnected", () => {
      const content = fs.readFileSync(COMPONENT_PATH, "utf-8");
      expect(content).toContain("offline");
    });

    it("shows back online message when reconnected", () => {
      const content = fs.readFileSync(COMPONENT_PATH, "utf-8");
      expect(content).toContain("back online");
    });

    it("uses fixed positioning with highest z-index", () => {
      const content = fs.readFileSync(COMPONENT_PATH, "utf-8");
      expect(content).toContain("fixed");
      expect(content).toMatch(/z-\[\d+\]/);
    });

    it("uses amber color for offline and emerald for reconnected", () => {
      const content = fs.readFileSync(COMPONENT_PATH, "utf-8");
      expect(content).toContain("bg-amber-600");
      expect(content).toContain("bg-emerald-600");
    });

    it("includes slide-in animation", () => {
      const content = fs.readFileSync(COMPONENT_PATH, "utf-8");
      expect(content).toContain("slide-in-from-top");
    });
  });

  describe("App.tsx integration", () => {
    it("imports OfflineIndicator component", () => {
      const content = fs.readFileSync(APP_PATH, "utf-8");
      expect(content).toContain('import OfflineIndicator from "./components/OfflineIndicator"');
    });

    it("renders OfflineIndicator in the app tree", () => {
      const content = fs.readFileSync(APP_PATH, "utf-8");
      expect(content).toContain("<OfflineIndicator />");
    });

    it("places OfflineIndicator outside Layout for global visibility", () => {
      const content = fs.readFileSync(APP_PATH, "utf-8");
      const offlineIdx = content.indexOf("<OfflineIndicator />");
      const layoutIdx = content.indexOf("<Layout>");
      expect(offlineIdx).toBeLessThan(layoutIdx);
    });
  });
});
