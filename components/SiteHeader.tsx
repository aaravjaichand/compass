import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/80 backdrop-blur print:hidden">
      <div className="mx-auto flex h-16 max-w-[1140px] items-center justify-between px-6">
        <Link
          href="/"
          aria-label="Compass home"
          className="group flex items-center gap-2.5 text-fg"
        >
          {/* The north arrow nudges up on hover — a small nod to the compass. */}
          <Logo className="size-6 shrink-0 transition-transform duration-300 ease-out group-hover:-translate-y-0.5 motion-reduce:transition-none" />
          <span className="text-[15px] font-semibold tracking-tight">
            Compass
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="mr-1 hidden font-mono text-xs tracking-tight text-subtle sm:inline">
            Hudson + Bergen, NJ
          </span>
          <Link
            href="/sign-in"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg"
          >
            Sign in
          </Link>
          <Link href="/try">
            <Button>Start</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
