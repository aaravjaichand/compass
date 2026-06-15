import { build } from "esbuild";

// Bundle the sandbox runner into a single self-contained .mjs. The Agent SDK
// (native binary) and zod are installed inside the sandbox, so they stay
// external; everything else (compass tools + the bundled directory) is inlined.
await build({
  entryPoints: ["lib/agent/runner/entry.ts"],
  outfile: "lib/agent/runner/dist/entry.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  external: ["@anthropic-ai/claude-agent-sdk", "zod"],
  tsconfig: "tsconfig.json",
  logLevel: "info",
});

console.log("Built lib/agent/runner/dist/entry.mjs");
