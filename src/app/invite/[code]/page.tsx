import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InviteCapture } from "@/components/InviteCapture";
import { ApplyInviteButton } from "@/components/ApplyInviteButton";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ code: string }>;
}

export default async function InvitePage({ params }: Props) {
  const { code } = await params;
  const supabase = await createClient();

  // Look up inviter by code (no auth required — profiles are public)
  const { data: inviter } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url")
    .eq("invite_code", code)
    .single();

  if (!inviter) notFound();

  const inviterName = inviter.display_name || inviter.username || "Someone";

  // Check if the visitor is already logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4 py-12">
      {/* Card */}
      <div className="w-full max-w-sm space-y-8 rounded-3xl bg-paper p-8 shadow-lift">

        {/* Logo */}
        <div className="text-center">
          <p className="font-serif text-2xl font-bold text-pine">🌸 Nihongo Diary</p>
          <p className="mt-0.5 text-xs text-muted">AIで添削・毎日の日本語日記</p>
        </div>

        {/* Inviter */}
        <div className="flex flex-col items-center gap-3 text-center">
          {inviter.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={inviter.avatar_url}
              alt={inviterName}
              className="h-20 w-20 rounded-full object-cover ring-4 ring-mint ring-offset-2"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-pine ring-4 ring-mint ring-offset-2">
              <span className="font-serif text-3xl font-bold text-cream">
                {inviterName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <p className="font-serif text-xl font-bold text-pine">{inviterName}さん</p>
            <p className="mt-0.5 text-sm text-muted">から友達招待が届いています 🎉</p>
          </div>
        </div>

        {/* Features */}
        <div className="rounded-2xl bg-mint/30 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-pine">Nihongo Diary とは</p>
          <ul className="space-y-1 text-sm text-ink/80">
            <li>✍️ 毎日の日記を日本語で書く</li>
            <li>🤖 AI が自然な日本語に添削</li>
            <li>👥 友達と一緒に学習を続ける</li>
            <li>📍 訪れた場所を地図に記録</li>
          </ul>
        </div>

        {/* CTA — branch on auth state */}
        {user ? (
          // Already logged in — apply the invite directly
          <div className="space-y-3">
            <p className="text-center text-sm text-muted">
              ログイン済みです。{inviterName}さんと繋がりますか？
            </p>
            <ApplyInviteButton code={code} inviterName={inviterName} />
          </div>
        ) : (
          // Not logged in — save code to localStorage, then send to signup/login
          <div className="space-y-3">
            <InviteCapture code={code} />
            <a
              href={`/signup`}
              className="flex w-full items-center justify-center rounded-2xl bg-pine px-6 py-3.5 text-base font-bold text-cream shadow-lift transition-opacity hover:opacity-90"
            >
              サインアップして繋がる →
            </a>
            <a
              href={`/login`}
              className="flex w-full items-center justify-center rounded-2xl border border-line bg-paper px-6 py-3 text-sm font-semibold text-pine hover:bg-mint/40"
            >
              ログインして繋がる
            </a>
            <p className="text-center text-xs text-muted">
              登録後、{inviterName}さんと自動的に相互フォローになります
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
