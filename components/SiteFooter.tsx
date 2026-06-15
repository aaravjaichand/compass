import { StatusDot } from "@/components/ui/StatusDot";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border print:hidden">
      <div className="mx-auto max-w-[1140px] px-6 py-8 text-sm text-muted">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <StatusDot tone="danger" />
          <span>
            In an emergency, call <span className="font-mono text-fg">911</span>.
            For emotional crisis support, call or text{" "}
            <span className="font-mono text-fg">988</span> any time.
          </span>
        </p>
        <p className="mt-3 max-w-2xl text-subtle">
          Compass provides informational guidance only. It is not an official
          benefits determination and never submits anything on your behalf.
          Always confirm with the relevant office.
        </p>
      </div>
    </footer>
  );
}
