import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import "./index.css";
import { registerServiceWorker } from "./lib/registerSW";

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        // Use default browser timeout for all requests
        // Polling requests are quick and should complete within seconds
        // Long-running operations (MP3 generation) use background jobs with polling
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <OnboardingProvider>
        <App />
      </OnboardingProvider>
    </QueryClientProvider>
  </trpc.Provider>
);

// Force clear stale caches from old service worker versions
(async () => {
  const APP_CACHE_VERSION = "v3";
  const stored = localStorage.getItem("app-cache-version");
  if (stored !== APP_CACHE_VERSION) {
    // Version mismatch - clear all caches and force SW update
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg?.waiting) {
        reg.waiting.postMessage("skipWaiting");
      }
      await reg?.update();
    }
    localStorage.setItem("app-cache-version", APP_CACHE_VERSION);
    // Reload to get fresh assets
    if (stored !== null) {
      window.location.reload();
    }
  }
})();

// Register service worker for caching static assets (production only)
registerServiceWorker();
