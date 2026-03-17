#!/usr/bin/env bun

import { resolve, dirname, join } from "path";
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "fs";

// Path resolution relative to script location
const REPO_ROOT = resolve(dirname(import.meta.path), "..");
const SKILLS_DIR = join(REPO_ROOT, ".claude", "skills");
const PARTIALS_DIR = join(SKILLS_DIR, "partials");

/**
 * Read a partial file by name from the partials directory.
 * Throws if the file does not exist.
 */
export function readPartial(name: string): string {
  const filePath = join(PARTIALS_DIR, name);
  if (!existsSync(filePath)) {
    throw new Error(`Partial not found: ${name} (looked in ${PARTIALS_DIR})`);
  }
  return readFileSync(filePath, "utf-8").trim();
}

/**
 * Maps placeholder names to their partial file resolvers.
 */
const RESOLVERS: Record<string, () => string> = {
  PREAMBLE: () => readPartial("preamble.md"),
  CONTRIBUTOR_MODE: () => readPartial("contributor-mode.md"),
  ASK_FORMAT: () => readPartial("ask-format.md"),
  HEALTH_SCORING: () => readPartial("health-scoring.md"),
  ARTIFACT_SAVE: () => readPartial("artifact-save.md"),
  PIPELINE_HANDOFF: () => readPartial("pipeline-handoff.md"),
};

/**
 * Single-pass regex replacement of {{PLACEHOLDER}} tokens.
 * Throws on unknown placeholders and verifies none remain after resolution.
 */
export function resolveTemplate(content: string): string {
  const result = content.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => {
    const resolver = RESOLVERS[name];
    if (!resolver) {
      throw new Error(`Unknown placeholder: {{${name}}}`);
    }
    return resolver();
  });

  // Post-scan: ensure no unresolved uppercase placeholders remain
  const remaining = result.match(/\{\{[A-Z_]+\}\}/g);
  if (remaining) {
    throw new Error(
      `Unresolved placeholders after replacement: ${remaining.join(", ")}`
    );
  }

  return result;
}

/**
 * Inject auto-generation header after YAML frontmatter.
 * If no frontmatter exists, prepend to the top.
 */
export function injectAutoGenHeader(content: string): string {
  const header = [
    "<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->",
    "<!-- Regenerate: bun run gen:skill-docs -->",
    "",
  ].join("\n");

  if (content.startsWith("---\n")) {
    // Find the closing --- of frontmatter
    const closingIdx = content.indexOf("\n---\n", 4);
    if (closingIdx !== -1) {
      const insertAt = closingIdx + 5; // after "\n---\n"
      return (
        content.slice(0, insertAt) + header + content.slice(insertAt)
      );
    }
  }

  // No frontmatter — prepend
  return header + content;
}

type GenerateStatus = "FRESH" | "STALE" | "GENERATED";

/**
 * Find all SKILL.md.tmpl files, resolve templates, and either
 * check freshness (dry run) or write output files.
 */
export function generateAll(
  dryRun: boolean
): { skill: string; status: GenerateStatus }[] {
  const results: { skill: string; status: GenerateStatus }[] = [];

  // Scan for skill directories containing SKILL.md.tmpl
  if (!existsSync(SKILLS_DIR)) {
    return results;
  }

  const entries = readdirSync(SKILLS_DIR);
  for (const entry of entries) {
    const skillDir = join(SKILLS_DIR, entry);
    if (!statSync(skillDir).isDirectory()) continue;
    if (entry === "partials") continue;

    const tmplPath = join(skillDir, "SKILL.md.tmpl");
    if (!existsSync(tmplPath)) continue;

    const template = readFileSync(tmplPath, "utf-8");
    const resolved = injectAutoGenHeader(resolveTemplate(template));
    const outputPath = join(skillDir, "SKILL.md");

    if (dryRun) {
      if (existsSync(outputPath)) {
        const existing = readFileSync(outputPath, "utf-8");
        results.push({
          skill: entry,
          status: existing === resolved ? "FRESH" : "STALE",
        });
      } else {
        results.push({ skill: entry, status: "STALE" });
      }
    } else {
      writeFileSync(outputPath, resolved, "utf-8");
      results.push({ skill: entry, status: "GENERATED" });
    }
  }

  return results;
}

// CLI entry point — runs when executed directly
if (import.meta.main) {
  const dryRun = Bun.argv.includes("--dry-run");
  const results = generateAll(dryRun);

  if (results.length === 0) {
    console.log("No SKILL.md.tmpl files found.");
    process.exit(0);
  }

  for (const { skill, status } of results) {
    const icon =
      status === "FRESH" ? "✓" : status === "STALE" ? "✗" : "→";
    console.log(`  ${icon} ${skill}: ${status}`);
  }

  if (dryRun) {
    const stale = results.filter((r) => r.status === "STALE");
    if (stale.length > 0) {
      console.error(
        `\n${stale.length} skill(s) need regeneration. Run: bun run gen:skill-docs`
      );
      process.exit(1);
    }
    console.log("\nAll skills are up to date.");
  } else {
    console.log(`\nGenerated ${results.length} skill file(s).`);
  }
}
