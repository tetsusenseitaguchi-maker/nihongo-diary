import { cookies } from "next/headers";

const TZ_COOKIE = "user_tz";

// Read the user's IANA timezone from the request cookie.
// Falls back to "UTC" when the cookie is missing or contains an invalid timezone.
export async function getTimezoneFromCookie(): Promise<string> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(TZ_COOKIE)?.value;
  if (!raw) return "UTC";
  return validateTZ(decodeURIComponent(raw));
}

export function validateTZ(tz: string): string {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}
