import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";
import { Sparkles, Music, Download, Printer, Disc3, History, ArrowRight, Play } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered Composition",
    description: "Enter keywords like 'happy jazz piano' or 'epic orchestral adventure' and let AI compose a unique piece of music for you.",
  },
  {
    icon: Music,
    title: "Instant Playback",
    description: "Preview your generated music in real-time with a built-in audio player before downloading.",
  },
  {
    icon: Download,
    title: "MP3 Download",
    description: "Download your compositions as high-quality MP3 files, ready to use in any project.",
  },
  {
    icon: Printer,
    title: "Sheet Music & Print",
    description: "View and print professional sheet music notation for every song you create.",
  },
  {
    icon: Disc3,
    title: "Album Collections",
    description: "Organize your favorite compositions into albums and build your personal music library.",
  },
  {
    icon: History,
    title: "Generation History",
    description: "Access your complete history of generated songs, replay them, and manage your collection.",
  },
];

export default function Home() {
  const { isAuthenticated } = useAuth();

  usePageMeta({
    title: "AI Music Generator & Composer",
    description: "Transform your ideas into songs with AI. Describe your music, choose a genre and mood, and generate unique compositions in seconds.",
    canonicalPath: "/",
  });

  return (
    <div>
      {/* Hero Section — Suno-style with warm gradient and large heading */}
      <section className="relative overflow-hidden min-h-[80vh] flex items-center">
        {/* Warm gradient background like Suno */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/30 via-background to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/10 via-transparent to-orange-900/10" />
        {/* Subtle radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-purple-500/5 to-transparent rounded-full blur-3xl" />

        <div className="container relative py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-white leading-[1.05]">
              Make a{" "}
              <span className="suno-gradient-text">song</span>
              {" "}about{" "}
              <span className="text-white/80">anything</span>
            </h1>
            <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
              Describe the music you imagine, and our AI will compose it for you instantly.
              Download as MP3, view sheet music, and build your own album collection.
            </p>

            {/* CTA Buttons — Suno-style gradient create button */}
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
                    <Link href="/history">
                      <History className="w-5 h-5 mr-2" />
                      My Songs
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
          </div>
        </div>
      </section>

      {/* How It Works — Dark cards with subtle borders */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-white/80 text-lg">Three simple steps to create your music</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { step: "1", title: "Describe", desc: "Enter keywords describing the music you want — genre, mood, instruments, tempo." },
              { step: "2", title: "Generate", desc: "Our AI composes a unique piece of music based on your description in seconds." },
              { step: "3", title: "Download", desc: "Preview, download as MP3, view sheet music, or add to your album collection." },
            ].map((item) => (
              <div key={item.step} className="text-center space-y-4 p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors">
                <div className="w-14 h-14 rounded-2xl suno-gradient text-white text-xl font-bold flex items-center justify-center mx-auto">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                <p className="text-white/80 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid — Dark cards with purple accent icons */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Features</h2>
            <p className="text-white/80 text-lg">Everything you need to create and manage your music</p>
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
                <p className="text-sm text-white/80 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section — Gradient accent */}
      <section className="py-20 md:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/10 via-pink-900/5 to-orange-900/10" />
        <div className="container relative text-center space-y-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white">Ready to Create?</h2>
          <p className="text-lg text-white/80 max-w-xl mx-auto">
            Start generating unique AI music today. No musical knowledge required.
          </p>
          {isAuthenticated ? (
            <Button asChild size="lg" className="suno-gradient text-white font-semibold text-base px-8 py-6 rounded-full border-0 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 hover:scale-105 transition-all">
              <Link href="/generate">
                <Sparkles className="w-5 h-5 mr-2" />
                Create Music Now
              </Link>
            </Button>
          ) : (
            <Button asChild size="lg" className="suno-gradient text-white font-semibold text-base px-8 py-6 rounded-full border-0 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 hover:scale-105 transition-all">
              <a href={getLoginUrl()}>
                Sign Up to Get Started
              </a>
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
