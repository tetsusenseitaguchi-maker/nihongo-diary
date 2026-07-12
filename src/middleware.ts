import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = [
  "/dashboard",
  "/write",
  "/history",
  "/calendar",
  "/support",
  "/feed",
  "/profile",
  "/profile-setup",
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

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on all routes except static files and Next internals.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
