import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

/**
 * ClassCast credential sign-in.
 *
 * Passwords are salted and stretched with PBKDF2-HMAC-SHA256 (120k iterations)
 * using the Web Crypto API natively available in Convex. Only the derived hash
 * is stored, in the `credentials` table — never on the user document, never in
 * frontend code. Failed attempts are rate limited by Convex Auth itself
 * (default: 10 per hour per identifier).
 */

const PBKDF2_ITERATIONS = 120_000;
const SALT_BYTES = 16;
const KEY_BYTES = 32;
const ALGO_PREFIX = "pbkdf2-sha256";
const encoder = new TextEncoder();

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) out += byte.toString(16).padStart(2, "0");
  return out;
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function derive(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    KEY_BYTES * 8,
  );
  return new Uint8Array(bits);
}

/** Hash a plaintext password into a storable `pbkdf2-sha256$...` string. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, PBKDF2_ITERATIONS);
  return `${ALGO_PREFIX}$${PBKDF2_ITERATIONS}$${toHex(salt)}$${toHex(hash)}`;
}

/** Verify a plaintext password against a stored hash (constant-time compare). */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== ALGO_PREFIX) return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 1_000) return false;
  const salt = fromHex(parts[2]);
  const expected = fromHex(parts[3]);
  const actual = await derive(password, salt, iterations);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ actual[i];
  return diff === 0;
}

/**
 * Provider registered in `convex/auth.ts`. The client calls
 * `signIn("password", { identifier, password })` where identifier is a portal
 * ID (ST-101) or a college email address.
 */
type CredentialsProvider = ReturnType<typeof ConvexCredentials>;
type AuthorizeResult = { userId: Id<"users"> } | null;

export const classcastPassword: CredentialsProvider = ConvexCredentials({
  id: "password",
  authorize: async (params, ctx): Promise<AuthorizeResult> => {
    const identifier = String(params.identifier ?? "")
      .trim()
      .toLowerCase();
    const password = String(params.password ?? "");
    if (identifier.length < 3 || identifier.length > 120) return null;
    if (password.length < 8 || password.length > 200) return null;

    const user: {
      userId: Id<"users">;
      role: string | null;
      status: string;
    } | null = await ctx.runQuery(internal.authUsers.byIdentifier, {
      identifier,
    });
    if (user === null) return null;

    const hash: string | null = await ctx.runQuery(
      internal.authUsers.credentialHash,
      { userId: user.userId },
    );
    if (hash === null) return null;

    const valid = await verifyPassword(password, hash);
    if (!valid) return null;

    // Version 1 ships the student desk only, and never lets a deactivated
    // account start a session.
    if (user.role !== "student") return null;
    if (user.status === "inactive") return null;

    return { userId: user.userId };
  },
});
