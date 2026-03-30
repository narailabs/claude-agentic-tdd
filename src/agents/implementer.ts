import { type WorkUnit, type TDDConfig } from "../types.js";
import { loadTemplate, extractTemplateBlock } from "../prompts.js";
import { dispatchAgent } from "./base.js";

/**
 * Dispatch an Implementer agent for non-code tasks (Mode 4 plan execution).
 *
 * The implementer handles tasks that don't need the full TDD pipeline:
 * database migrations, configuration files, documentation, build scripts,
 * CI/CD setup, infrastructure, and data transformations.
 */
export async function dispatchImplementer(
  unit: WorkUnit,
  planContext: string,
  config: TDDConfig,
  workingDir: string,
): Promise<string> {
  // The implementer template uses prose placeholders like [task name],
  // [FULL TEXT of task...], [Scene-setting...], and [directory].
  // Build the prompt by extracting the template block and injecting values.
  const raw = loadTemplate("implementer");
  const templateBlock = extractTemplateBlock(raw);

  const prompt = templateBlock
    .replace(
      "Task N: [task name]",
      `Task ${unit.id}: ${unit.name}`,
    )
    .replace(
      "[FULL TEXT of task from plan \u2014 paste it here, don't make the subagent read the plan file]",
      unit.specContract,
    )
    .replace(
      "[Scene-setting: where this fits in the overall plan, what other tasks depend on this,\narchitectural context the implementer needs to understand]",
      planContext,
    )
    .replace("[directory]", workingDir);

  const response = await dispatchAgent({
    prompt,
    tools: ["Read", "Write", "Glob", "Grep", "Bash"],
    model: unit.modelAssignment?.codeWriter ?? "sonnet",
    effort: config.effort,
    workingDir,
  });

  return response;
}
