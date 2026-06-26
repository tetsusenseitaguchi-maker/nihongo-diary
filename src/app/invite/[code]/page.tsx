import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n-server";
import { InviteCapture } from "@/components/InviteCapture";
import { ApplyInviteButton } from "@/components/ApplyInviteButton";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ code: string }>;
}

export default async function InvitePage({ params }: Props) {
  const { code } = await params;
  const [supabase, t] = [await createClient(), await getServerT()];

  const { data: inviter } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url")
    .eq("invite_code", code)
    .single();

  if (!inviter) notFound();

  const inviterName = inviter.display_name || inviter.username || "Someone";

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4 py-12">
      <div className="w-full max-w-sm space-y-8 rounded-3xl bg-paper p-8 shadow-lift">

        {/* Logo */}
        <div className="text-center">
          <p className="font-serif text-2xl font-bold text-pine">🌸 Nihongo Diary</p>
          <p className="mt-0.5 text-xs text-muted">{t("invite.tagline")}</p>
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
          <p className="text-sm text-muted">{t("invite.inviteHeading", { name: inviterName })}</p>
        </div>

        {/* Feature highlights */}
        <div className="rounded-2xl bg-mint/30 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-pine">
            {t("invite.whatIsTitle")}
          </p>
          <ul className="space-y-1 text-sm text-ink/80">
            <li>{t("invite.feature1")}</li>
            <li>{t("invite.feature2")}</li>
            <li>{t("invite.feature3")}</li>
            <li>{t("invite.feature4")}</li>
          </ul>
        </div>

        {/* CTA */}
        {user ? (
          <div className="space-y-3">
            <p className="text-center text-sm text-muted">
              {t("invite.loggedInPrompt", { name: inviterName })}
            </p>
            <ApplyInviteButton code={code} inviterName={inviterName} />
          </div>
        ) : (
          <div className="space-y-3">
            <InviteCapture code={code} />
            <a
              href="/signup"
              className="flex w-full items-center justify-center rounded-2xl bg-pine px-6 py-3.5 text-base font-bold text-cream shadow-lift transition-opacity hover:opacity-90"
            >
              {t("invite.signupCta")}
            </a>
            <a
              href="/login"
              className="flex w-full items-center justify-center rounded-2xl border border-line bg-paper px-6 py-3 text-sm font-semibold text-pine hover:bg-mint/40"
            >
              {t("invite.loginCta")}
            </a>
            <p className="text-center text-xs text-muted">
              {t("invite.mutualFollowNote", { name: inviterName })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
