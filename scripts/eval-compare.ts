#!/usr/bin/env bun
import { readFileSync } from "fs";
import { join, resolve, dirname } from "path";

const EVALS_DIR = join(resolve(dirname(import.meta.path), ".."), ".context", "skill-evals");
const [date1, date2] = Bun.argv.slice(2);

if (!date1 || !date2) {
  console.log("Usage: bun run eval:compare <date1> <date2>");
  console.log("Example: bun run eval:compare 2026-03-16 2026-03-17");
  process.exit(1);
}

const load = (date: string) => {
  const path = join(EVALS_DIR, `${date}-tier3.json`);
  return JSON.parse(readFileSync(path, "utf-8"));
};

try {
  const before = load(date1);
  const after = load(date2);

  console.log(`\nComparing ${date1} → ${date2}\n`);
  console.log("Skill".padEnd(30) + "Avg Before  Avg After  Delta");
  console.log("-".repeat(65));

  for (const a of after) {
    const b = before.find((x: any) => x.skill === a.skill);
    const bAvg = b ? b.average : 0;
    const delta = a.average - bAvg;
    const sign = delta > 0 ? "+" : "";
    console.log(
      a.skill.padEnd(30) +
      `${bAvg.toFixed(1)}`.padEnd(12) +
      `${a.average.toFixed(1)}`.padEnd(11) +
      `${sign}${delta.toFixed(1)}`
    );
  }
} catch (err) {
  console.error(`Error: Could not load eval files for dates ${date1} and ${date2}`);
  process.exit(1);
}
