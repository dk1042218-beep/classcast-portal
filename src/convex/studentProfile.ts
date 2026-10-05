import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { hashPassword, verifyPassword } from "./auth/password";
import { requireStudent } from "./lib";

/** The signed-in student's own record plus class registration details. */
export const profileMe = query({
  args: {},
  handler: async (ctx) => {
    const student = await requireStudent(ctx);
    const classDoc = student.className
      ? await ctx.db
          .query("classes")
          .withIndex("by_name", (q) => q.eq("name", student.className!))
          .unique()
      : null;

    return {
      profile: {
        name: student.name ?? "",
        email: student.email ?? "",
        phone: student.phone ?? "",
        image: student.image ?? null,
        portalId: student.portalId ?? "",
        rollNo: student.rollNo ?? "",
        className: student.className ?? "",
        department: student.department ?? "",
        role: student.role ?? null,
        status: student.status ?? "active",
      },
      classInfo: classDoc
        ? {
            mentor: classDoc.mentor,
            room: classDoc.room,
            academicYear: classDoc.academicYear,
            term: classDoc.term,
          }
        : null,
    };
  },
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Update the fields a student owns. Roll number, portal ID, class and
 * department are registrar-controlled and are never accepted here. */
export const updateProfile = mutation({
  args: {
    name: v.string(),
    phone: v.optional(v.string()),
    email: v.string(),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const student = await requireStudent(ctx);

    const name = args.name.trim();
    if (name.length < 2 || name.length > 80) throw new Error("Enter a valid name");

    const email = args.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 120) {
      throw new Error("Enter a valid email address");
    }
    const emailOwner = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();
    if (emailOwner !== null && emailOwner._id !== student._id) {
      throw new Error("That email is already in use");
    }

    const phone = (args.phone ?? "").trim();
    if (phone.length > 30) throw new Error("Phone number is too long");

    const image = (args.image ?? "").trim();
    if (image && !/^https?:\/\//.test(image)) {
      throw new Error("Photo must be a valid http(s) URL");
    }
    if (image.length > 400) throw new Error("Photo URL is too long");

    await ctx.db.patch(student._id, {
      name,
      email,
      phone,
      image: image || undefined,
    });
    return true;
  },
});

/** Change this student's own password. The current password must be proved,
 * the new one is re-hashed with PBKDF2 and stored. */
export const changePassword = mutation({
  args: {
    current: v.string(),
    next: v.string(),
  },
  handler: async (ctx, args) => {
    const student = await requireStudent(ctx);
    const credential = await ctx.db
      .query("credentials")
      .withIndex("by_user", (q) => q.eq("userId", student._id))
      .unique();
    if (credential === null) throw new Error("No password set for this account");

    const ok = await verifyPassword(args.current, credential.hash);
    if (!ok) throw new Error("Current password is incorrect");

    if (args.next.length < 8 || args.next.length > 128) {
      throw new Error("New password must be at least 8 characters");
    }
    if (args.next === args.current) {
      throw new Error("New password must be different from the current one");
    }

    const hash = await hashPassword(args.next);
    await ctx.db.patch(credential._id, { hash, updatedAt: Date.now() });
    return true;
  },
});
