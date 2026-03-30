#!/usr/bin/env node

import { parseArgs } from "node:util";
import { Orchestrator } from "./orchestrator.js";
import { createDefaultConfig, type TDDConfig } from "./types.js";

const main = async (): Promise<void> => {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      "skip-failed": { type: "boolean", default: false },
      design: { type: "boolean", default: false },
      "skip-design": { type: "boolean", default: false },
      effort: { type: "string", default: "medium" },
      parallel: { type: "string", default: "4" },
      "model-strategy": { type: "string", default: "auto" },
      resume: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  if (values.help) {
    console.log(`
Usage: tdd [options] <spec...>

Enforced Test-Driven Development with Claude Agent Teams.

Options:
  --skip-failed         Skip work units that fail after max retries
  --design              Force the design gate (Phase 0)
  --skip-design         Skip the design gate entirely
  --effort <level>      Reasoning effort: low | medium | high | max (default: medium)
  --parallel <n>        Max concurrent agent pairs (default: 4)
  --model-strategy <s>  Model strategy: auto | standard | capable (default: auto)
  --resume              Resume from an existing .tdd-state.json
  -h, --help            Show this help message
`);
    process.exit(0);
  }

  const spec = positionals.join(" ").trim();
  if (!spec && !values.resume) {
    console.error("Error: No specification provided.");
    console.error("Usage: tdd <spec...>");
    console.error('Example: tdd "implement a user authentication system"');
    process.exit(1);
  }

  const config: TDDConfig = {
    ...createDefaultConfig(),
    skipFailed: values["skip-failed"] as boolean,
    forceDesign: values.design as boolean,
    skipDesign: values["skip-design"] as boolean,
    effort: (values.effort as TDDConfig["effort"]) ?? "medium",
    maxParallelPairs: parseInt(values.parallel as string, 10) || 4,
    modelStrategy:
      (values["model-strategy"] as TDDConfig["modelStrategy"]) ?? "auto",
  };

  const workingDir = process.cwd();
  const orchestrator = new Orchestrator(spec, config, workingDir, {
    resume: values.resume as boolean,
  });

  const success = await orchestrator.run();
  process.exit(success ? 0 : 1);
};

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
