import { useState } from "react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { Button } from "@/components/ui/button";
import { Download, X, Share, Plus } from "lucide-react";

/**
 * PWA Install Banner
 *
 * Shows a dismissible banner prompting users to install the app.
 * - On Android/Chrome: shows a native install button
 * - On iOS: shows instructions for "Add to Home Screen"
 * - Hidden if already installed or dismissed
 */
export default function PWAInstallBanner() {
  const { canInstall, isIOS, isInstalled, promptInstall } = usePWAInstall();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem("pwa-banner-dismissed") === "true";
    } catch {
      return false;
    }
  });
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem("pwa-banner-dismissed", "true");
    } catch {
      // ignore
    }
  };

  // Don't show if installed, dismissed, or neither Android nor iOS
  if (isInstalled || dismissed || (!canInstall && !isIOS)) return null;

  return (
    <>
      {/* Install Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-gradient-to-r from-violet-600 to-purple-700 text-white shadow-2xl animate-in slide-in-from-bottom duration-500">
        <div className="container max-w-4xl flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Download className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Install Make Custom Music</p>
            <p className="text-xs text-white/80 truncate">
              {isIOS
                ? "Add to your home screen for the best experience"
                : "Get quick access and offline playback on your device"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {canInstall ? (
              <Button
                size="sm"
                variant="secondary"
                className="bg-white text-violet-700 hover:bg-white/90 font-semibold"
                onClick={promptInstall}
              >
                Install
              </Button>
            ) : isIOS ? (
              <Button
                size="sm"
                variant="secondary"
                className="bg-white text-violet-700 hover:bg-white/90 font-semibold"
                onClick={() => setShowIOSInstructions(true)}
              >
                How to Install
              </Button>
            ) : null}
            <button
              onClick={handleDismiss}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Instructions Modal */}
      {showIOSInstructions && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowIOSInstructions(false)}
        >
          <div
            className="bg-background text-foreground rounded-2xl p-6 max-w-sm w-full space-y-4 animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/30 rounded-2xl flex items-center justify-center mx-auto">
                <Download className="w-6 h-6 text-violet-600" />
              </div>
              <h3 className="text-lg font-bold">Install on iPhone/iPad</h3>
              <p className="text-sm text-muted-foreground">
                Follow these steps to add the app to your home screen:
              </p>
            </div>

            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center text-xs font-bold text-violet-600">
                  1
                </span>
                <span>
                  Tap the <Share className="w-4 h-4 inline-block mx-0.5 -mt-0.5 text-blue-500" />{" "}
                  <strong>Share</strong> button in Safari's toolbar
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center text-xs font-bold text-violet-600">
                  2
                </span>
                <span>
                  Scroll down and tap{" "}
                  <span className="inline-flex items-center gap-0.5 font-semibold">
                    <Plus className="w-3.5 h-3.5" /> Add to Home Screen
                  </span>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center text-xs font-bold text-violet-600">
                  3
                </span>
                <span>
                  Tap <strong>Add</strong> to confirm
                </span>
              </li>
            </ol>

            <Button
              className="w-full"
              onClick={() => setShowIOSInstructions(false)}
            >
              Got it
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
