import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import {
  Music, History, Disc3, Sparkles, LogOut, LogIn, Menu, X, Heart,
  CreditCard, BarChart3, Globe, Upload, HelpCircle, Crown, Gift,
  FileAudio, Share2, Check, Shield, Search, Home, Radio, ChevronLeft,
  BookOpen, Cross
} from "lucide-react";
import { toast } from "sonner";
import NotificationCenter from "@/components/NotificationCenter";
import CookieConsent from "@/components/CookieConsent";
import { useState } from "react";
import { useQueuePlayer } from "@/contexts/QueuePlayerContext";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { trpc } from "@/lib/trpc";

/* ─── Suno-style sidebar nav items ─── */
const sidebarNavItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/generate", label: "Create", icon: Sparkles },
  { href: "/history", label: "Library", icon: History },
  { href: "/favorites", label: "Favorites", icon: Heart },
  { href: "/albums", label: "Albums", icon: Disc3 },
  { href: "/discover", label: "Explore", icon: Globe },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/mp3-to-sheet-music", label: "MP3 to Sheet", icon: FileAudio },
  { href: "/worship", label: "Worship Sets", icon: BookOpen },
];

/* ─── Top nav items for visitors ─── */
const visitorNavItems = [
  { href: "/discover", label: "Explore", icon: Globe },
  { href: "/pricing", label: "Pricing", icon: CreditCard },
  { href: "/faq", label: "FAQ", icon: HelpCircle },
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
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium no-underline transition-colors ${
            location === "/admin" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/[0.04]"
          }`}
          onClick={onClick}
        >
          <Shield className="w-4 h-4" />
          Admin
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-auto">
              {unreadCount}
            </span>
          )}
        </span>
      </Link>
    );
  }

  return (
    <Link href="/admin">
      <span className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors no-underline relative ${
        location === "/admin" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/[0.04]"
      }`}>
        <Shield className="w-4 h-4" />
        Admin
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </span>
    </Link>
  );
}

const planLabel: Record<string, string> = {
  free: "Free",
  creator: "Pro",
  professional: "Premier",
};

const planBadgeStyle: Record<string, string> = {
  free: "bg-white/10 text-white/70 border-white/10",
  creator: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  professional: "bg-gradient-to-r from-pink-500/20 to-orange-500/20 text-orange-300 border-orange-500/30",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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

  /* ─── Authenticated: Suno-style sidebar layout ─── */
  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex bg-background">
        {/* ─── Shimmer Aurora Background ─── */}
        <div className="shimmer-bg">
          <div className="shimmer-orb-1" />
          <div className="shimmer-orb-2" />
          <div className="shimmer-orb-3" />
        </div>
        {/* ─── Left Sidebar (Desktop) ─── */}
        <aside className={`hidden lg:flex flex-col fixed top-0 left-0 h-full z-40 border-r border-white/[0.06] bg-[#0a0a0a] transition-all duration-200 ${
          sidebarCollapsed ? "w-16" : "w-56"
        }`}>
          {/* Logo */}
          <div className="flex items-center justify-between px-4 h-14 shrink-0">
            {!sidebarCollapsed && (
              <Link href="/" className="no-underline">
                <span className="text-[15px] font-semibold text-white tracking-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Make Custom Music
                </span>
              </Link>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-md hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-colors"
            >
              <ChevronLeft className={`w-4 h-4 transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`} />
            </button>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
            {sidebarNavItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href}>
                  <span
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium no-underline transition-colors ${
                      isActive
                        ? "bg-white/10 text-white"
                        : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                    } ${sidebarCollapsed ? "justify-center px-0" : ""}`}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {!sidebarCollapsed && item.label}
                  </span>
                </Link>
              );
            })}

            {user?.role === "admin" && (
              <AdminNavLink location={location} />
            )}
          </nav>

          {/* Bottom section: Upgrade + User */}
          <div className="px-2 pb-3 space-y-2 shrink-0">
            {/* Upgrade card */}
            {currentPlan === "free" && !sidebarCollapsed && (
              <Link href="/pricing">
                <div className="mx-1 p-3 rounded-lg bg-gradient-to-br from-pink-500/10 to-orange-500/10 border border-pink-500/20 no-underline">
                  <p className="text-xs font-semibold text-white">Go Pro</p>
                  <p className="text-[11px] text-white/50 mt-0.5">Unlock more songs, better models</p>
                  <span className="inline-block mt-2 text-[11px] font-semibold text-pink-400 hover:text-pink-300">
                    Upgrade →
                  </span>
                </div>
              </Link>
            )}

            {/* Credits / Plan */}
            <Link href="/usage">
              <span className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs no-underline transition-colors hover:bg-white/[0.04] ${
                sidebarCollapsed ? "justify-center px-0" : ""
              }`}>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${planBadgeStyle[currentPlan] ?? planBadgeStyle.free}`}>
                  {currentPlan !== "free" && <Crown className="w-2.5 h-2.5" />}
                  {planLabel[currentPlan] ?? "Free"}
                </span>
                {!sidebarCollapsed && summary && (
                  <span className="text-white/40">{summary.balance.totalCredits} credits</span>
                )}
              </span>
            </Link>

            {/* User info */}
            <div className={`flex items-center gap-2 px-3 py-2 ${sidebarCollapsed ? "justify-center px-0" : ""}`}>
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-xs font-semibold shrink-0">
                {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/80 truncate">{user?.name || user?.email || "User"}</p>
                </div>
              )}
              <button
                onClick={() => logout()}
                className="p-1 rounded hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-colors"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>

        {/* ─── Main Content Area ─── */}
        <div className={`flex-1 flex flex-col min-h-screen transition-all duration-200 ${
          sidebarCollapsed ? "lg:ml-16" : "lg:ml-56"
        }`}>
          {/* Top bar */}
          <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-background/95 backdrop-blur-xl h-14 flex items-center px-4 gap-3">
            {/* Mobile hamburger */}
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-white/[0.06] text-white/60"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Mobile logo */}
            <Link href="/" className="lg:hidden no-underline">
              <span className="text-[14px] font-semibold text-white tracking-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>Make Custom Music</span>
            </Link>

            <div className="flex-1" />

            {/* Right actions */}
            <div className="flex items-center gap-1.5">
              <NotificationCenter />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="text-white/50 hover:text-white hover:bg-white/[0.06] h-8 w-8 p-0"
                title="Share this page"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => startTour()}
                className="text-white/50 hover:text-white hover:bg-white/[0.06] h-8 w-8 p-0"
                title="Guided tour"
              >
                <HelpCircle className="w-4 h-4" />
              </Button>
            </div>
          </header>

          {/* Mobile sidebar overlay */}
          {mobileMenuOpen && (
            <div className="lg:hidden fixed inset-0 z-50 flex">
              <div className="absolute inset-0 bg-black/60" onClick={() => setMobileMenuOpen(false)} />
              <div className="relative w-64 bg-[#0a0a0a] border-r border-white/[0.06] flex flex-col h-full">
                <div className="flex items-center justify-between px-4 h-14 border-b border-white/[0.06]">
                  <span className="text-[15px] font-semibold text-white tracking-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>Make Custom Music</span>
                  <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 rounded-md hover:bg-white/[0.06] text-white/40">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
                  {sidebarNavItems.map((item) => {
                    const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                    return (
                      <Link key={item.href} href={item.href}>
                        <span
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium no-underline transition-colors ${
                            isActive ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/[0.04]"
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
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium no-underline transition-colors ${
                        location === "/pricing" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <CreditCard className="w-4 h-4" />
                      Pricing
                    </span>
                  </Link>
                  <Link href="/usage">
                    <span
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium no-underline transition-colors ${
                        location === "/usage" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <BarChart3 className="w-4 h-4" />
                      Usage
                    </span>
                  </Link>
                  {user?.role === "admin" && (
                    <AdminNavLink location={location} mobile onClick={() => setMobileMenuOpen(false)} />
                  )}
                </nav>
                <div className="px-3 pb-4 border-t border-white/[0.06] pt-3">
                  <button
                    onClick={() => { logout(); setMobileMenuOpen(false); }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/50 hover:text-white hover:bg-white/[0.04] w-full transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Log Out
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Page content */}
          <main className="flex-1">
            {children}
          </main>

          <CookieConsent />

          {/* Footer */}
          <footer className={`border-t border-white/[0.06] py-5 mt-auto ${hasQueue ? "pb-24" : ""}`}>
            <div className="px-6 text-center text-xs text-white/30 space-y-2">
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Link href="/privacy"><span className="text-white/40 hover:text-white/70 transition-colors cursor-pointer">Privacy Policy</span></Link>
                <span className="text-white/10">·</span>
                <Link href="/terms"><span className="text-white/40 hover:text-white/70 transition-colors cursor-pointer">Terms of Service</span></Link>
                <span className="text-white/10">·</span>
                <Link href="/faq"><span className="text-white/40 hover:text-white/70 transition-colors cursor-pointer">FAQ</span></Link>
                <span className="text-white/10">·</span>
                <Link href="/blog"><span className="text-white/40 hover:text-white/70 transition-colors cursor-pointer">Blog</span></Link>
                <span className="text-white/10">·</span>
                <Link href="/licensing"><span className="text-white/40 hover:text-white/70 transition-colors cursor-pointer">Church Licensing</span></Link>
                <span className="text-white/10">·</span>
                <Link href="/referrals"><span className="text-white/40 hover:text-white/70 transition-colors cursor-pointer">Invite Friends</span></Link>
              </div>
              <p className="text-white/25">&copy; 2026 Albert LaMotte. All rights reserved. MakeCustomMusic.com</p>
            </div>
          </footer>
        </div>
      </div>
    );
  }

  /* ─── Visitor: Minimal top nav (Suno public style) ─── */
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ─── Shimmer Aurora Background ─── */}
      <div className="shimmer-bg">
        <div className="shimmer-orb-1" />
        <div className="shimmer-orb-2" />
        <div className="shimmer-orb-3" />
      </div>
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-background/95 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 no-underline shrink-0">
            <span className="text-[15px] font-semibold text-white tracking-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Make Custom Music
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {visitorNavItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <span className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors no-underline ${
                    isActive ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                  }`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <a href={getLoginUrl()} className="px-3 py-1.5 text-sm text-white/60 hover:text-white transition-colors no-underline">
              Sign In
            </a>
            <Button asChild size="sm" className="suno-gradient text-white font-semibold px-5 rounded-full border-0 hover:opacity-90">
              <a href={getLoginUrl()} className="no-underline">
                Sign Up Free
              </a>
            </Button>
          </div>

          {/* Mobile */}
          <div className="md:hidden">
            <button
              className="p-2 rounded-lg hover:bg-white/[0.06] text-white/60"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/[0.06] bg-background p-4 space-y-1">
            {visitorNavItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <span
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium no-underline transition-colors ${
                    location === item.href ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </span>
              </Link>
            ))}
            <div className="pt-2 border-t border-white/[0.06]">
              <a
                href={getLoginUrl()}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white no-underline"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </a>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {children}
      </main>

      <CookieConsent />

      <footer className={`border-t border-white/[0.06] py-6 mt-auto ${hasQueue ? "pb-24" : ""}`}>
        <div className="container text-center text-xs text-white/30 space-y-2">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/privacy"><span className="text-white/40 hover:text-white/70 transition-colors cursor-pointer">Privacy Policy</span></Link>
            <span className="text-white/10">·</span>
            <Link href="/terms"><span className="text-white/40 hover:text-white/70 transition-colors cursor-pointer">Terms of Service</span></Link>
            <span className="text-white/10">·</span>
            <Link href="/faq"><span className="text-white/40 hover:text-white/70 transition-colors cursor-pointer">FAQ</span></Link>
            <span className="text-white/10">·</span>
            <Link href="/blog"><span className="text-white/40 hover:text-white/70 transition-colors cursor-pointer">Blog</span></Link>
            <span className="text-white/10">·</span>
            <Link href="/licensing"><span className="text-white/40 hover:text-white/70 transition-colors cursor-pointer">Church Licensing</span></Link>
          </div>
          <p className="text-white/25">&copy; 2026 Albert LaMotte. All rights reserved. MakeCustomMusic.com</p>
        </div>
      </footer>
    </div>
  );
}
