import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CreditCard,
  Crown,
  AlertTriangle,
  Info,
  CircleDot,
} from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 20;

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  subscription_new: {
    label: "New Subscription",
    icon: <Crown className="w-4 h-4" />,
    color: "text-emerald-500 bg-emerald-500/10",
  },
  payment_failed: {
    label: "Payment Failed",
    icon: <AlertTriangle className="w-4 h-4" />,
    color: "text-red-500 bg-red-500/10",
  },
  subscription_canceled: {
    label: "Subscription Canceled",
    icon: <CreditCard className="w-4 h-4" />,
    color: "text-amber-500 bg-amber-500/10",
  },
  system: {
    label: "System",
    icon: <Info className="w-4 h-4" />,
    color: "text-blue-500 bg-blue-500/10",
  },
  other: {
    label: "Other",
    icon: <Bell className="w-4 h-4" />,
    color: "text-gray-500 bg-gray-500/10",
  },
};

function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminNotificationCenter() {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.admin.notifications.useQuery(
    {
      type: typeFilter === "all" ? undefined : typeFilter,
      isRead: readFilter === "all" ? undefined : readFilter === "read",
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    },
    { placeholderData: (prev) => prev }
  );

  const { data: unreadData } = trpc.admin.unreadNotificationCount.useQuery();

  const markRead = trpc.admin.markNotificationRead.useMutation({
    onSuccess: () => {
      utils.admin.notifications.invalidate();
      utils.admin.unreadNotificationCount.invalidate();
    },
  });

  const markAllRead = trpc.admin.markAllNotificationsRead.useMutation({
    onSuccess: () => {
      utils.admin.notifications.invalidate();
      utils.admin.unreadNotificationCount.invalidate();
      toast.success("All notifications marked as read");
    },
  });

  const deleteNotif = trpc.admin.deleteNotification.useMutation({
    onSuccess: () => {
      utils.admin.notifications.invalidate();
      utils.admin.unreadNotificationCount.invalidate();
      toast.success("Notification deleted");
    },
  });

  const notifications = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const unreadCount = unreadData?.count ?? 0;

  const handleExpand = (id: number, isRead: boolean) => {
    setExpandedId(expandedId === id ? null : id);
    if (!isRead) {
      markRead.mutate({ id });
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-violet-500" />
          <h2 className="font-semibold text-foreground">Notification Center</h2>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <div className="flex gap-1 flex-wrap">
          {["all", "subscription_new", "payment_failed", "subscription_canceled", "system"].map((t) => (
            <button
              key={t}
              onClick={() => { setTypeFilter(t); setPage(0); }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                typeFilter === t
                  ? "bg-violet-600 text-white"
                  : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {t === "all" ? "All Types" : TYPE_CONFIG[t]?.label ?? t}
            </button>
          ))}
        </div>
        <div className="h-4 w-px bg-border mx-1" />
        <div className="flex gap-1">
          {(["all", "unread", "read"] as const).map((r) => (
            <button
              key={r}
              onClick={() => { setReadFilter(r); setPage(0); }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                readFilter === r
                  ? "bg-violet-600 text-white"
                  : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {r === "all" ? "All" : r === "unread" ? "Unread" : "Read"}
            </button>
          ))}
        </div>
      </div>

      {/* Notification List */}
      <div className="divide-y divide-border">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <BellOff className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm font-medium">No notifications</p>
            <p className="text-xs mt-1">
              {typeFilter !== "all" || readFilter !== "all"
                ? "Try adjusting your filters."
                : "Notifications will appear here when subscriptions or payments occur."}
            </p>
          </div>
        ) : (
          notifications.map((notif: any) => {
            const config = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.other;
            const isExpanded = expandedId === notif.id;

            return (
              <div
                key={notif.id}
                className={`group px-4 py-3 transition-colors cursor-pointer hover:bg-muted/50 ${
                  !notif.isRead ? "bg-violet-500/5" : ""
                }`}
                onClick={() => handleExpand(notif.id, notif.isRead)}
              >
                <div className="flex items-start gap-3">
                  {/* Type icon */}
                  <div className={`p-1.5 rounded-lg mt-0.5 ${config.color}`}>
                    {config.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {!notif.isRead && (
                        <CircleDot className="w-2.5 h-2.5 text-violet-500 flex-shrink-0" />
                      )}
                      <h4 className={`text-sm font-medium truncate ${!notif.isRead ? "text-foreground" : "text-muted-foreground"}`}>
                        {notif.title}
                      </h4>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatTimeAgo(notif.createdAt)}
                    </p>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="mt-3 p-3 rounded-lg bg-muted/50 text-sm text-foreground whitespace-pre-wrap">
                        {notif.content}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notif.isRead && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markRead.mutate({ id: notif.id });
                        }}
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                        title="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotif.mutate({ id: notif.id });
                      }}
                      className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-500"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
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
              {page + 1} / {totalPages}
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
    </div>
  );
}
