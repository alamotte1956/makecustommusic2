import { Link } from "wouter";
import { FileText, ArrowLeft } from "lucide-react";

export default function Terms() {
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
        Last updated: March 1, 2026
      </p>

      <div className="prose prose-sm max-w-none space-y-8 text-foreground/90">
        {/* Introduction */}
        <section>
          <p className="leading-relaxed">
            Welcome to Make Custom Music. These Terms of Service ("Terms") govern your
            access to and use of the website at <strong>makecustommusic.com</strong> and
            all related services (collectively, the "Service") operated by A. LaMotte
            Music ("we," "us," or "our"). By accessing or using the Service, you agree to
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
            lyrics. The Service includes audio generation, sheet music creation, chord
            charts, lyrics generation, album organization, and audio file downloads. The
            quality and characteristics of generated content depend on the AI models used
            and the inputs you provide.
          </p>
        </section>

        {/* Subscription Plans */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">4. Subscription Plans and Payments</h2>

          <h3 className="text-base font-medium text-foreground mt-4 mb-2">Plans and Credits</h3>
          <p className="leading-relaxed mb-4">
            The Service offers multiple subscription tiers, each providing a monthly
            allocation of generation credits. Credits are consumed each time you generate
            a song. Unused monthly credits do not roll over to the next billing period.
            Additional credit packs may be purchased separately and do not expire.
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
                  <td className="px-4 py-2.5 text-foreground/70">3 credits</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium">Creator</td>
                  <td className="px-4 py-2.5 text-foreground/70">$8/mo</td>
                  <td className="px-4 py-2.5 text-foreground/70">100 credits</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium">Professional</td>
                  <td className="px-4 py-2.5 text-foreground/70">$19/mo</td>
                  <td className="px-4 py-2.5 text-foreground/70">500 credits</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium">Studio</td>
                  <td className="px-4 py-2.5 text-foreground/70">$39/mo</td>
                  <td className="px-4 py-2.5 text-foreground/70">5,000 credits</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-base font-medium text-foreground mt-4 mb-2">Billing and Cancellation</h3>
          <p className="leading-relaxed">
            Paid subscriptions are billed monthly through Stripe. You may cancel your
            subscription at any time; cancellation takes effect at the end of the current
            billing period. No refunds are provided for partial months. We reserve the
            right to change pricing with 30 days' advance notice.
          </p>
        </section>

        {/* Intellectual Property */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">5. Intellectual Property and Content Ownership</h2>

          <h3 className="text-base font-medium text-foreground mt-4 mb-2">Your Generated Content</h3>
          <p className="leading-relaxed">
            Subject to these Terms and your active subscription, you retain ownership of
            the music, lyrics, and other content you generate using the Service. You are
            granted a perpetual, non-exclusive license to use, distribute, and monetize
            your generated content for personal and commercial purposes. This license
            survives termination of your account for content already generated and
            downloaded.
          </p>

          <h3 className="text-base font-medium text-foreground mt-4 mb-2">Our Platform</h3>
          <p className="leading-relaxed">
            The Service, including its design, code, AI models, branding, and all
            underlying technology, is owned by A. LaMotte Music and protected by
            intellectual property laws. Nothing in these Terms grants you any right to use
            our trademarks, logos, or brand assets without prior written consent.
          </p>

          <h3 className="text-base font-medium text-foreground mt-4 mb-2">AI-Generated Content Disclaimer</h3>
          <p className="leading-relaxed">
            Content generated by AI may occasionally resemble existing works. We do not
            guarantee that generated content is free from similarities to copyrighted
            material. You are solely responsible for ensuring that your use of generated
            content complies with applicable copyright laws.
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
            <li>Resell, redistribute, or sublicense access to the Service itself</li>
            <li>Impersonate any person or entity, or misrepresent your affiliation</li>
          </ul>
          <p className="leading-relaxed mt-3">
            Violation of these rules may result in immediate suspension or termination of
            your account without refund.
          </p>
        </section>

        {/* Disclaimers */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">7. Disclaimers</h2>
          <p className="leading-relaxed">
            The Service is provided on an "as is" and "as available" basis without
            warranties of any kind, either express or implied. We do not warrant that the
            Service will be uninterrupted, error-free, or secure. We make no
            representations regarding the quality, accuracy, or suitability of AI-generated
            content for any particular purpose. The AI may produce unexpected or
            unsatisfactory results, and generation times may vary.
          </p>
        </section>

        {/* Limitation of Liability */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">8. Limitation of Liability</h2>
          <p className="leading-relaxed">
            To the maximum extent permitted by applicable law, A. LaMotte Music shall not
            be liable for any indirect, incidental, special, consequential, or punitive
            damages, including but not limited to loss of profits, data, or goodwill,
            arising out of or in connection with your use of the Service. Our total
            liability for any claim arising under these Terms shall not exceed the amount
            you paid us in the twelve (12) months preceding the claim.
          </p>
        </section>

        {/* Indemnification */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">9. Indemnification</h2>
          <p className="leading-relaxed">
            You agree to indemnify, defend, and hold harmless A. LaMotte Music and its
            officers, directors, employees, and agents from and against any claims,
            liabilities, damages, losses, and expenses (including reasonable legal fees)
            arising out of or in connection with your use of the Service, your violation
            of these Terms, or your violation of any rights of a third party.
          </p>
        </section>

        {/* Termination */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">10. Termination</h2>
          <p className="leading-relaxed">
            We may terminate or suspend your access to the Service at any time, with or
            without cause, and with or without notice. Upon termination, your right to use
            the Service ceases immediately. Content you have already downloaded remains
            yours under the license granted in Section 5. We are not obligated to maintain
            or provide access to your stored content after account termination.
          </p>
        </section>

        {/* Governing Law */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">11. Governing Law</h2>
          <p className="leading-relaxed">
            These Terms shall be governed by and construed in accordance with the laws of
            the United States, without regard to conflict of law principles. Any disputes
            arising under these Terms shall be resolved through binding arbitration or in
            the courts of competent jurisdiction.
          </p>
        </section>

        {/* Changes */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">12. Changes to These Terms</h2>
          <p className="leading-relaxed">
            We reserve the right to modify these Terms at any time. Material changes will
            be communicated by posting the updated Terms on this page and updating the
            "Last updated" date. Your continued use of the Service after changes are
            posted constitutes acceptance of the revised Terms.
          </p>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">13. Contact Us</h2>
          <p className="leading-relaxed">
            If you have any questions about these Terms of Service, please contact us at:
          </p>
          <div className="mt-3 p-4 rounded-lg bg-muted/50 border">
            <p className="font-medium text-foreground">A. LaMotte Music</p>
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
            <Link href="/privacy">
              <span className="text-violet-600 hover:underline cursor-pointer">Privacy Policy</span>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
