// No-op stand-in for the `server-only` import marker under Vitest.
// `server-only` is resolved by Next's bundler at build time; in unit tests we
// alias it here so server-only modules (e.g. lib/crypto.ts) can be imported.
export {};
