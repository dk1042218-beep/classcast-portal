import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

/** Any context that carries auth + db (query or mutation). */
export type Ctx = QueryCtx | MutationCtx;

export const DAY_MS = 86_400_000;

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

/** UTC midnight of a timestamp. */
export function utcMidnight(ts: number): number {
  const d = new Date(ts);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** `YYYY-MM-DD` for a timestamp (UTC calendar date). */
export function isoDate(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

/** `mon` .. `sun` for a timestamp (UTC calendar date). */
export function dayKeyOf(ts: number): DayKey {
  const names = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return names[new Date(ts).getUTCDay()] as DayKey;
}

/** Validate the client-supplied `YYYY-MM-DD` date string. */
export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Validate the client-supplied day key. */
export function isDayKey(value: string): value is DayKey {
  return (DAY_KEYS as readonly string[]).includes(value);
}

/**
 * The signed-in user, or a thrown error. Every ClassCast query/mutation starts
 * here so no function can be reached without a session.
 */
export async function requireUser(ctx: Ctx): Promise<Doc<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (user === null) throw new Error("Not authenticated");
  return user;
}

/**
 * Role gate for the student desk. A signed-in account that is not an active
 * student (teacher/admin records, anonymous sessions, OTP experiments) never
 * reaches student data.
 */
export async function requireStudent(ctx: Ctx): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (user.role !== "student") throw new Error("Not authorized");
  if (user.status === "inactive") throw new Error("Account deactivated");
  return user;
}
