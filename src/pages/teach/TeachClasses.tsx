import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  EmptyState,
  isoFromTs,
  Loader,
  Meter,
  PageHeader,
  Panel,
  StatusTag,
  TD,
  TH,
} from "@/components/portal/primitives";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type Status = "present" | "absent" | "late";

const STATUS_TONE: Record<Status, "info" | "alert" | "warn"> = {
  present: "info",
  absent: "alert",
  late: "warn",
};

export default function TeachClasses() {
  const overview = useQuery(api.teacher.overview);

  const [className, setClassName] = useState<string | null>(null);
  const [tab, setTab] = useState<"attendance" | "roster" | "history">(
    "attendance",
  );
  const [subjectId, setSubjectId] = useState<Id<"subjects"> | null>(null);
  const [date, setDate] = useState(() => isoFromTs(Date.now()));
  const [saving, setSaving] = useState(false);

  const classes = overview?.classes ?? [];
  const activeClass = className ?? classes[0] ?? null;

  const roster = useQuery(
    api.teacher.classRoster,
    activeClass ? { className: activeClass } : "skip",
  );
  const records = useQuery(
    api.teacher.attendanceRecords,
    activeClass
      ? {
          className: activeClass,
          subjectId: (subjectId ?? undefined) as Id<"subjects"> | undefined,
          limit: 400,
        }
      : "skip",
  );
  const markAttendance = useMutation(api.teacher.markAttendance);

  const subjects = useMemo(
    () =>
      (roster?.subjects ?? []).slice().sort((a, b) => a.code.localeCompare(b.code)),
    [roster],
  );
  const activeSubject = subjectId ?? subjects[0]?.id ?? null;

  // The marking sheet is keyed to class + subject + date: switching any of
  // them reads as a fresh sheet without an effect to reset the state.
  const sheetKey = `${activeClass ?? ""}::${activeSubject ?? ""}::${date}`;
  const [sheetEdits, setSheetEdits] = useState<{
    key: string;
    edits: Record<string, Status>;
  }>({ key: "", edits: {} });
  const edits = sheetEdits.key === sheetKey ? sheetEdits.edits : {};
  const updateEdits = (next: Record<string, Status>) =>
    setSheetEdits({ key: sheetKey, edits: next });

  const existingForSelection = useMemo(() => {
    const map = new Map<string, Status>();
    for (const row of records ?? []) {
      if (row.date === date && row.subjectId === activeSubject) {
        map.set(row.studentId, row.status as Status);
      }
    }
    return map;
  }, [records, date, activeSubject]);

  if (!overview) return <Loader />;
  if (classes.length === 0) {
    return (
      <div>
        <PageHeader
          title="Classes & attendance"
          description="Students on your class registers and the lecture attendance you record for them."
        />
        <Panel title="No classes allotted">
          <EmptyState>
            No subjects have been allotted to your account yet. Ask the Office
            of Academics to allot your subjects on the Academics desk.
          </EmptyState>
        </Panel>
      </div>
    );
  }

  const students = roster?.students ?? [];
  const effectiveStatus = (studentId: string): Status =>
    edits[studentId] ?? existingForSelection.get(studentId) ?? "present";

  // Dirty when any student has no record yet (new lecture) or the sheet
  // differs from what is on file.
  const dirty =
    !students.every((s) => existingForSelection.has(s.id)) ||
    students.some((s) => effectiveStatus(s.id) !== existingForSelection.get(s.id));

  const handleSave = async () => {
    if (!activeClass || !activeSubject) return;
    if (students.length === 0) {
      toast.error("No students on this register");
      return;
    }
    setSaving(true);
    try {
      const result = await markAttendance({
        className: activeClass,
        subjectId: activeSubject,
        date,
        records: students.map((student) => ({
          studentId: student.id,
          status: effectiveStatus(student.id),
        })),
      });
      updateEdits({});
      toast.success("Attendance recorded", {
        description: `${result.created} new · ${result.edited} corrected · ${activeClass} · ${date}`,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const historyRows = (records ?? []).slice(0, 80);
  const nameOf = new Map(students.map((s) => [s.id, s]));

  return (
    <div>
      <PageHeader
        title="Classes & attendance"
        description="Mark today's lecture, correct an earlier entry, or read the class roster with each student's standing."
        action={
          <div className="flex flex-wrap gap-2">
            <select
              value={activeClass ?? ""}
              onChange={(event) => setClassName(event.target.value)}
              className="cursor-pointer border border-border bg-card px-2 py-1.5 text-sm outline-none"
              aria-label="Choose class"
            >
              {classes.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <span className="label-caps border border-border bg-secondary px-2 py-1.5 text-muted-foreground">
              {students.length} students
            </span>
          </div>
        }
      />

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["attendance", "Mark attendance"],
            ["roster", "Class roster"],
            ["history", "Register history"],
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

      {tab === "attendance" && (
        <Panel
          title="Attendance sheet"
          meta={`${activeClass ?? ""} · ${date}`}
          action={
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !dirty || students.length === 0}
              className="cursor-pointer"
            >
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save register
            </Button>
          }
        >
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div>
              <label
                htmlFor="att-subject"
                className="label-caps text-muted-foreground"
              >
                Subject
              </label>
              <select
                id="att-subject"
                value={activeSubject ?? ""}
                onChange={(event) => setSubjectId(event.target.value as Id<"subjects">)}
                className="mt-1.5 block w-full cursor-pointer border border-border bg-card px-2 py-2 text-sm outline-none"
              >
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.code} · {subject.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="att-date" className="label-caps text-muted-foreground">
                Lecture date
              </label>
              <input
                id="att-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="mt-1.5 block border border-border bg-card px-2 py-2 text-sm font-code outline-none"
              />
            </div>
            <div className="flex gap-2 pb-0.5">
              <Button
                size="sm"
                variant="outline"
                className="cursor-pointer"
                onClick={() =>
                  updateEdits(
                    Object.fromEntries(
                      students.map((s) => [s.id, "present" as Status]),
                    ),
                  )
                }
              >
                All present
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="cursor-pointer"
                onClick={() => updateEdits({})}
              >
                Reset sheet
              </Button>
            </div>
          </div>

          {students.length === 0 ? (
            <EmptyState>No students on this register.</EmptyState>
          ) : (
            <div className="-mx-3 overflow-x-auto sm:-mx-4">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr>
                    <th className={TH}>Roll</th>
                    <th className={TH}>Student</th>
                    <th className={TH}>Portal ID</th>
                    <th className={TH}>Term standing</th>
                    <th className={TH}>Today</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const current = effectiveStatus(student.id);
                    const already = existingForSelection.get(student.id);
                    return (
                      <tr key={student.id}>
                        <td className={`${TD} font-code tnum`}>{student.rollNo}</td>
                        <td className={`${TD} font-medium`}>{student.name}</td>
                        <td className={`${TD} font-code text-muted-foreground`}>
                          {student.portalId}
                        </td>
                        <td className={`${TD} whitespace-nowrap`}>
                          <span className="tnum">
                            {student.present}/{student.total}
                          </span>{" "}
                          <span className="text-muted-foreground tnum">
                            ({student.pct}%)
                          </span>
                        </td>
                        <td className={TD}>
                          <div className="flex flex-wrap gap-1.5">
                            {(["present", "absent", "late"] as Status[]).map(
                              (value) => (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() =>
                                    updateEdits({
                                      ...edits,
                                      [student.id]: value,
                                    })
                                  }
                                  className={`label-caps cursor-pointer border px-2 py-1 ${
                                    current === value
                                      ? value === "present"
                                        ? "border-accent bg-accent/10 text-accent"
                                        : value === "absent"
                                          ? "border-primary bg-primary/10 text-primary"
                                          : "border-chart-4/50 bg-chart-4/10 text-chart-4"
                                      : "border-border bg-card text-muted-foreground hover:bg-secondary"
                                  }`}
                                >
                                  {value}
                                </button>
                              ),
                            )}
                            {already && !edits[student.id] && (
                              <StatusTag tone="slate">on file</StatusTag>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Saving upserts the sheet: new lectures are added, changed entries are
            corrected in place. Records for other dates are untouched.
          </p>
        </Panel>
      )}

      {tab === "roster" && (
        <Panel title="Class roster" meta={`${students.length} on the register`}>
          {students.length === 0 ? (
            <EmptyState>No students on this register.</EmptyState>
          ) : (
            <div className="-mx-3 overflow-x-auto sm:-mx-4">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr>
                    <th className={TH}>Roll</th>
                    <th className={TH}>Name</th>
                    <th className={TH}>Portal ID</th>
                    <th className={TH}>Email</th>
                    <th className={TH}>Phone</th>
                    <th className={TH}>Attendance</th>
                    <th className={TH}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td className={`${TD} font-code tnum`}>{student.rollNo}</td>
                      <td className={`${TD} font-medium`}>{student.name}</td>
                      <td className={`${TD} font-code`}>{student.portalId}</td>
                      <td className={`${TD} text-muted-foreground`}>
                        {student.email || "—"}
                      </td>
                      <td className={`${TD} font-code text-muted-foreground`}>
                        {student.phone || "—"}
                      </td>
                      <td className={`${TD} w-40 whitespace-nowrap`}>
                        <span className="tnum">{student.pct}%</span>{" "}
                        <span className="text-muted-foreground tnum">
                          {student.present}/{student.total}
                        </span>
                        <div className="mt-1">
                          <Meter pct={student.pct} />
                        </div>
                      </td>
                      <td className={TD}>
                        <StatusTag tone={student.status === "active" ? "info" : "alert"}>
                          {student.status}
                        </StatusTag>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {tab === "history" && (
        <Panel
          title="Register history"
          meta={`Latest ${historyRows.length} entries`}
        >
          {historyRows.length === 0 ? (
            <EmptyState>
              No attendance has been recorded for this class yet. Use the
              attendance sheet to open the register.
            </EmptyState>
          ) : (
            <div className="-mx-3 overflow-x-auto sm:-mx-4">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr>
                    <th className={TH}>Date</th>
                    <th className={TH}>Day</th>
                    <th className={TH}>Student</th>
                    <th className={TH}>Subject</th>
                    <th className={TH}>Status</th>
                    <th className={TH}></th>
                  </tr>
                </thead>
                <tbody>
                  {historyRows.map((row) => (
                    <tr key={row.id}>
                      <td className={`${TD} font-code whitespace-nowrap tnum`}>
                        {row.date}
                      </td>
                      <td className={`${TD} label-caps text-muted-foreground`}>
                        {row.day}
                      </td>
                      <td className={`${TD} font-medium`}>
                        {nameOf.get(row.studentId)?.name ?? "Student"}
                        <span className="ml-2 font-code text-xs text-muted-foreground">
                          {nameOf.get(row.studentId)?.rollNo}
                        </span>
                      </td>
                      <td className={`${TD} font-code`}>
                        {row.subjectCode}
                        <span className="ml-2 font-sans text-xs text-muted-foreground">
                          {row.subject}
                        </span>
                      </td>
                      <td className={TD}>
                        <StatusTag tone={STATUS_TONE[row.status as Status]}>
                          {row.status}
                        </StatusTag>
                      </td>
                      <td className={`${TD} text-right`}>
                        <button
                          type="button"
                          onClick={() => {
                            setDate(row.date);
                            setSubjectId(row.subjectId);
                            setTab("attendance");
                          }}
                          className="label-caps cursor-pointer border border-border px-2 py-1 hover:bg-secondary"
                        >
                          Edit
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
    </div>
  );
}
