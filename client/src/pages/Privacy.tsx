import { Link } from "wouter";
import { Shield, ArrowLeft } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function Privacy() {
  usePageMeta({
    title: "Privacy Policy",
    description: "How Create Christian Music collects, uses, and protects your personal data. Read our privacy practices.",
    keywords: "create christian music privacy, AI music generator privacy policy, christian creator data protection, worship music platform privacy, church music data security",
    canonicalPath: "/privacy",
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
        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
          <Shield className="w-5 h-5 text-violet-600" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-10">
        Last updated: March 24, 2026
      </p>

      <div className="prose prose-sm max-w-none space-y-8 text-foreground/90">
        {/* Introduction */}
        <section>
          <p className="leading-relaxed">
            A. LaMotte Music (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates Create Christian Music at{" "}
            <strong>makecustommusic.com</strong>. This Privacy Policy explains how we
            collect, use, disclose, and safeguard your information when you visit our
            website and use our AI music generation services. By using the Service, you
            agree to the collection and use of information in accordance with this policy.
          </p>
        </section>

        {/* Information We Collect */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">1. Information We Collect</h2>

          <h3 className="text-base font-medium text-foreground mt-4 mb-2">Account Information</h3>
          <p className="leading-relaxed">
            When you create an account through our OAuth authentication provider, we
            collect your name, email address, and a unique identifier. This information
            is necessary to provide you with a personalized experience, manage your
            subscription, and associate your generated content with your account.
          </p>

          <h3 className="text-base font-medium text-foreground mt-4 mb-2">Usage Data</h3>
          <p className="leading-relaxed">
            We automatically collect certain information when you interact with the
            Service, including the songs you generate, your genre and mood preferences,
            generation history, credit usage, subscription status, and feature usage
            patterns. This data helps us improve the quality of our AI music generation
            and provide you with a better experience.
          </p>

          <h3 className="text-base font-medium text-foreground mt-4 mb-2">Payment Information</h3>
          <p className="leading-relaxed">
            Payment processing is handled entirely by Stripe, our third-party payment
            processor. We do not store your credit card numbers, bank account details, or
            other sensitive financial information on our servers. We only store your Stripe
            customer ID and subscription ID for account management purposes. Stripe&apos;s
            privacy practices are governed by their own{" "}
            <a
              href="https://stripe.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-600 hover:underline"
            >
              Privacy Policy
            </a>.
          </p>

          <h3 className="text-base font-medium text-foreground mt-4 mb-2">Generated Content</h3>
          <p className="leading-relaxed">
            We store the music, lyrics, sheet music, chord charts, MIDI files, album
            artwork, stems, and associated metadata that you generate using our Service.
            This includes audio files stored on our cloud infrastructure, text prompts you
            provide, custom lyrics you write or generate, and any configuration parameters
            (genre, mood, vocal type, style tags) you select. <strong>Your generated
            content belongs to you</strong> as described in our{" "}
            <Link href="/terms">
              <span className="text-violet-600 hover:underline cursor-pointer">Terms of Service</span>
            </Link>.
          </p>

          <h3 className="text-base font-medium text-foreground mt-4 mb-2">Uploaded Content</h3>
          <p className="leading-relaxed">
            When you upload audio files for MP3-to-sheet-music conversion, stem separation,
            audio format conversion, or other processing features, we temporarily store
            those files on our cloud infrastructure. Uploaded files are used solely to
            provide the requested service and are not used for AI model training or any
            other purpose without your explicit consent. Supported formats include MP3,
            WAV, FLAC, OGG, M4A, AAC, and AIFF.
          </p>

          <h3 className="text-base font-medium text-foreground mt-4 mb-2">Device and Browser Information</h3>
          <p className="leading-relaxed">
            We collect standard technical information including your browser type and
            version, operating system, device type, screen resolution, and IP address.
            This information helps us optimize the Service for different platforms,
            including Safari, Chrome, Firefox, and Edge on macOS, iOS, Windows, and
            Android devices.
          </p>
        </section>

        {/* How We Use Your Information */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">2. How We Use Your Information</h2>
          <p className="leading-relaxed mb-3">
            We use the information we collect for the following purposes:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80">
            <li>To provide, operate, and maintain the AI music generation service, including song generation, sheet music creation, stem separation, audio conversion, and all other features</li>
            <li>To process your subscription payments and manage your credit balance</li>
            <li>To store and serve your generated content (music, lyrics, sheet music, album art, MIDI files, stems)</li>
            <li>To process your uploaded audio files for conversion, transcription, and analysis</li>

            <li>To enable collaboration features when you share albums or songs with other users</li>
            <li>To send you notifications about your generated songs and account activity</li>
            <li>To improve and optimize our user experience and service reliability</li>
            <li>To respond to your inquiries and provide customer support</li>
            <li>To detect, prevent, and address technical issues or abuse</li>
            <li>To comply with legal obligations</li>
          </ul>

          <h3 className="text-base font-medium text-foreground mt-4 mb-2">What We Do NOT Do With Your Data</h3>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80">
            <li>We do <strong>not</strong> sell your personal information to third parties</li>
            <li>We do <strong>not</strong> use your generated content to train AI models without your explicit consent</li>
            <li>We do <strong>not</strong> use your uploaded audio files for any purpose other than providing the requested service</li>
            <li>We do <strong>not</strong> share your voice cloning samples with any third party</li>
            <li>We do <strong>not</strong> use third-party advertising or tracking cookies</li>
            <li>We do <strong>not</strong> claim ownership of your generated or uploaded content</li>
          </ul>
        </section>

        {/* Third-Party Services */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">3. Third-Party Services</h2>
          <p className="leading-relaxed mb-4">
            We integrate with the following third-party services to deliver our product.
            Each service has its own privacy policy governing how it handles your data:
          </p>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-4 py-2.5 font-medium text-foreground">Service</th>
                  <th className="text-left px-4 py-2.5 font-medium text-foreground">Purpose</th>
                  <th className="text-left px-4 py-2.5 font-medium text-foreground">Data Shared</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="px-4 py-2.5 font-medium">Suno</td>
                  <td className="px-4 py-2.5 text-foreground/70">AI music and audio generation</td>
                  <td className="px-4 py-2.5 text-foreground/70">Text prompts, lyrics, generation parameters</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium">Stripe</td>
                  <td className="px-4 py-2.5 text-foreground/70">Payment processing</td>
                  <td className="px-4 py-2.5 text-foreground/70">Email, name (for billing only)</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium">Amazon S3</td>
                  <td className="px-4 py-2.5 text-foreground/70">Cloud file storage</td>
                  <td className="px-4 py-2.5 text-foreground/70">Generated audio, images, uploaded files</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium">OAuth Provider</td>
                  <td className="px-4 py-2.5 text-foreground/70">Authentication</td>
                  <td className="px-4 py-2.5 text-foreground/70">Name, email, unique ID</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium">AI Language Models</td>
                  <td className="px-4 py-2.5 text-foreground/70">Lyrics generation, sheet music analysis</td>
                  <td className="px-4 py-2.5 text-foreground/70">Text prompts, genre/mood parameters</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="leading-relaxed mt-3 text-sm text-foreground/70">
            We carefully vet all third-party services and only share the minimum data
            necessary to provide the requested functionality.
          </p>
        </section>

        {/* Cookies */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">4. Cookies and Local Storage</h2>
          <p className="leading-relaxed">
            We use session cookies to maintain your authentication state after you log in.
            We also use browser local storage to remember your preferences, such as
            theme settings, onboarding tour completion status, audio player settings, and
            cookie consent status. These are essential for the Service to function properly.
            We do not use third-party tracking cookies, advertising cookies, or
            cross-site tracking technologies.
          </p>
        </section>

        {/* Data Retention */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">5. Data Retention</h2>
          <p className="leading-relaxed mb-3">
            We retain your data according to the following schedule:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80">
            <li><strong>Account information:</strong> Retained for as long as your account is active</li>
            <li><strong>Generated content:</strong> Retained for as long as your account is active; deleted songs are permanently removed</li>
            <li><strong>Uploaded audio files:</strong> Retained for as long as the associated content exists in your account</li>
            <li><strong>Voice cloning samples:</strong> Retained until you delete the persona or your account</li>
            <li><strong>Payment records:</strong> Retained as required by tax and financial regulations (typically 7 years)</li>
            <li><strong>Usage logs:</strong> Retained for up to 90 days for debugging and security purposes</li>
          </ul>
          <p className="leading-relaxed mt-3">
            If you wish to delete your entire account and all associated data, please
            contact us at the email address provided below. We will process your request
            within 30 days.
          </p>
        </section>

        {/* Data Security */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">6. Data Security</h2>
          <p className="leading-relaxed">
            We implement industry-standard security measures to protect your personal
            information, including:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80 mt-3">
            <li>TLS/SSL encryption for all data transmitted between your browser and our servers</li>
            <li>Encrypted database connections with SSL certificates</li>
            <li>Secure cloud storage with access controls for all uploaded and generated files</li>
            <li>JWT-based session management with secure, HTTP-only cookies</li>
            <li>Payment data handled exclusively by PCI-compliant Stripe — never stored on our servers</li>
            <li>Regular security reviews and dependency updates</li>
          </ul>
          <p className="leading-relaxed mt-3">
            However, no method of electronic transmission or storage is 100% secure, and
            we cannot guarantee absolute security. We encourage you to use strong,
            unique passwords and keep your account credentials confidential.
          </p>
        </section>

        {/* Your Rights */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">7. Your Rights</h2>
          <p className="leading-relaxed mb-3">
            Depending on your jurisdiction, you may have the following rights regarding
            your personal data:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80">
            <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
            <li><strong>Correction:</strong> Request correction of inaccurate personal data</li>
            <li><strong>Deletion:</strong> Request deletion of your personal data, generated content, and uploaded files</li>
            <li><strong>Portability:</strong> Request your data in a machine-readable format (we support MP3, WAV, MIDI, PDF, and ABC notation exports)</li>
            <li><strong>Objection:</strong> Object to certain types of data processing</li>
            <li><strong>Restriction:</strong> Request restriction of processing of your personal data</li>
            <li><strong>Withdraw consent:</strong> Withdraw consent for data processing at any time (this does not affect the lawfulness of processing before withdrawal)</li>
          </ul>
          <p className="leading-relaxed mt-3">
            To exercise any of these rights, please contact us using the information in
            the Contact section below. We will respond to your request within 30 days.
          </p>
        </section>

        {/* International Data Transfers */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">8. International Data Transfers</h2>
          <p className="leading-relaxed">
            Your information may be transferred to and processed in countries other than
            your country of residence, including the United States. These countries may
            have data protection laws that differ from those in your jurisdiction. By using
            the Service, you consent to the transfer of your information to these countries.
            We ensure appropriate safeguards are in place to protect your data in accordance
            with this Privacy Policy.
          </p>
        </section>

        {/* California Privacy Rights */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">9. California Privacy Rights (CCPA)</h2>
          <p className="leading-relaxed">
            If you are a California resident, you have additional rights under the
            California Consumer Privacy Act (CCPA), including the right to know what
            personal information we collect, the right to request deletion, and the right
            to opt out of the sale of personal information. <strong>We do not sell your
            personal information.</strong> To exercise your CCPA rights, please contact us
            at the email address below.
          </p>
        </section>

        {/* GDPR */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">10. European Privacy Rights (GDPR)</h2>
          <p className="leading-relaxed">
            If you are located in the European Economic Area (EEA), United Kingdom, or
            Switzerland, you have rights under the General Data Protection Regulation
            (GDPR). Our legal basis for processing your personal data includes: (a)
            performance of a contract (providing the Service); (b) legitimate interests
            (improving the Service, preventing abuse); and (c) your consent (where
            applicable). You have the right to lodge a complaint with your local data
            protection authority.
          </p>
        </section>

        {/* Children */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">11. Children&apos;s Privacy</h2>
          <p className="leading-relaxed">
            The Service is not intended for individuals under the age of 13. We do not
            knowingly collect personal information from children under 13. If we become
            aware that we have collected personal data from a child under 13, we will take
            steps to delete that information promptly. If you believe a child under 13 has
            provided us with personal information, please contact us immediately.
          </p>
        </section>

        {/* Changes */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">12. Changes to This Policy</h2>
          <p className="leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify you of any
            material changes by posting the new policy on this page and updating the &quot;Last
            updated&quot; date. For material changes that affect how we handle your generated
            content or intellectual property, we will provide at least 30 days&apos; advance
            notice. Your continued use of the Service after any changes constitutes
            acceptance of the updated policy.
          </p>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">13. Contact Us</h2>
          <p className="leading-relaxed">
            If you have any questions about this Privacy Policy, wish to exercise your
            data rights, or have concerns about how your data is handled, please contact
            us at:
          </p>
          <div className="mt-3 p-4 rounded-lg bg-muted/50 border">
            <p className="font-medium text-foreground">A. LaMotte Music</p>
            <p className="text-foreground/70 mt-1">
              Email:{" "}
              <a href="mailto:support@createchristianmusic.com" className="text-violet-600 hover:underline">
                support@createchristianmusic.com
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

        {/* Copyright and cross-link */}
        <div className="pt-6 border-t mt-10">
          <p className="text-sm text-muted-foreground">
            &copy; 2026 Albert LaMotte. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            See also our{" "}
            <Link href="/terms">
              <span className="text-violet-600 hover:underline cursor-pointer">Terms of Service</span>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
