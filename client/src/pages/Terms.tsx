import { Link } from "wouter";
import { FileText, ArrowLeft } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function Terms() {
  usePageMeta({
    title: "Terms of Service",
    description: "Terms of service for Create Christian Music. Your rights and responsibilities using our AI worship music platform.",
    keywords: "create christian music terms, AI worship music terms of service, christian music generator legal, church music copyright, worship music platform terms, gospel music creator rights",
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
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
          <FileText className="w-5 h-5 text-indigo-400" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-10">
        Last updated: March 25, 2026
      </p>

      <div className="prose prose-sm max-w-none space-y-8 text-foreground/90">
        {/* ═══ IMPORTANT NOTICE ═══ */}
        <section className="p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
          <p className="leading-relaxed font-semibold text-foreground">
            IMPORTANT NOTICE: PLEASE READ THESE TERMS CAREFULLY. BY USING MAKE CUSTOM MUSIC,
            YOU AGREE TO BE BOUND BY THESE TERMS, INCLUDING THE BINDING ARBITRATION CLAUSE
            AND CLASS ACTION WAIVER IN SECTION 13. THIS MEANS THAT YOU AGREE TO RESOLVE MOST
            DISPUTES THROUGH BINDING, INDIVIDUAL ARBITRATION AND NOT IN COURT, AND THAT YOU
            WAIVE YOUR RIGHT TO PARTICIPATE IN CLASS ACTIONS, CLASS ARBITRATIONS, OR
            REPRESENTATIVE ACTIONS. YOU MAY OPT OUT OF THE ARBITRATION CLAUSE WITHIN 30 DAYS
            OF FIRST ACCEPTING THESE TERMS (SEE SECTION 13 FOR DETAILS).
          </p>
        </section>

        {/* Introduction */}
        <section>
          <p className="leading-relaxed">
            Welcome to Create Christian Music. These Terms of Service (&quot;Terms&quot;) govern your
            access to and use of the website at <strong>makecustommusic.com</strong> and
            all related services, applications, and tools (collectively, the &quot;Service&quot;)
            operated by A. LaMotte Music (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By accessing
            or using the Service, you agree to be bound by these Terms. If you do not agree,
            please do not use the Service.
          </p>
          <p className="leading-relaxed mt-3">
            We may update these Terms from time to time. If we make material changes, we will
            notify you by posting the updated Terms on this page and updating the &quot;Last updated&quot;
            date above. For material changes that affect your intellectual property rights or the
            arbitration provisions, we will provide at least 30 days&apos; advance notice. Your
            continued use of the Service after changes are posted constitutes acceptance of the
            revised Terms.
          </p>
        </section>

        {/* 1. Eligibility */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">1. Eligibility</h2>
          <p className="leading-relaxed">
            You must be at least 13 years of age to use the Service. By creating an
            account, you represent and warrant that you meet this age requirement and that
            all information you provide is accurate and complete. If you are under 18, you
            must have the consent of a parent or legal guardian. The Service is not directed
            to children under 13, and we do not knowingly collect personal information from
            children under 13. If we learn that we have collected personal information from a
            child under 13, we will take steps to delete such information promptly.
          </p>
        </section>

        {/* 2. Your Account */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">2. Your Account</h2>
          <p className="leading-relaxed">
            You are responsible for maintaining the confidentiality of your account
            credentials and for all activities that occur under your account. You agree to
            notify us immediately of any unauthorized use of your account. We reserve the
            right to suspend or terminate accounts that violate these Terms or are used
            for fraudulent purposes.
          </p>
          <p className="leading-relaxed mt-3">
            <strong>One Account Per User.</strong> Each individual is permitted to maintain
            only one free account on the Service. Creating multiple free accounts to
            circumvent credit limits or other restrictions is prohibited and may result in
            the suspension or termination of all associated accounts. We reserve the right
            to enforce this limitation through technical measures and to terminate accounts
            that we reasonably believe are not being used in good faith.
          </p>
        </section>

        {/* 3. Service Description */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">3. Service Description</h2>
          <p className="leading-relaxed">
            Create Christian Music is an AI-powered music generation platform that allows users
            to create original music by providing text descriptions, keywords, or custom
            lyrics. The Service includes, but is not limited to: audio generation, sheet music
            creation, guitar chord charts, lyrics generation, MP3-to-sheet-music conversion,
            album organization, song remixing, stem separation, song extension, audio format
            conversion, MIDI export, and collaborative album features. The quality and characteristics of generated content
            depend on the AI models used and the inputs you provide.
          </p>
          <p className="leading-relaxed mt-3">
            <strong>Storage and Retention.</strong> We may establish general practices and
            limits concerning use of the Service, including the maximum period of time that
            content will be retained by the Service and the maximum storage space that will
            be allotted on our servers on your behalf. We reserve the right to modify these
            general practices and limits from time to time with reasonable notice. We are not
            responsible or liable for the deletion or failure to store any content maintained
            or uploaded to the Service. We reserve the right to terminate accounts that have
            been inactive for an extended period of time, with prior notice sent to the email
            address associated with the account.
          </p>
        </section>

        {/* 4. Subscription Plans and Payments */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">4. Subscription Plans and Payments</h2>

          <h3 className="text-base font-medium text-foreground mt-4 mb-2">4.1 Plans and Credits</h3>
          <p className="leading-relaxed mb-4">
            The Service offers subscription tiers, each providing a monthly
            allowance of song and sheet music generations. Each generation counts as one
            use toward your monthly allowance. Unused monthly allowances do not
            roll over to the next billing period.
          </p>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-4 py-2.5 font-medium text-foreground">Plan</th>
                  <th className="text-left px-4 py-2.5 font-medium text-foreground">Price</th>
                  <th className="text-left px-4 py-2.5 font-medium text-foreground">Monthly Allowance</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="px-4 py-2.5 font-medium">Pro</td>
                  <td className="px-4 py-2.5 text-foreground/70">$19/mo ($182/yr)*</td>
                  <td className="px-4 py-2.5 text-foreground/70">200 songs or sheet music PDFs</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium">Premier</td>
                  <td className="px-4 py-2.5 text-foreground/70">$39/mo ($374/yr)*</td>
                  <td className="px-4 py-2.5 text-foreground/70">450 songs or sheet music PDFs</td>
                </tr>
              </tbody>
            </table>
            <p className="text-xs text-foreground/50 mt-2">*All prices include MN Hennepin County sales tax (8.53%).</p>
          </div>

          <h3 className="text-base font-medium text-foreground mt-4 mb-2">4.2 Billing and Cancellation</h3>
          <p className="leading-relaxed">
            Paid subscriptions are billed monthly or annually through Stripe. You may cancel your
            subscription at any time; cancellation takes effect at the end of the current
            billing period. No refunds are provided for partial months or unused portions of
            annual subscriptions, except as required by applicable law. We reserve the
            right to change pricing with 30 days&apos; advance notice.
          </p>

          <h3 className="text-base font-medium text-foreground mt-4 mb-2">4.3 Service Discontinuation</h3>
          <p className="leading-relaxed">
            In the event that we discontinue the Service entirely, we will provide at least
            30 days&apos; advance notice and will issue a pro-rata refund for any pre-paid
            subscription fees covering the period after the discontinuation date. This
            provision does not apply to temporary service interruptions, maintenance periods,
            or feature-level changes.
          </p>
        </section>

        {/* 5. Intellectual Property and Content Ownership */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">5. Intellectual Property and Content Ownership</h2>

          <h3 className="text-base font-medium text-foreground mt-4 mb-2">5.1 Your Generated Content &mdash; You Own It</h3>
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

          <h3 className="text-base font-medium text-foreground mt-4 mb-2">5.3 Voice Cloning Data</h3>
          <p className="leading-relaxed">
            If you use voice cloning or persona features, you represent and warrant that you
            have all necessary rights and consents to use the voice samples you provide. Voice
            persona data is processed solely to generate audio content on your behalf and is
            subject to the same ownership and privacy protections described in these Terms and
            our Privacy Policy.
          </p>

          <h3 className="text-base font-medium text-foreground mt-4 mb-2">5.4 Community-Shared Content</h3>
          <p className="leading-relaxed">
            If you choose to publish your generated content to the Discover page or other
            community features, you grant other users a limited, non-exclusive license to
            listen to and interact with your content within the Service. This does not
            transfer any ownership rights. You may unpublish your content at any time, which
            revokes this community license.
          </p>

          <h3 className="text-base font-medium text-foreground mt-4 mb-2">5.5 Our Platform</h3>
          <p className="leading-relaxed">
            The Service itself, including its design, source code, AI models, algorithms,
            branding, user interface, and all underlying technology, is owned by A. LaMotte
            Music and is protected by copyright, trademark, and other intellectual property
            laws. &copy; 2026 Albert LaMotte. All rights reserved. Nothing in these Terms
            grants you any right to use our trademarks, logos, or brand assets without prior
            written consent.
          </p>

          <h3 className="text-base font-medium text-foreground mt-4 mb-2">5.6 AI-Generated Content Disclaimer</h3>
          <p className="leading-relaxed">
            Content generated by AI may occasionally resemble existing works due to the
            nature of machine learning. We do not guarantee that generated content is free
            from similarities to copyrighted material, nor do we guarantee that AI-generated
            content is eligible for copyright protection under applicable law. You are solely
            responsible for ensuring that your use of generated content complies with applicable
            copyright laws. We recommend reviewing generated content before commercial release
            and consulting with a legal professional if you have concerns about potential
            infringement.
          </p>

          <h3 className="text-base font-medium text-foreground mt-4 mb-2">5.7 DMCA and Copyright Complaints</h3>
          <p className="leading-relaxed mb-3">
            We respect the intellectual property rights of others and expect our users to do
            the same. If you believe that content on the Service infringes your copyright,
            please submit a notification pursuant to the Digital Millennium Copyright Act
            (&quot;DMCA&quot;) by providing the following information to our designated agent:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80 mb-3">
            <li>A physical or electronic signature of the copyright owner or authorized agent</li>
            <li>Identification of the copyrighted work claimed to have been infringed</li>
            <li>Identification of the material that is claimed to be infringing, with sufficient detail to locate it</li>
            <li>Your contact information (address, telephone number, email)</li>
            <li>A statement that you have a good faith belief that the use is not authorized</li>
            <li>A statement, under penalty of perjury, that the information is accurate and you are authorized to act on behalf of the copyright owner</li>
          </ul>
          <p className="leading-relaxed">
            Send DMCA notices to:{" "}
            <a href="mailto:support@createchristianmusic.com" className="text-violet-400 hover:underline">
              support@createchristianmusic.com
            </a>
          </p>
          <p className="leading-relaxed mt-3">
            <strong>Repeat Infringer Policy.</strong> In accordance with the DMCA and other
            applicable law, we have adopted a policy of terminating, in appropriate circumstances
            and at our sole discretion, users who are deemed to be repeat infringers. We may also,
            at our sole discretion, limit access to the Service and/or terminate the accounts of
            any users who infringe any intellectual property rights of others, whether or not
            there is any repeat infringement.
          </p>
        </section>

        {/* 6. Acceptable Use */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">6. Acceptable Use</h2>
          <p className="leading-relaxed mb-3">
            You agree not to use the Service to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80">
            <li>Generate content that is illegal, harmful, threatening, abusive, defamatory, or otherwise objectionable</li>
            <li>Infringe upon the intellectual property rights of any third party</li>
            <li>Attempt to reverse-engineer, decompile, disassemble, or extract the AI models, algorithms, or underlying technology of the Service</li>
            <li>Use automated scripts, bots, or scrapers to access the Service</li>
            <li>Circumvent credit limits, subscription restrictions, or security measures</li>
            <li>Resell, redistribute, or sublicense access to the Service itself (your generated content is yours to sell)</li>
            <li>Impersonate any person or entity, or misrepresent your affiliation</li>
            <li>Upload content that you do not have the right to use or that violates third-party rights</li>
            <li>Use the Service to generate content that promotes hatred, violence, or discrimination</li>
            <li><strong>Use the Service, its output, or any data obtained from the Service to develop, train, fine-tune, or improve any competing AI music generation model or service</strong></li>
            <li><strong>Systematically download, scrape, or collect output from the Service for the purpose of creating datasets for machine learning or AI training</strong></li>
            <li>Use the Service in any manner that could damage, disable, overburden, or impair the Service or interfere with any other party&apos;s use of the Service</li>
          </ul>
          <p className="leading-relaxed mt-3">
            Violation of these rules may result in immediate suspension or termination of
            your account without refund.
          </p>
        </section>

        {/* 7. Communications and Marketing */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">7. Communications and Marketing</h2>
          <p className="leading-relaxed">
            By creating an account, you consent to receive transactional communications from
            us related to your account and the Service (e.g., account verification, billing
            confirmations, security alerts, and service updates). These transactional
            communications are necessary for the operation of the Service and cannot be opted
            out of while your account remains active.
          </p>
          <p className="leading-relaxed mt-3">
            We may also send you promotional communications about new features, special offers,
            or other information we think you may find interesting. You may opt out of
            promotional communications at any time by following the unsubscribe instructions
            included in each email or by contacting us at{" "}
            <a href="mailto:support@createchristianmusic.com" className="text-violet-400 hover:underline">
              support@createchristianmusic.com
            </a>. Opting out of promotional communications will not affect your receipt of
            transactional communications.
          </p>
        </section>

        {/* 8. Third-Party Services and Integrations */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">8. Third-Party Services and Integrations</h2>
          <p className="leading-relaxed">
            The Service may integrate with or contain links to third-party services, including
            but not limited to payment processors (Stripe), cloud storage providers (Amazon S3),
            authentication providers, and AI model providers. Your use of such third-party
            services is subject to their respective terms of service and privacy policies. We
            are not responsible for the practices or content of any third-party services.
          </p>
          <p className="leading-relaxed mt-3">
            If you authenticate using a third-party login provider (e.g., Google, Apple,
            Discord, Microsoft), we may receive certain profile information from that provider
            as described in our Privacy Policy. You authorize us to collect, store, and use
            this information in accordance with our Privacy Policy.
          </p>
        </section>

        {/* 9. Data and Privacy */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">9. Data and Privacy</h2>
          <p className="leading-relaxed">
            Your use of the Service is also governed by our{" "}
            <Link href="/privacy">
              <span className="text-violet-400 hover:underline cursor-pointer">Privacy Policy</span>
            </Link>
            , which describes how we collect, use, and protect your personal information.
            We are committed to safeguarding your data and will not sell your personal
            information to third parties. We do not use your generated content or uploaded
            content to train AI models without your explicit consent.
          </p>
        </section>

        {/* 10. Disclaimers */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">10. Disclaimers</h2>
          <p className="leading-relaxed uppercase text-xs tracking-wide">
            THE SERVICE IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT
            WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
            IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
            NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED,
            ERROR-FREE, OR SECURE. WE MAKE NO REPRESENTATIONS REGARDING THE QUALITY,
            ACCURACY, ORIGINALITY, OR SUITABILITY OF AI-GENERATED CONTENT FOR ANY PARTICULAR
            PURPOSE. THE AI MAY PRODUCE UNEXPECTED OR UNSATISFACTORY RESULTS, AND GENERATION
            TIMES MAY VARY. WE DO NOT GUARANTEE THAT AI-GENERATED CONTENT WILL BE ELIGIBLE
            FOR COPYRIGHT PROTECTION UNDER APPLICABLE LAW.
          </p>
        </section>

        {/* 11. Limitation of Liability */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">11. Limitation of Liability</h2>
          <p className="leading-relaxed uppercase text-xs tracking-wide">
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, A. LAMOTTE MUSIC AND ITS
            OWNER, ALBERT LAMOTTE, SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
            CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS,
            DATA, GOODWILL, OR REVENUE, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE
            SERVICE, ANY GENERATED CONTENT, OR ANY THIRD-PARTY CLAIMS RELATED TO YOUR USE OF
            GENERATED CONTENT. OUR TOTAL AGGREGATE LIABILITY FOR ANY CLAIM ARISING UNDER
            THESE TERMS SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID US IN THE
            TWELVE (12) MONTHS PRECEDING THE CLAIM OR (B) ONE HUNDRED DOLLARS ($100).
          </p>
        </section>

        {/* 12. Indemnification */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">12. Indemnification</h2>
          <p className="leading-relaxed">
            You agree to indemnify, defend, and hold harmless A. LaMotte Music, Albert
            LaMotte, and their officers, directors, employees, and agents from and against
            any claims, liabilities, damages, losses, and expenses (including reasonable
            legal fees) arising out of or in connection with: (a) your use of the Service;
            (b) your generated content and how you use, distribute, or monetize it;
            (c) your violation of these Terms; (d) your violation of any rights of a third
            party; (e) any content you upload to the Service; or (f) your use of voice
            cloning features without proper authorization or consent.
          </p>
        </section>

        {/* 13. Binding Arbitration and Class Action Waiver */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">13. Binding Arbitration and Class Action Waiver</h2>

          <h3 className="text-base font-medium text-foreground mt-4 mb-2">13.1 Agreement to Arbitrate</h3>
          <p className="leading-relaxed">
            <strong>You and A. LaMotte Music agree that any dispute, claim, or controversy
            arising out of or relating to these Terms or the Service (collectively,
            &quot;Disputes&quot;) will be resolved solely by binding, individual arbitration,
            rather than in court,</strong> except that either party may seek equitable relief
            in court for infringement or other misuse of intellectual property rights. This
            Arbitration Agreement shall apply, without limitation, to all Disputes that arose
            or were asserted before or after your consent to these Terms.
          </p>

          <h3 className="text-base font-medium text-foreground mt-4 mb-2">13.2 Arbitration Rules and Forum</h3>
          <p className="leading-relaxed">
            The Federal Arbitration Act governs the interpretation and enforcement of this
            Arbitration Agreement. Arbitration will be conducted by the American Arbitration
            Association (&quot;AAA&quot;) under its Consumer Arbitration Rules (the &quot;AAA Rules&quot;),
            as modified by this Arbitration Agreement. The AAA Rules are available at{" "}
            <a href="https://www.adr.org" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">
              www.adr.org
            </a>{" "}
            or by calling 1-800-778-7879. The arbitration will be conducted in the English
            language. A single arbitrator will be selected in accordance with the AAA Rules.
          </p>

          <h3 className="text-base font-medium text-foreground mt-4 mb-2">13.3 Class Action Waiver</h3>
          <p className="leading-relaxed font-semibold">
            YOU AND A. LAMOTTE MUSIC AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER
            ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY, AND NOT AS A PLAINTIFF OR CLASS MEMBER
            IN ANY PURPORTED CLASS, CONSOLIDATED, OR REPRESENTATIVE PROCEEDING. THE
            ARBITRATOR MAY NOT CONSOLIDATE MORE THAN ONE PERSON&apos;S CLAIMS AND MAY NOT
            OTHERWISE PRESIDE OVER ANY FORM OF A CLASS, CONSOLIDATED, OR REPRESENTATIVE
            PROCEEDING.
          </p>

          <h3 className="text-base font-medium text-foreground mt-4 mb-2">13.4 Opt-Out</h3>
          <p className="leading-relaxed">
            You may opt out of this Arbitration Agreement by sending written notice to{" "}
            <a href="mailto:support@createchristianmusic.com" className="text-violet-400 hover:underline">
              support@createchristianmusic.com
            </a>{" "}
            within 30 days of first accepting these Terms. Your notice must include your name,
            mailing address, and a clear statement that you wish to opt out of this Arbitration
            Agreement. If you opt out, you may pursue claims in court, but the remaining
            provisions of these Terms will continue to apply.
          </p>

          <h3 className="text-base font-medium text-foreground mt-4 mb-2">13.5 Small Claims Exception</h3>
          <p className="leading-relaxed">
            Notwithstanding the foregoing, either party may bring an individual action in
            small claims court for Disputes within the jurisdiction of such court.
          </p>
        </section>

        {/* 14. Termination */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">14. Termination</h2>
          <p className="leading-relaxed">
            We may terminate or suspend your access to the Service at any time, with or
            without cause, and with or without notice. Upon termination, your right to use
            the Service ceases immediately. However, your intellectual property rights in
            content you have already generated and downloaded survive termination
            indefinitely, as described in Section 5.1. We are not obligated to maintain
            or provide access to your stored content after account termination. We recommend
            downloading all generated content before canceling your account.
          </p>
          <p className="leading-relaxed mt-3">
            The following sections survive termination of these Terms: Sections 5 (Intellectual
            Property), 10 (Disclaimers), 11 (Limitation of Liability), 12 (Indemnification),
            13 (Arbitration), and 15 (Governing Law).
          </p>
        </section>

        {/* 15. Governing Law */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">15. Governing Law</h2>
          <p className="leading-relaxed">
            These Terms shall be governed by and construed in accordance with the laws of
            the State of Texas, United States, without regard to conflict of law principles.
            Subject to the arbitration provisions in Section 13, any legal proceedings that
            are not subject to arbitration shall be brought exclusively in the state or
            federal courts located in the State of Texas, and you consent to personal
            jurisdiction in such courts.
          </p>
        </section>

        {/* 16. Mobile Application Terms */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">16. Mobile Application Terms</h2>
          <p className="leading-relaxed">
            If you access the Service through a mobile application or progressive web app
            (&quot;App&quot;), the following additional terms apply: (a) these Terms are between you
            and A. LaMotte Music, not with any app store provider (e.g., Apple, Google);
            (b) the app store provider has no obligation to provide maintenance or support
            for the App; (c) in the event of any failure of the App to conform to any
            applicable warranty, you may notify the app store provider for a refund of the
            purchase price (if any) of the App, and the app store provider will have no other
            warranty obligation with respect to the App; (d) the app store provider is not
            responsible for addressing any claims relating to the App; and (e) the app store
            provider is a third-party beneficiary of these Terms with respect to the App.
          </p>
        </section>

        {/* 17. Changes to These Terms */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">17. Changes to These Terms</h2>
          <p className="leading-relaxed">
            We reserve the right to modify these Terms at any time. Material changes will
            be communicated by posting the updated Terms on this page and updating the
            &quot;Last updated&quot; date. Your continued use of the Service after changes are
            posted constitutes acceptance of the revised Terms. For material changes that
            affect your intellectual property rights or the arbitration provisions, we will
            provide at least 30 days&apos; advance notice.
          </p>
        </section>

        {/* 18. Severability */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">18. Severability</h2>
          <p className="leading-relaxed">
            If any provision of these Terms is held to be invalid or unenforceable, the
            remaining provisions shall continue in full force and effect. The invalid or
            unenforceable provision shall be modified to the minimum extent necessary to
            make it valid and enforceable while preserving its original intent.
          </p>
        </section>

        {/* 19. Entire Agreement */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">19. Entire Agreement</h2>
          <p className="leading-relaxed">
            These Terms, together with our Privacy Policy, constitute the entire agreement
            between you and A. LaMotte Music regarding the Service and supersede all prior
            agreements, understandings, and communications, whether written or oral. No waiver
            of any provision of these Terms shall be deemed a further or continuing waiver of
            such provision or any other provision.
          </p>
        </section>

        {/* 20. Contact Us */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">20. Contact Us</h2>
          <p className="leading-relaxed">
            If you have any questions about these Terms of Service, your intellectual
            property rights, or any other aspect of the Service, please contact us at:
          </p>
          <div className="mt-3 p-4 rounded-lg bg-muted/50 border">
            <p className="font-medium text-foreground">A. LaMotte Music</p>
            <p className="text-foreground/70 mt-1">
              General inquiries:{" "}
              <a href="mailto:support@createchristianmusic.com" className="text-violet-400 hover:underline">
                support@createchristianmusic.com
              </a>
            </p>
            <p className="text-foreground/70 mt-1">
              Legal / Arbitration opt-out:{" "}
              <a href="mailto:support@createchristianmusic.com" className="text-violet-400 hover:underline">
                support@createchristianmusic.com
              </a>
            </p>
            <p className="text-foreground/70 mt-1">
              DMCA notices:{" "}
              <a href="mailto:support@createchristianmusic.com" className="text-violet-400 hover:underline">
                support@createchristianmusic.com
              </a>
            </p>
            <p className="text-foreground/70 mt-1">
              Website:{" "}
              <a href="https://makecustommusic.com" className="text-violet-400 hover:underline">
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
              <span className="text-violet-400 hover:underline cursor-pointer">Privacy Policy</span>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
