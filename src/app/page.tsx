// To revert to the original layout, swap LandingPageNew → LandingOriginal below.
import { LandingPageNew } from "@/components/LandingPageNew";
// import { LandingOriginal } from "@/components/LandingOriginal";
import { getServerT, getLocaleFromCookie } from "@/lib/i18n-server";

export default async function LandingPage() {
  const locale = await getLocaleFromCookie();
  const t = await getServerT(locale);
  return <LandingPageNew t={t} locale={locale} />;
}
