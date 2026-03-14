# TypeScript Stack Profile — Design

**Date:** 2026-03-13
**Status:** Implemented

## Decision

Create a layered TypeScript stack profile:

1. **Base stack** (`stacks/typescript/`) — general TypeScript + Node.js patterns, framework-agnostic, covering both backend and frontend. Reusable across any TS project.

2. **Project overlays** — project-specific conventions live in the project's own CLAUDE.md or in AI-Factory memory. Things like framework choices, test runner, database approach.

## Scope

- Backend (Node.js) and frontend (React/Next.js) coverage
- Testing philosophy: context-dependent (guidance on when to unit vs integration test, not a single mandate)
- Framework-agnostic: no prescribed libraries, just TypeScript + Node.js patterns
- Pitfalls file starts lean, grows from experience

## Files

| File | Purpose |
|------|---------|
| `STACK.md` | Index + core principles |
| `coding_standards.md` | Naming, types, error handling, async, modules |
| `testing.md` | When to use which test type, structure, assertions |
| `project_structure.md` | Directory layouts for backend, frontend, full-stack |
| `pitfalls.md` | Common gotchas, grows over time |

## Project Overlays

Individual projects add their own conventions on top of the base stack. Examples of overlay content:
- ORM choice (or raw SQL)
- Test runner and database strategy
- Framework-specific patterns
- Transport layer decisions

Overlays live in the project's own CLAUDE.md or in AI-Factory memory, not in the base stack profile.
