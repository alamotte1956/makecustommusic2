import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Music, History, Disc3, Sparkles, LogOut, LogIn, Menu, X, Heart, CreditCard, BarChart3, Globe, Upload, HelpCircle } from "lucide-react";
import { useState } from "react";
import { useQueuePlayer } from "@/contexts/QueuePlayerContext";
import { useOnboarding } from "@/contexts/OnboardingContext";

const navItems = [
  { href: "/generate", label: "Create Music", icon: Sparkles },
  { href: "/discover", label: "Discover", icon: Globe },
  { href: "/history", label: "My Songs", icon: History },
  { href: "/favorites", label: "Favorites", icon: Heart },
  { href: "/albums", label: "Albums", icon: Disc3 },
  { href: "/upload", label: "Upload", icon: Upload },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { queue } = useQueuePlayer();
  const hasQueue = queue.length > 0;
  const { startTour } = useOnboarding();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663211654017/Q3oEbCsP6DUj527aoyypq7/logo-makecustommusic-V4H6NBVctSA5W9x5679fcE.webp"
              alt="MakeCustomMusic logo"
              className="w-[4.5rem] h-[4.5rem] rounded-lg object-contain"
            />
            <span className="text-lg font-bold text-foreground">
              Make Custom Music
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <span
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors no-underline ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Auth */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/pricing">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors no-underline ${
                location === "/pricing" ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent"
              }`}>
                <CreditCard className="w-3.5 h-3.5" />
                Pricing
              </span>
            </Link>
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link href="/usage">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors no-underline ${
                    location === "/usage" ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent"
                  }`}>
                    <BarChart3 className="w-3.5 h-3.5" />
                    Usage
                  </span>
                </Link>
                <span className="text-sm text-muted-foreground">
                  {user?.name || user?.email || "User"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startTour()}
                  className="text-muted-foreground hover:text-foreground"
                  title="Start guided tour"
                >
                  <HelpCircle className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => logout()}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  Logout
                </Button>
              </div>
            ) : (
              <Button asChild size="sm">
                <a href={getLoginUrl()} className="no-underline text-primary-foreground">
                  <LogIn className="w-4 h-4 mr-1" />
                  Sign In
                </a>
              </Button>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-accent"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background p-4 space-y-2">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <span
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium no-underline ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-accent"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </span>
                </Link>
              );
            })}
            {/* Pricing & Usage links */}
            <Link href="/pricing">
              <span
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium no-underline ${
                  location === "/pricing" ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <CreditCard className="w-4 h-4" />
                Pricing
              </span>
            </Link>
            {isAuthenticated && (
              <Link href="/usage">
                <span
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium no-underline ${
                    location === "/usage" ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <BarChart3 className="w-4 h-4" />
                  Usage
                </span>
              </Link>
            )}
            <div className="pt-2 border-t border-border space-y-1">
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => { startTour(); setMobileMenuOpen(false); }}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent w-full"
                  >
                    <HelpCircle className="w-4 h-4" />
                    Guided Tour
                  </button>
                  <button
                    onClick={() => { logout(); setMobileMenuOpen(false); }}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent w-full"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </>
              ) : (
                <a
                  href={getLoginUrl()}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-primary no-underline"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </a>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className={`border-t border-border py-6 mt-auto ${hasQueue ? "pb-24" : ""}`}>
        <div className="container text-center text-sm text-muted-foreground">
          <p>© 2026 A. LaMotte Music</p>
        </div>
      </footer>
    </div>
  );
}
