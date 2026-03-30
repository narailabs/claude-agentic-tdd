import { query } from "@anthropic-ai/claude-agent-sdk";
import type {
  HookCallbackMatcher,
  HookEvent,
  Options,
  SDKMessage,
  SDKAssistantMessage,
  SDKResultSuccess,
} from "@anthropic-ai/claude-agent-sdk";
import type { ModelTier } from "../types.js";

// ── Types ───────────────────────────────────────────────────────────────

export interface AgentDispatchOptions {
  prompt: string;
  tools: string[];
  model: string; // "sonnet" or "opus"
  effort: "low" | "medium" | "high" | "max";
  workingDir: string;
  hooks?: Partial<Record<HookEvent, HookCallbackMatcher[]>>;
  permissionMode?: string;
  maxTurns?: number;
}

// ── Agent dispatch ──────────────────────────────────────────────────────

/**
 * Extract text content from an SDKAssistantMessage.
 *
 * The assistant message wraps a BetaMessage whose `content` is an array
 * of content blocks. We collect all text blocks.
 */
function extractTextFromAssistantMessage(msg: SDKAssistantMessage): string {
  const parts: string[] = [];
  for (const block of msg.message.content) {
    if (block.type === "text") {
      parts.push(block.text);
    }
  }
  return parts.join("\n");
}

/**
 * Dispatch a Claude agent via the SDK's `query()` function and collect
 * its full response text.
 *
 * This is a REAL SDK call -- no fabrication possible. The agent runs with
 * the specified tools, model, and hooks until completion.
 *
 * @throws Error if the response is empty (agent produced no output)
 */
export async function dispatchAgent(
  options: AgentDispatchOptions,
): Promise<string> {
  const sdkOptions: Options = {
    tools: options.tools,
    model: options.model,
    effort: options.effort,
    cwd: options.workingDir,
    maxTurns: options.maxTurns,
    permissionMode: (options.permissionMode ?? "bypassPermissions") as Options["permissionMode"],
    allowDangerouslySkipPermissions: true,
  };

  if (options.hooks) {
    sdkOptions.hooks = options.hooks;
  }

  const stream = query({ prompt: options.prompt, options: sdkOptions });

  const textParts: string[] = [];

  for await (const message of stream) {
    // Collect text from assistant messages
    if (message.type === "assistant") {
      const text = extractTextFromAssistantMessage(message as SDKAssistantMessage);
      if (text) {
        textParts.push(text);
      }
    }

    // Collect final result text on success
    if (message.type === "result" && message.subtype === "success") {
      const result = (message as SDKResultSuccess).result;
      if (result) {
        textParts.push(result);
      }
    }
  }

  const fullResponse = textParts.join("\n");

  if (!fullResponse.trim()) {
    throw new Error("Agent dispatch returned empty response");
  }

  return fullResponse;
}

// ── Response parsing ────────────────────────────────────────────────────

/**
 * Parse a subagent status from its response text.
 *
 * Scans the response for one of the four canonical status strings:
 *   - DONE
 *   - DONE_WITH_CONCERNS
 *   - NEEDS_CONTEXT
 *   - BLOCKED
 *
 * Returns the first match found. Defaults to "DONE" if none is found.
 */
export function parseSubagentStatus(
  response: string,
): "DONE" | "DONE_WITH_CONCERNS" | "NEEDS_CONTEXT" | "BLOCKED" {
  // Check in order of specificity (DONE_WITH_CONCERNS before DONE)
  const statuses = [
    "DONE_WITH_CONCERNS",
    "NEEDS_CONTEXT",
    "BLOCKED",
    "DONE",
  ] as const;

  for (const status of statuses) {
    if (response.includes(status)) {
      return status;
    }
  }

  return "DONE";
}

/**
 * Parse a review verdict from response text.
 *
 * Searches the response for any of the given `validVerdicts` strings
 * (case-insensitive). Returns the first match found.
 *
 * If no verdict is found, returns the last entry in `validVerdicts`
 * (the most conservative / strictest option by convention).
 */
export function parseReviewVerdict(
  response: string,
  validVerdicts: string[],
): string {
  if (validVerdicts.length === 0) {
    throw new Error("validVerdicts must not be empty");
  }

  const responseLower = response.toLowerCase();

  for (const verdict of validVerdicts) {
    if (responseLower.includes(verdict.toLowerCase())) {
      return verdict;
    }
  }

  // Default to most conservative (last in list)
  return validVerdicts[validVerdicts.length - 1]!;
}
