import { api } from "@/convex/_generated/api";
import {
  formatDate,
  Loader,
  PageHeader,
  Panel,
  StatusTag,
} from "@/components/portal/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Settings } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

export default function AdminSettings() {
  const settings = useQuery(api.admin.settingsGet);
  const updateSettings = useMutation(api.admin.updateSettings);
  const [busy, setBusy] = useState(false);

  if (settings === undefined) return <Loader />;

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const academicYear = String(data.get("academicYear") ?? "").trim();
    const term = String(data.get("term") ?? "").trim();
    const contact = String(data.get("contact") ?? "").trim();
    const minAttendance = Number(String(data.get("minAttendance") ?? ""));

    if (!academicYear) return toast.error("Enter an academic year like 2026-27");
    if (!term) return toast.error("Enter a term");
    if (!Number.isFinite(minAttendance) || minAttendance < 0 || minAttendance > 100) {
      return toast.error("Minimum attendance must be 0-100%");
    }
    if (!contact) return toast.error("Enter a contact line");

    setBusy(true);
    try {
      await updateSettings({ academicYear, term, minAttendance, contact });
      toast.success("Settings saved", {
        description: "The portal record now shows the updated term details.",
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save settings",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="System settings"
        description="Portal-wide academic configuration: term identity, attendance floor and the office contact line shown to every desk."
        action={
          <StatusTag tone={settings ? "info" : "warn"}>
            {settings ? "Configured" : "Not yet configured"}
          </StatusTag>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Panel title="Portal record" meta="Saved by the Office of Academics">
          <form onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="s-year" className="label-caps text-muted-foreground">
                Academic year
              </label>
              <Input
                id="s-year"
                name="academicYear"
                key={`year-${settings?.updatedAt ?? "new"}`}
                defaultValue={settings?.academicYear ?? ""}
                placeholder="2026-27"
                required
                className="mt-1.5 font-code"
              />
            </div>
            <div>
              <label htmlFor="s-term" className="label-caps text-muted-foreground">
                Current term
              </label>
              <Input
                id="s-term"
                name="term"
                key={`term-${settings?.updatedAt ?? "new"}`}
                defaultValue={settings?.term ?? ""}
                placeholder="Term I"
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <label
                htmlFor="s-min"
                className="label-caps text-muted-foreground"
              >
                Minimum attendance (%)
              </label>
              <Input
                id="s-min"
                name="minAttendance"
                type="number"
                min={0}
                max={100}
                key={`min-${settings?.updatedAt ?? "new"}`}
                defaultValue={settings?.minAttendance ?? 75}
                required
                className="mt-1.5 font-code"
              />
              <p className="label-caps mt-1 text-muted-foreground">
                Attendance below this figure is flagged on student desks
              </p>
            </div>
            <div>
              <label htmlFor="s-contact" className="label-caps text-muted-foreground">
                Office contact
              </label>
              <Textarea
                id="s-contact"
                name="contact"
                key={`contact-${settings?.updatedAt ?? "new"}`}
                defaultValue={settings?.contact ?? ""}
                rows={2}
                maxLength={160}
                placeholder="Office of Academics · M-Building · academics@vics.ac.in"
                required
                className="mt-1.5"
              />
            </div>
            <div className="flex items-center justify-between sm:col-span-2">
              <p className="text-xs text-muted-foreground">
                {settings?.updatedBy && settings?.updatedAt
                  ? `Last saved by ${settings.updatedBy} on ${formatDate(settings.updatedAt)}`
                  : "No settings have been saved yet."}
              </p>
              <Button size="sm" type="submit" disabled={busy} className="cursor-pointer">
                {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                Save settings
              </Button>
            </div>
          </form>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title="What these settings drive">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-primary">▪</span>
                Academic year and term head every desk's masthead and class
                record.
              </li>
              <li className="flex gap-2">
                <span className="text-primary">▪</span>
                The attendance floor sets the shortfall figures students see in
                their attendance register.
              </li>
              <li className="flex gap-2">
                <span className="text-primary">▪</span>
                The contact line is the single source of truth shown to students
                for office enquiries.
              </li>
            </ul>
          </Panel>

          <Panel title="Deployment">
            <div className="flex items-start gap-3">
              <Settings className="mt-0.5 size-4 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">ClassCast v1.0</p>
                <p className="mt-1">
                  Records are held on the Convex academic database. Role gates
                  run on the server for every query and mutation — this desk can
                  only be opened by an administrator session.
                </p>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
