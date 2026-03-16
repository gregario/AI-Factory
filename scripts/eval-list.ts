#!/usr/bin/env bun
import { readdirSync, readFileSync } from "fs";
import { join, resolve, dirname } from "path";

const EVALS_DIR = join(resolve(dirname(import.meta.path), ".."), ".context", "skill-evals");

const files = readdirSync(EVALS_DIR)
  .filter(f => f.endsWith(".json"))
  .sort()
  .reverse(); // newest first

if (files.length === 0) {
  console.log("No eval results found. Run: EVALS=1 bun test scripts/skill-llm-eval.test.ts");
  process.exit(0);
}

for (const file of files) {
  const results = JSON.parse(readFileSync(join(EVALS_DIR, file), "utf-8"));
  console.log(`\n=== ${file} ===`);
  console.log("Skill".padEnd(30) + "Clarity  Complete  Action   Avg");
  console.log("-".repeat(70));
  for (const r of results) {
    console.log(
      r.skill.padEnd(30) +
      `${r.clarity.toFixed(1)}`.padEnd(9) +
      `${r.completeness.toFixed(1)}`.padEnd(10) +
      `${r.actionability.toFixed(1)}`.padEnd(9) +
      `${r.average.toFixed(1)}`
    );
  }
}
