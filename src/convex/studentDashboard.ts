import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { DAY_MS, isDayKey, isIsoDate, requireStudent } from "./lib";

const GRACE_MS = 2 * DAY_MS;

export type ActivityState = "open" | "overdue" | "submitted" | "graded" | "missing";

function stateOf(
  activity: Doc<"activities">,
  submission: Doc<"submissions"> | undefined,
  now: number,
): ActivityState {
  if (submission) return submission.score !== undefined ? "graded" : "submitted";
  if (activity.dueAt > now) return "open";
  return now > activity.dueAt + GRACE_MS ? "missing" : "overdue";
}

/**
 * Everything the student dashboard shows, in one reactive subscription:
 * today's timetable, attendance by subject, deadlines, submission status,
 * the notice board, recent notes and unread notifications.
 */
export const overview = query({
  args: { today: v.string(), day: v.string() },
  handler: async (ctx, args) => {
    const student = await requireStudent(ctx);
    if (!isIsoDate(args.today) || !isDayKey(args.day)) {
      throw new Error("Invalid date");
    }
    const className = student.className ?? "";
    const now = Date.now();

    const classDoc = className
      ? await ctx.db
          .query("classes")
          .withIndex("by_name", (q) => q.eq("name", className))
          .unique()
      : null;

    const subjectDocs = className
      ? await ctx.db
          .query("subjects")
          .withIndex("by_class", (q) => q.eq("className", className))
          .collect()
      : [];

    const subjects = [];
    const subjectById = new Map<string, (typeof subjects)[number]>();
    for (const subject of subjectDocs) {
      const teacher = await ctx.db.get(subject.teacherId);
      const entry = {
        id: subject._id,
        code: subject.code,
        name: subject.name,
        room: subject.room,
        credits: subject.credits,
        teacher: teacher?.name ?? "Not allotted",
        teacherId: subject.teacherId,
      };
      subjects.push(entry);
      subjectById.set(subject._id, entry);
    }

    // Today's lectures.
    const todayRows = className
      ? await ctx.db
          .query("timetable")
          .withIndex("by_class_day", (q) =>
            q.eq("className", className).eq("day", args.day),
          )
          .collect()
      : [];
    const today = todayRows
      .map((row) => {
        const subject = subjectById.get(row.subjectId);
        if (!subject) return null;
        return {
          slot: row.slot,
          start: row.start,
          end: row.end,
          room: row.room,
          subject,
        };
      })
      .filter((row) => row !== null)
      .sort((a, b) => a.slot - b.slot);

    // Attendance register for this student.
    const attendanceRows = await ctx.db
      .query("attendance")
      .withIndex("by_student", (q) => q.eq("studentId", student._id))
      .collect();
    const perSubject = new Map<string, { present: number; total: number }>();
    let present = 0;
    for (const row of attendanceRows) {
      const hit = row.status !== "absent";
      if (hit) present++;
      const agg = perSubject.get(row.subjectId) ?? { present: 0, total: 0 };
      agg.total++;
      if (hit) agg.present++;
      perSubject.set(row.subjectId, agg);
    }
    const attendance = {
      present,
      total: attendanceRows.length,
      pct: attendanceRows.length
        ? Math.round((present / attendanceRows.length) * 100)
        : 0,
      bySubject: subjects.map((subject) => {
        const agg = perSubject.get(subject.id);
        const total = agg?.total ?? 0;
        const hits = agg?.present ?? 0;
        return {
          subjectId: subject.id,
          code: subject.code,
          name: subject.name,
          teacher: subject.teacher,
          present: hits,
          total,
          pct: total ? Math.round((hits / total) * 100) : 0,
        };
      }),
    };

    // Activities and this student's submissions.
    const activities = className
      ? await ctx.db
          .query("activities")
          .withIndex("by_class", (q) => q.eq("className", className))
          .collect()
      : [];
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_student", (q) => q.eq("studentId", student._id))
      .collect();
    const subByActivity = new Map(submissions.map((s) => [s.activityId, s]));

    const decorate = (activity: Doc<"activities">) => {
      const submission = subByActivity.get(activity._id);
      const subject = subjectById.get(activity.subjectId);
      return {
        id: activity._id,
        title: activity.title,
        points: activity.points,
        dueAt: activity.dueAt,
        subjectCode: subject?.code ?? "",
        subject: subject?.name ?? "",
        state: stateOf(activity, submission, now),
        score: submission?.score ?? null,
        isLate: submission?.isLate ?? false,
        submittedAt: submission?.submittedAt ?? null,
        gradedAt: submission?.gradedAt ?? null,
      };
    };

    const pending = activities
      .filter((a) => {
        const state = stateOf(a, subByActivity.get(a._id), now);
        return state === "open" || state === "overdue";
      })
      .sort((a, b) => a.dueAt - b.dueAt)
      .map(decorate);

    const recentActivity = activities
      .slice()
      .sort((a, b) => b.dueAt - a.dueAt)
      .slice(0, 5)
      .map(decorate);

    // Notice board: pinned first, then newest.
    const notices = (await ctx.db.query("notices").collect())
      .sort(
        (a, b) =>
          Number(b.pinned) - Number(a.pinned) || b.publishedAt - a.publishedAt,
      )
      .slice(0, 4)
      .map((n) => ({
        id: n._id,
        title: n.title,
        body: n.body,
        category: n.category,
        author: n.author,
        pinned: n.pinned,
        dateStr: n.dateStr,
      }));

    // Notifications.
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_created", (q) => q.eq("userId", student._id))
      .order("desc")
      .collect();
    const unread = notifications.filter((n) => !n.read).length;

    // Recent notes with a signed storage URL for download.
    const notes = className
      ? await ctx.db
          .query("notes")
          .withIndex("by_class", (q) => q.eq("className", className))
          .collect()
      : [];
    const recentNotes = [];
    for (const note of notes.sort((a, b) => b.uploadedAt - a.uploadedAt).slice(0, 4)) {
      const subject = subjectById.get(note.subjectId);
      recentNotes.push({
        id: note._id,
        title: note.title,
        fileName: note.fileName,
        fileType: note.fileType,
        sizeBytes: note.sizeBytes,
        uploadedAt: note.uploadedAt,
        subjectCode: subject?.code ?? "",
        subject: subject?.name ?? "",
        fileUrl: await ctx.storage.getUrl(note.objectKey),
      });
    }

    return {
      student: {
        name: student.name ?? "Student",
        portalId: student.portalId ?? "",
        rollNo: student.rollNo ?? "",
        className,
        department: student.department ?? "",
        email: student.email ?? "",
        phone: student.phone ?? "",
        image: student.image ?? null,
      },
      classInfo: classDoc
        ? {
            name: classDoc.name,
            mentor: classDoc.mentor,
            room: classDoc.room,
            academicYear: classDoc.academicYear,
            term: classDoc.term,
          }
        : null,
      subjects,
      today,
      attendance,
      deadlines: pending.slice(0, 5),
      recentActivity,
      notices,
      notifications: notifications.slice(0, 5).map((n) => ({
        id: n._id,
        kind: n.kind,
        title: n.title,
        body: n.body,
        read: n.read,
        createdAt: n.createdAt,
        href: n.href,
      })),
      unread,
      pendingCount: pending.length,
      overdueCount: pending.filter((d) => d.state === "overdue").length,
      recentNotes,
    };
  },
});
