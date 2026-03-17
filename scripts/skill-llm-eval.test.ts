import { describe, test, expect } from "bun:test";
import { execSync } from "child_process";
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, resolve, dirname } from "path";

const SKIP = !process.env.EVALS;
const REPO_ROOT = resolve(dirname(import.meta.path), "..");
const SKILLS_DIR = join(REPO_ROOT, ".claude", "skills");
const EVALS_DIR = join(REPO_ROOT, ".context", "skill-evals");

interface EvalResult {
  skill: string;
  date: string;
  clarity: number;
  completeness: number;
  actionability: number;
  average: number;
  notes: string;
}

const JUDGE_PROMPT = `You are evaluating an AI skill definition (a markdown document that instructs an AI agent how to perform a specific workflow).

Score it on three dimensions, each 1-5:

1. **Clarity** (1-5): Would an AI agent understand every step unambiguously? Are instructions precise?
2. **Completeness** (1-5): Are edge cases, failure modes, and output formats all specified? No gaps?
3. **Actionability** (1-5): Could the agent execute this skill start-to-finish without asking for clarification?

Return ONLY valid JSON (no markdown, no explanation):
{"clarity": N, "completeness": N, "actionability": N, "notes": "brief observation"}`;

function judgeSkill(skillContent: string): EvalResult["clarity"] & Record<string, unknown> {
  const prompt = `${JUDGE_PROMPT}\n\n---\n\n${skillContent}`;
  const escaped = prompt.replace(/'/g, "'\\''");
  const result = execSync(
    `claude -p '${escaped}' --output-format json`,
    {
      timeout: 120_000,
      encoding: "utf-8",
      env: { ...process.env, CLAUDE_NO_HOOKS: "1" }
    }
  );

  // claude --output-format json returns { result: "..." }
  const outer = JSON.parse(result);
  const text = typeof outer.result === "string" ? outer.result : result;

  // Extract JSON from the response (may be wrapped in markdown fences)
  const jsonMatch = text.match(/\{[\s\S]*?"clarity"[\s\S]*?\}/);
  if (!jsonMatch) throw new Error(`No JSON found in response: ${text.slice(0, 200)}`);
  return JSON.parse(jsonMatch[0]);
}

describe.skipIf(SKIP)("Tier 3: LLM-as-judge", () => {

  test("all skills score >= 4.0 average", () => {
    const today = new Date().toISOString().split("T")[0];
    const results: EvalResult[] = [];

    const skillDirs = readdirSync(SKILLS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name !== "partials")
      .map(d => d.name);

    for (const skill of skillDirs) {
      const skillPath = join(SKILLS_DIR, skill, "SKILL.md");
      const content = readFileSync(skillPath, "utf-8");

      const scores = judgeSkill(content);

      const result: EvalResult = {
        skill,
        date: today,
        clarity: scores.clarity,
        completeness: scores.completeness,
        actionability: scores.actionability,
        average: (scores.clarity + scores.completeness + scores.actionability) / 3,
        notes: scores.notes || ""
      };

      results.push(result);
      console.log(`  ${skill}: ${result.average.toFixed(1)} (C:${scores.clarity} Co:${scores.completeness} A:${scores.actionability})`);
    }

    // Save results
    mkdirSync(EVALS_DIR, { recursive: true });
    const evalPath = join(EVALS_DIR, `${today}-tier3.json`);
    writeFileSync(evalPath, JSON.stringify(results, null, 2));

    // Assert all skills pass
    for (const result of results) {
      expect(result.average).toBeGreaterThanOrEqual(4.0);
    }
  }, 600_000); // 10 minute timeout — sequential claude -p calls
});
