import { beforeAll, describe, expect, it } from "vitest";
import { decrypt, decryptJson, encrypt, encryptJson } from "./crypto";

beforeAll(() => {
  // Deterministic 32-byte test key.
  process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
});

describe("crypto (AES-256-GCM)", () => {
  it("round-trips a string", () => {
    const secret = "Marisol — 123-45-6789";
    expect(decrypt(encrypt(secret))).toBe(secret);
  });

  it("round-trips JSON", () => {
    const obj = { applicant_full_name: "Marisol R.", phone: "201-555-0142" };
    expect(decryptJson<typeof obj>(encryptJson(obj))).toEqual(obj);
  });

  it("produces different ciphertext for the same plaintext (random IV)", () => {
    const a = encrypt("same");
    const b = encrypt("same");
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe(decrypt(b));
  });

  it("rejects tampered ciphertext", () => {
    const env = encrypt("authentic");
    const [iv, tag, ct] = env.split(":");
    // Flip a byte in the ciphertext.
    const buf = Buffer.from(ct, "base64");
    buf[0] = buf[0] ^ 0xff;
    const tampered = [iv, tag, buf.toString("base64")].join(":");
    expect(() => decrypt(tampered)).toThrow();
  });

  it("rejects a malformed envelope", () => {
    expect(() => decrypt("not-an-envelope")).toThrow(/Malformed/);
  });
});
