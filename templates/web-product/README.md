# Web Product Template

A spec-driven web product template for the AI-Factory workspace. Uses OpenSpec for product thinking, Superpowers for engineering, and browser QA for visual verification.

## How to Use This Template

### 1. Copy the template

```
cp -r templates/web-product projects/your-product-name
cd projects/your-product-name
```

### 2. Initialize OpenSpec

```
openspec init --tools claude
```

This creates the `openspec/` directory structure and installs slash commands.

### 3. Set up browser QA

Follow `stacks/browser-qa/setup.md` to install the gstack browse binary.

### 4. Configure your framework

Edit `CLAUDE.md` and fill in the `framework:` field (e.g., `next`, `rails`, `react`, `vue`).

### 5. Define the product

Use OpenSpec to create the initial product specs:

```
/opsx:propose "define the product — [your product description]"
```

OpenSpec will generate:
- A proposal (what and why)
- A design (how)
- Specs (requirements and scenarios)
- Tasks (implementation steps)

Do not write code until specs are approved.

### 6. Implement

Once specs are approved, use Superpowers to implement:

- Superpowers activates automatically and enforces TDD, code review, and structured execution
- Work through tasks one at a time
- Place code in `/src/` and tests in `/tests/`
- After tests pass, run `/qa` to verify in a real browser

### 7. Iterate

For small changes and bug fixes, use Superpowers directly — no spec update needed.

For new features or large enhancements, go back to OpenSpec:

```
/opsx:propose "add [new feature]"
```

### 8. Archive completed changes

```
/opsx:archive
```

## Template Structure

```
your-product/
  CLAUDE.md              # Project-level AI instructions (with QA integration)
  README.md              # This file
  .gitignore
  src/                   # All source code
  tests/                 # All tests
  .gstack/
    qa-reports/          # QA reports, screenshots, baselines
```

After `openspec init`:

```
your-product/
  ...
  openspec/
    specs/               # Delivered capability specs (managed by OpenSpec)
    changes/             # In-progress change proposals
  .claude/
    commands/opsx/       # OpenSpec slash commands
    skills/              # OpenSpec skills
```

## Designed For

This template is for web products:

- Web apps (Next.js, Rails, React, Vue, Angular)
- Static sites and SSGs
- SaaS products with a web frontend
- WordPress sites
- Any product with a browser-based UI

For non-web products (games, CLIs, APIs, mobile), use `templates/ai-product-template/` instead.
