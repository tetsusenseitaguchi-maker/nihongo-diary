import { Logo } from "@/components/Logo";
import { LocaleProvider } from "@/contexts/locale";
import { getLocaleFromCookie, getInitialMessages } from "@/lib/i18n-server";
import { PublicLangSwitcher } from "@/components/PublicLangSwitcher";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocaleFromCookie();
  const messages = await getInitialMessages(locale);

  return (
    <LocaleProvider initialLocale={locale} initialMessages={messages}>
      <div className="relative grid min-h-screen place-items-center bg-cream px-4 py-10">
        <div className="genkou pointer-events-none absolute inset-0 opacity-40" aria-hidden />
        <div className="relative w-full max-w-md">
          <div className="mb-6 flex items-center justify-between">
            <Logo />
            <PublicLangSwitcher currentLocale={locale} />
          </div>
          {children}
        </div>
      </div>
    </LocaleProvider>
  );
}
