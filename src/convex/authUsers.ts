import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

/**
 * Internal lookups used by the credential sign-in provider in
 * `auth/password.ts`. These are never exposed to clients.
 */
export const byIdentifier = internalQuery({
  args: { identifier: v.string() },
  handler: async (ctx, args) => {
    const identifier = args.identifier;
    const email = identifier;
    const portalId = identifier.toUpperCase();

    const byEmail = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();
    const user =
      byEmail ??
      (await ctx.db
        .query("users")
        .withIndex("portalId", (q) => q.eq("portalId", portalId))
        .first());

    if (user === null) return null;
    return {
      userId: user._id,
      role: user.role ?? null,
      status: user.status ?? "active",
    };
  },
});

export const credentialHash = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const credential = await ctx.db
      .query("credentials")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    return credential?.hash ?? null;
  },
});
