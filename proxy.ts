import { auth } from "@/lib/auth/server";

/**
 * Full auth gate (Next.js 16 "proxy" convention). Neon Auth's middleware
 * redirects unauthenticated users to the sign-in page and refreshes sessions.
 *
 * The matcher lists only the protected page areas — the marketing landing (`/`),
 * the auth screens (`/sign-in`, `/sign-up`), and `/api/*` are intentionally not
 * matched. API routes self-enforce via getCurrentUser() and return 401 (so a
 * fetch gets a clean 401, not an HTML redirect).
 */
export default auth.middleware({ loginUrl: "/sign-in" });

export const config = {
  matcher: [
    "/assess/:path*",
    "/dashboard/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
  ],
};
