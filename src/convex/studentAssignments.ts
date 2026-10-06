import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { DAY_MS, requireStudent, validateUpload } from "./lib";

const GRACE_MS = 2 * DAY_MS;

export type State = "open" | "overdue" | "submitted" | "graded" | "missing";

function stateOf(
  activity: Doc<"activities">,
  submission: Doc<"submissions"> | undefined,
  now: number,
): State {
  if (submission) return submission.score !== undefined ? "graded" : "submitted";
  if (activity.dueAt > now) return "open";
  return now > activity.dueAt + GRACE_MS ? "missing" : "overdue";
}

/** How many active students are on the class register. */
async function classStrength(
  ctx: QueryCtx,
  className: string,
): Promise<number> {
  const users = await ctx.db.query("users").collect();
  return users.filter(
    (u) =>
      u.role === "student" &&
      u.className === className &&
      u.status !== "inactive",
  ).length;
}

/** All class assignments with this student's status and class progress. */
export const assignmentsList = query({
  args: {},
  handler: async (ctx) => {
    const student = await requireStudent(ctx);
    const className = student.className ?? "";
    const now = Date.now();

    const subjectDocs = className
      ? await ctx.db
          .query("subjects")
          .withIndex("by_class", (q) => q.eq("className", className))
          .collect()
      : [];
    const subjectById = new Map(subjectDocs.map((s) => [s._id, s]));

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

    const strength = await classStrength(ctx, className);

    const items = [];
    for (const activity of activities) {
      const submission = subByActivity.get(activity._id);
      const subject = subjectById.get(activity.subjectId);
      const classSubmissions = await ctx.db
        .query("submissions")
        .withIndex("by_activity", (q) => q.eq("activityId", activity._id))
        .collect();
      items.push({
        id: activity._id,
        title: activity.title,
        description: activity.description,
        points: activity.points,
        dueAt: activity.dueAt,
        subjectId: activity.subjectId,
        subjectCode: subject?.code ?? "",
        subject: subject?.name ?? "",
        state: stateOf(activity, submission, now),
        score: submission?.score ?? null,
        isLate: submission?.isLate ?? false,
        submittedAt: submission?.submittedAt ?? null,
        gradedAt: submission?.gradedAt ?? null,
        submittedCount: classSubmissions.length,
        strength,
      });
    }

    items.sort((a, b) => a.dueAt - b.dueAt);
    return items;
  },
});

/** Full assignment detail plus the student's own submission. */
export const assignmentDetail = query({
  args: { id: v.id("activities") },
  handler: async (ctx, args) => {
    const student = await requireStudent(ctx);
    const activity = await ctx.db.get(args.id);
    if (!activity) throw new Error("Assignment not found");
    if (activity.className !== student.className) throw new Error("Not authorized");

    const now = Date.now();
    const subject = await ctx.db.get(activity.subjectId);
    const teacher = subject ? await ctx.db.get(subject.teacherId) : null;
    const submission = (
      await ctx.db
        .query("submissions")
        .withIndex("by_student_activity", (q) =>
          q.eq("studentId", student._id).eq("activityId", activity._id),
        )
        .unique()
    ) ?? undefined;
    const state = stateOf(activity, submission, now);
    const classSubmissions = await ctx.db
      .query("submissions")
      .withIndex("by_activity", (q) => q.eq("activityId", activity._id))
      .collect();

    return {
      id: activity._id,
      title: activity.title,
      description: activity.description,
      instructions: activity.instructions ?? "",
      points: activity.points,
      dueAt: activity.dueAt,
      publishedAt: activity.publishedAt,
      subjectCode: subject?.code ?? "",
      subject: subject?.name ?? "",
      teacher: teacher?.name ?? "Not allotted",
      state,
      canSubmit:
        state !== "graded" &&
        state !== "missing" &&
        (!submission || submission.score === undefined) &&
        now < activity.dueAt + GRACE_MS,
      submission: submission
        ? {
            answer: submission.answer,
            submittedAt: submission.submittedAt,
            updatedAt: submission.updatedAt,
            isLate: submission.isLate,
            score: submission.score ?? null,
            feedback: submission.feedback ?? null,
            gradedAt: submission.gradedAt ?? null,
            fileName: submission.fileName ?? null,
            fileSize: submission.fileSize ?? null,
            fileUrl: submission.objectKey
              ? await ctx.storage.getUrl(submission.objectKey as Id<"_storage">)
              : null,
          }
        : null,
      submittedCount: classSubmissions.length,
      strength: await classStrength(ctx, activity.className),
    };
  },
});

/** Server-issued upload URL for a submission attachment. */
export const generateSubmissionUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireStudent(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Create or edit a submission while the deadline window is open. */
export const submitAssignment = mutation({
  args: {
    activityId: v.id("activities"),
    answer: v.string(),
    file: v.optional(
      v.object({ fileName: v.string(), objectKey: v.string() }),
    ),
  },
  handler: async (ctx, args) => {
    const student = await requireStudent(ctx);
    const activity = await ctx.db.get(args.activityId);
    if (!activity) throw new Error("Assignment not found");
    if (activity.className !== student.className) throw new Error("Not authorized");

    const answer = args.answer.trim();
    if (answer.length < 10) throw new Error("Answer is too short");
    if (answer.length > 8000) throw new Error("Answer is too long (8000 characters max)");

    // Optional attachment: verify it exists in storage and passes the shared
    // size/type policy before it is ever linked to the submission.
    let file: { fileName: string; objectKey: string; fileSize: number } | undefined;
    if (args.file) {
      const meta = await ctx.db.system.get(args.file.objectKey as Id<"_storage">);
      if (!meta) throw new Error("Uploaded file not found");
      validateUpload(args.file.fileName, meta.size);
      file = {
        fileName: args.file.fileName,
        objectKey: args.file.objectKey,
        fileSize: meta.size,
      };
    }

    const now = Date.now();
    if (now > activity.dueAt + GRACE_MS) throw new Error("The deadline has passed");

    const existing = (
      await ctx.db
        .query("submissions")
        .withIndex("by_student_activity", (q) =>
          q.eq("studentId", student._id).eq("activityId", activity._id),
        )
        .unique()
    ) ?? undefined;

    if (existing && existing.score !== undefined) {
      throw new Error("This submission has already been graded");
    }

    const isLate = now > activity.dueAt;
    let id: Id<"submissions">;
    if (existing) {
      const patch: Partial<Doc<"submissions">> = { answer, updatedAt: now, isLate };
      if (file) {
        patch.fileName = file.fileName;
        patch.objectKey = file.objectKey;
        patch.fileSize = file.fileSize;
      }
      await ctx.db.patch(existing._id, patch);
      id = existing._id;
    } else {
      id = await ctx.db.insert("submissions", {
        activityId: activity._id,
        studentId: student._id,
        answer,
        submittedAt: now,
        updatedAt: now,
        isLate,
        fileName: file?.fileName,
        objectKey: file?.objectKey,
        fileSize: file?.fileSize,
      });
      await ctx.db.insert("notifications", {
        userId: student._id,
        kind: "submission",
        title: `Submission recorded: ${activity.title}`,
        body: isLate
          ? "Received after the deadline and marked as late."
          : "Received before the deadline. Awaiting review.",
        read: false,
        createdAt: now,
        href: "/assignments",
      });
    }
    return { id, isLate };
  },
});
