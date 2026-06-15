import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full min-h-9 rounded-md border border-border bg-surface px-3 py-2",
        "text-sm text-fg placeholder:text-subtle",
        "outline-none transition-shadow duration-150",
        "focus-visible:ring-2 focus-visible:ring-ring",
        "resize-y",
        className,
      )}
      {...props}
    />
  );
}
