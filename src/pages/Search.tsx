import { api } from "@/convex/_generated/api";
import {
  EmptyState,
  Loader,
  PageHeader,
  Panel,
} from "@/components/portal/primitives";
import { useQuery } from "convex/react";
import { Search as SearchIcon } from "lucide-react";
import { type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";

type Section = { key: string; title: string; rows: { id: string; title: string; meta: string; href: string }[] };

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const results = useQuery(api.desk.globalSearch, { q });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = String(data.get("q") ?? "").trim();
    setParams(value.length >= 2 ? { q: value } : {});
  };

  const sections: Section[] = results
    ? [
        { key: "subjects", title: "Subjects", rows: results.subjects },
        { key: "notes", title: "Notes & files", rows: results.notes },
        { key: "assignments", title: "Assignments", rows: results.assignments },
        { key: "notices", title: "Notices", rows: results.notices },
        { key: "people", title: "People", rows: results.people },
      ].filter((section) => section.rows.length > 0)
    : [];

  const total = sections.reduce((sum, section) => sum + section.rows.length, 0);

  return (
    <div>
      <PageHeader
        title="Search the portal"
        description="Looks across your desk's subjects, notes and assignments, every notice on the board and — for faculty and administration — the people on the register. Results come from the database, scoped to your role."
      />

      <form onSubmit={handleSubmit} className="mb-5 flex gap-2">
        <div className="flex flex-1 items-center border border-border bg-card">
          <SearchIcon className="ml-3 size-4 text-muted-foreground" />
          <input
            name="q"
            key={q}
            defaultValue={q}
            placeholder="Try: normalization, CS-301, examinations…"
            className="w-full bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
            autoFocus
          />
        </div>
        <button
          type="submit"
          className="cursor-pointer border border-primary bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Search
        </button>
      </form>

      {!results ? (
        <Loader />
      ) : q.trim().length < 2 ? (
        <Panel title="Query">
          <EmptyState>
            Enter at least two characters to search the portal record.
          </EmptyState>
        </Panel>
      ) : total === 0 ? (
        <Panel title={`No results for “${q}”`}>
          <EmptyState>
            Nothing on file matches that term. Check the course code, subject
            name or notice wording.
          </EmptyState>
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((section) => (
            <Panel
              key={section.key}
              title={section.title}
              meta={`${section.rows.length} found`}
            >
              <ul className="divide-y divide-border">
                {section.rows.map((row) => (
                  <li key={`${section.key}-${row.id}`}>
                    <Link
                      to={row.href}
                      className="flex items-start justify-between gap-3 py-2.5 hover:bg-secondary/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {row.title}
                        </p>
                        <p className="label-caps mt-0.5 text-muted-foreground">
                          {row.meta}
                        </p>
                      </div>
                      <span className="label-caps shrink-0 text-muted-foreground">
                        Open →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
