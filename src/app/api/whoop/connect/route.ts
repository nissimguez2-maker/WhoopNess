import { NextResponse, type NextRequest } from "next/server";
import { buildAuthorizeUrl } from "@/lib/whoop/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Start the WHOOP OAuth flow: stash a CSRF state cookie, redirect to WHOOP's consent. */
export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;
  try {
    const { url, state } = buildAuthorizeUrl();
    const res = NextResponse.redirect(url);
    res.cookies.set("whoop_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });
    return res;
  } catch (e) {
    const reason = e instanceof Error ? e.message : "not_configured";
    return NextResponse.redirect(new URL(`/?whoop=error&reason=${encodeURIComponent(reason)}`, origin));
  }
}
