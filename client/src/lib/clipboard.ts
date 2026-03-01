/**
 * Safari-safe clipboard write.
 * Tries the modern Clipboard API first, then falls back to the
 * legacy execCommand("copy") approach for older Safari / non-HTTPS contexts.
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    await navigator.clipboard.writeText(text);
    return;
  }

  // Fallback: create a temporary textarea, select its content, and copy
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  // Safari on iOS requires setSelectionRange
  textarea.setSelectionRange(0, textarea.value.length);

  const success = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!success) {
    throw new Error("execCommand copy failed");
  }
}
