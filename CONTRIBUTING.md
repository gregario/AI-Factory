# Contributing to AI-Factory

Thanks for your interest in contributing. This project is a personal AI product factory, but contributions to the shared infrastructure — stack profiles, templates, and workflow improvements — are welcome.

## What You Can Contribute

### Stack Profiles

The most impactful contributions are new or improved stack profiles in `stacks/`. A good stack profile captures the hard-won knowledge that prevents AI from writing bad code in a given technology.

**Adding a new stack:**

1. Create `stacks/<stack-name>/STACK.md` with core principles and a file reference table
2. Add focused docs: `coding_standards.md`, `testing.md`, `project_structure.md`, `pitfalls.md`
3. Optional: `performance.md`, `security.md`, or other technology-specific docs

**What makes a good stack profile:**
- Opinionated — it tells Claude *the* way, not *a* way
- Battle-tested — patterns that survived real projects, not theoretical best practices
- Pitfall-heavy — the things that go wrong when AI writes code in this language
- Concise — Claude reads these on every task, so brevity matters

### Templates

Starter templates in `templates/` that include a CLAUDE.md, sensible defaults, and project structure for a given type of project.

### Workflow Improvements

Changes to the three-mode workflow (CLAUDE.md), design system patterns, or documentation.

## How to Contribute

1. Fork the repo
2. Create a branch (`git checkout -b add-rust-stack`)
3. Make your changes
4. Open a pull request with a clear description of what you've added and why

## What NOT to Contribute

- **Project-specific code** — individual products belong in their own repos
- **Personal configuration** — `.claude/` directories, memory files, and local settings are gitignored for a reason
- **AI-generated filler** — if a doc reads like ChatGPT wrote it, it'll be rejected. Write like a human.

## Style

- British/Irish English spelling (behaviour, colour, optimise)
- Markdown with no trailing whitespace
- Keep docs under 200 lines where possible
- No emojis in documentation
