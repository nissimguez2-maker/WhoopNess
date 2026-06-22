import { NextResponse, type NextRequest } from "next/server";
import { exchangeCodeForTokens } from "@/lib/whoop/oauth";
import { storeWhoopTokens } from "@/lib/whoop/tokens";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * WHOOP OAuth redirect target (must match WHOOP_REDIRECT_URI). Verifies the CSRF state,
 * exchanges the code for tokens, encrypts + persists them for the signed-in user.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const state = url.searchParams.get("state");
  const stateCookie = req.cookies.get("whoop_oauth_state")?.value;

  if (error) return NextResponse.redirect(new URL(`/?whoop=error&reason=${encodeURIComponent(error)}`, origin));
  if (!code) return NextResponse.redirect(new URL("/?whoop=error&reason=missing_code", origin));
  if (!state || !stateCookie || state !== stateCookie) {
    return NextResponse.redirect(new URL("/?whoop=error&reason=state_mismatch", origin));
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", origin));

  try {
    const tokens = await exchangeCodeForTokens(code);
    await storeWhoopTokens(user.id, tokens);
    const res = NextResponse.redirect(new URL("/?whoop=connected", origin));
    res.cookies.delete("whoop_oauth_state");
    return res;
  } catch (e) {
    const reason = e instanceof Error ? e.message : "exchange_failed";
    return NextResponse.redirect(new URL(`/?whoop=error&reason=${encodeURIComponent(reason)}`, origin));
  }
}
