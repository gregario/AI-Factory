# Project Instructions

This is a web product inside the AI-Factory workspace. It follows the spec-driven workflow defined in the parent CLAUDE.md, with three-pass Design Mode and browser QA integrated into the iteration loop.

## Workflow Overview

This project uses four complementary tools:

- **OpenSpec** — Product thinking. Creates specs, designs changes, manages the product lifecycle.
- **Design Mode** — Three-pass UX and visual design. Produces structural UX, component mapping, and visual specs.
- **Superpowers** — Engineering. Implements tasks with TDD, code review, and subagent execution.
- **Browser QA** — Quality. Tests the running app as a real user after implementation.

## Stack Profiles

Before implementing, read these stack profiles:
- `stacks/typescript/STACK.md` — TypeScript conventions
- `stacks/ui/STACK.md` — UI toolkit (shadcn/ui, Recharts, Lucide, tokens-to-tailwind pipeline)
- `stacks/browser-qa/STACK.md` — Browser QA patterns

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

## Design Mode (Three-Pass)

Design Mode runs three sequential passes before implementation begins. See the parent CLAUDE.md for full details.

### Pass 1 — UX Architecture
- Sitemap, user journey maps (with 3-click rule), information hierarchy, task flows.
- Templates: `stacks/ui/templates/sitemap.md`, `journey-map.md`, `hierarchy-spec.md`

### Pass 2 — Component Design
- Screen-to-component mapping using shadcn/ui components from `stacks/ui/components.md`.
- 5-state design per screen: empty, loading, populated, error, overflow.
- Chart specs (Recharts), icon specs (Lucide), progressive disclosure patterns.
- Template: `stacks/ui/templates/component-mapping.md`

### Pass 3 — Visual Design
- Style tokens (color, typography, spacing) → map to `tailwind.config.ts` via `stacks/ui/tokens-to-tailwind.md`.
- UI theme/config, screen mockups, interaction spec.

**Light-pass:** For changes affecting 1-2 screens with no new navigation, compress all 3 passes into one document.

Design deliverables go in the `design/` folder.

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
framework: next

## Iteration Loop

```
Spec → Design (3-pass) → Implement → Test → QA → Commit → Clear → Repeat
```

The Design step runs three passes (UX Architecture → Component Design → Visual Design) before implementation. The QA step runs after unit tests pass and before commit.

## UI Toolkit Defaults

- **Components:** shadcn/ui (initialize with `npx shadcn@latest init`, add components with `npx shadcn@latest add <name>`)
- **Charts:** Recharts
- **Icons:** Lucide React
- **Styling:** Tailwind CSS with design tokens mapped to `tailwind.config.ts`
- **Component directory:** `src/components/ui/` (shadcn/ui convention)

## When to Use Which

| Situation | Tool |
|---|---|
| New product definition | OpenSpec |
| New feature or large enhancement | OpenSpec → Design Mode → Superpowers |
| Small enhancement or iteration | Superpowers (with light-pass design if UI-facing) |
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
8. Use shadcn/ui components from `stacks/ui/components.md` — do not hand-roll UI primitives.

## File Hygiene

- Do not create files outside of `/src/`, `/tests/`, `openspec/`, `design/`, and `.gstack/` unless there is a clear reason.
- Keep files small and focused.
- If a spec is ambiguous or missing, raise it — do not guess.

## Project Setup

After copying this template, run:
1. `openspec init --tools claude` to initialize the spec system.
2. `npx shadcn@latest init` to set up the component system.
3. Set up browse: read `stacks/browser-qa/setup.md`.
4. Read `stacks/ui/STACK.md` for UI toolkit conventions.
5. Use `/opsx:propose` to define the product.
