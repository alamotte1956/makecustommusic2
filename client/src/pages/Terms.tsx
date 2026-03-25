import { Link } from "wouter";
import { FileText, ArrowLeft } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function Terms() {
  usePageMeta({
    title: "Terms of Service",
    description: "Terms of service for Make Custom Music. Understand your rights and responsibilities when using our AI music generation platform.",
    canonicalPath: "/terms",
  });
  return (
    <div className="container max-w-3xl py-12 px-4">
      {/* Back link */}
      <Link href="/">
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 cursor-pointer">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </span>
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3 mb-2 mt-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
          <FileText className="w-5 h-5 text-indigo-600" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-10">
        Last updated: March 24, 2026
      </p>

      <div className="prose prose-sm max-w-none space-y-8 text-foreground/90">
        {/* Introduction */}
        <section>
          <p className="leading-relaxed">
            Welcome to Make Custom Music. These Terms of Service (&quot;Terms&quot;) govern your
            access to and use of the website at <strong>makecustommusic.com</strong> and
            all related services (collectively, the &quot;Service&quot;) operated by A. LaMotte
            Music (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By accessing or using the Service, you agree to
            be bound by these Terms. If you do not agree, please do not use the Service.
          </p>
        </section>

        {/* Eligibility */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">1. Eligibility</h2>
          <p className="leading-relaxed">
            You must be at least 13 years of age to use the Service. By creating an
            account, you represent and warrant that you meet this age requirement and that
            all information you provide is accurate and complete. If you are under 18, you
            must have the consent of a parent or legal guardian.
          </p>
        </section>

        {/* Account */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">2. Your Account</h2>
          <p className="leading-relaxed">
            You are responsible for maintaining the confidentiality of your account
            credentials and for all activities that occur under your account. You agree to
            notify us immediately of any unauthorized use of your account. We reserve the
            right to suspend or terminate accounts that violate these Terms or are used
            for fraudulent purposes.
          </p>
        </section>

        {/* Service Description */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">3. Service Description</h2>
          <p className="leading-relaxed">
            Make Custom Music is an AI-powered music generation platform that allows users
            to create original music by providing text descriptions, keywords, or custom
            lyrics. The Service includes, but is not limited to: audio generation, sheet music
            creation, guitar chord charts, lyrics generation, MP3-to-sheet-music conversion,
            album organization, song remixing, audio file downloads, stem separation,
            song extension, audio format conversion, MIDI export, ringtone creation,
            voice cloning/personas, and collaborative album features. The quality and
            characteristics of generated content depend on the AI models used and the
            inputs you provide.
          </p>
        </section>

        {/* Subscription Plans */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">4. Subscription Plans and Payments</h2>

          <h3 className="text-base font-medium text-foreground mt-4 mb-2">Plans and Credits</h3>
          <p className="leading-relaxed mb-4">
            The Service offers multiple subscription tiers, each providing a monthly
            allocation of generation credits. Credits are consumed each time you generate
            a song, convert audio, or use premium features. Unused monthly credits do not
            roll over to the next billing period. Upgrade to a higher plan for more credits.
          </p>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-4 py-2.5 font-medium text-foreground">Plan</th>
                  <th className="text-left px-4 py-2.5 font-medium text-foreground">Price</th>
                  <th className="text-left px-4 py-2.5 font-medium text-foreground">Monthly Credits</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="px-4 py-2.5 font-medium">Free</td>
                  <td className="px-4 py-2.5 text-foreground/70">$0/mo</td>
                  <td className="px-4 py-2.5 text-foreground/70">2 credits</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium">Creator</td>
                  <td className="px-4 py-2.5 text-foreground/70">$8/mo</td>
                  <td className="px-4 py-2.5 text-foreground/70">125 credits</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium">Professional</td>
                  <td className="px-4 py-2.5 text-foreground/70">$19/mo</td>
                  <td className="px-4 py-2.5 text-foreground/70">500 credits</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium">Studio</td>
                  <td className="px-4 py-2.5 text-foreground/70">$39/mo</td>
                  <td className="px-4 py-2.5 text-foreground/70">2,500 credits</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-base font-medium text-foreground mt-4 mb-2">Billing and Cancellation</h3>
          <p className="leading-relaxed">
            Paid subscriptions are billed monthly through Stripe. You may cancel your
            subscription at any time; cancellation takes effect at the end of the current
            billing period. No refunds are provided for partial months. We reserve the
            right to change pricing with 30 days&apos; advance notice.
          </p>
        </section>

        {/* Intellectual Property — THE KEY SECTION */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">5. Intellectual Property and Content Ownership</h2>

          <h3 className="text-base font-medium text-foreground mt-4 mb-2">5.1 Your Generated Content — You Own It</h3>
          <p className="leading-relaxed mb-3">
            <strong>You retain all intellectual property rights</strong> to any and all content
            you generate using the Service, including but not limited to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80 mb-3">
            <li><strong>Music and audio recordings</strong> (MP3, WAV, AIFF, and all other formats)</li>
            <li><strong>Lyrics and song text</strong> (whether AI-generated, user-written, or a combination)</li>
            <li><strong>Sheet music and musical notation</strong> (ABC notation, PDF exports, and visual renderings)</li>
            <li><strong>Guitar chord charts and tablature</strong></li>
            <li><strong>MIDI files</strong> exported from the Service</li>
            <li><strong>Album artwork and cover images</strong> generated by the Service</li>
            <li><strong>Stems and separated audio tracks</strong></li>
            <li><strong>Ringtones and audio clips</strong> derived from your generated content</li>
            <li><strong>Remixes, extensions, and derivative works</strong> you create from your content</li>
          </ul>
          <p className="leading-relaxed mb-3">
            Upon generation, you are granted a <strong>perpetual, irrevocable, worldwide,
            royalty-free, exclusive license</strong> to use, reproduce, distribute, publicly
            perform, publicly display, create derivative works from, and monetize your
            generated content for any lawful purpose, including but not limited to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80 mb-3">
            <li>Commercial release on streaming platforms (Spotify, Apple Music, YouTube Music, etc.)</li>
            <li>Synchronization in film, television, video games, advertisements, and podcasts</li>
            <li>Live public performance and broadcast</li>
            <li>Physical distribution (CDs, vinyl, sheet music books)</li>
            <li>Licensing to third parties</li>
            <li>Registration with performing rights organizations (ASCAP, BMI, SESAC, etc.)</li>
            <li>Copyright registration with the U.S. Copyright Office or equivalent international bodies</li>
          </ul>
          <p className="leading-relaxed">
            This license survives termination of your account for all content already
            generated and downloaded. <strong>We claim no ownership interest</strong> in your
            generated content and will not use, sell, license, or distribute your content
            without your explicit written consent, except as necessary to provide the Service
            (e.g., storing your files, rendering sheet music, processing audio).
          </p>

          <h3 className="text-base font-medium text-foreground mt-4 mb-2">5.2 Uploaded Content</h3>
          <p className="leading-relaxed">
            When you upload audio files, sheet music, or other content to the Service, you
            retain all pre-existing intellectual property rights in that content. By uploading,
            you grant us a limited, non-exclusive license to process, store, and analyze your
            uploaded content solely for the purpose of providing the Service to you (e.g.,
            MP3-to-sheet-music conversion, audio analysis, stem separation). We will not use
            your uploaded content for any other purpose, including training AI models, without
            your explicit consent.
          </p>

          <h3 className="text-base font-medium text-foreground mt-4 mb-2">5.3 Community-Shared Content</h3>
          <p className="leading-relaxed">
            If you choose to publish your generated content to the Discover page or other
            community features, you grant other users a limited, non-exclusive license to
            listen to and interact with your content within the Service. This does not
            transfer any ownership rights. You may unpublish your content at any time, which
            revokes this community license.
          </p>

          <h3 className="text-base font-medium text-foreground mt-4 mb-2">5.4 Our Platform</h3>
          <p className="leading-relaxed">
            The Service itself, including its design, source code, AI models, algorithms,
            branding, user interface, and all underlying technology, is owned by A. LaMotte
            Music and is protected by copyright, trademark, and other intellectual property
            laws. &copy; 2026 Albert LaMotte. All rights reserved. Nothing in these Terms
            grants you any right to use our trademarks, logos, or brand assets without prior
            written consent.
          </p>

          <h3 className="text-base font-medium text-foreground mt-4 mb-2">5.5 AI-Generated Content Disclaimer</h3>
          <p className="leading-relaxed">
            Content generated by AI may occasionally resemble existing works due to the
            nature of machine learning. We do not guarantee that generated content is free
            from similarities to copyrighted material. You are solely responsible for
            ensuring that your use of generated content complies with applicable copyright
            laws. We recommend reviewing generated content before commercial release and
            consulting with a legal professional if you have concerns about potential
            infringement.
          </p>

          <h3 className="text-base font-medium text-foreground mt-4 mb-2">5.6 DMCA and Copyright Complaints</h3>
          <p className="leading-relaxed">
            If you believe that content on the Service infringes your copyright, please
            contact us at{" "}
            <a href="mailto:support@makecustommusic.com" className="text-violet-600 hover:underline">
              support@makecustommusic.com
            </a>{" "}
            with a detailed description of the alleged infringement, including the specific
            content, your ownership claim, and your contact information. We will investigate
            and respond in accordance with the Digital Millennium Copyright Act (DMCA).
          </p>
        </section>

        {/* Acceptable Use */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">6. Acceptable Use</h2>
          <p className="leading-relaxed mb-3">
            You agree not to use the Service to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80">
            <li>Generate content that is illegal, harmful, threatening, abusive, defamatory, or otherwise objectionable</li>
            <li>Infringe upon the intellectual property rights of any third party</li>
            <li>Attempt to reverse-engineer, decompile, or extract the AI models or algorithms</li>
            <li>Use automated scripts, bots, or scrapers to access the Service</li>
            <li>Circumvent credit limits, subscription restrictions, or security measures</li>
            <li>Resell, redistribute, or sublicense access to the Service itself (your generated content is yours to sell)</li>
            <li>Impersonate any person or entity, or misrepresent your affiliation</li>
            <li>Upload content that you do not have the right to use or that violates third-party rights</li>
            <li>Use the Service to generate content that promotes hatred, violence, or discrimination</li>
          </ul>
          <p className="leading-relaxed mt-3">
            Violation of these rules may result in immediate suspension or termination of
            your account without refund.
          </p>
        </section>

        {/* Data and Privacy */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">7. Data and Privacy</h2>
          <p className="leading-relaxed">
            Your use of the Service is also governed by our{" "}
            <Link href="/privacy">
              <span className="text-violet-600 hover:underline cursor-pointer">Privacy Policy</span>
            </Link>
            , which describes how we collect, use, and protect your personal information.
            We are committed to safeguarding your data and will not sell your personal
            information to third parties.
          </p>
        </section>

        {/* Disclaimers */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">8. Disclaimers</h2>
          <p className="leading-relaxed">
            The Service is provided on an &quot;as is&quot; and &quot;as available&quot; basis without
            warranties of any kind, either express or implied, including but not limited to
            implied warranties of merchantability, fitness for a particular purpose, and
            non-infringement. We do not warrant that the Service will be uninterrupted,
            error-free, or secure. We make no representations regarding the quality,
            accuracy, originality, or suitability of AI-generated content for any particular
            purpose. The AI may produce unexpected or unsatisfactory results, and generation
            times may vary.
          </p>
        </section>

        {/* Limitation of Liability */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">9. Limitation of Liability</h2>
          <p className="leading-relaxed">
            To the maximum extent permitted by applicable law, A. LaMotte Music and its
            owner, Albert LaMotte, shall not be liable for any indirect, incidental, special,
            consequential, or punitive damages, including but not limited to loss of profits,
            data, goodwill, or revenue, arising out of or in connection with your use of the
            Service, any generated content, or any third-party claims related to your use of
            generated content. Our total aggregate liability for any claim arising under
            these Terms shall not exceed the amount you paid us in the twelve (12) months
            preceding the claim.
          </p>
        </section>

        {/* Indemnification */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">10. Indemnification</h2>
          <p className="leading-relaxed">
            You agree to indemnify, defend, and hold harmless A. LaMotte Music, Albert
            LaMotte, and their officers, directors, employees, and agents from and against
            any claims, liabilities, damages, losses, and expenses (including reasonable
            legal fees) arising out of or in connection with: (a) your use of the Service;
            (b) your generated content and how you use, distribute, or monetize it;
            (c) your violation of these Terms; (d) your violation of any rights of a third
            party; or (e) any content you upload to the Service.
          </p>
        </section>

        {/* Termination */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">11. Termination</h2>
          <p className="leading-relaxed">
            We may terminate or suspend your access to the Service at any time, with or
            without cause, and with or without notice. Upon termination, your right to use
            the Service ceases immediately. However, your intellectual property rights in
            content you have already generated and downloaded survive termination
            indefinitely, as described in Section 5.1. We are not obligated to maintain
            or provide access to your stored content after account termination. We recommend
            downloading all generated content before canceling your account.
          </p>
        </section>

        {/* Governing Law */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">12. Governing Law and Dispute Resolution</h2>
          <p className="leading-relaxed">
            These Terms shall be governed by and construed in accordance with the laws of
            the State of Texas, United States, without regard to conflict of law principles.
            Any disputes arising under these Terms shall first be attempted to be resolved
            through good-faith negotiation. If negotiation fails, disputes shall be resolved
            through binding arbitration administered by the American Arbitration Association
            (AAA) under its Commercial Arbitration Rules, or in the courts of competent
            jurisdiction in the State of Texas.
          </p>
        </section>

        {/* Changes */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">13. Changes to These Terms</h2>
          <p className="leading-relaxed">
            We reserve the right to modify these Terms at any time. Material changes will
            be communicated by posting the updated Terms on this page and updating the
            &quot;Last updated&quot; date. Your continued use of the Service after changes are
            posted constitutes acceptance of the revised Terms. For material changes that
            affect your intellectual property rights, we will provide at least 30 days&apos;
            advance notice.
          </p>
        </section>

        {/* Severability */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">14. Severability</h2>
          <p className="leading-relaxed">
            If any provision of these Terms is held to be invalid or unenforceable, the
            remaining provisions shall continue in full force and effect. The invalid or
            unenforceable provision shall be modified to the minimum extent necessary to
            make it valid and enforceable while preserving its original intent.
          </p>
        </section>

        {/* Entire Agreement */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">15. Entire Agreement</h2>
          <p className="leading-relaxed">
            These Terms, together with our Privacy Policy, constitute the entire agreement
            between you and A. LaMotte Music regarding the Service and supersede all prior
            agreements, understandings, and communications, whether written or oral.
          </p>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">16. Contact Us</h2>
          <p className="leading-relaxed">
            If you have any questions about these Terms of Service, your intellectual
            property rights, or any other aspect of the Service, please contact us at:
          </p>
          <div className="mt-3 p-4 rounded-lg bg-muted/50 border">
            <p className="font-medium text-foreground">A. LaMotte Music</p>
            <p className="text-foreground/70 mt-1">
              Email:{" "}
              <a href="mailto:support@makecustommusic.com" className="text-violet-600 hover:underline">
                support@makecustommusic.com
              </a>
            </p>
            <p className="text-foreground/70 mt-1">
              Website:{" "}
              <a href="https://makecustommusic.com" className="text-violet-600 hover:underline">
                makecustommusic.com
              </a>
            </p>
          </div>
        </section>

        {/* Copyright notice */}
        <div className="pt-6 border-t mt-10">
          <p className="text-sm text-muted-foreground">
            &copy; 2026 Albert LaMotte. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            See also our{" "}
            <Link href="/privacy">
              <span className="text-violet-600 hover:underline cursor-pointer">Privacy Policy</span>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
