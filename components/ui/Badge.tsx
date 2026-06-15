import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border border-border bg-surface-2 px-2 py-0.5",
        "font-mono text-xs tracking-tight text-muted",
        className,
      )}
      {...props}
    />
  );
}
