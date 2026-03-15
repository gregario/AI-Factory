# Project Instructions

This is a web product inside the AI-Factory workspace. It follows the spec-driven workflow defined in the parent CLAUDE.md, with browser QA integrated into the iteration loop.

## Workflow Overview

This project uses three complementary tools:

- **OpenSpec** — Product thinking. Creates specs, designs changes, manages the product lifecycle.
- **Superpowers** — Engineering. Implements tasks with TDD, code review, and subagent execution.
- **Browser QA** — Quality. Tests the running app as a real user after implementation.

## Spec Mode (OpenSpec)

Use OpenSpec for:
- Defining the product (first specs)
- Proposing new features or large enhancements
- Reviewing and updating specs after code has changed

Key commands:
- `/opsx:propose "idea"` — Propose a change. Generates proposal, design, specs, and tasks.
- `/opsx:explore` — Review the current state of specs.
- `/opsx:archive` — Archive a completed change and update master specs.

Note: `/opsx:apply` is deprecated. After OpenSpec generates tasks, use Design Mode then Superpowers to implement — not `/opsx:apply`.

OpenSpec manages all specs in `openspec/specs/` (delivered capabilities) and `openspec/changes/` (in-progress work). Do not create or edit spec files manually outside of OpenSpec's workflow.

### Spec Sync Rule

When returning to OpenSpec after a period of Superpowers iterations, OpenSpec must first review the current codebase to update its understanding of the product before generating new specs. Code may have evolved since the last spec was written.

## Execution Mode (Superpowers)

Use Superpowers for:
- Implementing tasks from OpenSpec proposals
- Small enhancements and iterations
- Bug fixes
- Refactoring

Superpowers activates automatically. Its skills enforce:
- TDD (red-green-refactor)
- Systematic debugging
- Code review before completion
- Subagent-driven development for complex tasks

## Browser QA

After implementing a task and tests pass, run `/qa` to verify the change works in a real browser before committing.

- **Stack profile:** Read `stacks/browser-qa/` for QA patterns, auth, and framework guidance.
- **Setup:** If browse is not set up, read `stacks/browser-qa/setup.md`.
- **Reports:** QA reports are saved to `.gstack/qa-reports/`.
- **Default mode:** Diff-aware — scopes testing to routes affected by the current branch's changes.

### Framework

<!-- Declare your framework here for framework-specific QA guidance -->
<!-- Examples: next, rails, react, vue, angular, wordpress, static -->
framework: <!-- fill in -->

## Iteration Loop

```
Spec → Design → Implement → Test → QA → Commit → Clear → Repeat
```

The QA step runs after unit tests pass and before commit. It catches visual regressions, broken interactions, and console errors that tests don't cover.

## When to Use Which

| Situation | Tool |
|---|---|
| New product definition | OpenSpec |
| New feature or large enhancement | OpenSpec → then Superpowers to implement |
| Small enhancement or iteration | Superpowers directly |
| Bug fix | Superpowers directly |
| Specs and code have diverged | OpenSpec (review + update specs) |
| Refactoring | Superpowers directly |
| Verify a change works visually | `/qa` (diff-aware mode) |
| Full app QA pass | `/qa --full` |
| Quick smoke test after deploy | `/qa --quick` |

## Development Rules

1. Never write code before specs exist. Use OpenSpec to create them.
2. All source code goes in `/src/`.
3. All tests go in `/tests/`.
4. Run tests after every change.
5. Run `/qa` after tests pass on web-facing changes.
6. Work in small iterative commits.
7. Do not add dependencies without recording them in the architecture spec via OpenSpec.

## File Hygiene

- Do not create files outside of `/src/`, `/tests/`, `openspec/`, and `.gstack/` unless there is a clear reason.
- Keep files small and focused.
- If a spec is ambiguous or missing, raise it — do not guess.

## Project Setup

After copying this template, run:
1. `openspec init --tools claude` to initialize the spec system.
2. Set up browse: read `stacks/browser-qa/setup.md`.
3. Fill in the `framework:` field above.
4. Use `/opsx:propose` to define the product.
