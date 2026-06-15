"use client";

import { useEffect } from "react";
import { StatusDot, type Tone } from "@/components/ui/StatusDot";

export function Toast({
  message,
  tone = "success",
  onDismiss,
}: {
  message: string;
  tone?: Tone;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="fade-up fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-fg">
        <StatusDot tone={tone} />
        <span>{message}</span>
      </div>
    </div>
  );
}
