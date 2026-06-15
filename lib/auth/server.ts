import { createNeonAuth } from "@neondatabase/auth/next/server";

/**
 * Neon Auth (managed, Better Auth) server instance — the single source of
 * session truth. Email+password with email verification + the shared email
 * sender are configured in the Neon console (Auth → Configuration), not here.
 *
 * Env (Neon console → Auth → Configuration → Project Info):
 *   NEON_AUTH_BASE_URL      — the "Auth URL"
 *   NEON_AUTH_COOKIE_SECRET — 32+ char secret (openssl rand -base64 32)
 */
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
});

export type AuthUser = NonNullable<
  Awaited<ReturnType<typeof auth.getSession>>["data"]
>["user"];

/** Current signed-in user (server-side), or null. Use in route handlers / RSC. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data } = await auth.getSession();
  return data?.user ?? null;
}
