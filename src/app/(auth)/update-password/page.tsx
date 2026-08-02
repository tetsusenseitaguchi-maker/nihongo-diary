"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, Button } from "@/components/ui";
import { useT } from "@/contexts/locale";
import { authErrorMessage } from "@/lib/auth-errors";

function UpdatePasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const t = useT();

  /**
   * Set when /auth/callback could not exchange the emailed code and sent them
   * here rather than to /login.
   *
   * It replaces the generic "invalid or expired" line below with one that says
   * what actually tends to be wrong — the link was opened in a different
   * browser from the one that asked for it, which on iOS is the normal case
   * (request in the Capacitor WebView, tap in Safari).
   */
  const linkError = params.get("authError") === "recovery_link";

  // Not gated via middleware's PROTECTED list (deliberate — see project notes):
  // the recovery session only exists after auth/callback exchanges the emailed
  // code, so we check for it here instead and show an explanatory message
  // rather than silently redirecting if it's missing or expired.
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setHasSession(!!user);
      setChecking(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t("updatePassword.mismatch"));
      return;
    }
    if (password.length < 6) {
      setError(t("updatePassword.tooShort"));
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(authErrorMessage(error, t));
      setLoading(false);
      return;
    }
    router.push("/dashboard");
  }

  if (checking) {
    return <Card className="p-7 text-center text-muted">{t("updatePassword.checking")}</Card>;
  }

  if (!hasSession) {
    return (
      <Card className="p-7 text-center">
        <p className="text-sm text-apricot">
          {linkError ? t("authError.recovery_link") : t("updatePassword.invalidLink")}
        </p>
        <Link
          href="/forgot-password"
          className="mt-4 inline-block font-semibold text-moss-600 hover:text-pine"
        >
          {t("updatePassword.requestNewLink")}
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-7">
      <h1 className="font-serif text-2xl font-bold text-pine">{t("updatePassword.title")}</h1>
      <p className="mt-1 text-sm text-muted">{t("updatePassword.subtitle")}</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Field
          label={t("updatePassword.newPassword")}
          value={password}
          onChange={setPassword}
          placeholder={t("updatePassword.passwordPlaceholder")}
        />
        <Field
          label={t("updatePassword.confirmPassword")}
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder={t("updatePassword.passwordPlaceholder")}
        />

        {error && <p className="rounded-lg bg-apricot/10 px-3 py-2 text-sm text-apricot">{error}</p>}

        <Button type="submit" size="lg" disabled={loading} className="w-full">
          {loading ? t("updatePassword.submitting") : t("updatePassword.submit")}
        </Button>
      </form>
    </Card>
  );
}

/**
 * useSearchParams needs a Suspense boundary to prerender, the same shape
 * /login already uses. Without it the build fails rather than degrading.
 */
export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={<Card className="p-7 text-center text-muted">Loading…</Card>}>
      <UpdatePasswordForm />
    </Suspense>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-ink outline-none focus:border-moss"
      />
    </label>
  );
}
