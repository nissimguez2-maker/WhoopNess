import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM envelope encryption for data at rest (WHOOP tokens + sensitive fields).
 * Key comes from APP_ENCRYPTION_KEY (base64, 32 bytes). Ciphertext format:
 *   base64( iv[12] | authTag[16] | ciphertext )
 *
 * This is app-layer encryption on top of the DB's disk encryption — so a leaked
 * query result or anon-key path still can't read the plaintext tokens.
 */
const IV_LEN = 12;
const TAG_LEN = 16;

export function getKey(base64Key: string): Buffer {
  const key = Buffer.from(base64Key, "base64");
  if (key.length !== 32) {
    throw new Error("APP_ENCRYPTION_KEY must be 32 bytes (base64). Generate: openssl rand -base64 32");
  }
  return key;
}

export function encrypt(plaintext: string, base64Key: string): string {
  const key = getKey(base64Key);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decrypt(payload: string, base64Key: string): string {
  const key = getKey(base64Key);
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const enc = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
