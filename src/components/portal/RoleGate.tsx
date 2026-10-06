import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Outlet, useNavigate } from "react-router";

/**
 * Route-level role guard. Renders its children (or the nested Outlet) only
 * when the signed-in account holds one of the allowed roles; otherwise it
 * shows the same restricted-desk panel the shell uses. Backend queries are
 * separately gated by requireTeacher/requireAdmin — this is the UI layer.
 */
export function RoleGate({
  allow,
  children,
}: {
  allow: Array<"student" | "teacher" | "admin">;
  children?: ReactNode;
}) {
  const { user, isLoading, signOut } = useAuth();
  const navigate = useNavigate();

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const authorized = user.role != null && allow.includes(user.role);

  if (!authorized || user.status === "inactive") {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="max-w-md border border-border bg-card p-6 text-center">
          <p className="label-caps text-primary">Access restricted</p>
          <h1 className="font-editorial mt-2 text-xl font-bold">
            This desk is not yours
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account is signed in as{" "}
            <span className="font-medium text-foreground">
              {user.role ?? "unassigned"}
            </span>
            , so this section is closed. Use the sidebar to return to your own
            desk.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="cursor-pointer border border-border px-4 py-2 text-sm hover:bg-secondary"
            >
              My dashboard
            </button>
            <button
              type="button"
              onClick={() => {
                void signOut().then(() => navigate("/"));
              }}
              className="cursor-pointer border border-border px-4 py-2 text-sm hover:bg-secondary"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children ?? <Outlet />}</>;
}
