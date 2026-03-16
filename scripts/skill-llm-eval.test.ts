import { describe, test, expect } from "bun:test";
import Anthropic from "@anthropic-ai/sdk";
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

describe.skipIf(SKIP)("Tier 3: LLM-as-judge", () => {

  test("all skills score >= 4.0 average", async () => {
    const client = new Anthropic();
    const today = new Date().toISOString().split("T")[0];
    const results: EvalResult[] = [];

    const skillDirs = readdirSync(SKILLS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name !== "partials")
      .map(d => d.name);

    for (const skill of skillDirs) {
      const skillPath = join(SKILLS_DIR, skill, "SKILL.md");
      const content = readFileSync(skillPath, "utf-8");

      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        messages: [
          { role: "user", content: `${JUDGE_PROMPT}\n\n---\n\n${content}` }
        ]
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const scores = JSON.parse(text);

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
    }

    // Save results
    mkdirSync(EVALS_DIR, { recursive: true });
    const evalPath = join(EVALS_DIR, `${today}-tier3.json`);
    writeFileSync(evalPath, JSON.stringify(results, null, 2));

    // Assert all skills pass
    for (const result of results) {
      expect(result.average).toBeGreaterThanOrEqual(4.0);
    }
  }, 300_000); // 5 minute timeout for all API calls
});
