import { trpc } from "@/lib/trpc";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import {
  Settings,
  Bell,
  Mail,
  Smartphone,
  Shield,
  ArrowLeft,
  Loader2,
  Check,
  CreditCard,
  UserPlus,
  UserMinus,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

type NotificationType = "subscription_new" | "payment_failed" | "subscription_canceled";

const NOTIFICATION_TYPE_CONFIG: Record<
  NotificationType,
  { label: string; description: string; icon: typeof Bell; color: string; bgColor: string }
> = {
  subscription_new: {
    label: "New Subscription",
    description: "When a user subscribes to a paid plan",
    icon: UserPlus,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
  payment_failed: {
    label: "Payment Failed",
    description: "When a subscription payment fails",
    icon: CreditCard,
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
  subscription_canceled: {
    label: "Subscription Canceled",
    description: "When a user cancels their subscription",
    icon: UserMinus,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
};

type Channel = "emailEnabled" | "inAppEnabled" | "pushEnabled";

const CHANNELS: { key: Channel; label: string; icon: typeof Bell; description: string }[] = [
  { key: "emailEnabled", label: "Email", icon: Mail, description: "Send to your email via Resend" },
  { key: "inAppEnabled", label: "In-App", icon: Bell, description: "Show in admin notification center" },
  { key: "pushEnabled", label: "Manus Push", icon: Smartphone, description: "Send via Manus notification service" },
];

function ToggleSwitch({
  enabled,
  onChange,
  loading,
}: {
  enabled: boolean;
  onChange: () => void;
  loading: boolean;
}) {
  return (
    <button
      onClick={onChange}
      disabled={loading}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 ${
        enabled ? "bg-primary" : "bg-gray-300"
      } ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function AdminSettings() {
  usePageMeta({ title: "Admin Settings" });
  const { user, loading: authLoading } = useAuth();

  const { data: preferences, isLoading, refetch } = trpc.admin.getNotificationPreferences.useQuery(
    undefined,
    { enabled: user?.role === "admin" }
  );

  const updatePref = trpc.admin.updateNotificationPreference.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (err) => {
      toast.error("Failed to update preference: " + err.message);
    },
  });

  const [pendingUpdate, setPendingUpdate] = useState<string | null>(null);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="container max-w-4xl py-12">
        <div className="flex flex-col items-center gap-4 text-center">
          <Shield className="w-16 h-16 text-muted-foreground/30" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  const handleToggle = (type: NotificationType, channel: Channel, currentValue: boolean) => {
    const key = `${type}-${channel}`;
    setPendingUpdate(key);
    updatePref.mutate(
      { notificationType: type, [channel]: !currentValue },
      {
        onSettled: () => setPendingUpdate(null),
        onSuccess: () => toast.success("Preference updated"),
      }
    );
  };

  const getPreference = (type: NotificationType) => {
    return preferences?.find((p) => p.notificationType === type);
  };

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" />
            Admin Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage notification preferences and admin configuration
          </p>
        </div>
      </div>

      {/* Notification Preferences Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 pb-2 border-b">
          <Bell className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Notification Preferences</h2>
            <p className="text-sm text-muted-foreground">
              Choose which events trigger notifications and through which channels
            </p>
          </div>
        </div>

        {/* Channel Legend */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Notification Channels</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {CHANNELS.map((ch) => (
              <div key={ch.key} className="flex items-center gap-2">
                <ch.icon className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-sm font-medium">{ch.label}</span>
                  <p className="text-xs text-muted-foreground">{ch.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {(Object.keys(NOTIFICATION_TYPE_CONFIG) as NotificationType[]).map((type) => {
              const config = NOTIFICATION_TYPE_CONFIG[type];
              const pref = getPreference(type);
              const Icon = config.icon;

              return (
                <div
                  key={type}
                  className="border rounded-xl p-5 space-y-4 hover:shadow-sm transition-shadow"
                >
                  {/* Event type header */}
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${config.bgColor}`}>
                      <Icon className={`w-5 h-5 ${config.color}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{config.label}</h3>
                      <p className="text-sm text-muted-foreground">{config.description}</p>
                    </div>
                  </div>

                  {/* Channel toggles */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pl-12">
                    {CHANNELS.map((ch) => {
                      const isEnabled = pref?.[ch.key] ?? (ch.key !== "pushEnabled");
                      const isUpdating = pendingUpdate === `${type}-${ch.key}`;

                      return (
                        <div
                          key={ch.key}
                          className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <ch.icon className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{ch.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {isEnabled && !isUpdating && (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            )}
                            <ToggleSwitch
                              enabled={isEnabled}
                              onChange={() => handleToggle(type, ch.key, isEnabled)}
                              loading={isUpdating}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Email Configuration Info */}
      <div className="border rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-50">
            <Mail className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold">Email Configuration</h3>
            <p className="text-sm text-muted-foreground">
              Email notifications are sent via Resend to <strong>support@createchristianmusic.com</strong>
            </p>
          </div>
        </div>
        <div className="pl-12 text-sm text-muted-foreground space-y-1">
          <p>Emails include styled HTML templates with color-coded badges and a link to your admin dashboard.</p>
          <p>To change the recipient email, contact support or update the email configuration in the codebase.</p>
        </div>
      </div>
    </div>
  );
}
