import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  EmptyState,
  formatDate,
  Loader,
  Meter,
  PageHeader,
  Panel,
  StatBlock,
  StatusTag,
  TD,
  TH,
} from "@/components/portal/primitives";
import { useQuery } from "convex/react";
import { useState } from "react";

type Tab = "attendance" | "assignments";

export default function AdminReports() {
  const academics = useQuery(api.admin.academics);
  const [tab, setTab] = useState<Tab>("attendance");
  const [filterClass, setFilterClass] = useState<string>("");
  const [filterSubject, setFilterSubject] = useState<string>("");

  const report = useQuery(api.admin.attendanceReport, {
    className: filterClass || undefined,
    subjectId: (filterSubject || undefined) as Id<"subjects"> | undefined,
  });
  const assignments = useQuery(api.admin.assignmentsOverview);

  if (!academics || !report || !assignments) return <Loader />;

  const subjectsForClass = academics.subjects.filter(
    (s) => !filterClass || s.className === filterClass,
  );

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Attendance and assignment records across the portal, aggregated live from the database."
        action={
          <span className="label-caps border border-border bg-secondary px-2 py-1 text-muted-foreground">
            {report.total} attendance rows · {assignments.totals.submissions}{" "}
            submissions
          </span>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["attendance", "Attendance report"],
            ["assignments", "Assignments & submissions"],
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
        <>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="rep-class" className="label-caps text-muted-foreground">
                Class
              </label>
              <select
                id="rep-class"
                value={filterClass}
                onChange={(event) => {
                  setFilterClass(event.target.value);
                  setFilterSubject("");
                }}
                className="mt-1.5 block cursor-pointer border border-border bg-card px-2 py-2 text-sm outline-none"
              >
                <option value="">All classes</option>
                {academics.classes.map((cls) => (
                  <option key={cls.id} value={cls.name}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="rep-subject" className="label-caps text-muted-foreground">
                Subject
              </label>
              <select
                id="rep-subject"
                value={filterSubject}
                onChange={(event) => setFilterSubject(event.target.value)}
                className="mt-1.5 block cursor-pointer border border-border bg-card px-2 py-2 text-sm outline-none"
              >
                <option value="">All subjects</option>
                {subjectsForClass.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.code} · {subject.name}
                  </option>
                ))}
              </select>
            </div>
            <span className="label-caps border border-border bg-secondary px-2 py-2 text-muted-foreground">
              {report.filter.className ?? "All classes"} ·{" "}
              {report.filter.subjectId
                ? subjectsForClass.find((s) => s.id === filterSubject)?.code ??
                  "subject"
                : "all subjects"}
            </span>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatBlock
              label="Records"
              value={report.total}
              sub={`${report.students.length} students with entries`}
            />
            <StatBlock
              label="Present"
              value={report.present}
              sub={`${report.total - report.present} absent or late`}
            />
            <StatBlock
              label="Attendance"
              value={`${report.pct}%`}
              sub={report.pct >= 75 ? "Above the 75% floor" : "Below the 75% floor"}
              tone={report.pct >= 75 ? "info" : "alert"}
            />
            <StatBlock
              label="Subjects"
              value={report.subjects.length}
              sub={`${report.days.length} days with records`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Per-student standing" meta={`${report.students.length} students`}>
              {report.students.length === 0 ? (
                <EmptyState>No attendance recorded yet.</EmptyState>
              ) : (
                <div className="-mx-3 overflow-x-auto sm:-mx-4">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr>
                        <th className={TH}>Roll</th>
                        <th className={TH}>Student</th>
                        <th className={TH}>Class</th>
                        <th className={TH}>P</th>
                        <th className={TH}>A</th>
                        <th className={TH}>L</th>
                        <th className={TH}>%</th>
                        <th className={TH}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.students.map((row) => (
                        <tr key={row.studentId}>
                          <td className={`${TD} font-code tnum`}>{row.rollNo}</td>
                          <td className={`${TD} font-medium`}>{row.name}</td>
                          <td className={TD}>{row.className}</td>
                          <td className={`${TD} tnum`}>{row.present}</td>
                          <td className={`${TD} tnum`}>{row.absent}</td>
                          <td className={`${TD} tnum`}>{row.late}</td>
                          <td className={`${TD} tnum font-medium`}>{row.pct}%</td>
                          <td className={`${TD} w-32`}>
                            <Meter pct={row.pct} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <div className="flex flex-col gap-4">
              <Panel title="Per-subject standing" meta={`${report.subjects.length} subjects`}>
                {report.subjects.length === 0 ? (
                  <EmptyState>No subject records yet.</EmptyState>
                ) : (
                  <div className="-mx-3 overflow-x-auto sm:-mx-4">
                    <table className="w-full min-w-[480px] text-sm">
                      <thead>
                        <tr>
                          <th className={TH}>Code</th>
                          <th className={TH}>Subject</th>
                          <th className={TH}>Class</th>
                          <th className={TH}>Present</th>
                          <th className={TH}>Total</th>
                          <th className={TH}>%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.subjects.map((row) => (
                          <tr key={row.subjectId}>
                            <td className={`${TD} font-code`}>{row.code}</td>
                            <td className={`${TD} font-medium`}>{row.name}</td>
                            <td className={TD}>{row.className}</td>
                            <td className={`${TD} tnum`}>{row.present}</td>
                            <td className={`${TD} tnum`}>{row.total}</td>
                            <td className={`${TD} tnum font-medium`}>{row.pct}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>

              <Panel title="Daily attendance" meta="Last 30 recorded days">
                {report.days.length === 0 ? (
                  <EmptyState>No days recorded yet.</EmptyState>
                ) : (
                  <ul className="max-h-72 divide-y divide-border overflow-y-auto">
                    {report.days.map((day) => (
                      <li
                        key={day.date}
                        className="flex items-center justify-between gap-3 py-2 text-sm"
                      >
                        <span className="font-code tnum">{day.date}</span>
                        <span className="text-muted-foreground tnum">
                          {day.present}/{day.total}
                        </span>
                        <span className="w-28">
                          <Meter pct={day.pct} />
                        </span>
                        <span className="w-10 text-right font-medium tnum">
                          {day.pct}%
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          </div>
        </>
      )}

      {tab === "assignments" && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatBlock label="Assignments" value={assignments.totals.activities} />
            <StatBlock label="Submissions" value={assignments.totals.submissions} />
            <StatBlock
              label="Graded"
              value={assignments.totals.graded}
              sub={`${assignments.totals.ungraded} awaiting marks`}
              tone={assignments.totals.ungraded > 0 ? "alert" : "info"}
            />
            <StatBlock
              label="Late"
              value={assignments.totals.late}
              sub="Submitted after deadline"
              tone={assignments.totals.late > 0 ? "warn" : "neutral"}
            />
            <StatBlock
              label="Classes"
              value={new Set(assignments.activities.map((a) => a.className)).size}
              sub="With published work"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Panel
              title="Assignment register"
              meta={`${assignments.activities.length} published`}
              className="lg:col-span-2"
            >
              {assignments.activities.length === 0 ? (
                <EmptyState>No assignments published on the portal yet.</EmptyState>
              ) : (
                <div className="-mx-3 overflow-x-auto sm:-mx-4">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr>
                        <th className={TH}>Title</th>
                        <th className={TH}>Class</th>
                        <th className={TH}>Subject</th>
                        <th className={TH}>Due</th>
                        <th className={TH}>Marks</th>
                        <th className={TH}>Submitted</th>
                        <th className={TH}>Graded</th>
                        <th className={TH}>Late</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.activities.map((item) => (
                        <tr key={item.id}>
                          <td className={`${TD} font-medium`}>{item.title}</td>
                          <td className={TD}>{item.className}</td>
                          <td className={`${TD} font-code`}>{item.subjectCode}</td>
                          <td className={`${TD} font-code whitespace-nowrap tnum`}>
                            {item.dueDateStr}
                          </td>
                          <td className={`${TD} tnum`}>{item.points}</td>
                          <td className={`${TD} tnum`}>{item.submitted}</td>
                          <td className={`${TD} tnum`}>{item.graded}</td>
                          <td className={`${TD} tnum`}>{item.late}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <Panel title="Latest submissions" meta={`${assignments.recent.length} recent`}>
              {assignments.recent.length === 0 ? (
                <EmptyState>No submissions recorded yet.</EmptyState>
              ) : (
                <ul className="divide-y divide-border">
                  {assignments.recent.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {row.student}
                        </p>
                        <p className="label-caps mt-0.5 text-muted-foreground">
                          {row.activity} · {row.className} ·{" "}
                          {formatDate(row.submittedAt)}
                          {row.isLate ? " · late" : ""}
                        </p>
                      </div>
                      <StatusTag tone={row.score !== null ? "info" : "warn"}>
                        {row.score !== null
                          ? `${row.score}/${row.points ?? "?"}`
                          : "ungraded"}
                      </StatusTag>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
