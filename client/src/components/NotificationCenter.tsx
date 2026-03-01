import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Bell, Check, CheckCheck, Music, CreditCard, Heart, Share2, Info, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { toast } from "sonner";

type NotificationType = "song_ready" | "song_favorited" | "song_shared" | "credit_added" | "system";

const typeConfig: Record<NotificationType, { icon: React.ReactNode; color: string }> = {
  song_ready: { icon: <Music className="h-4 w-4" />, color: "bg-violet-100 text-violet-600" },
  song_favorited: { icon: <Heart className="h-4 w-4" />, color: "bg-pink-100 text-pink-600" },
  song_shared: { icon: <Share2 className="h-4 w-4" />, color: "bg-blue-100 text-blue-600" },
  credit_added: { icon: <CreditCard className="h-4 w-4" />, color: "bg-green-100 text-green-600" },
  system: { icon: <Info className="h-4 w-4" />, color: "bg-gray-100 text-gray-600" },
};

function timeAgo(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return d.toLocaleDateString();
}

export default function NotificationCenter() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const utils = trpc.useUtils();

  // Poll unread count every 15 seconds
  const { data: unreadData } = trpc.notifications.unreadCount.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 15000,
  });

  const { data: notificationsList, isLoading } = trpc.notifications.list.useQuery(
    { limit: 30 },
    { enabled: !!user && isOpen }
  );

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    },
  });

  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
      toast.success("All notifications marked as read");
    },
  });

  const deleteNotification = trpc.notifications.delete.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    },
  });

  const unreadCount = unreadData?.count ?? 0;

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  const handleNotificationClick = useCallback(
    (id: number, isRead: number) => {
      if (!isRead) {
        markRead.mutate({ id });
      }
    },
    [markRead]
  );

  if (!user) return null;

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="h-5 w-5 text-black" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-2 w-[380px] max-h-[480px] bg-card border rounded-xl shadow-xl z-50 flex flex-col overflow-hidden"
          style={{ maxWidth: "calc(100vw - 24px)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <h3 className="font-semibold text-black text-sm">Notifications</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-black"
                  onClick={() => markAllRead.mutate()}
                  disabled={markAllRead.isPending}
                >
                  <CheckCheck className="h-3.5 w-3.5 mr-1" />
                  Mark all read
                </Button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-pulse text-sm text-muted-foreground">Loading...</div>
              </div>
            ) : !notificationsList || notificationsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <Bell className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  You'll be notified when your songs are ready
                </p>
              </div>
            ) : (
              <div>
                {notificationsList.map((notification) => {
                  const config = typeConfig[notification.type as NotificationType] ?? typeConfig.system;
                  const isUnread = notification.isRead === 0;

                  return (
                    <div
                      key={notification.id}
                      className={`group relative flex gap-3 px-4 py-3 border-b last:border-b-0 transition-colors cursor-pointer hover:bg-muted/50 ${
                        isUnread ? "bg-violet-50/50" : ""
                      }`}
                      onClick={() => handleNotificationClick(notification.id, notification.isRead)}
                    >
                      {/* Icon */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${config.color}`}>
                        {config.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm leading-snug ${isUnread ? "font-semibold text-black" : "text-foreground"}`}>
                            {notification.title}
                          </p>
                          {isUnread && (
                            <span className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-violet-500" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-muted-foreground/70">
                            {timeAgo(notification.createdAt)}
                          </span>
                          {notification.songId && (
                            <Link
                              href={`/songs/${notification.songId}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(false);
                                if (isUnread) markRead.mutate({ id: notification.id });
                              }}
                            >
                              <span className="text-[10px] text-violet-600 hover:underline font-medium">
                                View Song
                              </span>
                            </Link>
                          )}
                        </div>
                      </div>

                      {/* Delete button on hover */}
                      <button
                        className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification.mutate({ id: notification.id });
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notificationsList && notificationsList.length > 0 && (
            <div className="border-t px-4 py-2 bg-muted/30">
              <p className="text-[10px] text-muted-foreground text-center">
                Showing last {notificationsList.length} notifications
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
