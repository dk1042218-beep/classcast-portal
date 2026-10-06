import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  EmptyState,
  Loader,
  PageHeader,
  Panel,
  StatusTag,
} from "@/components/portal/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Pin, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const CATEGORIES = [
  "academic",
  "examination",
  "event",
  "circular",
  "placement",
] as const;

function NoticeComposer({ classes }: { classes: string[] }) {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher";
  const createTeacherNotice = useMutation(api.teacher.createNotice);
  const createAdminNotice = useMutation(api.admin.createNotice);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<string>("circular");
  const [audience, setAudience] = useState<string>("all");
  const [pinned, setPinned] = useState(false);

  if (!open) {
    return (
      <Button
        size="sm"
        className="cursor-pointer"
        onClick={() => setOpen(true)}
      >
        <Plus className="mr-1.5 size-3.5" />
        Post a notice
      </Button>
    );
  }

  const close = () => {
    setOpen(false);
    setTitle("");
    setBody("");
    setCategory("circular");
    setAudience("all");
    setPinned(false);
  };

  const submit = async () => {
    if (title.trim().length < 3) {
      toast.error("Title must be at least 3 characters");
      return;
    }
    if (body.trim().length < 10) {
      toast.error("Notice text must be at least 10 characters");
      return;
    }
    setBusy(true);
    try {
      if (isTeacher) {
        await createTeacherNotice({
          title: title.trim(),
          body: body.trim(),
          category,
          audience,
          pinned,
        });
      } else {
        await createAdminNotice({
          title: title.trim(),
          body: body.trim(),
          category,
          audience,
          pinned,
        });
      }
      toast.success("Notice posted", {
        description: "The audience has been notified on their desks.",
      });
      close();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not post");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full border border-border bg-card p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <p className="label-caps text-foreground">
          {isTeacher ? "Notice to your class" : "Portal notice"}
        </p>
        <button
          type="button"
          onClick={close}
          className="cursor-pointer text-muted-foreground hover:text-foreground"
          aria-label="Close composer"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-3 grid gap-3">
        <div>
          <label htmlFor="notice-title" className="label-caps text-muted-foreground">
            Title
          </label>
          <Input
            id="notice-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={180}
            placeholder="e.g. Unit test rescheduled to Friday"
            className="mt-1.5"
          />
        </div>
        <div>
          <label htmlFor="notice-body" className="label-caps text-muted-foreground">
            Notice text
          </label>
          <Textarea
            id="notice-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="State the matter, the date it takes effect and who it concerns."
            className="mt-1.5"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="notice-category" className="label-caps text-muted-foreground">
              Category
            </label>
            <select
              id="notice-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="mt-1.5 w-full cursor-pointer border border-border bg-card px-2 py-2 text-sm outline-none"
            >
              {CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="notice-audience" className="label-caps text-muted-foreground">
              Audience
            </label>
            <select
              id="notice-audience"
              value={audience}
              onChange={(event) => setAudience(event.target.value)}
              className="mt-1.5 w-full cursor-pointer border border-border bg-card px-2 py-2 text-sm outline-none"
            >
              {isTeacher ? (
                classes.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))
              ) : (
                <>
                  <option value="all">Everyone</option>
                  {classes.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
          <div>
            <span className="label-caps text-muted-foreground">Pinned</span>
            <label className="mt-1.5 flex cursor-pointer items-center gap-2 border border-border bg-card px-2 py-2 text-sm">
              <input
                type="checkbox"
                checked={pinned}
                onChange={(event) => setPinned(event.target.checked)}
                className="size-4 accent-primary"
              />
              Keep in force
            </label>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Posted notices appear on every desk in the audience at once.
          </p>
          <Button size="sm" onClick={submit} disabled={busy} className="cursor-pointer">
            {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
            Post notice
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Notices() {
  const { user } = useAuth();
  const notices = useQuery(api.desk.noticesList);
  const role = user?.role ?? "student";
  // Audience options: faculty see their classes, administration sees all.
  const teacherOverview = useQuery(
    api.teacher.overview,
    role === "teacher" ? {} : "skip",
  );
  const adminAcademics = useQuery(
    api.admin.academics,
    role === "admin" ? {} : "skip",
  );
  const deleteTeacherNotice = useMutation(api.teacher.deleteNotice);
  const deleteAdminNotice = useMutation(api.admin.deleteNotice);

  const [category, setCategory] = useState<string>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!notices) return <Loader />;

  const classes =
    role === "teacher"
      ? (teacherOverview?.classes ?? [])
      : role === "admin"
        ? (adminAcademics?.classes.map((c) => c.name) ?? [])
        : [];

  const categories = Array.from(new Set(notices.map((n) => n.category))).sort();
  const visible = notices.filter(
    (notice) => category === "all" || notice.category === category,
  );

  const handleDelete = async (id: Id<"notices">) => {
    setBusyId(id);
    try {
      if (role === "admin") {
        await deleteAdminNotice({ id });
      } else {
        await deleteTeacherNotice({ id });
      }
      toast.success("Notice removed from the board");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove");
    } finally {
      setBusyId(null);
    }
  };

  const canCompose = role === "teacher" || role === "admin";

  return (
    <div>
      <PageHeader
        title="Notice board"
        description="Circulars issued by the Office of Academics and department notices for your class. Pinned notices are in force."
        action={
          canCompose ? (
            <NoticeComposer classes={classes} />
          ) : (
            <span className="label-caps border border-border bg-secondary px-2 py-1 text-muted-foreground">
              {notices.length} notices posted
            </span>
          )
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {["all", ...categories].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setCategory(value)}
            className={`label-caps cursor-pointer border px-2 py-1 ${
              category === value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-secondary"
            }`}
          >
            {value === "all" ? "All notices" : value}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <Panel title="Notices">
          <EmptyState>No notices in this category.</EmptyState>
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((notice) => (
            <article
              key={notice.id}
              className={`flex flex-col border bg-card ${
                notice.pinned ? "border-primary/50" : "border-border"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
                {notice.pinned && <Pin className="size-3.5 text-primary" />}
                <StatusTag tone={notice.pinned ? "alert" : "slate"}>
                  {notice.category}
                </StatusTag>
                {notice.pinned && <StatusTag tone="alert">In force</StatusTag>}
                {notice.audience !== "all" && (
                  <StatusTag tone="info">{notice.audience}</StatusTag>
                )}
                <span className="label-caps ml-auto text-muted-foreground">
                  {notice.dateStr}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-editorial text-lg leading-snug font-bold">
                    {notice.title}
                  </h2>
                  {((role === "teacher" && notice.mine) || role === "admin") && (
                    <button
                      type="button"
                      onClick={() => void handleDelete(notice.id)}
                      disabled={busyId === notice.id}
                      className="shrink-0 cursor-pointer border border-border p-1.5 text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50"
                      aria-label={`Remove notice ${notice.title}`}
                    >
                      {busyId === notice.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                    </button>
                  )}
                </div>
                <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
                  {notice.body}
                </p>
                <p className="label-caps mt-3 text-muted-foreground">
                  — {notice.author}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
