import { cookies } from "next/headers";
import { normaliseLocale } from "@/lib/i18n";
import { getServerT } from "@/lib/i18n-server";

export default async function OfflinePage() {
  const cookieStore = await cookies();
  const locale = normaliseLocale(cookieStore.get("NEXT_LOCALE")?.value);
  const t = await getServerT(locale);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-cream px-6 text-center">
      <div className="text-5xl">📵</div>
      <h1 className="font-serif text-2xl font-bold text-pine">
        {t("offline.title")}
      </h1>
      <p className="max-w-xs text-sm text-muted">
        {t("offline.body")}
      </p>
      <a
        href="/dashboard"
        className="mt-2 rounded-xl bg-pine px-5 py-2.5 text-sm font-semibold text-white hover:bg-pine-700"
      >
        {t("offline.tryAgain")}
      </a>
    </div>
  );
}
