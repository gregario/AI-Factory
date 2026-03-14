# Bucket 1: Factory Expansion Design

> Cohesive upgrade to the AI Factory's workflow — six items from the short-term roadmap, delivered as local skills, doc updates, and CLAUDE.md enhancements.

**Date:** 2026-03-14
**Source:** `docs/plans/2026-03-14-roadmap.md` (Bucket 1, items 1.1–1.6)
**Inspiration:** [gstack by Garry Tan](https://github.com/garrytan/gstack) (MIT). Product Taste, Structural Review, Factory Retrospective, and Ship skills adapt ideas from gstack's `plan-ceo-review`, `review`, `retro`, and `ship` skills respectively, reoriented for a solo AI product factory with stack-agnostic design.

---

## Delivery Overview

| # | Item | Delivery Mechanism |
|---|------|--------------------|
| 1.1 | Product Taste | Skill: `.claude/skills/product-taste/SKILL.md` |
| 1.2 | Enhanced Ship | Skill: `.claude/skills/ship/SKILL.md` |
| 1.3 | Structural Review | Skill: `.claude/skills/structural-review/SKILL.md` |
| 1.4 | Factory Retrospective | Skill: `.claude/skills/factory-retrospective/SKILL.md` |
| 1.5 | AI Image Guardrails | Docs: `stacks/godot/ai_assets.md` guardrails section + factory-level CLAUDE.md rules |
| 1.6 | Cognitive Modes | CLAUDE.md: new "Cognitive Postures" section |

### Skills Structure

```
.claude/skills/
  product-taste/SKILL.md        ← 1.1
  ship/SKILL.md                 ← 1.2
  structural-review/SKILL.md    ← 1.3
  factory-retrospective/SKILL.md ← 1.4
```

Skills are local to the AI-Factory repo, force-added to git (`.claude/` is gitignored by default). No plugin registration needed — Claude Code discovers skills in `.claude/skills/` automatically.

---

## 1.1 Product Taste

**Trigger:** Before proposing new features. Use when about to create a spec, propose a feature, or define what to build — before committing to a direction.

**Philosophy:** Adapted from gstack's `plan-ceo-review` Step 0. The insight: most features fail not because they're badly built, but because they solve the wrong problem or the obvious version instead of the right one. This skill pressure-tests the idea before it becomes a spec.

### Flow

1. **Quick triage** — Is this a small enhancement/bugfix or a new feature?
   - Small stuff (bugfix, config change, minor tweak): lighter pass — just premise challenge (step 2), then exit with "proceed to spec."
   - New feature or significant enhancement: full treatment (all steps).

2. **Premise challenge** (from gstack 0A)
   - Is this the right problem to solve? Could a different framing yield a simpler or more impactful solution?
   - What is the actual user/business outcome? Is this the most direct path, or is it solving a proxy problem?
   - What happens if we do nothing? Real pain point or hypothetical?

3. **Who is this for?**
   - Name the user persona concretely. "Users" is not acceptable.
   - What do they feel before this feature exists? What do they feel after?
   - Prevents building for abstract audiences.

4. **Existing work leverage** (from gstack 0B)
   - What already exists in the codebase that partially or fully solves this?
   - Are we rebuilding something? If so, why is rebuilding better than refactoring?
   - Check existing specs/tasks to avoid duplicating work.

5. **Mode selection** (from gstack 0F)
   - **EXPANSION:** The idea is good but could be great. Push scope up. Dream big. "What would make this 10x better for 2x the effort?"
   - **HOLD:** The scope is right. Validate it with rigour. Minimum viable version that achieves the goal.
   - **REDUCTION:** The idea is overbuilt. Strip to essentials. What's the absolute minimum that ships value?
   - Context-dependent defaults: greenfield → EXPANSION, enhancement → HOLD, overbuilt idea → REDUCTION.
   - Once selected, commit fully. Do not drift.

6. **Mode-specific analysis**
   - EXPANSION (from gstack 0D):
     - 10x check: What's the version that's 10x more ambitious for 2x the effort?
     - Platonic ideal: If the best product person had unlimited time, what would this feel like to use?
     - Delight opportunities: 3+ adjacent improvements that would make a user think "oh nice, they thought of that."
   - HOLD:
     - Complexity check: Can the same goal be achieved with fewer moving parts?
     - Minimum scope: What is the minimum set of changes that achieves the stated goal?
   - REDUCTION:
     - Ruthless cut: What is the absolute minimum that ships value? Everything else deferred.
     - What can be a follow-up?

7. **Dream state mapping** (from gstack 0C)
   ```
   CURRENT STATE          →    THIS FEATURE          →    12-MONTH IDEAL
   [describe]                  [describe delta]            [describe target]
   ```
   Does this move toward the vision or away from it?

8. **Output:** A sharpened brief (1 paragraph) capturing the refined idea, ready to feed into `/opsx:propose`.

### What's NOT in this skill

No architecture review, no error maps, no code analysis, no security review. Pure product thinking. Engineering rigour lives in structural-review (1.3).

---

## 1.2 Enhanced Ship

**Trigger:** When ready to ship a feature branch. Use when implementation is complete and you want to merge, test, changelog, version bump, commit, push, and create a PR in one workflow.

**Philosophy:** Adapted from gstack's `ship` skill. The last mile of shipping has too much friction — changelog writing, version bumping, commit message crafting, PR formatting. Automate the mechanical parts, keep human gates for the important decisions.

### Flow

1. **Pre-flight**
   - Check branch — abort if on main: "Ship from a feature branch."
   - `git status` (never `-uall`) — uncommitted changes are always included.
   - `git diff main...HEAD --stat` + `git log main..HEAD --oneline` — understand what's being shipped.

2. **Merge origin/main**
   - `git fetch origin main && git merge origin/main --no-edit`
   - If conflicts: attempt auto-resolve for trivial cases (VERSION, CHANGELOG ordering). Stop on complex conflicts.

3. **Run tests**
   - Detect test runner from project context: read CLAUDE.md, stack profile, package.json, Makefile, or project.godot.
   - Run detected test command. Stop on failure — show failures, do not proceed.
   - Stack-agnostic: works with GUT, Jest/Vitest, pytest, go test, or whatever the project uses.

4. **Pre-landing review**
   - If structural-review skill (1.3) is available, invoke it.
   - Otherwise, do a lightweight diff-scan for obvious issues (console.log left in, TODO/FIXME, commented-out code, hardcoded secrets).

5. **Version bump**
   - Auto-detect version file format:
     - `VERSION` file (plain text, 3 or 4-digit)
     - `package.json` (`version` field)
     - `project.godot` (if applicable)
   - Auto-decide bump level from diff size:
     - PATCH: < 50 lines, trivial changes
     - MINOR: 50+ lines, features or significant changes
     - MAJOR: Ask user — only for milestones or breaking changes
   - Bumping a digit resets all digits to its right.

6. **Changelog**
   - Auto-generate from `git log main..HEAD --oneline` + diff analysis.
   - Categorise: Added / Changed / Fixed / Removed.
   - Insert at top of CHANGELOG.md (create if none exists).
   - Format: `## [X.Y.Z] - YYYY-MM-DD`

7. **Commit splitting**
   - Group changes into logical, bisectable commits.
   - Ordering: infrastructure → models/services → views/UI → version+changelog.
   - Each commit independently valid (no broken imports).
   - Single commit if diff < 50 lines across < 4 files.
   - Commit message format: `<type>: <summary>` (feat/fix/chore/refactor/docs).

8. **Push + PR**
   - `git push -u origin <branch>`
   - Create PR via `gh pr create` with: summary from changelog, test results, review findings.
   - Output the PR URL as the final line.

### Key Design Decisions

- **Stack-agnostic test detection:** No hardcoded test commands. Read project config to find the right runner.
- **No Greptile integration:** May add later as a Bucket 2 item.
- **No eval suites:** gstack's eval tier system is specific to LLM-heavy products. Not needed at factory level.
- **Structural review integration:** If the structural-review skill exists, invoke it as step 4. This means ship and structural-review compose naturally.

---

## 1.3 Structural Review

**Trigger:** Before landing a feature branch or creating a PR. Use when code changes need a structural audit for issues that tests don't catch — race conditions, trust boundaries, missing error handling, tests that pass while missing the real failure mode.

**Philosophy:** Adapted from gstack's `review` skill and the engineering review sections (1–10) of `plan-ceo-review`. The existing superpowers code-review checks "does this match the plan?" This skill asks "will this survive production?" Different posture: skeptical, structural, paranoid.

### Flow

1. **Branch check** — Abort if on main or no diff against origin/main.

2. **Get the diff** — `git fetch origin main --quiet && git diff origin/main`

3. **Two-pass review**

**Pass 1 — CRITICAL (stop-the-line issues):**

- **Data safety** — Destructive operations (deletes, overwrites, resets) without guards. Missing validations on data mutations. Unprotected bulk operations.
- **Trust boundaries** — User input flowing to dangerous sinks: shell execution, eval, SQL queries, file system paths, LLM prompts, template rendering. Any place where controlled input reaches an uncontrolled interpreter.
- **State mutations** — Side effects in unexpected places (getters that mutate, constructors that write). Missing rollback paths for multi-step operations. State changes without corresponding undo capability.
- **Race conditions** — Concurrent access to shared state (files, globals, singletons) without synchronisation. Signal re-entrancy (especially in Godot). Async operations that assume ordering.

**Pass 2 — STRUCTURAL (quality and resilience):**

- **Error handling** — Swallowed errors (catch with only a log). Generic catches (catch-all without re-raise). Missing error paths (what happens when the API/file/service is unavailable?). For each new error path: what fails, what does the user see, is it tested?
- **Test gaps** — New codepaths without corresponding tests. Tests that only cover happy path. Tests that mock the thing they should be testing. Tests that pass trivially.
- **Security** — New attack surface (endpoints, params, file paths). Input validation gaps. Auth scoping (can user A access user B's data?). Secrets handling (hardcoded, not rotatable). New dependencies with unknown security posture.
- **Performance** — N+1 patterns or equivalent (repeated lookups in loops). Unbounded collections (loading all records, no pagination). Expensive operations in hot paths. Missing caching for repeated expensive computation.
- **Observability** — Can you debug this in production from logs alone? New codepaths without logging. Error states that are invisible. Missing metrics for new features.
- **Reversibility** — If this breaks post-ship, what's the rollback? Feature flag? Git revert? Data migration rollback? How long does rollback take?

4. **Output format**
   - Terse. One line problem, one line fix. File and line references.
   - CRITICAL findings: one AskUserQuestion per issue with options:
     - A) Fix it now (recommended fix described)
     - B) Acknowledge and proceed
     - C) False positive — skip
   - Non-critical findings: listed as informational, no questions.
   - If no issues: "Structural Review: No issues found."

### Key Design Decisions

- **Stack-agnostic:** No Rails-specific checks (ActiveRecord N+1, rescue patterns, SQL migrations). The categories are universal — every stack has data safety, trust boundaries, race conditions, error handling.
- **No checklist file:** Unlike gstack's `review` which reads from `checklist.md`, this skill is self-contained. The checklist is in the skill itself. Simpler, no external dependency.
- **Composable with ship:** The ship skill (1.2) invokes this as its pre-landing step. But it also works standalone — you can run it independently any time.

---

## 1.4 Factory Retrospective

**Trigger:** Manual — run `/factory-retro` when curious about factory performance. Gentle nudge at session start if 7+ days since last retro.

**Philosophy:** Adapted from gstack's `retro` skill. Reoriented from team-aware single-repo weekly retro to solo cross-project factory analysis. The question isn't "how is the team doing?" but "how is the factory performing across all its products?"

### Arguments

- `/factory-retro` — default: last 7 days
- `/factory-retro 14d` — last 14 days
- `/factory-retro 30d` — last 30 days
- `/factory-retro compare` — compare current window vs prior same-length window

### Flow

1. **Cross-project data gathering**
   - Scan `projects/` directory for git repos.
   - For each project with commits in the window, gather: commit count, LOC (insertions/deletions), test LOC ratio, commit type breakdown (feat/fix/refactor/test/chore), active days.

2. **Factory-wide metrics table**

   | Metric | Value |
   |--------|-------|
   | Projects touched | N |
   | Total commits | N |
   | Total LOC (net) | N |
   | Test LOC ratio | N% |
   | Feat/fix ratio | N% / N% |
   | Active days | N |
   | Sessions detected | N |
   | AI-assisted commits | N% |
   | Shipping streak | N days |

3. **Per-project breakdown** — For each active project: commits, LOC, test ratio, biggest ship, commit type mix. Sorted by commit count descending.

4. **Session analysis** (from gstack)
   - 45-minute gap detection between commits (across all projects).
   - Classify: deep (50+ min), medium (20–50 min), micro (<20 min).
   - Calculate: total active coding time, average session length, LOC/hour.
   - Peak hours histogram (local time).

5. **Focus score** — Percentage of commits in the most-active project. Higher = deeper focused work, lower = scattered context-switching.

6. **Shipping streak** — Consecutive days with at least 1 commit across any factory project. Queries full history for accuracy.

7. **Quality signals**
   - Test ratio trend (if prior retros exist).
   - Fix ratio — flag if >50% ("ship fast, fix fast" pattern).
   - Hotspot files — same files churning across sessions.

8. **Trends vs last retro** — Load from `.context/retros/`, show deltas for key metrics with arrows.

9. **Save snapshot** — JSON to `AI-Factory/.context/retros/YYYY-MM-DD-N.json`. Schema:
   ```json
   {
     "date": "2026-03-14",
     "window": "7d",
     "metrics": {
       "projects_touched": 3,
       "commits": 47,
       "net_loc": 2400,
       "test_ratio": 0.41,
       "feat_pct": 0.40,
       "fix_pct": 0.30,
       "active_days": 6,
       "sessions": 14,
       "deep_sessions": 5,
       "ai_assisted_pct": 0.85,
       "streak_days": 12
     },
     "projects": {
       "beerbrew-tycoon": { "commits": 30, "net_loc": 1800, "test_ratio": 0.45 },
       "warhammer-oracle": { "commits": 12, "net_loc": 400, "test_ratio": 0.38 }
     }
   }
   ```

10. **Narrative output**
    - Tweetable summary (first line)
    - Factory-wide metrics table
    - Trends vs last retro (if available)
    - Time & session patterns
    - Per-project highlights
    - Focus score with interpretation
    - 3 wins, 3 things to improve, 3 habits for next week

### Nudge Mechanism

Added to CLAUDE.md (not in the skill itself):
- At conversation start, if `.context/retros/` exists, check the most recent file's date.
- If 7+ days since last retro: mention it once. "It's been N days since your last factory retro. Run `/factory-retro` when you're curious."
- No blocking. No repeating. Just awareness.

### Key Design Decisions

- **Cross-project:** Scans all repos under `projects/`. This is the unique value over gstack's single-repo retro.
- **Solo-oriented:** No team breakdown, no per-person praise/growth (it's just you). AI co-authorship tracked as a metric, not a team member.
- **Data lives in AI-Factory:** Retro snapshots in the factory repo, not in each project. Factory-level view.
- **Compare mode:** Side-by-side current vs prior window. Same approach as gstack.

---

## 1.5 AI Image Guardrails

**Delivery:** Documentation updates (not a skill).

### Changes

**1. Add guardrails section to `stacks/godot/ai_assets.md`:**

Currently this doc covers the workflow for AI image generation in Godot projects. Add a `## Guardrails` section with stack-specific guidance (asset import, resolution, format checks).

**2. Add factory-level rules to `CLAUDE.md`:**

These rules apply to ALL projects using AI image generation, regardless of stack:

**Per-session limits:**
- Max 10 image generations per session without explicit user approval.
- After 10: pause and report count + estimated cost before continuing.

**Budget gates:**
- Before any batch generation (>3 images): report estimated cost and ask for approval.
- Track cumulative generation count per session.

**Prompt validation:**
- Reject prompts that are too vague ("make it look good") — require specific art direction.
- Reject prompts that duplicate recent generations (check against session history).
- Require reference to art direction doc or style guide for consistency.

**Quality checkpoints:**
- After generating 3+ assets: pause for human review before continuing.
- Never auto-integrate generated assets into the project without human approval.

---

## 1.6 Cognitive Modes

**Delivery:** New section in CLAUDE.md.

### Addition

New section added after THREE STRICT MODES:

```
COGNITIVE POSTURES (within Execution Mode)

When in Execution Mode, the Engineer adopts different postures
depending on the task. These are not modes — they don't need
explicit switching. Skills activate the right posture automatically:

- BUILDER: Writing new code. TDD rhythm. Forward momentum.
  Skills: test-driven-development, writing-plans, executing-plans,
  subagent-driven-development

- REVIEWER: Examining code for correctness and quality.
  Skeptical posture. Looking for what's wrong, not what's right.
  Skills: code-review, structural-review,
  requesting-code-review, receiving-code-review

- DEBUGGER: Investigating failures. Hypothesis-driven.
  No guessing, no shotgun fixes.
  Skills: systematic-debugging

- SHIPPER: Getting code landed. Changelog, version, PR.
  Momentum without cutting corners.
  Skills: ship, finishing-a-development-branch,
  verification-before-completion

The key insight: each posture has a DIFFERENT relationship to
the code. A builder adds, a reviewer questions, a debugger
investigates, a shipper packages. Mixing postures (e.g.,
reviewing while building) leads to weak reviews and slow builds.
```

This makes explicit what Superpowers already does implicitly, and creates named slots for the new skills (structural-review → REVIEWER, ship → SHIPPER).

---

## Future Considerations (Bucket 2)

The skills directory is designed to accommodate future additions:

```
.claude/skills/
  # Bucket 2 (medium-term):
  browser-qa/SKILL.md          ← 2.1 Browser QA integration
  diff-aware-qa/SKILL.md       ← 2.4 Diff-aware QA
```

gstack's `qa`, `test`, and `browse` skills will inform these when the time comes.

New stack profiles (beyond Godot/TypeScript/MCP) will work with all Bucket 1 skills — everything is stack-agnostic by design.
