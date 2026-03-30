import * as fs from "node:fs";
import * as path from "node:path";
import { type TDDState } from "./types.js";

const STATE_FILENAME = ".tdd-state.json";
const TMP_SUFFIX = ".tmp";

export class StateManager {
  constructor(private workingDir: string) {}

  get stateFilePath(): string {
    return path.join(this.workingDir, STATE_FILENAME);
  }

  /**
   * Persist state with an atomic write: write to a .tmp file first,
   * then rename over the real file to avoid partial-write corruption.
   */
  save(state: TDDState): void {
    state.updatedAt = new Date().toISOString();

    const json = JSON.stringify(state, null, 2);
    const tmpPath = this.stateFilePath + TMP_SUFFIX;

    fs.writeFileSync(tmpPath, json, "utf-8");
    fs.renameSync(tmpPath, this.stateFilePath);
  }

  /**
   * Load an existing state file.  Returns null when the file does not
   * exist; throws on malformed JSON so callers can surface the error.
   */
  loadExisting(): TDDState | null {
    if (!this.stateFileExists()) {
      return null;
    }

    const raw = fs.readFileSync(this.stateFilePath, "utf-8");
    return JSON.parse(raw) as TDDState;
  }

  /** Check whether a state file is present on disk. */
  stateFileExists(): boolean {
    return fs.existsSync(this.stateFilePath);
  }
}
