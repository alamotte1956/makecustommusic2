import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  DollarSign,
  Music,
  TrendingUp,
  Search,
  ChevronLeft,
  ChevronRight,
  Crown,
  Shield,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Eye,
  X,
  UserCog,
  Plus,
  Minus,
  AlertTriangle,
  Settings,
  RefreshCw,
  FileMusic,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";
import AdminNotificationCenter from "@/components/AdminNotificationCenter";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function timeAgo(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}

const planColors: Record<string, string> = {
  free: "bg-gray-100 text-gray-600",
  creator: "bg-violet-100 text-violet-700",
  professional: "bg-indigo-100 text-indigo-700",
  studio: "bg-amber-100 text-amber-700",
};

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  canceled: "bg-red-100 text-red-700",
  past_due: "bg-amber-100 text-amber-700",
  trialing: "bg-blue-100 text-blue-700",
  incomplete: "bg-gray-100 text-gray-600",
};

// ─── Sheet Music Management ────────────────────────────────────────────────

function SheetMusicManagement() {
  const { data: stats, isLoading, refetch } = trpc.admin.sheetMusicStats.useQuery(
    undefined,
    { refetchInterval: 10000 } // Poll every 10s to show progress
  );
  const utils = trpc.useUtils();

  const regenerateAll = trpc.admin.regenerateSheetMusic.useMutation({
    onSuccess: (result) => {
      if (result.queued === 0) {
        toast.info("No songs need sheet music regeneration");
      } else {
        toast.success(
          `Queued ${result.queued} song${result.queued === 1 ? "" : "s"} for sheet music generation. They will be processed in the background.`
        );
      }
      // Refetch stats after a short delay to show updated counts
      setTimeout(() => refetch(), 3000);
    },
    onError: (err) => toast.error("Failed to start regeneration: " + err.message),
  });

  const handleRegenerateAll = () => {
    regenerateAll.mutate({});
  };

  const handleRegenerateFailedOnly = () => {
    regenerateAll.mutate({ includeFailedOnly: true });
  };

  if (isLoading) return null;
  if (!stats) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-3">Sheet Music</h2>
      <div className="bg-white rounded-xl border border-border p-5 shadow-sm space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
            <FileMusic className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Total Songs</p>
              <p className="text-lg font-bold text-foreground">{stats.total}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-green-50 rounded-lg px-3 py-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <div>
              <p className="text-xs text-green-600">Completed</p>
              <p className="text-lg font-bold text-green-700">{stats.done}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-red-50 rounded-lg px-3 py-2">
            <XCircle className="w-4 h-4 text-red-500" />
            <div>
              <p className="text-xs text-red-500">Failed</p>
              <p className="text-lg font-bold text-red-600">{stats.failed}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <div>
              <p className="text-xs text-blue-500">In Progress</p>
              <p className="text-lg font-bold text-blue-600">{stats.generating}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-amber-50 rounded-lg px-3 py-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <div>
              <p className="text-xs text-amber-500">Missing</p>
              <p className="text-lg font-bold text-amber-600">{stats.missing}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {stats.needsRegeneration > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2 border-t border-border">
            <div className="flex-1">
              <p className="text-sm text-foreground font-medium">
                {stats.needsRegeneration} song{stats.needsRegeneration === 1 ? " needs" : "s need"} sheet music generation
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Songs are processed one at a time with 5-second intervals to avoid rate limits.
                {stats.needsRegeneration > 5 && " This may take several minutes."}
              </p>
            </div>
            <div className="flex gap-2">
              {stats.failed > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-red-200 text-red-600 hover:bg-red-50"
                  onClick={handleRegenerateFailedOnly}
                  disabled={regenerateAll.isPending}
                >
                  {regenerateAll.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Retry Failed ({stats.failed})
                </Button>
              )}
              <Button
                size="sm"
                className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
                onClick={handleRegenerateAll}
                disabled={regenerateAll.isPending}
              >
                {regenerateAll.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Regenerate All ({stats.needsRegeneration})
              </Button>
            </div>
          </div>
        )}

        {stats.needsRegeneration === 0 && stats.generating === 0 && (
          <div className="flex items-center gap-2 text-sm text-green-600 pt-2 border-t border-border">
            <CheckCircle2 className="w-4 h-4" />
            All songs have sheet music generated successfully.
          </div>
        )}

        {stats.needsRegeneration === 0 && stats.generating > 0 && (
          <div className="flex items-center gap-2 text-sm text-blue-600 pt-2 border-t border-border">
            <Loader2 className="w-4 h-4 animate-spin" />
            {stats.generating} song{stats.generating === 1 ? " is" : "s are"} currently being generated...
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "violet",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { value: number; label: string };
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    violet: "bg-violet-50 text-violet-600 border-violet-200",
    green: "bg-green-50 text-green-600 border-green-200",
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    amber: "bg-amber-50 text-amber-600 border-amber-200",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-200",
  };

  return (
    <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className={`p-2.5 rounded-lg border ${colorMap[color] ?? colorMap.violet}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          {trend.value >= 0 ? (
            <ArrowUpRight className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
          )}
          <span className={trend.value >= 0 ? "text-green-600" : "text-red-600"}>
            {Math.abs(trend.value)}
          </span>
          <span className="text-muted-foreground">{trend.label}</span>
        </div>
      )}
    </div>
  );
}

// ─── User Detail Modal ──────────────────────────────────────────────────────

function UserDetailModal({
  userId,
  onClose,
}: {
  userId: number;
  onClose: () => void;
}) {
  const { data: detail, isLoading } = trpc.admin.userDetail.useQuery({ userId });
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const utils = trpc.useUtils();

  const adjustCredits = trpc.admin.adjustCredits.useMutation({
    onSuccess: () => {
      toast.success("Credits adjusted successfully");
      setCreditAmount("");
      setCreditReason("");
      utils.admin.userDetail.invalidate({ userId });
      utils.admin.users.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateRole = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("User role updated");
      utils.admin.userDetail.invalidate({ userId });
      utils.admin.users.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-2xl w-full">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-2xl w-full">
          <p className="text-center text-muted-foreground">User not found</p>
          <Button variant="outline" onClick={onClose} className="mt-4 mx-auto block">
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {detail.name || "Unnamed User"}
            </h2>
            <p className="text-sm text-muted-foreground">{detail.email || "No email"}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* User Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground font-medium">User ID</p>
              <p className="text-sm font-mono">{detail.id}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Role</p>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                  detail.role === "admin" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
                }`}>
                  {detail.role === "admin" ? <Shield className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                  {detail.role}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() =>
                    updateRole.mutate({
                      userId: detail.id,
                      role: detail.role === "admin" ? "user" : "admin",
                    })
                  }
                  disabled={updateRole.isPending}
                >
                  {updateRole.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <UserCog className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Signed Up</p>
              <p className="text-sm">{formatDate(detail.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Last Active</p>
              <p className="text-sm">{timeAgo(detail.lastSignedIn)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Plan</p>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${planColors[detail.plan ?? "free"]}`}>
                {detail.plan ?? "free"}
              </span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Songs</p>
              <p className="text-sm font-semibold">{detail.songCount}</p>
            </div>
          </div>

          {/* Subscription Details */}
          {detail.plan && detail.plan !== "free" && (
            <div className="bg-violet-50/50 rounded-lg p-4 border border-violet-100">
              <h3 className="text-sm font-semibold text-foreground mb-2">Subscription</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[detail.subscriptionStatus ?? ""] ?? statusColors.incomplete}`}>
                    {detail.subscriptionStatus ?? "—"}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Billing</p>
                  <p>{detail.billingCycle ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Period Start</p>
                  <p>{formatDate(detail.currentPeriodStart)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Period End</p>
                  <p>{formatDate(detail.currentPeriodEnd)}</p>
                </div>
              </div>
              {detail.stripeCustomerId && (
                <p className="text-xs text-muted-foreground mt-2 font-mono">
                  Stripe: {detail.stripeCustomerId}
                </p>
              )}
            </div>
          )}

          {/* Credits */}
          <div className="bg-green-50/50 rounded-lg p-4 border border-green-100">
            <h3 className="text-sm font-semibold text-foreground mb-2">Credits</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Monthly</p>
                <p className="font-semibold">{detail.monthlyCredits}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Bonus</p>
                <p className="font-semibold">{detail.bonusCredits}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Purchased</p>
                <p className="font-semibold">{detail.purchasedCredits}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-bold text-green-700">{detail.totalCredits}</p>
              </div>
            </div>

            {/* Adjust Credits */}
            <div className="mt-3 flex items-center gap-2">
              <Input
                type="number"
                placeholder="Amount"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                className="w-24 h-8 text-sm"
              />
              <Input
                placeholder="Reason"
                value={creditReason}
                onChange={(e) => setCreditReason(e.target.value)}
                className="flex-1 h-8 text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                disabled={!creditAmount || !creditReason || adjustCredits.isPending}
                onClick={() => {
                  const amount = parseInt(creditAmount, 10);
                  if (isNaN(amount) || amount === 0) {
                    toast.error("Enter a valid non-zero amount");
                    return;
                  }
                  adjustCredits.mutate({
                    userId: detail.id,
                    amount,
                    reason: creditReason,
                  });
                }}
              >
                {adjustCredits.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : parseInt(creditAmount) > 0 ? (
                  <><Plus className="w-3 h-3 mr-1" /> Add</>
                ) : (
                  <><Minus className="w-3 h-3 mr-1" /> Deduct</>
                )}
              </Button>
            </div>
          </div>

          {/* Recent Transactions */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Recent Transactions ({detail.recentTransactions.length})
            </h3>
            {detail.recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No transactions yet</p>
            ) : (
              <div className="max-h-64 overflow-y-auto border border-border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Date</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Type</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Amount</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Balance</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {detail.recentTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-muted/30">
                        <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(tx.createdAt)}
                        </td>
                        <td className="px-3 py-2">
                          <span className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                            {tx.type}
                          </span>
                        </td>
                        <td className={`px-3 py-2 text-right font-mono text-xs ${
                          tx.amount > 0 ? "text-green-600" : "text-red-600"
                        }`}>
                          {tx.amount > 0 ? "+" : ""}{tx.amount}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-xs">
                          {tx.balanceAfter}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground max-w-[200px] truncate">
                          {tx.description || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Admin Dashboard ───────────────────────────────────────────────────

export default function AdminDashboard() {
  usePageMeta({
    title: "Admin Dashboard",
    description: "Admin dashboard for managing users, revenue, and site statistics.",
    canonicalPath: "/admin",
  });

  const { user, isAuthenticated, loading } = useAuth();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const PAGE_SIZE = 25;

  // Debounce search
  const searchTimeout = useMemo(() => {
    return (value: string) => {
      const id = setTimeout(() => {
        setDebouncedSearch(value);
        setPage(0);
      }, 300);
      return () => clearTimeout(id);
    };
  }, []);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    searchTimeout(value);
  };

  // Queries
  const { data: stats, isLoading: statsLoading } = trpc.admin.stats.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
    refetchInterval: 30_000,
  });

  const { data: revenue, isLoading: revenueLoading } = trpc.admin.revenue.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
    staleTime: 60_000,
  });

  const { data: usersData, isLoading: usersLoading } = trpc.admin.users.useQuery(
    {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      search: debouncedSearch || undefined,
    },
    {
      enabled: isAuthenticated && user?.role === "admin",
      placeholderData: (prev) => prev,
    }
  );

  // Auth guard
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="w-12 h-12 text-amber-500" />
        <h1 className="text-xl font-bold text-foreground">Access Denied</h1>
        <p className="text-muted-foreground">You must be an admin to view this page.</p>
      </div>
    );
  }

  const totalPages = Math.ceil((usersData?.total ?? 0) / PAGE_SIZE);

  return (
    <div className="container py-8 space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-violet-500" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage users, track revenue, and monitor site activity.
          </p>
        </div>
        <Link href="/admin/settings">
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </Button>
        </Link>
      </div>

      {/* Revenue Cards */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Revenue</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Stripe Balance"
            value={revenueLoading ? "..." : formatCurrency(revenue?.totalRevenue ?? 0)}
            subtitle="Available + pending"
            icon={DollarSign}
            color="green"
          />
          <StatCard
            title="This Month"
            value={revenueLoading ? "..." : formatCurrency(revenue?.revenueThisMonth ?? 0)}
            icon={TrendingUp}
            color="blue"
            trend={
              revenue && revenue.revenueLastMonth > 0
                ? {
                    value: Math.round(
                      ((revenue.revenueThisMonth - revenue.revenueLastMonth) /
                        revenue.revenueLastMonth) *
                        100
                    ),
                    label: "vs last month",
                  }
                : undefined
            }
          />
          <StatCard
            title="MRR"
            value={revenueLoading ? "..." : formatCurrency(revenue?.mrr ?? 0)}
            subtitle="Monthly recurring revenue"
            icon={CreditCard}
            color="violet"
          />
          <StatCard
            title="Active Subscriptions"
            value={revenueLoading ? "..." : (revenue?.activeSubscriptions ?? 0)}
            icon={Crown}
            color="amber"
          />
        </div>
      </div>

      {/* Site Stats Cards */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Site Activity</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Users"
            value={statsLoading ? "..." : (stats?.totalUsers ?? 0)}
            icon={Users}
            color="violet"
            trend={stats ? { value: stats.newUsersToday, label: "new today" } : undefined}
          />
          <StatCard
            title="Total Songs"
            value={statsLoading ? "..." : (stats?.totalSongs ?? 0)}
            icon={Music}
            color="blue"
            trend={stats ? { value: stats.songsToday, label: "today" } : undefined}
          />
          <StatCard
            title="Subscribers"
            value={statsLoading ? "..." : (stats?.activeSubscribers ?? 0)}
            subtitle={
              stats
                ? `${stats.creatorSubscribers} Pro, ${stats.professionalSubscribers} Premier`
                : undefined
            }
            icon={Crown}
            color="amber"
          />
          <StatCard
            title="Credits in Circulation"
            value={statsLoading ? "..." : (stats?.totalCreditsInCirculation ?? 0).toLocaleString()}
            icon={TrendingUp}
            color="green"
          />
        </div>
      </div>

      {/* Recent Charges */}
      {revenue && revenue.recentCharges.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Recent Charges</h2>
          <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Customer</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {revenue.recentCharges.map((charge) => (
                  <tr key={charge.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(charge.created * 1000).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">{charge.customerEmail || "—"}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">
                      {formatCurrency(charge.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                        charge.status === "succeeded"
                          ? "bg-green-100 text-green-700"
                          : charge.status === "failed"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {charge.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">
            Users {usersData ? `(${usersData.total})` : ""}
          </h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or ID..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
          {usersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
            </div>
          ) : !usersData?.users.length ? (
            <div className="text-center py-12 text-muted-foreground">
              {debouncedSearch ? "No users match your search." : "No users found."}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">User</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Plan</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Credits</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Songs</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Signed Up</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Last Active</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {usersData.users.map((u) => (
                      <tr key={u.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedUserId(u.id)}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-semibold text-xs">
                              {(u.name || u.email || "?")[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-foreground flex items-center gap-1">
                                {u.name || "Unnamed"}
                                {u.role === "admin" && (
                                  <Shield className="w-3 h-3 text-amber-500" />
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">{u.email || "No email"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${planColors[u.plan ?? "free"]}`}>
                            {u.plan ?? "free"}
                          </span>
                          {u.subscriptionStatus && u.subscriptionStatus !== "active" && (
                            <span className={`ml-1 inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[u.subscriptionStatus]}`}>
                              {u.subscriptionStatus}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {u.totalCredits}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {u.songCount}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {formatDate(u.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {timeAgo(u.lastSignedIn)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUserId(u.id);
                            }}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
                  <p className="text-xs text-muted-foreground">
                    Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, usersData.total)} of {usersData.total}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground px-2">
                      Page {page + 1} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Sheet Music Management */}
      <SheetMusicManagement />

      {/* Notification Center */}
      <AdminNotificationCenter />

      {/* User Detail Modal */}
      {selectedUserId && (
        <UserDetailModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
      )}
    </div>
  );
}
