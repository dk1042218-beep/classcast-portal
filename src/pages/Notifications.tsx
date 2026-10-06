import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  EmptyState,
  Loader,
  PageHeader,
  Panel,
  StatusTag,
  timeAgo,
} from "@/components/portal/primitives";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

const KIND_LABEL: Record<string, string> = {
  assignment: "Assignment",
  marks: "Marks",
  note: "New note",
  deadline: "Deadline",
  submission: "Submission",
  notice: "Notice",
};

export default function Notifications() {
  const data = useQuery(api.desk.notificationsList);
  const markRead = useMutation(api.desk.markNotificationRead);
  const markAll = useMutation(api.desk.markAllNotificationsRead);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  if (!data) return <Loader />;

  const openItem = async (item: {
    id: Id<"notifications">;
    read: boolean;
    href?: string | null;
  }) => {
    if (!item.read) {
      try {
        await markRead({ id: item.id });
      } catch {
        return;
      }
    }
    if (item.href) navigate(item.href);
  };

  const handleMarkAll = async () => {
    setBusy(true);
    try {
      const count = await markAll({});
      toast.success(
        count > 0
          ? `${count} notification${count === 1 ? "" : "s"} marked as read`
          : "Nothing unread",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Everything the portal raised for you: new work, marks, notes, deadlines and notices."
        action={
          <Button
            size="sm"
            variant="outline"
            className="cursor-pointer"
            onClick={handleMarkAll}
            disabled={busy || data.unread === 0}
          >
            {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
            Mark all read
          </Button>
        }
      />

      <Panel
        title="Inbox"
        meta={`${data.unread} unread of ${data.items.length}`}
      >
        {data.items.length === 0 ? (
          <EmptyState>No notifications yet.</EmptyState>
        ) : (
          <ul className="divide-y divide-border">
            {data.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => void openItem(item)}
                  className={`flex w-full cursor-pointer items-start gap-3 px-1 py-3 text-left hover:bg-secondary/50 ${
                    item.read ? "" : "bg-primary/[0.04]"
                  }`}
                >
                  <span
                    className={`mt-1.5 size-2 shrink-0 ${item.read ? "bg-border" : "bg-primary"}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <StatusTag tone={item.read ? "slate" : "alert"}>
                        {KIND_LABEL[item.kind] ?? item.kind}
                      </StatusTag>
                      <span className="label-caps text-muted-foreground">
                        {timeAgo(item.createdAt)}
                      </span>
                      {!item.read && (
                        <span className="label-caps text-primary">New</span>
                      )}
                    </span>
                    <span className="mt-1 block text-sm font-medium">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {item.body}
                    </span>
                  </span>
                  {item.href && (
                    <span className="label-caps mt-1 shrink-0 text-muted-foreground">
                      Open →
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
