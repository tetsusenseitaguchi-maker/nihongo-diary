import { cookies } from "next/headers";
import { normaliseLocale } from "@/lib/i18n";
import { getInitialMessages } from "@/lib/i18n-server";
import { LocaleProvider } from "@/contexts/locale";

/**
 * Provides LocaleProvider for the /invite/* pages.
 * These pages live outside the (app) group, so they need their own provider.
 */
export default async function InviteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const locale = normaliseLocale(cookieStore.get("NEXT_LOCALE")?.value);
  const initialMessages = await getInitialMessages(locale);

  return (
    <LocaleProvider initialLocale={locale} initialMessages={initialMessages}>
      {children}
    </LocaleProvider>
  );
}
