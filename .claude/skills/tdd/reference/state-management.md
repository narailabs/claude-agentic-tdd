# State Management

The `.tdd-state.json` file tracks session progress for incremental runs. It is gitignored.

## State File Schema

```json
{
  "version": "1.0.0",
  "sessionId": "uuid-v4",
  "startedAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "spec": "Original user specification text",
  "entryPoint": "natural-language-spec | existing-codebase | user-provided-test",
  "framework": {
    "language": "typescript",
    "testRunner": "vitest",
    "testCommand": "npx vitest run",
    "testFilePattern": "**/*.test.ts",
    "sourceDir": "src/",
    "testDir": "src/__tests__/"
  },
  "config": {
    "minAssertionsPerTest": 1,
    "maxRetries": 3,
    "maxMockDepth": 2,
    "flagPrivateMethodTests": true,
    "maxParallelPairs": 3,
    "skipFailedAfterRetries": false,
    "generateReport": true,
    "generateSessionLog": true
  },
  "workUnits": [
    {
      "id": "unit-id",
      "name": "Human-readable name",
      "specContract": "Detailed spec contract text",
      "dependsOn": [],
      "status": "pending | test-writing | red-verification | code-writing | green-verification | adversarial-review | completed | failed",
      "testFiles": ["path/to/test.test.ts"],
      "implFiles": ["path/to/impl.ts"],
      "testWriter": {
        "status": "pending | in-progress | completed | failed",
        "attempts": 0,
        "lastError": null
      },
      "redVerification": {
        "status": "pending | passed | failed",
        "testsFailed": true,
        "failureCount": 0,
        "assertionCount": 0,
        "antiPatterns": [],
        "testFileChecksums": {}
      },
      "codeWriter": {
        "status": "pending | in-progress | completed | failed",
        "attempts": 0,
        "lastError": null
      },
      "greenVerification": {
        "status": "pending | passed | failed",
        "testsPassed": false,
        "testFilesUnchanged": true,
        "skipMarkersFound": []
      },
      "adversarialReview": {
        "status": "pending | in-progress | passed | failed",
        "findings": [],
        "score": null
      }
    }
  ],
  "summary": {
    "totalUnits": 0,
    "completedUnits": 0,
    "failedUnits": 0,
    "totalTests": 0,
    "totalAssertions": 0,
    "antiCheatViolations": 0
  }
}
```

## State Transitions

```
pending → test-writing → red-verification → code-writing → green-verification → adversarial-review → completed
                ↑              |                   ↑              |                     |
                └── (retry) ───┘                   └── (retry) ───┘                     ↓
                                                                                     failed (after max retries)
```

## Incremental Resume

When the lead finds an existing `.tdd-state.json`:

1. Validate the file structure (check `version` field)
2. Show the user current progress:
   ```
   Found existing TDD session from [timestamp]:
   - 2/4 work units completed
   - 1 in progress (code-writing phase)
   - 1 pending
   Options: [resume | restart | add units]
   ```
3. On resume:
   - Skip `completed` units entirely
   - For in-progress units, restart from the current phase
   - For `failed` units, offer to retry or skip
4. On restart: delete state file, start fresh
5. On add units: keep completed work, decompose new spec, add new units

## Atomic Writes

To prevent corruption on interruption:
1. Write state to `.tdd-state.json.tmp`
2. Rename `.tdd-state.json.tmp` to `.tdd-state.json`

The lead should update state after every phase transition.

## Gitignore Management

On first run, check if `.gitignore` exists and contains `.tdd-state.json`:
- If `.gitignore` exists but doesn't contain the entry: append it
- If `.gitignore` doesn't exist: create it with the entries

Entries to add:
```
# agentic-tdd state and intermediate files
.tdd-state.json
tdd-session.jsonl
spec-contract-*.md
```

Note: `tdd-report.md` is NOT gitignored — it's a deliverable the user may want to commit.
