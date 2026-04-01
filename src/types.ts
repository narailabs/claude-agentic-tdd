// ── Enums ───────────────────────────────────────────────────────────────

export enum EntryMode {
  NATURAL_LANGUAGE,
  EXISTING_CODEBASE,
  USER_PROVIDED_TEST,
  PLAN_EXECUTION,
}

export enum UnitType {
  CODE = "code",
  TASK = "task",
}

export enum UnitStatus {
  PENDING,
  TEST_WRITING,
  RED_VERIFICATION,
  CODE_WRITING,
  GREEN_VERIFICATION,
  SPEC_REVIEW,
  ADVERSARIAL_REVIEW,
  CODE_QUALITY_REVIEW,
  COMPLETED,
  FAILED,
}

export enum ReviewVerdict {
  COMPLIANT,
  NON_COMPLIANT,
  PASS,
  FAIL,
  APPROVED,
  NEEDS_CHANGES,
}

export enum ModelTier {
  SONNET = "sonnet",
  OPUS = "opus",
}

export enum Complexity {
  MECHANICAL = "mechanical",
  STANDARD = "standard",
  ARCHITECTURE = "architecture",
}

// ── Interfaces ──────────────────────────────────────────────────────────

export interface FrameworkInfo {
  language: string;
  testRunner: string;
  testCommand: string;
  testFilePattern: string;
  sourceDir: string;
  testDir: string;
}

export interface ModelAssignment {
  testWriter: ModelTier;
  codeWriter: ModelTier;
  reviewer: ModelTier;
}

export interface RedVerification {
  status: string;
  testsFailed: boolean;
  failureCount: number;
  assertionCount: number;
  antiPatterns: string[];
  testFileChecksums: Record<string, string>;
}

export interface GreenVerification {
  status: string;
  testsPassed: boolean;
  testFilesUnchanged: boolean;
  changedFiles: string[];
  skipMarkersFound: string[];
  testOutput: string;
  exitCode: number;
  tscCheck?: { clean: boolean; errors: string } | null;
}

export interface SpecComplianceResult {
  status: string;
  requirementsCovered: number;
  requirementsTotal: number;
  missingRequirements: string[];
  scopeCreep: string[];
  rawResponse: string;
}

export interface AdversarialResult {
  status: string;
  findings: string[];
  score: Record<string, number> | null;
  rawResponse: string;
}

export interface CodeQualityResult {
  status: string;
  issues: string[];
  rawResponse: string;
}

export interface WorkUnit {
  id: string;
  name: string;
  unitType: UnitType;
  specContract: string;
  dependsOn: string[];
  complexity: Complexity;
  modelAssignment: ModelAssignment | null;
  status: UnitStatus;
  testFiles: string[];
  implFiles: string[];
  testWriterAttempts: number;
  codeWriterAttempts: number;
  redVerification: RedVerification;
  greenVerification: GreenVerification;
  specCompliance: SpecComplianceResult;
  adversarial: AdversarialResult;
  codeQuality: CodeQualityResult;
}

export interface TDDConfig {
  minAssertionsPerTest: number;
  maxRetries: number;
  maxMockDepth: number;
  flagPrivateMethodTests: boolean;
  maxParallelPairs: number;
  skipFailed: boolean;
  modelStrategy: "auto" | "standard" | "capable";
  effort: "low" | "medium" | "high" | "max";
  forceDesign: boolean;
  skipDesign: boolean;
}

export interface TDDState {
  version: string;
  sessionId: string;
  startedAt: string;
  updatedAt: string;
  spec: string;
  designSummary: string | null;
  entryMode: EntryMode;
  framework: FrameworkInfo | null;
  config: TDDConfig;
  workUnits: WorkUnit[];
}

// ── Factory Functions ───────────────────────────────────────────────────

export function createDefaultConfig(): TDDConfig {
  return {
    minAssertionsPerTest: 1,
    maxRetries: 3,
    maxMockDepth: 2,
    flagPrivateMethodTests: true,
    maxParallelPairs: 4,
    skipFailed: false,
    modelStrategy: "auto",
    effort: "medium",
    forceDesign: false,
    skipDesign: false,
  };
}

export function createDefaultState(spec: string, config: TDDConfig): TDDState {
  return {
    version: "1.0.0",
    sessionId: crypto.randomUUID(),
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    spec,
    designSummary: null,
    entryMode: EntryMode.NATURAL_LANGUAGE,
    framework: null,
    config,
    workUnits: [],
  };
}

export function createRedVerification(): RedVerification {
  return {
    status: "pending",
    testsFailed: false,
    failureCount: 0,
    assertionCount: 0,
    antiPatterns: [],
    testFileChecksums: {},
  };
}

export function createGreenVerification(): GreenVerification {
  return {
    status: "pending",
    testsPassed: false,
    testFilesUnchanged: true,
    changedFiles: [],
    skipMarkersFound: [],
    testOutput: "",
    exitCode: -1,
  };
}

export function createSpecComplianceResult(): SpecComplianceResult {
  return {
    status: "pending",
    requirementsCovered: 0,
    requirementsTotal: 0,
    missingRequirements: [],
    scopeCreep: [],
    rawResponse: "",
  };
}

export function createAdversarialResult(): AdversarialResult {
  return {
    status: "pending",
    findings: [],
    score: null,
    rawResponse: "",
  };
}

export function createCodeQualityResult(): CodeQualityResult {
  return {
    status: "pending",
    issues: [],
    rawResponse: "",
  };
}

export function createWorkUnit(
  id: string,
  name: string,
  specContract: string,
  options?: {
    unitType?: UnitType;
    dependsOn?: string[];
    complexity?: Complexity;
  },
): WorkUnit {
  return {
    id,
    name,
    unitType: options?.unitType ?? UnitType.CODE,
    specContract,
    dependsOn: options?.dependsOn ?? [],
    complexity: options?.complexity ?? Complexity.STANDARD,
    modelAssignment: null,
    status: UnitStatus.PENDING,
    testFiles: [],
    implFiles: [],
    testWriterAttempts: 0,
    codeWriterAttempts: 0,
    redVerification: createRedVerification(),
    greenVerification: createGreenVerification(),
    specCompliance: createSpecComplianceResult(),
    adversarial: createAdversarialResult(),
    codeQuality: createCodeQualityResult(),
  };
}
