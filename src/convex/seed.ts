import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, internalMutation, query } from "./_generated/server";
import { hashPassword } from "./auth/password";
import { DAY_MS, isoDate, utcMidnight } from "./lib";
import {
  ACTIVITIES,
  CLASSES,
  NOTES,
  NOTICES,
  SCHEDULE,
  SLOTS,
  SUBJECTS,
  USERS,
  buildAttendance,
  buildNotifications,
  buildSubmissions,
  dueTimestamp,
  publishedTimestamp,
} from "./seedData";
import { buildHandoutPdf } from "./seedPdf";

/**
 * One-time bootstrap for the ClassCast demo college. Safe to call from any
 * page load: it only writes when the database is still empty, and every write
 * happens in guarded, atomic mutations.
 */

export const status = query({
  args: {},
  handler: async (ctx) => {
    const read = async (key: string) =>
      (
        await ctx.db
          .query("seedState")
          .withIndex("by_key", (q) => q.eq("key", key))
          .unique()
      ) !== null;
    return {
      coreSeeded: await read("core"),
      attendanceSeeded: await read("attendance"),
    };
  },
});

export const ensureSeeded = action({
  args: {},
  handler: async (ctx) => {
    const state = await ctx.runQuery(api.seed.status, {});
    if (state.coreSeeded && state.attendanceSeeded) return { seeded: false };

    const now = Date.now();

    if (!state.coreSeeded) {
      const hashes: { portalId: string; hash: string }[] = [];
      for (const user of USERS) {
        if (!user.password) continue;
        hashes.push({
          portalId: user.portalId,
          hash: await hashPassword(user.password),
        });
      }

      // File storage writes are only available in actions, so the handout
      // PDFs are stored here and handed to the mutation as storage keys.
      const files: { index: number; objectKey: string; sizeBytes: number }[] = [];
      for (const [index, note] of NOTES.entries()) {
        const pdf = buildHandoutPdf(note.title, note.lines, 16_000 + index * 4_300);
        const objectKey = await ctx.storage.store(
          new Blob([pdf], { type: "application/pdf" }),
        );
        files.push({ index, objectKey, sizeBytes: pdf.byteLength });
      }

      await ctx.runMutation(internal.seed.insertCore, { now, hashes, files });
    }

    if (!state.attendanceSeeded) {
      await ctx.runMutation(internal.seed.insertAttendance, { now });
    }

    return { seeded: true };
  },
});

/** Inserts the college itself: people, classes, subjects, timetable, notes,
 * activities, submissions, notices and notifications. Guarded by a flag so it
 * can never overwrite a live database. */
export const insertCore = internalMutation({
  args: {
    now: v.number(),
    hashes: v.array(v.object({ portalId: v.string(), hash: v.string() })),
    files: v.array(
      v.object({
        index: v.number(),
        objectKey: v.string(),
        sizeBytes: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("seedState")
      .withIndex("by_key", (q) => q.eq("key", "core"))
      .unique();
    if (existing !== null) return { skipped: true };

    const now = args.now;
    const stamp = new Date(now);
    const year = stamp.getUTCFullYear();
    const month = stamp.getUTCMonth();
    const academicYear =
      month >= 5
        ? `${year}-${String((year + 1) % 100).padStart(2, "0")}`
        : `${year - 1}-${String(year % 100).padStart(2, "0")}`;
    const term = month >= 5 && month <= 10 ? "Term I" : "Term II";

    for (const cls of CLASSES) {
      await ctx.db.insert("classes", {
        name: cls.name,
        code: cls.code,
        academicYear,
        term,
        mentor: cls.mentor,
        room: cls.room,
      });
    }

    const userIds = new Map<string, Id<"users">>();
    const userIdByEmail = new Map<string, Id<"users">>();
    for (const user of USERS) {
      const id = await ctx.db.insert("users", {
        name: user.name,
        email: user.email,
        role: user.role,
        portalId: user.portalId,
        phone: user.phone,
        className: user.className,
        rollNo: user.rollNo,
        department: user.department,
        designation: user.designation,
        status: "active",
      });
      userIds.set(user.portalId, id);
      userIdByEmail.set(user.email, id);
      if (user.password) {
        const found = args.hashes.find((h) => h.portalId === user.portalId);
        if (!found) throw new Error(`Missing password hash for ${user.portalId}`);
        await ctx.db.insert("credentials", {
          userId: id,
          hash: found.hash,
          updatedAt: now,
        });
      }
    }

    const subjectIds = new Map<string, Id<"subjects">>();
    const subjectTeacher = new Map<string, Id<"users">>();
    const subjectRoom = new Map<string, string>();
    for (const subject of SUBJECTS) {
      const teacherId = userIdByEmail.get(subject.teacherEmail);
      if (!teacherId) throw new Error(`Unknown teacher ${subject.teacherEmail}`);
      const id = await ctx.db.insert("subjects", {
        name: subject.name,
        code: subject.code,
        className: "TYBSc CS",
        teacherId,
        room: subject.room,
        credits: subject.credits,
      });
      subjectIds.set(subject.code, id);
      subjectTeacher.set(subject.code, teacherId);
      subjectRoom.set(subject.code, subject.room);
    }

    for (const [day, codes] of Object.entries(SCHEDULE)) {
      codes.forEach((code, index) => {
        if (!code) return;
        const subjectId = subjectIds.get(code);
        if (!subjectId) throw new Error(`Unknown subject ${code}`);
        const slot = SLOTS[index];
        void ctx.db.insert("timetable", {
          className: "TYBSc CS",
          day,
          slot: slot.slot,
          start: slot.start,
          end: slot.end,
          subjectId,
          room: subjectRoom.get(code) ?? "-",
        });
      });
    }

    for (const [index, note] of NOTES.entries()) {
      const subjectId = subjectIds.get(note.subjectCode);
      const teacherId = subjectTeacher.get(note.subjectCode);
      if (!subjectId || !teacherId) throw new Error(`Bad note subject ${note.subjectCode}`);
      const file = args.files.find((f) => f.index === index);
      if (!file) throw new Error(`Missing stored file for ${note.fileName}`);
      await ctx.db.insert("notes", {
        title: note.title,
        description: note.description,
        subjectId,
        className: "TYBSc CS",
        teacherId,
        fileName: note.fileName,
        fileType: "pdf",
        objectKey: file.objectKey,
        sizeBytes: file.sizeBytes,
        uploadedAt: utcMidnight(now) - note.uploadedDaysAgo * DAY_MS + 11 * 3600_000,
      });
    }

    const activityIds = new Map<string, Id<"activities">>();
    for (const activity of ACTIVITIES) {
      const subjectId = subjectIds.get(activity.subjectCode);
      const teacherId = subjectTeacher.get(activity.subjectCode);
      if (!subjectId || !teacherId) {
        throw new Error(`Bad activity subject ${activity.subjectCode}`);
      }
      const id = await ctx.db.insert("activities", {
        title: activity.title,
        description: activity.description,
        instructions: activity.instructions,
        subjectId,
        className: "TYBSc CS",
        teacherId,
        dueAt: dueTimestamp(now, activity.dueDays),
        dueDateStr: isoDate(dueTimestamp(now, activity.dueDays)),
        points: activity.points,
        publishedAt: publishedTimestamp(now, activity.dueDays),
      });
      activityIds.set(activity.key, id);
    }

    let submissionCount = 0;
    for (const submission of buildSubmissions(now)) {
      const activityId = activityIds.get(submission.activityKey);
      const studentId = userIds.get(submission.studentPortalId);
      if (!activityId || !studentId) throw new Error("Bad submission reference");
      await ctx.db.insert("submissions", {
        activityId,
        studentId,
        answer: submission.answer,
        submittedAt: submission.submittedAt,
        updatedAt: submission.submittedAt,
        isLate: submission.isLate,
        score: submission.score,
        feedback: submission.feedback,
        gradedAt: submission.score !== undefined ? submission.submittedAt + DAY_MS : undefined,
      });
      submissionCount++;
    }

    for (const notice of NOTICES) {
      const publishedAt =
        utcMidnight(now) - notice.publishedDaysAgo * DAY_MS + 9 * 3600_000 + 30 * 60_000;
      await ctx.db.insert("notices", {
        title: notice.title,
        body: notice.body,
        category: notice.category,
        audience: "all",
        author: notice.author,
        pinned: notice.pinned,
        publishedAt,
        dateStr: isoDate(publishedAt),
      });
    }

    let notificationCount = 0;
    for (const notification of buildNotifications(now)) {
      const userId = userIds.get(notification.studentPortalId);
      if (!userId) throw new Error("Bad notification target");
      await ctx.db.insert("notifications", {
        userId,
        kind: notification.kind,
        title: notification.title,
        body: notification.body,
        read: notification.read,
        createdAt: notification.createdAt,
        href: notification.href,
      });
      notificationCount++;
    }

    await ctx.db.insert("seedState", {
      key: "core",
      value: new Date(now).toISOString(),
    });

    return {
      skipped: false,
      users: userIds.size,
      subjects: subjectIds.size,
      notes: NOTES.length,
      activities: ACTIVITIES.length,
      submissions: submissionCount,
      notices: NOTICES.length,
      notifications: notificationCount,
    };
  },
});

/** Inserts the lecture attendance register for the rolling window. Runs after
 * the core seed so it can be retried independently if it ever fails. */
export const insertAttendance = internalMutation({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("seedState")
      .withIndex("by_key", (q) => q.eq("key", "attendance"))
      .unique();
    if (existing !== null) return { skipped: true };

    const core = await ctx.db
      .query("seedState")
      .withIndex("by_key", (q) => q.eq("key", "core"))
      .unique();
    if (core === null) throw new Error("Core seed must run first");

    const students = new Map<string, Id<"users">>();
    for (const user of await ctx.db.query("users").collect()) {
      if (user.portalId) students.set(user.portalId, user._id);
    }

    const subjects = new Map<string, { id: Id<"subjects">; teacherId: Id<"users"> }>();
    for (const subject of await ctx.db.query("subjects").collect()) {
      subjects.set(subject.code, { id: subject._id, teacherId: subject.teacherId });
    }

    const records = buildAttendance(args.now);
    let count = 0;
    for (const record of records) {
      const studentId = students.get(record.studentPortalId);
      const subject = subjects.get(record.subjectCode);
      if (!studentId || !subject) throw new Error("Bad attendance reference");
      await ctx.db.insert("attendance", {
        studentId,
        subjectId: subject.id,
        className: "TYBSc CS",
        teacherId: subject.teacherId,
        date: record.date,
        day: record.day,
        status: record.status,
      });
      count++;
    }

    await ctx.db.insert("seedState", {
      key: "attendance",
      value: new Date(args.now).toISOString(),
    });
    return { skipped: false, count };
  },
});
