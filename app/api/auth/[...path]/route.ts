import { getAuth } from "@/lib/auth/server";

// Catch-all for Neon Auth: sign-up, sign-in, email verification (OTP),
// password reset, session, sign-out. Public (not in the proxy gate matcher).
//
// The handler is created per request (via the lazily-built auth instance) so
// the build never needs the runtime cookie secret.
type Ctx = { params: Promise<{ path: string[] }> };

export function GET(req: Request, ctx: Ctx) {
  return getAuth().handler().GET(req, ctx);
}

export function POST(req: Request, ctx: Ctx) {
  return getAuth().handler().POST(req, ctx);
}
