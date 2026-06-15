"use client";

import { cn } from "@/lib/cn";

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex gap-1 border-b border-border">
      {tabs.map((t) => {
        const on = active === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={cn(
              "relative px-3 py-2 text-sm font-medium transition-colors duration-150",
              on ? "text-fg" : "text-muted hover:text-fg",
            )}
          >
            {t.label}
            {on ? (
              <span className="absolute inset-x-0 -bottom-px h-px bg-fg" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
