import { auth } from "@/lib/auth/server";

// Catch-all for Neon Auth: sign-up, sign-in, email verification (OTP),
// password reset, session, sign-out. Public (not in the proxy gate matcher).
export const { GET, POST } = auth.handler();
