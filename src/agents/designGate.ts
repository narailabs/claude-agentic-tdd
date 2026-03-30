import * as readline from "node:readline";
import { type TDDConfig } from "../types.js";
import { dispatchAgent } from "./base.js";

/**
 * Create a readline interface for interactive console I/O.
 */
function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Prompt the user for input and return their response.
 */
function askQuestion(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Dispatch an agent to analyse the specification and produce questions
 * and tradeoffs for the user to consider before implementation begins.
 */
async function analyseSpec(
  spec: string,
  config: TDDConfig,
  workingDir: string,
): Promise<string> {
  const prompt = `You are a software architect reviewing a feature specification before implementation begins.

## Specification

${spec}

## Your Task

Analyse this specification and produce:

1. **Clarifying Questions** (3-7 questions): Questions about ambiguities, missing requirements,
   or assumptions that should be confirmed before writing any code. Focus on questions that
   would change the implementation approach.

2. **Key Tradeoffs** (2-5 tradeoffs): Design decisions where multiple valid approaches exist.
   For each tradeoff, describe the options and their consequences.

3. **Risk Assessment**: What could go wrong? What are the hardest parts? What might the
   spec author not have considered?

## Output Format

### Clarifying Questions
1. [question]
2. [question]
...

### Key Tradeoffs
1. **[tradeoff name]**: [option A] vs [option B]. [consequences of each]
2. ...

### Risk Assessment
- [risk or concern]
- ...`;

  return dispatchAgent({
    prompt,
    tools: ["Read", "Glob", "Grep"],
    model: "sonnet",
    effort: config.effort,
    workingDir,
  });
}

/**
 * Dispatch an agent to synthesize a design summary from the spec analysis
 * and the user's answers to the clarifying questions.
 */
async function synthesizeDesign(
  spec: string,
  analysis: string,
  userAnswers: string,
  config: TDDConfig,
  workingDir: string,
): Promise<string> {
  const prompt = `You are synthesizing a design summary from a specification, analysis, and user feedback.

## Original Specification

${spec}

## Analysis (Questions, Tradeoffs, Risks)

${analysis}

## User's Answers

${userAnswers}

## Your Task

Produce a concise design summary that captures the decisions made. This summary will guide
the Test Writer and Code Writer agents. Include:

1. **Scope**: What is being built (and explicitly, what is NOT being built)
2. **Architecture Decisions**: Key design choices based on the user's answers
3. **API Surface**: The public interface that tests should verify
4. **Constraints**: Any limitations, performance requirements, or compatibility needs
5. **Open Items**: Anything still unresolved (to be addressed during implementation)

Keep it focused and actionable. The agents reading this need to know what to build,
not the full discussion history.`;

  return dispatchAgent({
    prompt,
    tools: ["Read", "Glob", "Grep"],
    model: "sonnet",
    effort: config.effort,
    workingDir,
  });
}

/**
 * Run the interactive design gate (Phase 0).
 *
 * Steps:
 * 1. Dispatch an agent to analyse the spec and produce questions + tradeoffs
 * 2. Print questions to the console and collect user answers via stdin
 * 3. Dispatch an agent to synthesize a design summary from the answers
 * 4. Print the summary and ask for approval (confirm / modify / cancel)
 *
 * Returns the design summary string, or null if the user cancels.
 */
export async function runDesignGate(
  spec: string,
  config: TDDConfig,
  workingDir: string,
): Promise<string | null> {
  // Step 1: Analyse the spec
  console.log("\n=== Design Gate: Analysing specification... ===\n");
  const analysis = await analyseSpec(spec, config, workingDir);

  const rl = createReadlineInterface();

  try {
    // Step 2: Present analysis and collect answers
    console.log("\n" + analysis + "\n");
    console.log("=== Please answer the questions above. ===");
    console.log("(Type your answers below. Enter a blank line when done.)\n");

    const answerLines: string[] = [];
    let emptyLineCount = 0;

    while (emptyLineCount < 1) {
      const line = await askQuestion(rl, "> ");
      if (line.trim() === "") {
        emptyLineCount++;
      } else {
        emptyLineCount = 0;
        answerLines.push(line);
      }
    }

    const userAnswers = answerLines.join("\n");

    if (userAnswers.trim().length === 0) {
      console.log("\nNo answers provided. Proceeding without design gate.\n");
      return null;
    }

    // Step 3: Synthesize design summary
    console.log("\n=== Design Gate: Synthesizing design summary... ===\n");
    let designSummary = await synthesizeDesign(
      spec,
      analysis,
      userAnswers,
      config,
      workingDir,
    );

    // Step 4: Approval loop
    while (true) {
      console.log("\n--- Design Summary ---\n");
      console.log(designSummary);
      console.log("\n--- End Design Summary ---\n");

      const choice = await askQuestion(
        rl,
        "Approve this design? (confirm/modify/cancel): ",
      );
      const normalizedChoice = choice.trim().toLowerCase();

      if (normalizedChoice === "confirm" || normalizedChoice === "c" || normalizedChoice === "yes" || normalizedChoice === "y") {
        console.log("\nDesign approved. Proceeding to implementation.\n");
        return designSummary;
      }

      if (normalizedChoice === "cancel" || normalizedChoice === "q" || normalizedChoice === "quit") {
        console.log("\nDesign gate cancelled.\n");
        return null;
      }

      if (normalizedChoice === "modify" || normalizedChoice === "m") {
        console.log("\nProvide your modifications (blank line when done):\n");
        const modLines: string[] = [];
        let modEmptyCount = 0;

        while (modEmptyCount < 1) {
          const modLine = await askQuestion(rl, "> ");
          if (modLine.trim() === "") {
            modEmptyCount++;
          } else {
            modEmptyCount = 0;
            modLines.push(modLine);
          }
        }

        const modifications = modLines.join("\n");
        if (modifications.trim().length > 0) {
          console.log("\n=== Updating design summary... ===\n");
          designSummary = await synthesizeDesign(
            spec,
            analysis,
            `${userAnswers}\n\n## Modifications\n\n${modifications}`,
            config,
            workingDir,
          );
        }
        continue;
      }

      console.log("Please enter 'confirm', 'modify', or 'cancel'.");
    }
  } finally {
    rl.close();
  }
}
