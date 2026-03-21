import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";
import { Sparkles, Music, Download, Printer, Disc3, History, ArrowRight } from "lucide-react";
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
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/10" />
        <div className="container relative py-8 md:py-12">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              Make Custom Music
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground leading-tight">
              Transform Your Ideas into{" "}
              <span className="text-primary">Songs</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Describe the music you imagine, and our AI will compose it for you instantly.
              Download as MP3, view sheet music, and build your own album collection.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              {isAuthenticated ? (
                <Button asChild size="lg" className="text-base px-8">
                  <Link href="/generate">
                    <Sparkles className="w-5 h-5 mr-2" />
                    Start Creating
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              ) : (
                <Button asChild size="lg" className="text-base px-8">
                  <a href={getLoginUrl()}>
                    Get Started Here
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </a>
                </Button>
              )}
              {isAuthenticated && (
                <Button asChild variant="outline" size="lg" className="text-base px-8">
                  <Link href="/history">
                    <History className="w-5 h-5 mr-2" />
                    My Songs
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-3">How It Works</h2>
            <p className="text-muted-foreground text-lg">Three simple steps to create your music</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: "1", title: "Describe", desc: "Enter keywords describing the music you want — genre, mood, instruments, tempo." },
              { step: "2", title: "Generate", desc: "Our AI composes a unique piece of music based on your description in seconds." },
              { step: "3", title: "Download", desc: "Preview, download as MP3, view sheet music, or add to your album collection." },
            ].map((item) => (
              <div key={item.step} className="text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground text-xl font-bold flex items-center justify-center mx-auto">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-foreground">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-3">Features</h2>
            <p className="text-muted-foreground text-lg">Everything you need to create and manage your music</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-xl border border-border bg-card hover:shadow-lg transition-shadow duration-300"
              >
                <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-card-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-r from-primary/5 to-accent/10">
        <div className="container text-center space-y-6">
          <h2 className="text-3xl font-bold text-foreground">Ready to Create?</h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Start generating unique AI music today. No musical knowledge required.
          </p>
          {isAuthenticated ? (
            <Button asChild size="lg" className="text-base px-8">
              <Link href="/generate">
                <Sparkles className="w-5 h-5 mr-2" />
                Create Music Now
              </Link>
            </Button>
          ) : (
            <Button asChild size="lg" className="text-base px-8">
              <a href={getLoginUrl()}>
                Sign In to Get Started
              </a>
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
