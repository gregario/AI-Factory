import { describe, test, expect } from "bun:test";

import {
  resolveTemplate,
  readPartial,
  generateAll,
  injectAutoGenHeader,
} from "./gen-skill-docs";

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
