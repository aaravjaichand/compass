import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 h-14 border-b border-border bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1140px] items-center justify-between px-6">
        <Link
          href="/"
          className="text-[15px] font-semibold tracking-tight text-fg"
        >
          Compass
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/assess"
            className="rounded-md px-3 py-1.5 font-medium text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg"
          >
            Start
          </Link>
        </nav>
      </div>
    </header>
  );
}
