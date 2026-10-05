import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireStudent } from "./lib";

/** Weekly timetable for the student's class, grouped for the grid view. */
export const timetableWeek = query({
  args: {},
  handler: async (ctx) => {
    const student = await requireStudent(ctx);
    const className = student.className ?? "";
    const classDoc = className
      ? await ctx.db
          .query("classes")
          .withIndex("by_name", (q) => q.eq("name", className))
          .unique()
      : null;

    const rows = className
      ? await ctx.db
          .query("timetable")
          .withIndex("by_class_day", (q) => q.eq("className", className))
          .collect()
      : [];

    const entries = [];
    const subjectIds = new Set(rows.map((r) => r.subjectId));
    const subjects: {
      id: string;
      code: string;
      name: string;
      teacher: string;
      room: string;
      credits: number;
    }[] = [];
    for (const id of subjectIds) {
      const subject = await ctx.db.get(id);
      if (!subject) continue;
      const teacher = await ctx.db.get(subject.teacherId);
      subjects.push({
        id: subject._id,
        code: subject.code,
        name: subject.name,
        teacher: teacher?.name ?? "Not allotted",
        room: subject.room,
        credits: subject.credits,
      });
    }
    const byId = new Map(subjects.map((s) => [s.id, s]));

    for (const row of rows) {
      const subject = byId.get(row.subjectId);
      if (!subject) continue;
      entries.push({
        day: row.day,
        slot: row.slot,
        start: row.start,
        end: row.end,
        room: row.room,
        subject,
      });
    }
    entries.sort(
      (a, b) => a.day.localeCompare(b.day) || a.slot - b.slot,
    );

    return {
      className,
      classInfo: classDoc
        ? {
            mentor: classDoc.mentor,
            academicYear: classDoc.academicYear,
            term: classDoc.term,
          }
        : null,
      subjects: subjects.sort((a, b) => a.code.localeCompare(b.code)),
      entries,
    };
  },
});

/** Full attendance picture: overall, subject-wise and dated history. */
export const attendanceSummary = query({
  args: { historyLimit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const student = await requireStudent(ctx);
    const className = student.className ?? "";
    const historyLimit = Math.min(Math.max(args.historyLimit ?? 30, 5), 200);

    const subjectDocs = className
      ? await ctx.db
          .query("subjects")
          .withIndex("by_class", (q) => q.eq("className", className))
          .collect()
      : [];
    const subjectById = new Map(subjectDocs.map((s) => [s._id, s]));
    const teacherName = new Map<string, string>();
    for (const subject of subjectDocs) {
      const teacher = await ctx.db.get(subject.teacherId);
      teacherName.set(subject._id, teacher?.name ?? "Not allotted");
    }

    const rows = await ctx.db
      .query("attendance")
      .withIndex("by_student", (q) => q.eq("studentId", student._id))
      .collect();

    const perSubject = new Map<
      string,
      { present: number; absent: number; late: number; total: number }
    >();
    let present = 0;
    let late = 0;
    for (const row of rows) {
      const hit = row.status !== "absent";
      if (hit) present++;
      if (row.status === "late") late++;
      const agg = perSubject.get(row.subjectId) ?? {
        present: 0,
        absent: 0,
        late: 0,
        total: 0,
      };
      agg.total++;
      if (row.status === "absent") agg.absent++;
      else agg.present++;
      if (row.status === "late") agg.late++;
      perSubject.set(row.subjectId, agg);
    }

    const subjects = subjectDocs
      .map((subject) => {
        const agg = perSubject.get(subject._id) ?? {
          present: 0,
          absent: 0,
          late: 0,
          total: 0,
        };
        const pct = agg.total ? Math.round((agg.present / agg.total) * 100) : 0;
        const shortfall = pct < 75 ? Math.ceil(0.75 * agg.total) - agg.present : 0;
        return {
          subjectId: subject._id,
          code: subject.code,
          name: subject.name,
          teacher: teacherName.get(subject._id) ?? "Not allotted",
          room: subject.room,
          present: agg.present,
          absent: agg.absent,
          late: agg.late,
          total: agg.total,
          pct,
          shortfall,
        };
      })
      .sort((a, b) => a.code.localeCompare(b.code));

    const history = rows
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, historyLimit)
      .map((row) => {
        const subject = subjectById.get(row.subjectId);
        return {
          id: row._id,
          date: row.date,
          day: row.day,
          status: row.status,
          subjectCode: subject?.code ?? "",
          subject: subject?.name ?? "",
          teacher: teacherName.get(row.subjectId) ?? "Not allotted",
        };
      });

    const total = rows.length;
    const overallPct = total ? Math.round((present / total) * 100) : 0;
    return {
      overall: {
        present,
        late,
        absent: total - present,
        total,
        pct: overallPct,
        shortfall: overallPct < 75 ? Math.ceil(0.75 * total) - present : 0,
      },
      subjects,
      history,
      historyTotal: total,
    };
  },
});

/** Notice board, pinned first. */
export const noticesList = query({
  args: {},
  handler: async (ctx) => {
    const student = await requireStudent(ctx);
    void student;
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
        author: n.author,
        pinned: n.pinned,
        dateStr: n.dateStr,
        publishedAt: n.publishedAt,
      }));
  },
});

/** The student's notifications, newest first. */
export const notificationsList = query({
  args: {},
  handler: async (ctx) => {
    const student = await requireStudent(ctx);
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_user_created", (q) => q.eq("userId", student._id))
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
    const student = await requireStudent(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== student._id) throw new Error("Not authorized");
    if (!row.read) await ctx.db.patch(args.id, { read: true });
    return true;
  },
});

export const markAllNotificationsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const student = await requireStudent(ctx);
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_user_created", (q) => q.eq("userId", student._id))
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
