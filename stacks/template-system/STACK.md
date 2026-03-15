# Stack Profile Template System

Auto-generate and validate stack profile documentation to prevent drift as more stacks are added.

---

## Problem

Stack profiles are hand-written markdown. As the factory adds more stacks and projects evolve, docs drift from reality. A stack profile that says "use X pattern" when the codebase actually uses Y is worse than no documentation — it actively misleads.

## Solution

Two mechanisms:

1. **Template scaffolding** — Generate new stack profiles from a standard template so every stack has consistent structure.
2. **Drift validation** — Static checks that catch stale or incomplete stack profile docs.

---

## Stack Profile Template

Every stack profile MUST have these files. Use `scripts/new-stack.sh <stack-name>` to scaffold a new stack.

### Required Files

| File | Purpose | Template |
|------|---------|----------|
| `STACK.md` | Core principles, file index, when to read each doc | `templates/stack-profile/STACK.md.tmpl` |
| `coding_standards.md` | Naming, formatting, patterns, anti-patterns | `templates/stack-profile/coding_standards.md.tmpl` |
| `testing.md` | Test framework, patterns, coverage expectations | `templates/stack-profile/testing.md.tmpl` |
| `project_structure.md` | Directory layout, file naming, module organization | `templates/stack-profile/project_structure.md.tmpl` |
| `pitfalls.md` | Common mistakes, gotchas, lessons learned | `templates/stack-profile/pitfalls.md.tmpl` |

### Optional Files

Add these when relevant to the stack:

| File | When |
|------|------|
| `security.md` | Stack handles auth, secrets, network, or user data |
| `performance.md` | Stack has known performance pitfalls or profiling tools |
| `publishing.md` | Stack produces distributable artifacts (npm, PyPI, etc.) |
| `launch.md` | Stack has community promotion considerations |
| `setup.md` | Stack requires non-trivial installation |
| `auth.md` | Stack involves authentication flows |
| `frameworks.md` | Stack has framework-specific variants |

---

## Drift Validation

Run `scripts/validate-stacks.sh` to check all stack profiles for common issues.

### Checks

1. **Required files exist** — Every stack under `stacks/` must have STACK.md, coding_standards.md, testing.md, project_structure.md, and pitfalls.md.

2. **STACK.md has file index** — STACK.md must contain a table listing all files in the profile and when to read them. Every .md file in the stack directory should appear in the index.

3. **No orphan files** — Every .md file in a stack directory must be referenced in STACK.md's file index.

4. **No empty files** — Stack profile files must have content (more than just a heading).

5. **Consistent headings** — coding_standards.md should contain a `## Naming` section. testing.md should contain a `## Test` section. pitfalls.md should contain at least one `##` section.

### Exit Codes

- `0` — All checks pass
- `1` — Warnings (non-blocking, but should be fixed)
- `2` — Errors (blocking, stack profile is incomplete or broken)

---

## Scaffolding a New Stack

```bash
./scripts/new-stack.sh <stack-name>
```

This creates `stacks/<stack-name>/` with all required files populated from templates. Each template has placeholder sections with TODO comments explaining what to fill in.

After scaffolding:
1. Fill in each file with stack-specific content.
2. Remove TODO comments as you go.
3. Add optional files as needed.
4. Run `./scripts/validate-stacks.sh` to verify completeness.
5. Commit the new stack profile.

---

## Adding to an Existing Stack

When adding a new file to a stack:
1. Create the file.
2. Add it to the STACK.md file index table.
3. Run `./scripts/validate-stacks.sh` to catch any missed references.
