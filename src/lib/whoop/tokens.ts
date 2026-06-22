import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { encrypt, decrypt } from "@/lib/crypto";
import { refreshTokens, type WhoopTokens } from "./oauth";

/**
 * WHOOP token storage. Tokens are encrypted at rest (AES-256-GCM) and live in the
 * whoop_tokens table, which is RLS deny-all to clients — only the service-role
 * admin client (here) can touch them.
 */
export async function storeWhoopTokens(userId: string, tokens: WhoopTokens): Promise<void> {
  const key = process.env.APP_ENCRYPTION_KEY;
  if (!key) throw new Error("APP_ENCRYPTION_KEY not set");
  await getSupabaseAdmin()
    .from("whoop_tokens")
    .upsert({
      user_id: userId,
      access_token_enc: encrypt(tokens.accessToken, key),
      refresh_token_enc: encrypt(tokens.refreshToken, key),
      expires_at: new Date(tokens.expiresAt).toISOString(),
      scope: tokens.scope,
      updated_at: new Date().toISOString(),
    });
}

/**
 * Return a valid access token for the user, refreshing (and re-persisting the rotated
 * refresh token) when within 60s of expiry. Returns null if the user hasn't connected.
 */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const key = process.env.APP_ENCRYPTION_KEY;
  if (!key) throw new Error("APP_ENCRYPTION_KEY not set");
  const admin = getSupabaseAdmin();
  const { data } = await admin.from("whoop_tokens").select("*").eq("user_id", userId).maybeSingle();
  if (!data) return null;

  const expiresAt = new Date(data.expires_at).getTime();
  if (Date.now() < expiresAt - 60_000) {
    return decrypt(data.access_token_enc, key);
  }
  // Refresh (WHOOP rotates the refresh token → persist the new one atomically).
  const refreshed = await refreshTokens(decrypt(data.refresh_token_enc, key));
  await storeWhoopTokens(userId, refreshed);
  return refreshed.accessToken;
}

export async function hasWhoopConnection(userId: string): Promise<boolean> {
  const { data } = await getSupabaseAdmin().from("whoop_tokens").select("user_id").eq("user_id", userId).maybeSingle();
  return Boolean(data);
}
