import { randomBytes } from "node:crypto";

/**
 * WHOOP OAuth 2.0 (authorization-code + offline refresh).
 * Authorize:  https://api.prod.whoop.com/oauth/oauth2/auth
 * Token:      https://api.prod.whoop.com/oauth/oauth2/token
 */
const AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
const TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";

export interface WhoopTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
  scope: string;
}

function env() {
  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  const redirectUri = process.env.WHOOP_REDIRECT_URI;
  const scopes = process.env.WHOOP_SCOPES ?? "";
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("WHOOP_CLIENT_ID / WHOOP_CLIENT_SECRET / WHOOP_REDIRECT_URI must be set.");
  }
  return { clientId, clientSecret, redirectUri, scopes };
}

/** Build the authorize URL. `state` should be persisted (CSRF) and re-checked on callback. */
export function buildAuthorizeUrl(state = randomBytes(16).toString("hex")): { url: string; state: string } {
  const { clientId, redirectUri, scopes } = env();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    state,
  });
  return { url: `${AUTH_URL}?${params.toString()}`, state };
}

async function postToken(body: URLSearchParams): Promise<WhoopTokens> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`WHOOP token endpoint ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
  };
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + json.expires_in * 1000,
    scope: json.scope,
  };
}

export function exchangeCodeForTokens(code: string): Promise<WhoopTokens> {
  const { clientId, clientSecret, redirectUri } = env();
  return postToken(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  );
}

/**
 * Refresh tokens. WHOOP rotates the refresh token, so the caller MUST persist the
 * new refreshToken atomically and serialize concurrent refreshes (single-flight) to
 * avoid a race that invalidates the good token (concurrent refresh → 401).
 */
export function refreshTokens(refreshToken: string): Promise<WhoopTokens> {
  const { clientId, clientSecret, scopes } = env();
  return postToken(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      scope: scopes,
    }),
  );
}
