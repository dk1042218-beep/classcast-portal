import { api } from "@/convex/_generated/api";
import {
  EmptyState,
  formatDate,
  formatLongDate,
  Meter,
  Panel,
  StatBlock,
  StatusTag,
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

export default function AdminDashboard() {
  const overview = useQuery(api.admin.overview);
  const navigate = useNavigate();

  if (!overview) return <Loading />;

  const c = overview.counts;

  return (
    <div>
      <header className="rule-double mb-5 flex flex-wrap items-end justify-between gap-4 pb-3">
        <div>
          <p className="label-caps text-muted-foreground">
            Office of Academics · {overview.admin.portalId} ·{" "}
            {overview.admin.email}
          </p>
          <h1 className="font-editorial mt-1 text-2xl leading-tight font-bold tracking-tight sm:text-3xl">
            Administration desk
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {TODAY_LABEL} ·{" "}
            {overview.settings
              ? `${overview.settings.academicYear} · ${overview.settings.term} · minimum attendance ${overview.settings.minAttendance}%`
              : "Portal settings not yet configured"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="cursor-pointer"
            onClick={() => navigate("/admin/students")}
          >
            Manage students
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="cursor-pointer"
            onClick={() => navigate("/admin/academics")}
          >
            Academics
          </Button>
          <Button
            size="sm"
            className="cursor-pointer"
            onClick={() => navigate("/admin/reports")}
          >
            Reports
          </Button>
        </div>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatBlock
          label="Students"
          value={c.students}
          sub={`${c.inactive} inactive account${c.inactive === 1 ? "" : "s"}`}
        />
        <StatBlock
          label="Faculty"
          value={c.teachers}
          sub={`${c.subjects} subjects · ${c.classes} classes`}
        />
        <StatBlock
          label="Attendance"
          value={`${overview.attendance.pct}%`}
          sub={`${overview.attendance.present} of ${overview.attendance.total} records`}
          tone={overview.attendance.pct >= 75 ? "info" : "alert"}
        />
        <StatBlock
          label="Ungraded"
          value={c.ungraded}
          sub={`${c.submissions} submissions · ${c.late} late`}
          tone={c.ungraded > 0 ? "alert" : "neutral"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Panel title="Portal record" meta="Live counts from the database">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                ["Classes", c.classes],
                ["Subjects", c.subjects],
                ["Timetable slots", c.lectures],
                ["Assignments", c.activities],
                ["Submissions", c.submissions],
                ["Notices", c.notices],
                ["Notes & files", c.notes],
                ["Attendance rows", overview.attendance.total],
                ["Today's records", overview.attendance.todayRecords],
              ].map(([label, value]) => (
                <div key={label} className="border border-border px-3 py-2">
                  <div className="label-caps text-muted-foreground">{label}</div>
                  <div className="font-editorial mt-0.5 text-xl leading-none font-bold tnum">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            title="Upcoming deadlines"
            meta="Assignments across the portal"
            action={
              <Link
                to="/admin/reports"
                className="label-caps flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                All work <ArrowUpRight className="size-3" />
              </Link>
            }
          >
            {overview.upcoming.length === 0 ? (
              <EmptyState>No open deadlines on the portal.</EmptyState>
            ) : (
              <ul className="divide-y divide-border">
                {overview.upcoming.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      <p className="label-caps mt-0.5 text-muted-foreground">
                        {item.className} · due {formatDate(item.dueAt)} ·{" "}
                        {item.points} marks
                      </p>
                    </div>
                    <StatusTag tone="slate">scheduled</StatusTag>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Attendance standing" meta="Institution-wide">
            <div className="flex items-center gap-4">
              <div className="border border-border px-4 py-3 text-center">
                <div className="label-caps text-muted-foreground">Overall</div>
                <div className="font-editorial mt-0.5 text-3xl leading-none font-bold tnum">
                  {overview.attendance.pct}%
                </div>
              </div>
              <div className="min-w-52 flex-1">
                <Meter pct={overview.attendance.pct} />
                <p className="mt-2 text-sm text-muted-foreground">
                  {overview.attendance.present} present of{" "}
                  {overview.attendance.total} recorded lectures ·{" "}
                  {overview.attendance.todayRecords} rows filed today.
                </p>
              </div>
              <Link
                to="/admin/reports"
                className="label-caps shrink-0 border border-border px-2.5 py-1.5 hover:bg-secondary"
              >
                Full report →
              </Link>
            </div>
          </Panel>
        </div>

        <div className="flex flex-col gap-4">
          <Panel title="Recent notices" meta="Latest on the board">
            {overview.recentNotices.length === 0 ? (
              <EmptyState>No notices posted yet.</EmptyState>
            ) : (
              <ul className="divide-y divide-border">
                {overview.recentNotices.map((notice) => (
                  <li key={notice.id} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <StatusTag
                        tone={notice.pinned ? "alert" : "slate"}
                      >
                        {notice.category}
                      </StatusTag>
                      <span className="label-caps ml-auto text-muted-foreground">
                        {notice.dateStr}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm leading-snug font-medium">
                      {notice.title}
                    </p>
                    <p className="label-caps mt-0.5 text-muted-foreground">
                      Audience: {notice.audience}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Registry actions">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Students", to: "/admin/students" },
                { label: "Teachers", to: "/admin/teachers" },
                { label: "Academics", to: "/admin/academics" },
                { label: "Reports", to: "/admin/reports" },
                { label: "Notices", to: "/notices" },
                { label: "Settings", to: "/admin/settings" },
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

          <Panel title="Session">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {overview.admin.name}
                </p>
                <p className="label-caps mt-0.5 text-muted-foreground">
                  Signed in · this session
                </p>
              </div>
              <StatusTag tone="info">Registrar desk</StatusTag>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
