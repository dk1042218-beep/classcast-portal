import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireStudent } from "./lib";

interface SearchHit {
  id: string;
  title: string;
  meta: string;
  href: string;
}

/**
 * Global search, scoped to what this student is allowed to see: their own
 * class's subjects, notes and assignments plus portal-wide notices.
 */
export const globalSearch = query({
  args: { q: v.string() },
  handler: async (ctx, args) => {
    const student = await requireStudent(ctx);
    const className = student.className ?? "";
    const needle = args.q.trim().toLowerCase();
    const none = {
      notes: [] as SearchHit[],
      assignments: [] as SearchHit[],
      subjects: [] as SearchHit[],
      notices: [] as SearchHit[],
    };
    if (needle.length < 2 || !className) return none;

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

    const hit = (...parts: string[]) =>
      parts.join(" ").toLowerCase().includes(needle);

    const subjects = subjectDocs
      .filter((s) =>
        hit(s.name, s.code, s.room, teacherName.get(s._id) ?? ""),
      )
      .map((s) => ({
        id: s._id as string,
        title: `${s.code} · ${s.name}`,
        meta: `${teacherName.get(s._id)} · ${s.room}`,
        href: "/timetable",
      }));

    const noteRows = await ctx.db
      .query("notes")
      .withIndex("by_class", (q) => q.eq("className", className))
      .collect();
    const notes = noteRows
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
          meta: `${subject?.code ?? ""} · PDF · ${teacherName.get(n.subjectId) ?? ""}`,
          href: "/notes",
        };
      });

    const activityRows = await ctx.db
      .query("activities")
      .withIndex("by_class", (q) => q.eq("className", className))
      .collect();
    const assignments = activityRows
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
          meta: `${subject?.code ?? ""} · due ${new Date(a.dueAt).toISOString().slice(0, 10)} · ${a.points} marks`,
          href: "/assignments",
        };
      });

    const noticeRows = await ctx.db.query("notices").collect();
    const notices = noticeRows
      .filter((n) => hit(n.title, n.body, n.category, n.author))
      .sort((a, b) => b.publishedAt - a.publishedAt)
      .map((n) => ({
        id: n._id as string,
        title: n.title,
        meta: `${n.category} · ${n.author} · ${n.dateStr}`,
        href: "/notices",
      }));

    return { notes, assignments, subjects, notices };
  },
});
