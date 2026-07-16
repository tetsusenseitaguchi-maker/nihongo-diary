// To revert to the original layout, swap LandingPageNew → LandingOriginal below.
import { LandingPageNew } from "@/components/LandingPageNew";
// import { LandingOriginal } from "@/components/LandingOriginal";
import { NativeHomeRedirect } from "@/components/NativeHomeRedirect";
import { getServerT, getLocaleFromCookie } from "@/lib/i18n-server";
import { isNativeRequest } from "@/lib/native";

export default async function LandingPage() {
  const locale = await getLocaleFromCookie();
  const [t, isNative] = await Promise.all([getServerT(locale), isNativeRequest()]);
  return (
    <>
      <NativeHomeRedirect />
      <LandingPageNew t={t} locale={locale} isNative={isNative} />
    </>
  );
}
