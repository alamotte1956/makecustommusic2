import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { Check, Sparkles, Zap, Crown, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Pricing() {
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  const { data: plansData, isLoading } = trpc.credits.allPlans.useQuery();
  const { data: summary } = trpc.credits.summary.useQuery(undefined, { enabled: !!user });

  const planIcons: Record<string, React.ReactNode> = {
    free: <Sparkles className="h-6 w-6" />,
    creator: <Zap className="h-6 w-6" />,
    professional: <Crown className="h-6 w-6" />,
    studio: <Building2 className="h-6 w-6" />,
  };

  const planColors: Record<string, string> = {
    free: "border-gray-200",
    creator: "border-violet-500 ring-2 ring-violet-500/20",
    professional: "border-violet-600",
    studio: "border-gray-800",
  };

  const handleUpgrade = (planId: string) => {
    if (planId === "free") return;
    toast.info(`Upgrade to ${planId.charAt(0).toUpperCase() + planId.slice(1)} plan will be available once Stripe is connected.`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading plans...</div>
      </div>
    );
  }

  const plans = plansData?.plans ?? [];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-fuchsia-500/5" />
        <div className="relative max-w-7xl mx-auto px-4 pt-20 pb-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-black">
            Simple, Transparent Pricing
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Start free. Upgrade when you need more songs, better quality, and commercial rights.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center gap-3 bg-muted rounded-full p-1">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                billingCycle === "monthly"
                  ? "bg-white text-black shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                billingCycle === "annual"
                  ? "bg-white text-black shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Annual
              <span className="ml-1.5 text-xs text-violet-600 font-semibold">Save 20%</span>
            </button>
          </div>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="max-w-7xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan: any) => {
            const isCurrentPlan = summary?.plan === plan.id;
            const price = billingCycle === "monthly" ? plan.monthlyPrice : Math.round(plan.annualPrice / 12);
            const totalAnnual = plan.annualPrice;

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border bg-card p-6 flex flex-col ${planColors[plan.id]} ${
                  plan.popular ? "shadow-lg shadow-violet-500/10" : "shadow-sm"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-violet-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Plan header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg ${plan.popular ? "bg-violet-100 text-violet-600" : "bg-muted text-muted-foreground"}`}>
                    {planIcons[plan.id]}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-black">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground">{plan.tagline}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-black">
                      ${price}
                    </span>
                    {plan.monthlyPrice > 0 && (
                      <span className="text-muted-foreground text-sm">/mo</span>
                    )}
                  </div>
                  {billingCycle === "annual" && plan.annualPrice > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ${totalAnnual}/year billed annually
                    </p>
                  )}
                  {plan.monthlyPrice === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">Free forever</p>
                  )}
                </div>

                {/* CTA Button */}
                {isCurrentPlan ? (
                  <Button variant="outline" disabled className="w-full mb-6">
                    Current Plan
                  </Button>
                ) : plan.monthlyPrice === 0 ? (
                  <Link href="/generator">
                    <Button variant="outline" className="w-full mb-6">
                      Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <Button
                    onClick={() => handleUpgrade(plan.id)}
                    className={`w-full mb-6 ${
                      plan.popular
                        ? "bg-violet-600 hover:bg-violet-700 text-white"
                        : ""
                    }`}
                  >
                    Upgrade to {plan.name} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}

                {/* Features */}
                <ul className="space-y-3 flex-1">
                  {plan.features.map((feature: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-violet-600 mt-0.5 shrink-0" />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Add-on Credits Section */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-black">Need More Credits?</h2>
          <p className="mt-2 text-muted-foreground max-w-xl mx-auto">
            Purchase additional song credits anytime. Credits never expire and stack on top of your monthly allowance.
          </p>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { songs: 10, price: "$2", perSong: "$0.20", label: "Starter Pack" },
              { songs: 50, price: "$8", perSong: "$0.16", label: "Creator Pack", popular: true },
              { songs: 200, price: "$25", perSong: "$0.125", label: "Studio Pack" },
            ].map((pack) => (
              <div
                key={pack.songs}
                className={`rounded-xl border p-5 ${
                  pack.popular ? "border-violet-500 bg-violet-50/50 shadow-sm" : "bg-card"
                }`}
              >
                <p className="font-semibold text-black">{pack.label}</p>
                <p className="text-3xl font-bold text-black mt-2">{pack.price}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {pack.songs} songs &middot; {pack.perSong}/song
                </p>
                <Button
                  variant={pack.popular ? "default" : "outline"}
                  size="sm"
                  className={`w-full mt-4 ${pack.popular ? "bg-violet-600 hover:bg-violet-700 text-white" : ""}`}
                  onClick={() => toast.info("Credit purchases will be available once Stripe is connected.")
                  }
                >
                  Buy Now
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-black text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {[
              {
                q: "What counts as a credit?",
                a: "Each song generation costs 1 credit. TTS voice previews cost 0.5 credits. Sheet music and chord progression generation are free on paid plans.",
              },
              {
                q: "Do unused credits roll over?",
                a: "Monthly credits reset each billing cycle. Purchased credits never expire and carry over indefinitely.",
              },
              {
                q: "Can I use the music commercially?",
                a: "Free plan songs are for personal use only. Creator plan includes social media rights. Professional and Studio plans include full commercial and sync licensing rights.",
              },
              {
                q: "What audio formats are supported?",
                a: "Free and Creator plans export MP3 at 192kbps. Professional adds WAV export. Studio includes MP3, WAV, and FLAC formats.",
              },
              {
                q: "Can I cancel anytime?",
                a: "Yes, you can cancel your subscription at any time. You'll retain access to your current plan until the end of your billing period.",
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept all major credit cards, debit cards, and digital wallets through Stripe. Enterprise invoicing is available for Studio plans.",
              },
            ].map((faq, i) => (
              <div key={i} className="border-b pb-4">
                <h3 className="font-semibold text-black">{faq.q}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
