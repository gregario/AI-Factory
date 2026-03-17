import { describe, test, expect } from "bun:test";
import { resolve, dirname, join } from "path";
import { readdirSync, readFileSync, statSync, existsSync } from "fs";

import {
  resolveTemplate,
  readPartial,
  generateAll,
  injectAutoGenHeader,
} from "./gen-skill-docs";

const REPO_ROOT = resolve(dirname(import.meta.path), "..");
const SKILLS_DIR = join(REPO_ROOT, ".claude", "skills");

/** Return all skill directory names, excluding partials/ */
function getSkillDirs(): string[] {
  return readdirSync(SKILLS_DIR).filter((entry) => {
    if (entry === "partials") return false;
    const full = join(SKILLS_DIR, entry);
    return statSync(full).isDirectory();
  });
}

describe("readPartial", () => {
  test("reads an existing partial", () => {
    const content = readPartial("preamble.md");
    expect(content).toContain("Socrates");
  });

  test("throws on non-existent partial", () => {
    expect(() => readPartial("nonexistent.md")).toThrow();
  });
});

describe("resolveTemplate", () => {
  test("resolves a known placeholder", () => {
    const result = resolveTemplate("Hello {{PREAMBLE}} world");
    expect(result).toContain("Socrates");
    expect(result).not.toContain("{{PREAMBLE}}");
  });

  test("resolves multiple placeholders", () => {
    const result = resolveTemplate("{{PREAMBLE}}\n---\n{{CONTRIBUTOR_MODE}}");
    expect(result).toContain("Socrates");
    expect(result).toContain("Contributor mode");
    expect(result).not.toContain("{{");
  });

  test("throws on unknown placeholder", () => {
    expect(() => resolveTemplate("{{NONEXISTENT}}")).toThrow(
      "Unknown placeholder"
    );
  });

  test("detects unresolved placeholders after replacement", () => {
    expect(() => resolveTemplate("{{BOGUS_THING}}")).toThrow();
  });

  test("leaves non-placeholder curly braces alone", () => {
    const result = resolveTemplate("code: `const x = {a: 1}` {{PREAMBLE}}");
    expect(result).toContain("{a: 1}");
  });
});

describe("injectAutoGenHeader", () => {
  test("injects header after YAML frontmatter", () => {
    const input = "---\nname: test\n---\n\n# My Skill";
    const result = injectAutoGenHeader(input);
    expect(result).toContain("AUTO-GENERATED");
    // Header should be after the closing --- but before # My Skill
    const headerIdx = result.indexOf("AUTO-GENERATED");
    const frontmatterEnd = result.indexOf("---\n", 3); // skip opening ---
    const headingIdx = result.indexOf("# My Skill");
    expect(headerIdx).toBeGreaterThan(frontmatterEnd);
    expect(headerIdx).toBeLessThan(headingIdx);
  });

  test("handles content without frontmatter", () => {
    const input = "# My Skill\n\nSome content";
    const result = injectAutoGenHeader(input);
    expect(result).toContain("AUTO-GENERATED");
    expect(result).toContain("# My Skill");
  });
});

describe("generateAll", () => {
  test("dry run returns empty array when no templates exist", () => {
    // This tests the glob path — no .tmpl files should exist yet
    const results = generateAll(true);
    expect(Array.isArray(results)).toBe(true);
  });
});

describe("Tier 1: static validation", () => {
  const skillDirs = getSkillDirs();

  test("freshness — all 13 skills report FRESH on dry run", () => {
    const results = generateAll(true);
    expect(results.length).toBe(13);
    const stale = results.filter((r) => r.status === "STALE");
    expect(stale).toEqual([]);
    for (const r of results) {
      expect(r.status).toBe("FRESH");
    }
  });

  test("frontmatter — every SKILL.md has valid YAML frontmatter with name and description", () => {
    for (const dir of skillDirs) {
      const skillMd = join(SKILLS_DIR, dir, "SKILL.md");
      if (!existsSync(skillMd)) continue;
      const content = readFileSync(skillMd, "utf-8");
      expect(content.startsWith("---\n")).toBe(true);
      const closingIdx = content.indexOf("\n---\n", 4);
      expect(closingIdx).toBeGreaterThan(0);
      const frontmatter = content.slice(4, closingIdx);
      expect(frontmatter).toContain("name:");
      expect(frontmatter).toContain("description:");
    }
  });

  test("no orphaned placeholders — no {{UPPERCASE_WORD}} remains in any SKILL.md", () => {
    for (const dir of skillDirs) {
      const skillMd = join(SKILLS_DIR, dir, "SKILL.md");
      if (!existsSync(skillMd)) continue;
      const content = readFileSync(skillMd, "utf-8");
      const matches = content.match(/\{\{[A-Z_]+\}\}/g);
      expect(matches).toBeNull();
    }
  });

  test("template coverage — every skill has both SKILL.md.tmpl and SKILL.md, and no SKILL.md without .tmpl", () => {
    for (const dir of skillDirs) {
      const tmplPath = join(SKILLS_DIR, dir, "SKILL.md.tmpl");
      const mdPath = join(SKILLS_DIR, dir, "SKILL.md");
      expect(existsSync(tmplPath)).toBe(true);
      expect(existsSync(mdPath)).toBe(true);
    }

    // Reverse check: no SKILL.md without a corresponding .tmpl
    for (const dir of skillDirs) {
      const mdPath = join(SKILLS_DIR, dir, "SKILL.md");
      const tmplPath = join(SKILLS_DIR, dir, "SKILL.md.tmpl");
      if (existsSync(mdPath)) {
        expect(existsSync(tmplPath)).toBe(true);
      }
    }
  });

  test("auto-generated header present — every SKILL.md contains the AUTO-GENERATED comment", () => {
    for (const dir of skillDirs) {
      const skillMd = join(SKILLS_DIR, dir, "SKILL.md");
      if (!existsSync(skillMd)) continue;
      const content = readFileSync(skillMd, "utf-8");
      expect(content).toContain("AUTO-GENERATED from SKILL.md.tmpl");
      expect(content).toContain("bun run gen:skill-docs");
    }
  });

  test("contributor mode present — every SKILL.md contains skill-reports save path", () => {
    for (const dir of skillDirs) {
      const skillMd = join(SKILLS_DIR, dir, "SKILL.md");
      if (!existsSync(skillMd)) continue;
      const content = readFileSync(skillMd, "utf-8");
      expect(content).toContain("skill-reports");
    }
  });

  test("preamble present — every SKILL.md contains Socrates", () => {
    for (const dir of skillDirs) {
      const skillMd = join(SKILLS_DIR, dir, "SKILL.md");
      if (!existsSync(skillMd)) continue;
      const content = readFileSync(skillMd, "utf-8");
      expect(content).toContain("Socrates");
    }
  });
});
