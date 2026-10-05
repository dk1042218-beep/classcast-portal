import logo from "@/assets/logo.svg";
import { useEnsureSeed } from "@/components/portal/primitives";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { ArrowRight, Pin } from "lucide-react";
import { Link } from "react-router";

const WEEK_PREVIEW = [
  { day: "Monday", slots: ["Database · M3", "AI & IoT · M2", "Web Dev · M1", "Mini Project · Lab 2"] },
  { day: "Tuesday", slots: ["Web Dev · M1", "Database · M3", "AI & IoT · M2", "Free"] },
  { day: "Wednesday", slots: ["AI & IoT · M2", "Mini Project · Lab 2", "Web Dev · M1", "Database · M3"] },
];

const ATTENDANCE_PREVIEW = [
  { subject: "AI & IoT", code: "CS-301", present: 24, total: 25 },
  { subject: "Web Development", code: "CS-302", present: 21, total: 25 },
  { subject: "Database Systems", code: "CS-303", present: 24, total: 25 },
  { subject: "Mini Project", code: "CS-304", present: 14, total: 15 },
];

const NOTICES = [
  {
    category: "Examination",
    title: "Mid-semester examinations: 26 to 31 October",
    date: "02 Oct 2026",
    pinned: true,
    body: "Hall tickets are issued at the Office of Academics from 20 October against a signed attendance record.",
  },
  {
    category: "Academic",
    title: "Term I timetable effective from this Monday",
    date: "23 Sep 2026",
    pinned: true,
    body: "Rooms M1, M2, M3 and Lab 2 are allotted as printed. Report ten minutes early for the roll.",
  },
  {
    category: "Placement",
    title: "TCS pre-placement talk: Thursday 3:00 PM",
    date: "04 Oct 2026",
    pinned: false,
    body: "Register at the placement cell by Wednesday 5:00 PM with your roll number.",
  },
  {
    category: "Circular",
    title: "Library counters close at 5:30 PM during assessment week",
    date: "29 Sep 2026",
    pinned: false,
    body: "The reading room stays open until 7:00 PM. Books due must be renewed before hall tickets are issued.",
  },
];

const DESKS = [
  {
    title: "Student desk",
    tag: "Live in v1",
    tone: "text-accent border-accent/40 bg-accent/10",
    items: [
      "Portal ID + password sign-in",
      "Day sheet: classes, rooms, faculty",
      "Attendance register by subject",
      "Notes, handouts and downloads",
      "Assignments, deadlines, feedback",
      "Notices, alerts and profile",
    ],
  },
  {
    title: "Teaching desk",
    tag: "Version 2",
    tone: "text-muted-foreground border-border bg-muted",
    items: [
      "Start ClassCast and share a screen",
      "Upload notes and handouts",
      "Create and publish assignments",
      "Review submissions, award marks",
      "Mark and export attendance",
      "Class and student management",
    ],
  },
  {
    title: "Office of Academics",
    tag: "Version 2",
    tone: "text-muted-foreground border-border bg-muted",
    items: [
      "Student and teacher records",
      "Classes, subjects and timetable",
      "Attendance and activity reports",
      "Notice issuance and archives",
      "Password resets and deactivations",
      "CSV / PDF exports",
    ],
  },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();
  useEnsureSeed();

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logo} alt="" className="size-7 border border-border p-1" />
            <span className="font-editorial text-lg leading-none font-bold tracking-tight">
              ClassCast
            </span>
            <span className="label-caps hidden text-muted-foreground sm:inline">
              · VICS Academic Portal
            </span>
          </Link>
          <nav className="flex items-center gap-4">
            <a
              href="#desks"
              className="label-caps hidden text-muted-foreground hover:text-foreground sm:inline"
            >
              Modules
            </a>
            <a
              href="#records"
              className="label-caps hidden text-muted-foreground hover:text-foreground sm:inline"
            >
              Records
            </a>
            <a
              href="#notices"
              className="label-caps hidden text-muted-foreground hover:text-foreground sm:inline"
            >
              Notices
            </a>
            <Button size="sm" asChild>
              <Link to={isAuthenticated ? "/dashboard" : "/auth"}>
                {isAuthenticated ? "Open dashboard" : "Student sign-in"}
                <ArrowRight className="ml-1.5 size-3.5" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Masthead */}
      <section className="border-b border-border">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="label-caps flex flex-wrap items-baseline justify-between gap-2 border-b border-border py-2.5 text-muted-foreground">
            <span>
              Vidyanagar Institute of Computer Sciences · Office of Academics
            </span>
            <span>Bulletin No. 42 · Term I · AY 2026–27</span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="grid gap-8 py-10 lg:grid-cols-[1.35fr_1fr] lg:py-14"
          >
            <div>
              <h1 className="font-editorial text-4xl leading-[1.06] font-bold tracking-tight sm:text-5xl">
                The student record,
                <br />
                kept like a register.
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-6 text-muted-foreground">
                ClassCast is the Department of Computer Science's academic
                portal. Your timetable, attendance, handouts, assignments and
                office notices — dated, dependable and in one place, the way the
                office has always kept them.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button size="lg" asChild>
                  <Link to={isAuthenticated ? "/dashboard" : "/auth"}>
                    {isAuthenticated
                      ? "Open your dashboard"
                      : "Sign in to your student desk"}
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="#records">See how records look</a>
                </Button>
              </div>
              <p className="label-caps mt-4 text-muted-foreground">
                Sign in with the portal ID issued by the Office of Academics
              </p>
            </div>

            {/* Preview sheet */}
            <div className="border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <span className="label-caps">Day sheet · TYBSc CS</span>
                <span className="label-caps text-muted-foreground">Preview</span>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {WEEK_PREVIEW[0].slots.map((slot, index) => (
                    <tr key={slot + index}>
                      <td className="font-code w-24 border-b border-border px-4 py-2.5 text-muted-foreground tnum">
                        {["13:30", "14:30", "15:45", "16:45"][index]}
                      </td>
                      <td className="border-b border-border px-2 py-2.5 font-medium">
                        {slot}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
                {[
                  ["Attendance", "92%"],
                  ["Pending", "2"],
                  ["Notices", "4"],
                ].map(([label, value]) => (
                  <div key={label} className="px-3 py-2.5">
                    <div className="label-caps text-muted-foreground">
                      {label}
                    </div>
                    <div className="font-editorial mt-0.5 text-xl font-bold tnum">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Three desks */}
      <section id="desks" className="border-b border-border bg-card">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="label-caps flex items-baseline justify-between border-b border-border pb-2 text-muted-foreground">
            <span>What the portal handles</span>
            <span>Three desks · One record</span>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {DESKS.map((desk) => (
              <div key={desk.title} className="border border-border bg-background">
                <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                  <h3 className="font-editorial text-lg font-bold">
                    {desk.title}
                  </h3>
                  <span className={`label-caps border px-1.5 py-0.5 ${desk.tone}`}>
                    {desk.tag}
                  </span>
                </div>
                <ul className="divide-y divide-border">
                  {desk.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 px-4 py-2 text-sm"
                    >
                      <span className="mt-1.5 size-1 shrink-0 bg-muted-foreground" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Records preview */}
      <section id="records" className="border-b border-border">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="label-caps flex items-baseline justify-between border-b border-border pb-2 text-muted-foreground">
            <span>A week in the portal</span>
            <span>Sample records</span>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {/* Timetable */}
            <div className="border border-border bg-card">
              <div className="border-b border-border px-4 py-2.5">
                <span className="label-caps">Timetable · effective 01 Oct</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <thead>
                    <tr>
                      <th className="label-caps border-b border-border px-3 py-2 text-left font-normal text-muted-foreground">
                        Day
                      </th>
                      {["I", "II", "III", "IV"].map((slot) => (
                        <th
                          key={slot}
                          className="label-caps border-b border-border px-3 py-2 text-left font-normal text-muted-foreground"
                        >
                          {slot}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {WEEK_PREVIEW.map((row) => (
                      <tr key={row.day}>
                        <td className="border-b border-border px-3 py-2 font-medium whitespace-nowrap">
                          {row.day}
                        </td>
                        {row.slots.map((slot, index) => (
                          <td
                            key={`${row.day}-${index}`}
                            className="border-b border-border px-3 py-2 text-muted-foreground"
                          >
                            {slot}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Attendance */}
            <div className="border border-border bg-card">
              <div className="border-b border-border px-4 py-2.5">
                <span className="label-caps">
                  Attendance register · subject-wise
                </span>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {ATTENDANCE_PREVIEW.map((row) => {
                    const pct = Math.round((row.present / row.total) * 100);
                    return (
                      <tr key={row.code}>
                        <td className="border-b border-border px-4 py-2.5">
                          <span className="font-medium">{row.subject}</span>
                          <span className="label-caps ml-2 text-muted-foreground">
                            {row.code}
                          </span>
                        </td>
                        <td className="border-b border-border px-2 py-2.5 text-muted-foreground tnum whitespace-nowrap">
                          {row.present}/{row.total}
                        </td>
                        <td className="w-28 border-b border-border px-2 py-2.5">
                          <div className="h-1.5 w-full border border-border bg-muted">
                            <div
                              className={pct >= 75 ? "h-full bg-accent" : "h-full bg-primary"}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>
                        <td className="border-b border-border px-4 py-2.5 text-right font-medium tnum">
                          {pct}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="label-caps px-4 py-2.5 text-muted-foreground">
                Minimum required: 75% · Records updated after each lecture
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Notices */}
      <section id="notices" className="border-b border-border bg-card">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="label-caps flex items-baseline justify-between border-b border-border pb-2 text-muted-foreground">
            <span>From the notice board</span>
            <span>Issued by the Office of Academics</span>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {NOTICES.map((notice) => (
              <article
                key={notice.title}
                className="flex flex-col border border-border bg-background p-4"
              >
                <div className="flex items-center gap-2">
                  {notice.pinned && <Pin className="size-3.5 text-primary" />}
                  <span className="label-caps border border-border bg-secondary px-1.5 py-0.5">
                    {notice.category}
                  </span>
                  <span className="label-caps ml-auto text-muted-foreground">
                    {notice.date}
                  </span>
                </div>
                <h3 className="font-editorial mt-2 text-lg leading-snug font-bold">
                  {notice.title}
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                  {notice.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Record keeping */}
      <section className="border-b border-border">
        <div className="mx-auto grid w-full max-w-6xl gap-0 px-4 py-8 sm:px-6 md:grid-cols-3 lg:px-8">
          {[
            [
              "Salted password hashes",
              "Passwords are stretched with PBKDF2 and stored only as hashes — never in page code, never in plain text.",
            ],
            [
              "Role-based access",
              "Every record is fetched behind a session check; a student session cannot reach another desk's functions.",
            ],
            [
              "Server-side records",
              "Timetable, attendance, notes and marks are database rows — searched and filtered on the server.",
            ],
          ].map(([title, body], index) => (
            <div
              key={title}
              className={`px-0 py-4 md:px-5 ${index > 0 ? "border-t border-border md:border-t-0 md:border-l" : ""}`}
            >
              <p className="label-caps text-primary">0{index + 1}</p>
              <h4 className="font-editorial mt-1 text-base font-bold">
                {title}
              </h4>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-sidebar">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-start md:justify-between lg:px-8">
          <div>
            <p className="font-editorial text-lg font-bold">ClassCast</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Vidyanagar Institute of Computer Sciences
              <br />
              Department of Computer Science · Pune 411 038
              <br />
              Office of Academics · Mon–Fri, 9:30 AM – 5:30 PM
            </p>
          </div>
          <div className="flex gap-10 text-sm">
            <div>
              <p className="label-caps text-muted-foreground">Portal</p>
              <ul className="mt-2 space-y-1.5">
                <li>
                  <Link to={isAuthenticated ? "/dashboard" : "/auth"} className="hover:underline">
                    {isAuthenticated ? "Dashboard" : "Student sign-in"}
                  </Link>
                </li>
                <li>
                  <a href="#desks" className="hover:underline">Modules</a>
                </li>
                <li>
                  <a href="#notices" className="hover:underline">Notices</a>
                </li>
              </ul>
            </div>
            <div>
              <p className="label-caps text-muted-foreground">Version</p>
              <ul className="mt-2 space-y-1.5 text-muted-foreground">
                <li>ClassCast v1.0</li>
                <li>Student desk release</li>
                <li>AY 2026–27 · Term I</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-border">
          <p className="label-caps mx-auto w-full max-w-6xl px-4 py-3 text-muted-foreground sm:px-6 lg:px-8">
            © 2026 Office of Academics · Built for the Department of Computer
            Science
          </p>
        </div>
      </footer>
    </div>
  );
}
