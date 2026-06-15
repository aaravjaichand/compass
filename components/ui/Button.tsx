import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:opacity-90",
  secondary:
    "border border-border-strong text-fg hover:bg-surface-2",
  ghost: "text-muted hover:bg-surface-2 hover:text-fg",
  danger: "bg-danger text-white hover:opacity-90",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-md px-3.5 text-sm font-medium",
        "transition-[background-color,opacity,color] duration-150 outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        !props.disabled && "cursor-pointer",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
