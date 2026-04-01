#!/usr/bin/env npx tsx
import { parseArgs } from "node:util";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  createDefaultConfig,
  createDefaultState,
  createWorkUnit,
  type FrameworkInfo,
  type TDDConfig,
  type TDDState,
  EntryMode,
  UnitType,
  Complexity,
} from "../../../src/types.js";
import { StateManager } from "../../../src/state.js";
import { SessionLog } from "../../../src/sessionLog.js";

const { values } = parseArgs({
  options: {
    "working-dir": { type: "string" },
    spec: { type: "string" },
    "entry-mode": { type: "string" },
    "framework-json": { type: "string" },
    "design-summary": { type: "string" },
    "work-units-json": { type: "string" },
    "config-json": { type: "string" },
    force: { type: "boolean", default: false },
  },
  strict: true,
});

const workingDir = values["working-dir"];
const spec = values.spec;
const entryModeStr = values["entry-mode"];
const workUnitsJson = values["work-units-json"];

if (!workingDir || !spec || !entryModeStr || !workUnitsJson) {
  console.error(
    "Error: --working-dir, --spec, --entry-mode, and --work-units-json are required",
  );
  process.exit(1);
}

const sm = new StateManager(workingDir);

// Check for existing state file
if (sm.stateFileExists() && !values.force) {
  console.log(
    JSON.stringify({
      error: "State file already exists. Use --force to overwrite.",
    }),
  );
  process.exit(1);
}

// Build config with optional overrides
let config: TDDConfig = createDefaultConfig();
if (values["config-json"]) {
  const overrides = JSON.parse(values["config-json"]) as Partial<TDDConfig>;
  config = { ...config, ...overrides };
}

// Create default state
const state: TDDState = createDefaultState(spec, config);

// Set entry mode
const entryModeMap: Record<string, EntryMode> = {
  "0": EntryMode.NATURAL_LANGUAGE,
  "1": EntryMode.EXISTING_CODEBASE,
  "2": EntryMode.USER_PROVIDED_TEST,
  "3": EntryMode.PLAN_EXECUTION,
  NATURAL_LANGUAGE: EntryMode.NATURAL_LANGUAGE,
  EXISTING_CODEBASE: EntryMode.EXISTING_CODEBASE,
  USER_PROVIDED_TEST: EntryMode.USER_PROVIDED_TEST,
  PLAN_EXECUTION: EntryMode.PLAN_EXECUTION,
};
const entryMode = entryModeMap[entryModeStr];
if (entryMode === undefined) {
  console.error(`Error: unknown entry mode "${entryModeStr}"`);
  process.exit(1);
}
state.entryMode = entryMode;

// Set optional framework
if (values["framework-json"]) {
  state.framework = JSON.parse(values["framework-json"]) as FrameworkInfo;
}

// Set optional design summary
if (values["design-summary"]) {
  state.designSummary = values["design-summary"];
}

// Parse and add work units
interface WorkUnitDef {
  id: string;
  name: string;
  specContract: string;
  unitType?: string;
  wave?: "backend" | "frontend" | "fullstack";
  dependsOn?: string[];
  complexity?: string;
}

const unitDefs = JSON.parse(workUnitsJson) as WorkUnitDef[];
for (const def of unitDefs) {
  const unit = createWorkUnit(def.id, def.name, def.specContract, {
    unitType: def.unitType === "task" ? UnitType.TASK : UnitType.CODE,
    wave: def.wave ?? "backend",
    dependsOn: def.dependsOn,
    complexity:
      def.complexity === "mechanical"
        ? Complexity.MECHANICAL
        : def.complexity === "architecture"
          ? Complexity.ARCHITECTURE
          : Complexity.STANDARD,
  });
  state.workUnits.push(unit);
}

// Save state
sm.save(state);

// Initialize session log and append start event
const log = new SessionLog(workingDir);
log.initialize();
log.append("session.start", undefined, {
  spec,
  entryMode: entryModeStr,
  unitCount: unitDefs.length,
});

// Ensure .gitignore entries
const gitignorePath = path.join(workingDir, ".gitignore");
const entriesToAdd = [".tdd-state.json", "tdd-session.jsonl", "spec-contract-*.md"];

let gitignoreContent = "";
if (fs.existsSync(gitignorePath)) {
  gitignoreContent = fs.readFileSync(gitignorePath, "utf-8");
}

const missingEntries = entriesToAdd.filter(
  (entry) => !gitignoreContent.includes(entry),
);
if (missingEntries.length > 0) {
  const suffix = gitignoreContent.endsWith("\n") || gitignoreContent === "" ? "" : "\n";
  const additions = missingEntries.join("\n") + "\n";
  fs.appendFileSync(gitignorePath, suffix + additions, "utf-8");
}

console.log(
  JSON.stringify({
    stateFile: sm.stateFilePath,
    logFile: log.logFilePath,
    unitCount: unitDefs.length,
    sessionId: state.sessionId,
  }),
);
process.exit(0);
