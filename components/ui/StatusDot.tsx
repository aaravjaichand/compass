import { cn } from "@/lib/cn";

export type Tone = "success" | "warning" | "danger" | "muted";

const toneColor: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  muted: "bg-subtle",
};

export function StatusDot({
  tone = "muted",
  label,
  className,
}: {
  tone?: Tone;
  label?: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn("inline-block size-2 shrink-0 rounded-full", toneColor[tone])}
        aria-hidden
      />
      {label ? <span className="text-sm text-muted">{label}</span> : null}
    </span>
  );
}
