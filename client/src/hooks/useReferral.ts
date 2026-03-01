import { useEffect, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

const REFERRAL_STORAGE_KEY = "pending_referral_code";

/**
 * Safari-safe localStorage helpers.
 * Safari private browsing throws on setItem; we catch and fall back to sessionStorage.
 */
function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // Storage completely unavailable — referral will be lost
    }
  }
}

function safeRemoveItem(key: string): void {
  try { localStorage.removeItem(key); } catch { /* noop */ }
  try { sessionStorage.removeItem(key); } catch { /* noop */ }
}

/**
 * Captures ?ref= query parameter from the URL and stores it in storage.
 * After the user signs in, sends the referral code to the server to process.
 */
export function useReferral() {
  const { user } = useAuth();
  const processedRef = useRef(false);

  const claimMutation = trpc.referrals.claim.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        safeRemoveItem(REFERRAL_STORAGE_KEY);
      }
    },
    onError: () => {
      // Silently fail — don't disrupt user experience
      safeRemoveItem(REFERRAL_STORAGE_KEY);
    },
  });

  // Step 1: Capture ?ref= from URL on page load
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const refCode = params.get("ref");
      if (refCode && refCode.trim()) {
        safeSetItem(REFERRAL_STORAGE_KEY, refCode.trim().toUpperCase());
        // Clean the URL without reload (safe in all modern browsers including Safari 10+)
        const url = new URL(window.location.href);
        url.searchParams.delete("ref");
        window.history.replaceState({}, "", url.pathname + url.search);
      }
    } catch {
      // URL parsing failed — skip referral capture
    }
  }, []);

  // Step 2: Process referral after login
  useEffect(() => {
    if (!user || processedRef.current) return;

    const pendingCode = safeGetItem(REFERRAL_STORAGE_KEY);
    if (!pendingCode) return;

    processedRef.current = true;
    claimMutation.mutate({ code: pendingCode });
  }, [user]);
}
