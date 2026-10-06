import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  EmptyState,
  Loader,
  PageHeader,
  Panel,
  StatusTag,
  TD,
  TH,
} from "@/components/portal/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Pencil, Plus, RotateCcw, X } from "lucide-react";
import { Fragment, useState, type FormEvent } from "react";
import { toast } from "sonner";

type Role = "student" | "teacher";

const PORTAL_ID_RE = /^[A-Za-z0-9][A-Za-z0-9-]{2,19}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AdminUsers({ role }: { role: Role }) {
  const [search, setSearch] = useState("");
  const users = useQuery(api.admin.usersList, { role, search: search.trim() || undefined });
  const academics = useQuery(api.admin.academics);
  const createUser = useMutation(api.admin.createUser);
  const updateUser = useMutation(api.admin.updateUser);
  const resetPassword = useMutation(api.admin.resetUserPassword);

  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<Id<"users"> | null>(null);
  const [resettingId, setResettingId] = useState<Id<"users"> | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const noun = role === "student" ? "Student" : "Teacher";
  const classes = academics?.classes.map((c) => c.name) ?? [];

  if (!users || !academics) return <Loader />;

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const portalId = String(data.get("portalId") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");

    if (name.length < 2) return toast.error("Enter a valid name");
    if (!PORTAL_ID_RE.test(portalId))
      return toast.error("Portal ID must be 3-20 letters, numbers or dashes");
    if (!EMAIL_RE.test(email)) return toast.error("Enter a valid email address");
    if (password.length < 8)
      return toast.error("Password must be at least 8 characters");

    const className = String(data.get("className") ?? "").trim();
    const rollNo = String(data.get("rollNo") ?? "").trim();
    if (role === "student" && !className) return toast.error("Choose a class");
    if (role === "student" && !rollNo) return toast.error("Enter a roll number");

    setBusy(true);
    try {
      await createUser({
        role,
        name,
        portalId,
        email,
        password,
        phone: String(data.get("phone") ?? "").trim() || undefined,
        className: role === "student" ? className : undefined,
        rollNo: role === "student" ? rollNo : undefined,
        department:
          role === "teacher"
            ? String(data.get("department") ?? "").trim() || undefined
            : undefined,
        designation:
          role === "teacher"
            ? String(data.get("designation") ?? "").trim() || undefined
            : undefined,
      });
      toast.success(`${noun} account created`, {
        description: `${portalId} can sign in with the password you set.`,
      });
      setShowCreate(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create");
    } finally {
      setBusy(false);
    }
  };

  const handleUpdate = async (
    userId: Id<"users">,
    form: HTMLFormElement,
  ) => {
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    if (name.length < 2) return toast.error("Enter a valid name");
    if (!EMAIL_RE.test(email)) return toast.error("Enter a valid email address");

    setBusy(true);
    try {
      await updateUser({
        userId,
        name,
        email,
        phone: String(data.get("phone") ?? "").trim() || undefined,
        className:
          role === "student"
            ? String(data.get("className") ?? "").trim()
            : undefined,
        rollNo:
          role === "student" ? String(data.get("rollNo") ?? "").trim() : undefined,
        department:
          role === "teacher"
            ? String(data.get("department") ?? "").trim() || undefined
            : undefined,
        designation:
          role === "teacher"
            ? String(data.get("designation") ?? "").trim() || undefined
            : undefined,
        status: String(data.get("status") ?? "active") as "active" | "inactive",
      });
      toast.success("Record updated");
      setEditingId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async (userId: Id<"users">) => {
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setBusy(true);
    try {
      await resetPassword({ userId, password: newPassword });
      toast.success("Password reset", {
        description: "The account has been notified on its desk.",
      });
      setResettingId(null);
      setNewPassword("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reset");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={role === "student" ? "Student management" : "Teacher management"}
        description={
          role === "student"
            ? "Create portal accounts, allot roll numbers and classes, reset passwords, deactivate records."
            : "Faculty accounts, department allotments and designations for the teaching desk."
        }
        action={
          <Button
            size="sm"
            className="cursor-pointer"
            onClick={() => setShowCreate((open) => !open)}
          >
            {showCreate ? (
              <>
                <X className="mr-1.5 size-3.5" /> Cancel
              </>
            ) : (
              <>
                <Plus className="mr-1.5 size-3.5" /> New {noun.toLowerCase()}
              </>
            )}
          </Button>
        }
      />

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="mb-4 border border-border bg-card p-3 sm:p-4"
        >
          <p className="label-caps text-foreground">
            Register a {noun.toLowerCase()}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor="c-name" className="label-caps text-muted-foreground">
                Full name
              </label>
              <Input id="c-name" name="name" required className="mt-1.5" />
            </div>
            <div>
              <label htmlFor="c-portal" className="label-caps text-muted-foreground">
                Portal ID
              </label>
              <Input
                id="c-portal"
                name="portalId"
                required
                placeholder={role === "student" ? "ST-107" : "TCH-1200"}
                className="mt-1.5 font-code"
              />
            </div>
            <div>
              <label htmlFor="c-email" className="label-caps text-muted-foreground">
                College email
              </label>
              <Input
                id="c-email"
                name="email"
                type="email"
                required
                className="mt-1.5 font-code"
              />
            </div>
            <div>
              <label htmlFor="c-password" className="label-caps text-muted-foreground">
                Temporary password
              </label>
              <Input
                id="c-password"
                name="password"
                type="text"
                required
                minLength={8}
                placeholder="Min 8 characters"
                className="mt-1.5 font-code"
              />
            </div>
            <div>
              <label htmlFor="c-phone" className="label-caps text-muted-foreground">
                Phone (optional)
              </label>
              <Input id="c-phone" name="phone" className="mt-1.5 font-code" />
            </div>
            {role === "student" ? (
              <>
                <div>
                  <label
                    htmlFor="c-class"
                    className="label-caps text-muted-foreground"
                  >
                    Class
                  </label>
                  <select
                    id="c-class"
                    name="className"
                    required
                    className="mt-1.5 block w-full cursor-pointer border border-border bg-card px-2 py-2 text-sm outline-none"
                  >
                    <option value="">Choose a class…</option>
                    {classes.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="c-roll" className="label-caps text-muted-foreground">
                    Roll number
                  </label>
                  <Input id="c-roll" name="rollNo" required className="mt-1.5 font-code" />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label
                    htmlFor="c-dept"
                    className="label-caps text-muted-foreground"
                  >
                    Department
                  </label>
                  <Input
                    id="c-dept"
                    name="department"
                    placeholder="Computer Science"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label
                    htmlFor="c-designation"
                    className="label-caps text-muted-foreground"
                  >
                    Designation
                  </label>
                  <Input
                    id="c-designation"
                    name="designation"
                    placeholder="Assistant Professor"
                    className="mt-1.5"
                  />
                </div>
              </>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Portal ID and email must be unique across the portal.
            </p>
            <Button size="sm" type="submit" disabled={busy} className="cursor-pointer">
              {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
              Create account
            </Button>
          </div>
        </form>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex min-w-56 flex-1 items-center border border-border bg-card">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search ${role}s by name, portal ID, ${role === "student" ? "class, roll" : "department"}…`}
            className="w-full bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <span className="label-caps border border-border bg-secondary px-2 py-2 text-muted-foreground">
          {users.length} {role}s
        </span>
      </div>

      <Panel title={role === "student" ? "Student register" : "Faculty register"}>
        {users.length === 0 ? (
          <EmptyState>
            No {role}s match this search. Clear the box to see the full
            register.
          </EmptyState>
        ) : (
          <div className="-mx-3 overflow-x-auto sm:-mx-4">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr>
                  <th className={TH}>Portal ID</th>
                  <th className={TH}>Name</th>
                  <th className={TH}>
                    {role === "student" ? "Class" : "Department"}
                  </th>
                  <th className={TH}>
                    {role === "student" ? "Roll" : "Designation"}
                  </th>
                  <th className={TH}>Email</th>
                  <th className={TH}>
                    {role === "student" ? "Attendance" : "Subjects"}
                  </th>
                  <th className={TH}>Status</th>
                  <th className={TH}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <Fragment key={user.id}>
                    <tr>
                      <td className={`${TD} font-code`}>{user.portalId}</td>
                      <td className={`${TD} font-medium`}>{user.name}</td>
                      <td className={TD}>
                        {role === "student" ? user.className : user.department || "—"}
                      </td>
                      <td className={`${TD} font-code`}>
                        {role === "student" ? user.rollNo : user.designation || "—"}
                      </td>
                      <td className={`${TD} text-muted-foreground`}>{user.email}</td>
                      <td className={`${TD} tnum`}>
                        {role === "student"
                          ? `${user.attendance?.pct ?? 0}% (${user.attendance?.total ?? 0})`
                          : `${user.subjectCount} allotted`}
                      </td>
                      <td className={TD}>
                        <StatusTag tone={user.status === "active" ? "info" : "alert"}>
                          {user.status}
                        </StatusTag>
                      </td>
                      <td className={TD}>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(editingId === user.id ? null : user.id);
                              setResettingId(null);
                            }}
                            className="label-caps flex cursor-pointer items-center gap-1 border border-border px-2 py-1 hover:bg-secondary"
                          >
                            <Pencil className="size-3" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setResettingId(resettingId === user.id ? null : user.id);
                              setEditingId(null);
                              setNewPassword("");
                            }}
                            className="label-caps flex cursor-pointer items-center gap-1 border border-border px-2 py-1 hover:bg-secondary"
                          >
                            <RotateCcw className="size-3" /> Password
                          </button>
                        </div>
                      </td>
                    </tr>
                    {editingId === user.id && (
                      <tr>
                        <td colSpan={8} className={`${TD} bg-secondary/40`}>
                          <form
                            onSubmit={(event) => {
                              event.preventDefault();
                              void handleUpdate(user.id, event.currentTarget);
                            }}
                            className="grid gap-3 p-2 sm:grid-cols-2 lg:grid-cols-3"
                          >
                            <div>
                              <label
                                htmlFor={`e-name-${user.id}`}
                                className="label-caps text-muted-foreground"
                              >
                                Name
                              </label>
                              <Input
                                id={`e-name-${user.id}`}
                                name="name"
                                defaultValue={user.name}
                                className="mt-1.5"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor={`e-email-${user.id}`}
                                className="label-caps text-muted-foreground"
                              >
                                Email
                              </label>
                              <Input
                                id={`e-email-${user.id}`}
                                name="email"
                                defaultValue={user.email}
                                className="mt-1.5 font-code"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor={`e-phone-${user.id}`}
                                className="label-caps text-muted-foreground"
                              >
                                Phone
                              </label>
                              <Input
                                id={`e-phone-${user.id}`}
                                name="phone"
                                defaultValue={user.phone}
                                className="mt-1.5 font-code"
                              />
                            </div>
                            {role === "student" ? (
                              <>
                                <div>
                                  <label
                                    htmlFor={`e-class-${user.id}`}
                                    className="label-caps text-muted-foreground"
                                  >
                                    Class
                                  </label>
                                  <select
                                    id={`e-class-${user.id}`}
                                    name="className"
                                    defaultValue={user.className}
                                    className="mt-1.5 block w-full cursor-pointer border border-border bg-card px-2 py-2 text-sm outline-none"
                                  >
                                    {classes.map((name) => (
                                      <option key={name} value={name}>
                                        {name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label
                                    htmlFor={`e-roll-${user.id}`}
                                    className="label-caps text-muted-foreground"
                                  >
                                    Roll number
                                  </label>
                                  <Input
                                    id={`e-roll-${user.id}`}
                                    name="rollNo"
                                    defaultValue={user.rollNo}
                                    className="mt-1.5 font-code"
                                  />
                                </div>
                              </>
                            ) : (
                              <>
                                <div>
                                  <label
                                    htmlFor={`e-dept-${user.id}`}
                                    className="label-caps text-muted-foreground"
                                  >
                                    Department
                                  </label>
                                  <Input
                                    id={`e-dept-${user.id}`}
                                    name="department"
                                    defaultValue={user.department}
                                    className="mt-1.5"
                                  />
                                </div>
                                <div>
                                  <label
                                    htmlFor={`e-designation-${user.id}`}
                                    className="label-caps text-muted-foreground"
                                  >
                                    Designation
                                  </label>
                                  <Input
                                    id={`e-designation-${user.id}`}
                                    name="designation"
                                    defaultValue={user.designation}
                                    className="mt-1.5"
                                  />
                                </div>
                              </>
                            )}
                            <div>
                              <label
                                htmlFor={`e-status-${user.id}`}
                                className="label-caps text-muted-foreground"
                              >
                                Status
                              </label>
                              <select
                                id={`e-status-${user.id}`}
                                name="status"
                                defaultValue={user.status}
                                className="mt-1.5 block w-full cursor-pointer border border-border bg-card px-2 py-2 text-sm outline-none"
                              >
                                <option value="active">active</option>
                                <option value="inactive">inactive</option>
                              </select>
                            </div>
                            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
                              <Button
                                size="sm"
                                type="submit"
                                disabled={busy}
                                className="cursor-pointer"
                              >
                                {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                                Save record
                              </Button>
                              <Button
                                size="sm"
                                type="button"
                                variant="outline"
                                className="cursor-pointer"
                                onClick={() => setEditingId(null)}
                              >
                                Cancel
                              </Button>
                              <span className="text-xs text-muted-foreground">
                                Deactivating blocks sign-in immediately.
                              </span>
                            </div>
                          </form>
                        </td>
                      </tr>
                    )}
                    {resettingId === user.id && (
                      <tr>
                        <td colSpan={8} className={`${TD} bg-secondary/40`}>
                          <div className="flex flex-wrap items-end gap-3 p-2">
                            <div>
                              <label
                                htmlFor={`r-pass-${user.id}`}
                                className="label-caps text-muted-foreground"
                              >
                                New password for {user.portalId}
                              </label>
                              <Input
                                id={`r-pass-${user.id}`}
                                type="text"
                                value={newPassword}
                                onChange={(event) => setNewPassword(event.target.value)}
                                minLength={8}
                                placeholder="Min 8 characters"
                                className="mt-1.5 w-64 font-code"
                              />
                            </div>
                            <Button
                              size="sm"
                              onClick={() => void handleReset(user.id)}
                              disabled={busy || newPassword.length < 8}
                              className="cursor-pointer"
                            >
                              {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                              Reset password
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="cursor-pointer"
                              onClick={() => setResettingId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
