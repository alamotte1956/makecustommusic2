/**
 * Safari-safe file download utility.
 *
 * Safari does not support the `download` attribute on cross-origin links.
 * This utility fetches the file as a blob first, creates an object URL,
 * and then triggers the download. Falls back to window.open for errors.
 */
export async function downloadFile(url: string, filename: string): Promise<void> {
  try {
    // Fetch the file as a blob to bypass Safari's cross-origin download restriction
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

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
