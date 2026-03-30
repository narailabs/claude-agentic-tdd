import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const TEMPLATE_MAP: Record<string, string> = {
  "test-writer": "test-writer-prompt.md",
  "code-writer": "code-writer-prompt.md",
  "spec-compliance": "spec-compliance-reviewer-prompt.md",
  "adversarial": "adversarial-reviewer-prompt.md",
  "code-quality": "code-quality-reviewer-prompt.md",
  "implementer": "implementer-prompt.md",
};

/**
 * Find the reference directory (skills/tdd/reference/ relative to package root).
 * Package root is one level up from src/.
 */
export function getReferenceDir(): string {
  const thisFile = fileURLToPath(import.meta.url);
  const srcDir = path.dirname(thisFile);
  const packageRoot = path.resolve(srcDir, "..");
  return path.join(packageRoot, "skills", "tdd", "reference");
}

/**
 * Load the raw template content by short name (e.g. "test-writer").
 * Throws if the name is unknown or the file does not exist.
 */
export function loadTemplate(name: string): string {
  const filename = TEMPLATE_MAP[name];
  if (!filename) {
    const valid = Object.keys(TEMPLATE_MAP).join(", ");
    throw new Error(
      `Unknown template name "${name}". Valid names: ${valid}`,
    );
  }

  const filePath = path.join(getReferenceDir(), filename);
  return fs.readFileSync(filePath, "utf-8");
}

/**
 * Extract the content between the first pair of ``` markers in a template file.
 * Templates wrap their prompt text inside a fenced code block.
 * Returns the content between the markers, trimmed of leading/trailing whitespace.
 */
export function extractTemplateBlock(raw: string): string {
  const openIdx = raw.indexOf("```\n");
  if (openIdx === -1) {
    throw new Error("No opening ``` marker found in template");
  }

  const contentStart = openIdx + 4; // skip past "```\n"
  const closeIdx = raw.indexOf("\n```", contentStart);
  if (closeIdx === -1) {
    throw new Error("No closing ``` marker found in template");
  }

  return raw.slice(contentStart, closeIdx).trim();
}

/**
 * Format a Record<string, string> value as a series of file-content blocks:
 *   ### path
 *   ```
 *   content
 *   ```
 */
function formatRecordValue(record: Record<string, string>): string {
  return Object.entries(record)
    .map(([filePath, content]) => `### ${filePath}\n\`\`\`\n${content}\n\`\`\``)
    .join("\n\n");
}

/**
 * Load a template by short name, extract the prompt block, and fill
 * {placeholders} from the provided vars.
 *
 * - string values are substituted directly
 * - string[] values are joined with ", "
 * - Record<string, string> values are formatted as file-content blocks
 */
export function loadAndFillTemplate(
  name: string,
  vars: Record<string, string | string[] | Record<string, string>>,
): string {
  const raw = loadTemplate(name);
  const template = extractTemplateBlock(raw);

  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    const placeholder = `{${key}}`;
    let replacement: string;

    if (typeof value === "string") {
      replacement = value;
    } else if (Array.isArray(value)) {
      replacement = value.join(", ");
    } else {
      replacement = formatRecordValue(value);
    }

    // Replace all occurrences of this placeholder
    while (result.includes(placeholder)) {
      result = result.replace(placeholder, replacement);
    }
  }

  return result;
}
