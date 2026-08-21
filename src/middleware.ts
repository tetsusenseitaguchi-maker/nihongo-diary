import { createServerClient } from "@supabase/ssr";
import { NextResponse, after, type NextRequest } from "next/server";
import { todayInTZ } from "@/lib/date-tz";
import { validateTZ } from "@/lib/tz-server";

/** Marks "this account's /write visit is already recorded for this day". */
const FUNNEL_COOKIE = "nd_funnel";

const PROTECTED = [
  "/dashboard",
  "/write",
  "/history",
  "/calendar",
  "/support",
  "/feed",
  "/profile",
  "/profile-setup",
  "/welcome-plans",
  "/diary",
  "/how-to-use",
  "/places",
];

const AUTH_PAGES = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: keep this — it refreshes the auth token.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Native app requests never see the marketing landing page — redirect
  // server-side before it's ever rendered, instead of relying solely on
  // NativeHomeRedirect.tsx's client-side redirect (which can't fire until
  // after the page has already been sent and painted once).
  if (path === "/" && (request.headers.get("user-agent") ?? "").includes("NihongoDiaryNativeApp")) {
    const url = request.nextUrl.clone();
    url.pathname = user ? "/dashboard" : "/login";
    return NextResponse.redirect(url);
  }

  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(p + "/"));
  const isAuthPage = AUTH_PAGES.some((p) => path === p);

  // Not logged in + protected route → /login
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  // Logged in + on login/signup → /dashboard
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  recordWriteOpened(request, response, supabase, user?.id);

  return response;
}

/* ── funnel: did this account ever reach the writing screen? ───────────────
 *
 * 435 people have signed in and never written a diary, and nothing in the
 * database says whether they got as far as /write. This is the one row that
 * answers it. See supabase/funnel-events.sql for the table.
 *
 * Here rather than in the page for three reasons:
 *   1. /write is a Client Component and /upgrade (stage two) is a Server
 *      Component. Middleware instruments both the same way.
 *   2. getUser() has already run above, so the account id costs nothing extra.
 *   3. ⚠️ A component would be mounted twice on some layouts and would fire
 *      twice. NotificationBell already is: layout.tsx renders one and TopBar
 *      renders another, and the responsive classes only hide one with CSS —
 *      both are in the DOM and both run their effects. Middleware runs once
 *      per request, so the hazard does not exist here.
 */
function recordWriteOpened(
  request: NextRequest,
  response: NextResponse,
  supabase: ReturnType<typeof createServerClient>,
  userId: string | undefined,
): void {
  if (!userId) return;
  // Exact match. /write/anything-else is not the writing screen.
  if (request.nextUrl.pathname !== "/write") return;

  /* ⚠️ THE GUARD THIS WHOLE THING DEPENDS ON.
   *
   * BottomNav links to /write with a plain <Link> and sits on every
   * authenticated page, so Next prefetches /write as soon as the nav scrolls
   * into view — for everyone, on every page, without anyone going there.
   * Record those and the answer becomes "100% reached /write", which is
   * exactly the thing this instrumentation exists to find out.
   *
   * A prefetch carries Next-Router-Prefetch. A real client-side navigation
   * carries RSC but NOT that header, so only the prefetch header may be
   * tested — filtering on RSC would throw away every in-app navigation and
   * leave only full page loads.
   */
  if (request.headers.get("next-router-prefetch")) return;

  const tz = validateTZ(decodeURIComponent(request.cookies.get("user_tz")?.value ?? ""));
  const day = todayInTZ(tz);

  // One row per account per day, so the cookie can answer "already counted"
  // without a round trip. The table's primary key enforces the same thing —
  // the cookie only saves the request, it is not what makes it correct.
  if (request.cookies.get(FUNNEL_COOKIE)?.value === day) return;
  response.cookies.set(FUNNEL_COOKIE, day, {
    path: "/",
    maxAge: 60 * 60 * 24 * 2,
    sameSite: "lax",
    httpOnly: true,
  });

  // after() so the insert never delays the writing screen.
  after(async () => {
    try {
      // Duplicates come back as an error rather than throwing, and a missing
      // table would too — before the SQL is run this is simply a no-op. Both
      // are ignored on purpose: a funnel row is never worth a failed request.
      await supabase.from("funnel_events").insert({ user_id: userId, kind: "write_opened", day });
    } catch {
      // Same reasoning.
    }
  });
}

export const config = {
  matcher: [
    /*
     * Run on all routes except static files and Next internals.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
