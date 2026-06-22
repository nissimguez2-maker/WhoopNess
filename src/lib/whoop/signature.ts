import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * WHOOP webhook signature verification.
 *
 * WHOOP signs each webhook as:
 *   base64( HMAC-SHA256( timestamp + rawBody, clientSecret ) )
 * delivered in `X-WHOOP-Signature`, with the timestamp in
 * `X-WHOOP-Signature-Timestamp`.
 *
 * CRITICAL: compute the HMAC over the EXACT raw request body bytes (never the
 * re-serialized JSON), use a constant-time compare, and verify BEFORE doing any
 * processing/logging of the payload. A forged or replayed webhook must be rejected.
 */
export function computeWhoopSignature(timestamp: string, rawBody: string, clientSecret: string): string {
  return createHmac("sha256", clientSecret)
    .update(timestamp + rawBody)
    .digest("base64");
}

export interface VerifyInput {
  timestamp: string | null;
  signature: string | null;
  rawBody: string;
  clientSecret: string;
  /** Reject if the timestamp is older/newer than this many ms (replay window). Default 5 min. */
  toleranceMs?: number;
  /** Injectable for testing. */
  now?: number;
}

export function verifyWhoopSignature(input: VerifyInput): { valid: boolean; reason?: string } {
  const { timestamp, signature, rawBody, clientSecret } = input;
  if (!timestamp || !signature) return { valid: false, reason: "missing signature headers" };

  // Replay window check (timestamp is epoch milliseconds per WHOOP).
  const tolerance = input.toleranceMs ?? 5 * 60_000;
  const now = input.now ?? Date.now();
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return { valid: false, reason: "invalid timestamp" };
  if (Math.abs(now - ts) > tolerance) return { valid: false, reason: "timestamp outside tolerance" };

  const expected = computeWhoopSignature(timestamp, rawBody, clientSecret);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return { valid: false, reason: "signature mismatch" };
  if (!timingSafeEqual(a, b)) return { valid: false, reason: "signature mismatch" };
  return { valid: true };
}
