import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="h-14 border-b border-border">
        <div className="mx-auto flex h-14 max-w-[1140px] items-center px-6">
          <Link
            href="/"
            className="text-[15px] font-semibold tracking-tight text-fg"
          >
            Compass
          </Link>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
      <SiteFooter />
    </div>
  );
}
