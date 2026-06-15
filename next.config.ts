import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Agent SDK ships a native binary and spawns a subprocess — keep it out
  // of the bundler so it's loaded from node_modules at runtime.
  serverExternalPackages: ["@anthropic-ai/claude-agent-sdk"],
  // Ensure the bundled application PDFs ship with the packet route in traced
  // (serverless) builds — they're read from disk at request time.
  outputFileTracingIncludes: {
    "/api/packet/pdf": ["./lib/packet/forms/**"],
  },
};

export default nextConfig;
