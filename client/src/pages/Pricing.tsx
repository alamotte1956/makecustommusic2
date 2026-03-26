import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Check, Zap, Crown, ArrowRight, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { usePageMeta } from "@/hooks/usePageMeta";

// Tax-inclusive pricing breakdown (8.53% MN Hennepin County)
const TAX_RATE = 0.0853;
function taxBreakdown(totalDollars: number) {
  const baseCents = Math.round((totalDollars * 100) / (1 + TAX_RATE));
  const taxCents = totalDollars * 100 - baseCents;
  return {
    base: (baseCents / 100).toFixed(2),
    tax: (taxCents / 100).toFixed(2),
    total: totalDollars.toFixed(2),
  };
}

export default function Pricing() {
  usePageMeta({
    title: "Pricing Plans",
    description: "Choose a plan to create worship music with AI. Pro and Premier tiers with song credits, sheet music, stem separation, and more.",
    keywords: "AI music generator pricing, worship music creator plans, christian music tool subscription, gospel music maker pricing, AI song generator free, worship song creator cost, christian music production pricing, church music software plans",
    canonicalPath: "/pricing",
  });
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const { data: plansData, isLoading } = trpc.credits.allPlans.useQuery();
  const { data: summary } = trpc.credits.summary.useQuery(undefined, { enabled: !!user });
  const { data: stripeStatus } = trpc.credits.stripeStatus.useQuery();

  const createCheckout = trpc.credits.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create checkout session");
      setLoadingPlan(null);
    },
  });

  const planIcons: Record<string, React.ReactNode> = {
    creator: <Zap className="h-6 w-6" />,
    professional: <Crown className="h-6 w-6" />,
  };

  const annualSavings: Record<string, number> = {
    creator: 46,       // $19*12 - $182 = $46
    professional: 94,  // $39*12 - $374 = $94
  };

  const planColors: Record<string, string> = {
    creator: "border-violet-500 ring-2 ring-violet-500/20",
    professional: "border-violet-600",
  };

  const handleUpgrade = (planId: string) => {
    if (!user) {
      window.location.href = getLoginUrl();
      return;
    }

    if (!stripeStatus?.configured) {
      toast.error("Payment system is not yet configured. Please try again later.");
      return;
    }

    setLoadingPlan(planId);
    const origin = window.location.origin;
    createCheckout.mutate({
      planId: planId as "creator" | "professional",
      billingCycle,
      successUrl: `${origin}/usage?checkout=success&plan=${planId}`,
      cancelUrl: `${origin}/pricing?checkout=canceled`,
    });
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
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
            Simple, Transparent Pricing
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your creative needs. No free tier — subscribe to start creating.
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
              <span className="ml-1.5 text-xs text-violet-400 font-semibold">Save 20%</span>
            </button>
          </div>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="max-w-7xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto gap-6">
          {plans.map((plan: any) => {
            const isCurrentPlan = summary?.plan === plan.id;
            const price = billingCycle === "monthly" ? plan.monthlyPrice : Math.round(plan.annualPrice / 12);
            const totalAnnual = plan.annualPrice;
            const isUpgrade = summary?.plan && plan.id !== summary.plan;

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
                  <div className={`p-2 rounded-lg ${plan.popular ? "bg-violet-500/20 text-violet-300" : "bg-muted text-muted-foreground"}`}>
                    {planIcons[plan.id]}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground">{plan.tagline}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">
                      ${price}
                    </span>
                    {plan.monthlyPrice > 0 && (
                      <span className="text-muted-foreground text-sm">/mo</span>
                    )}
                    {/* Tax breakdown tooltip */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="ml-1 inline-flex items-center text-muted-foreground hover:text-violet-400 transition-colors focus:outline-none"
                          aria-label="View tax breakdown"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        sideOffset={8}
                        className="bg-popover text-popover-foreground border border-border shadow-lg rounded-lg px-4 py-3 max-w-[220px]"
                      >
                        {(() => {
                          const displayTotal = billingCycle === "monthly" ? plan.monthlyPrice : plan.annualPrice;
                          const bd = taxBreakdown(displayTotal);
                          return (
                            <div className="space-y-1.5 text-xs">
                              <p className="font-semibold text-sm text-foreground mb-1.5">Price Breakdown</p>
                              <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span className="text-foreground font-medium">${bd.base}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">MN Tax (8.53%)</span>
                                <span className="text-foreground font-medium">${bd.tax}</span>
                              </div>
                              <div className="border-t border-border pt-1.5 flex justify-between gap-4">
                                <span className="text-foreground font-semibold">Total</span>
                                <span className="text-foreground font-semibold">${bd.total}{billingCycle === "monthly" ? "/mo" : "/yr"}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  {billingCycle === "annual" && plan.annualPrice > 0 && (
                    <p className="text-xs text-green-400 mt-1">
                      Saves ${annualSavings[plan.id] ?? 0} by billing yearly!
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Price includes MN sales tax (8.53%)
                  </p>
                </div>

                {/* CTA Button */}
                {isCurrentPlan ? (
                  <Button variant="outline" disabled className="w-full mb-6">
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={loadingPlan === plan.id}
                    className={`w-full mb-6 ${
                      plan.popular
                        ? "bg-violet-600 hover:bg-violet-700 text-white"
                        : ""
                    }`}
                  >
                    {loadingPlan === plan.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Redirecting to checkout...
                      </>
                    ) : (
                      <>
                        {isUpgrade ? "Upgrade" : "Get Started Here"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                )}

                {/* Features */}
                <ul className="space-y-3 flex-1">
                  {plan.features.map((feature: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {[
              {
                q: "How does the monthly allowance work?",
                a: "Each song or sheet music PDF generation counts as one use. The Pro plan gives you 200 per month and Premier gives you 450 per month. AI lyrics, chord progressions, and exports are included at no extra cost.",
              },
              {
                q: "Do unused songs roll over?",
                a: "Monthly allowances reset each billing cycle and do not roll over. If you need more, consider upgrading to the Premier plan for 450 songs per month.",
              },
              {
                q: "Can I use the music commercially?",
                a: "Both Pro and Premier plans include commercial use rights for all new songs you create.",
              },
              {
                q: "Do I get free bonus songs?",
                a: "Yes! All paid subscribers get 2 free bonus songs every month on top of their monthly credits. These reset each billing cycle and don't count toward your allocation.",
              },
              {
                q: "Is there a free plan?",
                a: "No. You can explore and browse the site for free, but generating music requires a paid subscription (Pro or Premier).",
              },
              {
                q: "What's the difference between Pro and Premier?",
                a: "Premier includes everything in Pro plus 450 songs per month (vs. 200), full commercial use rights, and early access to new features.",
              },
              {
                q: "Who owns the music I create?",
                a: "You retain all intellectual property rights to music, lyrics, sheet music, and cover art you generate. See our Terms of Service for details.",
              },
              {
                q: "Can I cancel anytime?",
                a: "Yes, you can cancel at any time from the Usage Dashboard. Your access continues until the end of your billing period. No refunds are provided for unused time or credits.",
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept all major credit cards, debit cards, and digital wallets through Stripe.",
              },
              {
                q: "How do I manage or cancel my subscription?",
                a: "Visit the Usage Dashboard where you'll find a 'Cancel Subscription' button and 'Manage Billing' button. Cancellation takes effect at the end of your billing period with no refund for unused time.",
              },
            ].map((faq, i) => (
              <div key={i} className="border-b pb-4">
                <h3 className="font-semibold text-white">{faq.q}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
