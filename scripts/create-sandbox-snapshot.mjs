import { Sandbox } from "@vercel/sandbox";

/**
 * One-time setup: build a Vercel Sandbox snapshot with the Agent SDK
 * preinstalled, so each production agent run skips the ~30s npm install.
 *
 * Run locally after linking the project (needs VERCEL_OIDC_TOKEN):
 *   vercel link && vercel env pull
 *   node --env-file=.env.local scripts/create-sandbox-snapshot.mjs
 *
 * Then set the printed AGENT_SANDBOX_SNAPSHOT_ID in your Vercel project env.
 */
const sandbox = await Sandbox.create({ runtime: "node24", timeout: 300_000 });
try {
  console.log("Installing @anthropic-ai/claude-agent-sdk + zod in the sandbox…");
  const install = await sandbox.runCommand({
    cmd: "npm",
    args: ["install", "--no-save", "@anthropic-ai/claude-agent-sdk", "zod"],
  });
  if (install.exitCode !== 0) {
    console.error("npm install failed with exit code", install.exitCode);
    process.exit(1);
  }
  const snap = await sandbox.snapshot({ expiration: 0 });
  console.log("\n✅ Snapshot created. Set this in your Vercel project env:\n");
  console.log(`AGENT_SANDBOX_SNAPSHOT_ID=${snap.snapshotId}\n`);
} finally {
  // snapshot() stops the session; stop() afterward is best-effort.
  try {
    await sandbox.stop();
  } catch {
    /* already stopped */
  }
}
