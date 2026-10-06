import { api } from "@/convex/_generated/api";
import {
  EmptyState,
  Loader,
  Meter,
  PageHeader,
  Panel,
  StatBlock,
  StatusTag,
  TD,
  TH,
  toneForPct,
} from "@/components/portal/primitives";
import { Button } from "@/components/ui/button";
import { useQuery } from "convex/react";
import { useState } from "react";

export default function Attendance() {
  const [historyLimit, setHistoryLimit] = useState(20);
  const record = useQuery(api.studentPortal.attendanceSummary, {
    historyLimit,
  });
  const [showAll, setShowAll] = useState(false);

  if (!record) return <Loader />;

  const floor = record.minAttendance;
  const below = record.subjects.filter((subject) => subject.pct < floor);

  return (
    <div>
      <PageHeader
        title="Attendance register"
        description="Marked by faculty at each lecture. Late arrival counts as present and is noted separately."
        action={
          <span className="label-caps border border-border bg-secondary px-2 py-1 text-muted-foreground">
            Minimum required · {floor}%
          </span>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatBlock
          label="Overall"
          value={`${record.overall.pct}%`}
          sub={`${record.overall.present} of ${record.overall.total} lectures`}
          tone={toneForPct(record.overall.pct)}
        />
        <StatBlock
          label="Present"
          value={record.overall.present}
          sub={`${record.overall.late} marked late`}
          tone="info"
        />
        <StatBlock
          label="Absent"
          value={record.overall.absent}
          sub="Lectures missed"
          tone={record.overall.absent > 0 ? "alert" : "neutral"}
        />
        <StatBlock
          label="Standing"
          value={below.length === 0 ? "Clear" : `${below.length} short`}
          sub={
            record.overall.shortfall > 0
              ? `Attend ${record.overall.shortfall} more to reach ${floor}%`
              : "Above the required minimum"
          }
          tone={below.length === 0 ? "info" : "alert"}
        />
      </div>

      <Panel title="Subject-wise record" meta={`${record.subjects.length} subjects`}>
        <div className="-mx-3 overflow-x-auto sm:-mx-4">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr>
                <th className={TH}>Code</th>
                <th className={TH}>Subject</th>
                <th className={TH}>Faculty</th>
                <th className={TH}>Present</th>
                <th className={TH}>Absent</th>
                <th className={TH}>Total</th>
                <th className={TH}>%</th>
                <th className={TH}>Record</th>
                <th className={TH}>Standing</th>
              </tr>
            </thead>
            <tbody>
              {record.subjects.map((subject) => (
                <tr key={subject.subjectId}>
                  <td className={`${TD} font-code`}>{subject.code}</td>
                  <td className={`${TD} font-medium`}>{subject.name}</td>
                  <td className={TD}>{subject.teacher}</td>
                  <td className={`${TD} tnum`}>{subject.present}</td>
                  <td className={`${TD} tnum`}>{subject.absent}</td>
                  <td className={`${TD} tnum`}>{subject.total}</td>
                  <td className={`${TD} tnum font-medium`}>{subject.pct}%</td>
                  <td className={`${TD} w-36`}>
                    <Meter pct={subject.pct} />
                  </td>
                  <td className={TD}>
                    {subject.pct >= floor ? (
                      <StatusTag tone="info">Satisfactory</StatusTag>
                    ) : (
                      <StatusTag tone="alert">
                        Short by {subject.shortfall}
                      </StatusTag>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="mt-4">
        <Panel
          title="Attendance history"
          meta={`Showing ${record.history.length} of ${record.historyTotal} entries`}
          action={
            !showAll && record.historyTotal > record.history.length ? (
              <Button
                size="sm"
                variant="outline"
                className="cursor-pointer"
                onClick={() => {
                  setHistoryLimit(200);
                  setShowAll(true);
                }}
              >
                Load full register
              </Button>
            ) : undefined
          }
        >
          {record.history.length === 0 ? (
            <EmptyState>
              No lectures recorded yet. The register fills in as faculty mark
              each period.
            </EmptyState>
          ) : (
            <div className="-mx-3 overflow-x-auto sm:-mx-4">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr>
                    <th className={TH}>Date</th>
                    <th className={TH}>Day</th>
                    <th className={TH}>Code</th>
                    <th className={TH}>Subject</th>
                    <th className={TH}>Faculty</th>
                    <th className={TH}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {record.history.map((row) => (
                    <tr key={row.id}>
                      <td className={`${TD} font-code tnum whitespace-nowrap`}>
                        {row.date}
                      </td>
                      <td className={`${TD} capitalize`}>{row.day}</td>
                      <td className={`${TD} font-code`}>{row.subjectCode}</td>
                      <td className={`${TD} font-medium`}>{row.subject}</td>
                      <td className={TD}>{row.teacher}</td>
                      <td className={TD}>
                        <StatusTag
                          tone={
                            row.status === "present"
                              ? "info"
                              : row.status === "late"
                                ? "warn"
                                : "alert"
                          }
                        >
                          {row.status}
                        </StatusTag>
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
