# Browser QA Stack Profile

This stack profile defines how to do browser-based QA testing in AI-Factory web projects.

**This stack layers on top of any web stack.** A project using browser QA references both its primary stack (e.g., TypeScript) and this one. Read the primary stack first.

Before running QA on any web project, Claude must read this stack profile.

---

## Files in This Profile

| File | Read When |
|------|-----------|
| `setup.md` | Setting up browse for the first time or troubleshooting |
| `testing_patterns.md` | Running QA tests — patterns and `$B` command examples |
| `auth.md` | Testing authenticated pages or dealing with login flows |
| `frameworks.md` | QA on Next.js, Rails, SPA, WordPress, or static sites |

---

## Core Principles

1. **Browser QA supplements tests — it does not replace them.** Unit tests cover logic. Browser QA covers experience. Both are needed for critical flows.

2. **"Tests pass" does not mean "it works."** A page can render broken HTML, throw console errors, or show a blank screen while all unit tests pass. Browser QA bridges that gap.

3. **Diff-aware is the default.** Don't test the whole app after every change. Scope QA to what changed — map the git diff to affected routes and test those.

4. **Screenshots are evidence.** Every finding needs visual proof. An issue without a screenshot is an opinion, not a bug report.

5. **Test as a user, not a developer.** Click buttons. Fill forms. Navigate flows. Don't read source code during QA — that's what code review is for.

---

## When to Use Browser QA vs Unit Tests

| Use | Browser QA | Unit Tests |
|-----|-----------|------------|
| Logic and data transformations | | x |
| Edge cases and error handling | | x |
| Visual layout and rendering | x | |
| User flow end-to-end | x | |
| Form interactions | x | x |
| Console errors | x | |
| Responsive layout | x | |
| API response handling | | x |
| Critical user flows | x | x |

---

## Factory Iteration Loop

Browser QA slots in after unit tests pass and before commit:

```
Spec → Design → Implement → Test → QA → Commit → Clear → Repeat
                                    ↑
                             Browser QA here
```

After Superpowers implements a task and unit tests pass, run `/qa` in diff-aware mode. This catches visual regressions, broken interactions, and console errors that tests don't cover.

---

## Dependency

Browser QA uses the [gstack browse](https://github.com/garrytan/gstack) binary — a persistent headless Chromium CLI (~100ms per command). See `setup.md` for installation.
