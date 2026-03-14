# Bucket 2: Browser QA & Web Product Support

> New capabilities for web products — browser QA stack profile, QA skill, and web product template. Powered by gstack's browse binary.

**Date:** 2026-03-14
**Source:** `docs/plans/2026-03-14-roadmap.md` (Bucket 2, items 2.1, 2.2, 2.4)
**Dependency:** [gstack by Garry Tan](https://github.com/garrytan/gstack) (MIT) — browse binary for headless Chromium interaction.
**Dropped:** Item 2.3 (template auto-gen) — YAGNI with only 2 templates.

---

## Delivery Overview

| # | Item | Delivery |
|---|------|----------|
| 2.1 | Browser QA Stack Profile | `stacks/browser-qa/` — 5 docs |
| 2.2 | Web Product Template | `templates/web-product/` — starter project with QA wired in |
| 2.4 | QA Skill | `.claude/skills/qa/SKILL.md` — 4-mode QA workflow |

---

## 2.1 Browser QA Stack Profile

**Path:** `stacks/browser-qa/`

Layers on top of any web stack (like MCP layers on TypeScript). A project using browser QA references both its primary stack and this one.

### Files

#### STACK.md

Core principles and when to use browser QA:

- Browser QA supplements unit/integration tests — it does not replace them.
- "Tests pass" ≠ "it works." Browser QA bridges that gap by testing as a real user.
- Diff-aware mode is the default — scope testing to what changed, not the whole app.
- Screenshots are evidence, not decoration — every finding needs visual proof.
- The agent gets "eyes" via headless browser — this changes what's possible in the iteration loop.

When to use browser QA vs unit tests:
- **Unit tests**: Logic, data transformations, edge cases, error handling. Fast, deterministic.
- **Browser QA**: User flows, visual layout, form interactions, console errors, responsiveness. Slower, but catches what unit tests miss.
- **Both**: Critical user flows deserve both — unit tests for the logic, browser QA for the experience.

Integration with the factory iteration loop:
```
Spec → Design → Implement → Test → QA → Commit → Clear → Repeat
                                     ↑
                              Browser QA here
```

After Superpowers implements a task and unit tests pass, run `/qa` in diff-aware mode before committing. This catches visual regressions, broken interactions, and console errors that tests don't cover.

#### setup.md

gstack browse installation and configuration:

- **Dependency:** gstack browse binary (headless Chromium CLI, ~100ms per command).
- **Installation:** Clone gstack, build the browse binary (`cd browse && ./setup`). Requires `bun` (auto-installed if missing).
- **Binary location:** `~/.claude/skills/gstack/browse/dist/browse` or `<project>/.claude/skills/gstack/browse/dist/browse`.
- **First run:** Binary auto-starts a persistent Chromium instance (~3s). Subsequent commands are ~100ms.
- **State persistence:** Cookies, tabs, and login sessions persist between commands within a session.
- **Troubleshooting:** If browse hangs, run `$B restart`. If Chromium crashes, run `$B stop` then retry.

#### testing_patterns.md

QA patterns using the browse binary:

- **Smoke test:** `goto` → `text` → `console --errors` → `is visible ".main-content"`. Takes 5 seconds. Answers: "does the page load without errors?"
- **Flow test:** `goto` → `snapshot -i` → `fill` → `click` → `snapshot -D`. Tests a complete user flow (login, checkout, form submission). The `-D` diff shows exactly what changed.
- **Form test:** Fill with valid data, empty data, edge-case data (very long strings, unicode, HTML). Check: validation messages appear? Form submits? Console errors?
- **Responsive test:** `responsive /tmp/layout` captures mobile (375x812), tablet (768x1024), desktop (1280x720). Compare layouts for breakage.
- **Console monitoring:** `console --errors` after every interaction. JS errors that don't surface visually are still bugs.
- **State verification:** `is visible`, `is enabled`, `is checked`, `is focused` — assert DOM state after actions.
- **Before/after evidence:** `snapshot` before action, `snapshot -D` after. The unified diff is proof the action had the expected effect.

#### auth.md

Authentication patterns for QA testing:

- **Login flow:** `goto /login` → `snapshot -i` → `fill @e1 "email"` → `fill @e2 "password"` → `click @e3` → `snapshot -D` to verify login.
- **Cookie import:** `cookie-import cookies.json` for pre-authenticated sessions. Export cookies from a real browser session.
- **Browser cookie import:** `cookie-import-browser chrome --domain myapp.com` imports cookies directly from Chrome/Arc/Brave/Edge.
- **2FA/OTP:** The skill pauses and asks the user for the code. Cannot be automated.
- **CAPTCHA:** The skill tells the user to complete the CAPTCHA manually, then continue.
- **Session persistence:** Browse keeps cookies between commands. Login once, test all pages.
- **Credential safety:** NEVER include real passwords in QA reports. Use `[REDACTED]` in repro steps.

#### frameworks.md

Framework-specific QA guidance:

**Next.js:**
- Check console for hydration errors (`Hydration failed`, `Text content did not match`).
- Monitor `_next/data` requests — 404s indicate broken data fetching.
- Test client-side navigation (click links, don't just `goto`) — catches routing issues.
- Check for CLS on pages with dynamic content.

**Rails:**
- Check for N+1 query warnings in development console.
- Verify CSRF token presence in forms.
- Test Turbo/Stimulus integration — do page transitions work smoothly?
- Check flash messages appear and dismiss correctly.

**SPA (React, Vue, Angular):**
- Use `snapshot -i` for navigation — `links` command misses client-side routes.
- Check for stale state (navigate away and back — does data refresh?).
- Test browser back/forward — does the app handle history correctly?

**WordPress:**
- Check for plugin conflicts (JS errors from different plugins).
- Verify admin bar for logged-in users.
- Test REST API endpoints (`/wp-json/`).
- Check for mixed content warnings.

**Static sites / SSG:**
- Check all internal links resolve.
- Verify meta tags and Open Graph.
- Test search functionality if present.

---

## 2.2 Web Product Template

**Path:** `templates/web-product/`

Extends `ai-product-template/` with browser QA wired into the workflow.

### Contents

```
templates/web-product/
  CLAUDE.md              # Project instructions with QA in iteration loop
  README.md              # Project description placeholder
  .gitignore             # Standard ignores + .gstack/
  src/                   # Source code
  tests/                 # Unit/integration tests
  .gstack/
    qa-reports/
      .gitkeep           # QA report output directory
```

### CLAUDE.md Additions (beyond ai-product-template)

The web product template's CLAUDE.md includes everything from the base template plus:

- Stack profile reference: "Read `stacks/browser-qa/` before running QA."
- Iteration loop with QA: "After implementing a task and tests pass, run `/qa` to verify before committing."
- Browse binary check: "If browse is not set up, read `stacks/browser-qa/setup.md`."
- QA report location: "QA reports are saved to `.gstack/qa-reports/`."
- Framework hint placeholder: "Declare your framework here (next, rails, react, vue, etc.) for framework-specific QA guidance."

### .gitignore Additions

```
# QA screenshots (generated, not tracked)
.gstack/qa-reports/screenshots/

# Keep the reports themselves
!.gstack/qa-reports/*.md
!.gstack/qa-reports/*.json
```

---

## 2.4 QA Skill

**Path:** `.claude/skills/qa/SKILL.md`

Adapted from gstack's `qa` skill. Four modes for different contexts.

### Frontmatter

```yaml
---
name: qa
description: Use when asked to QA, test, dogfood, or verify a web application — systematically tests pages, documents issues with screenshots, and produces a health score report
---
```

### Modes

#### Diff-aware (default on feature branches)

The workhorse mode. When user runs `/qa` on a feature branch without specifying a URL:

1. Analyse `git diff main...HEAD --name-only` to identify changed files.
2. Map changed files to affected pages/routes:
   - Route/controller files → URL paths they serve
   - View/component files → pages that render them
   - Model/service files → pages that use those models (trace through controllers)
   - CSS/style files → pages that include those stylesheets
   - API endpoints → test directly with `$B js "await fetch('/api/...')"`
3. Detect running local app (check ports 3000, 4000, 5173, 8080).
4. Test each affected page: navigate, screenshot, check console, test interactions if the change was interactive.
5. Cross-reference with commit messages to understand intent — verify the change does what it claims.
6. Report scoped to branch changes: "N pages affected, here's what works and what doesn't."

#### Full

Systematic exploration when no diff context or explicit request:

1. Orient: navigate to root, get page map via `links` and `snapshot -i`.
2. Visit every reachable page. At each:
   - Screenshot (annotated with `-i -a`)
   - Console errors check
   - Interactive element testing (buttons, forms, links)
   - State checks (empty state, loading, error, overflow)
3. Document 5-10 well-evidenced issues.
4. Compute health score.

#### Quick

30-second smoke test:

1. Visit homepage + top 5 navigation targets.
2. Check: page loads? Console errors? Broken links?
3. Compute health score. No detailed issue documentation.

#### Regression

Full mode + baseline comparison:

1. Run full mode.
2. Load `baseline.json` from previous run.
3. Diff: issues fixed, issues new, score delta.
4. Append regression section to report.

### Health Score

Weighted average across categories (0-100):

| Category | Weight | Scoring |
|----------|--------|---------|
| Console | 15% | 0 errors=100, 1-3=70, 4-10=40, 10+=10 |
| Links | 10% | 0 broken=100, each broken -15 |
| Visual | 10% | Start 100, critical -25, high -15, medium -8, low -3 |
| Functional | 20% | Same deduction scale |
| UX | 15% | Same deduction scale |
| Performance | 10% | Same deduction scale |
| Content | 5% | Same deduction scale |
| Accessibility | 15% | Same deduction scale |

### Issue Documentation

Each issue gets:
- Screenshot evidence (before/after for interactive bugs, annotated for static bugs)
- Severity (critical/high/medium/low)
- Category (console/links/visual/functional/UX/performance/content/accessibility)
- Repro steps with `file:line` references where applicable
- Suggested fix

### Output

Reports saved to `.gstack/qa-reports/qa-report-{domain}-{YYYY-MM-DD}.md` with screenshots in `screenshots/` subdirectory. Baseline saved as `baseline.json` for regression mode.

### Factory Integration

- **With ship skill:** QA findings included in PR body. Health score reported.
- **With structural-review:** QA catches visual/interaction issues, structural-review catches code issues. Complementary, not overlapping.
- **Iteration loop position:** After tests pass, before commit. The "does it actually work?" check.

### Dependency

Requires gstack browse binary. At startup:
1. Check for binary at `~/.claude/skills/gstack/browse/dist/browse` or `.claude/skills/gstack/browse/dist/browse`.
2. If not found: direct user to `stacks/browser-qa/setup.md`.
3. If found but not built: offer to run setup.

---

## Future Migration Path

gstack browse is the current engine. If the factory outgrows it:

- **Option A:** Fork gstack browse into a factory-owned tool.
- **Option B:** Build a browse MCP server (fits factory's MCP stack expertise). Exposes the same commands as MCP tools. Any MCP client can use it.
- **Option C:** Use Playwright directly. Less ergonomic (no persistent state, no @e refs) but zero dependency.

The QA skill and stack profile are designed to be engine-agnostic — they describe WHAT to test and HOW to interpret results, not HOW the browser is controlled. Swapping the engine means updating setup.md and the binary path, not rewriting the skill.
