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
import { useQuery } from "convex/react";
import { Download, ExternalLink, Search } from "lucide-react";
import { useState } from "react";

type Sort = "newest" | "oldest" | "title";

export default function Notes() {
  const [search, setSearch] = useState("");
  const [subjectId, setSubjectId] = useState<Id<"subjects"> | null>(null);
  const [sort, setSort] = useState<Sort>("newest");

  const notes = useQuery(api.studentNotes.notesList, {
    search: search.trim() ? search.trim() : undefined,
    subjectId: subjectId ?? undefined,
    sort,
  });

  if (!notes) return <Loader />;

  return (
    <div>
      <PageHeader
        title="Notes & files"
        description="Handouts uploaded by faculty for your class. Search runs against the portal record, not just the page."
        action={
          <span className="label-caps border border-border bg-secondary px-2 py-1 text-muted-foreground">
            {notes.total} document{notes.total === 1 ? "" : "s"} on file
          </span>
        }
      />

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex min-w-56 flex-1 items-center border border-border bg-card">
          <Search className="ml-2.5 size-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title, subject, faculty or file…"
            className="w-full bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as Sort)}
          className="cursor-pointer border border-border bg-card px-2 py-2 text-sm outline-none"
          aria-label="Sort notes"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title">Title A–Z</option>
        </select>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSubjectId(null)}
          className={`label-caps cursor-pointer border px-2 py-1 ${
            subjectId === null
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground hover:bg-secondary"
          }`}
        >
          All subjects
        </button>
        {notes.subjects.map((subject) => (
          <button
            key={subject.id}
            type="button"
            onClick={() => setSubjectId(subject.id)}
            className={`label-caps cursor-pointer border px-2 py-1 ${
              subjectId === subject.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-secondary"
            }`}
          >
            {subject.code} · {subject.name}
          </button>
        ))}
      </div>

      <Panel title="Document register" meta={`${notes.items.length} shown`}>
        {notes.items.length === 0 ? (
          <EmptyState>
            No documents match this search. Clear the filters to see the full
            register.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-border">
            {notes.items.map((note) => (
              <li
                key={note.id}
                className="flex flex-wrap items-start gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span className="label-caps mt-0.5 border border-border bg-secondary px-1.5 py-1 text-muted-foreground">
                  {note.fileType.toUpperCase()}
                </span>
                <div className="min-w-56 flex-1">
                  <p className="text-sm font-medium">{note.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {note.description}
                  </p>
                  <p className="label-caps mt-1.5 text-muted-foreground">
                    {note.subjectCode} · {note.subject} · {note.teacher} ·{" "}
                    {formatDate(note.uploadedAt)} · {formatBytes(note.sizeBytes)}
                  </p>
                </div>
                {note.fileUrl && (
                  <div className="flex gap-2">
                    <a
                      href={note.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="label-caps flex cursor-pointer items-center gap-1.5 border border-border px-2 py-1.5 hover:bg-secondary"
                    >
                      <ExternalLink className="size-3.5" />
                      Open
                    </a>
                    <a
                      href={note.fileUrl}
                      download={note.fileName}
                      className="label-caps flex cursor-pointer items-center gap-1.5 border border-primary bg-primary px-2 py-1.5 text-primary-foreground hover:bg-primary/90"
                    >
                      <Download className="size-3.5" />
                      Download
                    </a>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
