import { NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/whoop/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * WHOOP OAuth redirect target (must match WHOOP_REDIRECT_URI).
 * Exchanges the auth code for tokens. The tokens are then encrypted at rest and the
 * refresh token persisted (single-flight rotation) — wired in phase 2 with the DB.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  // TODO[phase-2]: verify `state` against the value stored at authorize time (CSRF).

  if (error) {
    return NextResponse.redirect(new URL(`/?whoop=error&reason=${encodeURIComponent(error)}`, url.origin));
  }
  if (!code) {
    return NextResponse.redirect(new URL("/?whoop=error&reason=missing_code", url.origin));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    // TODO[phase-2]: encrypt(tokens.refreshToken, APP_ENCRYPTION_KEY) and upsert into
    // the whoop_tokens table (RLS deny-all to client; service role only).
    void tokens;
    return NextResponse.redirect(new URL("/?whoop=connected", url.origin));
  } catch (e) {
    const reason = e instanceof Error ? e.message : "exchange_failed";
    return NextResponse.redirect(new URL(`/?whoop=error&reason=${encodeURIComponent(reason)}`, url.origin));
  }
}
