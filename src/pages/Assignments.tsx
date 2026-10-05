import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  EmptyState,
  formatDate,
  formatClock,
  Loader,
  PageHeader,
  Panel,
  StatusTag,
  toneForState,
} from "@/components/portal/primitives";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";

const LABELS: Record<string, string> = {
  open: "Open",
  overdue: "Overdue",
  submitted: "Submitted",
  graded: "Graded",
  missing: "Missing",
};

const GROUPS = [
  { key: "todo", title: "To do", states: ["open", "overdue"] },
  { key: "submitted", title: "Submitted", states: ["submitted"] },
  { key: "marked", title: "Marked", states: ["graded"] },
  { key: "closed", title: "Closed", states: ["missing"] },
] as const;

export default function Assignments() {
  const items = useQuery(api.studentAssignments.assignmentsList);
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("id");
  const detail = useQuery(
    api.studentAssignments.assignmentDetail,
    selectedId ? { id: selectedId as Id<"activities"> } : "skip",
  );

  const [draft, setDraft] = useState<{ id: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = useMutation(api.studentAssignments.submitAssignment);

  // The draft is keyed to the selected assignment, so switching items shows
  // that item's saved answer without seeding state from an effect.
  const answer =
    detail && draft?.id === detail.id
      ? draft.text
      : (detail?.submission?.answer ?? "");
  const onAnswer = (text: string) => {
    if (detail) setDraft({ id: detail.id, text });
  };

  const grouped = useMemo(() => {
    if (!items) return [];
    return GROUPS.map((group) => ({
      ...group,
      rows: items.filter((item) =>
        (group.states as readonly string[]).includes(item.state),
      ),
    })).filter((group) => group.rows.length > 0);
  }, [items]);

  if (!items) return <Loader />;

  const handleSubmit = async () => {
    if (!detail) return;
    setBusy(true);
    try {
      const result = await submit({ activityId: detail.id, answer });
      toast.success(
        result.isLate
          ? "Submission recorded after the deadline — marked late."
          : "Submission recorded before the deadline.",
        { description: `${detail.title} · ${formatDate(Date.now())}` },
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save submission",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Assignments"
        description="Work published by faculty, with deadlines, marks and feedback. You can edit a submission until the deadline window closes."
        action={
          <span className="label-caps border border-border bg-secondary px-2 py-1 text-muted-foreground">
            {items.filter((i) => i.state === "open" || i.state === "overdue").length}{" "}
            pending · {items.length} total
          </span>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* List */}
        <div className="flex flex-col gap-4">
          {grouped.length === 0 && (
            <Panel title="Register">
              <EmptyState>No assignments published yet.</EmptyState>
            </Panel>
          )}
          {grouped.map((group) => (
            <Panel key={group.key} title={group.title} meta={`${group.rows.length}`}>
              <ul className="divide-y divide-border">
                {group.rows.map((item) => {
                  const active = selectedId === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setParams({ id: item.id })}
                        className={`w-full cursor-pointer border-l-2 px-2 py-2.5 text-left transition-colors ${
                          active
                            ? "border-primary bg-secondary"
                            : "border-transparent hover:bg-secondary/60"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm leading-snug font-medium">
                            {item.title}
                          </p>
                          <StatusTag tone={toneForState(item.state)}>
                            {item.score !== null
                              ? `${item.score}/${item.points}`
                              : LABELS[item.state]}
                          </StatusTag>
                        </div>
                        <p className="label-caps mt-1 text-muted-foreground">
                          {item.subjectCode} · due {formatDate(item.dueAt)}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          ))}
        </div>

        {/* Detail */}
        <div>
          {!detail ? (
            <Panel title="Assignment">
              <EmptyState>
                Select an assignment from the register to read its details and
                submit your work.
              </EmptyState>
            </Panel>
          ) : (
            <Panel
              title={detail.subjectCode}
              meta={`${detail.subject} · ${detail.teacher}`}
              action={<StatusTag tone={toneForState(detail.state)}>{detail.state}</StatusTag>}
            >
              <h2 className="font-editorial text-xl leading-snug font-bold">
                {detail.title}
              </h2>

              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Due", `${formatDate(detail.dueAt)}`],
                  ["Deadline", formatClock(detail.dueAt)],
                  ["Marks", `${detail.points}`],
                  ["Class", `${detail.submittedCount} submitted`],
                ].map(([label, value]) => (
                  <div key={label} className="border border-border px-3 py-2">
                    <div className="label-caps text-muted-foreground">
                      {label}
                    </div>
                    <div className="mt-0.5 text-sm font-medium tnum">{value}</div>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-sm leading-6">{detail.description}</p>
              {detail.instructions && (
                <div className="mt-3 border border-border bg-secondary/50 px-3 py-2.5">
                  <p className="label-caps text-muted-foreground">Instructions</p>
                  <p className="mt-1 text-sm leading-6">
                    {detail.instructions}
                  </p>
                </div>
              )}

              <div className="mt-5 border-t border-border pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="label-caps text-muted-foreground">
                    Your submission
                  </p>
                  {detail.submission && (
                    <p className="label-caps text-muted-foreground">
                      Submitted {formatDate(detail.submission.submittedAt)} ·{" "}
                      {formatClock(detail.submission.submittedAt)}
                      {detail.submission.updatedAt >
                        detail.submission.submittedAt && " · edited"}
                      {detail.submission.isLate && " · late"}
                    </p>
                  )}
                </div>

                {detail.submission && detail.state === "graded" ? (
                  <div className="mt-2">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="border border-border px-4 py-3 text-center">
                        <div className="label-caps text-muted-foreground">
                          Marks
                        </div>
                        <div className="font-editorial mt-0.5 text-3xl leading-none font-bold tnum">
                          {detail.submission.score}
                          <span className="text-lg text-muted-foreground">
                            /{detail.points}
                          </span>
                        </div>
                      </div>
                      <span className="stamp">Reviewed</span>
                      <div className="min-w-56 flex-1">
                        <p className="label-caps text-muted-foreground">
                          Faculty feedback
                        </p>
                        <p className="mt-1 text-sm leading-6">
                          {detail.submission.feedback ?? "No remarks recorded."}
                        </p>
                      </div>
                    </div>
                    <div className="ruled mt-3 border border-border bg-background px-3 py-2">
                      <p className="text-sm whitespace-pre-wrap">
                        {detail.submission.answer}
                      </p>
                    </div>
                  </div>
                ) : detail.canSubmit ? (
                  <div className="mt-2">
                    <textarea
                      value={answer}
                      onChange={(event) => onAnswer(event.target.value)}
                      rows={8}
                      maxLength={8000}
                      placeholder="Type your answer or paste your work here…"
                      className="ruled w-full resize-y border border-border bg-background px-3 py-2 text-sm leading-7 outline-none placeholder:text-muted-foreground focus:border-primary"
                    />
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                      <span className="label-caps text-muted-foreground">
                        {answer.length}/8000 characters
                        {detail.submission && " · resubmitting replaces your previous answer"}
                      </span>
                      <Button
                        size="sm"
                        onClick={handleSubmit}
                        disabled={busy || answer.trim().length < 10}
                        className="cursor-pointer"
                      >
                        {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                        {detail.submission ? "Update submission" : "Submit work"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 flex items-start gap-3 border border-border bg-secondary/40 px-3 py-3">
                    <span className="stamp mt-0.5">
                      {detail.state === "missing" ? "Not submitted" : "Closed"}
                    </span>
                    <p className="text-sm text-muted-foreground">
                      {detail.state === "missing"
                        ? "The deadline window has closed. Speak to the faculty if the office granted an extension."
                        : detail.state === "open"
                          ? "This assignment is not yet open for submission."
                          : "No submission on record."}
                    </p>
                  </div>
                )}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
