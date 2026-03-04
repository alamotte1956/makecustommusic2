import { useEffect, useState, useSyncExternalStore } from "react";

/**
 * Subscribe to the browser's online/offline events.
 * Uses useSyncExternalStore for tear-free reads in concurrent React.
 */
function subscribe(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

function getServerSnapshot(): boolean {
  // During SSR, assume online
  return true;
}

/**
 * Returns `true` when the browser reports an active network connection,
 * `false` when offline. Automatically updates on connectivity changes.
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Returns `true` when the user has just come back online (for showing
 * a brief "back online" confirmation). Resets after `duration` ms.
 */
export function useReconnected(duration = 3000): boolean {
  const isOnline = useOnlineStatus();
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowReconnected(false);
    }
  }, [isOnline]);

  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true);
      setWasOffline(false);
      const timer = setTimeout(() => setShowReconnected(false), duration);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, duration]);

  return showReconnected;
}
