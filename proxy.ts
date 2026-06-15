import { NextResponse, type NextRequest } from "next/server";
import { stackServerApp } from "@/stack/server";

/**
 * Full auth gate (Next.js 16 "proxy" convention). Only the marketing landing
 * (`/`) and the Neon Auth UI (`/handler/*`) are public; everything else
 * requires a signed-in user.
 *
 * This is the redirect layer for UX. Real enforcement is defense-in-depth:
 * gated pages/layouts also call getUser({ or: "redirect" }) and API routes
 * self-check getUser() before touching data.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/" || pathname.startsWith("/handler")) {
    return NextResponse.next();
  }

  const user = await stackServerApp.getUser();
  if (!user) {
    if (pathname.startsWith("/api/")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const url = new URL("/handler/sign-in", req.url);
    url.searchParams.set("after_auth_return_to", pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals and static asset files.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf)$).*)",
  ],
};
