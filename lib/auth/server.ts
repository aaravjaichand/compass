import { createNeonAuth } from "@neondatabase/auth/next/server";

/**
 * Neon Auth (managed, Better Auth) server instance — the single source of
 * session truth. Email+password with email verification + the shared email
 * sender are configured in the Neon console (Auth → Configuration), not here.
 *
 * Created LAZILY (and memoized): createNeonAuth validates cookies.secret at
 * construction, so eager creation would make `next build` require the runtime
 * secret. Deferring it keeps the build free of runtime config; the secret is
 * only needed when a request actually runs.
 *
 * Env (Neon console → Auth → Configuration → Project Info):
 *   NEON_AUTH_BASE_URL      — the "Auth URL"
 *   NEON_AUTH_COOKIE_SECRET — 32+ char secret (openssl rand -base64 32)
 */
type NeonAuth = ReturnType<typeof createNeonAuth>;

let cached: NeonAuth | null = null;

export function getAuth(): NeonAuth {
  if (!cached) {
    cached = createNeonAuth({
      baseUrl: process.env.NEON_AUTH_BASE_URL!,
      cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
    });
  }
  return cached;
}

export type AuthUser = NonNullable<
  Awaited<ReturnType<NeonAuth["getSession"]>>["data"]
>["user"];

/** Current signed-in user (server-side), or null. Use in route handlers / RSC. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data } = await getAuth().getSession();
  return data?.user ?? null;
}
