export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English",    display: "English" },
  { code: "es", label: "Español",    display: "Spanish" },
  { code: "fr", label: "Français",   display: "French" },
  { code: "zh", label: "中文",        display: "Chinese (Simplified)" },
  { code: "ko", label: "한국어",      display: "Korean" },
  { code: "ja", label: "日本語",      display: "Japanese" },
  { code: "de", label: "Deutsch",    display: "German" },
  { code: "it", label: "Italiano",   display: "Italian" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

/** Human-readable name used in the OpenAI translation prompt. */
export function languageDisplayName(code: string): string {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.display ?? "English";
}
