import { api } from "@/convex/_generated/api";
import {
  EmptyState,
  Loader,
  PageHeader,
  Panel,
  TH,
  todayInfo,
} from "@/components/portal/primitives";
import { useQuery } from "convex/react";

const DAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
];

export default function Timetable() {
  const week = useQuery(api.studentPortal.timetableWeek);
  const { day } = todayInfo();

  if (!week) return <Loader />;

  const slots = Array.from(
    new Map(
      week.entries.map((entry) => [
        entry.slot,
        { slot: entry.slot, start: entry.start, end: entry.end },
      ]),
    ).values(),
  ).sort((a, b) => a.slot - b.slot);

  const cell = (dayKey: string, slot: number) =>
    week.entries.find((entry) => entry.day === dayKey && entry.slot === slot);

  return (
    <div>
      <PageHeader
        title="Weekly timetable"
        description={
          week.classInfo
            ? `${week.className} · ${week.classInfo.term} · AY ${week.classInfo.academicYear} · Mentor ${week.classInfo.mentor}`
            : week.className
        }
        action={
          <span className="label-caps border border-border bg-secondary px-2 py-1 text-muted-foreground">
            Effective 01 Oct · Rooms subject to change
          </span>
        }
      />

      <Panel title="Lecture grid" meta="Mon–Sat · four periods a day">
        <div className="-mx-3 overflow-x-auto sm:-mx-4">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr>
                <th scope="col" className={`${TH} w-28`}>
                  Period
                </th>
                {DAYS.map((d) => (
                  <th
                    key={d.key}
                    scope="col"
                    className={`${TH} ${d.key === day ? "bg-secondary text-foreground" : ""}`}
                  >
                    {d.label}
                    {d.key === day && (
                      <span className="label-caps ml-2 text-primary">Today</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => (
                <tr key={slot.slot}>
                  <td className="border-b border-border px-3 py-2 font-code text-muted-foreground tnum whitespace-nowrap">
                    {slot.start}
                    <br />
                    <span className="text-[11px]">{slot.end}</span>
                  </td>
                  {DAYS.map((d) => {
                    const entry = cell(d.key, slot.slot);
                    return (
                      <td
                        key={d.key}
                        className={`border-b border-border px-3 py-2 align-top ${
                          d.key === day ? "bg-secondary/60" : ""
                        }`}
                      >
                        {entry ? (
                          <div>
                            <span className="font-code text-[11px] text-muted-foreground">
                              {entry.subject.code}
                            </span>
                            <p className="font-medium">{entry.subject.name}</p>
                            <p className="label-caps mt-0.5 text-muted-foreground">
                              {entry.room} · {entry.subject.teacher}
                            </p>
                          </div>
                        ) : (
                          <span className="label-caps text-muted-foreground">
                            {d.key === "sat" ? "Holiday" : "Free"}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="label-caps mt-3 text-muted-foreground">
          Recess 15:25–15:45 · Attendance is marked in the first ten minutes of
          each period
        </p>
      </Panel>

      <div className="mt-4">
        <Panel title="Subjects on record" meta={`${week.subjects.length} subjects`}>
          {week.subjects.length === 0 ? (
            <EmptyState>No subjects allotted to your class yet.</EmptyState>
          ) : (
            <div className="-mx-3 overflow-x-auto sm:-mx-4">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr>
                    <th scope="col" className={TH}>Code</th>
                    <th scope="col" className={TH}>Subject</th>
                    <th scope="col" className={TH}>Faculty</th>
                    <th scope="col" className={TH}>Room</th>
                    <th scope="col" className={TH}>Credits</th>
                  </tr>
                </thead>
                <tbody>
                  {week.subjects.map((subject) => (
                    <tr key={subject.id}>
                      <td className="border-b border-border px-3 py-2 font-code">
                        {subject.code}
                      </td>
                      <td className="border-b border-border px-3 py-2 font-medium">
                        {subject.name}
                      </td>
                      <td className="border-b border-border px-3 py-2">
                        {subject.teacher}
                      </td>
                      <td className="border-b border-border px-3 py-2 font-code">
                        {subject.room}
                      </td>
                      <td className="border-b border-border px-3 py-2 tnum">
                        {subject.credits}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
