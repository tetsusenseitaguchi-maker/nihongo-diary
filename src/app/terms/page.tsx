import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Nihongo Diary",
};

export default function TermsPage() {
  return (
    <div className="min-h-dvh bg-cream px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-semibold text-moss-600 hover:text-pine">
          ← Back to Nihongo Diary
        </Link>

        <h1 className="mt-6 font-serif text-3xl font-bold text-pine">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted">Last updated: July 2, 2026</p>
        <p className="mt-2 text-sm text-muted">
          Nihongo Diary is operated by Tetta Taguchi, a sole proprietor (individual business)
          based in Sapporo, Japan.
        </p>

        <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-ink/80">
          <section>
            <h2 className="font-serif text-xl font-bold text-pine">1. Acceptance of Terms</h2>
            <p className="mt-3">
              By creating an account or using Nihongo Diary (&quot;the App&quot;), you agree to
              these Terms of Service. If you do not agree, please do not use the App.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-pine">2. About the Service</h2>
            <p className="mt-3">
              The App lets you write diary entries in Japanese, receive AI-generated
              corrections, track your writing streak, and optionally share entries with a
              social feed of people you follow.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-pine">3. Your Account</h2>
            <p className="mt-3">
              You must provide a valid email address to register. You are responsible for
              maintaining the confidentiality of your login credentials and for all activity
              under your account.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-pine">4. Your Content</h2>
            <p className="mt-3">
              You retain ownership of the diary entries, photos, and audio you create. By
              making a diary entry public, you grant other users permission to view it within
              the App, including on your profile and in your followers&apos; feed. Private
              diaries are never shown to other users.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-pine">5. AI-Generated Corrections</h2>
            <p className="mt-3">
              Corrections, explanations, and suggestions are generated automatically using AI
              (via OpenAI&apos;s API) and may occasionally contain errors or inaccuracies. They
              are provided for language-learning purposes only and are not a substitute for
              professional instruction or certification.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-pine">6. Subscriptions &amp; Payments</h2>
            <p className="mt-3">
              Some features require a paid subscription, billed and processed through Stripe.
              Subscriptions renew automatically until cancelled. You can manage or cancel your
              subscription at any time from the Profile page.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-pine">7. Account Deletion</h2>
            <p className="mt-3">
              You may permanently delete your account and all associated data at any time from
              the Profile page. This action is immediate and irreversible. If you have an
              active subscription, you&apos;ll need to cancel it first.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-pine">8. Prohibited Conduct</h2>
            <p className="mt-3">
              You agree not to use the App to harass others, post spam or unlawful content, or
              attempt to disrupt or reverse-engineer the service.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-pine">9. Termination</h2>
            <p className="mt-3">
              We may suspend or terminate accounts that violate these Terms.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-pine">10. Disclaimer &amp; Limitation of Liability</h2>
            <p className="mt-3">
              The App is provided &quot;as is&quot; without warranties of any kind. To the
              fullest extent permitted by law, we are not liable for any indirect, incidental,
              or consequential damages arising from your use of the App.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-pine">11. Governing Law</h2>
            <p className="mt-3">These Terms are governed by the laws of Japan.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-pine">12. Changes to These Terms</h2>
            <p className="mt-3">
              We may update these Terms from time to time. Continued use of the App after
              changes constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-pine">13. Contact</h2>
            <p className="mt-3">
              Questions about these Terms? Email us at{" "}
              <a href="mailto:tetsusenseitaguchi@gmail.com" className="font-semibold text-moss-600 hover:text-pine">
                tetsusenseitaguchi@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
