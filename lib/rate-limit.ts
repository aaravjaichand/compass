/**
 * Tiny in-memory sliding-window rate limiter. Good enough to stop abuse from
 * burning the free LLM quota during the demo; swap for Upstash/Redis in prod
 * (this state is per-instance and resets on cold start).
 */
const hits = new Map<string, number[]>();

export function rateLimit(
  key: string,
  limit = 12,
  windowMs = 60_000,
): { ok: boolean; remaining: number } {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  return { ok: recent.length <= limit, remaining: Math.max(0, limit - recent.length) };
}
