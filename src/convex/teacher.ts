import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import {
  isoDate,
  dayKeyOf,
  isIsoDate,
  requireTeacher,
  validateUpload,
} from "./lib";

const DAY_LABELS: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

async function mySubjects(ctx: QueryCtx, teacherId: Id<"users">) {
  return ctx.db
    .query("subjects")
    .withIndex("by_teacher", (q) => q.eq("teacherId", teacherId))
    .collect();
}

async function assertMySubject(
  ctx: QueryCtx,
  teacherId: Id<"users">,
  subjectId: Id<"subjects">,
): Promise<Doc<"subjects">> {
  const subject = await ctx.db.get(subjectId);
  if (!subject || subject.teacherId !== teacherId) throw new Error("Not authorized");
  return subject;
}

/** Teacher dashboard: subjects, classes, today's lectures, load and averages. */
export const overview = query({
  args: {},
  handler: async (ctx) => {
    const teacher = await requireTeacher(ctx);
    const subjects = await mySubjects(ctx, teacher._id);
    const classNames = Array.from(new Set(subjects.map((s) => s.className)));
    const subjectIds = new Set(subjects.map((s) => s._id));

    const users = await ctx.db.query("users").collect();
    const students = users.filter(
      (u) =>
        u.role === "student" &&
        u.status !== "inactive" &&
        u.className !== undefined &&
        classNames.includes(u.className),
    );

    const todayIso = isoDate(Date.now());
    const todayDay = dayKeyOf(Date.now());
    const today = DAY_LABELS[todayDay] ?? todayDay;
    const lectures = [];
    for (const className of classNames) {
      const rows = await ctx.db
        .query("timetable")
        .withIndex("by_class_day", (q) =>
          q.eq("className", className).eq("day", todayDay),
        )
        .collect();
      for (const row of rows) {
        if (!subjectIds.has(row.subjectId)) continue;
        const subject = subjects.find((s) => s._id === row.subjectId);
        lectures.push({
          className,
          start: row.start,
          end: row.end,
          room: row.room,
          subjectCode: subject?.code ?? "",
          subject: subject?.name ?? "",
        });
      }
    }
    lectures.sort((a, b) => a.start.localeCompare(b.start));

    // Activities, submissions and grading load.
    const activities: Doc<"activities">[] = [];
    const pending: {
      id: Id<"activities">;
      title: string;
      subjectCode: string;
      className: string;
      dueAt: number;
      ungraded: number;
      submitted: number;
    }[] = [];
    const recent: {
      id: Id<"submissions">;
      activityId: Id<"activities">;
      activity: string;
      student: string;
      submittedAt: number;
      graded: boolean;
      isLate: boolean;
    }[] = [];
    let ungradedTotal = 0;

    for (const className of classNames) {
      const classActivities = await ctx.db
        .query("activities")
        .withIndex("by_class", (q) => q.eq("className", className))
        .collect();
      for (const activity of classActivities) {
        if (!subjectIds.has(activity.subjectId)) continue;
        activities.push(activity);
        const subs = await ctx.db
          .query("submissions")
          .withIndex("by_activity", (q) => q.eq("activityId", activity._id))
          .collect();
        const ungraded = subs.filter((s) => s.score === undefined).length;
        ungradedTotal += ungraded;
        const subject = subjects.find((s) => s._id === activity.subjectId);
        if (ungraded > 0) {
          pending.push({
            id: activity._id,
            title: activity.title,
            subjectCode: subject?.code ?? "",
            className,
            dueAt: activity.dueAt,
            ungraded,
            submitted: subs.length,
          });
        }
        for (const sub of subs) {
          const student = await ctx.db.get(sub.studentId);
          recent.push({
            id: sub._id,
            activityId: activity._id,
            activity: activity.title,
            student: student?.name ?? "Student",
            submittedAt: sub.submittedAt,
            graded: sub.score !== undefined,
            isLate: sub.isLate,
          });
        }
      }
    }
    recent.sort((a, b) => b.submittedAt - a.submittedAt);

    // Attendance average across my subjects.
    let present = 0;
    let total = 0;
    const perSubject: {
      subjectId: string;
      code: string;
      name: string;
      className: string;
      present: number;
      total: number;
      pct: number;
    }[] = [];
    for (const subject of subjects) {
      const rows = await ctx.db
        .query("attendance")
        .withIndex("by_subject", (q) => q.eq("subjectId", subject._id))
        .collect();
      const hits = rows.filter((r) => r.status !== "absent").length;
      present += hits;
      total += rows.length;
      perSubject.push({
        subjectId: subject._id,
        code: subject.code,
        name: subject.name,
        className: subject.className,
        present: hits,
        total: rows.length,
        pct: rows.length ? Math.round((hits / rows.length) * 100) : 0,
      });
    }

    const noteRows = (await ctx.db.query("notes").collect()).filter(
      (n) => n.teacherId === teacher._id,
    );

    return {
      teacher: {
        name: teacher.name ?? "Teacher",
        portalId: teacher.portalId ?? "",
        email: teacher.email ?? "",
        department: teacher.department ?? "",
        designation: teacher.designation ?? "",
      },
      subjects: subjects.map((s) => ({
        id: s._id,
        code: s.code,
        name: s.name,
        className: s.className,
        room: s.room,
        credits: s.credits,
      })),
      classes: classNames,
      studentCount: students.length,
      today,
      todayIso,
      lectures,
      pendingGrading: ungradedTotal,
      pending,
      recent: recent.slice(0, 6),
      attendance: {
        present,
        total,
        pct: total ? Math.round((present / total) * 100) : 0,
        bySubject: perSubject,
      },
      notesCount: noteRows.length,
      activitiesCount: activities.length,
    };
  },
});

/** Students of a class I teach, with attendance standing. */
export const classRoster = query({
  args: { className: v.string() },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx);
    const subjects = await mySubjects(ctx, teacher._id);
    if (!subjects.some((s) => s.className === args.className)) {
      throw new Error("Not authorized for this class");
    }
    const users = await ctx.db.query("users").collect();
    const students = users
      .filter((u) => u.role === "student" && u.className === args.className)
      .sort((a, b) => (a.rollNo ?? "").localeCompare(b.rollNo ?? ""));

    const roster = [];
    for (const student of students) {
      const rows = await ctx.db
        .query("attendance")
        .withIndex("by_student", (q) => q.eq("studentId", student._id))
        .collect();
      const hits = rows.filter((r) => r.status !== "absent").length;
      roster.push({
        id: student._id,
        name: student.name ?? "",
        rollNo: student.rollNo ?? "",
        portalId: student.portalId ?? "",
        email: student.email ?? "",
        phone: student.phone ?? "",
        status: student.status ?? "active",
        present: hits,
        total: rows.length,
        pct: rows.length ? Math.round((hits / rows.length) * 100) : 0,
      });
    }

    return {
      students: roster,
      subjects: subjects
        .filter((s) => s.className === args.className)
        .map((s) => ({ id: s._id, code: s.code, name: s.name, room: s.room })),
    };
  },
});

/** Attendance history for one of my classes (editable records). */
export const attendanceRecords = query({
  args: {
    className: v.string(),
    subjectId: v.optional(v.id("subjects")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx);
    const subjects = await mySubjects(ctx, teacher._id);
    if (!subjects.some((s) => s.className === args.className)) {
      throw new Error("Not authorized for this class");
    }
    if (args.subjectId) await assertMySubject(ctx, teacher._id, args.subjectId);

    const limit = Math.min(Math.max(args.limit ?? 60, 10), 400);
    const rows = await ctx.db
      .query("attendance")
      .withIndex("by_class_date", (q) => q.eq("className", args.className))
      .order("desc")
      .take(limit);

    const studentNames = new Map<string, string>();
    const subjectInfo = new Map<string, { code: string; name: string }>();
    for (const subject of subjects) {
      subjectInfo.set(subject._id, { code: subject.code, name: subject.name });
    }
    return rows
      .filter((row) => !args.subjectId || row.subjectId === args.subjectId)
      .map((row) => {
        if (!studentNames.has(row.studentId)) {
          studentNames.set(row.studentId, "Student");
        }
        return {
          id: row._id,
          studentId: row.studentId,
          date: row.date,
          day: row.day,
          status: row.status,
          subjectId: row.subjectId,
          subjectCode: subjectInfo.get(row.subjectId)?.code ?? "",
          subject: subjectInfo.get(row.subjectId)?.name ?? "",
        };
      });
  },
});

/** Names for the students referenced by attendanceRecords. */
export const rosterNames = query({
  args: { studentIds: v.array(v.id("users")) },
  handler: async (ctx, args) => {
    await requireTeacher(ctx);
    const out: { id: string; name: string; rollNo: string }[] = [];
    for (const id of args.studentIds.slice(0, 200)) {
      const user = await ctx.db.get(id);
      out.push({
        id,
        name: user?.name ?? "Student",
        rollNo: user?.rollNo ?? "",
      });
    }
    return out;
  },
});

/** Mark or edit attendance for one lecture of my class. */
export const markAttendance = mutation({
  args: {
    className: v.string(),
    subjectId: v.id("subjects"),
    date: v.string(),
    records: v.array(
      v.object({ studentId: v.id("users"), status: v.union(v.literal("present"), v.literal("absent"), v.literal("late")) }),
    ),
  },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx);
    const subject = await assertMySubject(ctx, teacher._id, args.subjectId);
    if (subject.className !== args.className) throw new Error("Not authorized");
    if (!isIsoDate(args.date)) throw new Error("Invalid date");
    if (args.records.length < 1 || args.records.length > 300) {
      throw new Error("Invalid record count");
    }
    const day = dayKeyOf(Date.parse(`${args.date}T00:00:00Z`));

    let edited = 0;
    let created = 0;
    for (const record of args.records) {
      const student = await ctx.db.get(record.studentId);
      if (!student || student.role !== "student") throw new Error("Invalid student");
      if (student.className !== args.className) {
        throw new Error("Student is not on this class register");
      }
      const existing = await ctx.db
        .query("attendance")
        .withIndex("by_student_date", (q) =>
          q.eq("studentId", record.studentId).eq("date", args.date),
        )
        .filter((q) => q.eq(q.field("subjectId"), args.subjectId))
        .first();
      if (existing) {
        if (existing.status !== record.status) {
          await ctx.db.patch(existing._id, { status: record.status });
          edited++;
        }
      } else {
        await ctx.db.insert("attendance", {
          studentId: record.studentId,
          subjectId: args.subjectId,
          className: args.className,
          teacherId: teacher._id,
          date: args.date,
          day,
          status: record.status,
        });
        created++;
      }
    }
    return { created, edited };
  },
});

/** Upload URL for a note file (server-issued, 10 MB enforced on save). */
export const generateNoteUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireTeacher(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Save a note record against an uploaded file. */
export const createNote = mutation({
  args: {
    subjectId: v.id("subjects"),
    title: v.string(),
    description: v.string(),
    fileName: v.string(),
    objectKey: v.string(),
  },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx);
    const subject = await assertMySubject(ctx, teacher._id, args.subjectId);
    const title = args.title.trim();
    if (title.length < 3 || title.length > 160) throw new Error("Invalid title");
    if (args.description.length > 600) throw new Error("Description too long");

    const meta = await ctx.db.system.get(
      args.objectKey as Id<"_storage">,
    );
    if (!meta) throw new Error("Uploaded file not found");
    validateUpload(args.fileName, meta.size);

    await ctx.db.insert("notes", {
      title,
      description: args.description.trim(),
      subjectId: args.subjectId,
      className: subject.className,
      teacherId: teacher._id,
      fileName: args.fileName,
      fileType: args.fileName.split(".").pop() ?? "pdf",
      objectKey: args.objectKey,
      sizeBytes: meta.size,
      uploadedAt: Date.now(),
    });
    return true;
  },
});

export const myNotes = query({
  args: {},
  handler: async (ctx) => {
    const teacher = await requireTeacher(ctx);
    const rows = (await ctx.db.query("notes").collect())
      .filter((n) => n.teacherId === teacher._id)
      .sort((a, b) => b.uploadedAt - a.uploadedAt);
    const out = [];
    for (const note of rows) {
      const subject = await ctx.db.get(note.subjectId);
      out.push({
        id: note._id,
        title: note.title,
        description: note.description,
        subjectId: note.subjectId,
        subjectCode: subject?.code ?? "",
        subject: subject?.name ?? "",
        fileName: note.fileName,
        fileType: note.fileType,
        sizeBytes: note.sizeBytes,
        uploadedAt: note.uploadedAt,
        fileUrl: await ctx.storage.getUrl(note.objectKey as Id<"_storage">),
      });
    }
    return out;
  },
});

export const deleteNote = mutation({
  args: { id: v.id("notes") },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx);
    const note = await ctx.db.get(args.id);
    if (!note || note.teacherId !== teacher._id) throw new Error("Not authorized");
    await ctx.storage.delete(note.objectKey as Id<"_storage">);
    await ctx.db.delete(args.id);
    return true;
  },
});

/** Publish an assignment for one of my subjects. */
export const createActivity = mutation({
  args: {
    subjectId: v.id("subjects"),
    title: v.string(),
    description: v.string(),
    instructions: v.optional(v.string()),
    dueAt: v.number(),
    points: v.number(),
  },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx);
    const subject = await assertMySubject(ctx, teacher._id, args.subjectId);
    const title = args.title.trim();
    if (title.length < 3 || title.length > 160) throw new Error("Invalid title");
    if (args.description.trim().length < 10) {
      throw new Error("Description must be at least 10 characters");
    }
    if (!Number.isFinite(args.dueAt)) throw new Error("Invalid deadline");
    if (args.points < 1 || args.points > 500) throw new Error("Invalid marks");

    const id = await ctx.db.insert("activities", {
      title,
      description: args.description.trim(),
      instructions: (args.instructions ?? "").trim() || undefined,
      subjectId: args.subjectId,
      className: subject.className,
      teacherId: teacher._id,
      dueAt: args.dueAt,
      dueDateStr: isoDate(args.dueAt),
      points: Math.round(args.points),
      publishedAt: Date.now(),
    });

    // Notify every student of the class.
    const users = await ctx.db.query("users").collect();
    for (const user of users) {
      if (user.role !== "student" || user.className !== subject.className) continue;
      await ctx.db.insert("notifications", {
        userId: user._id,
        kind: "assignment",
        title: `New assignment: ${title}`,
        body: `${subject.code} · ${isoDate(args.dueAt)} · ${Math.round(args.points)} marks`,
        read: false,
        createdAt: Date.now(),
        href: "/assignments",
      });
    }
    return { id };
  },
});

export const myActivities = query({
  args: {},
  handler: async (ctx) => {
    const teacher = await requireTeacher(ctx);
    const subjects = await mySubjects(ctx, teacher._id);
    const subjectIds = new Set(subjects.map((s) => s._id));
    const classNames = Array.from(new Set(subjects.map((s) => s.className)));
    const out = [];
    for (const className of classNames) {
      const rows = await ctx.db
        .query("activities")
        .withIndex("by_class", (q) => q.eq("className", className))
        .collect();
      for (const activity of rows) {
        if (!subjectIds.has(activity.subjectId)) continue;
        const subject = subjects.find((s) => s._id === activity.subjectId);
        const subs = await ctx.db
          .query("submissions")
          .withIndex("by_activity", (q) => q.eq("activityId", activity._id))
          .collect();
        out.push({
          id: activity._id,
          title: activity.title,
          description: activity.description,
          subjectId: activity.subjectId,
          subjectCode: subject?.code ?? "",
          subject: subject?.name ?? "",
          className,
          dueAt: activity.dueAt,
          points: activity.points,
          publishedAt: activity.publishedAt,
          submitted: subs.length,
          ungraded: subs.filter((s) => s.score === undefined).length,
        });
      }
    }
    out.sort((a, b) => b.dueAt - a.dueAt);
    return out;
  },
});

/** Submissions for one of my assignments, ready for review. */
export const activitySubmissions = query({
  args: { activityId: v.id("activities") },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx);
    const activity = await ctx.db.get(args.activityId);
    if (!activity) throw new Error("Assignment not found");
    await assertMySubject(ctx, teacher._id, activity.subjectId);

    const subs = await ctx.db
      .query("submissions")
      .withIndex("by_activity", (q) => q.eq("activityId", activity._id))
      .collect();
    const classStrength = (await ctx.db.query("users").collect()).filter(
      (u) => u.role === "student" && u.className === activity.className,
    ).length;

    const out = [];
    for (const sub of subs.sort((a, b) => a.submittedAt - b.submittedAt)) {
      const student = await ctx.db.get(sub.studentId);
      out.push({
        id: sub._id,
        studentId: sub.studentId,
        student: student?.name ?? "Student",
        rollNo: student?.rollNo ?? "",
        answer: sub.answer,
        submittedAt: sub.submittedAt,
        isLate: sub.isLate,
        score: sub.score ?? null,
        feedback: sub.feedback ?? null,
        gradedAt: sub.gradedAt ?? null,
        fileName: sub.fileName ?? null,
        fileUrl: sub.objectKey
          ? await ctx.storage.getUrl(sub.objectKey as Id<"_storage">)
          : null,
        fileSize: sub.fileSize ?? null,
      });
    }

    const enrolled = (await ctx.db.query("users").collect())
      .filter((u) => u.role === "student" && u.className === activity.className)
      .sort((a, b) => (a.rollNo ?? "").localeCompare(b.rollNo ?? ""))
      .map((u) => ({
        studentId: u._id,
        name: u.name ?? "Student",
        rollNo: u.rollNo ?? "",
        submitted: subs.some((s) => s.studentId === u._id),
      }));

    return {
      activity: {
        id: activity._id,
        title: activity.title,
        className: activity.className,
        dueAt: activity.dueAt,
        points: activity.points,
        submitted: subs.length,
        classStrength,
      },
      submissions: out,
      enrolled,
    };
  },
});

/** Award marks and feedback for one of my assignments. */
export const reviewSubmission = mutation({
  args: {
    submissionId: v.id("submissions"),
    score: v.number(),
    feedback: v.string(),
  },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx);
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) throw new Error("Submission not found");
    const activity = await ctx.db.get(submission.activityId);
    if (!activity) throw new Error("Assignment not found");
    await assertMySubject(ctx, teacher._id, activity.subjectId);

    if (!Number.isFinite(args.score) || args.score < 0) {
      throw new Error("Marks must be zero or more");
    }
    if (args.score > activity.points) {
      throw new Error(`Marks cannot exceed ${activity.points}`);
    }
    const feedback = args.feedback.trim();
    if (feedback.length > 1000) throw new Error("Feedback too long");

    const now = Date.now();
    await ctx.db.patch(submission._id, {
      score: Math.round(args.score * 100) / 100,
      feedback: feedback || undefined,
      gradedAt: now,
    });
    await ctx.db.insert("notifications", {
      userId: submission.studentId,
      kind: "marks",
      title: `Marks published: ${activity.title}`,
      body: `${Math.round(args.score * 100) / 100}/${activity.points} · ${feedback ? "feedback added" : "no remarks"}`,
      read: false,
      createdAt: now,
      href: "/assignments",
    });
    return true;
  },
});

/** Post a notice to one of my classes. */
export const createNotice = mutation({
  args: {
    title: v.string(),
    body: v.string(),
    category: v.string(),
    audience: v.string(),
    pinned: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx);
    const subjects = await mySubjects(ctx, teacher._id);
    const classNames = new Set(subjects.map((s) => s.className));
    if (!classNames.has(args.audience)) throw new Error("Not authorized for this class");
    const title = args.title.trim();
    if (title.length < 3 || title.length > 180) throw new Error("Invalid title");
    if (args.body.trim().length < 10) throw new Error("Notice text too short");

    const now = Date.now();
    await ctx.db.insert("notices", {
      title,
      body: args.body.trim(),
      category: args.category,
      audience: args.audience,
      author: `${teacher.name ?? "Faculty"} · ${args.audience}`,
      pinned: args.pinned ?? false,
      publishedAt: now,
      dateStr: isoDate(now),
      issuedById: teacher._id,
    });
    return true;
  },
});

export const myNotices = query({
  args: {},
  handler: async (ctx) => {
    const teacher = await requireTeacher(ctx);
    const subjects = await mySubjects(ctx, teacher._id);
    const classNames = new Set(subjects.map((s) => s.className));
    return (await ctx.db.query("notices").collect())
      .filter(
        (n) =>
          n.issuedById === teacher._id ||
          (n.audience !== "all" && classNames.has(n.audience)),
      )
      .sort((a, b) => b.publishedAt - a.publishedAt)
      .map((n) => ({
        id: n._id,
        title: n.title,
        body: n.body,
        category: n.category,
        audience: n.audience,
        pinned: n.pinned,
        dateStr: n.dateStr,
        mine: n.issuedById === teacher._id,
      }));
  },
});

export const deleteNotice = mutation({
  args: { id: v.id("notices") },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx);
    const notice = await ctx.db.get(args.id);
    if (!notice || notice.issuedById !== teacher._id) {
      throw new Error("Not authorized");
    }
    await ctx.db.delete(args.id);
    return true;
  },
});
