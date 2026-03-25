/**
 * Safari-safe file download utility.
 *
 * Safari does not support the `download` attribute on cross-origin links.
 * This utility fetches the file as a blob first, creates an object URL,
 * and then triggers the download. Falls back to window.open for errors.
 */
/** Detect iOS Safari (including iPadOS) */
function isIOSSafari(): boolean {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua);
  return isIOS && isSafari;
}

export async function downloadFile(url: string, filename: string): Promise<void> {
  try {
    // Fetch the file as a blob to bypass Safari's cross-origin download restriction
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    // iOS Safari doesn't support the download attribute on blob URLs reliably.
    // Open in a new tab so the user can use the native share sheet / "Save to Files".
    if (isIOSSafari()) {
      window.open(objectUrl, "_blank");
      // Delay cleanup so iOS has time to handle the blob
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      return;
    }

    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();

    // Clean up after a short delay to ensure the download starts
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    }, 250);
  } catch {
    // Fallback: open in a new tab (user can right-click > Save As)
    window.open(url, "_blank");
  }
}

/**
 * Sanitize a filename for safe download across all platforms.
 * Removes special characters and replaces spaces with underscores.
 */
export function sanitizeFilename(title: string, extension = ".mp3"): string {
  return (
    title
      .replace(/[^a-zA-Z0-9\s-]/g, "")
      .replace(/\s+/g, "_")
      .trim() || "download"
  ) + extension;
}
