import { type WorkUnit, type FrameworkInfo, type TDDConfig } from "../types.js";
import { loadAndFillTemplate } from "../prompts.js";
import { dispatchAgent } from "./base.js";

/**
 * Dispatch a Test Writer agent that writes failing tests for a work unit.
 * The agent receives the spec contract and framework info, writes test files,
 * and produces a spec-contract-{unit.id}.md file.
 */
export async function dispatchTestWriter(
  unit: WorkUnit,
  framework: FrameworkInfo,
  config: TDDConfig,
  workingDir: string,
): Promise<string> {
  const prompt = loadAndFillTemplate("test-writer", {
    spec_contract: unit.specContract,
    language: framework.language,
    test_runner: framework.testRunner,
    test_command: framework.testCommand,
    test_file_paths: unit.testFiles,
    project_conventions_from_claude_md: "No specific conventions.",
    min_assertions: String(config.minAssertionsPerTest),
    unit_id: unit.id,
  });

  const response = await dispatchAgent({
    prompt,
    tools: ["Read", "Write", "Glob", "Grep", "Bash"],
    model: unit.modelAssignment?.testWriter ?? "sonnet",
    effort: config.effort,
    workingDir,
  });

  return response;
}
