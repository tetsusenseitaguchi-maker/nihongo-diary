"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, Button } from "@/components/ui";
import { useT, useLocale } from "@/contexts/locale";

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
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
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
        className="w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-ink outline-none focus:border-moss"
      />
    </label>
  );
}
