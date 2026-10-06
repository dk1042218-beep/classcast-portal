import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  EmptyState,
  formatBytes,
  formatDate,
  Loader,
  PageHeader,
  Panel,
} from "@/components/portal/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery } from "convex/react";
import { Download, Loader2, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = [
  "pdf", "doc", "docx", "ppt", "pptx", "txt", "csv",
  "png", "jpg", "jpeg", "zip",
];

export default function TeachNotes() {
  const overview = useQuery(api.teacher.overview);
  const notes = useQuery(api.teacher.myNotes);
  const generateUploadUrl = useMutation(api.teacher.generateNoteUploadUrl);
  const createNote = useMutation(api.teacher.createNote);
  const deleteNote = useMutation(api.teacher.deleteNote);

  const [subjectId, setSubjectId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  if (!overview || !notes) return <Loader />;

  const subjects = overview.subjects;

  const pickFile = (picked: File | null) => {
    if (!picked) return setFile(null);
    const ext = picked.name.toLowerCase().split(".").pop() ?? "";
    if (!ALLOWED.includes(ext)) {
      toast.error(
        `File type not allowed. Accepted: ${ALLOWED.join(", ")}`,
      );
      return;
    }
    if (picked.size > MAX_BYTES) {
      toast.error("File exceeds the 10 MB upload limit");
      return;
    }
    if (picked.size === 0) {
      toast.error("That file is empty");
      return;
    }
    setFile(picked);
  };

  const handleUpload = async () => {
    const activeSubject = subjectId || subjects[0]?.id || "";
    if (!activeSubject) {
      toast.error("Choose a subject first");
      return;
    }
    if (title.trim().length < 3) {
      toast.error("Title must be at least 3 characters");
      return;
    }
    if (!file) {
      toast.error("Choose a file to upload");
      return;
    }
    setBusy(true);
    try {
      const uploadUrl = await generateUploadUrl({});
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!response.ok) {
        throw new Error("Upload failed — try a smaller file");
      }
      const { storageId } = (await response.json()) as { storageId: string };
      await createNote({
        subjectId: activeSubject as Id<"subjects">,
        title: title.trim(),
        description: description.trim(),
        fileName: file.name,
        objectKey: storageId,
      });
      toast.success("Note published", {
        description: `${file.name} is now visible to the class.`,
      });
      setTitle("");
      setDescription("");
      setFile(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: Id<"notes">) => {
    setBusyId(id);
    try {
      await deleteNote({ id });
      toast.success("Note removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete");
    } finally {
      setBusyId(null);
    }
  };

  const needle = search.trim().toLowerCase();
  const visible = notes.filter(
    (note) =>
      !needle ||
      `${note.title} ${note.description} ${note.fileName} ${note.subjectCode} ${note.subject}`
        .toLowerCase()
        .includes(needle),
  );

  return (
    <div>
      <PageHeader
        title="Notes & files"
        description="Handouts you publish here appear on every student desk in the class, with download links straight from portal storage."
        action={
          <span className="label-caps border border-border bg-secondary px-2 py-1 text-muted-foreground">
            {notes.length} document{notes.length === 1 ? "" : "s"} published
          </span>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        {/* Upload */}
        <Panel title="Publish a handout" meta="PDF · 10 MB max">
          <div className="grid gap-3">
            <div>
              <label htmlFor="note-subject" className="label-caps text-muted-foreground">
                Subject
              </label>
              <select
                id="note-subject"
                value={subjectId || subjects[0]?.id || ""}
                onChange={(event) => setSubjectId(event.target.value)}
                className="mt-1.5 block w-full cursor-pointer border border-border bg-card px-2 py-2 text-sm outline-none"
                disabled={subjects.length === 0}
              >
                {subjects.length === 0 && (
                  <option value="">No subjects allotted</option>
                )}
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.code} · {subject.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="note-title" className="label-caps text-muted-foreground">
                Title
              </label>
              <Input
                id="note-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={160}
                placeholder="e.g. Unit 4 — Transaction schedules"
                className="mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="note-desc" className="label-caps text-muted-foreground">
                Description
              </label>
              <Textarea
                id="note-desc"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                maxLength={600}
                placeholder="What this handout covers and which lectures it belongs to."
                className="mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="note-file" className="label-caps text-muted-foreground">
                File
              </label>
              <input
                id="note-file"
                type="file"
                accept={ALLOWED.map((ext) => `.${ext}`).join(",")}
                onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
                className="mt-1.5 block w-full cursor-pointer border border-border bg-card px-2 py-2 text-sm file:mr-3 file:cursor-pointer file:border file:border-border file:bg-secondary file:px-2 file:py-1 file:text-xs"
              />
              {file && (
                <p className="label-caps mt-1.5 text-muted-foreground">
                  {file.name} · {formatBytes(file.size)}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">
                {ALLOWED.slice(0, 6).join(" · ")} …
              </span>
              <Button
                size="sm"
                onClick={handleUpload}
                disabled={busy || subjects.length === 0}
                className="cursor-pointer"
              >
                {busy ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 size-4" />
                )}
                Upload
              </Button>
            </div>
          </div>
        </Panel>

        {/* List */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex min-w-56 flex-1 items-center border border-border bg-card">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search your notes…"
                className="w-full bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <Panel title="Your publications" meta={`${visible.length} shown`}>
            {visible.length === 0 ? (
              <EmptyState>
                You have not published any handouts yet, or none match this
                search.
              </EmptyState>
            ) : (
              <ul className="divide-y divide-border">
                {visible.map((note) => (
                  <li
                    key={note.id}
                    className="flex flex-wrap items-start gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="label-caps mt-0.5 border border-border bg-secondary px-1.5 py-1 text-muted-foreground">
                      {note.fileType.toUpperCase()}
                    </span>
                    <div className="min-w-52 flex-1">
                      <p className="text-sm font-medium">{note.title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {note.description}
                      </p>
                      <p className="label-caps mt-1.5 text-muted-foreground">
                        {note.subjectCode} · {note.subject} ·{" "}
                        {formatDate(note.uploadedAt)} ·{" "}
                        {formatBytes(note.sizeBytes)} · {note.fileName}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {note.fileUrl && (
                        <a
                          href={note.fileUrl}
                          download={note.fileName}
                          className="label-caps flex cursor-pointer items-center gap-1.5 border border-border px-2 py-1.5 hover:bg-secondary"
                        >
                          <Download className="size-3.5" />
                          Download
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleDelete(note.id)}
                        disabled={busyId === note.id}
                        className="label-caps flex cursor-pointer items-center gap-1.5 border border-border px-2 py-1.5 text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50"
                      >
                        {busyId === note.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
