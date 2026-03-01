import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link, useSearch } from "wouter";
import { getLoginUrl } from "@/const";
import {
  CreditCard, TrendingUp, Music, FileText, Guitar,
  ArrowUpRight, ArrowDownRight, Clock, Sparkles, ExternalLink,
  Loader2, CheckCircle2, Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function ProgressBar({ value, max, color = "bg-violet-600" }: { value: number; max: number; color?: string }) {
  const pct = max <= 0 ? 0 : Math.min(100, (value / max) * 100);
  return (
    <div className="h-2 bg-muted rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function UsageDashboard() {
  const { user, loading } = useAuth();
  const searchString = useSearch();
  const [showSuccess, setShowSuccess] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = trpc.credits.summary.useQuery(undefined, { enabled: !!user });
  const { data: history, isLoading: historyLoading, refetch: refetchHistory } = trpc.credits.history.useQuery({ limit: 30 }, { enabled: !!user });
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
      // Refetch data after successful checkout
      const timer = setTimeout(() => {
        refetchSummary();
        refetchHistory();
      }, 2000);
      // Clear URL params
      window.history.replaceState({}, "", "/usage");
      // Hide success banner after 8 seconds
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
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
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
    studio: "Studio",
  };

  const planColor: Record<string, string> = {
    free: "bg-gray-100 text-gray-700",
    creator: "bg-violet-100 text-violet-700",
    professional: "bg-violet-200 text-violet-800",
    studio: "bg-gray-900 text-white",
  };

  const typeIcons: Record<string, React.ReactNode> = {
    generation: <Music className="h-4 w-4" />,

    takes: <Sparkles className="h-4 w-4" />,
    purchase: <CreditCard className="h-4 w-4" />,
    bonus: <TrendingUp className="h-4 w-4" />,
    subscription_refill: <Clock className="h-4 w-4" />,
    refund: <ArrowUpRight className="h-4 w-4" />,
    admin: <ArrowUpRight className="h-4 w-4" />,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Checkout Success Banner */}
        {showSuccess && (
          <div className="mb-6 rounded-xl bg-green-50 border border-green-200 p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">Payment successful!</p>
              <p className="text-xs text-green-600 mt-0.5">
                Your account has been updated. Credits may take a moment to appear.
              </p>
            </div>
            <button onClick={() => setShowSuccess(false)} className="text-green-400 hover:text-green-600">
              &times;
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-black">Usage Dashboard</h1>
            <p className="text-muted-foreground mt-1">Track your credits and generation history</p>
          </div>
          <div className="flex items-center gap-3">
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
          <div className="rounded-xl border bg-gradient-to-r from-violet-50 to-fuchsia-50 p-5 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-black">
                  {planLabel[plan]} Plan — {subscription.billingCycle === "annual" ? "Annual" : "Monthly"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {subscription.status === "active" && subscription.currentPeriodEnd && (
                    <>Next billing date: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</>
                  )}
                  {subscription.status === "past_due" && (
                    <span className="text-amber-600 font-medium">Payment past due — please update your payment method</span>
                  )}
                  {subscription.status === "canceled" && (
                    <span className="text-red-600 font-medium">Subscription canceled — access until period end</span>
                  )}
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                subscription.status === "active" ? "bg-green-100 text-green-700" :
                subscription.status === "past_due" ? "bg-amber-100 text-amber-700" :
                "bg-red-100 text-red-700"
              }`}>
                {subscription.status === "active" ? "Active" :
                 subscription.status === "past_due" ? "Past Due" :
                 subscription.status === "trialing" ? "Trial" :
                 "Canceled"}
              </div>
            </div>
          </div>
        )}

        {/* Credit Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Total Credits</span>
              <CreditCard className="h-4 w-4 text-violet-600" />
            </div>
            <p className="text-3xl font-bold text-black">{balance?.totalCredits ?? 0}</p>
            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Monthly</span>
                <span>{balance?.monthlyCredits ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Bonus</span>
                <span>{balance?.bonusCredits ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Purchased</span>
                <span>{balance?.purchasedCredits ?? 0}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Songs Today</span>
              <Music className="h-4 w-4 text-violet-600" />
            </div>
            <p className="text-3xl font-bold text-black">{usage?.dailySongsGenerated ?? 0}</p>
            {limits && limits.dailySongLimit > 0 && (
              <>
                <p className="text-xs text-muted-foreground mt-1">
                  of {limits.dailySongLimit} daily limit
                </p>
                <div className="mt-2">
                  <ProgressBar
                    value={usage?.dailySongsGenerated ?? 0}
                    max={limits.dailySongLimit}
                  />
                </div>
              </>
            )}
            {limits && limits.dailySongLimit === -1 && (
              <p className="text-xs text-muted-foreground mt-1">Unlimited</p>
            )}
          </div>


        </div>

        {/* Monthly Usage */}
        <div className="rounded-xl border bg-card p-5 mb-8">
          <h2 className="font-semibold text-black mb-4">Monthly Usage</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Credits Used</p>
              <p className="text-2xl font-bold text-black">{usage?.monthlyCreditsUsed ?? 0}</p>
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
              <p className="text-2xl font-bold text-black">{120}s</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Audio Quality</p>
              <p className="text-lg font-bold text-black">{limits?.audioQuality ?? "128kbps"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">License</p>
              <p className="text-lg font-bold text-black capitalize">
                {plan === "free" ? "Personal" : plan === "creator" ? "Social" : "Commercial"}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions for free users */}
        {plan === "free" && (
          <div className="rounded-xl border bg-gradient-to-r from-violet-50 to-fuchsia-50 p-5 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-black">Want more songs?</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Upgrade to Creator for 250 songs/month, unlimited sheet music, and commercial rights.
                </p>
              </div>
              <Link href="/pricing">
                <Button className="bg-violet-600 hover:bg-violet-700 text-white">
                  View Plans <ArrowUpRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Transaction History */}
        <div className="rounded-xl border bg-card">
          <div className="p-5 border-b">
            <h2 className="font-semibold text-black">Recent Transactions</h2>
          </div>
          {historyLoading ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">Loading...</div>
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
            <div className="divide-y max-h-96 overflow-y-auto">
              {history.map((tx: any) => (
                <div key={tx.id} className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors">
                  <div className={`p-2 rounded-lg ${tx.amount > 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                    {tx.amount > 0 ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-black truncate">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleDateString()} &middot; {tx.type.replace("_", " ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${tx.amount > 0 ? "text-green-600" : "text-red-600"}`}>
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
