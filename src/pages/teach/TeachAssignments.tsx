import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  EmptyState,
  formatBytes,
  formatClock,
  formatDate,
  Loader,
  PageHeader,
  Panel,
  StatusTag,
} from "@/components/portal/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery } from "convex/react";
import { Download, Loader2, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function toLocalInput(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function TeachAssignments() {
  const overview = useQuery(api.teacher.overview);
  const activities = useQuery(api.teacher.myActivities);
  const [selectedId, setSelectedId] = useState<Id<"activities"> | null>(null);
  const submissions = useQuery(
    api.teacher.activitySubmissions,
    selectedId ? { activityId: selectedId } : "skip",
  );

  const createActivity = useMutation(api.teacher.createActivity);
  const reviewSubmission = useMutation(api.teacher.reviewSubmission);

  const [showForm, setShowForm] = useState(false);
  const [subjectId, setSubjectId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [points, setPoints] = useState("20");
  const [due, setDue] = useState(() => toLocalInput(Date.now() + 7 * 86_400_000));
  const [busy, setBusy] = useState(false);

  const [drafts, setDrafts] = useState<
    Record<string, { score: string; feedback: string }>
  >({});
  const [savingId, setSavingId] = useState<string | null>(null);

  if (!overview || !activities) return <Loader />;

  const subjects = overview.subjects;
  const selected = activities.find((a) => a.id === selectedId) ?? null;

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setInstructions("");
    setPoints("20");
    setDue(toLocalInput(Date.now() + 7 * 86_400_000));
  };

  const handleCreate = async () => {
    const activeSubject = subjectId || subjects[0]?.id || "";
    if (!activeSubject) {
      toast.error("Choose a subject first");
      return;
    }
    if (title.trim().length < 3) {
      toast.error("Title must be at least 3 characters");
      return;
    }
    if (description.trim().length < 10) {
      toast.error("Description must be at least 10 characters");
      return;
    }
    const pointsValue = Number(points);
    if (!Number.isFinite(pointsValue) || pointsValue < 1 || pointsValue > 500) {
      toast.error("Marks must be between 1 and 500");
      return;
    }
    const dueAt = new Date(due).getTime();
    if (!Number.isFinite(dueAt)) {
      toast.error("Pick a valid deadline");
      return;
    }
    setBusy(true);
    try {
      await createActivity({
        subjectId: activeSubject as Id<"subjects">,
        title: title.trim(),
        description: description.trim(),
        instructions: instructions.trim() || undefined,
        dueAt,
        points: pointsValue,
      });
      toast.success("Assignment published", {
        description: `${title.trim()} · due ${formatDate(dueAt)} · every student in the class has been notified.`,
      });
      resetForm();
      setShowForm(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not publish");
    } finally {
      setBusy(false);
    }
  };

  const handleReview = async (
    submissionId: Id<"submissions">,
    activityPoints: number,
    draft: { score: string; feedback: string },
  ) => {
    const score = Number(draft.score);
    if (draft.score.trim() === "") {
      toast.error("Enter the marks first");
      return;
    }
    if (!Number.isFinite(score) || score < 0) {
      toast.error("Marks must be zero or more");
      return;
    }
    if (score > activityPoints) {
      toast.error(`Marks cannot exceed ${activityPoints}`);
      return;
    }
    setSavingId(submissionId);
    try {
      await reviewSubmission({
        submissionId,
        score,
        feedback: draft.feedback,
      });
      toast.success("Marks published", {
        description: "The student has been notified with your feedback.",
      });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[submissionId];
        return next;
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Assignments"
        description="Publish work with a deadline and marks, watch submissions arrive, then grade with feedback from one desk."
        action={
          <Button
            size="sm"
            className="cursor-pointer"
            onClick={() => setShowForm((open) => !open)}
          >
            {showForm ? (
              <>
                <X className="mr-1.5 size-3.5" />
                Close form
              </>
            ) : (
              <>
                <Plus className="mr-1.5 size-3.5" />
                New assignment
              </>
            )}
          </Button>
        }
      />

      {showForm && (
        <div className="mb-4 border border-border bg-card p-3 sm:p-4">
          <p className="label-caps text-foreground">Publish to your subject</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <label htmlFor="asg-subject" className="label-caps text-muted-foreground">
                Subject
              </label>
              <select
                id="asg-subject"
                value={subjectId || subjects[0]?.id || ""}
                onChange={(event) => setSubjectId(event.target.value)}
                className="mt-1.5 block w-full cursor-pointer border border-border bg-card px-2 py-2 text-sm outline-none"
                disabled={subjects.length === 0}
              >
                {subjects.length === 0 && <option value="">No subjects</option>}
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.code} · {subject.name} · {subject.className}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="asg-title" className="label-caps text-muted-foreground">
                Title
              </label>
              <Input
                id="asg-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={160}
                placeholder="e.g. Lab 6: Normalization exercise"
                className="mt-1.5"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="asg-desc" className="label-caps text-muted-foreground">
                Description
              </label>
              <Textarea
                id="asg-desc"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="What must the student do?"
                className="mt-1.5"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="asg-instructions" className="label-caps text-muted-foreground">
                Instructions (optional)
              </label>
              <Textarea
                id="asg-instructions"
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                rows={2}
                maxLength={2000}
                placeholder="Format, references, submission notes…"
                className="mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="asg-due" className="label-caps text-muted-foreground">
                Deadline
              </label>
              <input
                id="asg-due"
                type="datetime-local"
                value={due}
                onChange={(event) => setDue(event.target.value)}
                className="mt-1.5 block w-full border border-border bg-card px-2 py-2 text-sm font-code outline-none"
              />
            </div>
            <div>
              <label htmlFor="asg-points" className="label-caps text-muted-foreground">
                Marks
              </label>
              <Input
                id="asg-points"
                type="number"
                min={1}
                max={500}
                value={points}
                onChange={(event) => setPoints(event.target.value)}
                className="mt-1.5 font-code"
              />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Students are notified the moment you publish.
            </p>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={busy || subjects.length === 0}
              className="cursor-pointer"
            >
              {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
              Publish assignment
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        {/* Register */}
        <div className="flex flex-col gap-4">
          {activities.length === 0 ? (
            <Panel title="Register">
              <EmptyState>
                You have not published any assignments yet. Use “New
                assignment” to open one.
              </EmptyState>
            </Panel>
          ) : (
            <Panel title="Your assignments" meta={`${activities.length} published`}>
              <ul className="divide-y divide-border">
                {activities.map((item) => {
                  const active = selectedId === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(item.id)}
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
                          {item.ungraded > 0 ? (
                            <StatusTag tone="alert">
                              {item.ungraded} ungraded
                            </StatusTag>
                          ) : (
                            <StatusTag tone="info">all marked</StatusTag>
                          )}
                        </div>
                        <p className="label-caps mt-1 text-muted-foreground">
                          {item.subjectCode} · {item.className} · due{" "}
                          {formatDate(item.dueAt)} · {item.submitted} submitted
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          )}
        </div>

        {/* Detail / review */}
        <div>
          {!selected ? (
            <Panel title="Submissions">
              <EmptyState>
                Select an assignment to review submissions, award marks and
                leave feedback.
              </EmptyState>
            </Panel>
          ) : !submissions ? (
            <Loader />
          ) : (
            <Panel
              title={selected.subjectCode}
              meta={`${selected.className} · due ${formatDate(selected.dueAt)} · ${selected.points} marks`}
              action={
                <span className="label-caps text-muted-foreground">
                  {submissions.submissions.length} of{" "}
                  {submissions.activity.classStrength} submitted
                </span>
              }
            >
              <h2 className="font-editorial text-xl leading-snug font-bold">
                {selected.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {selected.description}
              </p>

              {submissions.submissions.length === 0 ? (
                <div className="mt-4">
                  <EmptyState>
                    No submissions yet. {submissions.enrolled.length} students
                    are on this register.
                  </EmptyState>
                </div>
              ) : (
                <ul className="mt-4 divide-y divide-border">
                  {submissions.submissions.map((sub) => {
                    const draft = drafts[sub.id] ?? {
                      score: sub.score !== null ? String(sub.score) : "",
                      feedback: sub.feedback ?? "",
                    };
                    const graded = sub.score !== null;
                    return (
                      <li key={sub.id} className="py-4 first:pt-0 last:pb-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">
                              {sub.student}
                              <span className="ml-2 font-code text-xs text-muted-foreground">
                                {sub.rollNo}
                              </span>
                            </p>
                            <p className="label-caps mt-0.5 text-muted-foreground">
                              {formatDate(sub.submittedAt)} ·{" "}
                              {formatClock(sub.submittedAt)}
                              {sub.isLate && (
                                <span className="ml-1 text-primary">· late</span>
                              )}
                              {sub.gradedAt && ` · graded ${formatDate(sub.gradedAt)}`}
                            </p>
                          </div>
                          <StatusTag tone={graded ? "info" : "warn"}>
                            {graded
                              ? `${sub.score}/${selected.points}`
                              : "awaiting marks"}
                          </StatusTag>
                        </div>

                        <div className="ruled mt-2 border border-border bg-background px-3 py-2">
                          <p className="text-sm whitespace-pre-wrap">
                            {sub.answer}
                          </p>
                        </div>

                        {sub.fileUrl && (
                          <a
                            href={sub.fileUrl}
                            download={sub.fileName ?? undefined}
                            className="label-caps mt-2 inline-flex cursor-pointer items-center gap-1.5 border border-border px-2 py-1.5 hover:bg-secondary"
                          >
                            <Download className="size-3.5" />
                            {sub.fileName}
                            {sub.fileSize != null &&
                              ` · ${formatBytes(sub.fileSize)}`}
                          </a>
                        )}

                        <div className="mt-3 grid gap-3 sm:grid-cols-[120px_1fr_auto]">
                          <div>
                            <label
                              htmlFor={`score-${sub.id}`}
                              className="label-caps text-muted-foreground"
                            >
                              Marks / {selected.points}
                            </label>
                            <Input
                              id={`score-${sub.id}`}
                              type="number"
                              min={0}
                              max={selected.points}
                              value={draft.score}
                              onChange={(event) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [sub.id]: {
                                    ...draft,
                                    score: event.target.value,
                                  },
                                }))
                              }
                              className="mt-1.5 font-code"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor={`feedback-${sub.id}`}
                              className="label-caps text-muted-foreground"
                            >
                              Feedback
                            </label>
                            <Textarea
                              id={`feedback-${sub.id}`}
                              value={draft.feedback}
                              onChange={(event) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [sub.id]: {
                                    ...draft,
                                    feedback: event.target.value,
                                  },
                                }))
                              }
                              rows={2}
                              maxLength={1000}
                              placeholder="What was good, what to improve…"
                              className="mt-1.5"
                            />
                          </div>
                          <div className="flex items-end">
                            <Button
                              size="sm"
                              onClick={() =>
                                void handleReview(sub.id, selected.points, draft)
                              }
                              disabled={savingId === sub.id}
                              className="cursor-pointer"
                            >
                              {savingId === sub.id && (
                                <Loader2 className="mr-2 size-4 animate-spin" />
                              )}
                              {graded ? "Update marks" : "Publish marks"}
                            </Button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {submissions.enrolled.some((e) => !e.submitted) && (
                <div className="mt-4 border-t border-border pt-3">
                  <p className="label-caps text-muted-foreground">
                    Not submitted ({submissions.enrolled.filter((e) => !e.submitted).length})
                  </p>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {submissions.enrolled
                      .filter((e) => !e.submitted)
                      .map((e) => `${e.name} (${e.rollNo})`)
                      .join(" · ")}
                  </p>
                </div>
              )}
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
