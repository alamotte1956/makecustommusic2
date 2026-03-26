import { Link } from "wouter";
import { HelpCircle, Music, CreditCard, Shield, Headphones, FileText, Sparkles } from "lucide-react";
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
    icon: <Music className="h-5 w-5" />,
    items: [
      {
        q: "What is Create Christian Music?",
        a: "Create Christian Music is an AI-powered music generation platform. Describe the music you imagine — choose a genre, mood, and vocal style — and our AI composes a unique, full-production song for you in seconds. You can download it as MP3, view sheet music, organize songs into albums, and share them publicly.",
      },
      {
        q: "How do I create my first song?",
        a: "Click 'Create Music' in the navigation bar. You have two modes: Simple Mode — enter a description (e.g., 'upbeat indie rock anthem about chasing dreams'), select a genre, mood, vocal type, and duration, then click 'Generate Song'. Custom Mode — write or generate your own lyrics, add style tags, and set a custom title for full creative control. Your song will be ready in 30–120 seconds.",
      },
      {
        q: "Do I need an account to use the service?",
        a: "You can browse the Discover page to listen to community songs without an account. However, generating songs, saving favorites, creating albums, and downloading music requires you to sign in.",
      },
      {
        q: "What genres and moods are available?",
        a: "We support a wide range of genres including Pop, Rock, Hip-Hop, Jazz, Classical, Electronic, Country, R&B, and an extensive Christian music family: Christian (CCM), Gospel, Christian Modern, Christian Pop, Christian Rock, Christian Hip Hop, Southern Gospel, Hymns, Praise & Worship, and Christian R&B. Moods range from Energetic and Happy to Melancholic, Calm, Dramatic, Romantic, Uplifting, Devotional, and Triumphant.",
      },
      {
        q: "What is Custom Mode?",
        a: "Custom Mode gives you full creative control over your song. You can write your own lyrics (or use our AI Lyrics Generator to create them from a topic), add style tags to guide the genre and feel (e.g., 'synthwave, male vocals, slow tempo'), and set a custom title. It's perfect for artists who want a specific vision brought to life.",
      },
      {
        q: "What is the AI Lyrics Generator?",
        a: "In Custom Mode, you can enter a subject or topic and click 'Generate Lyrics' to have our AI write complete song lyrics for you. The lyrics are automatically placed in the lyrics field, and you can edit them before generating the song.",
      },
    ],
  },
  {
    title: "Plans & Pricing",
    icon: <CreditCard className="h-5 w-5" />,
    items: [
      {
        q: "What plans do you offer?",
        a: "We offer two subscription plans: Pro ($24/month or $230/year) with 20 songs or sheet music PDFs per month, AI-powered music generation, sheet music to MP3 conversion, lyrics writing and export, collaborative sharing, stem separation ($5 per song), and commercial use rights for personal projects. Premier ($49/month or $470/year) with 50 songs or sheet music PDFs per month, full commercial use rights, early access to new features, and all Pro features. Both plans include 2 free bonus songs per month. There is no free generation plan.",
      },
      {
        q: "What are credits and how do they work?",
        a: "Each song or sheet music PDF generation counts toward your monthly allowance — 20 per month for Pro and 50 per month for Premier. AI lyrics generation, chord progressions, and lyrics export are included at no additional cost. Plus, all paid subscribers get 2 free bonus songs per month that don't count toward your monthly allowance.",
      },
      {
        q: "Do I get free bonus songs?",
        a: "Yes! All paid subscribers (Pro and Premier) get 2 free bonus songs every month on top of their monthly credit allocation. These reset each billing cycle and don't count toward your monthly credits — it's our way of saying thank you for subscribing.",
      },
      {
        q: "Do unused credits roll over?",
        a: "Monthly allowances reset each billing cycle and do not roll over. If you consistently need more songs, consider upgrading to the Premier plan for 50 songs per month.",
      },
      {
        q: "Can I save money with annual billing?",
        a: "Yes, annual billing saves you approximately 20% compared to monthly billing. Pro is $230/year (saves $58, ~$19/month effective) and Premier is $470/year (saves $118, ~$39/month effective). All prices include MN sales tax.",
      },
      {
        q: "Can I cancel my subscription anytime?",
        a: "Yes, you can cancel at any time from the Usage Dashboard. Your access continues until the end of your current billing period. No refunds are provided for unused time or credits. All your generated songs remain accessible after cancellation.",
      },
      {
        q: "Is there a free plan?",
        a: "We don't offer a free generation plan. You can explore the site, browse public songs, and view features without an account, but generating music, sheet music, or any content requires a paid subscription (Pro or Premier). This ensures the highest quality experience for all creators.",
      },
    ],
  },
  {
    title: "Audio & Quality",
    icon: <Headphones className="h-5 w-5" />,
    items: [
      {
        q: "What audio format are songs exported in?",
        a: "All songs are exported as high-quality MP3 files at 192kbps. Files are compatible with all major players including Safari, iTunes, and standard MP3 players on Mac, Windows, Android, and iOS.",
      },
      {
        q: "How long can a generated song be?",
        a: "Songs can be generated from 15 seconds up to 4 minutes in length. Use the duration slider when creating your song to choose your preferred length.",
      },
      {
        q: "Can I choose between male and female vocals?",
        a: "Yes, you can select Male Singer, Female Singer, Both Singers, or Instrumental (no vocals) when generating a song. The vocal type selection is available in both Simple and Custom modes.",
      },
      {
        q: "Can I play songs offline on my phone?",
        a: "Yes! Create Christian Music is a Progressive Web App (PWA). Install it on your phone by tapping 'Add to Home Screen' in your browser. Once installed, recently played songs are cached for offline playback — up to 50 songs are stored locally.",
      },
      {
        q: "What is the queue player?",
        a: "The queue player lets you play songs sequentially. Use 'Play All' on your History, Favorites, or Album pages to load all songs into a playlist. You can skip forward/back, shuffle, and the player persists at the bottom of the screen as you browse.",
      },
    ],
  },
  {
    title: "Sheet Music & Chords",
    icon: <FileText className="h-5 w-5" />,
    items: [
      {
        q: "How does sheet music generation work?",
        a: "After generating a song, you can request sheet music which creates a musical notation representation of your track. This includes melody lines, chord symbols, and basic arrangement information. You can download sheet music as PDF, MIDI, or MusicXML for use in notation software like MuseScore, Finale, and Sibelius.",
      },
      {
        q: "Can I transpose sheet music?",
        a: "Yes, the sheet music viewer includes a transpose feature that lets you shift the key up or down by any number of semitones — useful for adapting songs to your vocal range or instrument.",
      },
      {
        q: "Are chord progressions included?",
        a: "Yes, chord progressions are generated alongside sheet music and displayed with the notation. You can view chords separately or as part of the full score.",
      },
      {
        q: "What is MusicXML export?",
        a: "MusicXML is a universal format for sharing sheet music between notation software. When you download a MusicXML file from our sheet music viewer, you can open it directly in MuseScore, Finale, Sibelius, or any other notation editor to further edit, arrange, and print your music with professional-grade tools.",
      },
    ],
  },
  {
    title: "Features & Organization",
    icon: <Sparkles className="h-5 w-5" />,
    items: [
      {
        q: "How do albums work?",
        a: "You can create albums to organize your songs into collections. Add songs to albums, reorder tracks with drag-and-drop, generate AI album cover art, and download the entire album as a ZIP file. Albums can also be shared publicly on the Discover page.",
      },
      {
        q: "Can I edit my songs after generating them?",
        a: "Yes, you can edit the title, lyrics, genre, mood, and style tags of any song at any time. Click the edit button on any song card in your History, Favorites, or Album pages. You can also rename songs by clicking directly on the title.",
      },
      {
        q: "How does sharing work?",
        a: "Each song has a unique share link. Click the share button on any song to copy a public link that anyone can use to listen — no account required. Share links provide playback, download, and sheet music viewing.",
      },
      {
        q: "What is the Discover page?",
        a: "The Discover page showcases songs and albums that users have published to the community. Browse, listen, and get inspired by what others are creating. You can publish your own songs and albums to Discover from their detail pages.",
      },
      {
        q: "Can I upload my own music?",
        a: "Yes, the Upload feature lets you add your own MP3 files to your library. Uploaded songs can be organized into albums alongside AI-generated tracks.",
      },
      {
        q: "How do favorites work?",
        a: "Click the heart icon on any song to add it to your Favorites. Your Favorites page gives you quick access to your best songs with search, filtering, and Play All functionality.",
      },
    ],
  },
  {
    title: "Licensing & Commercial Use",
    icon: <Shield className="h-5 w-5" />,
    items: [
      {
        q: "Can I use generated music commercially?",
        a: "It depends on your plan. The Creator plan includes rights for personal use and social media content. The Professional plan includes full commercial rights, including sync licensing for film, TV, and advertising.",
      },
      {
        q: "Do I own the music I generate?",
        a: "You receive a license to use the generated music according to your plan tier. The specific rights and limitations are detailed in our Terms of Service. Copyright notice: © Albert LaMotte.",
      },
    ],
  },
  {
    title: "Account & Support",
    icon: <HelpCircle className="h-5 w-5" />,
    items: [
      {
        q: "How do I manage or cancel my subscription?",
        a: "Visit the Usage Dashboard where you'll find a 'Cancel Subscription' button and a 'Manage Billing' button. Clicking either takes you to the Stripe billing portal where you can cancel, update payment methods, change plans, or view invoices. Cancellation is immediate but your access continues until the end of your billing period. No refunds are provided for unused time.",
      },
      {
        q: "What payment methods do you accept?",
        a: "We accept all major credit cards, debit cards, and digital wallets through Stripe. Payments are processed securely — we never store your card details.",
      },
      {
        q: "Can I install Create Christian Music as an app?",
        a: "Yes! Create Christian Music is a Progressive Web App. On Android, tap the install banner or use your browser menu to 'Add to Home Screen'. On iOS, open the site in Safari, tap the share button, and select 'Add to Home Screen'. You'll get an app icon and a native app-like experience.",
      },
      {
        q: "How do I contact support?",
        a: "You can reach us at support@createchristianmusic.com for any questions, issues, or feedback. We aim to respond within 24 hours.",
      },
      {
        q: "Is my data secure?",
        a: "Yes, we take data security seriously. We use industry-standard encryption, secure authentication via OAuth, and do not sell your personal information to third parties. See our Privacy Policy for full details.",
      },
      {
        q: "Can I refer friends?",
     a: "Yes! Every account has a unique referral code. Share it with friends \u2014 when they sign up using your code, you both get 5 bonus song credits each. There's no limit on how many friends you can refer. Check your referral dashboard at /referrals for your unique link and code."      },
    ],
  },
];

export default function FAQ() {
  usePageMeta({
    title: "FAQ — Christian Music Generator",
    description: "Answers about AI worship music generation, pricing, downloads, sheet music, and church licensing for Create Christian Music.",
    keywords: "how to make worship music with AI, can AI write christian songs, AI music generator FAQ, is AI music legal for church, christian music generator help, worship song AI questions, how does AI music work, AI gospel music explained",
    canonicalPath: "/faq",
  });
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-orange-500/5" />
        <div className="relative container max-w-4xl py-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/90 mb-6">
            <HelpCircle className="h-4 w-4" />
            Help Center
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Frequently Asked Questions
          </h1>
          <p className="mt-4 text-lg text-white/80 max-w-2xl mx-auto">
            Everything you need to know about Create Christian Music. Can't find what you're looking for?{" "}
            <a
              href="mailto:support@createchristianmusic.com"
              className="text-purple-400 hover:text-purple-300 underline"
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
            <div key={category.title} className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-purple-400">{category.icon}</div>
                <h2 className="text-xl font-semibold text-white">{category.title}</h2>
              </div>
              <Accordion type="single" collapsible className="w-full">
                {category.items.map((item, idx) => (
                  <AccordionItem key={idx} value={`${category.title}-${idx}`} className="border-white/10">
                    <AccordionTrigger className="text-left text-white/90 hover:text-white hover:no-underline">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-white/80 leading-relaxed">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>

        {/* Still need help */}
        <div className="mt-12 rounded-xl border border-white/10 bg-gradient-to-r from-purple-500/10 to-orange-500/10 p-8 text-center">
          <h2 className="text-2xl font-bold text-white">Still have questions?</h2>
          <p className="mt-2 text-white/80 max-w-lg mx-auto">
            We're here to help. Reach out to our support team and we'll get back to you within 24 hours.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:support@createchristianmusic.com"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-500 hover:to-orange-400 text-white px-6 py-2.5 text-sm font-medium transition-all"
            >
              Email Support
            </a>
            <Link href="/privacy">
              <span className="text-sm text-purple-400 hover:text-purple-300 cursor-pointer">
                Privacy Policy
              </span>
            </Link>
            <Link href="/terms">
              <span className="text-sm text-purple-400 hover:text-purple-300 cursor-pointer">
                Terms of Service
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
