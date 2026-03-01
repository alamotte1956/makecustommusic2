import { describe, expect, it } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * Upload Audio Preview tests
 *
 * These tests verify the Upload page includes the audio preview player UI,
 * the preview helper functions, and proper cleanup logic.
 */

const uploadPagePath = path.resolve(__dirname, "../client/src/pages/Upload.tsx");
const uploadPageContent = fs.readFileSync(uploadPagePath, "utf-8");

describe("Upload Audio Preview", () => {
  describe("Component imports", () => {
    it("imports Play and Pause icons from lucide-react", () => {
      expect(uploadPageContent).toContain("Play");
      expect(uploadPageContent).toContain("Pause");
    });

    it("imports Volume2 and VolumeX icons for volume control", () => {
      expect(uploadPageContent).toContain("Volume2");
      expect(uploadPageContent).toContain("VolumeX");
    });

    it("imports useEffect for cleanup", () => {
      expect(uploadPageContent).toContain("useEffect");
    });
  });

  describe("Preview state management", () => {
    it("declares previewUrl state for object URL", () => {
      expect(uploadPageContent).toContain("previewUrl");
      expect(uploadPageContent).toContain("setPreviewUrl");
    });

    it("declares isPlaying state for play/pause toggle", () => {
      expect(uploadPageContent).toContain("isPlaying");
      expect(uploadPageContent).toContain("setIsPlaying");
    });

    it("declares currentTime state for progress tracking", () => {
      expect(uploadPageContent).toContain("currentTime");
      expect(uploadPageContent).toContain("setCurrentTime");
    });

    it("declares audioDuration state for total duration", () => {
      expect(uploadPageContent).toContain("audioDuration");
      expect(uploadPageContent).toContain("setAudioDuration");
    });

    it("has an audioRef for the HTML audio element", () => {
      expect(uploadPageContent).toContain("audioRef");
    });

    it("has a progressRef for the seek bar element", () => {
      expect(uploadPageContent).toContain("progressRef");
    });
  });

  describe("Preview helper functions", () => {
    it("defines setupPreview function to create audio preview from file", () => {
      expect(uploadPageContent).toContain("setupPreview");
      expect(uploadPageContent).toContain("URL.createObjectURL");
    });

    it("defines stopPreview function to clean up audio and URL", () => {
      expect(uploadPageContent).toContain("stopPreview");
      expect(uploadPageContent).toContain("URL.revokeObjectURL");
    });

    it("defines togglePlayPause function for play/pause control", () => {
      expect(uploadPageContent).toContain("togglePlayPause");
    });

    it("defines handleSeek function for progress bar seeking", () => {
      expect(uploadPageContent).toContain("handleSeek");
    });

    it("defines formatTime helper for time display", () => {
      expect(uploadPageContent).toContain("formatTime");
    });
  });

  describe("Audio event listeners", () => {
    it("listens for loadedmetadata to get duration", () => {
      expect(uploadPageContent).toContain("loadedmetadata");
    });

    it("listens for timeupdate to track progress", () => {
      expect(uploadPageContent).toContain("timeupdate");
    });

    it("listens for ended event to reset playback", () => {
      expect(uploadPageContent).toContain("\"ended\"");
    });
  });

  describe("Preview UI elements", () => {
    it("renders preview player when previewUrl is available", () => {
      expect(uploadPageContent).toContain("previewUrl &&");
    });

    it("displays play/pause button in the preview player", () => {
      expect(uploadPageContent).toContain("<Play");
      expect(uploadPageContent).toContain("<Pause");
    });

    it("displays a progress bar for seeking", () => {
      expect(uploadPageContent).toContain("progressRef");
      expect(uploadPageContent).toContain("handleSeek");
    });

    it("displays current time and total duration", () => {
      expect(uploadPageContent).toContain("formatTime(currentTime)");
      expect(uploadPageContent).toContain("formatTime(audioDuration)");
    });

    it("shows preview instruction text", () => {
      expect(uploadPageContent).toContain("Preview your audio before uploading");
    });

    it("shows audio duration in file info when available", () => {
      expect(uploadPageContent).toContain("audioDuration > 0");
    });
  });

  describe("Volume control", () => {
    it("declares volume state", () => {
      expect(uploadPageContent).toContain("volume");
      expect(uploadPageContent).toContain("setVolume");
    });

    it("declares isMuted state", () => {
      expect(uploadPageContent).toContain("isMuted");
      expect(uploadPageContent).toContain("setIsMuted");
    });

    it("has a prevVolumeRef to restore volume after unmute", () => {
      expect(uploadPageContent).toContain("prevVolumeRef");
    });

    it("defines handleVolumeChange function", () => {
      expect(uploadPageContent).toContain("handleVolumeChange");
    });

    it("defines toggleMute function", () => {
      expect(uploadPageContent).toContain("toggleMute");
    });

    it("clamps volume between 0 and 1", () => {
      expect(uploadPageContent).toContain("Math.max(0, Math.min(1, newVolume))");
    });

    it("syncs volume to the audio element", () => {
      expect(uploadPageContent).toContain("audioRef.current.volume");
    });

    it("renders mute toggle button with correct icon", () => {
      expect(uploadPageContent).toContain("<VolumeX");
      expect(uploadPageContent).toContain("<Volume2");
    });

    it("renders volume range slider with correct attributes", () => {
      expect(uploadPageContent).toContain('type="range"');
      expect(uploadPageContent).toContain("handleVolumeChange");
      expect(uploadPageContent).toContain('step={0.01}');
    });

    it("shows volume percentage in slider title", () => {
      expect(uploadPageContent).toContain("Volume:");
    });

    it("shows Unmute/Mute tooltip on the toggle button", () => {
      expect(uploadPageContent).toContain('"Unmute"');
      expect(uploadPageContent).toContain('"Mute"');
    });

    it("sets initial audio volume when creating preview", () => {
      expect(uploadPageContent).toContain("audio.volume = volume");
    });

    it("restores previous volume when unmuting", () => {
      expect(uploadPageContent).toContain("prevVolumeRef.current > 0 ? prevVolumeRef.current : 1");
    });
  });

  describe("Cleanup and mode switching", () => {
    it("calls stopPreview when switching modes", () => {
      // Both mode buttons should call stopPreview
      const modeAudioMatch = uploadPageContent.match(/setMode\("audio"\).*?stopPreview/s);
      const modeSheetMatch = uploadPageContent.match(/setMode\("sheet-music"\).*?stopPreview/s);
      expect(modeAudioMatch).not.toBeNull();
      expect(modeSheetMatch).not.toBeNull();
    });

    it("calls stopPreview when removing file", () => {
      expect(uploadPageContent).toContain("stopPreview(); setFile(null)");
    });

    it("has useEffect cleanup for object URL revocation", () => {
      expect(uploadPageContent).toContain("URL.revokeObjectURL(previewUrl)");
    });

    it("calls setupPreview when a new audio file is selected", () => {
      expect(uploadPageContent).toContain("setupPreview(f)");
    });
  });
});
