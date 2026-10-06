import { api } from "@/convex/_generated/api";
import {
  dueLabel,
  EmptyState,
  formatLongDate,
  Loader,
  PageHeader,
  Panel,
  StatusTag,
  toneForState,
} from "@/components/portal/primitives";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { Link } from "react-router";

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) =>
  `${y}-${pad(m + 1)}-${pad(d)}`;

export default function Calendar() {
  const timetable = useQuery(api.studentPortal.timetableWeek);
  const assignments = useQuery(api.studentAssignments.assignmentsList);
  const notices = useQuery(api.desk.noticesList);

  const today = new Date();
  const [cursor, setCursor] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }));
  const [selected, setSelected] = useState(() =>
    iso(today.getFullYear(), today.getMonth(), today.getDate()),
  );

  const deadlinesByDate = useMemo(() => {
    const map = new Map<string, NonNullable<typeof assignments>>();
    if (!assignments) return map;
    for (const item of assignments) {
      const key = iso(
        new Date(item.dueAt).getFullYear(),
        new Date(item.dueAt).getMonth(),
        new Date(item.dueAt).getDate(),
      );
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [assignments]);

  const noticesByDate = useMemo(() => {
    const map = new Map<string, NonNullable<typeof notices>>();
    if (!notices) return map;
    for (const notice of notices) {
      const list = map.get(notice.dateStr) ?? [];
      list.push(notice);
      map.set(notice.dateStr, list);
    }
    return map;
  }, [notices]);

  if (!timetable || !assignments || !notices) return <Loader />;

  const first = new Date(cursor.year, cursor.month, 1);
  const offset = (first.getDay() + 6) % 7; // week starts Monday
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const cells: Array<{ y: number; m: number; d: number } | null> = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ y: cursor.year, m: cursor.month, d });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const lecturesFor = (dateIso: string) => {
    const day = new Date(`${dateIso}T00:00:00`);
    const key = DAY_KEYS[day.getDay()];
    return timetable.entries
      .filter((entry) => entry.day === key)
      .sort((a, b) => a.slot - b.slot);
  };

  const dayEvents = (dateIso: string) => ({
    lectures: lecturesFor(dateIso),
    deadlines: deadlinesByDate.get(dateIso) ?? [],
    notices: noticesByDate.get(dateIso) ?? [],
  });

  const selectedEvents = dayEvents(selected);
  const todayIso = iso(today.getFullYear(), today.getMonth(), today.getDate());

  const step = (delta: number) => {
    setCursor((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  return (
    <div>
      <PageHeader
        title="Academic calendar"
        description="Lectures, deadlines and notices on one date sheet. Lectures repeat weekly from your timetable; work and notices come from the day they were filed."
        action={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => step(-1)}
              className="cursor-pointer border border-border px-2.5 py-1.5 text-sm hover:bg-secondary"
              aria-label="Previous month"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => {
                setCursor({ year: today.getFullYear(), month: today.getMonth() });
                setSelected(todayIso);
              }}
              className="label-caps cursor-pointer border border-border px-2.5 py-1.5 hover:bg-secondary"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              className="cursor-pointer border border-border px-2.5 py-1.5 text-sm hover:bg-secondary"
              aria-label="Next month"
            >
              →
            </button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_330px]">
        <Panel
          title={`${MONTHS[cursor.month]} ${cursor.year}`}
          meta={`${timetable.className || "No class"} · ${timetable.subjects.length} subjects`}
        >
          <div className="grid grid-cols-7 border-b border-border">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="label-caps px-1 py-1.5 text-center text-muted-foreground"
              >
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((cell, index) => {
              if (!cell) {
                return (
                  <div
                    key={`pad-${index}`}
                    className="min-h-20 border-r border-b border-border bg-secondary/30 last:border-r-0"
                  />
                );
              }
              const dateIso = iso(cell.y, cell.m, cell.d);
              const events = dayEvents(dateIso);
              const isToday = dateIso === todayIso;
              const isSelected = dateIso === selected;
              const count =
                events.lectures.length +
                events.deadlines.length +
                events.notices.length;
              return (
                <button
                  key={dateIso}
                  type="button"
                  onClick={() => setSelected(dateIso)}
                  className={`min-h-20 cursor-pointer border-r border-b border-border p-1.5 text-left transition-colors last:border-r-0 ${
                    isSelected
                      ? "bg-primary/10"
                      : isToday
                        ? "bg-secondary"
                        : "hover:bg-secondary/60"
                  }`}
                >
                  <span
                    className={`inline-flex size-6 items-center justify-center text-xs font-medium tnum ${
                      isToday
                        ? "border border-primary text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    {cell.d}
                  </span>
                  <span className="mt-1 flex flex-col gap-0.5">
                    {events.deadlines.map((item) => (
                      <span
                        key={item.id}
                        className="label-caps truncate border-l-2 border-primary bg-primary/10 px-1 text-primary"
                        title={`Deadline: ${item.title}`}
                      >
                        {item.subjectCode}
                      </span>
                    ))}
                    {events.notices.length > 0 && (
                      <span className="label-caps truncate border-l-2 border-accent bg-accent/10 px-1 text-accent">
                        notice
                      </span>
                    )}
                    {events.lectures.length > 0 && (
                      <span className="label-caps truncate px-1 text-muted-foreground tnum">
                        {events.lectures.length} lecture
                        {events.lectures.length === 1 ? "" : "s"}
                      </span>
                    )}
                    {count === 0 && (
                      <span className="label-caps px-1 text-muted-foreground/50">
                        —
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title="Day sheet" meta={formatLongDate(new Date(`${selected}T00:00:00`).getTime())}>
            {selectedEvents.lectures.length === 0 &&
            selectedEvents.deadlines.length === 0 &&
            selectedEvents.notices.length === 0 ? (
              <EmptyState>
                Nothing scheduled: no lectures, deadlines or notices on this
                date.
              </EmptyState>
            ) : (
              <div className="grid gap-4">
                {selectedEvents.lectures.length > 0 && (
                  <div>
                    <p className="label-caps text-muted-foreground">Lectures</p>
                    <ul className="mt-1.5 divide-y divide-border">
                      {selectedEvents.lectures.map((lecture) => (
                        <li
                          key={`${lecture.day}-${lecture.slot}`}
                          className="flex items-start justify-between gap-2 py-2 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="font-medium">
                              {lecture.subject.code} · {lecture.subject.name}
                            </p>
                            <p className="label-caps mt-0.5 text-muted-foreground">
                              {lecture.start}–{lecture.end} · {lecture.room} ·{" "}
                              {lecture.subject.teacher}
                            </p>
                          </div>
                          <StatusTag tone="slate">slot {lecture.slot}</StatusTag>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedEvents.deadlines.length > 0 && (
                  <div>
                    <p className="label-caps text-muted-foreground">
                      Deadlines
                    </p>
                    <ul className="mt-1.5 divide-y divide-border">
                      {selectedEvents.deadlines.map((item) => {
                        const label = dueLabel(item.dueAt);
                        return (
                          <li key={item.id} className="py-2">
                            <Link
                              to={`/assignments?id=${item.id}`}
                              className="flex items-start justify-between gap-2 hover:bg-secondary/50"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {item.title}
                                </p>
                                <p className="label-caps mt-0.5 text-muted-foreground">
                                  {item.subjectCode} · {item.points} marks
                                </p>
                              </div>
                              <StatusTag tone={toneForState(item.state)}>
                                {item.state === "open"
                                  ? label.text
                                  : item.score !== null
                                    ? `${item.score}/${item.points}`
                                    : item.state}
                              </StatusTag>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {selectedEvents.notices.length > 0 && (
                  <div>
                    <p className="label-caps text-muted-foreground">Notices</p>
                    <ul className="mt-1.5 divide-y divide-border">
                      {selectedEvents.notices.map((notice) => (
                        <li key={notice.id} className="py-2">
                          <Link to="/notices" className="block hover:bg-secondary/50">
                            <div className="flex items-center gap-2">
                              <StatusTag
                                tone={notice.pinned ? "alert" : "slate"}
                              >
                                {notice.category}
                              </StatusTag>
                              <span className="label-caps text-muted-foreground">
                                {notice.dateStr}
                              </span>
                            </div>
                            <p className="mt-1 text-sm font-medium">
                              {notice.title}
                            </p>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Panel>

          <Panel title="Key" meta="Colour coding">
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="label-caps border-l-2 border-primary bg-primary/10 px-1 text-primary">
                  CS-301
                </span>
                Assignment deadline that day
              </li>
              <li className="flex items-center gap-2">
                <span className="label-caps border-l-2 border-accent bg-accent/10 px-1 text-accent">
                  notice
                </span>
                Notice published that day
              </li>
              <li className="flex items-center gap-2">
                <span className="label-caps px-1 text-muted-foreground tnum">
                  4 lectures
                </span>
                Weekly timetable for that weekday
              </li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
