import { useOnlineStatus, useReconnected } from "@/hooks/useOnlineStatus";
import { WifiOff, Wifi } from "lucide-react";

/**
 * A fixed banner that slides in from the top when the user goes offline,
 * and briefly shows a "back online" confirmation when connectivity returns.
 */
export default function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const justReconnected = useReconnected(3000);

  // Nothing to show when online and not recently reconnected
  if (isOnline && !justReconnected) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white transition-all duration-300 ease-in-out ${
        isOnline
          ? "bg-emerald-600 animate-in slide-in-from-top"
          : "bg-amber-600 animate-in slide-in-from-top"
      }`}
    >
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4 shrink-0" />
          <span>You're back online</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>You're offline — some features may be unavailable</span>
        </>
      )}
    </div>
  );
}
