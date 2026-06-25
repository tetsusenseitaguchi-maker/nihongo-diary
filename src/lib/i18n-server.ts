import { cookies } from "next/headers";
import { normaliseLocale, interpolate, type Locale, type Messages } from "./i18n";

// Static imports — all locales are bundled into the server chunk.
// Server bundle size is not a concern; per-locale lazy loading is for the client only.
import en from "@/messages/en.json";
import es from "@/messages/es.json";
import fr from "@/messages/fr.json";
import zh from "@/messages/zh.json";
import ko from "@/messages/ko.json";
import pt from "@/messages/pt.json";
import ja from "@/messages/ja.json";

const ALL_MESSAGES: Record<Locale, Messages> = { en, es, fr, zh, ko, pt, ja } as Record<
  Locale,
  Messages
>;

/** Read the locale from the NEXT_LOCALE cookie. */
export async function getLocaleFromCookie(): Promise<Locale> {
  const cookieStore = await cookies();
  return normaliseLocale(cookieStore.get("NEXT_LOCALE")?.value);
}

/**
 * Returns a server-side t() function for the given locale.
 * Call `await getServerT()` in a Server Component to get the translator.
 *
 * Usage:
 *   const t = await getServerT();
 *   <h2>{t("dashboard.todayDiary")}</h2>
 */
export async function getServerT(
  localeOverride?: Locale,
): Promise<(key: string, vars?: Record<string, string | number>) => string> {
  const locale = localeOverride ?? (await getLocaleFromCookie());
  const messages = ALL_MESSAGES[locale] ?? ALL_MESSAGES.en;
  return (key: string, vars?: Record<string, string | number>) => {
    const msg = (messages as Record<string, string>)[key] ?? key;
    return interpolate(msg, vars);
  };
}

/** Pre-load messages for passing to LocaleProvider as initialMessages. */
export async function getInitialMessages(locale: Locale): Promise<Messages> {
  return (ALL_MESSAGES[locale] ?? ALL_MESSAGES.en) as Messages;
}
