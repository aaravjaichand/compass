import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createTranslateCtx,
  runAgentStream,
  translateNdjsonLine,
  type RunAgentStreamOptions,
} from "./stream";

/** The esbuild-bundled, self-contained runner uploaded into the sandbox. */
const RUNNER_PATH = "lib/agent/runner/dist/entry.mjs";

/** Use the Vercel Sandbox backend on Vercel (or when explicitly opted in). */
function sandboxEnabled(): boolean {
  return process.env.AGENT_RUNTIME === "sandbox" || Boolean(process.env.VERCEL);
}

/**
 * Run one agent turn. Two interchangeable backends share the same UI output:
 *  - in-process query() for local dev (default, and the demo fallback)
 *  - a Vercel Sandbox microVM in production (the Agent SDK spawns a subprocess,
 *    which plain Vercel functions can't host).
 */
export async function runAgent(opts: RunAgentStreamOptions): Promise<void> {
  if (sandboxEnabled()) {
    await runAgentInSandbox(opts);
  } else {
    await runAgentStream(opts);
  }
}

async function runAgentInSandbox(opts: RunAgentStreamOptions): Promise<void> {
  const { Sandbox } = await import("@vercel/sandbox");
  const runner = readFileSync(join(process.cwd(), RUNNER_PATH));

  // On Vercel, VERCEL_OIDC_TOKEN is injected automatically and read by the SDK.
  const sandbox = await Sandbox.create({ runtime: "node24", timeout: 240_000 });
  try {
    await sandbox.writeFiles([
      { path: "entry.mjs", content: Buffer.from(runner) },
      {
        path: "input.json",
        content: Buffer.from(
          JSON.stringify({
            prompt: opts.prompt,
            systemPrompt: opts.systemPrompt,
            model: opts.model,
            allowedTools: opts.allowedTools,
            disallowedTools: opts.disallowedTools,
            maxTurns: opts.maxTurns ?? 12,
          }),
        ),
      },
    ]);

    // The Agent SDK bundles a native binary, so it must be installed in the VM.
    await sandbox.runCommand({
      cmd: "npm",
      args: ["install", "--no-save", "@anthropic-ai/claude-agent-sdk", "zod"],
    });

    const env: Record<string, string> = {};
    if (process.env.ANTHROPIC_API_KEY)
      env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    if (process.env.CLAUDE_CODE_OAUTH_TOKEN)
      env.CLAUDE_CODE_OAUTH_TOKEN = process.env.CLAUDE_CODE_OAUTH_TOKEN;

    const cmd = await sandbox.runCommand({
      cmd: "node",
      args: ["entry.mjs"],
      env,
      detached: true,
    });

    const ctx = createTranslateCtx(opts.terminalToolName, opts.terminalPartType);
    let buffer = "";
    for await (const log of cmd.logs()) {
      if (log.stream !== "stdout") continue;
      buffer += log.data;
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        translateNdjsonLine(line, ctx, opts.writer);
      }
    }
    if (buffer.trim()) translateNdjsonLine(buffer, ctx, opts.writer);
  } finally {
    await sandbox.stop();
  }
}
