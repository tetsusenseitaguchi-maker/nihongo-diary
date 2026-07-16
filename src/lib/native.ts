import { headers } from "next/headers";

/**
 * UA marker appended by the Capacitor iOS shell via `appendUserAgent` in
 * capacitor.config.ts. Also matched in middleware.ts's "/" redirect.
 *
 * Kept in sync with those two files by hand: middleware runs on the edge
 * runtime and can't import this module (it pulls in `next/headers`), and
 * capacitor.config.ts is build-time config — so the literal is duplicated
 * on purpose. If you change it, change all three.
 */
export const NATIVE_UA_MARKER = "NihongoDiaryNativeApp";

/**
 * Server-side native-app detection for Server Components. Reads the request
 * User-Agent (the Capacitor iOS WebView appends NATIVE_UA_MARKER).
 *
 * Use this to skip rendering paid-price / external-payment UI so it is never
 * sent to the native app at all (App Store Guideline 3.1.2) — a server-side
 * guarantee, unlike the client-only <NativeGate/> which still ships the markup
 * and only hides it after hydration. Reading headers() opts the caller into
 * dynamic rendering (the pages using this are already dynamic).
 */
export async function isNativeRequest(): Promise<boolean> {
  const ua = (await headers()).get("user-agent") ?? "";
  return ua.includes(NATIVE_UA_MARKER);
}
