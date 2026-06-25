export type Locale = "en" | "es" | "fr" | "zh" | "ko" | "pt" | "ja";
export type Messages = Record<string, string>;

export const LOCALES: Locale[] = ["en", "es", "fr", "zh", "ko", "pt", "ja"];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Replace {key} placeholders in a message string. */
export function interpolate(
  msg: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return msg;
  return msg.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

/** Validate and normalise a locale string. Falls back to DEFAULT_LOCALE. */
export function normaliseLocale(raw: string | null | undefined): Locale {
  if (raw && (LOCALES as string[]).includes(raw)) return raw as Locale;
  return DEFAULT_LOCALE;
}

/**
 * Lazy loaders — each import() is a separate webpack chunk so the client
 * only downloads the requested locale's JSON.
 */
export const messageLoaders: Record<Locale, () => Promise<Messages>> = {
  en: () => import("@/messages/en.json").then((m) => m.default as Messages),
  es: () => import("@/messages/es.json").then((m) => m.default as Messages),
  fr: () => import("@/messages/fr.json").then((m) => m.default as Messages),
  zh: () => import("@/messages/zh.json").then((m) => m.default as Messages),
  ko: () => import("@/messages/ko.json").then((m) => m.default as Messages),
  pt: () => import("@/messages/pt.json").then((m) => m.default as Messages),
  ja: () => import("@/messages/ja.json").then((m) => m.default as Messages),
};
