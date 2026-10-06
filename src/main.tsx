import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { RoleGate } from "@/components/portal/RoleGate";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import React, { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";

// Lazy load route components for better code splitting
const Landing = lazy(() => import("./pages/Landing.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const PortalShell = lazy(() => import("./components/portal/PortalShell.tsx"));
const Timetable = lazy(() => import("./pages/Timetable.tsx"));
const Attendance = lazy(() => import("./pages/Attendance.tsx"));
const Notes = lazy(() => import("./pages/Notes.tsx"));
const Assignments = lazy(() => import("./pages/Assignments.tsx"));
const Notices = lazy(() => import("./pages/Notices.tsx"));
const Notifications = lazy(() => import("./pages/Notifications.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const SearchPage = lazy(() => import("./pages/Search.tsx"));
const Calendar = lazy(() => import("./pages/Calendar.tsx"));
const TeachClasses = lazy(() => import("./pages/teach/TeachClasses.tsx"));
const TeachNotes = lazy(() => import("./pages/teach/TeachNotes.tsx"));
const TeachAssignments = lazy(() =>
  import("./pages/teach/TeachAssignments.tsx"),
);
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers.tsx"));
const AdminAcademics = lazy(() => import("./pages/admin/AdminAcademics.tsx"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports.tsx"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings.tsx"));

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

/** Silent error boundary — if VlyToolbar crashes it renders nothing instead of
 *  crashing the whole app (e.g. hook errors in the browser runtime). */
class ToolbarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: Error) {
    console.warn("[VlyToolbar] Caught error, toolbar disabled:", err.message);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

/** Hard guard so runtime errors never leave the preview as a blank page. */
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string; stack: string }
> {
  state = { hasError: false, message: "", stack: "" };
  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error.message || "Unknown runtime error",
      stack: error.stack || "",
    };
  }
  componentDidCatch(err: Error) {
    console.error("[Preview] Root crash:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-lg text-center">
            <p className="text-sm font-semibold">Preview runtime error</p>
            <p className="mt-2 text-xs text-muted-foreground break-words">
              {this.state.message}
            </p>
            {this.state.stack && (
              <pre className="mt-3 text-left text-[10px] leading-4 text-muted-foreground/80 max-h-40 overflow-auto rounded border border-border/60 p-2">
                {this.state.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);



function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <ToolbarErrorBoundary>
        <VlyToolbar />
      </ToolbarErrorBoundary>
      <ConvexAuthProvider client={convex}>
        <BrowserRouter>
          <RouteSyncer />
          <Suspense fallback={<RouteLoading />}>
            <Routes>
              <Route path="/" element={<Landing />} />              <Route
                path="/auth"
                element={
                  <AuthPage redirectAfterAuth="/dashboard" />
                }
              />
              <Route
                element={
                  <RequireAuth
                    title="Sign in to open your student desk"
                    description="ClassCast keeps your timetable, attendance, notes, assignments and notices behind your portal ID."
                  >
                    <PortalShell />
                  </RequireAuth>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route
                  path="/timetable"
                  element={
                    <RoleGate allow={["student"]}>
                      <Timetable />
                    </RoleGate>
                  }
                />
                <Route
                  path="/calendar"
                  element={
                    <RoleGate allow={["student"]}>
                      <Calendar />
                    </RoleGate>
                  }
                />
                <Route
                  path="/attendance"
                  element={
                    <RoleGate allow={["student"]}>
                      <Attendance />
                    </RoleGate>
                  }
                />
                <Route
                  path="/notes"
                  element={
                    <RoleGate allow={["student"]}>
                      <Notes />
                    </RoleGate>
                  }
                />
                <Route
                  path="/assignments"
                  element={
                    <RoleGate allow={["student"]}>
                      <Assignments />
                    </RoleGate>
                  }
                />
                <Route path="/notices" element={<Notices />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/search" element={<SearchPage />} />
                <Route
                  path="/teach/classes"
                  element={
                    <RoleGate allow={["teacher"]}>
                      <TeachClasses />
                    </RoleGate>
                  }
                />
                <Route
                  path="/teach/notes"
                  element={
                    <RoleGate allow={["teacher"]}>
                      <TeachNotes />
                    </RoleGate>
                  }
                />
                <Route
                  path="/teach/assignments"
                  element={
                    <RoleGate allow={["teacher"]}>
                      <TeachAssignments />
                    </RoleGate>
                  }
                />
                <Route
                  path="/admin/students"
                  element={
                    <RoleGate allow={["admin"]}>
                      <AdminUsers role="student" />
                    </RoleGate>
                  }
                />
                <Route
                  path="/admin/teachers"
                  element={
                    <RoleGate allow={["admin"]}>
                      <AdminUsers role="teacher" />
                    </RoleGate>
                  }
                />
                <Route
                  path="/admin/academics"
                  element={
                    <RoleGate allow={["admin"]}>
                      <AdminAcademics />
                    </RoleGate>
                  }
                />
                <Route
                  path="/admin/reports"
                  element={
                    <RoleGate allow={["admin"]}>
                      <AdminReports />
                    </RoleGate>
                  }
                />
                <Route
                  path="/admin/settings"
                  element={
                    <RoleGate allow={["admin"]}>
                      <AdminSettings />
                    </RoleGate>
                  }
                />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster />
      </ConvexAuthProvider>
    </RootErrorBoundary>
  </StrictMode>,
);
