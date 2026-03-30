import * as fs from "node:fs";
import * as path from "node:path";
import { type WorkUnit, type FrameworkInfo, type TDDConfig } from "../types.js";
import { loadAndFillTemplate } from "../prompts.js";
import { dispatchAgent } from "./base.js";
import { createTestProtectionHook } from "../hooks.js";

/**
 * Read a file from disk, returning its content as a string.
 * Returns a placeholder message if the file does not exist.
 */
function readFileFromDisk(filePath: string, workingDir: string): string {
  const resolved = path.resolve(workingDir, filePath);
  try {
    return fs.readFileSync(resolved, "utf-8");
  } catch {
    return `[File not found: ${filePath}]`;
  }
}

/**
 * Dispatch a Code Writer agent that implements code to make tests pass.
 *
 * CRITICAL: Information barrier is enforced here. The Code Writer receives
 * test file contents and spec-contract read from DISK, not from any prior
 * agent output. This prevents the Code Writer from seeing the Test Writer's
 * reasoning or prompt.
 */
export async function dispatchCodeWriter(
  unit: WorkUnit,
  framework: FrameworkInfo,
  config: TDDConfig,
  workingDir: string,
): Promise<string> {
  // Read test files from DISK (information barrier)
  const testFileContents: Record<string, string> = {};
  for (const testFile of unit.testFiles) {
    testFileContents[testFile] = readFileFromDisk(testFile, workingDir);
  }

  // Read spec-contract from DISK (information barrier)
  const specContractPath = path.join(
    path.dirname(path.resolve(workingDir, unit.testFiles[0] ?? ".")),
    `spec-contract-${unit.id}.md`,
  );
  let specContractContent: string;
  try {
    specContractContent = fs.readFileSync(specContractPath, "utf-8");
  } catch {
    // Fall back to relative path from working dir
    const fallbackPath = path.resolve(workingDir, `spec-contract-${unit.id}.md`);
    try {
      specContractContent = fs.readFileSync(fallbackPath, "utf-8");
    } catch {
      specContractContent = unit.specContract;
    }
  }

  const prompt = loadAndFillTemplate("code-writer", {
    test_file_contents_verbatim: testFileContents,
    spec_contract_file_contents: specContractContent,
    language: framework.language,
    test_runner: framework.testRunner,
    test_command: framework.testCommand,
    impl_file_paths: unit.implFiles,
    project_conventions_from_claude_md: "No specific conventions.",
  });

  // Create test protection hook to prevent the Code Writer from modifying tests
  const testProtectionHook = createTestProtectionHook(unit.testFiles);

  const response = await dispatchAgent({
    prompt,
    tools: ["Read", "Write", "Glob", "Grep", "Bash"],
    model: unit.modelAssignment?.codeWriter ?? "sonnet",
    effort: config.effort,
    workingDir,
    hooks: {
      PreToolUse: [testProtectionHook],
    },
  });

  return response;
}
