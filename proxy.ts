import { type NextRequest } from "next/server";
import { getAuth } from "@/lib/auth/server";

/**
 * Full auth gate (Next.js 16 "proxy" convention). Neon Auth's middleware
 * redirects unauthenticated users to the sign-in page and refreshes sessions.
 *
 * The matcher lists only the protected page areas — the marketing landing (`/`),
 * the auth screens (`/sign-in`, `/sign-up`), and `/api/*` are intentionally not
 * matched. API routes self-enforce via getCurrentUser() and return 401.
 *
 * getAuth() is lazy, so the build never needs the runtime cookie secret.
 */
export default function proxy(req: NextRequest) {
  return getAuth().middleware({ loginUrl: "/sign-in" })(req);
}

export const config = {
  matcher: [
    "/assess/:path*",
    "/dashboard/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
  ],
};
