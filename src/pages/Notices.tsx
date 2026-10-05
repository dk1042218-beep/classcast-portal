import { api } from "@/convex/_generated/api";
import {
  EmptyState,
  Loader,
  PageHeader,
  Panel,
  StatusTag,
} from "@/components/portal/primitives";
import { useQuery } from "convex/react";
import { Pin } from "lucide-react";
import { useState } from "react";

export default function Notices() {
  const notices = useQuery(api.studentPortal.noticesList);
  const [category, setCategory] = useState<string>("all");

  if (!notices) return <Loader />;

  const categories = Array.from(new Set(notices.map((n) => n.category))).sort();
  const visible = notices.filter(
    (notice) => category === "all" || notice.category === category,
  );

  return (
    <div>
      <PageHeader
        title="Notice board"
        description="Circulars issued by the Office of Academics and department notices for your class. Pinned notices are in force."
        action={
          <span className="label-caps border border-border bg-secondary px-2 py-1 text-muted-foreground">
            {notices.length} notices posted
          </span>
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
                {notice.pinned && (
                  <StatusTag tone="alert">In force</StatusTag>
                )}
                <span className="label-caps ml-auto text-muted-foreground">
                  {notice.dateStr}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h2 className="font-editorial text-lg leading-snug font-bold">
                  {notice.title}
                </h2>
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
