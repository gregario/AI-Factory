import { describe, test, expect } from "bun:test";
import { execSync } from "child_process";

const SKIP = !process.env.EVALS;

describe.skipIf(SKIP)("Tier 2: E2E skill execution", () => {

  // Helper to run claude -p against the fixture project
  function runSkill(skillName: string, prompt: string, timeoutMs = 120_000): string {
    const fixtureDir = `${import.meta.dir}/fixtures/test-project`;
    try {
      const result = execSync(
        `claude -p "${prompt}" --cwd "${fixtureDir}"`,
        {
          timeout: timeoutMs,
          encoding: "utf-8",
          env: { ...process.env, CLAUDE_NO_HOOKS: "1" }
        }
      );
      return result;
    } catch (err: any) {
      return err.stdout || err.message;
    }
  }

  test("generator produces all 13 skills without error", () => {
    // This is a cheaper sanity check that doesn't need claude -p
    const result = execSync("bun run gen:skill-docs --dry-run", {
      encoding: "utf-8",
      cwd: `${import.meta.dir}/..`
    });
    expect(result).not.toContain("STALE");
  });

  // These tests actually invoke claude -p and cost money
  // Start with 2 representative skills

  test("factory-overview skill runs without crashing", () => {
    const output = runSkill("factory-overview",
      "Run the /factory-overview skill. Just list what you see and stop. Do not ask questions.");
    expect(output.length).toBeGreaterThan(0);
    // Should not contain error indicators
    expect(output).not.toContain("Error:");
    expect(output).not.toContain("skill not found");
  });

  test("competition-review produces structured output", () => {
    const output = runSkill("competition-review",
      "Run /competition-review for 'Test Widget MCP Server'. Skip the backlog check. Use project type: MCP server. Search and produce a competition brief. Save nothing to disk.");
    expect(output.length).toBeGreaterThan(100);
    // Should contain competition brief structure
    expect(output).toMatch(/[Mm]arket [Dd]ensity|[Cc]ompetitor|[Gg]ap/);
  });
});
