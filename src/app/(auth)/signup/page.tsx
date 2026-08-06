"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, Button } from "@/components/ui";
import { useT, useLocale } from "@/contexts/locale";
import { authErrorMessage } from "@/lib/auth-errors";

export default function SignupPage() {
  const router = useRouter();
  const t = useT();
  const { locale } = useLocale();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName, username },
        /**
         * ⚠️ Only read when the email template builds its link from
         * {{ .ConfirmationURL }}. The template this ships alongside does not:
         * it points straight at /auth/confirm with {{ .TokenHash }}, so this
         * value is unused and the route never sees a PKCE `code` at all.
         *
         * Which means the two have to move in one order. Template first, then
         * this. The other way round, a signup made in the gap gets a
         * ConfirmationURL that redirects here carrying `code`, /auth/confirm
         * wants `token_hash`, and the learner lands on the failure page — a
         * worse outcome than the bug being fixed.
         *
         * Kept pointing here rather than left on /auth/callback so that a
         * revert of the template alone cannot quietly restore the Safari
         * failure: whichever of the two is live, the destination is the route
         * that does not need a browser-bound verifier.
         */
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });

    if (error) {
      // This is the line the German review was looking at. A 5xx from Supabase
      // Auth — "Error sending confirmation email" being the common one here —
      // arrives with error.message set to the string "{}". See lib/auth-errors.ts.
      setError(authErrorMessage(error, t));
      setLoading(false);
      return;
    }

    // If email confirmation is OFF, a session exists immediately.
    if (data.session) {
      // Sync the pre-login language choice to the user's profile so it
      // persists across devices (cookie already set by LocaleProvider).
      if (locale !== "en") {
        await supabase
          .from("profiles")
          .update({ preferred_language: locale })
          .eq("id", data.session.user.id);
      }
      router.push("/profile-setup");
      router.refresh();
      return;
    }

    // Email confirmation ON — ask the user to verify, then log in.
    setNotice(t("signup.confirmEmail"));
    setLoading(false);
  }

  return (
    <Card className="p-7">
      <h1 className="font-serif text-2xl font-bold text-pine">{t("signup.title")}</h1>
      <p className="mt-1 text-sm text-muted">{t("signup.subtitle")}</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Field label={t("signup.displayName")} value={displayName} onChange={setDisplayName} placeholder="Yuki Sato" />
        <Field label={t("signup.username")} value={username} onChange={setUsername} placeholder="yuki" />
        <Field label={t("signup.email")} type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
        <Field label={t("signup.password")} type="password" value={password} onChange={setPassword} placeholder={t("signup.passwordPlaceholder")} />

        {error && <p className="rounded-lg bg-apricot/10 px-3 py-2 text-sm text-apricot">{error}</p>}
        {notice && <p className="rounded-lg bg-mint px-3 py-2 text-sm text-pine">{notice}</p>}

        <Button type="submit" size="lg" disabled={loading} className="w-full">
          {loading ? t("signup.submitting") : t("signup.submit")}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        {t("signup.hasAccount")}{" "}
        <Link href="/login" className="font-semibold text-moss-600 hover:text-pine">
          {t("signup.loginLink")}
        </Link>
      </p>
    </Card>
  );
}

function Field({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-ink outline-none focus:border-moss text-base"
      />
    </label>
  );
}
