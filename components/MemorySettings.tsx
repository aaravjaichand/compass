"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Toggle } from "@/components/ui/Toggle";
import type { Tone } from "@/components/ui/StatusDot";

type StoredMemory = {
  id: string;
  label: string;
  content: string;
  sensitive: boolean;
};

type ToastState = { message: string; tone: Tone } | null;

/**
 * Settings → Memory. The user-facing control surface for long-term memory: the
 * on/off switch, plus a plain list of everything Compass remembers with a way to
 * forget any item or all of it. This visibility IS the responsible-AI safeguard —
 * memory is never a black box.
 */
export function MemorySettings({
  initialEnabled,
  setToast,
}: {
  initialEnabled: boolean;
  setToast: (t: ToastState) => void;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [savingToggle, setSavingToggle] = useState(false);
  const [memories, setMemories] = useState<StoredMemory[] | null>(null);
  const [clearOpen, setClearOpen] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/memory")
      .then((r) => (r.ok ? r.json() : { memories: [] }))
      .then((d) => active && setMemories(d.memories ?? []))
      .catch(() => active && setMemories([]));
    return () => {
      active = false;
    };
  }, []);

  async function toggle(next: boolean) {
    setEnabled(next);
    setSavingToggle(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memoryEnabled: next }),
      });
      if (!res.ok) throw new Error();
      setToast({
        message: next ? "Memory turned on." : "Memory turned off.",
        tone: "success",
      });
    } catch {
      setEnabled(!next);
      setToast({ message: "Couldn't update memory.", tone: "danger" });
    } finally {
      setSavingToggle(false);
    }
  }

  async function forget(id: string) {
    const prev = memories;
    setMemories((m) => m?.filter((x) => x.id !== id) ?? null);
    try {
      const res = await fetch(`/api/memory/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setMemories(prev ?? null);
      setToast({ message: "Couldn't forget that.", tone: "danger" });
    }
  }

  async function clearAll() {
    try {
      const res = await fetch("/api/memory", { method: "DELETE" });
      if (!res.ok) throw new Error();
      setMemories([]);
      setClearOpen(false);
      setToast({ message: "Compass forgot everything.", tone: "success" });
    } catch {
      setToast({ message: "Couldn't clear memory.", tone: "danger" });
    }
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-medium">Long-term memory</h2>
            <p className="mt-1 text-sm text-muted">
              When on, Compass remembers a few details across sessions — your
              situation, household, and the programs you&rsquo;re pursuing — so
              you don&rsquo;t start over each time. It never stores your name,
              date of birth, or any ID numbers, and it never decides eligibility.
            </p>
          </div>
          <Toggle
            checked={enabled}
            onChange={toggle}
            disabled={savingToggle}
            label="Long-term memory"
          />
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium">What Compass remembers</h2>
          {memories && memories.length > 0 ? (
            <Button variant="ghost" onClick={() => setClearOpen(true)}>
              Forget everything
            </Button>
          ) : null}
        </div>

        {memories === null ? (
          <p className="text-sm text-subtle">Loading…</p>
        ) : memories.length === 0 ? (
          <p className="text-sm text-muted">
            {enabled
              ? "Nothing yet. Compass will note a few details after your next assessment."
              : "Turn on memory above to let Compass remember across sessions."}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {memories.map((m) => (
              <li
                key={m.id}
                className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs uppercase tracking-wide text-muted">
                      {m.label}
                    </span>
                    {m.sensitive ? (
                      <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-subtle">
                        sensitive
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-sm text-fg">{m.content}</p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => forget(m.id)}
                  className="shrink-0"
                >
                  Forget
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        title="Forget everything?"
      >
        <p className="text-sm text-muted">
          Compass will erase everything it remembers about you. Your saved plans
          and packets are not affected. This can&rsquo;t be undone.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setClearOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={clearAll}>
            Forget everything
          </Button>
        </div>
      </Modal>
    </div>
  );
}
