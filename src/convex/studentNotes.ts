import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { requireStudent } from "./lib";

/**
 * Notes & resources for the student's class. Search, subject filtering and
 * sorting all run on the server against database records.
 */
export const notesList = query({
  args: {
    search: v.optional(v.string()),
    subjectId: v.optional(v.id("subjects")),
    sort: v.optional(
      v.union(v.literal("newest"), v.literal("oldest"), v.literal("title")),
    ),
  },
  handler: async (ctx, args) => {
    const student = await requireStudent(ctx);
    const className = student.className ?? "";
    if (!className) return { items: [], subjects: [], total: 0 };

    const subjectDocs = await ctx.db
      .query("subjects")
      .withIndex("by_class", (q) => q.eq("className", className))
      .collect();
    const subjectById = new Map(subjectDocs.map((s) => [s._id, s]));
    const teacherName = new Map<string, string>();
    for (const subject of subjectDocs) {
      const teacher = await ctx.db.get(subject.teacherId);
      teacherName.set(subject._id, teacher?.name ?? "Not allotted");
    }

    const rows = await ctx.db
      .query("notes")
      .withIndex("by_class", (q) => q.eq("className", className))
      .collect();

    const needle = (args.search ?? "").trim().toLowerCase();
    let items = rows.filter((note) => {
      if (args.subjectId && note.subjectId !== args.subjectId) return false;
      if (!needle) return true;
      const subject = subjectById.get(note.subjectId);
      const haystack = [
        note.title,
        note.description,
        note.fileName,
        subject?.name ?? "",
        subject?.code ?? "",
        teacherName.get(note.subjectId) ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });

    const sort = args.sort ?? "newest";
    items = items.sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "oldest") return a.uploadedAt - b.uploadedAt;
      return b.uploadedAt - a.uploadedAt;
    });

    const mapped = [];
    for (const note of items) {
      const subject = subjectById.get(note.subjectId);
      mapped.push({
        id: note._id,
        title: note.title,
        description: note.description,
        fileName: note.fileName,
        fileType: note.fileType,
        sizeBytes: note.sizeBytes,
        uploadedAt: note.uploadedAt,
        subjectId: note.subjectId,
        subjectCode: subject?.code ?? "",
        subject: subject?.name ?? "",
        teacher: teacherName.get(note.subjectId) ?? "Not allotted",
        fileUrl: await ctx.storage.getUrl(note.objectKey as Id<"_storage">),
      });
    }

    return {
      items: mapped,
      subjects: subjectDocs
        .map((s) => ({ id: s._id, code: s.code, name: s.name }))
        .sort((a, b) => a.code.localeCompare(b.code)),
      total: mapped.length,
    };
  },
});
