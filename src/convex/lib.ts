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

/** Role gate for the teaching desk. */
export async function requireTeacher(ctx: Ctx): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (user.role !== "teacher") throw new Error("Not authorized");
  if (user.status === "inactive") throw new Error("Account deactivated");
  return user;
}

/** Role gate for the administration desk. */
export async function requireAdmin(ctx: Ctx): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (user.role !== "admin") throw new Error("Not authorized");
  if (user.status === "inactive") throw new Error("Account deactivated");
  return user;
}

/** Any desk user except anonymous/unknown roles. */
export async function requireDeskUser(ctx: Ctx): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (
    user.role !== "student" &&
    user.role !== "teacher" &&
    user.role !== "admin"
  ) {
    throw new Error("Not authorized");
  }
  if (user.status === "inactive") throw new Error("Account deactivated");
  return user;
}

/** Shared file-upload constraints for the portal. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_EXTENSIONS = [
  "pdf", "doc", "docx", "ppt", "pptx", "txt", "csv",
  "png", "jpg", "jpeg", "zip",
];

export function extensionOf(fileName: string): string {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

export function validateUpload(fileName: string, sizeBytes: number): void {
  if (!fileName || fileName.length > 160) throw new Error("Invalid file name");
  if (!ALLOWED_EXTENSIONS.includes(extensionOf(fileName))) {
    throw new Error(
      `File type not allowed. Accepted: ${ALLOWED_EXTENSIONS.join(", ")}`,
    );
  }
  if (sizeBytes <= 0) throw new Error("Empty file");
  if (sizeBytes > MAX_UPLOAD_BYTES) {
    throw new Error("File exceeds the 10 MB upload limit");
  }
}
