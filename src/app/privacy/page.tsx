import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Nihongo Diary",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-cream px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-semibold text-moss-600 hover:text-pine">
          ← Back to Nihongo Diary
        </Link>

        <h1 className="mt-6 font-serif text-3xl font-bold text-pine">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted">Last updated: July 2, 2026</p>
        <p className="mt-2 text-sm text-muted">
          Nihongo Diary is operated by Tetta Taguchi, a sole proprietor (individual business)
          based in Sapporo, Japan.
        </p>

        <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-ink/80">
          <section>
            <h2 className="font-serif text-xl font-bold text-pine">1. Information We Collect</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li><strong className="text-ink">Email address</strong> — used for account authentication.</li>
              <li><strong className="text-ink">Diary content</strong> — the text, photos, and audio recordings you create and attach to your entries.</li>
              <li><strong className="text-ink">Location data (optional)</strong> — if you use the Map feature to attach a place to a diary entry, we collect the location you choose (by search, map tap, or your device&apos;s GPS). If you never use the Map feature, no location data is collected.</li>
              <li><strong className="text-ink">Push notification token</strong> — if you enable push notifications, we store a device token used to send you reminders.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-pine">2. How We Use Your Information</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>To provide the core diary-writing and AI correction service.</li>
              <li>Diary text you submit for correction is sent to OpenAI&apos;s API to generate corrections, explanations, and practice suggestions.</li>
              <li>To send optional push notification reminders.</li>
              <li>To process subscription payments (see Payments below).</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-pine">3. Third-Party Service Providers</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li><strong className="text-ink">Supabase</strong> — authentication, database, and file storage for diary photos, audio, and avatars.</li>
              <li><strong className="text-ink">OpenAI</strong> — processes diary text to generate AI corrections.</li>
              <li><strong className="text-ink">Stripe</strong> — processes subscription payments.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-pine">4. Payments</h2>
            <p className="mt-3">
              If you subscribe to a paid plan, payment is processed by Stripe. We do not store
              your card number or other payment card details on our servers — Stripe handles
              and stores that information directly, according to its own privacy policy.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-pine">5. Data Retention &amp; Account Deletion</h2>
            <p className="mt-3">
              You can permanently delete your account and all associated data at any time from{" "}
              <strong className="text-ink">Profile → Danger Zone → Delete Account</strong> in the
              app. Deleting your account removes your diary entries, photos, audio, vocabulary
              list, writing streak/history, followers and following relationships, comments,
              peer corrections, and notifications. This action is immediate and irreversible.
              If you have an active paid subscription, you&apos;ll need to cancel it first.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-pine">6. Your Choices</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Location, photos, audio attachments, and push notifications are all optional — the app is fully usable without enabling any of them.</li>
              <li>You control whether each diary entry is public or private, and can change this at any time.</li>
              <li>You can edit or delete individual diary entries at any time from within the app.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-pine">7. Children&apos;s Privacy</h2>
            <p className="mt-3">
              Nihongo Diary is not directed at children under 13, and we do not knowingly
              collect personal information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-pine">8. Changes to This Policy</h2>
            <p className="mt-3">
              We may update this policy from time to time. Material changes will be reflected
              by updating the &quot;Last updated&quot; date above.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-pine">9. Contact</h2>
            <p className="mt-3">
              Questions about this policy or your data? Email us at{" "}
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
