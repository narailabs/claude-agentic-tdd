#!/usr/bin/env npx tsx
import { parseArgs } from "node:util";
import { Verifier } from "../../../src/verification.js";
import { EntryMode } from "../../../src/types.js";

const ENTRY_MODE_MAP: Record<string, EntryMode> = {
  "natural-language-spec": EntryMode.NATURAL_LANGUAGE,
  "existing-codebase": EntryMode.EXISTING_CODEBASE,
  "user-provided-test": EntryMode.USER_PROVIDED_TEST,
  "plan-execution": EntryMode.PLAN_EXECUTION,
};

const { values } = parseArgs({
  options: {
    "working-dir": { type: "string" },
    "test-files": { type: "string" },
    "test-command": { type: "string" },
    language: { type: "string" },
    "entry-mode": { type: "string" },
  },
  strict: true,
});

const workingDir = values["working-dir"];
const testFilesRaw = values["test-files"];
const testCommand = values["test-command"];
const language = values["language"];
const entryModeRaw = values["entry-mode"];

if (!workingDir || !testFilesRaw || !testCommand || !language || !entryModeRaw) {
  console.log(
    JSON.stringify({
      error: "Missing required arguments: --working-dir, --test-files, --test-command, --language, --entry-mode",
    }),
  );
  process.exit(1);
}

const testFiles = testFilesRaw.split(",").map((f) => f.trim());

const entryMode = ENTRY_MODE_MAP[entryModeRaw];
if (entryMode === undefined) {
  console.log(
    JSON.stringify({
      error: `Unknown entry-mode: ${entryModeRaw}. Expected one of: ${Object.keys(ENTRY_MODE_MAP).join(", ")}`,
    }),
  );
  process.exit(1);
}

const verifier = new Verifier(workingDir);
const result = verifier.redVerification(testFiles, testCommand, language, entryMode);

if (result === null) {
  console.log(
    JSON.stringify({
      passed: false,
      error: "RED verification failed — tests did not fail as expected or encountered an unacceptable error",
    }),
  );
  process.exit(1);
}

console.log(JSON.stringify(result));
process.exit(0);
