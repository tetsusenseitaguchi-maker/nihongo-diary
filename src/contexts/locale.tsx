"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  type Locale,
  type Messages,
  messageLoaders,
  normaliseLocale,
  interpolate,
  LOCALE_COOKIE,
} from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

interface LocaleContextValue {
  locale: Locale;
  /** Translate a key, optionally interpolating {placeholder} variables. */
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** Switch the active locale, updating cookie + Supabase profile. */
  setLocale: (locale: Locale) => Promise<void>;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "en",
  t: (key) => key,
  setLocale: async () => {},
});

export function LocaleProvider({
  initialLocale,
  initialMessages,
  children,
}: {
  initialLocale: Locale;
  initialMessages: Messages;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(
    normaliseLocale(initialLocale),
  );
  const [messages, setMessages] = useState<Messages>(initialMessages);

  const setLocale = useCallback(async (newLocale: Locale) => {
    // 1. Lazy-load the new locale's JSON (separate webpack chunk per locale)
    const newMessages = await messageLoaders[newLocale]();
    setMessages(newMessages);
    setLocaleState(newLocale);

    // 2. Persist to cookie so the server renders the correct locale on next load
    document.cookie = `${LOCALE_COOKIE}=${newLocale};path=/;max-age=31536000;SameSite=Lax`;

    // 3. Persist to Supabase so the preference survives across devices / browsers
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ preferred_language: newLocale })
        .eq("id", user.id);
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const msg = (messages as Record<string, string>)[key] ?? key;
      return interpolate(msg, vars);
    },
    [messages],
  );

  return (
    <LocaleContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}

/** Shorthand — returns just the t() translator. */
export function useT(): LocaleContextValue["t"] {
  return useContext(LocaleContext).t;
}
