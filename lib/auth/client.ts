"use client";

import { createAuthClient } from "@neondatabase/auth/next";

/**
 * Client auth instance. Talks to our own /api/auth/[...path] route, which proxies
 * to Neon Auth — so no base URL or key is needed on the client.
 */
export const authClient = createAuthClient();
