import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Agent SDK ships a native binary and spawns a subprocess — keep it out
  // of the bundler so it's loaded from node_modules at runtime. @vercel/sandbox
  // is server-only and likewise should not be bundled.
  serverExternalPackages: ["@anthropic-ai/claude-agent-sdk", "@vercel/sandbox"],
  // Ship files read from disk at request time with their serverless functions:
  // the bundled application PDFs, and the bundled sandbox agent runner.
  outputFileTracingIncludes: {
    "/api/packet/pdf": ["./lib/packet/forms/**"],
    "/api/agent": ["./lib/agent/runner/dist/**"],
  },
};

export default nextConfig;
