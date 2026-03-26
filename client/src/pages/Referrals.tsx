import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import {
  Gift, Users, CreditCard, Copy, Check, Share2,
  ArrowRight, Sparkles, ExternalLink, Trophy, Medal, Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/clipboard";
import { usePageMeta } from "@/hooks/usePageMeta";

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
  return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{rank}</span>;
}

function LeaderboardSection({ userId }: { userId: number }) {
  const { data, isLoading } = trpc.referrals.leaderboard.useQuery(undefined);

  return (
    <div className="rounded-xl border bg-card p-6 mb-8">
      <div className="flex items-center gap-2 mb-5">
        <Trophy className="h-5 w-5 text-yellow-500" />
        <h2 className="font-semibold text-foreground">Top Referrers</h2>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground animate-pulse">Loading leaderboard...</div>
      ) : !data?.leaderboard || data.leaderboard.length === 0 ? (
        <div className="text-center py-10">
          <Trophy className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No referrals yet</p>
          <p className="text-sm text-muted-foreground mt-1">Be the first to invite a friend and claim the top spot!</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium text-muted-foreground w-12">Rank</th>
                  <th className="pb-3 font-medium text-muted-foreground">Referrer</th>
                  <th className="pb-3 font-medium text-muted-foreground text-center">Referrals</th>
                  <th className="pb-3 font-medium text-muted-foreground text-right">Credits Earned</th>
                </tr>
              </thead>
              <tbody>
                {data.leaderboard.map((entry) => (
                  <tr
                    key={entry.userId}
                    className={`border-b last:border-0 transition-colors ${
                      entry.isCurrentUser
                        ? "bg-violet-50 dark:bg-violet-950/30"
                        : "hover:bg-muted/30"
                    }`}
                  >
                    <td className="py-3">
                      <div className="flex items-center justify-center">
                        <RankIcon rank={entry.rank} />
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          entry.rank === 1
                            ? "bg-yellow-100 text-yellow-700"
                            : entry.rank === 2
                            ? "bg-gray-100 text-gray-600"
                            : entry.rank === 3
                            ? "bg-amber-100 text-amber-700"
                            : "bg-violet-100 text-violet-700"
                        }`}>
                          {entry.displayName[0]?.toUpperCase()}
                        </div>
                        <span className={`font-medium ${
                          entry.isCurrentUser ? "text-violet-600" : "text-foreground"
                        }`}>
                          {entry.displayName}
                          {entry.isCurrentUser && (
                            <span className="ml-1.5 text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">You</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-center">
                      <span className={`font-semibold ${
                        entry.rank <= 3 ? "text-foreground" : "text-muted-foreground"
                      }`}>
                        {entry.totalReferrals}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                        +{entry.totalCreditsEarned} <Sparkles className="h-3 w-3" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Current user rank if not in top list */}
          {data.currentUserRank && (
            <div className="mt-4 pt-4 border-t border-dashed">
              <div className="flex items-center gap-3 bg-violet-50 dark:bg-violet-950/30 rounded-lg px-4 py-3">
                <span className="text-sm font-bold text-muted-foreground">#{data.currentUserRank.rank}</span>
                <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-700">
                  {data.currentUserRank.displayName[0]?.toUpperCase()}
                </div>
                <span className="font-medium text-violet-600">
                  {data.currentUserRank.displayName}
                  <span className="ml-1.5 text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">You</span>
                </span>
                <span className="ml-auto text-sm text-muted-foreground">
                  {data.currentUserRank.totalReferrals} referrals
                </span>
                <span className="inline-flex items-center gap-1 text-green-600 font-medium text-sm">
                  +{data.currentUserRank.totalCreditsEarned} <Sparkles className="h-3 w-3" />
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function Referrals() {
  usePageMeta({
    title: "Invite Friends — Earn Credits",
    description: "Invite fellow worship leaders and church musicians to Create Christian Music. Earn free song credits for every referral.",
    keywords: "christian music referral, invite worship leaders, church musician referral, earn music credits, share christian creator, worship music referral program, church music invite friends",
    canonicalPath: "/referrals",
  });
  const { user, loading } = useAuth();
  const [copied, setCopied] = useState(false);

  const { data: info, isLoading: infoLoading } = trpc.referrals.getInfo.useQuery(undefined, { enabled: !!user });
  const { data: history, isLoading: historyLoading } = trpc.referrals.getHistory.useQuery(undefined, { enabled: !!user });

  if (loading || infoLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading referral dashboard...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Gift className="h-12 w-12 text-violet-600" />
        <h2 className="text-xl font-semibold text-foreground">Sign in to access your referral dashboard</h2>
        <p className="text-muted-foreground">Invite friends and earn bonus song credits!</p>
        <a href={getLoginUrl()}>
          <Button className="bg-violet-600 hover:bg-violet-700 text-white">Sign In</Button>
        </a>
      </div>
    );
  }

  const referralLink = `${window.location.origin}?ref=${info?.referralCode ?? ""}`;

  const handleCopy = async () => {
    try {
      await copyToClipboard(referralLink);
      setCopied(true);
      toast.success("Referral link copied to clipboard!");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("Failed to copy link. Please select and copy the link manually.");
    }
  };

  const handleShare = async () => {
    // Safari supports navigator.share but may throw on certain content types
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "Create Christian Music",
          text: "Create AI-generated Christian music in seconds! Sign up with my link and we both get 5 free bonus songs:",
          url: referralLink,
        });
        return;
      } catch (err: any) {
        // AbortError = user cancelled, which is fine
        if (err?.name === "AbortError") return;
        // Other errors: fall through to copy
      }
    }
    handleCopy();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-100 mb-4">
            <Gift className="h-8 w-8 text-violet-600" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Invite Friends, Both Earn Credits</h1>
          <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
            Share your unique referral link with friends. When they sign up, <span className="font-semibold text-violet-600">you both earn {info?.creditsPerReferral ?? 5} bonus song credits</span>!
          </p>
        </div>

        {/* Referral Link Card */}
        <div className="rounded-2xl border bg-gradient-to-br from-violet-50 to-fuchsia-50 p-6 mb-8">
          <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Share2 className="h-5 w-5 text-violet-600" />
            Your Referral Link
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white rounded-lg border px-4 py-3 text-sm text-muted-foreground font-mono truncate">
              {referralLink}
            </div>
            <Button
              onClick={handleCopy}
              variant="outline"
              className="shrink-0"
            >
              {copied ? (
                <><Check className="h-4 w-4 mr-1 text-green-600" /> Copied</>
              ) : (
                <><Copy className="h-4 w-4 mr-1" /> Copy</>
              )}
            </Button>
            <Button
              onClick={handleShare}
              className="shrink-0 bg-violet-600 hover:bg-violet-700 text-white"
            >
              <Share2 className="h-4 w-4 mr-1" /> Share
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Your referral code: <span className="font-mono font-semibold text-violet-600">{info?.referralCode}</span>
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Friends Referred</span>
              <Users className="h-4 w-4 text-violet-600" />
            </div>
            <p className="text-3xl font-bold text-foreground">{info?.totalReferrals ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Total signups from your link</p>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Credits Earned</span>
              <CreditCard className="h-4 w-4 text-violet-600" />
            </div>
            <p className="text-3xl font-bold text-foreground">{info?.totalCreditsEarned ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Bonus credits from referrals</p>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Per Referral</span>
              <Sparkles className="h-4 w-4 text-violet-600" />
            </div>
            <p className="text-3xl font-bold text-foreground">{info?.creditsPerReferral ?? 5}</p>
            <p className="text-xs text-muted-foreground mt-1">Credits each — you and your friend</p>
          </div>
        </div>

        {/* Leaderboard */}
        <LeaderboardSection userId={user.id} />

        {/* How It Works */}
        <div className="rounded-xl border bg-card p-6 mb-8">
          <h2 className="font-semibold text-foreground mb-4">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 text-violet-700 font-bold text-sm shrink-0">1</div>
              <div>
                <p className="font-medium text-foreground">Share your link</p>
                <p className="text-sm text-muted-foreground mt-0.5">Copy your unique referral link and send it to friends via email, social media, or messaging.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 text-violet-700 font-bold text-sm shrink-0">2</div>
              <div>
                <p className="font-medium text-foreground">Friend signs up</p>
                <p className="text-sm text-muted-foreground mt-0.5">When your friend clicks the link and creates an account, they're automatically linked to your referral and receive {info?.creditsPerReferral ?? 5} bonus songs.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 text-violet-700 font-bold text-sm shrink-0">3</div>
              <div>
                <p className="font-medium text-foreground">You both earn credits</p>
                <p className="text-sm text-muted-foreground mt-0.5">You both instantly receive {info?.creditsPerReferral ?? 5} bonus song credits added to your accounts. No limit on referrals!</p>
              </div>
            </div>
          </div>
        </div>

        {/* Referral History */}
        <div className="rounded-xl border bg-card p-6">
          <h2 className="font-semibold text-foreground mb-4">Referral History</h2>
          {historyLoading ? (
            <div className="text-center py-8 text-muted-foreground animate-pulse">Loading history...</div>
          ) : !history || history.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">No referrals yet</p>
              <p className="text-sm text-muted-foreground mt-1">Share your link above to start earning bonus credits!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-muted-foreground">Friend</th>
                    <th className="pb-3 font-medium text-muted-foreground">Credits Earned</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((ref) => (
                    <tr key={ref.id} className="border-b last:border-0">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-xs font-medium text-violet-700">
                            {(ref.referredName ?? "?")[0]?.toUpperCase()}
                          </div>
                          <span className="text-foreground">{ref.referredName ?? "Anonymous"}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                          +{ref.creditsAwarded} <Sparkles className="h-3 w-3" />
                        </span>
                      </td>
                      <td className="py-3 text-right text-muted-foreground">
                        {new Date(ref.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <Link href="/generate">
            <Button variant="outline" size="lg">
              <ArrowRight className="h-4 w-4 mr-2" />
              Start Creating Songs
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
