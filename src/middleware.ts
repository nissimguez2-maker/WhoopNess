import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session cookie on every request and gates the app:
 * unauthenticated users go to /login; only the single allowlisted email may stay in.
 * Public paths: /login, /auth/*, /privacy, and the WHOOP webhook (server-to-server).
 */
const PUBLIC_PREFIXES = ["/login", "/auth", "/privacy", "/api/whoop/webhook"];

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // If Supabase isn't configured yet, don't lock the app out.
  if (!url || !anon) return res;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = req.nextUrl.pathname;
  const isPublic = PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p + "/") || path.startsWith(p));

  // Allowlist: a signed-in user who isn't the owner is signed out.
  const allowed = process.env.ALLOWED_USER_EMAIL;
  if (user && allowed && user.email?.toLowerCase() !== allowed.toLowerCase()) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=not_allowed", req.url));
  }

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (user && path === "/login") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return res;
}

export const config = {
  // Run on everything except static assets and icons.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon-).*)"],
};
