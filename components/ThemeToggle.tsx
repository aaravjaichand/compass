"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

type Theme = "light" | "dark" | "system";
const OPTIONS: Theme[] = ["light", "dark", "system"];

function apply(theme: Theme) {
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}

export function ThemeToggle({ initial = "system" }: { initial?: Theme }) {
  // The no-flash script in the root layout already applied the saved theme
  // before paint; seed the control from localStorage (client) or the profile.
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return initial;
    return (localStorage.getItem("compass-theme") as Theme | null) ?? initial;
  });

  function choose(t: Theme) {
    setTheme(t);
    localStorage.setItem("compass-theme", t);
    apply(t);
    // Mirror across devices (best-effort).
    fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: t }),
    }).catch(() => {});
  }

  return (
    <div className="inline-flex rounded-md border border-border p-0.5">
      {OPTIONS.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => choose(o)}
          className={cn(
            "rounded px-3 py-1 text-sm capitalize transition-colors duration-150",
            theme === o ? "bg-surface-2 text-fg" : "text-muted hover:text-fg",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
