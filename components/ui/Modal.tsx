"use client";

import { useEffect } from "react";
import { Card } from "@/components/ui/Card";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <Card className="fade-up relative z-10 w-full max-w-md">
        {title ? <h2 className="text-lg tracking-tight">{title}</h2> : null}
        <div className={title ? "mt-3" : undefined}>{children}</div>
      </Card>
    </div>
  );
}
