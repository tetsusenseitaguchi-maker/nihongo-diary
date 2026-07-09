"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, Button } from "@/components/ui";
import { useT } from "@/contexts/locale";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/dashboard";
  const t = useT();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push(redirect);
    router.refresh();
  }

  return (
    <Card className="p-7">
      <h1 className="font-serif text-2xl font-bold text-pine">{t("login.title")}</h1>
      <p className="mt-1 text-sm text-muted">{t("login.subtitle")}</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Field label={t("login.email")} type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
        <Field label={t("login.password")} type="password" value={password} onChange={setPassword} placeholder="••••••••" />

        <p className="-mt-2 text-right text-sm">
          <Link href="/forgot-password" className="font-semibold text-moss-600 hover:text-pine">
            {t("login.forgotPasswordLink")}
          </Link>
        </p>

        {error && <p className="rounded-lg bg-apricot/10 px-3 py-2 text-sm text-apricot">{error}</p>}

        <Button type="submit" size="lg" disabled={loading} className="w-full">
          {loading ? t("login.submitting") : t("login.submit")}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        {t("login.noAccount")}{" "}
        <Link href="/signup" className="font-semibold text-moss-600 hover:text-pine">
          {t("login.signupLink")}
        </Link>
      </p>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Card className="p-7 text-center text-muted">Loading…</Card>}>
      <LoginForm />
    </Suspense>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  type: string;
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
