"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { Toast } from "@/components/ui/Toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MemorySettings } from "@/components/MemorySettings";
import type { Tone } from "@/components/ui/StatusDot";

type Theme = "light" | "dark" | "system";
type ToastState = { message: string; tone: Tone } | null;

// Profile fields exposed in settings (canonical ids from lib/packet/fields.ts).
const PROFILE_FIELDS: { id: string; label: string }[] = [
  { id: "applicant_full_name", label: "Full legal name" },
  { id: "applicant_dob", label: "Date of birth" },
  { id: "preferred_language", label: "Preferred language" },
  { id: "home_address", label: "Street address" },
  { id: "home_city", label: "City" },
  { id: "home_zip", label: "ZIP code" },
  { id: "phone", label: "Phone number" },
  { id: "email", label: "Email (for applications)" },
];

const TABS = [
  { key: "profile", label: "Profile" },
  { key: "memory", label: "Memory" },
  { key: "account", label: "Account" },
  { key: "data", label: "Data" },
  { key: "appearance", label: "Appearance" },
];

export function SettingsClient({
  email,
  initialProfile,
  initialTheme,
  initialMemoryEnabled,
}: {
  email: string;
  initialProfile: Record<string, string>;
  initialTheme: Theme;
  initialMemoryEnabled: boolean;
}) {
  const [tab, setTab] = useState("profile");
  const [toast, setToast] = useState<ToastState>(null);

  return (
    <div className="space-y-6">
      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "profile" ? (
        <ProfileSection initial={initialProfile} setToast={setToast} />
      ) : null}
      {tab === "memory" ? (
        <MemorySettings
          initialEnabled={initialMemoryEnabled}
          setToast={setToast}
        />
      ) : null}
      {tab === "account" ? (
        <AccountSection email={email} setToast={setToast} />
      ) : null}
      {tab === "data" ? <DataSection setToast={setToast} /> : null}
      {tab === "appearance" ? (
        <Card className="space-y-3">
          <h2 className="text-base font-medium">Theme</h2>
          <p className="text-sm text-muted">
            Used on this device, and remembered for your account.
          </p>
          <ThemeToggle initial={initialTheme} />
        </Card>
      ) : null}

      {toast ? (
        <Toast
          message={toast.message}
          tone={toast.tone}
          onDismiss={() => setToast(null)}
        />
      ) : null}
    </div>
  );
}

function Labeled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="font-mono text-xs uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function ProfileSection({
  initial,
  setToast,
}: {
  initial: Record<string, string>;
  setToast: (t: ToastState) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: values }),
      });
      if (!res.ok) throw new Error();
      setToast({ message: "Profile saved.", tone: "success" });
    } catch {
      setToast({ message: "Couldn't save your profile.", tone: "danger" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-base font-medium">Your details</h2>
        <p className="mt-1 text-sm text-muted">
          Stored encrypted and used to pre-fill your applications. Never sent to
          the AI.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {PROFILE_FIELDS.map((f) => (
          <Labeled key={f.id} label={f.label}>
            <Input
              value={values[f.id] ?? ""}
              onChange={(e) =>
                setValues((v) => ({ ...v, [f.id]: e.target.value }))
              }
            />
          </Labeled>
        ))}
      </div>
      <Button onClick={save} disabled={busy}>
        {busy ? "Saving…" : "Save profile"}
      </Button>
    </Card>
  );
}

function AccountSection({
  email,
  setToast,
}: {
  email: string;
  setToast: (t: ToastState) => void;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);

  async function signOut() {
    try {
      await authClient.signOut();
    } catch {
      /* fall through to redirect regardless */
    }
    window.location.assign("/");
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword: current,
        newPassword: next,
      });
      if (error) throw new Error(error.message || "");
      setCurrent("");
      setNext("");
      setToast({ message: "Password updated.", tone: "success" });
    } catch {
      setToast({
        message: "Couldn't change password. Check your current one.",
        tone: "danger",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <h2 className="text-base font-medium">Email</h2>
          <p className="font-mono text-sm text-muted">{email}</p>
        </div>
        <Button variant="secondary" onClick={signOut}>
          Sign out
        </Button>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-base font-medium">Change password</h2>
        <form onSubmit={changePassword} className="space-y-4">
          <Labeled label="Current password">
            <Input
              type="password"
              autoComplete="current-password"
              required
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </Labeled>
          <Labeled label="New password">
            <Input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </Labeled>
          <Button type="submit" disabled={busy}>
            {busy ? "Updating…" : "Update password"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

function DataSection({ setToast }: { setToast: (t: ToastState) => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function deleteAccount() {
    setBusy(true);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) throw new Error();
      window.location.assign("/");
    } catch {
      setBusy(false);
      setConfirmOpen(false);
      setToast({ message: "Couldn't delete your account.", tone: "danger" });
    }
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-3">
        <h2 className="text-base font-medium">Export your data</h2>
        <p className="text-sm text-muted">
          Download everything Compass stores about you as a JSON file.
        </p>
        <a href="/api/export">
          <Button variant="secondary">Export my data</Button>
        </a>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-base font-medium text-danger">Delete account</h2>
        <p className="text-sm text-muted">
          Permanently removes your account and every plan, packet, and message —
          here and from your sign-in. This cannot be undone.
        </p>
        <Button variant="danger" onClick={() => setConfirmOpen(true)}>
          Delete my account
        </Button>
      </Card>

      <Modal
        open={confirmOpen}
        onClose={() => (busy ? null : setConfirmOpen(false))}
        title="Delete your account?"
      >
        <p className="text-sm text-muted">
          This erases all of your data and your sign-in. There is no way to
          recover it.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setConfirmOpen(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button variant="danger" onClick={deleteAccount} disabled={busy}>
            {busy ? "Deleting…" : "Delete everything"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
