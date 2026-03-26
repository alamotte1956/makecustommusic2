import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";
import {
  Sparkles, Music, Download, Printer, Disc3, History, ArrowRight, Play,
  BookOpen, Church, Mic, Guitar, Piano, Users, Heart, Cross,
  FileText, ListMusic, Calendar, Shield, Star, ChevronRight
} from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered Composition",
    description: "Enter keywords like 'praise & worship anthem' or 'gentle hymn for communion' and let AI compose a unique piece for your ministry.",
  },
  {
    icon: Music,
    title: "Instant Playback",
    description: "Preview your generated music in real-time with a built-in audio player before downloading.",
  },
  {
    icon: Download,
    title: "MP3 Download",
    description: "Download your compositions as high-quality MP3 files, ready for Sunday services, rehearsals, or streaming.",
  },
  {
    icon: Printer,
    title: "Sheet Music & Print",
    description: "View and print professional sheet music notation — chord charts, lead sheets, and full scores for your worship team.",
  },
  {
    icon: Disc3,
    title: "Album Collections",
    description: "Organize your worship songs, hymns, and compositions into albums for easy access during services.",
  },
  {
    icon: History,
    title: "Generation History",
    description: "Access your complete history of generated songs, replay them, and manage your music library.",
  },
];

const churchFeatures = [
  {
    icon: BookOpen,
    title: "Worship Set Builder",
    description: "Plan complete worship services with drag-and-drop song ordering, key management, scripture readings, prayers, and AI-powered flow suggestions.",
    href: "/worship",
  },
  {
    icon: ListMusic,
    title: "16 Christian Genres",
    description: "Gospel, CCM, Hymns, Praise & Worship, Liturgical, Choral, Christian Rock, Christian Hip Hop, Southern Gospel, Anthem, Spiritual, and more.",
    href: "/generate",
  },
  {
    icon: FileText,
    title: "Scripture Song Templates",
    description: "Psalm Settings, Scripture Songs, Call to Worship, Communion Songs, and Altar Call templates — all structured for church use.",
    href: "/generate",
  },
  {
    icon: Calendar,
    title: "Liturgical Calendar",
    description: "Seasonal presets for Advent, Christmas, Epiphany, Lent, Holy Week, Easter, Pentecost, and Ordinary Time.",
    href: "/worship",
  },
  {
    icon: Guitar,
    title: "Church Band Ready",
    description: "Generate music with individual instrument parts. Stem separation for guitar, bass, keys, drums, and vocals.",
    href: "/generate",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Share worship sets with your music team. Everyone stays on the same page for rehearsals and services.",
    href: "/worship",
  },
];



export default function Home() {
  const { isAuthenticated } = useAuth();

  usePageMeta({
    title: "AI Worship Song Generator",
    description: "Create worship songs, hymns, and gospel music with AI. Sheet music, chord charts, and 16 Christian genres.",
    keywords: "christian music generator, AI worship song generator, create worship music, gospel music maker, christian song maker AI, praise and worship song creator, hymn generator, church music creator, worship music online, AI praise music, gospel songs, praise songs",
    canonicalPath: "/",
  });

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-[80vh] flex items-center">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/30 via-background to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/10 via-transparent to-orange-900/10" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-purple-500/5 to-transparent rounded-full blur-3xl" />

        <div className="container relative py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-sm text-white/70 mb-2">
              <Cross className="w-3.5 h-3.5 text-purple-400" />
              Built for Christian Creators & Church Music Directors
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-white leading-[1.05]">
              Make any{" "}
              <span className="suno-gradient-text">Worship Song</span>
              {" "}you can{" "}
              <span className="text-white/80">Imagine</span>
            </h1>
            <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
              The ultimate AI music platform for worship leaders, church bands, and Christian creators.
              Generate worship songs, hymns, and original compositions — complete with sheet music and chord charts.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              {isAuthenticated ? (
                <>
                  <Button asChild size="lg" className="suno-gradient text-white font-semibold text-base px-8 py-6 rounded-full border-0 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 hover:scale-105 transition-all">
                    <Link href="/generate">
                      <Sparkles className="w-5 h-5 mr-2" />
                      Start Creating
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="rounded-full border-white/20 text-white hover:bg-white/5 px-8 py-6 text-base bg-transparent">
                    <Link href="/worship">
                      <BookOpen className="w-5 h-5 mr-2" />
                      Worship Sets
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild size="lg" className="suno-gradient text-white font-semibold text-base px-8 py-6 rounded-full border-0 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 hover:scale-105 transition-all">
                    <a href={getLoginUrl()}>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Get Started Free
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="rounded-full border-white/20 text-white hover:bg-white/5 px-8 py-6 text-base bg-transparent">
                    <Link href="/discover">
                      <Play className="w-5 h-5 mr-2" />
                      Listen to Examples
                    </Link>
                  </Button>
                </>
              )}
            </div>

            {/* Trust indicators */}
            <div className="flex items-center justify-center gap-6 pt-4 text-sm text-white/40">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                You own your music
              </span>
              <span className="flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5" />
                Commercial rights included
              </span>
              <span className="flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5" />
                No musical knowledge needed
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Church Music Director Section */}
      <section className="py-20 md:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/5 to-transparent" />
        <div className="container relative">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs font-medium text-purple-400 mb-4">
              <Church className="w-3 h-3" />
              BUILT FOR CHURCHES
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              A Church Music Director's Dream
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Everything you need to plan worship services, create original music for your congregation,
              and equip your worship team — all in one platform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {churchFeatures.map((feature) => (
              <Link key={feature.title} href={feature.href}>
                <div className="h-full p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] hover:border-purple-500/20 transition-all duration-300 group cursor-pointer">
                  <div className="w-11 h-11 rounded-xl bg-purple-500/15 flex items-center justify-center mb-4 group-hover:bg-purple-500/25 transition-colors">
                    <feature.icon className="w-5 h-5 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                    {feature.title}
                    <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
                  </h3>
                  <p className="text-sm text-white/60 leading-relaxed">{feature.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-white/60 text-lg">Three simple steps to create music for your ministry</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { step: "1", title: "Describe or Choose", desc: "Enter a description, pick a Christian genre, select a worship mood, or start from a Scripture template." },
              { step: "2", title: "Generate", desc: "Our AI composes a unique piece of music based on your input — worship songs, hymns, instrumentals, and more." },
              { step: "3", title: "Use in Ministry", desc: "Download MP3, print sheet music, add to worship sets, or share with your team for rehearsal." },
            ].map((item) => (
              <div key={item.step} className="text-center space-y-4 p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors">
                <div className="w-14 h-14 rounded-2xl suno-gradient text-white text-xl font-bold flex items-center justify-center mx-auto">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                <p className="text-white/60 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases for Christian Creators */}
      <section className="py-20 md:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-900/5 to-transparent" />
        <div className="container relative">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              For Every Christian Creator
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Whether you lead worship on Sunday mornings, run a youth group, or create content for your ministry — we've got you covered.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              {
                title: "Worship Leaders & Music Directors",
                items: [
                  "Plan complete worship services with the Worship Set Builder",
                  "Generate original worship songs in any Christian genre",
                  "Print chord charts and lead sheets for your band",
                  "AI suggests song flow based on sermon theme and liturgical season",
                ],
                icon: Church,
                gradient: "from-purple-500/10 to-purple-900/5",
              },
              {
                title: "Church Bands & Choirs",
                items: [
                  "Generate music with individual instrument parts",
                  "Stem separation for guitar, bass, keys, drums, and vocals",
                  "Sheet music notation for every instrument",
                  "Practice tracks for individual band members",
                ],
                icon: Guitar,
                gradient: "from-orange-500/10 to-orange-900/5",
              },
              {
                title: "Youth Pastors & Ministry Leaders",
                items: [
                  "Create engaging music for youth worship nights",
                  "Generate background music for devotionals and prayer time",
                  "Build playlists for camps, retreats, and events",
                  "Modern genres like Christian Hip Hop and Christian Pop",
                ],
                icon: Heart,
                gradient: "from-pink-500/10 to-pink-900/5",
              },
              {
                title: "Christian Content Creators",
                items: [
                  "Original worship music for podcasts and videos",
                  "Background instrumentals for sermon recordings",
                  "Royalty-free music you own — commercial rights included",
                  "MP3 downloads ready for any platform",
                ],
                icon: Mic,
                gradient: "from-cyan-500/10 to-cyan-900/5",
              },
            ].map((useCase) => (
              <div
                key={useCase.title}
                className={`p-6 rounded-2xl bg-gradient-to-br ${useCase.gradient} border border-white/[0.06] hover:border-white/[0.1] transition-all`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center">
                    <useCase.icon className="w-5 h-5 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{useCase.title}</h3>
                </div>
                <ul className="space-y-2.5">
                  {useCase.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-white/60">
                      <span className="text-purple-400 mt-0.5 shrink-0">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Platform Features</h2>
            <p className="text-white/60 text-lg">Everything you need to create and manage your music</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-300 group"
              >
                <div className="w-11 h-11 rounded-xl bg-purple-500/15 flex items-center justify-center mb-4 group-hover:bg-purple-500/25 transition-colors">
                  <feature.icon className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-white/60 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* What Makes Us Different */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              What No Other AI Music Platform Offers
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              We're the only AI music generator built specifically for Christian creators and churches.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                title: "Sheet Music Included",
                desc: "Other AI music tools only give you audio. We give you printable sheet music, chord charts, and lead sheets — ready for your worship team.",
                highlight: "Only platform with AI + sheet music",
              },
              {
                title: "Worship Set Planning",
                desc: "No other AI music generator includes a worship service planner. Build complete service flows with songs, prayers, scripture, and transitions.",
                highlight: "Integrated service planning",
              },
              {
                title: "You Own Everything",
                desc: "Full IP ownership on all plans — free and paid. Commercial use rights included. No hidden licensing restrictions.",
                highlight: "Full ownership, all plans",
              },
            ].map((item) => (
              <div key={item.title} className="text-center space-y-3">
                <div className="inline-block px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs font-medium text-purple-400 mb-2">
                  {item.highlight}
                </div>
                <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                <p className="text-sm text-white/60 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/10 via-pink-900/5 to-orange-900/10" />
        <div className="container relative text-center space-y-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Ready to Transform Your Worship Music?
          </h2>
          <p className="text-lg text-white/60 max-w-xl mx-auto">
            Join worship leaders and church music directors who are creating original music for their congregations with AI.
          </p>
          {isAuthenticated ? (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="suno-gradient text-white font-semibold text-base px-8 py-6 rounded-full border-0 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 hover:scale-105 transition-all">
                <Link href="/generate">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Create Music Now
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full border-white/20 text-white hover:bg-white/5 px-8 py-6 text-base bg-transparent">
                <Link href="/worship">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Plan a Worship Set
                </Link>
              </Button>
            </div>
          ) : (
            <Button asChild size="lg" className="suno-gradient text-white font-semibold text-base px-8 py-6 rounded-full border-0 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 hover:scale-105 transition-all">
              <a href={getLoginUrl()}>
                Sign Up Free — No Credit Card Required
              </a>
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
