"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/assess", label: "New assessment" },
  { href: "/settings", label: "Settings" },
];

export function AppSidebar({ email }: { email: string }) {
  const pathname = usePathname();

  async function signOut() {
    try {
      await authClient.signOut();
    } catch {
      /* fall through to redirect regardless */
    }
    window.location.assign("/");
  }

  return (
    <aside className="sticky top-0 flex h-screen w-[240px] shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex h-14 items-center border-b border-border px-5">
        <Link href="/dashboard" className="text-[15px] font-semibold tracking-tight text-fg">
          Compass
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150",
                active
                  ? "bg-surface-2 text-fg"
                  : "text-muted hover:bg-surface-2 hover:text-fg",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <p className="truncate px-3 py-1 font-mono text-xs text-subtle" title={email}>
          {email}
        </p>
        <button
          type="button"
          onClick={signOut}
          className="mt-1 w-full rounded-md px-3 py-2 text-left text-sm font-medium text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
