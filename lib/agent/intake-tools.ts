import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { assemblePacketSchema } from "@/lib/packet/schema";

/**
 * The intake phase's single terminal tool. Like `present_action_plan`, its
 * handler returns a stub — the real payload is the tool's INPUT, which the
 * stream loop captures and emits to the client as a `data-packet` part.
 */
const assemblePacketTool = tool(
  "assemble_packet",
  "Finalize the filing packet. Call this EXACTLY ONCE, last, after you have collected every required fact. Provide structured intakeAnswers keyed by the canonical field ids, a complete personalized coverLetter written in the person's voice with their real details (never [brackets] or placeholders), and the target programIds. This is your final step — do nothing after it.",
  assemblePacketSchema.shape,
  async () => ({
    content: [{ type: "text", text: "Packet assembled for your review." }],
  }),
);

export const compassIntakeServer = createSdkMcpServer({
  name: "compass-intake",
  tools: [assemblePacketTool],
});

/** The mcpServers key forms the tool prefix — keep it in sync with this name. */
export const INTAKE_ALLOWED_TOOLS = ["mcp__compass-intake__assemble_packet"];
