import { toast } from "sonner";

/**
 * Classify an audio error into a user-friendly message.
 * Uses the MediaError code from the HTMLAudioElement when available.
 */
export function classifyAudioError(
  error?: MediaError | Error | unknown
): string {
  if (error && typeof error === "object" && "code" in error) {
    const mediaError = error as MediaError;
    switch (mediaError.code) {
      case MediaError.MEDIA_ERR_ABORTED:
        return "Playback was cancelled.";
      case MediaError.MEDIA_ERR_NETWORK:
        return "A network error occurred while loading audio.";
      case MediaError.MEDIA_ERR_DECODE:
        return "The audio file could not be decoded.";
      case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
        return "This audio format is not supported by your browser.";
      default:
        return "An unknown audio error occurred.";
    }
  }
  if (error instanceof Error) {
    if (
      error.message.includes("network") ||
      error.message.includes("fetch") ||
      error.message.includes("Failed to load")
    ) {
      return "A network error occurred while loading audio.";
    }
    return error.message || "Audio playback failed.";
  }
  return "Audio failed to load. Please check your connection.";
}

/**
 * Show a toast notification with a Retry button when audio fails to load.
 *
 * @param message  - User-friendly error description
 * @param onRetry  - Callback invoked when the user clicks "Retry"
 * @param toastId  - Optional stable ID to prevent duplicate toasts for the same source
 */
export function audioRetryToast(
  message: string,
  onRetry: () => void,
  toastId?: string
) {
  toast.error(message, {
    id: toastId,
    duration: 8000,
    action: {
      label: "Retry",
      onClick: () => {
        onRetry();
      },
    },
  });
}

/**
 * Convenience wrapper: classify the error and show a retry toast in one call.
 */
export function showAudioErrorToast(
  error: MediaError | Error | unknown,
  onRetry: () => void,
  toastId?: string
) {
  const message = classifyAudioError(error);
  audioRetryToast(message, onRetry, toastId);
}
