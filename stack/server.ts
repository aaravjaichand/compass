import { StackServerApp } from "@stackframe/stack";

/**
 * Neon Auth (Stack Auth) server app — the single source of session truth.
 * Reads NEXT_PUBLIC_STACK_PROJECT_ID, NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY,
 * and STACK_SECRET_SERVER_KEY from the environment automatically.
 *
 * Auth is configured to email+password only with email verification in the
 * Neon/Stack dashboard (OAuth providers disabled there, not in code).
 *
 * Not marked `server-only` because it is also imported by `middleware.ts`; it
 * still never reaches the client (it depends on the secret server key).
 */
export const stackServerApp = new StackServerApp({
  tokenStore: "nextjs-cookie",
  urls: {
    afterSignIn: "/dashboard",
    afterSignUp: "/onboarding",
    afterSignOut: "/",
  },
});
