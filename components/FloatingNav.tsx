"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
  { href: "/assess", label: "New assessment", icon: PlusIcon },
  { href: "/settings", label: "Settings", icon: SlidersIcon },
];

/**
 * The app's primary navigation: a floating pill centered at the bottom of the
 * screen. Collapsed it shows just the three section icons; on hover or keyboard
 * focus the whole pill fluidly expands to reveal each label, then collapses
 * again. The reveal animates `grid-template-columns` from 0fr → 1fr so each
 * label's auto width is interpolated smoothly with no overshoot.
 *
 * Replaces the old 240px sidebar so each section can use the full screen.
 */
export function FloatingNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 print:hidden"
    >
      <div className="group flex items-center gap-1 rounded-full border border-border bg-surface/90 p-1.5 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.35)] backdrop-blur-md">
        {/* Brand mark — always visible, not part of the hover expansion. */}
        <span className="flex items-center pr-0.5 pl-2 text-fg">
          <Logo className="size-5 shrink-0" />
        </span>
        <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden="true" />
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center rounded-full px-3 py-2 transition-colors duration-150 outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-surface-2 text-fg"
                  : "text-muted hover:text-fg",
              )}
            >
              <Icon className="size-[18px] shrink-0" aria-hidden="true" />
              {/* Fluid label reveal: 0fr → 1fr interpolates the auto width. */}
              <span
                className={cn(
                  "grid grid-cols-[0fr] transition-[grid-template-columns] duration-300 ease-out",
                  "group-hover:grid-cols-[1fr] group-focus-within:grid-cols-[1fr]",
                  "motion-reduce:grid-cols-[1fr] motion-reduce:transition-none",
                )}
              >
                <span className="min-w-0 overflow-hidden">
                  <span
                    className={cn(
                      "block whitespace-nowrap pl-2 text-sm font-medium opacity-0 transition-opacity duration-200",
                      "group-hover:opacity-100 group-focus-within:opacity-100",
                      "motion-reduce:opacity-100",
                    )}
                  >
                    {item.label}
                  </span>
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// --- Minimal line icons (currentColor, no fill). Nav-pill only; status still uses dots. ---

type IconProps = { className?: string; "aria-hidden"?: boolean | "true" | "false" };

function DashboardIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function PlusIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function SlidersIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
    </svg>
  );
}
