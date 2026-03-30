#!/usr/bin/env npx tsx
import { parseArgs } from "node:util";
import { Verifier } from "../../../src/verification.js";

const { values } = parseArgs({
  options: {
    "working-dir": { type: "string" },
    "test-files": { type: "string" },
    "test-command": { type: "string" },
    "checksums-json": { type: "string" },
  },
  strict: true,
});

const workingDir = values["working-dir"];
const testFilesRaw = values["test-files"];
const testCommand = values["test-command"];
const checksumsRaw = values["checksums-json"];

if (!workingDir || !testFilesRaw || !testCommand || !checksumsRaw) {
  console.log(
    JSON.stringify({
      error: "Missing required arguments: --working-dir, --test-files, --test-command, --checksums-json",
    }),
  );
  process.exit(1);
}

const testFiles = testFilesRaw.split(",").map((f) => f.trim());

let storedChecksums: Record<string, string>;
try {
  storedChecksums = JSON.parse(checksumsRaw) as Record<string, string>;
} catch {
  console.log(JSON.stringify({ error: "Invalid JSON for --checksums-json" }));
  process.exit(1);
}

const verifier = new Verifier(workingDir);
const result = verifier.greenVerification(testFiles, testCommand, storedChecksums);

console.log(JSON.stringify(result));

const allPassed =
  result.testsPassed && result.testFilesUnchanged && result.skipMarkersFound.length === 0;

process.exit(allPassed ? 0 : 1);
