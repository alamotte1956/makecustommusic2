import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Music, History, Disc3, Sparkles, LogOut, LogIn, Menu, X, Heart, CreditCard, BarChart3, Globe, Upload, HelpCircle, Crown, Gift, FileAudio, Share2, Check, Shield, Search } from "lucide-react";
import { toast } from "sonner";
import NotificationCenter from "@/components/NotificationCenter";
import CookieConsent from "@/components/CookieConsent";
import { useState } from "react";
import { useQueuePlayer } from "@/contexts/QueuePlayerContext";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { trpc } from "@/lib/trpc";

const navItems = [
  { href: "/generate", label: "Create", icon: Sparkles },
  { href: "/discover", label: "Explore", icon: Globe },
  { href: "/history", label: "Library", icon: History },
  { href: "/favorites", label: "Favorites", icon: Heart },
  { href: "/albums", label: "Albums", icon: Disc3 },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/mp3-to-sheet-music", label: "MP3 to Sheet", icon: FileAudio },
  { href: "/referrals", label: "Invite", icon: Gift },
];

function AdminNavLink({ location, mobile, onClick }: { location: string; mobile?: boolean; onClick?: () => void }) {
  const { data: unreadData } = trpc.admin.unreadNotificationCount.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const unreadCount = unreadData?.count ?? 0;

  if (mobile) {
    return (
      <Link href="/admin">
        <span
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium no-underline transition-colors ${
            location === "/admin" ? "bg-purple-500/20 text-purple-300" : "text-white/60 hover:text-white hover:bg-white/5"
          }`}
          onClick={onClick}
        >
          <Shield className="w-4 h-4" />
          Admin
          {unreadCount > 0 && (
            <span className="bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full ml-auto">
              {unreadCount}
            </span>
          )}
        </span>
      </Link>
    );
  }

  return (
    <Link href="/admin">
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors no-underline relative ${
        location === "/admin" ? "bg-purple-500/20 text-purple-300" : "text-white/60 hover:text-white hover:bg-white/5"
      }`}>
        <Shield className="w-3.5 h-3.5" />
        Admin
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </span>
    </Link>
  );
}

const planLabel: Record<string, string> = {
  free: "Free",
  creator: "Creator",
  professional: "Pro",
};

const planBadgeStyle: Record<string, string> = {
  free: "bg-white/10 text-white/70 border-white/10",
  creator: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  professional: "bg-gradient-to-r from-purple-500/20 to-orange-500/20 text-orange-300 border-orange-500/30",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { queue } = useQueuePlayer();
  const hasQueue = queue.length > 0;
  const { startTour } = useOnboarding();
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const { data: summary } = trpc.credits.summary.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const currentPlan = summary?.plan ?? "free";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header — Suno-style minimal dark header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-background/90 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-16">
          {/* Logo — Bold uppercase like Suno */}
          <Link href="/" className="flex items-center gap-2.5 no-underline shrink-0">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663211654017/Q3oEbCsP6DUj527aoyypq7/logo-makecustommusic-V4H6NBVctSA5W9x5679fcE.webp"
              alt="MakeCustomMusic logo"
              width={40}
              height={40}
              className="w-10 h-10 rounded-lg object-contain"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = 'none';
              }}
            />
            <span className="text-base font-bold text-white tracking-tight uppercase">
              MakeCustomMusic
            </span>
          </Link>

          {/* Desktop Nav — Clean, minimal like Suno */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors no-underline ${
                      isActive
                        ? "bg-white/10 text-white"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <item.icon className="w-3.5 h-3.5" />
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Right side — Auth + Actions */}
          <div className="hidden lg:flex items-center gap-2">
            <Link href="/pricing">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors no-underline ${
                location === "/pricing" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"
              }`}>
                <CreditCard className="w-3.5 h-3.5" />
                Pricing
              </span>
            </Link>
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                {/* Plan Badge */}
                <Link href="/usage">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border no-underline transition-colors hover:opacity-80 ${planBadgeStyle[currentPlan] ?? planBadgeStyle.free}`}>
                    {currentPlan !== "free" && <Crown className="w-3 h-3" />}
                    {planLabel[currentPlan] ?? "Free"}
                  </span>
                </Link>
                <Link href="/usage">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors no-underline ${
                    location === "/usage" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}>
                    <BarChart3 className="w-3.5 h-3.5" />
                    Usage
                  </span>
                </Link>
                {user?.role === "admin" && (
                  <AdminNavLink location={location} />
                )}
                <NotificationCenter />
                <span className="text-sm text-white/50 max-w-[120px] truncate">
                  {user?.name || user?.email || "User"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShare}
                  className="text-white/40 hover:text-white hover:bg-white/5"
                  title="Share this page"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startTour()}
                  className="text-white/40 hover:text-white hover:bg-white/5"
                  title="Start guided tour"
                >
                  <HelpCircle className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => logout()}
                  className="text-white/40 hover:text-white hover:bg-white/5"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <a href={getLoginUrl()} className="text-sm text-white/60 hover:text-white transition-colors no-underline">
                  Sign In
                </a>
                <Button asChild size="sm" className="rounded-full bg-white text-black hover:bg-white/90 font-semibold px-5">
                  <a href={getLoginUrl()} className="no-underline">
                    Sign Up
                  </a>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center gap-2">
            {isAuthenticated && <NotificationCenter />}
            {isAuthenticated && (
              <Link href="/usage">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border no-underline ${planBadgeStyle[currentPlan] ?? planBadgeStyle.free}`}>
                  {currentPlan !== "free" && <Crown className="w-3 h-3" />}
                  {planLabel[currentPlan] ?? "Free"}
                </span>
              </Link>
            )}
            <button
              className="p-2 rounded-xl hover:bg-white/5 text-white/60"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav — Dark overlay */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-white/5 bg-background/95 backdrop-blur-xl p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <span
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium no-underline transition-colors ${
                      isActive
                        ? "bg-white/10 text-white"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </span>
                </Link>
              );
            })}
            <Link href="/pricing">
              <span
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium no-underline transition-colors ${
                  location === "/pricing" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"
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
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium no-underline transition-colors ${
                    location === "/usage" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <BarChart3 className="w-4 h-4" />
                  Usage
                </span>
              </Link>
            )}
            <div className="pt-2 border-t border-white/5 space-y-1">
              {isAuthenticated ? (
                <>
                  {user?.role === "admin" && (
                    <AdminNavLink location={location} mobile onClick={() => setMobileMenuOpen(false)} />
                  )}
                  <button
                    onClick={() => { handleShare(); setMobileMenuOpen(false); }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/40 hover:text-white hover:bg-white/5 w-full transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
                    {copied ? "Link Copied!" : "Share This Page"}
                  </button>
                  <button
                    onClick={() => { startTour(); setMobileMenuOpen(false); }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/40 hover:text-white hover:bg-white/5 w-full transition-colors"
                  >
                    <HelpCircle className="w-4 h-4" />
                    Guided Tour
                  </button>
                  <button
                    onClick={() => { logout(); setMobileMenuOpen(false); }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/40 hover:text-white hover:bg-white/5 w-full transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </>
              ) : (
                <a
                  href={getLoginUrl()}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white no-underline"
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

      {/* Cookie Consent Banner */}
      <CookieConsent />

      {/* Footer — Suno-style minimal dark footer */}
      <footer className={`border-t border-white/5 py-6 mt-auto ${hasQueue ? "pb-24" : ""}`}>
        <div className="container text-center text-sm text-white/30 space-y-2">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/privacy">
              <span className="text-white/40 hover:text-white transition-colors cursor-pointer">Privacy Policy</span>
            </Link>
            <span className="text-white/10">|</span>
            <Link href="/terms">
              <span className="text-white/40 hover:text-white transition-colors cursor-pointer">Terms of Service</span>
            </Link>
            <span className="text-white/10">|</span>
            <Link href="/faq">
              <span className="text-white/40 hover:text-white transition-colors cursor-pointer">FAQ</span>
            </Link>
            <span className="text-white/10">|</span>
            <Link href="/blog">
              <span className="text-white/40 hover:text-white transition-colors cursor-pointer">Blog</span>
            </Link>
            <span className="text-white/10">|</span>
            <Link href="/referrals">
              <span className="text-white/40 hover:text-white transition-colors cursor-pointer">Invite Friends</span>
            </Link>
          </div>
          <p className="text-white/20">&copy; 2026 Albert LaMotte. All rights reserved. MakeCustomMusic.com</p>
        </div>
      </footer>
    </div>
  );
}
