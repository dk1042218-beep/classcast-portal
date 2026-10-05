import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// Portal roles. Version 1 ships the student desk; teacher + admin desks are
// modelled in the data so subject/notice ownership is real.
export const ROLES = {
  ADMIN: "admin",
  TEACHER: "teacher",
  STUDENT: "student",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.TEACHER),
  v.literal(ROLES.STUDENT),
);
export type Role = Infer<typeof roleValidator>;

const statusValidator = v.union(v.literal("active"), v.literal("inactive"));
const attendanceStatusValidator = v.union(
  v.literal("present"),
  v.literal("absent"),
  v.literal("late"),
);

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove

      // ClassCast portal fields. All optional so auth providers that create
      // users (OTP, anonymous) never fail schema validation.
      portalId: v.optional(v.string()), // e.g. ST-101 / TCH-1042 / ADM-0001
      phone: v.optional(v.string()),
      className: v.optional(v.string()), // e.g. TYBSc CS
      rollNo: v.optional(v.string()),
      department: v.optional(v.string()),
      designation: v.optional(v.string()), // teacher designation / office title
      status: v.optional(statusValidator),
    })
      .index("email", ["email"])
      .index("portalId", ["portalId"]),

    // Password hashes live in their own table so no query that returns a user
    // document can ever leak a secret.
    credentials: defineTable({
      userId: v.id("users"),
      hash: v.string(), // pbkdf2-sha256$iterations$salt$hash
      updatedAt: v.number(),
    }).index("by_user", ["userId"]),

    classes: defineTable({
      name: v.string(), // TYBSc CS
      code: v.string(), // TYCS
      academicYear: v.string(), // 2026-27
      term: v.string(), // Term I
      mentor: v.string(), // class mentor display name
      room: v.string(), // home room
    }).index("by_name", ["name"]),

    subjects: defineTable({
      name: v.string(),
      code: v.string(), // CS-301
      className: v.string(),
      teacherId: v.id("users"),
      room: v.string(),
      credits: v.number(),
    })
      .index("by_class", ["className"])
      .index("by_teacher", ["teacherId"]),

    timetable: defineTable({
      className: v.string(),
      day: v.string(), // mon .. fri
      slot: v.number(), // 1..4
      start: v.string(), // 13:30
      end: v.string(), // 14:25
      subjectId: v.id("subjects"),
      room: v.string(),
    }).index("by_class_day", ["className", "day"]),

    notes: defineTable({
      title: v.string(),
      description: v.string(),
      subjectId: v.id("subjects"),
      className: v.string(),
      teacherId: v.id("users"),
      fileName: v.string(),
      fileType: v.string(), // pdf
      objectKey: v.string(),
      sizeBytes: v.number(),
      uploadedAt: v.number(),
    })
      .index("by_class", ["className"])
      .index("by_subject", ["subjectId"]),

    activities: defineTable({
      title: v.string(),
      description: v.string(),
      instructions: v.optional(v.string()),
      subjectId: v.id("subjects"),
      className: v.string(),
      teacherId: v.id("users"),
      dueAt: v.number(),
      dueDateStr: v.string(),
      points: v.number(),
      publishedAt: v.number(),
    })
      .index("by_class", ["className"])
      .index("by_subject", ["subjectId"]),

    submissions: defineTable({
      activityId: v.id("activities"),
      studentId: v.id("users"),
      answer: v.string(),
      submittedAt: v.number(),
      updatedAt: v.number(),
      isLate: v.boolean(),
      score: v.optional(v.number()),
      feedback: v.optional(v.string()),
      gradedAt: v.optional(v.number()),
    })
      .index("by_student", ["studentId"])
      .index("by_activity", ["activityId"])
      .index("by_student_activity", ["studentId", "activityId"]),

    attendance: defineTable({
      studentId: v.id("users"),
      subjectId: v.id("subjects"),
      className: v.string(),
      teacherId: v.id("users"),
      date: v.string(), // 2026-10-05
      day: v.string(), // mon
      status: attendanceStatusValidator,
    })
      .index("by_student", ["studentId"])
      .index("by_student_date", ["studentId", "date"])
      .index("by_subject", ["subjectId"]),

    notices: defineTable({
      title: v.string(),
      body: v.string(),
      category: v.string(), // academic | examination | event | circular | placement
      audience: v.string(), // "all" or a class name
      author: v.string(),
      pinned: v.boolean(),
      publishedAt: v.number(),
      dateStr: v.string(),
    }), // small table: scanned and filtered in queries

    notifications: defineTable({
      userId: v.id("users"),
      kind: v.string(), // assignment | marks | note | deadline | submission | notice
      title: v.string(),
      body: v.string(),
      read: v.boolean(),
      createdAt: v.number(),
      href: v.optional(v.string()),
    }).index("by_user_created", ["userId", "createdAt"]),

    // Single-row guards used by the one-time bootstrap.
    seedState: defineTable({
      key: v.string(), // "core" | "attendance"
      value: v.string(),
    }).index("by_key", ["key"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
