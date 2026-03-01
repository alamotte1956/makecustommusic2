import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { Check, Sparkles, Zap, Crown, Building2, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Pricing() {
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
      planId: planId as "creator" | "professional" | "studio",
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
              <span className="ml-1.5 text-xs text-violet-600 font-semibold">Save up to 26%</span>
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
            const isUpgrade = summary?.plan && plan.id !== "free" && plan.id !== summary.plan;
            const isDowngrade = summary?.plan && plan.id === "free" && summary.plan !== "free";

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
                        {isUpgrade ? "Upgrade" : "Subscribe"} to {plan.name}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
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

        {/* FAQ */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-black text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {[
              {
                q: "What counts as a credit?",
                a: "Each song generation costs 1 credit. Sheet music and chord progression generation are free on paid plans.",
              },
              {
                q: "Do unused credits roll over?",
                a: "Monthly credits reset each billing cycle. Upgrade to a higher plan for more credits.",
              },
              {
                q: "Can I use the music commercially?",
                a: "Free plan songs are for personal use only. Creator plan includes social media rights. Professional and Studio plans include full commercial and sync licensing rights.",
              },
              {
                q: "What audio formats are supported?",
                a: "Free plan exports MP3 at 128kbps. All paid plans export MP3 at 192kbps.",
              },
              {
                q: "Can I cancel anytime?",
                a: "Yes, you can cancel your subscription at any time. You'll retain access to your current plan until the end of your billing period. Manage your subscription from the Usage Dashboard.",
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept all major credit cards, debit cards, and digital wallets through Stripe. Enterprise invoicing is available for Studio plans.",
              },
              {
                q: "How do I manage my subscription?",
                a: "Visit your Usage Dashboard and click 'Manage Billing' to access the Stripe Customer Portal where you can update payment methods, change plans, or cancel.",
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
