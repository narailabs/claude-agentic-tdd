import type {
  HookCallback,
  HookCallbackMatcher,
  HookInput,
  PreToolUseHookInput,
  SyncHookJSONOutput,
} from "@anthropic-ai/claude-agent-sdk";

// ── Helpers ─────────────────────────────────────────────────────────────

function isPreToolUse(input: HookInput): input is PreToolUseHookInput {
  return input.hook_event_name === "PreToolUse";
}

/**
 * Extract the file path targeted by a Write or Edit tool invocation.
 * Returns undefined for other tools or if no path can be determined.
 */
function getWriteEditPath(input: PreToolUseHookInput): string | undefined {
  const toolInput = input.tool_input as Record<string, unknown> | undefined;
  if (!toolInput) return undefined;

  if (input.tool_name === "Write" || input.tool_name === "Edit") {
    const filePath = toolInput["file_path"];
    if (typeof filePath === "string") return filePath;
  }
  return undefined;
}

/**
 * Bash commands that can destructively modify files.
 * Each pattern is checked against the full command string.
 */
const DESTRUCTIVE_BASH_PATTERNS = [
  /\brm\s/,
  /\bmv\s/,
  /\bcp\s.*\s/,  // cp with destination could overwrite
  />/,            // redirect (covers > and >>)
  /\bsed\s/,
  /\btee\s/,
];

/**
 * Check whether a Bash command could modify any of the given file paths.
 */
function bashCommandTargetsFiles(
  command: string,
  protectedFiles: string[],
): boolean {
  // Must contain at least one destructive pattern
  const isDestructive = DESTRUCTIVE_BASH_PATTERNS.some((re) => re.test(command));
  if (!isDestructive) return false;

  // Check if any protected file appears in the command
  return protectedFiles.some((file) => command.includes(file));
}

function denyResult(reason: string): SyncHookJSONOutput {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  };
}

function allowResult(): SyncHookJSONOutput {
  return {};
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Create a PreToolUse hook that blocks the Code Writer from modifying test files.
 *
 * Returns an `HookCallbackMatcher` suitable for the SDK `hooks.PreToolUse` array.
 * Blocks:
 *   - Write/Edit tools targeting any path in `testFiles`
 *   - Bash commands containing destructive operations (rm, mv, >, >>, sed, tee)
 *     that reference a protected test file
 *
 * Allowed operations pass through unchanged.
 */
export function createTestProtectionHook(
  testFiles: string[],
): HookCallbackMatcher {
  const hook: HookCallback = async (
    input: HookInput,
    _toolUseID: string | undefined,
    _options: { signal: AbortSignal },
  ): Promise<SyncHookJSONOutput> => {
    if (!isPreToolUse(input)) return allowResult();

    // Check Write / Edit tools
    const targetPath = getWriteEditPath(input);
    if (targetPath !== undefined) {
      const isProtected = testFiles.some(
        (tf) => targetPath === tf || targetPath.endsWith(`/${tf}`),
      );
      if (isProtected) {
        return denyResult(
          `Test file "${targetPath}" is protected. Code Writer must not modify test files.`,
        );
      }
    }

    // Check Bash commands
    if (input.tool_name === "Bash") {
      const toolInput = input.tool_input as Record<string, unknown> | undefined;
      const command = toolInput?.["command"];
      if (typeof command === "string" && bashCommandTargetsFiles(command, testFiles)) {
        return denyResult(
          `Bash command would modify a protected test file. Code Writer must not modify test files.`,
        );
      }
    }

    return allowResult();
  };

  return { hooks: [hook] };
}

/**
 * Create a PreToolUse hook that restricts an agent to only modify specific
 * implementation files.
 *
 * Returns an `HookCallbackMatcher` suitable for the SDK `hooks.PreToolUse` array.
 * Blocks:
 *   - Write/Edit tools targeting any file NOT in `implFiles`
 *
 * Non-write tools (Read, Grep, Glob, Bash without file modification) are
 * always allowed.
 */
export function createImplementationOnlyHook(
  implFiles: string[],
): HookCallbackMatcher {
  const hook: HookCallback = async (
    input: HookInput,
    _toolUseID: string | undefined,
    _options: { signal: AbortSignal },
  ): Promise<SyncHookJSONOutput> => {
    if (!isPreToolUse(input)) return allowResult();

    const targetPath = getWriteEditPath(input);
    if (targetPath === undefined) return allowResult();

    const isAllowed = implFiles.some(
      (f) => targetPath === f || targetPath.endsWith(`/${f}`),
    );
    if (!isAllowed) {
      return denyResult(
        `File "${targetPath}" is not in the allowed implementation files list. ` +
          `Agent may only modify: ${implFiles.join(", ")}`,
      );
    }

    return allowResult();
  };

  return { hooks: [hook] };
}
