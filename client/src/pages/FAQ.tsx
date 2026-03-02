import { Link } from "wouter";
import { HelpCircle, Music, CreditCard, Shield, Headphones, FileText } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqCategories = [
  {
    title: "Getting Started",
    icon: <Music className="h-5 w-5 text-violet-600" />,
    items: [
      {
        q: "What is Make Custom Music?",
        a: "Make Custom Music is an AI-powered music generation platform. Describe the music you imagine — choose a genre, mood, and vocal style — and our AI composes a unique song for you in seconds. You can download it as MP3, view sheet music, and organize songs into albums.",
      },
      {
        q: "How do I create my first song?",
        a: "Click 'Create Music' in the navigation bar. Enter a description of the song you want (e.g., 'upbeat indie rock anthem about chasing dreams'), select a genre, mood, and vocal type, then click 'Generate Song'. Your song will be ready in 30–120 seconds.",
      },
      {
        q: "Do I need an account to use the service?",
        a: "You can browse the Discover page without an account, but generating songs, saving favorites, and creating albums requires you to log in.",
      },
      {
        q: "What genres and moods are available?",
        a: "We support a wide range of genres including Pop, Rock, Hip-Hop, Jazz, Classical, Electronic, Country, R&B, Latin, and more. Moods range from Energetic and Happy to Melancholic, Chill, Dramatic, and Romantic.",
      },
    ],
  },
  {
    title: "Plans & Credits",
    icon: <CreditCard className="h-5 w-5 text-violet-600" />,
    items: [
      {
        q: "What does the Free plan include?",
        a: "The Free plan gives you 2 songs per month, 1 sheet music per month, 128kbps MP3 quality, and personal use only. It's a great way to try the platform before upgrading.",
      },
      {
        q: "What are the paid plans?",
        a: "We offer three paid tiers: Creator ($8/mo) with 125 songs and commercial use for social media, Professional ($19/mo) with 500 songs and full commercial rights, and Studio ($39/mo) with 2,500 songs and full commercial + sync licensing. All paid plans include unlimited sheet music and 192kbps MP3 quality.",
      },
      {
        q: "What counts as a credit?",
        a: "Each song generation costs 1 credit. Sheet music and chord progression generation are included with your plan (limited on Free, unlimited on paid plans).",
      },
      {
        q: "Do unused credits roll over?",
        a: "Monthly credits reset each billing cycle. If you need more songs, upgrade to a higher plan for a larger monthly allowance.",
      },
      {
        q: "Can I cancel my subscription anytime?",
        a: "Yes, you can cancel at any time from the Usage Dashboard. You'll retain access to your current plan until the end of your billing period. Your generated songs remain accessible after cancellation.",
      },
    ],
  },
  {
    title: "Audio & Quality",
    icon: <Headphones className="h-5 w-5 text-violet-600" />,
    items: [
      {
        q: "What audio format are songs exported in?",
        a: "All songs are exported as MP3 files. Free plan songs are at 128kbps quality, while all paid plans provide 192kbps quality.",
      },
      {
        q: "How long can a generated song be?",
        a: "Songs can be generated up to 120 seconds in length. You can choose shorter durations (30s, 60s, 90s) when creating your song.",
      },
      {
        q: "Can I choose between male and female vocals?",
        a: "Yes, you can select Male, Female, or No Vocals (instrumental only) when generating a song.",
      },
      {
        q: "What is the Studio feature?",
        a: "The Studio lets you add vocals to your generated instrumental tracks using text-to-speech synthesis. Write or paste lyrics, choose a voice, and the system will produce a vocal track mixed with your instrumental.",
      },
    ],
  },
  {
    title: "Sheet Music & Chords",
    icon: <FileText className="h-5 w-5 text-violet-600" />,
    items: [
      {
        q: "How does sheet music generation work?",
        a: "After generating a song, you can request sheet music which creates a musical notation representation of your track. This includes melody lines, chord symbols, and basic arrangement information.",
      },
      {
        q: "Can I transpose sheet music?",
        a: "Yes, the sheet music viewer includes a transpose feature that lets you shift the key up or down by any number of semitones.",
      },
      {
        q: "Are chord progressions included?",
        a: "Yes, chord progressions are generated alongside sheet music and displayed with the notation. You can view chords separately or as part of the full score.",
      },
    ],
  },
  {
    title: "Licensing & Commercial Use",
    icon: <Shield className="h-5 w-5 text-violet-600" />,
    items: [
      {
        q: "Can I use generated music commercially?",
        a: "It depends on your plan. Free plan songs are for personal use only. Creator plan includes rights for personal and social media use. Professional and Studio plans include full commercial rights, with Studio adding sync licensing for film, TV, and advertising.",
      },
      {
        q: "Do I own the music I generate?",
        a: "You receive a license to use the generated music according to your plan tier. The specific rights and limitations are detailed in our Terms of Service.",
      },
      {
        q: "Can I upload my own music?",
        a: "Yes, the Upload feature lets you add your own MP3 files to your library. Uploaded songs can be organized into albums alongside AI-generated tracks.",
      },
    ],
  },
  {
    title: "Account & Support",
    icon: <HelpCircle className="h-5 w-5 text-violet-600" />,
    items: [
      {
        q: "How do I manage my subscription?",
        a: "Visit the Usage Dashboard and click 'Manage Billing' to access the billing portal where you can update payment methods, change plans, or cancel.",
      },
      {
        q: "What payment methods do you accept?",
        a: "We accept all major credit cards, debit cards, and digital wallets through Stripe.",
      },
      {
        q: "How do I contact support?",
        a: "You can reach us at support@makecustommusic.com for any questions, issues, or feedback. We aim to respond within 24 hours.",
      },
      {
        q: "Is my data secure?",
        a: "Yes, we take data security seriously. We use industry-standard encryption, secure authentication, and do not sell your personal information to third parties. See our Privacy Policy for full details.",
      },
    ],
  },
];

export default function FAQ() {
  usePageMeta({
    title: "FAQ",
    description: "Frequently asked questions about Make Custom Music. Learn about AI music generation, pricing, downloads, and account management.",
    canonicalPath: "/faq",
  });
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-fuchsia-500/5" />
        <div className="relative container max-w-4xl py-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-sm text-violet-700 mb-6">
            <HelpCircle className="h-4 w-4" />
            Help Center
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-black sm:text-5xl">
            Frequently Asked Questions
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about Make Custom Music. Can't find what you're looking for?{" "}
            <a
              href="mailto:support@makecustommusic.com"
              className="text-violet-600 hover:text-violet-700 underline"
            >
              Contact us
            </a>
            .
          </p>
        </div>
      </div>

      {/* FAQ Categories */}
      <div className="container max-w-4xl pb-20">
        <div className="space-y-8">
          {faqCategories.map((category) => (
            <div key={category.title} className="rounded-xl border bg-card p-6">
              <div className="flex items-center gap-3 mb-4">
                {category.icon}
                <h2 className="text-xl font-semibold text-black">{category.title}</h2>
              </div>
              <Accordion type="single" collapsible className="w-full">
                {category.items.map((item, idx) => (
                  <AccordionItem key={idx} value={`${category.title}-${idx}`}>
                    <AccordionTrigger className="text-left text-black hover:no-underline">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>

        {/* Still need help */}
        <div className="mt-12 rounded-xl border bg-gradient-to-r from-violet-50 to-fuchsia-50 p-8 text-center">
          <h2 className="text-2xl font-bold text-black">Still have questions?</h2>
          <p className="mt-2 text-muted-foreground max-w-lg mx-auto">
            We're here to help. Reach out to our support team and we'll get back to you within 24 hours.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:support@makecustommusic.com"
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 text-sm font-medium transition-colors"
            >
              Email Support
            </a>
            <Link href="/privacy">
              <span className="text-sm text-violet-600 hover:text-violet-700 cursor-pointer">
                Privacy Policy
              </span>
            </Link>
            <Link href="/terms">
              <span className="text-sm text-violet-600 hover:text-violet-700 cursor-pointer">
                Terms of Service
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
