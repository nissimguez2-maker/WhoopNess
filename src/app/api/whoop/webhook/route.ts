import { NextResponse } from "next/server";
import { verifyWhoopSignature } from "@/lib/whoop/signature";

// Needs Node crypto + the exact raw body — not the Edge runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * WHOOP webhook receiver. Pattern: verify (raw-body HMAC) → ack fast (<1s) →
 * process asynchronously (notify-then-fetch). We do NO parsing/logging/DB work
 * until the signature passes. Duplicate deliveries are deduped downstream by event id.
 */
export async function POST(req: Request) {
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  if (!clientSecret) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  // Read the EXACT raw bytes before any parsing.
  const rawBody = await req.text();
  const timestamp = req.headers.get("x-whoop-signature-timestamp");
  const signature = req.headers.get("x-whoop-signature");

  const { valid, reason } = verifyWhoopSignature({ timestamp, signature, rawBody, clientSecret });
  if (!valid) {
    return NextResponse.json({ error: "invalid signature", reason }, { status: 401 });
  }

  // Signature OK — now it's safe to parse and enqueue.
  // (Async processing: persist a pending event keyed on its id for idempotency,
  //  then a worker fetches the full record from the WHOOP API and runs guardrails.)
  // TODO[phase-2]: enqueue + idempotent upsert via Supabase; fetch full record.

  // Acknowledge immediately so WHOOP doesn't retry.
  return NextResponse.json({ ok: true }, { status: 200 });
}
