import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { hashPassword, verifyPassword } from "./auth/password";
import { requireDeskUser } from "./lib";

/**
 * Shared desk functions used by every signed-in role (student, teacher,
 * admin). The portal shell and the shared Notice Board / Notifications /
 * Profile / Search pages call these instead of the student-only API so a
 * faculty or admin session never hits a "Not authorized" error on shared
 * navigation.
 */

/** The signed-in user's notifications, newest first. */
export const notificationsList = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireDeskUser(ctx);
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_user_created", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
    return {
      unread: rows.filter((n) => !n.read).length,
      items: rows.map((n) => ({
        id: n._id,
        kind: n.kind,
        title: n.title,
        body: n.body,
        read: n.read,
        createdAt: n.createdAt,
        href: n.href,
      })),
    };
  },
});

export const markNotificationRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    const user = await requireDeskUser(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== user._id) throw new Error("Not authorized");
    if (!row.read) await ctx.db.patch(args.id, { read: true });
    return true;
  },
});

export const markAllNotificationsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireDeskUser(ctx);
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_user_created", (q) => q.eq("userId", user._id))
      .collect();
    let count = 0;
    for (const row of rows) {
      if (!row.read) {
        await ctx.db.patch(row._id, { read: true });
        count++;
      }
    }
    return count;
  },
});

/** Notice board for every desk: pinned first, with audience + ownership. */
export const noticesList = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireDeskUser(ctx);
    const rows = await ctx.db.query("notices").collect();
    return rows
      .sort(
        (a, b) =>
          Number(b.pinned) - Number(a.pinned) || b.publishedAt - a.publishedAt,
      )
      .map((n) => ({
        id: n._id,
        title: n.title,
        body: n.body,
        category: n.category,
        audience: n.audience,
        author: n.author,
        pinned: n.pinned,
        dateStr: n.dateStr,
        publishedAt: n.publishedAt,
        mine: n.issuedById === user._id,
      }));
  },
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The signed-in user's own record for any desk role. */
export const profileMe = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireDeskUser(ctx);
    const classDoc = user.className
      ? await ctx.db
          .query("classes")
          .withIndex("by_name", (q) => q.eq("name", user.className!))
          .unique()
      : null;

    let subjectCount = 0;
    let attendance: { pct: number; total: number; present: number } | null =
      null;
    if (user.role === "teacher") {
      const rows = await ctx.db
        .query("subjects")
        .withIndex("by_teacher", (q) => q.eq("teacherId", user._id))
        .collect();
      subjectCount = rows.length;
    }
    if (user.role === "student") {
      const rows = await ctx.db
        .query("attendance")
        .withIndex("by_student", (q) => q.eq("studentId", user._id))
        .collect();
      const present = rows.filter((r) => r.status !== "absent").length;
      attendance = {
        total: rows.length,
        present,
        pct: rows.length ? Math.round((present / rows.length) * 100) : 0,
      };
    }

    return {
      profile: {
        name: user.name ?? "",
        email: user.email ?? "",
        phone: user.phone ?? "",
        image: user.image ?? null,
        portalId: user.portalId ?? "",
        rollNo: user.rollNo ?? "",
        className: user.className ?? "",
        department: user.department ?? "",
        designation: user.designation ?? "",
        role: user.role ?? null,
        status: user.status ?? "active",
      },
      classInfo: classDoc
        ? {
            mentor: classDoc.mentor,
            room: classDoc.room,
            academicYear: classDoc.academicYear,
            term: classDoc.term,
          }
        : null,
      subjectCount,
      attendance,
    };
  },
});

/** Update the fields a desk user owns. Registrar-controlled fields
 * (portal ID, class, roll number, department) are never accepted here. */
export const updateProfile = mutation({
  args: {
    name: v.string(),
    phone: v.optional(v.string()),
    email: v.string(),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireDeskUser(ctx);

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
    if (emailOwner !== null && emailOwner._id !== user._id) {
      throw new Error("That email is already in use");
    }

    const phone = (args.phone ?? "").trim();
    if (phone.length > 30) throw new Error("Phone number is too long");

    const image = (args.image ?? "").trim();
    if (image && !/^https?:\/\//.test(image)) {
      throw new Error("Photo must be a valid http(s) URL");
    }
    if (image.length > 400) throw new Error("Photo URL is too long");

    await ctx.db.patch(user._id, {
      name,
      email,
      phone,
      image: image || undefined,
    });
    return true;
  },
});

/** Change this account's own password (current password must be proved). */
export const changePassword = mutation({
  args: {
    current: v.string(),
    next: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireDeskUser(ctx);
    const credential = await ctx.db
      .query("credentials")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
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

interface SearchHit {
  id: string;
  title: string;
  meta: string;
  href: string;
}

/**
 * Global search scoped to what this desk role may see. Students see their
 * class, teachers see the classes they teach, admins see the whole portal.
 */
export const globalSearch = query({
  args: { q: v.string() },
  handler: async (ctx, args) => {
    const user = await requireDeskUser(ctx);
    const needle = args.q.trim().toLowerCase();
    const none = {
      notes: [] as SearchHit[],
      assignments: [] as SearchHit[],
      subjects: [] as SearchHit[],
      notices: [] as SearchHit[],
      people: [] as SearchHit[],
    };
    if (needle.length < 2) return none;

    // Class scope for this role.
    let classNames: string[];
    if (user.role === "admin") {
      classNames = (await ctx.db.query("classes").collect()).map((c) => c.name);
    } else if (user.role === "teacher") {
      const mine = await ctx.db
        .query("subjects")
        .withIndex("by_teacher", (q) => q.eq("teacherId", user._id))
        .collect();
      classNames = Array.from(new Set(mine.map((s) => s.className)));
    } else {
      classNames = user.className ? [user.className] : [];
    }
    if (classNames.length === 0 && user.role !== "admin") return none;

    const hit = (...parts: string[]) =>
      parts.join(" ").toLowerCase().includes(needle);

    // Subjects across the scoped classes.
    const subjectDocs = (await ctx.db.query("subjects").collect()).filter(
      (s) => classNames.includes(s.className),
    );
    const subjectById = new Map(subjectDocs.map((s) => [s._id, s]));
    const teacherName = new Map<string, string>();
    for (const subject of subjectDocs) {
      const teacher = await ctx.db.get(subject.teacherId);
      teacherName.set(subject._id, teacher?.name ?? "Not allotted");
    }

    const subjects: SearchHit[] = subjectDocs
      .filter((s) => hit(s.name, s.code, s.room, teacherName.get(s._id) ?? ""))
      .map((s) => ({
        id: s._id as string,
        title: `${s.code} · ${s.name}`,
        meta: `${teacherName.get(s._id)} · ${s.room} · ${s.className}`,
        href: user.role === "student" ? "/timetable" : "/dashboard",
      }));

    const noteRows = (await ctx.db.query("notes").collect()).filter((n) =>
      classNames.includes(n.className),
    );
    const notes: SearchHit[] = noteRows
      .filter((n) => {
        const subject = subjectById.get(n.subjectId);
        return hit(
          n.title,
          n.description,
          n.fileName,
          subject?.name ?? "",
          subject?.code ?? "",
        );
      })
      .sort((a, b) => b.uploadedAt - a.uploadedAt)
      .map((n) => {
        const subject = subjectById.get(n.subjectId);
        return {
          id: n._id as string,
          title: n.title,
          meta: `${subject?.code ?? n.className} · ${n.fileName} · ${teacherName.get(n.subjectId) ?? ""}`,
          href: user.role === "student" ? "/notes" : "/dashboard",
        };
      });

    const activityRows = (await ctx.db.query("activities").collect()).filter(
      (a) => classNames.includes(a.className),
    );
    const assignments: SearchHit[] = activityRows
      .filter((a) => {
        const subject = subjectById.get(a.subjectId);
        return hit(a.title, a.description, subject?.name ?? "", subject?.code ?? "");
      })
      .sort((a, b) => a.dueAt - b.dueAt)
      .map((a) => {
        const subject = subjectById.get(a.subjectId);
        return {
          id: a._id as string,
          title: a.title,
          meta: `${subject?.code ?? ""} · due ${a.dueDateStr} · ${a.points} marks`,
          href: user.role === "student" ? "/assignments" : "/dashboard",
        };
      });

    const noticeRows = await ctx.db.query("notices").collect();
    const notices: SearchHit[] = noticeRows
      .filter((n) => hit(n.title, n.body, n.category, n.author))
      .sort((a, b) => b.publishedAt - a.publishedAt)
      .map((n) => ({
        id: n._id as string,
        title: n.title,
        meta: `${n.category} · ${n.author} · ${n.dateStr}`,
        href: "/notices",
      }));

    // People: teachers may look up their students, admins may look up anyone.
    const people: SearchHit[] = [];
    if (user.role !== "student") {
      const allUsers = await ctx.db.query("users").collect();
      for (const u of allUsers) {
        if (u.role === "admin" && user.role !== "admin") continue;
        if (
          u.role === "student" &&
          user.role === "teacher" &&
          !classNames.includes(u.className ?? "")
        )
          continue;
        if (
          hit(
            u.name ?? "",
            u.portalId ?? "",
            u.email ?? "",
            u.rollNo ?? "",
            u.className ?? "",
            u.designation ?? "",
          )
        ) {
          people.push({
            id: u._id as string,
            title: u.name ?? "Unnamed",
            meta: `${u.portalId ?? ""} · ${u.role ?? ""} · ${u.className ?? u.department ?? u.designation ?? ""}`,
            href: user.role === "admin" ? "/admin/students" : "/teach/classes",
          });
        }
      }
    }

    return { notes, assignments, subjects, notices, people };
  },
});
