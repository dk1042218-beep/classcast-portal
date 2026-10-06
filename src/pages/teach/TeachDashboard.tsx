import { api } from "@/convex/_generated/api";
import {
  EmptyState,
  formatDate,
  formatLongDate,
  Meter,
  Panel,
  StatBlock,
  StatusTag,
  TD,
  TH,
  timeAgo,
  toneForPct,
} from "@/components/portal/primitives";
import { Button } from "@/components/ui/button";
import { useQuery } from "convex/react";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router";

const TODAY_LABEL = formatLongDate(Date.now());

function Loading() {
  return (
    <div className="flex justify-center py-28">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

export default function TeachDashboard() {
  const overview = useQuery(api.teacher.overview);
  const navigate = useNavigate();

  if (!overview) return <Loading />;

  const firstName = overview.teacher.name.split(" ")[0] || "Faculty";
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const inClass = overview.lectures.find(
    (row) => toMinutes(row.start) <= minutes && toMinutes(row.end) > minutes,
  );
  const nextLecture = overview.lectures.find((row) => toMinutes(row.end) > minutes);

  return (
    <div>
      {/* Masthead */}
      <header className="rule-double mb-5 flex flex-wrap items-end justify-between gap-4 pb-3">
        <div>
          <p className="label-caps text-muted-foreground">
            {overview.teacher.designation || "Faculty"} ·{" "}
            {overview.teacher.department || "Department"} ·{" "}
            {overview.teacher.portalId}
          </p>
          <h1 className="font-editorial mt-1 text-2xl leading-tight font-bold tracking-tight sm:text-3xl">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {TODAY_LABEL} · {overview.today} schedule ·{" "}
            {overview.classes.join(", ") || "No class allotted"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="cursor-pointer"
            onClick={() => navigate("/teach/classes")}
          >
            Mark attendance
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="cursor-pointer"
            onClick={() => navigate("/teach/notes")}
          >
            Upload note
          </Button>
          <Button
            size="sm"
            className="cursor-pointer"
            onClick={() => navigate("/teach/assignments")}
          >
            New assignment
          </Button>
        </div>
      </header>

      {/* Statistics */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatBlock
          label="Students taught"
          value={overview.studentCount}
          sub={`${overview.classes.length} class${overview.classes.length === 1 ? "" : "es"} · ${overview.subjects.length} subjects`}
        />
        <StatBlock
          label="Awaiting marks"
          value={overview.pendingGrading}
          sub={
            overview.pendingGrading > 0
              ? "Submissions to review"
              : "Inbox clear"
          }
          tone={overview.pendingGrading > 0 ? "alert" : "neutral"}
        />
        <StatBlock
          label="Class attendance"
          value={`${overview.attendance.pct}%`}
          sub={`${overview.attendance.present} of ${overview.attendance.total} lectures`}
          tone={toneForPct(overview.attendance.pct)}
        />
        <StatBlock
          label={inClass ? "Teaching now" : "Next lecture"}
          value={inClass ? inClass.subjectCode : (nextLecture?.subjectCode ?? "—")}
          sub={
            inClass
              ? `${inClass.start}–${inClass.end} · ${inClass.className} · ${inClass.room}`
              : nextLecture
                ? `${nextLecture.start}–${nextLecture.end} · ${nextLecture.className} · ${nextLecture.room}`
                : overview.lectures.length
                  ? "Today's lectures complete"
                  : "No lectures scheduled today"
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          {/* Today's teaching */}
          <Panel
            title="Today's teaching"
            meta={`${overview.lectures.length} lectures`}
            action={
              <Link
                to="/teach/classes"
                className="label-caps flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                Attendance <ArrowUpRight className="size-3" />
              </Link>
            }
          >
            {overview.lectures.length === 0 ? (
              <EmptyState>
                No lectures scheduled for you today. The weekly roster is on the
                Classes & Attendance page.
              </EmptyState>
            ) : (
              <div className="-mx-3 overflow-x-auto sm:-mx-4">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr>
                      <th className={TH}>Time</th>
                      <th className={TH}>Code</th>
                      <th className={TH}>Subject</th>
                      <th className={TH}>Class</th>
                      <th className={TH}>Room</th>
                      <th className={TH}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.lectures.map((row) => {
                      const state =
                        toMinutes(row.end) <= minutes
                          ? "done"
                          : toMinutes(row.start) <= minutes
                            ? "now"
                            : "later";
                      return (
                        <tr key={`${row.className}-${row.start}`}>
                          <td className={`${TD} font-code whitespace-nowrap tnum`}>
                            {row.start}–{row.end}
                          </td>
                          <td className={`${TD} font-code`}>{row.subjectCode}</td>
                          <td className={`${TD} font-medium`}>{row.subject}</td>
                          <td className={TD}>{row.className}</td>
                          <td className={`${TD} font-code`}>{row.room}</td>
                          <td className={TD}>
                            <StatusTag
                              tone={
                                state === "now"
                                  ? "alert"
                                  : state === "done"
                                    ? "slate"
                                    : "neutral"
                              }
                            >
                              {state === "now"
                                ? "In progress"
                                : state === "done"
                                  ? "Completed"
                                  : "Scheduled"}
                            </StatusTag>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {/* Pending grading */}
          <Panel
            title="Pending evaluation"
            meta={`${overview.pendingGrading} submissions ungraded`}
            action={
              <Link
                to="/teach/assignments"
                className="label-caps flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                Review <ArrowUpRight className="size-3" />
              </Link>
            }
          >
            {overview.pending.length === 0 ? (
              <EmptyState>
                Nothing awaiting marks. Every submission has been reviewed.
              </EmptyState>
            ) : (
              <ul className="divide-y divide-border">
                {overview.pending.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      <p className="label-caps mt-0.5 text-muted-foreground">
                        {item.subjectCode} · {item.className} · due{" "}
                        {formatDate(item.dueAt)} · {item.submitted} submitted
                      </p>
                    </div>
                    <StatusTag tone="alert">{item.ungraded} to mark</StatusTag>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {/* Attendance by subject */}
          <Panel
            title="Attendance across your subjects"
            meta={`Overall ${overview.attendance.pct}%`}
          >
            {overview.attendance.bySubject.length === 0 ? (
              <EmptyState>No attendance recorded yet.</EmptyState>
            ) : (
              <div className="-mx-3 overflow-x-auto sm:-mx-4">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr>
                      <th className={TH}>Subject</th>
                      <th className={TH}>Code</th>
                      <th className={TH}>Class</th>
                      <th className={TH}>Present</th>
                      <th className={TH}>Total</th>
                      <th className={TH}>%</th>
                      <th className={TH}>Record</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.attendance.bySubject.map((row) => (
                      <tr key={row.subjectId}>
                        <td className={`${TD} font-medium`}>{row.name}</td>
                        <td className={`${TD} font-code`}>{row.code}</td>
                        <td className={TD}>{row.className}</td>
                        <td className={`${TD} tnum`}>{row.present}</td>
                        <td className={`${TD} tnum`}>{row.total}</td>
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
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          <Panel title="Your subjects" meta={`${overview.subjects.length} allotted`}>
            <ul className="divide-y divide-border">
              {overview.subjects.map((subject) => (
                <li key={subject.id} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      <span className="font-code">{subject.code}</span> ·{" "}
                      {subject.name}
                    </p>
                    <StatusTag tone="slate">{subject.className}</StatusTag>
                  </div>
                  <p className="label-caps mt-0.5 text-muted-foreground">
                    {subject.room} · {subject.credits} credits
                  </p>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Latest submissions" meta="Across your subjects">
            {overview.recent.length === 0 ? (
              <EmptyState>No submissions recorded yet.</EmptyState>
            ) : (
              <ul className="divide-y divide-border">
                {overview.recent.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {item.student}
                      </p>
                      <p className="label-caps mt-0.5 text-muted-foreground">
                        {item.activity} · {timeAgo(item.submittedAt)}
                        {item.isLate ? " · late" : ""}
                      </p>
                    </div>
                    <StatusTag tone={item.graded ? "info" : "warn"}>
                      {item.graded ? "Marked" : "Ungraded"}
                    </StatusTag>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="Desk actions"
            meta={`${overview.notesCount} notes · ${overview.activitiesCount} assignments`}
          >
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Classes & roster", to: "/teach/classes" },
                { label: "Notes & uploads", to: "/teach/notes" },
                { label: "Assignments", to: "/teach/assignments" },
                { label: "Notice board", to: "/notices" },
                { label: "Search portal", to: "/search" },
                { label: "Profile", to: "/profile" },
              ].map((action) => (
                <Link
                  key={action.to}
                  to={action.to}
                  className="border border-border px-3 py-2 text-center text-sm hover:bg-secondary"
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </Panel>

          <Panel title="Recent notices" meta="Your classes">
            <p className="text-sm text-muted-foreground">
              Class notices you post appear on the notice board for every
              student in the audience.
            </p>
            <Link
              to="/notices"
              className="label-caps mt-3 inline-flex items-center gap-1 border border-border px-2 py-1.5 hover:bg-secondary"
            >
              Open notice board <ArrowUpRight className="size-3" />
            </Link>
          </Panel>
        </div>
      </div>
    </div>
  );
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
