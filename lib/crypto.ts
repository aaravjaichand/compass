import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * App-level AES-256-GCM encryption for PII stored at rest.
 *
 * Honest scope: this is encryption AT REST, not zero-knowledge — the server
 * holds the key (DATA_ENCRYPTION_KEY) and can decrypt. It protects against a
 * leaked database dump / backup, not against the running server.
 *
 * Envelope format (single text column): `base64(iv):base64(authTag):base64(ciphertext)`.
 */

const ALGO = "aes-256-gcm";
const IV_LEN = 12; // 96-bit nonce, the GCM standard

function getKey(): Buffer {
  const raw = process.env.DATA_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "DATA_ENCRYPTION_KEY is not set. Generate one with: openssl rand -base64 32",
    );
  }
  // Accept a 64-char hex string or a base64 string; both must decode to 32 bytes.
  const key = /^[0-9a-fA-F]{64}$/.test(raw)
    ? Buffer.from(raw, "hex")
    : Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      "DATA_ENCRYPTION_KEY must decode to 32 bytes (use: openssl rand -base64 32).",
    );
  }
  return key;
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decrypt(envelope: string): string {
  const [ivB64, tagB64, ctB64] = envelope.split(":");
  if (!ivB64 || !tagB64 || ctB64 === undefined) {
    throw new Error("Malformed ciphertext envelope.");
  }
  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ctB64, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

export function encryptJson(value: unknown): string {
  return encrypt(JSON.stringify(value));
}

export function decryptJson<T>(envelope: string): T {
  return JSON.parse(decrypt(envelope)) as T;
}
