import { StackHandler } from "@stackframe/stack";
import { stackServerApp } from "@/stack/server";

/**
 * Catch-all route for Neon Auth: sign-in, sign-up, email verification,
 * password reset, sign-out, account settings. Public (excluded from the gate).
 */
export default function Handler(props: {
  params: Promise<{ stack?: string[] }>;
  searchParams: Promise<Record<string, string>>;
}) {
  return <StackHandler fullPage app={stackServerApp} routeProps={props} />;
}
