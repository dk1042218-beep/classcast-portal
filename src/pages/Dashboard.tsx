import { api } from "@/convex/_generated/api";
import {
  dueLabel,
  formatBytes,
  formatDate,
  formatLongDate,
  initials,
  Meter,
  Panel,
  StatBlock,
  StatusTag,
  TD,
  TH,
  timeAgo,
  todayInfo,
  toneForPct,
  toneForState,
} from "@/components/portal/primitives";
import { Button } from "@/components/ui/button";
import { useQuery } from "convex/react";
import {
  ArrowUpRight,
  Download,
  Loader2,
  Megaphone,
  Pin,
} from "lucide-react";
import { Link, useNavigate } from "react-router";

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** Session-fixed date line — computed once at module load. */
const TODAY_LABEL = formatLongDate(Date.now());

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

function Loading() {
  return (
    <div className="flex justify-center py-28">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function Dashboard() {
  const { today, day } = todayInfo();
  const overview = useQuery(api.studentDashboard.overview, { today, day });
  const navigate = useNavigate();

  if (!overview) return <Loading />;

  const firstName = overview.student.name.split(" ")[0] || "Student";
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const nextClass = overview.today.find((row) => toMinutes(row.end) > minutes);
  const inClass = overview.today.find(
    (row) =>
      toMinutes(row.start) <= minutes && toMinutes(row.end) > minutes,
  );

  const stateLabel: Record<string, string> = {
    open: "Open",
    overdue: "Overdue",
    submitted: "Submitted",
    graded: "Graded",
    missing: "Missing",
  };

  return (
    <div>
      {/* Masthead */}
      <header className="rule-double mb-5 flex flex-wrap items-end justify-between gap-4 pb-3">
        <div>
          <p className="label-caps text-muted-foreground">
            {overview.classInfo?.name ?? overview.student.className} · Roll{" "}
            {overview.student.rollNo} · {overview.student.portalId}
          </p>
          <h1 className="font-editorial mt-1 text-2xl leading-tight font-bold tracking-tight sm:text-3xl">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {TODAY_LABEL} ·{" "}
            {overview.classInfo
              ? `${overview.classInfo.term} · AY ${overview.classInfo.academicYear} · Mentor ${overview.classInfo.mentor}`
              : "Class record pending"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="cursor-pointer"
            onClick={() => navigate("/assignments")}
          >
            Submit work
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="cursor-pointer"
            onClick={() => navigate("/notes")}
          >
            Browse notes
          </Button>
          <Button size="sm" className="cursor-pointer" onClick={() => navigate("/timetable")}>
            Full timetable
          </Button>
        </div>
      </header>

      {/* Statistics */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatBlock
          label="Attendance"
          value={`${overview.attendance.pct}%`}
          sub={`${overview.attendance.present} of ${overview.attendance.total} lectures`}
          tone={toneForPct(overview.attendance.pct)}
        />
        <StatBlock
          label="Pending work"
          value={overview.pendingCount}
          sub={
            overview.overdueCount > 0
              ? `${overview.overdueCount} past the deadline`
              : "Nothing overdue"
          }
          tone={overview.overdueCount > 0 ? "alert" : "neutral"}
        />
        <StatBlock
          label="Unread notices"
          value={overview.unread}
          sub="Notices and alerts"
          tone={overview.unread > 0 ? "info" : "neutral"}
        />
        <StatBlock
          label={inClass ? "In class now" : "Next lecture"}
          value={inClass ? inClass.subject.code : (nextClass?.subject.code ?? "—")}
          sub={
            inClass
              ? `${inClass.start}–${inClass.end} · ${inClass.room}`
              : nextClass
                ? `${nextClass.start}–${nextClass.end} · ${nextClass.room}`
                : overview.today.length
                  ? "Day's lectures complete"
                  : "No lectures scheduled"
          }
        />
      </div>

      {/* Main grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          {/* Today's timetable */}
          <Panel
            title="Today's timetable"
            meta={`${overview.today.length} lectures`}
            action={
              <Link
                to="/timetable"
                className="label-caps flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                Week <ArrowUpRight className="size-3" />
              </Link>
            }
          >
            {overview.today.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">
                No lectures scheduled for this day. The weekly grid is on the
                timetable page.
              </p>
            ) : (
              <div className="-mx-3 overflow-x-auto sm:-mx-4">
                <table className="w-full min-w-[540px] text-sm">
                  <thead>
                    <tr>
                      <th className={TH}>Time</th>
                      <th className={TH}>Code</th>
                      <th className={TH}>Subject</th>
                      <th className={TH}>Room</th>
                      <th className={TH}>Faculty</th>
                      <th className={TH}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.today.map((row) => {
                      const state =
                        toMinutes(row.end) <= minutes
                          ? "done"
                          : toMinutes(row.start) <= minutes
                            ? "now"
                            : "later";
                      return (
                        <tr key={row.slot}>
                          <td className={`${TD} font-code whitespace-nowrap tnum`}>
                            {row.start}–{row.end}
                          </td>
                          <td className={`${TD} font-code`}>
                            {row.subject.code}
                          </td>
                          <td className={`${TD} font-medium`}>
                            {row.subject.name}
                          </td>
                          <td className={`${TD} font-code`}>{row.room}</td>
                          <td className={TD}>{row.subject.teacher}</td>
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

          {/* Attendance by subject */}
          <Panel
            title="Attendance by subject"
            meta={`Overall ${overview.attendance.pct}%`}
            action={
              <Link
                to="/attendance"
                className="label-caps flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                Register <ArrowUpRight className="size-3" />
              </Link>
            }
          >
            <div className="-mx-3 overflow-x-auto sm:-mx-4">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr>
                    <th className={TH}>Subject</th>
                    <th className={TH}>Code</th>
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
                      <td className={`${TD} tnum`}>{row.present}</td>
                      <td className={`${TD} tnum`}>{row.total}</td>
                      <td className={`${TD} tnum font-medium`}>{row.pct}%</td>
                      <td className={`${TD} w-40`}>
                        <Meter pct={row.pct} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* Deadlines + submission status */}
          <div className="grid gap-4 md:grid-cols-2">
            <Panel
              title="Upcoming deadlines"
              meta={`${overview.deadlines.length} open`}
              action={
                <Link
                  to="/assignments"
                  className="label-caps flex items-center gap-1 text-muted-foreground hover:text-foreground"
                >
                  All <ArrowUpRight className="size-3" />
                </Link>
              }
            >
              {overview.deadlines.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing pending. The office has no open work for you.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {overview.deadlines.map((item) => {
                    const label = dueLabel(item.dueAt);
                    return (
                      <li
                        key={item.id}
                        className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {item.title}
                          </p>
                          <p className="label-caps mt-0.5 text-muted-foreground">
                            {item.subjectCode} · {formatDate(item.dueAt)} ·{" "}
                            {item.points} marks
                          </p>
                        </div>
                        <StatusTag tone={label.tone}>
                          {label.text}
                        </StatusTag>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            <Panel title="Submission status" meta="Latest work">
              <ul className="divide-y divide-border">
                {overview.recentActivity.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {item.title}
                      </p>
                      <p className="label-caps mt-0.5 text-muted-foreground">
                        {item.subjectCode} · due {formatDate(item.dueAt)}
                        {item.isLate ? " · late" : ""}
                      </p>
                    </div>
                    <StatusTag tone={toneForState(item.state)}>
                      {item.score !== null
                        ? `${item.score}/${item.points}`
                        : stateLabel[item.state]}
                    </StatusTag>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          <Panel
            title="Notice board"
            meta="Posted by the office"
            action={
              <Link
                to="/notices"
                className="label-caps flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                All <ArrowUpRight className="size-3" />
              </Link>
            }
          >
            <ul className="divide-y divide-border">
              {overview.notices.map((notice) => (
                <li key={notice.id} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    {notice.pinned && (
                      <Pin className="size-3 shrink-0 text-primary" />
                    )}
                    <StatusTag tone={notice.pinned ? "alert" : "slate"}>
                      {notice.category}
                    </StatusTag>
                    <span className="label-caps ml-auto text-muted-foreground">
                      {notice.dateStr}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-snug font-medium">
                    {notice.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {notice.body}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            title="Recent notes"
            meta="Handouts & files"
            action={
              <Link
                to="/notes"
                className="label-caps flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                Library <ArrowUpRight className="size-3" />
              </Link>
            }
          >
            <ul className="divide-y divide-border">
              {overview.recentNotes.map((note) => (
                <li
                  key={note.id}
                  className="flex items-center gap-3 py-2 first:pt-0 last:pb-0"
                >
                  <span className="label-caps border border-border bg-secondary px-1 py-0.5 text-muted-foreground">
                    PDF
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{note.title}</p>
                    <p className="label-caps mt-0.5 text-muted-foreground">
                      {note.subjectCode} · {formatDate(note.uploadedAt)} ·{" "}
                      {formatBytes(note.sizeBytes)}
                    </p>
                  </div>
                  {note.fileUrl && (
                    <a
                      href={note.fileUrl}
                      download={note.fileName}
                      target="_blank"
                      rel="noreferrer"
                      className="cursor-pointer border border-border p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      aria-label={`Download ${note.fileName}`}
                    >
                      <Download className="size-3.5" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            title="Notifications"
            meta={`${overview.unread} unread`}
            action={
              <Link
                to="/notifications"
                className="label-caps flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                All <ArrowUpRight className="size-3" />
              </Link>
            }
          >
            <ul className="divide-y divide-border">
              {overview.notifications.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start gap-2 py-2 first:pt-0 last:pb-0"
                >
                  <span
                    className={`mt-1.5 size-1.5 shrink-0 ${item.read ? "bg-border" : "bg-primary"}`}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm">{item.title}</p>
                    <p className="label-caps mt-0.5 text-muted-foreground">
                      {timeAgo(item.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Quick actions">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Timetable", to: "/timetable" },
                { label: "Attendance", to: "/attendance" },
                { label: "Notes & files", to: "/notes" },
                { label: "Assignments", to: "/assignments" },
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

          <div className="flex items-center gap-3 border border-border bg-card px-3 py-2.5">
            <span className="flex size-9 items-center justify-center bg-secondary text-sm font-semibold">
              {initials(overview.student.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {overview.student.name}
              </p>
              <p className="label-caps text-muted-foreground">
                {overview.student.className} · {overview.student.department}
              </p>
            </div>
            <Megaphone className="ml-auto size-4 text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}
