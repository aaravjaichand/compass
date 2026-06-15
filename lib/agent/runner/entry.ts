/**
 * Self-contained agent runner that executes INSIDE a Vercel Sandbox.
 *
 * esbuild bundles this with the compass MCP tools + the bundled directory
 * (lib/agent/tools.ts → lib/directory/*), externalizing only the Agent SDK and
 * zod (installed in the sandbox at runtime). It reads its config from
 * input.json and writes each Agent SDK message to stdout as one NDJSON line,
 * which the host route translates into the same UI parts as the in-process path.
 */
import { readFileSync } from "node:fs";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { compassServer } from "@/lib/agent/tools";

type Config = {
  prompt: string;
  systemPrompt: string;
  model: string;
  allowedTools: string[];
  disallowedTools: string[];
  maxTurns: number;
};

async function main() {
  const cfg = JSON.parse(readFileSync("input.json", "utf8")) as Config;

  for await (const message of query({
    prompt: cfg.prompt,
    options: {
      model: cfg.model,
      systemPrompt: cfg.systemPrompt,
      mcpServers: { compass: compassServer },
      allowedTools: cfg.allowedTools,
      disallowedTools: cfg.disallowedTools,
      permissionMode: "dontAsk",
      settingSources: [],
      maxTurns: cfg.maxTurns,
    },
  })) {
    process.stdout.write(`${JSON.stringify(message)}\n`);
  }
}

main().catch((err) => {
  process.stderr.write(String(err?.stack ?? err) + "\n");
  process.exit(1);
});
