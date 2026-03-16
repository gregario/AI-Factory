# TypeScript Stack Profile

This stack profile defines how ALL TypeScript projects in the AI-Factory must be built.

Before implementing any code in a TypeScript project, Claude must read this stack profile in full.
This is not optional. Ignoring the stack profile produces inconsistent, unmaintainable code.

---

## Files in This Profile

| File | Read When |
|------|-----------|
| `coding_standards.md` | Writing any TypeScript |
| `testing.md` | Writing tests or choosing a testing approach |
| `project_structure.md` | Creating new files, modules, or directories |
| `pitfalls.md` | Debugging unexpected behaviour or reviewing code |

---

## Core Principles

These principles apply to every TypeScript project in this factory, without exception.

**Strict mode always.**
`strict: true` in tsconfig. No `any` unless explicitly justified with a comment explaining why.
If you're reaching for `any`, you probably need a generic or a union type.

**ESM by default.**
`"type": "module"` in package.json. Use `.js` extensions in import paths (TypeScript resolves them).
CommonJS is only acceptable when a dependency forces it.

**Types over interfaces for data, interfaces for contracts.**
Use `type` for shapes and unions. Use `interface` when you expect something to be implemented
or extended. Don't mix them arbitrarily.

**Errors are values, not magic.**
Handle errors explicitly. No empty catch blocks. No swallowed promises.
Throw descriptive errors with context. Prefer typed error messages that help the caller understand what went wrong.

**Prefer flat over nested.**
Shallow directory structures. Colocate related files. A module and its tests should be easy to find
without navigating five levels of folders.

**Functions and modules over class hierarchies.**
Use classes when the domain calls for it (e.g. Resource types, service objects with state).
Default to functions and modules for everything else. Avoid inheritance unless there's a clear is-a relationship.

**Keep dependencies minimal.**
Every dependency is a liability. If you're adding one, explain why in the PR.
Prefer the standard library and small, focused packages over large frameworks.

---

## Framework & Library Choices

This stack is deliberately framework-agnostic. Individual projects choose their own tools
and document those choices in project-level CLAUDE.md files.

The stack covers TypeScript + Node.js patterns that apply regardless of whether you're
building an MCP server, a REST API, a CLI tool, or a React frontend.

**For web projects with a UI**, the UI toolkit stack profile (`stacks/ui/STACK.md`) layers
on top of this one. It standardises:
- **Component library:** shadcn/ui + Tailwind CSS + Radix UI primitives
- **Charts:** Recharts
- **Icons:** Lucide React
- **Design token pipeline:** Design Mode tokens → tailwind.config.ts

Read `stacks/ui/` when implementing any web frontend. The UI stack is to React projects
what the MCP stack (`stacks/mcp/`) is to MCP server projects — a specialised layer.

---

## Project-Level Overlays

Each project should document its specific conventions in its own CLAUDE.md or in a
project-specific memory file. Things that belong in the overlay, not here:

- Framework choices (Express, Next.js, MCP SDK, etc.)
- Test runner and configuration (Vitest, Jest, Playwright, etc.)
- Database approach (ORM vs raw SQL, which database)
- Build tooling (esbuild, tsup, tsc, etc.)
- CI/CD configuration
