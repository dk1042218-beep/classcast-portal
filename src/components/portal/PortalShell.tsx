import { api } from "@/convex/_generated/api";
import {
  formatLongDate,
  initials,
  useEnsureSeed,
} from "@/components/portal/primitives";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Bell, LogOut, Menu, Search, X } from "lucide-react";
import { useQuery } from "convex/react";
import { useState, type FormEvent } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";

const TODAY = formatLongDate(Date.now());

type Role = "student" | "teacher" | "admin";

type NavItem = { to: string; label: string; icon: string };

const STUDENT_NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: "▦" },
  { to: "/timetable", label: "Timetable", icon: "▤" },
  { to: "/calendar", label: "Calendar", icon: "◫" },
  { to: "/attendance", label: "Attendance", icon: "☑" },
  { to: "/notes", label: "Notes & Files", icon: "≣" },
  { to: "/assignments", label: "Assignments", icon: "✎" },
  { to: "/notices", label: "Notice Board", icon: "▣" },
  { to: "/notifications", label: "Notifications", icon: "◉" },
  { to: "/profile", label: "Profile & Security", icon: "◐" },
];

const TEACHER_NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: "▦" },
  { to: "/teach/classes", label: "Classes & Attendance", icon: "☰" },
  { to: "/notes", label: "Notes & Files", icon: "≣" },
  { to: "/assignments", label: "Assignments", icon: "✎" },
  { to: "/notices", label: "Notice Board", icon: "▣" },
  { to: "/notifications", label: "Notifications", icon: "◉" },
  { to: "/profile", label: "Profile & Security", icon: "◐" },
];

const ADMIN_NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: "▦" },
  { to: "/admin/students", label: "Students", icon: "◍" },
  { to: "/admin/teachers", label: "Teachers", icon: "◎" },
  { to: "/admin/academics", label: "Academics", icon: "◈" },
  { to: "/admin/reports", label: "Reports", icon: "≡" },
  { to: "/notices", label: "Notice Board", icon: "▣" },
  { to: "/notifications", label: "Notifications", icon: "◉" },
  { to: "/admin/settings", label: "System Settings", icon: "⚙" },
  { to: "/profile", label: "Profile & Security", icon: "◐" },
];

function navFor(role: Role): NavItem[] {
  if (role === "teacher") return TEACHER_NAV;
  if (role === "admin") return ADMIN_NAV;
  return STUDENT_NAV;
}

const DESK_LABEL: Record<Role, string> = {
  student: "Student Desk",
  teacher: "Faculty Desk",
  admin: "Administration",
};

function NavItems({
  items,
  onNavigate,
  unread,
}: {
  items: NavItem[];
  onNavigate?: () => void;
  unread: number;
}) {
  return (
    <nav className="flex flex-col">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center justify-between gap-2 border-l-2 px-3 py-2 text-sm transition-colors",
              isActive
                ? "border-primary bg-sidebar-accent font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
            )
          }
        >
          <span className="flex items-center gap-2">
            <span className="label-caps w-4 text-center" aria-hidden>
              {item.icon}
            </span>
            {item.label}
          </span>
          {item.to === "/notifications" && unread > 0 && (
            <span className="label-caps border border-primary/40 bg-primary/10 px-1 py-px text-primary tnum">
              {unread}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export default function PortalShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const ready = useEnsureSeed();
  const notifications = useQuery(api.desk.notificationsList);
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");

  const today = TODAY;

  const unread = notifications?.unread ?? 0;
  const role: Role =
    user?.role === "teacher" || user?.role === "admin" ? user.role : "student";
  const nav = navFor(role);
  const current =
    nav.find((n) => location.pathname.startsWith(n.to))?.label ?? "Dashboard";

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    const q = search.trim();
    if (q.length < 2) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading portal…
      </div>
    );
  }

  const allowedRole =
    user.role === "student" || user.role === "teacher" || user.role === "admin";
  if (!allowedRole || user.status === "inactive") {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md border border-border bg-card p-6 text-center">
          <p className="label-caps text-primary">Access restricted</p>
          <h1 className="font-editorial mt-2 text-xl font-bold">
            {user.status === "inactive"
              ? "This account has been deactivated"
              : "No desk is assigned to this account"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {user.status === "inactive"
              ? "Contact the Office of Academics to reactivate your portal account."
              : "Ask the registry to allot your portal ID to a student, faculty or administration desk."}
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-4 cursor-pointer border border-border px-4 py-2 text-sm hover:bg-secondary"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
        <div className="border-b border-border px-3 py-4">
          <NavLink to="/dashboard" className="block cursor-pointer">
            <span className="font-editorial text-xl font-bold tracking-tight">
              ClassCast
            </span>
            <span className="label-caps mt-1 block text-muted-foreground">
              {DESK_LABEL[role]}
            </span>
          </NavLink>
        </div>
        <div className="flex-1 overflow-y-auto py-3">
          <NavItems items={nav} unread={unread} />
        </div>
        <div className="border-t border-border px-3 py-3">
          <p className="label-caps text-muted-foreground">Portal</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Vidyanagar Institute of Computer Sciences
            <br />
            Office of Academics · v1.0
          </p>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-border bg-card">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="cursor-pointer border border-border p-1.5 lg:hidden"
              aria-label="Toggle navigation"
            >
              {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>

            <div className="min-w-0 flex-1">
              <p className="label-caps text-muted-foreground">
                ClassCast · {current}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {today}
              </p>
            </div>

            <form
              onSubmit={handleSearch}
              className="hidden items-center border border-border bg-background md:flex"
            >
              <Search className="ml-2 size-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search notes, assignments, notices…"
                className="w-56 bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
              />
            </form>

            <NavLink
              to="/notifications"
              className="relative cursor-pointer border border-border p-1.5"
              aria-label="Notifications"
            >
              <Bell className="size-4" />
              {unread > 0 && (
                <span className="absolute -top-2 -right-2 min-w-4 border border-primary bg-primary px-0.5 text-[10px] leading-4 font-semibold text-primary-foreground tnum">
                  {unread}
                </span>
              )}
            </NavLink>

            <NavLink
              to="/profile"
              className="flex cursor-pointer items-center gap-2 border border-border px-2 py-1"
            >
              <span className="flex size-6 items-center justify-center bg-secondary text-[11px] font-semibold">
                {initials(user.name ?? user.portalId ?? "ClassCast")}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-xs leading-tight font-medium">
                  {user.name ?? user.portalId ?? "Account"}
                </span>
                <span className="label-caps block text-muted-foreground">
                  {user.portalId ?? ""}
                </span>
              </span>
            </NavLink>

            <button
              type="button"
              onClick={handleSignOut}
              className="flex cursor-pointer items-center gap-1 border border-border px-2 py-1.5 text-xs hover:bg-secondary"
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>

          {menuOpen && (
            <div className="border-t border-border bg-sidebar lg:hidden">
              <NavItems
                items={nav}
                unread={unread}
                onNavigate={() => setMenuOpen(false)}
              />
            </div>
          )}
        </header>

        {!ready && (
          <div className="label-caps border-t border-border bg-secondary px-4 py-1 text-muted-foreground sm:px-6 lg:px-8">
            Preparing portal record…
          </div>
        )}

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>

        <footer className="border-t border-border px-4 py-3 sm:px-6 lg:px-8">
          <p className="label-caps mx-auto max-w-6xl text-muted-foreground">
            ClassCast v1.0 · Academic Portal · Office of Academics
          </p>
        </footer>
      </div>
    </div>
  );
}
