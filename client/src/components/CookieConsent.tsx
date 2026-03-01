import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "cookie-consent";

type ConsentValue = "accepted" | "declined";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    // Only show if no consent decision has been stored
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      // Small delay so the banner slides up after the page loads
      const timer = setTimeout(() => {
        setVisible(true);
        // Trigger the slide-up animation after mount
        requestAnimationFrame(() => setAnimating(true));
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleConsent = (value: ConsentValue) => {
    localStorage.setItem(STORAGE_KEY, value);
    setAnimating(false);
    // Wait for the slide-down animation to finish before unmounting
    setTimeout(() => setVisible(false), 300);
  };

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-out ${
        animating ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="mx-auto max-w-4xl px-4 pb-4">
        <div className="rounded-xl border border-border bg-background shadow-2xl shadow-black/10 p-5">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="hidden sm:flex shrink-0 w-10 h-10 rounded-lg bg-violet-100 items-center justify-center mt-0.5">
              <Cookie className="w-5 h-5 text-violet-600" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground mb-1">
                We value your privacy
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We use essential cookies to keep you signed in and remember your
                preferences. We do not use third-party tracking or advertising
                cookies. Read our{" "}
                <Link href="/privacy">
                  <span className="text-black font-medium hover:text-violet-600 transition-colors cursor-pointer underline underline-offset-2">
                    Privacy Policy
                  </span>
                </Link>{" "}
                for full details.
              </p>

              {/* Buttons */}
              <div className="flex items-center gap-3 mt-3">
                <Button
                  size="sm"
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                  onClick={() => handleConsent("accepted")}
                >
                  Accept All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-border text-foreground hover:bg-muted"
                  onClick={() => handleConsent("declined")}
                >
                  Essential Only
                </Button>
              </div>
            </div>

            {/* Close / dismiss */}
            <button
              onClick={() => handleConsent("declined")}
              className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Dismiss cookie banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
