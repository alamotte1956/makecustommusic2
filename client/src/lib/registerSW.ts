/**
 * Service Worker Registration
 *
 * Registers the service worker in production and handles updates gracefully.
 * In development, service workers are skipped to avoid caching issues with HMR.
 */

const SW_URL = "/sw.js";

/** Whether the current environment should use service workers */
function shouldRegister(): boolean {
  if (!("serviceWorker" in navigator)) return false;
  // Skip in development to avoid caching interference with Vite HMR
  if (import.meta.env.DEV) return false;
  return true;
}

/** Register the service worker and set up update detection */
export function registerServiceWorker(): void {
  if (!shouldRegister()) return;

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register(SW_URL, {
        scope: "/",
      });

      // Check for updates periodically (every 60 minutes)
      setInterval(() => {
        registration.update().catch(() => {
          /* silent */
        });
      }, 60 * 60 * 1000);

      // Handle waiting worker (new version available)
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            // New content is available; optionally notify the user
            console.log(
              "[SW] New version available. Refresh to update."
            );
            // Auto-activate the new service worker
            newWorker.postMessage("skipWaiting");
          }
        });
      });

      // When the new SW takes over, reload the page for fresh assets
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });

      console.log("[SW] Service worker registered successfully.");
    } catch (error) {
      console.warn("[SW] Service worker registration failed:", error);
    }
  });
}

/** Unregister all service workers (useful for debugging) */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;

  const registration = await navigator.serviceWorker.getRegistration();
  if (registration) {
    const success = await registration.unregister();
    if (success) {
      // Clear all caches
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      console.log("[SW] Service worker unregistered and caches cleared.");
    }
    return success;
  }
  return false;
}
