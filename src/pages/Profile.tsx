import { api } from "@/convex/_generated/api";
import {
  Loader,
  PageHeader,
  Panel,
  StatusTag,
} from "@/components/portal/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery } from "convex/react";
import { KeyRound, Lock } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

export default function Profile() {
  const me = useQuery(api.studentProfile.profileMe);
  const updateProfile = useMutation(api.studentProfile.updateProfile);
  const changePassword = useMutation(api.studentProfile.changePassword);

  const [saving, setSaving] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [changing, setChanging] = useState(false);

  if (!me) return <Loader />;

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSaving(true);
    try {
      await updateProfile({
        name: String(data.get("name") ?? ""),
        email: String(data.get("email") ?? ""),
        phone: String(data.get("phone") ?? ""),
        image: String(data.get("image") ?? ""),
      });
      toast.success("Profile updated", {
        description: "Your record has been saved.",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (next !== confirm) {
      toast.error("New passwords do not match");
      return;
    }
    if (next.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    setChanging(true);
    try {
      await changePassword({ current, next });
      setCurrent("");
      setNext("");
      setConfirm("");
      toast.success("Password changed", {
        description: "Use the new password at your next sign-in.",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change password");
    } finally {
      setChanging(false);
    }
  };

  const locked: [string, string][] = [
    ["Portal ID", me.profile.portalId],
    ["Roll number", me.profile.rollNo],
    ["Class", me.profile.className],
    ["Department", me.profile.department],
    ["Role", me.profile.role ?? "student"],
    ["Account status", me.profile.status],
  ];

  return (
    <div>
      <PageHeader
        title="Profile & security"
        description="Your contact details are yours to edit. Registration details are held by the Office of Academics."
        action={<span className="stamp">Student record</span>}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Personal details" meta="Editable">
          <form id="profile-form" onSubmit={handleSave} className="grid gap-3">
            <div>
              <label htmlFor="name" className="label-caps text-muted-foreground">
                Full name
              </label>
              <Input
                id="name"
                name="name"
                key={`name-${me.profile.name}`}
                defaultValue={me.profile.name}
                className="mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="email" className="label-caps text-muted-foreground">
                College email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                key={`email-${me.profile.email}`}
                defaultValue={me.profile.email}
                className="mt-1.5 font-code"
              />
            </div>
            <div>
              <label htmlFor="phone" className="label-caps text-muted-foreground">
                Phone
              </label>
              <Input
                id="phone"
                name="phone"
                key={`phone-${me.profile.phone}`}
                defaultValue={me.profile.phone}
                className="mt-1.5 font-code"
              />
            </div>
            <div>
              <label htmlFor="photo" className="label-caps text-muted-foreground">
                Profile photo URL (optional)
              </label>
              <Input
                id="photo"
                name="image"
                key={`photo-${me.profile.image ?? ""}`}
                defaultValue={me.profile.image ?? ""}
                placeholder="https://…"
                className="mt-1.5 font-code"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-muted-foreground">
                Saved against your portal record.
              </p>
              <Button
                size="sm"
                type="submit"
                form="profile-form"
                disabled={saving}
                className="cursor-pointer"
              >
                Save changes
              </Button>
            </div>
          </form>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title="Registration" meta="Registrar-controlled">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              {locked.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between border-b border-border pb-2">
                  <dt className="label-caps text-muted-foreground">{label}</dt>
                  <dd className="text-sm font-medium">{value || "—"}</dd>
                </div>
              ))}
            </dl>
            <p className="label-caps mt-3 flex items-center gap-1.5 text-muted-foreground">
              <Lock className="size-3" /> Corrections are made by the office
            </p>
            {me.classInfo && (
              <p className="mt-3 text-sm text-muted-foreground">
                Class mentor: <strong>{me.classInfo.mentor}</strong> · Room{" "}
                {me.classInfo.room} · {me.classInfo.term} · AY{" "}
                {me.classInfo.academicYear}
              </p>
            )}
          </Panel>

          <Panel title="Change password" meta="PBKDF2 · salted">
            <div className="grid gap-3">
              <div>
                <label htmlFor="current" className="label-caps text-muted-foreground">
                  Current password
                </label>
                <Input
                  id="current"
                  type="password"
                  value={current}
                  onChange={(event) => setCurrent(event.target.value)}
                  className="mt-1.5"
                  autoComplete="current-password"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="next" className="label-caps text-muted-foreground">
                    New password
                  </label>
                  <Input
                    id="next"
                    type="password"
                    value={next}
                    onChange={(event) => setNext(event.target.value)}
                    className="mt-1.5"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label htmlFor="confirm" className="label-caps text-muted-foreground">
                    Repeat new password
                  </label>
                  <Input
                    id="confirm"
                    type="password"
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    className="mt-1.5"
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="label-caps flex items-center gap-1.5 text-muted-foreground">
                  <KeyRound className="size-3" /> Minimum 8 characters
                </span>
                <Button
                  size="sm"
                  onClick={handleChangePassword}
                  disabled={changing || !current || !next}
                  className="cursor-pointer"
                >
                  Change password
                </Button>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <div className="mt-4">
        <Panel title="Account" meta="Session">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <StatusTag tone="info">Signed in</StatusTag>
              <span className="text-sm text-muted-foreground">
                Sessions stay active on this device until you sign out.
              </span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
