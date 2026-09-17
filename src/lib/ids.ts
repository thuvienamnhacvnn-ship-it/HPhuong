import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCb,
  timingSafeEqual,
} from "node:crypto";

function scrypt(password: string, salt: Buffer, length: number): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCb(password, salt, length, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export const newId = (prefix: string) => `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 20)}`;

/** Unguessable URL token (256 bits). Only its hash is stored. */
export const newToken = () => randomBytes(32).toString("base64url");

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/** Voucher code: 16 chars without look-alike characters, grouped HP-XXXX-XXXX-XXXX-XXXX. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 symbols → 80 bits
export function newVoucherCode(): string {
  const bytes = randomBytes(16);
  let out = "";
  for (let i = 0; i < 16; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return `HP-${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}-${out.slice(12)}`;
}

export function normalizeVoucherCode(code: string): string {
  let raw = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (raw.length === 18 && raw.startsWith("HP")) raw = raw.slice(2);
  if (raw.length !== 16) return code.trim().toUpperCase();
  return `HP-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12)}`;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, saltB64, keyB64] = stored.split("$");
  if (algo !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64");
  const key = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length);
  return timingSafeEqual(key, expected);
}

const DEV_SECRET = "hphuong-dev-secret-not-for-production";

function appSecret(): string {
  const secret = process.env.APP_SECRET;
  if (!secret && process.env.NODE_ENV === "production" && process.env.HPHUONG_ALLOW_DEV_SECRET !== "1") {
    throw new Error("APP_SECRET is required in production");
  }
  return secret ?? DEV_SECRET;
}

/**
 * Encryption for secrets that must survive in a job payload until delivery
 * (the voucher code for the issue e-mail). Cleared after sending.
 */
export function seal(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", createHash("sha256").update(appSecret()).digest(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${enc.toString("base64url")}`;
}

export function unseal(sealed: string): string {
  const [iv, tag, enc] = sealed.split(".");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    createHash("sha256").update(appSecret()).digest(),
    Buffer.from(iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(enc, "base64url")), decipher.final()]).toString("utf8");
}

export function webhookSecret(provider: string): string {
  const configured = process.env[`PAYMENT_WEBHOOK_SECRET_${provider.toUpperCase()}`] ?? process.env.PAYMENT_WEBHOOK_SECRET;
  return configured ?? sha256(`webhook:${provider}:${appSecret()}`);
}

export function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ab.length === bb.length && ab.length > 0 && timingSafeEqual(ab, bb);
}
