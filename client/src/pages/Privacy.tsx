import { Link } from "wouter";
import { Shield, ArrowLeft } from "lucide-react";

export default function Privacy() {
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
        Last updated: March 1, 2026
      </p>

      <div className="prose prose-sm max-w-none space-y-8 text-foreground/90">
        {/* Introduction */}
        <section>
          <p className="leading-relaxed">
            A. LaMotte Music ("we," "us," or "our") operates Make Custom Music at{" "}
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
            subscription, and associate your generated songs with your account.
          </p>

          <h3 className="text-base font-medium text-foreground mt-4 mb-2">Usage Data</h3>
          <p className="leading-relaxed">
            We automatically collect certain information when you interact with the
            Service, including the songs you generate, your genre and mood preferences,
            generation history, credit usage, and subscription status. This data helps us
            improve the quality of our AI music generation and provide you with a better
            experience.
          </p>

          <h3 className="text-base font-medium text-foreground mt-4 mb-2">Payment Information</h3>
          <p className="leading-relaxed">
            Payment processing is handled entirely by Stripe, our third-party payment
            processor. We do not store your credit card numbers, bank account details, or
            other sensitive financial information on our servers. Stripe's privacy
            practices are governed by their own{" "}
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
            We store the music, lyrics, sheet music, and associated metadata that you
            generate using our Service. This includes audio files stored on our cloud
            infrastructure, text prompts you provide, and any custom lyrics you write or
            generate through our AI lyrics feature.
          </p>
        </section>

        {/* How We Use Your Information */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">2. How We Use Your Information</h2>
          <p className="leading-relaxed mb-3">
            We use the information we collect for the following purposes:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80">
            <li>To provide, operate, and maintain the AI music generation service</li>
            <li>To process your subscription payments and manage your credit balance</li>
            <li>To send you notifications about your generated songs and account activity</li>
            <li>To improve and optimize our AI models and user experience</li>
            <li>To respond to your inquiries and provide customer support</li>
            <li>To detect, prevent, and address technical issues or abuse</li>
            <li>To comply with legal obligations</li>
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
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="px-4 py-2.5 font-medium">ElevenLabs</td>
                  <td className="px-4 py-2.5 text-foreground/70">AI music and audio generation</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium">Stripe</td>
                  <td className="px-4 py-2.5 text-foreground/70">Payment processing and subscription management</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium">Amazon S3</td>
                  <td className="px-4 py-2.5 text-foreground/70">Cloud storage for generated audio files</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium">Manus OAuth</td>
                  <td className="px-4 py-2.5 text-foreground/70">Authentication and identity management</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Cookies */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">4. Cookies and Local Storage</h2>
          <p className="leading-relaxed">
            We use session cookies to maintain your authentication state after you log in.
            We also use browser local storage to remember your preferences, such as
            onboarding tour completion status and audio player settings. These are
            essential for the Service to function properly. We do not use third-party
            tracking cookies or advertising cookies.
          </p>
        </section>

        {/* Data Retention */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">5. Data Retention</h2>
          <p className="leading-relaxed">
            We retain your account information and generated content for as long as your
            account is active. If you delete a song, the associated audio file and
            metadata are permanently removed from our systems. If you wish to delete your
            entire account and all associated data, please contact us at the email address
            provided below.
          </p>
        </section>

        {/* Data Security */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">6. Data Security</h2>
          <p className="leading-relaxed">
            We implement industry-standard security measures to protect your personal
            information. All data transmitted between your browser and our servers is
            encrypted using TLS/SSL. Payment data is handled exclusively by Stripe and
            never touches our servers. However, no method of electronic transmission or
            storage is 100% secure, and we cannot guarantee absolute security.
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
            <li><strong>Deletion:</strong> Request deletion of your personal data and generated content</li>
            <li><strong>Portability:</strong> Request your data in a machine-readable format</li>
            <li><strong>Objection:</strong> Object to certain types of data processing</li>
          </ul>
          <p className="leading-relaxed mt-3">
            To exercise any of these rights, please contact us using the information in
            the Contact section below.
          </p>
        </section>

        {/* Children */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">8. Children's Privacy</h2>
          <p className="leading-relaxed">
            The Service is not intended for individuals under the age of 13. We do not
            knowingly collect personal information from children under 13. If we become
            aware that we have collected personal data from a child under 13, we will take
            steps to delete that information promptly.
          </p>
        </section>

        {/* Changes */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">9. Changes to This Policy</h2>
          <p className="leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify you of any
            material changes by posting the new policy on this page and updating the "Last
            updated" date. Your continued use of the Service after any changes constitutes
            acceptance of the updated policy.
          </p>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">10. Contact Us</h2>
          <p className="leading-relaxed">
            If you have any questions about this Privacy Policy or wish to exercise your
            data rights, please contact us at:
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

        {/* Cross-link */}
        <div className="pt-6 border-t mt-10">
          <p className="text-sm text-muted-foreground">
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
