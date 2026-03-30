import * as fs from "node:fs";
import * as path from "node:path";

const LOG_FILENAME = "tdd-session.jsonl";

export interface LogEvent {
  timestamp: string;
  event: string;
  unitId: string | null;
  data: Record<string, unknown>;
}

export class SessionLog {
  constructor(private workingDir: string) {}

  get logFilePath(): string {
    return path.join(this.workingDir, LOG_FILENAME);
  }

  /** Create (or truncate) the log file so it starts empty. */
  initialize(): void {
    fs.writeFileSync(this.logFilePath, "", "utf-8");
  }

  /**
   * Append a single JSON event line.
   *
   * Each line is a self-contained JSON object following the schema:
   *   { "timestamp": "ISO-8601", "event": "...", "unitId": "...", "data": {...} }
   */
  append(
    eventType: string,
    unitId?: string,
    data?: Record<string, unknown>,
  ): void {
    const entry: LogEvent = {
      timestamp: new Date().toISOString(),
      event: eventType,
      unitId: unitId ?? null,
      data: data ?? {},
    };

    fs.appendFileSync(this.logFilePath, JSON.stringify(entry) + "\n", "utf-8");
  }

  /** Check whether the log file exists on disk. */
  logFileExists(): boolean {
    return fs.existsSync(this.logFilePath);
  }

  /** Return the number of event lines currently in the log. */
  eventCount(): number {
    if (!this.logFileExists()) {
      return 0;
    }

    const content = fs.readFileSync(this.logFilePath, "utf-8");
    if (content.length === 0) {
      return 0;
    }

    // Each event is one line; split and filter out any trailing empty line.
    return content.split("\n").filter((line) => line.length > 0).length;
  }
}
