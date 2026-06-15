"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/Select";

const OPTIONS = [
  { value: "not_started", label: "Not started" },
  { value: "gathering_docs", label: "Gathering documents" },
  { value: "submitted", label: "Submitted" },
  { value: "approved", label: "Approved" },
  { value: "denied", label: "Denied" },
];

export function ProgramStatusControl({
  planId,
  programId,
  current,
}: {
  planId: string;
  programId: string;
  current: string;
}) {
  const [value, setValue] = useState(current);
  const [pending, start] = useTransition();
  const router = useRouter();

  function update(next: string) {
    setValue(next);
    fetch("/api/program-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId, programId, status: next }),
    })
      .then(() => start(() => router.refresh()))
      .catch(() => {});
  }

  return (
    <Select
      aria-label="Application status"
      value={value}
      onChange={(e) => update(e.target.value)}
      disabled={pending}
      className="w-auto"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}
