import { usePageMeta } from "@/hooks/usePageMeta";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Shield, Check, Music, FileText, Users, Church, BookOpen, ArrowRight } from "lucide-react";

export default function ChurchLicensing() {
  usePageMeta({
    title: "Church Licensing — Make Custom Music",
    description: "Understand your rights when using AI-generated worship music in church services, live streams, recordings, and more.",
    canonicalPath: "/licensing",
  });

  return (
    <div className="container max-w-4xl py-12 md:py-16 space-y-16">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs font-medium text-purple-400">
          <Shield className="w-3 h-3" />
          LICENSING
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white">
          Church Music Licensing
        </h1>
        <p className="text-lg text-white/60 max-w-2xl mx-auto">
          Everything you need to know about using Make Custom Music in your church,
          ministry, and worship services.
        </p>
      </div>

      {/* Key Principle */}
      <div className="p-8 rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-900/5 border border-purple-500/20">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">
              You Own Your Music — On Every Plan
            </h2>
            <p className="text-white/60 leading-relaxed">
              Unlike traditional music licensing where you pay ongoing fees to use someone else's songs,
              every piece of music you create on Make Custom Music belongs to you. This includes free accounts.
              You hold full intellectual property rights and commercial use rights for all music you generate.
            </p>
          </div>
        </div>
      </div>

      {/* What You Can Do */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">What You Can Do With Your Music</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            {
              icon: Church,
              title: "Sunday Services",
              items: [
                "Play during worship, communion, offering, and altar calls",
                "Use as prelude, postlude, or background music",
                "Print sheet music and chord charts for your worship team",
                "No CCLI or OneLicense reporting required",
              ],
            },
            {
              icon: Users,
              title: "Live Streaming & Recording",
              items: [
                "Stream services with your generated music on any platform",
                "Record and distribute sermon audio with background music",
                "Upload worship recordings to YouTube, Facebook, or your website",
                "No copyright claims or takedown risks",
              ],
            },
            {
              icon: Music,
              title: "Events & Performances",
              items: [
                "Use at weddings, funerals, baptisms, and special services",
                "Play at youth camps, retreats, and conferences",
                "Perform at concerts and community events",
                "Use in VBS (Vacation Bible School) programs",
              ],
            },
            {
              icon: FileText,
              title: "Distribution & Publishing",
              items: [
                "Sell or distribute recordings of your generated music",
                "Include in albums, EPs, or singles on Spotify, Apple Music, etc.",
                "Use in podcasts, audiobooks, and educational materials",
                "License to other churches or ministries if you choose",
              ],
            },
          ].map((section) => (
            <div key={section.title} className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
                  <section.icon className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">{section.title}</h3>
              </div>
              <ul className="space-y-2">
                {section.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-white/60">
                    <Check className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* How It Compares to Traditional Licensing */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">How It Compares to Traditional Church Licensing</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-white/40 font-medium">Feature</th>
                <th className="text-center py-3 px-4 text-white/40 font-medium">CCLI / OneLicense</th>
                <th className="text-center py-3 px-4 text-purple-400 font-medium">Make Custom Music</th>
              </tr>
            </thead>
            <tbody className="text-white/60">
              <tr className="border-b border-white/[0.06]">
                <td className="py-3 px-4">Annual licensing fee</td>
                <td className="text-center py-3 px-4">$100–$500+/yr</td>
                <td className="text-center py-3 px-4 text-green-400">Free plan available</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-3 px-4">Song reporting required</td>
                <td className="text-center py-3 px-4">Yes, quarterly</td>
                <td className="text-center py-3 px-4 text-green-400">Never</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-3 px-4">IP ownership</td>
                <td className="text-center py-3 px-4">No — licensed only</td>
                <td className="text-center py-3 px-4 text-green-400">Full ownership</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-3 px-4">Commercial use</td>
                <td className="text-center py-3 px-4">Restricted</td>
                <td className="text-center py-3 px-4 text-green-400">Included</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-3 px-4">Live streaming rights</td>
                <td className="text-center py-3 px-4">Extra fee</td>
                <td className="text-center py-3 px-4 text-green-400">Included</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-3 px-4">Sheet music printing</td>
                <td className="text-center py-3 px-4">Limited copies</td>
                <td className="text-center py-3 px-4 text-green-400">Unlimited</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-3 px-4">Original music creation</td>
                <td className="text-center py-3 px-4">Not included</td>
                <td className="text-center py-3 px-4 text-green-400">Core feature</td>
              </tr>
              <tr>
                <td className="py-3 px-4">Worship set planning</td>
                <td className="text-center py-3 px-4">Separate tool needed</td>
                <td className="text-center py-3 px-4 text-green-400">Built in</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Important Notes */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Important Notes</h2>
        <div className="space-y-4">
          <div className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <h3 className="font-semibold text-white mb-2">This Covers Only Music Created on Our Platform</h3>
            <p className="text-sm text-white/60 leading-relaxed">
              Your licensing rights apply to music you generate using Make Custom Music. If your church
              also performs copyrighted songs by other artists (e.g., Hillsong, Bethel, Elevation Worship),
              you still need a CCLI or OneLicense for those songs. Make Custom Music is a complement to
              traditional licensing, not a replacement for covering third-party copyrighted works.
            </p>
          </div>
          <div className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <h3 className="font-semibold text-white mb-2">Copyright Notice</h3>
            <p className="text-sm text-white/60 leading-relaxed">
              All music generated through Make Custom Music is original AI-composed content. We recommend
              including a copyright notice on any published works: "© {new Date().getFullYear()} [Your Name/Church Name].
              Created with Make Custom Music." This helps establish your ownership and protects your rights.
            </p>
          </div>
          <div className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <h3 className="font-semibold text-white mb-2">Multi-Church & Denominational Use</h3>
            <p className="text-sm text-white/60 leading-relaxed">
              Each church or ministry should have its own account. Music generated under one account
              belongs to that account holder. If you want to share music between churches, the account
              holder can distribute it freely — there are no restrictions on sharing your own creations.
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center space-y-6 py-8">
        <h2 className="text-2xl font-bold text-white">Ready to Create Music for Your Church?</h2>
        <p className="text-white/60 max-w-lg mx-auto">
          Start generating worship songs, hymns, and instrumentals today. Free to start, no credit card required.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild size="lg" className="suno-gradient text-white font-semibold rounded-full px-8 py-6 border-0">
            <Link href="/generate">
              <Music className="w-5 h-5 mr-2" />
              Start Creating
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full border-white/20 text-white hover:bg-white/5 px-8 py-6 bg-transparent">
            <Link href="/pricing">
              View Pricing
            </Link>
          </Button>
        </div>
      </div>

      {/* Legal footer */}
      <div className="text-center text-xs text-white/30 pb-8">
        <p>
          For full legal terms, see our{" "}
          <Link href="/terms" className="underline hover:text-white/50">Terms of Service</Link>
          {" "}and{" "}
          <Link href="/privacy" className="underline hover:text-white/50">Privacy Policy</Link>.
        </p>
        <p className="mt-2">© {new Date().getFullYear()} Albert LaMotte. All rights reserved.</p>
      </div>
    </div>
  );
}
