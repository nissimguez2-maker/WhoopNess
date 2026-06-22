import { describe, it, expect } from "vitest";
import { randomBytes } from "node:crypto";
import { computeWhoopSignature, verifyWhoopSignature } from "./whoop/signature";
import { encrypt, decrypt } from "./crypto";

const SECRET = "whoop_test_client_secret";
const KEY = randomBytes(32).toString("base64");

describe("WHOOP webhook signature", () => {
  const rawBody = JSON.stringify({ user_id: 123, type: "recovery.updated", id: "abc" });
  const ts = String(Date.now());
  const sig = computeWhoopSignature(ts, rawBody, SECRET);

  it("accepts a valid signature within the window", () => {
    expect(verifyWhoopSignature({ timestamp: ts, signature: sig, rawBody, clientSecret: SECRET }).valid).toBe(true);
  });

  it("rejects a tampered body", () => {
    const res = verifyWhoopSignature({ timestamp: ts, signature: sig, rawBody: rawBody + " ", clientSecret: SECRET });
    expect(res.valid).toBe(false);
  });

  it("rejects a wrong secret (forged)", () => {
    expect(verifyWhoopSignature({ timestamp: ts, signature: sig, rawBody, clientSecret: "attacker" }).valid).toBe(false);
  });

  it("rejects missing headers", () => {
    expect(verifyWhoopSignature({ timestamp: null, signature: null, rawBody, clientSecret: SECRET }).valid).toBe(false);
  });

  it("rejects a replayed (stale) timestamp", () => {
    const oldTs = String(Date.now() - 10 * 60_000);
    const oldSig = computeWhoopSignature(oldTs, rawBody, SECRET);
    const res = verifyWhoopSignature({ timestamp: oldTs, signature: oldSig, rawBody, clientSecret: SECRET });
    expect(res.valid).toBe(false);
    expect(res.reason).toMatch(/tolerance/);
  });
});

describe("AES-256-GCM token encryption", () => {
  it("round-trips plaintext", () => {
    const token = "whoop_refresh_token_value_xyz";
    const ct = encrypt(token, KEY);
    expect(ct).not.toContain(token);
    expect(decrypt(ct, KEY)).toBe(token);
  });

  it("produces different ciphertext each time (random IV)", () => {
    expect(encrypt("same", KEY)).not.toBe(encrypt("same", KEY));
  });

  it("fails to decrypt with a different key (auth tag)", () => {
    const ct = encrypt("secret", KEY);
    expect(() => decrypt(ct, randomBytes(32).toString("base64"))).toThrow();
  });

  it("rejects a wrong-length key", () => {
    expect(() => encrypt("x", Buffer.from("short").toString("base64"))).toThrow(/32 bytes/);
  });
});
