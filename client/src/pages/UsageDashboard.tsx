import { useEffect, useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link, useSearch } from "wouter";
import { getLoginUrl } from "@/const";
import {
  CreditCard, TrendingUp, Music, FileText, Guitar,
  ArrowUpRight, ArrowDownRight, Clock, Sparkles, ExternalLink,
  Loader2, CheckCircle2, Settings, BarChart3, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { usePageMeta } from "@/hooks/usePageMeta";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, Legend,
} from "recharts";

function ProgressBar({ value, max, color = "bg-violet-600" }: { value: number; max: number; color?: string }) {
  const pct = max <= 0 ? 0 : Math.min(100, (value / max) * 100);
  return (
    <div className="h-2 bg-muted rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function UsageChart({ data, view }: { data: any; view: "daily" | "weekly" }) {
  const chartData = useMemo(() => {
    if (!data) return [];
    const source = view === "daily" ? data.daily : data.weekly;
    return (source ?? []).map((d: any) => ({
      ...d,
      label: view === "daily"
        ? new Date(d.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : `Wk ${new Date(d.week + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
    }));
  }, [data, view]);

  if (!chartData.length) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
        No usage data yet. Generate some songs to see your chart!
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradGeneration" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradTts" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradTakes" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
          interval={view === "daily" ? Math.floor(chartData.length / 7) : 0}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            background: "rgba(15, 15, 20, 0.95)",
            border: "1px solid rgba(139, 92, 246, 0.3)",
            borderRadius: "12px",
            padding: "12px",
            boxShadow: "0 8px 32px rgba(139, 92, 246, 0.2)",
          }}
          labelStyle={{ color: "#e5e7eb", fontWeight: 600, marginBottom: 4 }}
          itemStyle={{ color: "#d1d5db", fontSize: 12 }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          iconType="circle"
          iconSize={8}
        />
        <Area
          type="monotone"
          dataKey="generation"
          name="Song Generation"
          stroke="#8b5cf6"
          strokeWidth={2}
          fill="url(#gradGeneration)"
          dot={false}
          activeDot={{ r: 5, stroke: "#8b5cf6", strokeWidth: 2, fill: "#1a1a2e" }}
        />
        <Area
          type="monotone"
          dataKey="tts"
          name="Sheet Music"
          stroke="#06b6d4"
          strokeWidth={2}
          fill="url(#gradTts)"
          dot={false}
          activeDot={{ r: 5, stroke: "#06b6d4", strokeWidth: 2, fill: "#1a1a2e" }}
        />
        <Area
          type="monotone"
          dataKey="takes"
          name="Takes"
          stroke="#f59e0b"
          strokeWidth={2}
          fill="url(#gradTakes)"
          dot={false}
          activeDot={{ r: 5, stroke: "#f59e0b", strokeWidth: 2, fill: "#1a1a2e" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function SongCountChart({ data, view }: { data: any; view: "daily" | "weekly" }) {
  const chartData = useMemo(() => {
    if (!data) return [];
    const source = view === "daily" ? data.daily : data.weekly;
    return (source ?? []).map((d: any) => ({
      ...d,
      label: view === "daily"
        ? new Date(d.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : `Wk ${new Date(d.week + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
    }));
  }, [data, view]);

  if (!chartData.length) return null;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
          interval={view === "daily" ? Math.floor(chartData.length / 7) : 0}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            background: "rgba(15, 15, 20, 0.95)",
            border: "1px solid rgba(139, 92, 246, 0.3)",
            borderRadius: "12px",
            padding: "12px",
            boxShadow: "0 8px 32px rgba(139, 92, 246, 0.2)",
          }}
          labelStyle={{ color: "#e5e7eb", fontWeight: 600, marginBottom: 4 }}
          itemStyle={{ color: "#d1d5db", fontSize: 12 }}
        />
        <Bar
          dataKey="songCount"
          name="Songs Generated"
          fill="#8b5cf6"
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function UsageDashboard() {
  usePageMeta({
    title: "Usage Dashboard",
    description: "Track your worship music generation credits, subscription plan, and usage history on Create Christian Music.",
    keywords: "music generation credits, worship song usage, christian music subscription tracker, AI song credits, worship music plan usage, church music account",
    canonicalPath: "/usage",
  });
  const { user, loading } = useAuth();
  const searchString = useSearch();
  const [showSuccess, setShowSuccess] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [chartView, setChartView] = useState<"daily" | "weekly">("daily");
  const [chartDays, setChartDays] = useState(30);

  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = trpc.credits.summary.useQuery(undefined, { enabled: !!user });
  const { data: history, isLoading: historyLoading, refetch: refetchHistory } = trpc.credits.history.useQuery({ limit: 50 }, { enabled: !!user });
  const { data: chartData, isLoading: chartLoading } = trpc.credits.usageChart.useQuery({ days: chartDays }, { enabled: !!user });
  const { data: stripeStatus } = trpc.credits.stripeStatus.useQuery();

  const createPortalSession = trpc.credits.createPortalSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, "_blank");
      }
      setPortalLoading(false);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to open billing portal");
      setPortalLoading(false);
    },
  });

  // Handle checkout success redirect
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    if (params.get("checkout") === "success") {
      setShowSuccess(true);
      const timer = setTimeout(() => {
        refetchSummary();
        refetchHistory();
      }, 2000);
      window.history.replaceState({}, "", "/usage");
      const hideTimer = setTimeout(() => setShowSuccess(false), 8000);
      return () => {
        clearTimeout(timer);
        clearTimeout(hideTimer);
      };
    }
  }, [searchString]);

  const handleManageBilling = () => {
    if (!stripeStatus?.configured) {
      toast.error("Billing portal is not available yet.");
      return;
    }
    setPortalLoading(true);
    createPortalSession.mutate({
      returnUrl: `${window.location.origin}/usage`,
    });
  };

  if (loading || summaryLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Sign in to view your usage dashboard</p>
        <a href={getLoginUrl()}>
          <Button>Sign In</Button>
        </a>
      </div>
    );
  }

  const plan = summary?.plan ?? "free";
  const limits = summary?.limits;
  const balance = summary?.balance;
  const usage = summary?.usage;
  const subscription = summary?.subscription;

  const planLabel: Record<string, string> = {
    free: "Free",
    creator: "Creator",
    professional: "Professional",
  };

  const planColor: Record<string, string> = {
    free: "bg-gray-800/50 text-gray-300 border border-gray-700",
    creator: "bg-violet-500/20 text-violet-300 border border-violet-500/30",
    professional: "bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30",
  };

  // Compute chart summary stats
  const chartSummary = useMemo(() => {
    if (!chartData?.daily) return { totalCreditsUsed: 0, totalSongs: 0, avgPerDay: 0 };
    const totalCreditsUsed = chartData.daily.reduce((s: number, d: any) => s + d.total, 0);
    const totalSongs = chartData.daily.reduce((s: number, d: any) => s + d.songCount, 0);
    const activeDays = chartData.daily.filter((d: any) => d.total > 0).length;
    return {
      totalCreditsUsed,
      totalSongs,
      avgPerDay: activeDays > 0 ? Math.round(totalCreditsUsed / activeDays) : 0,
    };
  }, [chartData]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Checkout Success Banner */}
        {showSuccess && (
          <div className="mb-6 rounded-xl bg-green-500/10 border border-green-500/30 p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-300">Payment successful!</p>
              <p className="text-xs text-green-400/70 mt-0.5">
                Your account has been updated. Credits may take a moment to appear.
              </p>
            </div>
            <button onClick={() => setShowSuccess(false)} className="text-green-500/50 hover:text-green-400">
              &times;
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Usage Dashboard</h1>
            <p className="text-muted-foreground mt-1">Track your credits and generation history</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${planColor[plan]}`}>
              {planLabel[plan]} Plan
            </span>
            {plan !== "free" && subscription?.stripeCustomerId && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleManageBilling}
                disabled={portalLoading}
              >
                {portalLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Settings className="h-4 w-4 mr-1" />
                )}
                Manage Billing
              </Button>
            )}
            <Link href="/pricing">
              <Button variant="outline" size="sm">
                {plan === "free" ? "Upgrade" : "Change Plan"}
              </Button>
            </Link>
          </div>
        </div>

        {/* Subscription Info (for paid plans) */}
        {plan !== "free" && subscription && (
          <div className="glow-card rounded-xl border border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 p-5 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-foreground">
                  {planLabel[plan]} Plan — {subscription.billingCycle === "annual" ? "Annual" : "Monthly"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {subscription.status === "active" && subscription.currentPeriodEnd && (
                    <>Next billing date: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</>
                  )}
                  {subscription.status === "past_due" && (
                    <span className="text-amber-400 font-medium">Payment past due — please update your payment method</span>
                  )}
                  {subscription.status === "canceled" && (
                    <span className="text-red-400 font-medium">Subscription canceled — access until period end</span>
                  )}
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                subscription.status === "active" ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                subscription.status === "past_due" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                "bg-red-500/20 text-red-400 border border-red-500/30"
              }`}>
                {subscription.status === "active" ? "Active" :
                 subscription.status === "past_due" ? "Past Due" :
                 subscription.status === "trialing" ? "Trial" :
                 "Canceled"}
              </div>
            </div>
            {subscription.status === "active" && (
              <div className="mt-4 pt-4 border-t border-border/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Want to cancel?</p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      You can cancel anytime. Your access continues until the end of your current billing period.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={handleManageBilling}
                    disabled={portalLoading}
                  >
                    {portalLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : null}
                    Cancel Subscription
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Credit Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Total Credits - Hero Card */}
          <div className="glow-card rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-card to-fuchsia-500/5 p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">Total Credits</span>
                <div className="p-1.5 rounded-lg bg-violet-500/20">
                  <CreditCard className="h-4 w-4 text-violet-400" />
                </div>
              </div>
              <p className="text-4xl font-bold text-foreground">{balance?.totalCredits ?? 0}</p>
              <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between items-center">
                  <span>Monthly</span>
                  <span className="font-medium text-foreground/80">{balance?.monthlyCredits ?? 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Bonus</span>
                  <span className="font-medium text-foreground/80">{balance?.bonusCredits ?? 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Purchased</span>
                  <span className="font-medium text-foreground/80">{balance?.purchasedCredits ?? 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Songs Today */}
          <div className="glow-card rounded-xl border bg-card p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">Songs Today</span>
                <div className="p-1.5 rounded-lg bg-cyan-500/20">
                  <Music className="h-4 w-4 text-cyan-400" />
                </div>
              </div>
              <p className="text-4xl font-bold text-foreground">{usage?.dailySongsGenerated ?? 0}</p>
              {limits && limits.dailySongLimit > 0 && (
                <>
                  <p className="text-xs text-muted-foreground mt-2">
                    of {limits.dailySongLimit} daily limit
                  </p>
                  <div className="mt-2">
                    <ProgressBar
                      value={usage?.dailySongsGenerated ?? 0}
                      max={limits.dailySongLimit}
                      color="bg-cyan-500"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Period Summary */}
          <div className="glow-card rounded-xl border bg-card p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">Last {chartDays} Days</span>
                <div className="p-1.5 rounded-lg bg-amber-500/20">
                  <TrendingUp className="h-4 w-4 text-amber-400" />
                </div>
              </div>
              <p className="text-4xl font-bold text-foreground">{chartSummary.totalSongs}</p>
              <p className="text-xs text-muted-foreground mt-1">songs generated</p>
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <div>
                  <span className="text-foreground/80 font-medium">{chartSummary.totalCreditsUsed}</span> credits used
                </div>
                <div>
                  <span className="text-foreground/80 font-medium">{chartSummary.avgPerDay}</span> avg/day
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Chart */}
        <div className="glow-card rounded-xl border bg-card p-5 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-violet-400" />
              <h2 className="font-semibold text-foreground">Credit Usage Over Time</h2>
            </div>
            <div className="flex items-center gap-2">
              {/* Time range selector */}
              <div className="flex rounded-lg border border-border/50 overflow-hidden text-xs">
                {[
                  { label: "7d", value: 7 },
                  { label: "30d", value: 30 },
                  { label: "90d", value: 90 },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setChartDays(opt.value)}
                    className={`px-3 py-1.5 transition-colors ${
                      chartDays === opt.value
                        ? "bg-violet-500/20 text-violet-300"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {/* View toggle */}
              <div className="flex rounded-lg border border-border/50 overflow-hidden text-xs">
                <button
                  onClick={() => setChartView("daily")}
                  className={`px-3 py-1.5 flex items-center gap-1 transition-colors ${
                    chartView === "daily"
                      ? "bg-violet-500/20 text-violet-300"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <Calendar className="h-3 w-3" /> Daily
                </button>
                <button
                  onClick={() => setChartView("weekly")}
                  className={`px-3 py-1.5 flex items-center gap-1 transition-colors ${
                    chartView === "weekly"
                      ? "bg-violet-500/20 text-violet-300"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <BarChart3 className="h-3 w-3" /> Weekly
                </button>
              </div>
            </div>
          </div>
          {chartLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="h-8 w-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
            </div>
          ) : (
            <UsageChart data={chartData} view={chartView} />
          )}
        </div>

        {/* Songs Generated Chart */}
        {chartData && (chartData.daily?.some((d: any) => d.songCount > 0) || chartData.weekly?.some((d: any) => d.songCount > 0)) && (
          <div className="glow-card rounded-xl border bg-card p-5 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Music className="h-5 w-5 text-violet-400" />
              <h2 className="font-semibold text-foreground">Songs Generated</h2>
            </div>
            <SongCountChart data={chartData} view={chartView} />
          </div>
        )}

        {/* Monthly Usage */}
        <div className="glow-card rounded-xl border bg-card p-5 mb-8">
          <h2 className="font-semibold text-foreground mb-4">Monthly Usage</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Credits Used</p>
              <p className="text-2xl font-bold text-foreground">{usage?.monthlyCreditsUsed ?? 0}</p>
              {limits && (
                <div className="mt-2">
                  <ProgressBar
                    value={usage?.monthlyCreditsUsed ?? 0}
                    max={limits.monthlyCredits}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    of {limits.monthlyCredits} monthly
                  </p>
                </div>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Max Song Length</p>
              <p className="text-2xl font-bold text-foreground">120s</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Audio Quality</p>
              <p className="text-lg font-bold text-foreground">{limits?.audioQuality ?? "128kbps"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">License</p>
              <p className="text-lg font-bold text-foreground capitalize">
                {plan === "free" ? "Personal" : plan === "creator" ? "Social" : "Commercial"}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions for free users */}
        {plan === "free" && (
          <div className="glow-card rounded-xl border border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 p-5 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-foreground">Want more songs?</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Upgrade to Creator for 125 songs/month, unlimited sheet music, and commercial rights.
                </p>
              </div>
              <Link href="/pricing">
                <Button className="btn-glow bg-violet-600 hover:bg-violet-700 text-white">
                  View Plans <ArrowUpRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Transaction History */}
        <div className="glow-card rounded-xl border bg-card overflow-hidden">
          <div className="p-5 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-violet-400" />
              <h2 className="font-semibold text-foreground">Recent Transactions</h2>
            </div>
          </div>
          {historyLoading ? (
            <div className="p-8 text-center">
              <div className="h-8 w-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin mx-auto" />
            </div>
          ) : !history || history.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">No transactions yet</p>
              <Link href="/generator">
                <Button variant="outline" size="sm" className="mt-3">
                  Create Your First Song
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border/30 max-h-[480px] overflow-y-auto">
              {history.map((tx: any) => (
                <div key={tx.id} className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors">
                  <div className={`p-2 rounded-lg ${
                    tx.amount > 0
                      ? "bg-green-500/15 text-green-400"
                      : "bg-red-500/15 text-red-400"
                  }`}>
                    {tx.amount > 0 ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleDateString()} &middot; {tx.type.replace(/_/g, " ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${tx.amount > 0 ? "text-green-400" : "text-red-400"}`}>
                      {tx.amount > 0 ? "+" : ""}{tx.amount}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      bal: {tx.balanceAfter}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
