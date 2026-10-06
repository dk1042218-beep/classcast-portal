import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { hashPassword } from "./auth/password";
import { isoDate, requireAdmin } from "./lib";

/**
 * Administration desk: every function here is gated by requireAdmin, so no
 * other role can reach user management, academics editing, reports or
 * portal settings even by calling the API directly.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

async function portalSettings(ctx: QueryCtx) {
  return await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", "portal"))
    .unique();
}

/** Admin dashboard: institution-wide counts straight from the database. */
export const overview = query({
  args: {},
  handler: async (ctx) => {
    const admin = await requireAdmin(ctx);

    const users = await ctx.db.query("users").collect();
    const students = users.filter(
      (u) => u.role === "student" && u.status !== "inactive",
    );
    const teachers = users.filter(
      (u) => u.role === "teacher" && u.status !== "inactive",
    );
    const inactive = users.filter((u) => u.status === "inactive").length;

    const classes = await ctx.db.query("classes").collect();
    const subjects = await ctx.db.query("subjects").collect();
    const timetable = await ctx.db.query("timetable").collect();
    const activities = await ctx.db.query("activities").collect();
    const submissions = await ctx.db.query("submissions").collect();
    const notices = await ctx.db.query("notices").collect();
    const notes = await ctx.db.query("notes").collect();
    const attendance = await ctx.db.query("attendance").collect();

    const present = attendance.filter((a) => a.status !== "absent").length;
    const today = isoDate(Date.now());
    const todayRows = attendance.filter((a) => a.date === today);
    const graded = submissions.filter((s) => s.score !== undefined).length;
    const late = submissions.filter((s) => s.isLate).length;

    const now = Date.now();
    const upcoming = activities
      .filter((a) => a.dueAt > now)
      .sort((a, b) => a.dueAt - b.dueAt)
      .slice(0, 5)
      .map((a) => ({
        id: a._id,
        title: a.title,
        className: a.className,
        dueAt: a.dueAt,
        points: a.points,
      }));

    const recentNotices = notices
      .slice()
      .sort((a, b) => b.publishedAt - a.publishedAt)
      .slice(0, 4)
      .map((n) => ({
        id: n._id,
        title: n.title,
        category: n.category,
        audience: n.audience,
        dateStr: n.dateStr,
        pinned: n.pinned,
      }));

    return {
      admin: {
        name: admin.name ?? "Administrator",
        portalId: admin.portalId ?? "",
        email: admin.email ?? "",
      },
      counts: {
        students: students.length,
        teachers: teachers.length,
        inactive,
        classes: classes.length,
        subjects: subjects.length,
        lectures: timetable.length,
        activities: activities.length,
        submissions: submissions.length,
        ungraded: submissions.length - graded,
        late,
        notices: notices.length,
        notes: notes.length,
      },
      attendance: {
        total: attendance.length,
        present,
        pct: attendance.length
          ? Math.round((present / attendance.length) * 100)
          : 0,
        todayRecords: todayRows.length,
      },
      settings: (await portalSettings(ctx)) ?? null,
      upcoming,
      recentNotices,
    };
  },
});

/** User directory for the student or teacher management desk. */
export const usersList = query({
  args: {
    role: v.union(v.literal("student"), v.literal("teacher")),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const needle = (args.search ?? "").trim().toLowerCase();

    const users = await ctx.db.query("users").collect();
    const matched = users.filter((u) => {
      if (u.role !== args.role) return false;
      if (!needle) return true;
      return [
        u.name ?? "",
        u.portalId ?? "",
        u.email ?? "",
        u.className ?? "",
        u.rollNo ?? "",
        u.department ?? "",
        u.designation ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });

    const out = [];
    for (const u of matched) {
      let attendance: { pct: number; total: number } | null = null;
      let subjectCount = 0;
      if (u.role === "student") {
        const rows = await ctx.db
          .query("attendance")
          .withIndex("by_student", (q) => q.eq("studentId", u._id))
          .collect();
        const hits = rows.filter((r) => r.status !== "absent").length;
        attendance = {
          total: rows.length,
          pct: rows.length ? Math.round((hits / rows.length) * 100) : 0,
        };
      } else {
        const rows = await ctx.db
          .query("subjects")
          .withIndex("by_teacher", (q) => q.eq("teacherId", u._id))
          .collect();
        subjectCount = rows.length;
      }
      out.push({
        id: u._id,
        name: u.name ?? "",
        portalId: u.portalId ?? "",
        email: u.email ?? "",
        phone: u.phone ?? "",
        className: u.className ?? "",
        rollNo: u.rollNo ?? "",
        department: u.department ?? "",
        designation: u.designation ?? "",
        status: u.status ?? "active",
        attendance,
        subjectCount,
      });
    }
    out.sort(
      (a, b) =>
        (a.className || "").localeCompare(b.className || "") ||
        (a.rollNo || "").localeCompare(b.rollNo || "") ||
        a.name.localeCompare(b.name),
    );
    return out;
  },
});

/** Classes, subjects, teachers and timetable rows for academics management. */
export const academics = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const users = await ctx.db.query("users").collect();
    const students = users.filter((u) => u.role === "student");
    const teachers = users
      .filter((u) => u.role === "teacher")
      .map((u) => ({
        id: u._id,
        name: u.name ?? "",
        portalId: u.portalId ?? "",
        department: u.department ?? "",
        designation: u.designation ?? "",
        status: u.status ?? "active",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const classes = (await ctx.db.query("classes").collect())
      .map((c) => ({
        id: c._id,
        name: c.name,
        code: c.code,
        academicYear: c.academicYear,
        term: c.term,
        semester: c.semester ?? null,
        division: c.division ?? null,
        mentor: c.mentor,
        room: c.room,
        strength: students.filter(
          (s) => s.className === c.name && s.status !== "inactive",
        ).length,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const subjectDocs = await ctx.db.query("subjects").collect();
    const subjects = [];
    for (const s of subjectDocs) {
      const teacher = await ctx.db.get(s.teacherId);
      const acts = await ctx.db
        .query("activities")
        .withIndex("by_subject", (q) => q.eq("subjectId", s._id))
        .collect();
      subjects.push({
        id: s._id,
        name: s.name,
        code: s.code,
        className: s.className,
        room: s.room,
        credits: s.credits,
        teacherId: s.teacherId,
        teacher: teacher?.name ?? "Not allotted",
        activitiesCount: acts.length,
      });
    }
    subjects.sort(
      (a, b) =>
        a.className.localeCompare(b.className) || a.code.localeCompare(b.code),
    );

    const timetableRows = await ctx.db.query("timetable").collect();
    const subjectCodes = new Map(subjectDocs.map((s) => [s._id, s.code]));
    const timetable = timetableRows.map((t) => ({
      id: t._id,
      className: t.className,
      day: t.day,
      slot: t.slot,
      start: t.start,
      end: t.end,
      room: t.room,
      subjectId: t.subjectId,
      subjectCode: subjectCodes.get(t.subjectId) ?? "",
    }));

    const semesters = Array.from(
      new Set(classes.map((c) => c.semester).filter((s): s is number => s !== null)),
    ).sort((a, b) => a - b);
    const divisions = Array.from(
      new Set(
        classes.map((c) => c.division).filter((d): d is string => d !== null),
      ),
    ).sort();

    return {
      classes,
      subjects,
      teachers,
      timetable,
      semesters,
      divisions,
      settings: (await portalSettings(ctx)) ?? null,
    };
  },
});

/** Institution attendance report with per-student and per-subject aggregates. */
export const attendanceReport = query({
  args: {
    className: v.optional(v.string()),
    subjectId: v.optional(v.id("subjects")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    let rows = await ctx.db.query("attendance").collect();
    if (args.className) rows = rows.filter((r) => r.className === args.className);
    if (args.subjectId) rows = rows.filter((r) => r.subjectId === args.subjectId);

    const users = await ctx.db.query("users").collect();
    const nameOf = new Map(users.map((u) => [u._id, u]));
    const subjectDocs = await ctx.db.query("subjects").collect();
    const subjectOf = new Map(subjectDocs.map((s) => [s._id, s]));

    // Per-student aggregates.
    const perStudent = new Map<
      string,
      { present: number; absent: number; late: number; total: number }
    >();
    const perSubject = new Map<
      string,
      { present: number; total: number; className: string }
    >();
    const perDay = new Map<string, { present: number; total: number }>();
    let present = 0;
    for (const row of rows) {
      const hit = row.status !== "absent";
      if (hit) present++;
      const s = perStudent.get(row.studentId) ?? {
        present: 0,
        absent: 0,
        late: 0,
        total: 0,
      };
      s.total++;
      if (row.status === "absent") s.absent++;
      else s.present++;
      if (row.status === "late") s.late++;
      perStudent.set(row.studentId, s);

      const sub = perSubject.get(row.subjectId) ?? {
        present: 0,
        total: 0,
        className: row.className,
      };
      sub.total++;
      if (hit) sub.present++;
      perSubject.set(row.subjectId, sub);

      const d = perDay.get(row.date) ?? { present: 0, total: 0 };
      d.total++;
      if (hit) d.present++;
      perDay.set(row.date, d);
    }

    const students = Array.from(perStudent.entries())
      .map(([id, agg]) => {
        const u = nameOf.get(id as Id<"users">);
        return {
          studentId: id,
          name: u?.name ?? "Student",
          rollNo: u?.rollNo ?? "",
          portalId: u?.portalId ?? "",
          className: u?.className ?? "",
          present: agg.present,
          absent: agg.absent,
          late: agg.late,
          total: agg.total,
          pct: agg.total ? Math.round((agg.present / agg.total) * 100) : 0,
        };
      })
      .sort(
        (a, b) =>
          a.className.localeCompare(b.className) ||
          a.rollNo.localeCompare(b.rollNo),
      );

    const subjects = Array.from(perSubject.entries())
      .map(([id, agg]) => ({
        subjectId: id,
        code: subjectOf.get(id as Id<"subjects">)?.code ?? "",
        name: subjectOf.get(id as Id<"subjects">)?.name ?? "",
        className: agg.className,
        present: agg.present,
        total: agg.total,
        pct: agg.total ? Math.round((agg.present / agg.total) * 100) : 0,
      }))
      .sort((a, b) => a.code.localeCompare(b.code));

    const days = Array.from(perDay.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 30)
      .map(([date, agg]) => ({
        date,
        present: agg.present,
        total: agg.total,
        pct: agg.total ? Math.round((agg.present / agg.total) * 100) : 0,
      }));

    const classNames = Array.from(new Set(rows.map((r) => r.className)));

    return {
      total: rows.length,
      present,
      pct: rows.length ? Math.round((present / rows.length) * 100) : 0,
      students,
      subjects,
      days,
      classNames,
      filter: { className: args.className ?? null, subjectId: args.subjectId ?? null },
    };
  },
});

/** Assignments and submissions across the whole portal. */
export const assignmentsOverview = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const activities = await ctx.db.query("activities").collect();
    const subjectDocs = await ctx.db.query("subjects").collect();
    const subjectOf = new Map(subjectDocs.map((s) => [s._id, s]));
    const users = await ctx.db.query("users").collect();
    const userOf = new Map(users.map((u) => [u._id, u]));

    const list = [];
    for (const a of activities) {
      const subs = await ctx.db
        .query("submissions")
        .withIndex("by_activity", (q) => q.eq("activityId", a._id))
        .collect();
      list.push({
        id: a._id,
        title: a.title,
        className: a.className,
        subjectCode: subjectOf.get(a.subjectId)?.code ?? "",
        dueAt: a.dueAt,
        dueDateStr: a.dueDateStr,
        points: a.points,
        publishedAt: a.publishedAt,
        submitted: subs.length,
        graded: subs.filter((s) => s.score !== undefined).length,
        late: subs.filter((s) => s.isLate).length,
      });
    }
    list.sort((a, b) => b.dueAt - a.dueAt);

    const submissions = await ctx.db.query("submissions").collect();
    const recent = submissions
      .slice()
      .sort((a, b) => b.submittedAt - a.submittedAt)
      .slice(0, 15)
      .map((s) => {
        const act = activities.find((a) => a._id === s.activityId);
        return {
          id: s._id,
          activity: act?.title ?? "Assignment",
          className: act?.className ?? "",
          student: userOf.get(s.studentId)?.name ?? "Student",
          submittedAt: s.submittedAt,
          isLate: s.isLate,
          score: s.score ?? null,
          points: act?.points ?? null,
        };
      });

    return {
      activities: list,
      recent,
      totals: {
        activities: activities.length,
        submissions: submissions.length,
        graded: submissions.filter((s) => s.score !== undefined).length,
        ungraded: submissions.filter((s) => s.score === undefined).length,
        late: submissions.filter((s) => s.isLate).length,
      },
    };
  },
});

/** Portal-wide settings row (null until first saved). */
export const settingsGet = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return (await portalSettings(ctx)) ?? null;
  },
});

// --- MUTATIONS ---

/** Create a student or teacher account with a portal ID and password. */
export const createUser = mutation({
  args: {
    role: v.union(v.literal("student"), v.literal("teacher")),
    name: v.string(),
    portalId: v.string(),
    email: v.string(),
    password: v.string(),
    phone: v.optional(v.string()),
    className: v.optional(v.string()),
    rollNo: v.optional(v.string()),
    department: v.optional(v.string()),
    designation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const name = args.name.trim();
    if (name.length < 2 || name.length > 80) throw new Error("Enter a valid name");

    const portalId = args.portalId.trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9-]{2,19}$/.test(portalId)) {
      throw new Error("Portal ID must be 3-20 letters, numbers or dashes");
    }
    const existingId = await ctx.db
      .query("users")
      .withIndex("portalId", (q) => q.eq("portalId", portalId))
      .unique();
    if (existingId !== null) throw new Error("That portal ID is already in use");

    const email = args.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 120) {
      throw new Error("Enter a valid email address");
    }
    const existingEmail = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();
    if (existingEmail !== null) throw new Error("That email is already in use");

    if (args.password.length < 8 || args.password.length > 128) {
      throw new Error("Password must be at least 8 characters");
    }

    let className: string | undefined;
    if (args.role === "student") {
      className = (args.className ?? "").trim();
      if (!className) throw new Error("Choose a class for this student");
      const classDoc = await ctx.db
        .query("classes")
        .withIndex("by_name", (q) => q.eq("name", className!))
        .unique();
      if (classDoc === null) throw new Error("That class does not exist");
      const rollNo = (args.rollNo ?? "").trim();
      if (!rollNo) throw new Error("Enter a roll number");
    }

    const hash = await hashPassword(args.password);
    const userId = await ctx.db.insert("users", {
      name,
      email,
      role: args.role,
      portalId,
      phone: (args.phone ?? "").trim() || undefined,
      className,
      rollNo: args.role === "student" ? (args.rollNo ?? "").trim() : undefined,
      department:
        args.role === "teacher" ? (args.department ?? "").trim() || undefined : undefined,
      designation:
        args.role === "teacher" ? (args.designation ?? "").trim() || undefined : undefined,
      status: "active",
    });
    await ctx.db.insert("credentials", {
      userId,
      hash,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("notifications", {
      userId,
      kind: "account",
      title: `Welcome to ClassCast, ${name}`,
      body: `Your ${args.role} account ${portalId} has been created by the registry.`,
      read: false,
      createdAt: Date.now(),
      href: "/dashboard",
    });
    return { id: userId };
  },
});

/** Edit any account's record: contact details, class allotment, status. */
export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    className: v.optional(v.string()),
    rollNo: v.optional(v.string()),
    department: v.optional(v.string()),
    designation: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const target = await ctx.db.get(args.userId);
    if (!target || (target.role !== "student" && target.role !== "teacher")) {
      throw new Error("Account not found");
    }

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
    if (emailOwner !== null && emailOwner._id !== target._id) {
      throw new Error("That email is already in use");
    }

    const patch: Partial<Doc<"users">> = {
      name,
      email,
      phone: (args.phone ?? "").trim() || undefined,
    };

    if (target.role === "student") {
      const className = (args.className ?? target.className ?? "").trim();
      if (!className) throw new Error("Choose a class for this student");
      const classDoc = await ctx.db
        .query("classes")
        .withIndex("by_name", (q) => q.eq("name", className))
        .unique();
      if (classDoc === null) throw new Error("That class does not exist");
      const rollNo = (args.rollNo ?? target.rollNo ?? "").trim();
      if (!rollNo) throw new Error("Enter a roll number");
      patch.className = className;
      patch.rollNo = rollNo;
    } else {
      patch.department = (args.department ?? target.department ?? "").trim() || undefined;
      patch.designation = (args.designation ?? target.designation ?? "").trim() || undefined;
    }
    if (args.status) patch.status = args.status;

    await ctx.db.patch(target._id, patch);
    return true;
  },
});

/** Admin password reset — re-hashes and replaces the account password. */
export const resetUserPassword = mutation({
  args: {
    userId: v.id("users"),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("Account not found");
    if (args.password.length < 8 || args.password.length > 128) {
      throw new Error("Password must be at least 8 characters");
    }
    const hash = await hashPassword(args.password);
    const credential = await ctx.db
      .query("credentials")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    if (credential) {
      await ctx.db.patch(credential._id, { hash, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("credentials", {
        userId: args.userId,
        hash,
        updatedAt: Date.now(),
      });
    }
    await ctx.db.insert("notifications", {
      userId: args.userId,
      kind: "account",
      title: "Password reset by administration",
      body: "Your ClassCast password was reset from the registry desk. Sign in with the new password.",
      read: false,
      createdAt: Date.now(),
    });
    return true;
  },
});

/** Register a new class (course division). */
export const createClass = mutation({
  args: {
    name: v.string(),
    code: v.string(),
    academicYear: v.string(),
    term: v.string(),
    semester: v.optional(v.number()),
    division: v.optional(v.string()),
    mentor: v.string(),
    room: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const name = args.name.trim();
    if (name.length < 2 || name.length > 60) throw new Error("Enter a valid class name");
    const code = args.code.trim();
    if (!/^[A-Za-z0-9-]{2,12}$/.test(code)) {
      throw new Error("Class code must be 2-12 letters or numbers");
    }
    const exists = await ctx.db
      .query("classes")
      .withIndex("by_name", (q) => q.eq("name", name))
      .unique();
    if (exists !== null) throw new Error("That class already exists");
    if (!args.academicYear.trim() || args.academicYear.length > 20) {
      throw new Error("Enter an academic year like 2026-27");
    }
    if (!args.term.trim() || args.term.length > 40) throw new Error("Enter a term");
    if (!args.mentor.trim()) throw new Error("Enter a class mentor");
    if (!args.room.trim()) throw new Error("Enter a home room");
    if (args.semester !== undefined && (args.semester < 1 || args.semester > 12)) {
      throw new Error("Semester must be between 1 and 12");
    }

    const id = await ctx.db.insert("classes", {
      name,
      code,
      academicYear: args.academicYear.trim(),
      term: args.term.trim(),
      semester: args.semester,
      division: (args.division ?? "").trim() || undefined,
      mentor: args.mentor.trim(),
      room: args.room.trim(),
    });
    return { id };
  },
});

/** Edit a class. The class name is the register key and cannot change. */
export const updateClass = mutation({
  args: {
    id: v.id("classes"),
    name: v.string(),
    code: v.string(),
    academicYear: v.string(),
    term: v.string(),
    semester: v.optional(v.number()),
    division: v.optional(v.string()),
    mentor: v.string(),
    room: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Class not found");
    if (args.name.trim() !== existing.name) {
      throw new Error("The class name cannot be changed after registration");
    }
    if (!args.academicYear.trim() || args.academicYear.length > 20) {
      throw new Error("Enter an academic year like 2026-27");
    }
    if (!args.term.trim() || args.term.length > 40) throw new Error("Enter a term");
    if (!args.mentor.trim()) throw new Error("Enter a class mentor");
    if (!args.room.trim()) throw new Error("Enter a home room");
    if (args.semester !== undefined && (args.semester < 1 || args.semester > 12)) {
      throw new Error("Semester must be between 1 and 12");
    }
    await ctx.db.patch(args.id, {
      code: args.code.trim(),
      academicYear: args.academicYear.trim(),
      term: args.term.trim(),
      semester: args.semester,
      division: (args.division ?? "").trim() || undefined,
      mentor: args.mentor.trim(),
      room: args.room.trim(),
    });
    return true;
  },
});

/** Create a subject and allot it to a teacher. */
export const createSubject = mutation({
  args: {
    name: v.string(),
    code: v.string(),
    className: v.string(),
    teacherId: v.id("users"),
    room: v.string(),
    credits: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const name = args.name.trim();
    if (name.length < 2 || name.length > 80) throw new Error("Enter a valid subject name");
    const code = args.code.trim();
    if (!/^[A-Za-z0-9-]{2,16}$/.test(code)) {
      throw new Error("Subject code must be 2-16 letters or numbers");
    }
    const classDoc = await ctx.db
      .query("classes")
      .withIndex("by_name", (q) => q.eq("name", args.className))
      .unique();
    if (classDoc === null) throw new Error("That class does not exist");
    const teacher = await ctx.db.get(args.teacherId);
    if (!teacher || teacher.role !== "teacher") throw new Error("Choose a teacher");
    if (teacher.status === "inactive") throw new Error("That teacher account is inactive");
    if (args.credits < 1 || args.credits > 10) throw new Error("Credits must be 1-10");

    const id = await ctx.db.insert("subjects", {
      name,
      code,
      className: args.className,
      teacherId: args.teacherId,
      room: args.room.trim() || classDoc.room,
      credits: Math.round(args.credits),
    });
    return { id };
  },
});

/** Re-allot or edit a subject. */
export const updateSubject = mutation({
  args: {
    id: v.id("subjects"),
    name: v.string(),
    code: v.string(),
    className: v.string(),
    teacherId: v.id("users"),
    room: v.string(),
    credits: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Subject not found");
    const name = args.name.trim();
    if (name.length < 2 || name.length > 80) throw new Error("Enter a valid subject name");
    const classDoc = await ctx.db
      .query("classes")
      .withIndex("by_name", (q) => q.eq("name", args.className))
      .unique();
    if (classDoc === null) throw new Error("That class does not exist");
    const teacher = await ctx.db.get(args.teacherId);
    if (!teacher || teacher.role !== "teacher") throw new Error("Choose a teacher");
    if (args.credits < 1 || args.credits > 10) throw new Error("Credits must be 1-10");

    await ctx.db.patch(args.id, {
      name,
      code: args.code.trim(),
      className: args.className,
      teacherId: args.teacherId,
      room: args.room.trim() || classDoc.room,
      credits: Math.round(args.credits),
    });
    return true;
  },
});

/** Remove a subject that nothing depends on yet. */
export const deleteSubject = mutation({
  args: { id: v.id("subjects") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Subject not found");

    const slots = (await ctx.db.query("timetable").collect()).filter(
      (t) => t.subjectId === args.id,
    );
    if (slots.length > 0) {
      throw new Error("Clear this subject from the timetable first");
    }
    const acts = await ctx.db
      .query("activities")
      .withIndex("by_subject", (q) => q.eq("subjectId", args.id))
      .collect();
    if (acts.length > 0) {
      throw new Error("This subject already has assignments and cannot be deleted");
    }
    const noteRows = await ctx.db
      .query("notes")
      .withIndex("by_subject", (q) => q.eq("subjectId", args.id))
      .collect();
    if (noteRows.length > 0) {
      throw new Error("This subject already has notes and cannot be deleted");
    }
    const att = await ctx.db
      .query("attendance")
      .withIndex("by_subject", (q) => q.eq("subjectId", args.id))
      .take(1);
    if (att.length > 0) {
      throw new Error("This subject already has attendance records and cannot be deleted");
    }

    await ctx.db.delete(args.id);
    return true;
  },
});

/** Set (upsert) one timetable slot for a class. */
export const setTimetableSlot = mutation({
  args: {
    className: v.string(),
    day: v.string(),
    slot: v.number(),
    start: v.string(),
    end: v.string(),
    subjectId: v.id("subjects"),
    room: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const classDoc = await ctx.db
      .query("classes")
      .withIndex("by_name", (q) => q.eq("name", args.className))
      .unique();
    if (classDoc === null) throw new Error("That class does not exist");
    const day = args.day.toLowerCase();
    if (!["mon", "tue", "wed", "thu", "fri", "sat"].includes(day)) {
      throw new Error("Invalid day");
    }
    if (!Number.isInteger(args.slot) || args.slot < 1 || args.slot > 8) {
      throw new Error("Invalid slot");
    }
    if (!TIME_RE.test(args.start) || !TIME_RE.test(args.end)) {
      throw new Error("Times must be HH:MM");
    }
    if (args.start >= args.end) throw new Error("Start time must be before end time");

    const subject = await ctx.db.get(args.subjectId);
    if (!subject) throw new Error("Subject not found");
    if (subject.className !== args.className) {
      throw new Error("That subject does not belong to this class");
    }

    const existing = await ctx.db
      .query("timetable")
      .withIndex("by_class_day", (q) =>
        q.eq("className", args.className).eq("day", day),
      )
      .collect();
    const match = existing.find((t) => t.slot === args.slot);
    if (match) {
      await ctx.db.patch(match._id, {
        start: args.start,
        end: args.end,
        subjectId: args.subjectId,
        room: args.room.trim() || subject.room,
      });
      return { id: match._id, updated: true };
    }
    const id = await ctx.db.insert("timetable", {
      className: args.className,
      day,
      slot: args.slot,
      start: args.start,
      end: args.end,
      subjectId: args.subjectId,
      room: args.room.trim() || subject.room,
    });
    return { id, updated: false };
  },
});

/** Clear one timetable slot. */
export const clearTimetableSlot = mutation({
  args: {
    className: v.string(),
    day: v.string(),
    slot: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const rows = await ctx.db
      .query("timetable")
      .withIndex("by_class_day", (q) =>
        q.eq("className", args.className).eq("day", args.day),
      )
      .collect();
    const match = rows.find((t) => t.slot === args.slot);
    if (!match) throw new Error("That slot is empty");
    await ctx.db.delete(match._id);
    return true;
  },
});

/** Post a portal notice (audience: everyone or one class) and notify users. */
export const createNotice = mutation({
  args: {
    title: v.string(),
    body: v.string(),
    category: v.string(),
    audience: v.string(),
    pinned: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const title = args.title.trim();
    if (title.length < 3 || title.length > 180) throw new Error("Invalid title");
    if (args.body.trim().length < 10) throw new Error("Notice text too short");
    const category = ["academic", "examination", "event", "circular", "placement"]
      .includes(args.category)
      ? args.category
      : "circular";

    const audience = args.audience;
    if (audience !== "all") {
      const classDoc = await ctx.db
        .query("classes")
        .withIndex("by_name", (q) => q.eq("name", audience))
        .unique();
      if (classDoc === null) throw new Error("Choose a valid audience");
    }

    const now = Date.now();
    const id = await ctx.db.insert("notices", {
      title,
      body: args.body.trim(),
      category,
      audience,
      author: `${admin.name ?? "Administration"} · Office of Academics`,
      pinned: args.pinned ?? false,
      publishedAt: now,
      dateStr: isoDate(now),
      issuedById: admin._id,
    });

    // Notify the audience.
    const users = await ctx.db.query("users").collect();
    for (const u of users) {
      if (u.status === "inactive") continue;
      const targeted =
        audience === "all"
          ? u.role === "student" || u.role === "teacher"
          : u.role === "student" && u.className === audience;
      if (!targeted) continue;
      await ctx.db.insert("notifications", {
        userId: u._id,
        kind: "notice",
        title: `Notice: ${title}`,
        body: `${category} · ${audience === "all" ? "All desks" : audience}`,
        read: false,
        createdAt: now,
        href: "/notices",
      });
    }
    return { id };
  },
});

/** Remove any notice (administration override). */
export const deleteNotice = mutation({
  args: { id: v.id("notices") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const notice = await ctx.db.get(args.id);
    if (!notice) throw new Error("Notice not found");
    await ctx.db.delete(args.id);
    return true;
  },
});

/** Save portal-wide academic settings. */
export const updateSettings = mutation({
  args: {
    academicYear: v.string(),
    term: v.string(),
    minAttendance: v.number(),
    contact: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const academicYear = args.academicYear.trim();
    if (!academicYear || academicYear.length > 20) {
      throw new Error("Enter an academic year like 2026-27");
    }
    const term = args.term.trim();
    if (!term || term.length > 40) throw new Error("Enter a term");
    if (!Number.isFinite(args.minAttendance) || args.minAttendance < 0 || args.minAttendance > 100) {
      throw new Error("Minimum attendance must be 0-100%");
    }
    const contact = args.contact.trim();
    if (!contact || contact.length > 160) throw new Error("Enter a contact line");

    const existing = await portalSettings(ctx);
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        academicYear,
        term,
        minAttendance: Math.round(args.minAttendance),
        contact,
        updatedBy: admin.portalId ?? admin.name ?? "admin",
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("settings", {
        key: "portal",
        academicYear,
        term,
        minAttendance: Math.round(args.minAttendance),
        contact,
        updatedBy: admin.portalId ?? admin.name ?? "admin",
        updatedAt: now,
      });
    }
    return true;
  },
});
