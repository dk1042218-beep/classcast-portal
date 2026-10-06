import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  EmptyState,
  Loader,
  PageHeader,
  Panel,
  StatusTag,
  TD,
  TH,
} from "@/components/portal/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat"] as const;
const DAY_LABEL: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
};
const SLOTS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const CODE_RE = /^[A-Za-z0-9-]{2,16}$/;

type Tab = "classes" | "subjects" | "timetable";

export default function AdminAcademics() {
  const academics = useQuery(api.admin.academics);
  const createClass = useMutation(api.admin.createClass);
  const updateClass = useMutation(api.admin.updateClass);
  const createSubject = useMutation(api.admin.createSubject);
  const updateSubject = useMutation(api.admin.updateSubject);
  const deleteSubject = useMutation(api.admin.deleteSubject);
  const setSlot = useMutation(api.admin.setTimetableSlot);
  const clearSlot = useMutation(api.admin.clearTimetableSlot);

  const [tab, setTab] = useState<Tab>("classes");
  const [busy, setBusy] = useState(false);
  const [showClassForm, setShowClassForm] = useState(false);
  const [editingClassId, setEditingClassId] = useState<Id<"classes"> | null>(null);
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState<Id<"subjects"> | null>(null);

  const [gridClass, setGridClass] = useState<string | null>(null);
  const [slotDraft, setSlotDraft] = useState<{
    day: string;
    slot: number;
    start: string;
    end: string;
    subjectId: string;
    room: string;
  } | null>(null);

  if (!academics) return <Loader />;

  const { classes, subjects, teachers, timetable, semesters, divisions, settings } =
    academics;
  const activeGridClass = gridClass ?? classes[0]?.name ?? null;
  const gridRows = timetable.filter((row) => row.className === activeGridClass);
  const classSubjects = subjects.filter((s) => s.className === activeGridClass);

  const notify = (message: string, description?: string) =>
    toast.success(message, description ? { description } : undefined);

  const fail = (error: unknown, fallback: string) =>
    toast.error(error instanceof Error ? error.message : fallback);

  /* ---------------- classes ---------------- */

  const handleClassSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const code = String(data.get("code") ?? "").trim();
    const academicYear = String(data.get("academicYear") ?? "").trim();
    const term = String(data.get("term") ?? "").trim();
    const mentor = String(data.get("mentor") ?? "").trim();
    const room = String(data.get("room") ?? "").trim();
    const semesterRaw = String(data.get("semester") ?? "").trim();
    const division = String(data.get("division") ?? "").trim();

    if (!CODE_RE.test(code)) return toast.error("Code must be 2-16 letters or numbers");
    if (!academicYear) return toast.error("Enter an academic year like 2026-27");
    if (!term) return toast.error("Enter a term");
    if (!mentor) return toast.error("Enter a class mentor");
    if (!room) return toast.error("Enter a home room");

    const semester = semesterRaw ? Number(semesterRaw) : undefined;
    if (semester !== undefined && (!Number.isInteger(semester) || semester < 1 || semester > 12)) {
      return toast.error("Semester must be between 1 and 12");
    }

    setBusy(true);
    try {
      if (editingClassId) {
        await updateClass({
          id: editingClassId,
          name,
          code,
          academicYear,
          term,
          semester,
          division: division || undefined,
          mentor,
          room,
        });
        notify("Class updated");
      } else {
        if (name.length < 2) return toast.error("Enter a valid class name");
        await createClass({
          name,
          code,
          academicYear,
          term,
          semester,
          division: division || undefined,
          mentor,
          room,
        });
        notify("Class registered", `${name} is ready for students and subjects.`);
      }
      setShowClassForm(false);
      setEditingClassId(null);
    } catch (error) {
      fail(error, "Could not save class");
    } finally {
      setBusy(false);
    }
  };

  /* ---------------- subjects ---------------- */

  const handleSubjectSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const code = String(data.get("code") ?? "").trim();
    const className = String(data.get("className") ?? "").trim();
    const teacherId = String(data.get("teacherId") ?? "");
    const room = String(data.get("room") ?? "").trim();
    const credits = Number(String(data.get("credits") ?? "4"));

    if (name.length < 2) return toast.error("Enter a valid subject name");
    if (!CODE_RE.test(code)) return toast.error("Code must be 2-16 letters or numbers");
    if (!className) return toast.error("Choose a class");
    if (!teacherId) return toast.error("Allot a teacher");
    if (!Number.isFinite(credits) || credits < 1 || credits > 10) {
      return toast.error("Credits must be 1-10");
    }

    setBusy(true);
    try {
      if (editingSubjectId) {
        await updateSubject({
          id: editingSubjectId,
          name,
          code,
          className,
          teacherId: teacherId as Id<"users">,
          room,
          credits,
        });
        notify("Subject updated");
      } else {
        await createSubject({
          name,
          code,
          className,
          teacherId: teacherId as Id<"users">,
          room,
          credits,
        });
        notify("Subject created", `${code} allotted on ${className}.`);
      }
      setShowSubjectForm(false);
      setEditingSubjectId(null);
    } catch (error) {
      fail(error, "Could not save subject");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteSubject = async (id: Id<"subjects">) => {
    setBusy(true);
    try {
      await deleteSubject({ id });
      notify("Subject removed");
    } catch (error) {
      fail(error, "Could not delete subject");
    } finally {
      setBusy(false);
    }
  };

  /* ---------------- timetable ---------------- */

  const openSlot = (day: string, slot: number) => {
    const existing = gridRows.find((r) => r.day === day && r.slot === slot);
    if (existing) {
      setSlotDraft({
        day,
        slot,
        start: existing.start,
        end: existing.end,
        subjectId: existing.subjectId,
        room: existing.room,
      });
    } else {
      setSlotDraft({
        day,
        slot,
        start: "",
        end: "",
        subjectId: classSubjects[0]?.id ?? "",
        room: "",
      });
    }
  };

  const handleSaveSlot = async () => {
    if (!slotDraft || !activeGridClass) return;
    if (!slotDraft.subjectId) return toast.error("Choose a subject");
    if (!TIME_RE.test(slotDraft.start) || !TIME_RE.test(slotDraft.end)) {
      return toast.error("Times must be HH:MM");
    }
    if (slotDraft.start >= slotDraft.end) {
      return toast.error("Start time must be before end time");
    }
    setBusy(true);
    try {
      await setSlot({
        className: activeGridClass,
        day: slotDraft.day,
        slot: slotDraft.slot,
        start: slotDraft.start,
        end: slotDraft.end,
        subjectId: slotDraft.subjectId as Id<"subjects">,
        room: slotDraft.room,
      });
      notify(
        "Timetable updated",
        `${DAY_LABEL[slotDraft.day]} · slot ${slotDraft.slot} · ${activeGridClass}`,
      );
      setSlotDraft(null);
    } catch (error) {
      fail(error, "Could not save slot");
    } finally {
      setBusy(false);
    }
  };

  const handleClearSlot = async () => {
    if (!slotDraft || !activeGridClass) return;
    setBusy(true);
    try {
      await clearSlot({
        className: activeGridClass,
        day: slotDraft.day,
        slot: slotDraft.slot,
      });
      notify("Slot cleared");
      setSlotDraft(null);
    } catch (error) {
      fail(error, "Could not clear slot");
    } finally {
      setBusy(false);
    }
  };

  /* ---------------- render ---------------- */

  const editingClass = classes.find((c) => c.id === editingClassId) ?? null;
  const editingSubject = subjects.find((s) => s.id === editingSubjectId) ?? null;

  return (
    <div>
      <PageHeader
        title="Academics"
        description="Register classes and semesters, allot subjects to faculty, and lay out the weekly timetable."
        action={
          <span className="label-caps border border-border bg-secondary px-2 py-1 text-muted-foreground">
            Semesters {semesters.join(", ") || "—"} · Divisions{" "}
            {divisions.join(", ") || "—"}
          </span>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["classes", `Classes (${classes.length})`],
            ["subjects", `Subjects (${subjects.length})`],
            ["timetable", `Timetable (${timetable.length} slots)`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`label-caps cursor-pointer border px-2.5 py-1.5 ${
              tab === key
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-secondary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {settings && (
        <p className="label-caps mb-4 text-muted-foreground">
          Portal: {settings.academicYear} · {settings.term} · min attendance{" "}
          {settings.minAttendance}%
          {settings.updatedBy ? ` · last saved by ${settings.updatedBy}` : ""}
        </p>
      )}

      {/* CLASSES */}
      {tab === "classes" && (
        <Panel
          title="Class register"
          meta={`${classes.length} registered`}
          action={
            <Button
              size="sm"
              className="cursor-pointer"
              onClick={() => {
                setShowClassForm((open) => !open);
                setEditingClassId(null);
              }}
            >
              {showClassForm ? (
                <X className="size-3.5" />
              ) : (
                <Plus className="mr-1.5 size-3.5" />
              )}
              New class
            </Button>
          }
        >
          {(showClassForm || editingClass) && (
            <form
              onSubmit={handleClassSubmit}
              className="mb-4 border border-border bg-secondary/40 p-3"
            >
              <p className="label-caps text-foreground">
                {editingClass ? `Edit ${editingClass.name}` : "Register a class"}
              </p>
              <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label htmlFor="cl-name" className="label-caps text-muted-foreground">
                    Class name
                  </label>
                  <Input
                    id="cl-name"
                    name="name"
                    key={`name-${editingClass?.id ?? "new"}`}
                    defaultValue={editingClass?.name ?? ""}
                    readOnly={!!editingClass}
                    required
                    placeholder="TYBSc CS"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label htmlFor="cl-code" className="label-caps text-muted-foreground">
                    Code
                  </label>
                  <Input
                    id="cl-code"
                    name="code"
                    key={`code-${editingClass?.id ?? "new"}`}
                    defaultValue={editingClass?.code ?? ""}
                    required
                    placeholder="TYCS"
                    className="mt-1.5 font-code"
                  />
                </div>
                <div>
                  <label htmlFor="cl-ay" className="label-caps text-muted-foreground">
                    Academic year
                  </label>
                  <Input
                    id="cl-ay"
                    name="academicYear"
                    key={`ay-${editingClass?.id ?? "new"}`}
                    defaultValue={settings?.academicYear ?? editingClass?.academicYear ?? ""}
                    required
                    placeholder="2026-27"
                    className="mt-1.5 font-code"
                  />
                </div>
                <div>
                  <label htmlFor="cl-term" className="label-caps text-muted-foreground">
                    Term
                  </label>
                  <Input
                    id="cl-term"
                    name="term"
                    key={`term-${editingClass?.id ?? "new"}`}
                    defaultValue={settings?.term ?? editingClass?.term ?? ""}
                    required
                    placeholder="Term I"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label htmlFor="cl-sem" className="label-caps text-muted-foreground">
                    Semester
                  </label>
                  <Input
                    id="cl-sem"
                    name="semester"
                    type="number"
                    min={1}
                    max={12}
                    key={`sem-${editingClass?.id ?? "new"}`}
                    defaultValue={editingClass?.semester ?? ""}
                    placeholder="5"
                    className="mt-1.5 font-code"
                  />
                </div>
                <div>
                  <label htmlFor="cl-div" className="label-caps text-muted-foreground">
                    Division
                  </label>
                  <Input
                    id="cl-div"
                    name="division"
                    key={`div-${editingClass?.id ?? "new"}`}
                    defaultValue={editingClass?.division ?? ""}
                    placeholder="A"
                    className="mt-1.5 font-code"
                  />
                </div>
                <div>
                  <label htmlFor="cl-mentor" className="label-caps text-muted-foreground">
                    Mentor
                  </label>
                  <Input
                    id="cl-mentor"
                    name="mentor"
                    key={`mentor-${editingClass?.id ?? "new"}`}
                    defaultValue={editingClass?.mentor ?? ""}
                    required
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label htmlFor="cl-room" className="label-caps text-muted-foreground">
                    Home room
                  </label>
                  <Input
                    id="cl-room"
                    name="room"
                    key={`room-${editingClass?.id ?? "new"}`}
                    defaultValue={editingClass?.room ?? ""}
                    required
                    className="mt-1.5 font-code"
                  />
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" type="submit" disabled={busy} className="cursor-pointer">
                  {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {editingClass ? "Save changes" : "Register class"}
                </Button>
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => {
                    setShowClassForm(false);
                    setEditingClassId(null);
                  }}
                >
                  Cancel
                </Button>
                {editingClass && (
                  <span className="self-center text-xs text-muted-foreground">
                    The class name is the register key and cannot change.
                  </span>
                )}
              </div>
            </form>
          )}

          {classes.length === 0 ? (
            <EmptyState>No classes registered yet.</EmptyState>
          ) : (
            <div className="-mx-3 overflow-x-auto sm:-mx-4">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr>
                    <th className={TH}>Name</th>
                    <th className={TH}>Code</th>
                    <th className={TH}>Year</th>
                    <th className={TH}>Term</th>
                    <th className={TH}>Sem</th>
                    <th className={TH}>Div</th>
                    <th className={TH}>Mentor</th>
                    <th className={TH}>Room</th>
                    <th className={TH}>Strength</th>
                    <th className={TH}></th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((cls) => (
                    <tr key={cls.id}>
                      <td className={`${TD} font-medium`}>{cls.name}</td>
                      <td className={`${TD} font-code`}>{cls.code}</td>
                      <td className={`${TD} font-code`}>{cls.academicYear}</td>
                      <td className={TD}>{cls.term}</td>
                      <td className={`${TD} tnum`}>{cls.semester ?? "—"}</td>
                      <td className={`${TD} font-code`}>{cls.division ?? "—"}</td>
                      <td className={TD}>{cls.mentor}</td>
                      <td className={`${TD} font-code`}>{cls.room}</td>
                      <td className={`${TD} tnum`}>{cls.strength}</td>
                      <td className={`${TD} text-right`}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingClassId(cls.id);
                            setShowClassForm(false);
                          }}
                          className="label-caps cursor-pointer border border-border px-2 py-1 hover:bg-secondary"
                        >
                          <Pencil className="mr-1 inline size-3" /> Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {/* SUBJECTS */}
      {tab === "subjects" && (
        <Panel
          title="Subject catalogue"
          meta={`${subjects.length} subjects · ${teachers.length} faculty`}
          action={
            <Button
              size="sm"
              className="cursor-pointer"
              onClick={() => {
                setShowSubjectForm((open) => !open);
                setEditingSubjectId(null);
              }}
            >
              {showSubjectForm ? (
                <X className="size-3.5" />
              ) : (
                <Plus className="mr-1.5 size-3.5" />
              )}
              New subject
            </Button>
          }
        >
          {(showSubjectForm || editingSubject) && (
            <form
              onSubmit={handleSubjectSubmit}
              className="mb-4 border border-border bg-secondary/40 p-3"
            >
              <p className="label-caps text-foreground">
                {editingSubject ? `Edit ${editingSubject.code}` : "Create a subject"}
              </p>
              <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label htmlFor="su-name" className="label-caps text-muted-foreground">
                    Subject name
                  </label>
                  <Input
                    id="su-name"
                    name="name"
                    key={`sname-${editingSubject?.id ?? "new"}`}
                    defaultValue={editingSubject?.name ?? ""}
                    required
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label htmlFor="su-code" className="label-caps text-muted-foreground">
                    Code
                  </label>
                  <Input
                    id="su-code"
                    name="code"
                    key={`scode-${editingSubject?.id ?? "new"}`}
                    defaultValue={editingSubject?.code ?? ""}
                    required
                    placeholder="CS-305"
                    className="mt-1.5 font-code"
                  />
                </div>
                <div>
                  <label htmlFor="su-class" className="label-caps text-muted-foreground">
                    Class
                  </label>
                  <select
                    id="su-class"
                    name="className"
                    key={`sclass-${editingSubject?.id ?? "new"}`}
                    defaultValue={editingSubject?.className ?? ""}
                    required
                    className="mt-1.5 block w-full cursor-pointer border border-border bg-card px-2 py-2 text-sm outline-none"
                  >
                    <option value="">Choose…</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.name}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="su-teacher" className="label-caps text-muted-foreground">
                    Allotted to
                  </label>
                  <select
                    id="su-teacher"
                    name="teacherId"
                    key={`stech-${editingSubject?.id ?? "new"}`}
                    defaultValue={editingSubject?.teacherId ?? ""}
                    required
                    className="mt-1.5 block w-full cursor-pointer border border-border bg-card px-2 py-2 text-sm outline-none"
                  >
                    <option value="">Choose a teacher…</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name} ({teacher.portalId})
                        {teacher.status === "inactive" ? " — inactive" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="su-room" className="label-caps text-muted-foreground">
                    Room
                  </label>
                  <Input
                    id="su-room"
                    name="room"
                    key={`sroom-${editingSubject?.id ?? "new"}`}
                    defaultValue={editingSubject?.room ?? ""}
                    placeholder="Defaults to class room"
                    className="mt-1.5 font-code"
                  />
                </div>
                <div>
                  <label htmlFor="su-credits" className="label-caps text-muted-foreground">
                    Credits
                  </label>
                  <Input
                    id="su-credits"
                    name="credits"
                    type="number"
                    min={1}
                    max={10}
                    key={`scred-${editingSubject?.id ?? "new"}`}
                    defaultValue={editingSubject?.credits ?? 4}
                    className="mt-1.5 font-code"
                  />
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" type="submit" disabled={busy} className="cursor-pointer">
                  {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {editingSubject ? "Save changes" : "Create subject"}
                </Button>
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => {
                    setShowSubjectForm(false);
                    setEditingSubjectId(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {subjects.length === 0 ? (
            <EmptyState>No subjects created yet.</EmptyState>
          ) : (
            <div className="-mx-3 overflow-x-auto sm:-mx-4">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr>
                    <th className={TH}>Code</th>
                    <th className={TH}>Name</th>
                    <th className={TH}>Class</th>
                    <th className={TH}>Teacher</th>
                    <th className={TH}>Room</th>
                    <th className={TH}>Credits</th>
                    <th className={TH}>Work</th>
                    <th className={TH}></th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((subject) => (
                    <tr key={subject.id}>
                      <td className={`${TD} font-code`}>{subject.code}</td>
                      <td className={`${TD} font-medium`}>{subject.name}</td>
                      <td className={TD}>{subject.className}</td>
                      <td className={TD}>{subject.teacher}</td>
                      <td className={`${TD} font-code`}>{subject.room}</td>
                      <td className={`${TD} tnum`}>{subject.credits}</td>
                      <td className={TD}>
                        <StatusTag tone={subject.activitiesCount > 0 ? "info" : "slate"}>
                          {subject.activitiesCount} assignments
                        </StatusTag>
                      </td>
                      <td className={`${TD} whitespace-nowrap text-right`}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSubjectId(subject.id);
                            setShowSubjectForm(false);
                          }}
                          className="label-caps cursor-pointer border border-border px-2 py-1 hover:bg-secondary"
                        >
                          <Pencil className="mr-1 inline size-3" /> Edit
                        </button>{" "}
                        <button
                          type="button"
                          onClick={() => void handleDeleteSubject(subject.id)}
                          disabled={busy}
                          className="label-caps cursor-pointer border border-border px-2 py-1 text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50"
                        >
                          <Trash2 className="mr-1 inline size-3" /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {/* TIMETABLE */}
      {tab === "timetable" && (
        <Panel
          title="Weekly timetable"
          meta={activeGridClass ?? "No class"}
          action={
            <select
              value={activeGridClass ?? ""}
              onChange={(event) => {
                setGridClass(event.target.value);
                setSlotDraft(null);
              }}
              className="cursor-pointer border border-border bg-card px-2 py-1.5 text-sm outline-none"
              aria-label="Timetable class"
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.name}>
                  {cls.name}
                </option>
              ))}
            </select>
          }
        >
          {classes.length === 0 ? (
            <EmptyState>Register a class first.</EmptyState>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
              <div className="-mx-3 overflow-x-auto sm:-mx-4">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr>
                      <th className={TH}>Day</th>
                      {SLOTS.map((slot) => (
                        <th key={slot} className={TH}>
                          Slot {slot}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.map((day) => (
                      <tr key={day}>
                        <td className={`${TD} label-caps whitespace-nowrap text-muted-foreground`}>
                          {DAY_LABEL[day]}
                        </td>
                        {SLOTS.map((slot) => {
                          const row = gridRows.find(
                            (r) => r.day === day && r.slot === slot,
                          );
                          const active =
                            slotDraft?.day === day && slotDraft?.slot === slot;
                          return (
                            <td key={slot} className={`${TD} p-1`}>
                              <button
                                type="button"
                                onClick={() => openSlot(day, slot)}
                                className={`w-full cursor-pointer border px-2 py-1.5 text-left ${
                                  active
                                    ? "border-primary bg-primary/10"
                                    : row
                                      ? "border-border bg-card hover:bg-secondary"
                                      : "border-dashed border-border text-muted-foreground hover:bg-secondary"
                                }`}
                              >
                                {row ? (
                                  <>
                                    <span className="font-code text-xs font-medium">
                                      {row.subjectCode}
                                    </span>
                                    <span className="label-caps block text-muted-foreground tnum">
                                      {row.start}–{row.end}
                                    </span>
                                    <span className="label-caps block text-muted-foreground">
                                      {row.room}
                                    </span>
                                  </>
                                ) : (
                                  <span className="label-caps">free</span>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border border-border bg-secondary/40 p-3">
                {!slotDraft ? (
                  <p className="text-sm text-muted-foreground">
                    Click any cell in the grid to allot or change a lecture for{" "}
                    {activeGridClass}.
                  </p>
                ) : (
                  <div className="grid gap-3">
                    <p className="label-caps text-foreground">
                      {DAY_LABEL[slotDraft.day]} · Slot {slotDraft.slot}
                    </p>
                    <div>
                      <label
                        htmlFor="slot-subject"
                        className="label-caps text-muted-foreground"
                      >
                        Subject
                      </label>
                      <select
                        id="slot-subject"
                        value={slotDraft.subjectId}
                        onChange={(event) =>
                          setSlotDraft({ ...slotDraft, subjectId: event.target.value })
                        }
                        className="mt-1.5 block w-full cursor-pointer border border-border bg-card px-2 py-2 text-sm outline-none"
                      >
                        <option value="">Choose…</option>
                        {classSubjects.map((subject) => (
                          <option key={subject.id} value={subject.id}>
                            {subject.code} · {subject.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="slot-start"
                          className="label-caps text-muted-foreground"
                        >
                          Start
                        </label>
                        <Input
                          id="slot-start"
                          value={slotDraft.start}
                          onChange={(event) =>
                            setSlotDraft({ ...slotDraft, start: event.target.value })
                          }
                          placeholder="13:30"
                          className="mt-1.5 font-code"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="slot-end"
                          className="label-caps text-muted-foreground"
                        >
                          End
                        </label>
                        <Input
                          id="slot-end"
                          value={slotDraft.end}
                          onChange={(event) =>
                            setSlotDraft({ ...slotDraft, end: event.target.value })
                          }
                          placeholder="14:25"
                          className="mt-1.5 font-code"
                        />
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="slot-room"
                        className="label-caps text-muted-foreground"
                      >
                        Room
                      </label>
                      <Input
                        id="slot-room"
                        value={slotDraft.room}
                        onChange={(event) =>
                          setSlotDraft({ ...slotDraft, room: event.target.value })
                        }
                        placeholder="Defaults to subject room"
                        className="mt-1.5 font-code"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={handleSaveSlot}
                        disabled={busy}
                        className="cursor-pointer"
                      >
                        {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                        Save slot
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleClearSlot}
                        disabled={busy}
                        className="cursor-pointer"
                      >
                        Clear
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSlotDraft(null)}
                        className="cursor-pointer"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
