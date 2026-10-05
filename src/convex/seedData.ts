import { DAY_MS, dayKeyOf, isoDate, utcMidnight } from "./lib";

/**
 * Deterministic demo dataset for the ClassCast student desk.
 * All timestamps are derived from the moment the seed runs so the portal
 * always shows a live academic term.
 */

export const INSTITUTION = {
  name: "Vidyanagar Institute of Computer Sciences",
  short: "VICS",
  city: "Pune",
  department: "Department of Computer Science",
};

/** Demo sign-in secret for seeded student accounts (backend seed only). */
export const DEMO_PASSWORD = "Classcast@2026";

export const SLOTS = [
  { slot: 1, start: "13:30", end: "14:25" },
  { slot: 2, start: "14:30", end: "15:25" },
  { slot: 3, start: "15:45", end: "16:40" },
  { slot: 4, start: "16:45", end: "17:40" },
];

/** Lecture grid for TYBSc CS, Monday to Friday. `null` = free period. */
export const SCHEDULE: Record<string, (string | null)[]> = {
  mon: ["CS-303", "CS-301", "CS-302", "CS-304"],
  tue: ["CS-302", "CS-303", "CS-301", null],
  wed: ["CS-301", "CS-304", "CS-302", "CS-303"],
  thu: ["CS-303", "CS-301", "CS-302", null],
  fri: ["CS-304", "CS-302", "CS-301", "CS-303"],
};

export interface SeedUser {
  name: string;
  email: string;
  portalId: string;
  role: "student" | "teacher" | "admin";
  className?: string;
  rollNo?: string;
  department?: string;
  designation?: string;
  phone?: string;
  password?: string;
}

export const USERS: SeedUser[] = [
  { name: "Ayaan Khan", portalId: "ST-101", role: "student", email: "ayaan.khan@vics.ac.in", phone: "+91 98220 41101", className: "TYBSc CS", rollNo: "101", department: "Computer Science", password: DEMO_PASSWORD },
  { name: "Sara Fernandes", portalId: "ST-102", role: "student", email: "sara.fernandes@vics.ac.in", phone: "+91 98220 41102", className: "TYBSc CS", rollNo: "102", department: "Computer Science", password: DEMO_PASSWORD },
  { name: "Rehan Patil", portalId: "ST-103", role: "student", email: "rehan.patil@vics.ac.in", phone: "+91 98220 41103", className: "TYBSc CS", rollNo: "103", department: "Computer Science", password: DEMO_PASSWORD },
  { name: "Dilshad Ansari", portalId: "ST-104", role: "student", email: "dilshad.ansari@vics.ac.in", phone: "+91 98220 41104", className: "TYBSc CS", rollNo: "104", department: "Computer Science", password: DEMO_PASSWORD },
  { name: "Meera Joshi", portalId: "ST-105", role: "student", email: "meera.joshi@vics.ac.in", phone: "+91 98220 41105", className: "TYBSc CS", rollNo: "105", department: "Computer Science", password: DEMO_PASSWORD },
  { name: "Vikram Rao", portalId: "ST-106", role: "student", email: "vikram.rao@vics.ac.in", phone: "+91 98220 41106", className: "TYBSc CS", rollNo: "106", department: "Computer Science", password: DEMO_PASSWORD },
  { name: "Yaseera Qureshi", portalId: "TCH-1042", role: "teacher", email: "yaseera.qureshi@vics.ac.in", phone: "+91 98220 50042", department: "Computer Science", designation: "Assistant Professor" },
  { name: "Rohan Mehta", portalId: "TCH-1087", role: "teacher", email: "rohan.mehta@vics.ac.in", phone: "+91 98220 50087", department: "Computer Science", designation: "Associate Professor" },
  { name: "Farhan Shaikh", portalId: "TCH-1113", role: "teacher", email: "farhan.shaikh@vics.ac.in", phone: "+91 98220 50113", department: "Computer Science", designation: "Assistant Professor" },
  { name: "Sundaram Iyer", portalId: "ADM-0001", role: "admin", email: "s.iyer@vics.ac.in", phone: "+91 98220 10001", department: "Office of Academics", designation: "Registrar" },
];

export const CLASSES = [
  { name: "TYBSc CS", code: "TYCS", mentor: "Prof. Yaseera Qureshi", room: "M2" },
  { name: "SYBSc CS", code: "SYCS", mentor: "Prof. Rohan Mehta", room: "M1" },
];

export const SUBJECTS = [
  { code: "CS-301", name: "AI & IoT", teacherEmail: "yaseera.qureshi@vics.ac.in", room: "M2", credits: 4 },
  { code: "CS-302", name: "Web Development", teacherEmail: "rohan.mehta@vics.ac.in", room: "M1", credits: 4 },
  { code: "CS-303", name: "Database Systems", teacherEmail: "farhan.shaikh@vics.ac.in", room: "M3", credits: 4 },
  { code: "CS-304", name: "Mini Project", teacherEmail: "yaseera.qureshi@vics.ac.in", room: "Lab 2", credits: 6 },
];

/** Calendar days of lectures to seed attendance for (excluding today). */
export const ATTENDANCE_WINDOW_DAYS = 35;

export interface SeedActivity {
  key: string;
  subjectCode: string;
  title: string;
  description: string;
  instructions: string;
  points: number;
  /** Relative to today: due date = today 23:59 UTC + dueDays. */
  dueDays: number;
}

export const ACTIVITIES: SeedActivity[] = [
  {
    key: "norm-worksheet",
    subjectCode: "CS-303",
    title: "Normalization Worksheet: 1NF to BCNF",
    description:
      "Convert the supplied course-registration table to 1NF, 2NF and BCNF. State the functional dependencies at every step and justify each decomposition.",
    instructions:
      "Type your answers below. One worked example per question. Reference: Silberschatz, Chapter 15.",
    points: 10,
    dueDays: -5,
  },
  {
    key: "async-exercises",
    subjectCode: "CS-302",
    title: "JavaScript Async Exercises",
    description:
      "Solve the six async exercises from Week 5: callbacks, Promise.all, error handling and async/await.",
    instructions: "Paste your solutions with short explanations. Code must be your own.",
    points: 15,
    dueDays: -2,
  },
  {
    key: "er-diagram",
    subjectCode: "CS-303",
    title: "ER Diagram: Campus Management System",
    description:
      "Draw an ER diagram for a campus management system covering students, courses, enrolments, attendance and examinations.",
    instructions:
      "List entities, attributes, keys and relationships with cardinality. Tool output or a neat scan both accepted.",
    points: 15,
    dueDays: 3,
  },
  {
    key: "search-report",
    subjectCode: "CS-301",
    title: "AI Search Algorithms Report",
    description:
      "A six-page report comparing A*, greedy best-first search and hill climbing on a route-finding problem of your choice.",
    instructions:
      "Include the heuristic used, an expansion table and a short conclusion. Minimum three references.",
    points: 20,
    dueDays: 9,
  },
  {
    key: "iot-log",
    subjectCode: "CS-301",
    title: "IoT Sensor Prototype Log",
    description:
      "Laboratory log for the temperature-humidity sensor prototype: circuit notes, calibration readings and observations across three runs.",
    instructions: "Include readings as a table inside your answer. Note error margins for each run.",
    points: 20,
    dueDays: -9,
  },
  {
    key: "sprint-1",
    subjectCode: "CS-304",
    title: "Sprint 1: Project Proposal",
    description:
      "Proposal for the mini project: problem statement, scope, team roles, weekly plan and expected deliverables.",
    instructions: "Maximum 1200 words. Include a week-wise plan list.",
    points: 25,
    dueDays: 16,
  },
  {
    key: "responsive-build",
    subjectCode: "CS-302",
    title: "Responsive Landing Page Build",
    description:
      "Build a responsive landing page with semantic HTML, CSS grid and one JavaScript interaction. It must hold at 360px width.",
    instructions: "Paste your code below and mention any libraries used.",
    points: 20,
    dueDays: 6,
  },
];

export interface SeedNote {
  key: string;
  subjectCode: string;
  title: string;
  description: string;
  fileName: string;
  uploadedDaysAgo: number;
  /** Lines printed inside the generated PDF handout. */
  lines: string[];
}

export const NOTES: SeedNote[] = [
  {
    key: "astar",
    subjectCode: "CS-301",
    title: "A* Search: Worked Examples",
    description: "Week 4 handout. Heuristics, admissibility and a full route-finding trace.",
    fileName: "CS301-week4-astar-search.pdf",
    uploadedDaysAgo: 12,
    lines: [
      "A* evaluates f(n) = g(n) + h(n): g is the cost so far, h is the estimate to the goal.",
      "Admissible heuristic: never overestimates the remaining true cost.",
      "Consistent heuristic: h(n) <= c(n, n') + h(n'). Consistency implies admissibility.",
      "Worked trace: campus route finding. Record g, h and f for every expanded node.",
      "Ties on f are broken by insertion order; keep a closed set for graph search.",
      "Compare with greedy best-first: greedy uses h only and can be led astray.",
      "Class task: run A* on the grid below and list the order nodes are expanded.",
      "Reading: Russell & Norvig, Chapter 3, sections 3.1 - 3.5.",
    ],
  },
  {
    key: "iot-protocols",
    subjectCode: "CS-301",
    title: "IoT Protocols: MQTT vs CoAP",
    description: "Week 6 handout. Messaging patterns, QoS levels and when to choose which.",
    fileName: "CS301-week6-mqtt-vs-coap.pdf",
    uploadedDaysAgo: 4,
    lines: [
      "MQTT: broker-based, TCP, publish/subscribe with three QoS levels.",
      "CoAP: peer-to-peer, UDP, request/response with optional confirmable messages.",
      "Choose MQTT for many-to-one telemetry through a gateway.",
      "Choose CoAP for constrained point-to-point devices on lossy links.",
      "Topic design: plant/floor/machine/metric keeps retained messages useful.",
      "Security: TLS on the broker, DTLS for CoAP; rotate device credentials.",
      "Lab note: the prototype in Lab 2 publishes on plant/lab1/# at QoS 1.",
      "Reading: lecture slides plus the MQTT 5.0 specification, sections 4 and 7.",
    ],
  },
  {
    key: "flexbox-grid",
    subjectCode: "CS-302",
    title: "Flexbox & Grid: Layout Patterns",
    description: "Week 5 handout. The four layouts every coursework page needs.",
    fileName: "CS302-week5-flexbox-grid.pdf",
    uploadedDaysAgo: 8,
    lines: [
      "Rule of thumb: one-dimensional rows use Flexbox, two-dimensional sheets use Grid.",
      "Pattern 1: sticky header + fluid main + fixed footer with grid rows auto 1fr auto.",
      "Pattern 2: sidebar layout with grid-template-columns: 220px 1fr.",
      "Pattern 3: card grids with repeat(auto-fill, minmax(240px, 1fr)).",
      "Pattern 4: form rows: label column and control column on wide screens.",
      "Alignment: justify-content works on the main axis, align-items on the cross axis.",
      "Prefer gap over margins; min-width: 0 prevents overflow inside grid children.",
      "Class task: rebuild the notice-board header in three lines of Grid.",
    ],
  },
  {
    key: "react-state",
    subjectCode: "CS-302",
    title: "React State Management Notes",
    description: "Week 6 handout. Local state, lifting state up and when Context earns its place.",
    fileName: "CS302-week6-react-state.pdf",
    uploadedDaysAgo: 2,
    lines: [
      "State lives as low in the tree as possible; only lift it when a sibling needs it.",
      "Derive values during render instead of copying them into state.",
      "Reducer pattern suits multi-step updates: state + action -> new state.",
      "Context passes values that change rarely; it is not a substitute for props.",
      "Keys must be stable identifiers, never array indexes, or lists re-mount wrongly.",
      "Effects are for synchronising with systems outside React, not for data flow.",
      "Coursework checklist: one component, one responsibility, props in, events out.",
      "Reading: react.dev Learn - Scaling Up with Reducer and Context.",
    ],
  },
  {
    key: "normalization",
    subjectCode: "CS-303",
    title: "Normalization: 1NF to BCNF",
    description: "Week 5 handout. Dependency drills with the course-registration example.",
    fileName: "CS303-week5-normalization.pdf",
    uploadedDaysAgo: 6,
    lines: [
      "1NF: atomic values, no repeating groups, a key for every relation.",
      "2NF: no partial dependency of a non-prime attribute on part of a candidate key.",
      "3NF: no transitive dependency of a non-prime attribute on a candidate key.",
      "BCNF: every determinant is a candidate key, for every functional dependency.",
      "Drill: course_registration(sid, cid, sname, cname, grade) - list the FDs first.",
      "Decompose losslessly: check that the intersection of the two schemas is a key.",
      "Dependency preservation matters for updates; lossless join matters for reads.",
      "Worksheet due this week carries the same pattern with different attributes.",
    ],
  },
  {
    key: "sql-joins",
    subjectCode: "CS-303",
    title: "SQL Joins Cheatsheet",
    description: "Week 7 handout. Inner, outer, self and anti joins with the campus schema.",
    fileName: "CS303-week7-sql-joins.pdf",
    uploadedDaysAgo: 1,
    lines: [
      "INNER JOIN keeps rows with a match on both sides of the predicate.",
      "LEFT JOIN keeps every left row; unmatched right columns come back as NULL.",
      "ANTI JOIN is a LEFT JOIN with WHERE r.key IS NULL - find what is missing.",
      "SELF JOIN: alias the table, e.g. students s JOIN students mentor ON ...",
      "Always join on explicit keys; implicit joins hide accidental cross products.",
      "Campus examples: students without attendance today, subjects with no notes.",
      "Indexes support the join column; ORMs often hide the plan - read EXPLAIN.",
      "Cheat task: write the query for every student's attendance percentage.",
    ],
  },
  {
    key: "sprint-template",
    subjectCode: "CS-304",
    title: "Sprint Planning Template",
    description: "Proposal template: scope table, role sheet and week-wise plan.",
    fileName: "CS304-sprint-planning-template.pdf",
    uploadedDaysAgo: 14,
    lines: [
      "Section 1: problem statement in three sentences, written for a non-technical reader.",
      "Section 2: in-scope and out-of-scope tables. Out-of-scope protects your marks.",
      "Section 3: team roles - who owns the database, the interface and the report.",
      "Section 4: week-wise plan with a named deliverable for every week.",
      "Section 5: risks - data availability, exam clash, hardware booking.",
      "Section 6: references and tools, including libraries you will use.",
      "Milestones must be demoable: a screenshot is not a milestone.",
      "Bring a printed draft to the Lab 2 review on Friday.",
    ],
  },
];

export interface SeedNotice {
  title: string;
  body: string;
  category: "academic" | "examination" | "event" | "circular" | "placement";
  author: string;
  pinned: boolean;
  publishedDaysAgo: number;
}

export const NOTICES: SeedNotice[] = [
  {
    title: "Term I timetable effective from this Monday",
    body: "The revised Term I timetable for TYBSc CS is in force from Monday. Rooms M1, M2, M3 and Lab 2 are allotted as printed. Report to your first lecture 10 minutes early for the attendance roll.",
    category: "academic",
    author: "Office of Academics",
    pinned: true,
    publishedDaysAgo: 12,
  },
  {
    title: "Mid-semester examinations: 26 to 31 October",
    body: "Mid-semester examinations for Term I run from 26 to 31 October in the main hall. Hall tickets are issued at the Office of Academics from 20 October against a signed attendance record. Syllabus coverage is up to Week 7 in all subjects.",
    category: "examination",
    author: "Office of Academics",
    pinned: true,
    publishedDaysAgo: 3,
  },
  {
    title: "Guest lecture: Applied AI in Smart Manufacturing",
    body: "The department is hosting a guest lecture by Dr. N. Kulkarni (Pune Automation Labs) on Saturday at 11:00 AM in M2. Attendance counts towards the AI & IoT internal assessment for students on the register.",
    category: "event",
    author: "Dept. of Computer Science",
    pinned: false,
    publishedDaysAgo: 4,
  },
  {
    title: "TCS pre-placement talk: Thursday 3:00 PM",
    body: "Tata Consultancy Services conducts a pre-placement talk on Thursday at 3:00 PM in the auditorium for final-year students. Register at the placement cell by Wednesday 5:00 PM with your roll number.",
    category: "placement",
    author: "Training & Placement Cell",
    pinned: false,
    publishedDaysAgo: 1,
  },
  {
    title: "Attendance shortage list published (Week 4)",
    body: "Students below 75% attendance as on Week 4 are listed on the notice board outside the Office of Academics. Corrected records may be appealed within three working days with documentary proof.",
    category: "academic",
    author: "Office of Academics",
    pinned: false,
    publishedDaysAgo: 2,
  },
  {
    title: "Library counters close at 5:30 PM during assessment week",
    body: "During the assessment week the library issue and return counters close at 5:30 PM. The reading room remains open until 7:00 PM. Books due must be returned or renewed before the examination hall tickets are issued.",
    category: "circular",
    author: "Library",
    pinned: false,
    publishedDaysAgo: 6,
  },
];

export interface SeedSubmission {
  activityKey: string;
  studentPortalId: string;
  answer: string;
  submittedAt: number;
  isLate: boolean;
  score?: number;
  feedback?: string;
}

/** Due date for an activity: today 23:59 UTC, offset by `dueDays`. */
export function dueTimestamp(now: number, dueDays: number): number {
  return utcMidnight(now) + dueDays * DAY_MS + (23 * 60 + 59) * 60 * 1000;
}

export function publishedTimestamp(now: number, dueDays: number): number {
  return utcMidnight(now) + (dueDays - 7) * DAY_MS + 10 * 60 * 60 * 1000;
}

function ts(now: number, dayOffset: number, hour: number, min: number): number {
  return utcMidnight(now) + dayOffset * DAY_MS + hour * 3600_000 + min * 60_000;
}

export function buildSubmissions(now: number): SeedSubmission[] {
  const gradedNorm: [string, number, string][] = [
    ["ST-101", 8, "Good conversion examples. Reduce redundancy in Q4 and label every dependency."],
    ["ST-102", 9, "Clean decomposition; justify the BCNF step in one line next time."],
    ["ST-103", 7, "Dependencies listed, but the partial dependency in Q3 was missed."],
    ["ST-104", 8, "Correct and readable. Keep this presentation."],
    ["ST-105", 10, "Excellent work - full marks."],
    ["ST-106", 6, "Rewrite Q4 before the mid-semester examination."],
  ];
  const gradedIot: [string, number, string][] = [
    ["ST-101", 18, "Clear readings and tidy wiring notes. Add error margins to run 3."],
    ["ST-102", 17, "Good calibration table; label the axes in the graph."],
    ["ST-103", 15, "Readings fine, observation notes too short."],
    ["ST-104", 18, "Well organised log with sensible error analysis."],
    ["ST-105", 19, "Outstanding - include the circuit photo in the report."],
    ["ST-106", 14, "Complete but late notes; explain the drift in run 2."],
  ];
  const out: SeedSubmission[] = [];

  for (const [portalId, score, feedback] of gradedNorm) {
    const i = Number(portalId.slice(-1));
    out.push({
      activityKey: "norm-worksheet",
      studentPortalId: portalId,
      answer: "Q1-Q4 solved with the functional dependencies listed first, then the stepwise decomposition to BCNF with a short justification at each stage.",
      submittedAt: ts(now, -7, 17 + (i % 3), 10 + i * 7),
      isLate: false,
      score,
      feedback,
    });
  }
  for (const [portalId, score, feedback] of gradedIot) {
    const i = Number(portalId.slice(-1));
    out.push({
      activityKey: "iot-log",
      studentPortalId: portalId,
      answer: "Three runs logged at 10 minute intervals with the calibration offset applied. DHT22 on GPIO 4, publishing to plant/lab1/temp and plant/lab1/humidity at QoS 1.",
      submittedAt: ts(now, -10, 16 + (i % 3), 5 + i * 9),
      isLate: false,
      score,
      feedback,
    });
  }

  out.push(
    {
      activityKey: "async-exercises",
      studentPortalId: "ST-102",
      answer: "All six exercises with output snippets. Promise.all used for the batch fetch; errors handled with try/catch around await.",
      submittedAt: ts(now, -3, 20, 15),
      isLate: false,
    },
    {
      activityKey: "async-exercises",
      studentPortalId: "ST-104",
      answer: "Solutions for Q1-Q6, each with a two line explanation of the control flow.",
      submittedAt: ts(now, -3, 19, 40),
      isLate: false,
    },
    {
      activityKey: "async-exercises",
      studentPortalId: "ST-105",
      answer: "Six solutions plus a short note on why callback hell becomes async/await. Tested in the browser console.",
      submittedAt: ts(now, -2, 9, 30),
      isLate: false,
    },
    {
      activityKey: "async-exercises",
      studentPortalId: "ST-106",
      answer: "Submitted after the deadline - answers for Q1-Q5; Q6 pending, will submit with the lab record.",
      submittedAt: ts(now, -1, 22, 5),
      isLate: true,
    },
    {
      activityKey: "er-diagram",
      studentPortalId: "ST-101",
      answer: "Eight entities with keys, five relationships with cardinality, plus the assumptions made about examinations and re-registration.",
      submittedAt: ts(now, -1, 21, 5),
      isLate: false,
    },
    {
      activityKey: "er-diagram",
      studentPortalId: "ST-102",
      answer: "ER diagram drawn in draw.io, exported as PNG, with the entity list and cardinality notes below it.",
      submittedAt: ts(now, -2, 17, 25),
      isLate: false,
    },
    {
      activityKey: "er-diagram",
      studentPortalId: "ST-105",
      answer: "Entities: student, course, enrolment, attendance, examination, result, faculty, room. Includes a weak entity for hall tickets.",
      submittedAt: ts(now, 0, 10, 12),
      isLate: false,
    },
  );
  return out;
}

export interface SeedNotification {
  studentPortalId: string;
  kind: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: number;
  href: string;
}

export function buildNotifications(now: number): SeedNotification[] {
  const out: SeedNotification[] = [];
  const iot = buildSubmissions(now).filter(
    (s) => s.activityKey === "iot-log" && s.score !== undefined,
  );
  for (const user of USERS.filter((u) => u.role === "student")) {
    const mine = iot.find((s) => s.studentPortalId === user.portalId);
    const score = mine?.score ?? 18;
    out.push(
      {
        studentPortalId: user.portalId,
        kind: "marks",
        title: "Marks published: IoT Sensor Prototype Log",
        body: `${score}/20 graded by Prof. Yaseera Qureshi.`,
        read: true,
        createdAt: ts(now, -8, 11, 0),
        href: "/assignments",
      },
      {
        studentPortalId: user.portalId,
        kind: "submission",
        title: "Submission recorded: Normalization Worksheet",
        body: "Received before the deadline. Marks are now published.",
        read: true,
        createdAt: ts(now, -7, 18, 5),
        href: "/assignments",
      },
      {
        studentPortalId: user.portalId,
        kind: "notice",
        title: "Notice: Mid-semester examinations",
        body: "Examinations run 26 to 31 October. Hall tickets from 20 October.",
        read: false,
        createdAt: ts(now, -3, 9, 0),
        href: "/notices",
      },
      {
        studentPortalId: user.portalId,
        kind: "assignment",
        title: "New assignment: AI Search Algorithms Report",
        body: "AI & IoT - 20 marks - due in 9 days.",
        read: false,
        createdAt: ts(now, -2, 10, 0),
        href: "/assignments",
      },
      {
        studentPortalId: user.portalId,
        kind: "deadline",
        title: "Reminder: ER Diagram due in 3 days",
        body: "Database Systems - 15 marks.",
        read: false,
        createdAt: ts(now, -1, 8, 0),
        href: "/assignments",
      },
      {
        studentPortalId: user.portalId,
        kind: "note",
        title: "New note: SQL Joins Cheatsheet",
        body: "Database Systems - uploaded by Prof. Farhan Shaikh.",
        read: false,
        createdAt: ts(now, -1, 16, 0),
        href: "/notes",
      },
    );
  }
  return out;
}

export interface SeedAttendance {
  studentPortalId: string;
  subjectCode: string;
  date: string;
  day: string;
  status: "present" | "absent" | "late";
}

/** Per-student habit: how often a lecture is missed entirely. */
const ABSENCE_RATE: Record<string, number> = {
  "ST-101": 0.06,
  "ST-102": 0.11,
  "ST-103": 0.05,
  "ST-104": 0.08,
  "ST-105": 0.03,
  "ST-106": 0.24,
};

/** Per-subject drift so each subject lands on its own percentage. */
const SUBJECT_DRIFT: Record<string, number> = {
  "CS-301": 0,
  "CS-302": 0.05,
  "CS-303": -0.02,
  "CS-304": 0.02,
};

function frac(x: number): number {
  const s = Math.sin(x) * 43758.5453;
  return s - Math.floor(s);
}

/** Attendance records for every weekday lecture in the window (today excluded). */
export function buildAttendance(now: number): SeedAttendance[] {
  const out: SeedAttendance[] = [];
  const students = USERS.filter((u) => u.role === "student");
  const todayMid = utcMidnight(now);

  for (let back = 1; back <= ATTENDANCE_WINDOW_DAYS; back++) {
    const dayTs = todayMid - back * DAY_MS;
    const day = dayKeyOf(dayTs);
    const codes = SCHEDULE[day];
    if (!codes) continue;
    const date = isoDate(dayTs);

    codes.forEach((code, slotIndex) => {
      if (!code) return;
      for (const student of students) {
        const roll = Number(student.rollNo ?? "0");
        const r = frac(back * 13.37 + roll * 7.31 + slotIndex * 29.17 + code.charCodeAt(5));
        const p = (ABSENCE_RATE[student.portalId] ?? 0.08) + (SUBJECT_DRIFT[code] ?? 0);
        out.push({
          studentPortalId: student.portalId,
          subjectCode: code,
          date,
          day,
          status: r < p ? "absent" : r < p + 0.035 ? "late" : "present",
        });
      }
    });
  }
  return out;
}
