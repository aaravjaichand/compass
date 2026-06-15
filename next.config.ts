import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Agent SDK ships a native binary and spawns a subprocess — keep it out
  // of the bundler so it's loaded from node_modules at runtime.
  serverExternalPackages: ["@anthropic-ai/claude-agent-sdk"],
};

export default nextConfig;
