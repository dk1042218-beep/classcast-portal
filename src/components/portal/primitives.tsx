import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { useAction } from "convex/react";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Spinner used while queries load (no skeletons per project conventions). */
export function Loader() {
  return (
    <div className="flex justify-center py-28">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bootstrap: make sure the demo college exists before sign-in         */
/* ------------------------------------------------------------------ */

export function useEnsureSeed() {
  const ensure = useAction(api.seed.ensureSeeded);
  const [ready, setReady] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    ensure()
      .then(() => setReady(true))
      .catch(() => setReady(true));
  }, [ensure]);

  return ready;
}

/* ------------------------------------------------------------------ */
/* Panel: the compact rectangular information block                    */
/* ------------------------------------------------------------------ */

export function Panel({
  title,
  meta,
  action,
  children,
  className,
  bodyClass,
  ruled,
}: {
  title?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClass?: string;
  ruled?: boolean;
}) {
  return (
    <section className={cn("border border-border bg-card", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-border px-3 py-2 sm:px-4">
          <div className="flex min-w-0 items-baseline gap-2">
            {title && (
              <h2 className="label-caps truncate text-foreground">{title}</h2>
            )}
            {meta && (
              <span className="label-caps truncate text-muted-foreground">
                {meta}
              </span>
            )}
          </div>
          {action}
        </header>
      )}
      <div className={cn("p-3 sm:p-4", ruled && "ruled", bodyClass)}>
        {children}
      </div>
    </section>
  );
}

/** Page heading used on every portal screen. */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="rule-double mb-5 flex flex-wrap items-end justify-between gap-3 pb-3">
      <div>
        <h1 className="font-editorial text-2xl leading-tight font-bold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Small status labels                                                 */
/* ------------------------------------------------------------------ */

export type Tone = "neutral" | "info" | "alert" | "warn" | "slate";

const TONES: Record<Tone, string> = {
  neutral: "border-border bg-secondary text-foreground",
  info: "border-accent/40 bg-accent/10 text-accent",
  alert: "border-primary/40 bg-primary/10 text-primary",
  warn: "border-chart-4/50 bg-chart-4/10 text-chart-4",
  slate: "border-border bg-muted text-muted-foreground",
};

export function StatusTag({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "label-caps inline-flex items-center border px-1.5 py-[3px] whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function toneForPct(pct: number): Tone {
  if (pct >= 85) return "info";
  if (pct >= 75) return "neutral";
  return "alert";
}

export function toneForState(state: string): Tone {
  switch (state) {
    case "graded":
    case "submitted":
      return "info";
    case "overdue":
      return "warn";
    case "missing":
      return "alert";
    default:
      return "slate";
  }
}

/* ------------------------------------------------------------------ */
/* Compact statistic block                                             */
/* ------------------------------------------------------------------ */

export function StatBlock({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="border border-border bg-card px-3 py-2.5">
      <div className="label-caps text-muted-foreground">{label}</div>
      <div
        className={cn(
          "font-editorial mt-1 text-2xl leading-none font-bold tnum",
          tone === "alert" && "text-primary",
          tone === "info" && "text-accent",
          tone === "neutral" && "text-foreground",
        )}
      >
        {value}
      </div>
      {sub && (
        <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
      )}
    </div>
  );
}

/** Horizontal percentage rule used in attendance tables. */
export function Meter({ pct }: { pct: number }) {
  return (
    <div className="h-1.5 w-full border border-border bg-muted">
      <div
        className={cn("h-full", pct >= 75 ? "bg-accent" : "bg-primary")}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Table shorthand                                                     */
/* ------------------------------------------------------------------ */

export const TH =
  "label-caps text-left font-normal text-muted-foreground border-b border-border px-3 py-2 whitespace-nowrap";
export const TD = "border-b border-border px-3 py-2 align-middle";

/* ------------------------------------------------------------------ */
/* Date + text formatting                                              */
/* ------------------------------------------------------------------ */

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const WEEKDAYS = [
  "Sunday", "Monday", "Tuesday", "Wednesday",
  "Thursday", "Friday", "Saturday",
];

export function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatClock(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m} ${suffix}`;
}

export function formatLongDate(ts: number): string {
  const d = new Date(ts);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${monthName(d.getMonth())} ${d.getFullYear()}`;
}

function monthName(index: number): string {
  const full = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return full[index];
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isoFromTs(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "in 3 days" / "today" / "overdue by 2 days" for a deadline. */
export function dueLabel(dueAt: number, now = Date.now()): {
  text: string;
  tone: Tone;
} {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueAt);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0) {
    const n = Math.abs(diffDays);
    return { text: `overdue by ${n} day${n === 1 ? "" : "s"}`, tone: "alert" };
  }
  if (diffDays === 0) return { text: "due today", tone: "warn" };
  if (diffDays === 1) return { text: "due tomorrow", tone: "warn" };
  return { text: `in ${diffDays} days`, tone: "neutral" };
}

export function timeAgo(ts: number, now = Date.now()): string {
  const diff = now - ts;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(ts);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

/** Today's date key + weekday for the local client. */
export function todayInfo(): { today: string; day: string } {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const day = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][now.getDay()];
  return { today, day };
}
