# Bucket 1 Factory Expansion — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement all 6 short-term roadmap items as 4 new skills, 1 doc update, and 1 CLAUDE.md update.

**Architecture:** New skills live in `.claude/skills/` as local skills (same pattern as existing openspec skills). CLAUDE.md gets two new sections (cognitive postures + retro nudge + image guardrails). The godot ai_assets doc gets a guardrails section.

**Tech Stack:** Markdown skills (SKILL.md format), CLAUDE.md configuration

**Design doc:** `docs/plans/2026-03-14-bucket1-factory-expansion-design.md`

**Credit:** Skills 1.1, 1.2, 1.3, 1.4 adapted from [gstack by Garry Tan](https://github.com/garrytan/gstack) (MIT).

---

### Task 1: Create the ai-factory skills directory structure

**Files:**
- Create: `.claude/skills/product-taste/SKILL.md` (placeholder)
- Create: `.claude/skills/ship/SKILL.md` (placeholder)
- Create: `.claude/skills/structural-review/SKILL.md` (placeholder)
- Create: `.claude/skills/factory-retrospective/SKILL.md` (placeholder)

**Step 1: Create all four skill directories with minimal placeholder SKILL.md files**

Each placeholder should have valid frontmatter (name, description) and a single line body: `<!-- TODO: implement -->`. This validates the directory structure works before we fill in content.

```markdown
---
name: product-taste
description: Use when about to propose a new feature or create a spec — challenges the idea with product thinking before committing to a direction
---

<!-- TODO: implement -->
```

```markdown
---
name: ship
description: Use when ready to ship a feature branch — merge main, run tests, structural review, changelog, version bump, bisectable commits, push, create PR
---

<!-- TODO: implement -->
```

```markdown
---
name: structural-review
description: Use when about to land a feature branch or create a PR — structural audit for issues tests don't catch like race conditions, trust boundary violations, missing error handling
---

<!-- TODO: implement -->
```

```markdown
---
name: factory-retrospective
description: Use when curious about factory performance — analyses git history across all projects for velocity, quality, and session patterns with persistent trend tracking
---

<!-- TODO: implement -->
```

**Step 2: Verify the skills appear**

Run: `ls -la .claude/skills/*/SKILL.md`
Expected: 8 SKILL.md files (4 existing openspec + 4 new)

**Step 3: Commit**

```bash
git add .claude/skills/product-taste/SKILL.md .claude/skills/ship/SKILL.md .claude/skills/structural-review/SKILL.md .claude/skills/factory-retrospective/SKILL.md
git commit -m "chore: scaffold ai-factory skill directories"
```

---

### Task 2: Implement Product Taste skill (1.1)

**Files:**
- Modify: `.claude/skills/product-taste/SKILL.md`
- Reference: `docs/plans/2026-03-14-bucket1-factory-expansion-design.md` (section 1.1)

**Step 1: Write the full SKILL.md**

Replace the placeholder with the full skill. Key sections from the design doc:

```markdown
---
name: product-taste
description: Use when about to propose a new feature or create a spec — challenges the idea with product thinking before committing to a direction
---

# Product Taste

> Adapted from [gstack](https://github.com/garrytan/gstack) by Garry Tan (MIT)

## Overview

Pressure-test an idea before it becomes a spec. Most features fail not because they're badly built, but because they solve the wrong problem or the obvious version instead of the right one.

Run this BEFORE `/opsx:propose`. Output: a sharpened brief ready to feed into the spec process.

## Flow

### 1. Quick Triage

Is this a small enhancement/bugfix or a new feature?

- **Small** (bugfix, config change, minor tweak): run only the Premise Challenge (step 2), then output "Proceed to spec" with a one-line summary.
- **New feature or significant enhancement**: full treatment (all steps).

### 2. Premise Challenge

Ask these three questions. One at a time via AskUserQuestion.

1. **Is this the right problem?** Could a different framing yield a simpler or more impactful solution? What is the actual user outcome — is this the most direct path, or is it solving a proxy problem?
2. **What happens if we do nothing?** Real pain point or hypothetical? If the answer is "not much," challenge whether this is worth building.
3. **What already exists?** Check the codebase for existing code, specs, or tasks that partially solve this. Are we rebuilding something? If yes, why is rebuilding better than extending?

If any answer reveals a fundamentally different direction, say so. "Based on your answers, the real feature might be X, not Y."

### 3. Who Is This For?

Ask: "Name the specific user. What do they feel before this feature? What do they feel after?"

"Users" is not acceptable. A persona must be concrete enough to imagine sitting next to them.

### 4. Mode Selection

Present three options via AskUserQuestion:

- **A) EXPANSION** — The idea is good but could be great. Push scope up. "What would make this 10x better for 2x the effort?" Default for greenfield features.
- **B) HOLD** — The scope is right. Validate it. What's the minimum that achieves the goal? Default for enhancements.
- **C) REDUCTION** — The idea is overbuilt. Strip to essentials. What's the absolute minimum that ships value? Suggest when scope feels bloated.

Once selected, commit fully. Do not drift to another mode.

### 5. Mode-Specific Analysis

**EXPANSION:**
- **10x check:** What's the version that's 10x more ambitious for 2x the effort? Describe it concretely.
- **Platonic ideal:** If the best product person had unlimited time, what would this feel like to use? Start from experience, not architecture.
- **Delight opportunities:** List 3+ adjacent improvements (<30 min each) that would make a user think "oh nice, they thought of that."

**HOLD:**
- **Complexity check:** Can the same goal be achieved with fewer moving parts?
- **Minimum scope:** What is the minimum set of changes that achieves the stated goal? Flag anything that could be deferred.

**REDUCTION:**
- **Ruthless cut:** What is the absolute minimum that ships value? Everything else is deferred.
- **Follow-ups:** What can be a separate task later?

### 6. Dream State Mapping

```
CURRENT STATE          →    THIS FEATURE          →    12-MONTH IDEAL
[describe]                  [describe delta]            [describe target]
```

Does this feature move toward the 12-month vision or away from it? If away, flag it.

### 7. Output

Write a **sharpened brief** — one paragraph capturing:
- The refined problem statement
- The target user and their before/after
- The chosen mode and resulting scope
- Key decisions made during the challenge

This brief is the input for `/opsx:propose`.

## What This Skill Does NOT Do

No architecture review. No error maps. No code analysis. No security review. Pure product thinking. Engineering rigour lives in the structural-review skill.

## Rules

- One question at a time via AskUserQuestion.
- Present options as lettered choices (A/B/C) with a recommendation.
- If the idea is genuinely good as stated, say so and move quickly. Don't manufacture objections.
- If the idea is fundamentally wrong, say "scrap it and do this instead." Be direct.
```

**Step 2: Review the skill for completeness against the design doc section 1.1**

Read the design doc section and verify all elements are covered.

**Step 3: Commit**

```bash
git add .claude/skills/product-taste/SKILL.md
git commit -m "feat: implement product-taste skill (1.1)

Adapted from gstack plan-ceo-review. Pre-spec product thinking
that challenges ideas before they become specs."
```

---

### Task 3: Implement Structural Review skill (1.3)

**Files:**
- Modify: `.claude/skills/structural-review/SKILL.md`
- Reference: `docs/plans/2026-03-14-bucket1-factory-expansion-design.md` (section 1.3)

**Step 1: Write the full SKILL.md**

```markdown
---
name: structural-review
description: Use when about to land a feature branch or create a PR — structural audit for issues tests don't catch like race conditions, trust boundary violations, missing error handling
---

# Structural Review

> Adapted from [gstack](https://github.com/garrytan/gstack) by Garry Tan (MIT)

## Overview

Pre-landing structural audit. The existing code-review skill checks "does this match the plan?" This skill asks "will this survive production?" Different posture: skeptical, structural, paranoid.

Run before shipping, creating a PR, or merging to main. The ship skill invokes this automatically.

## Step 1: Branch Check

1. Run `git branch --show-current`.
2. If on `main`: output "Nothing to review — you're on main." and stop.
3. Run `git fetch origin main --quiet && git diff origin/main --stat`.
4. If no diff: output "Nothing to review — no changes against main." and stop.

## Step 2: Get the Diff

```bash
git fetch origin main --quiet
git diff origin/main
```

This includes both committed and uncommitted changes against origin/main.

Also gather context:
```bash
git log main..HEAD --oneline
git diff origin/main --stat
```

## Step 3: Two-Pass Review

Apply both passes against the full diff. Read the ENTIRE diff before commenting — do not flag issues already addressed elsewhere in the diff.

### Pass 1 — CRITICAL (stop-the-line issues)

**Data Safety:**
- Destructive operations (deletes, overwrites, drops, resets) without guards or confirmation
- Missing validations on data mutations
- Unprotected bulk operations (batch delete, mass update without limits)

**Trust Boundaries:**
- User input flowing to dangerous sinks: shell execution (`exec`, `system`, `OS.execute`), `eval`, SQL queries, file system paths, LLM prompts, template rendering
- Any path where controlled input reaches an uncontrolled interpreter
- Deserialization of untrusted data

**State Mutations:**
- Side effects in unexpected places (getters that mutate state, constructors that write to disk)
- Missing rollback paths for multi-step operations
- State changes without corresponding undo capability
- Global state modification without synchronisation

**Race Conditions:**
- Concurrent access to shared state (files, globals, singletons) without locks or guards
- Signal re-entrancy (especially in Godot: signal handlers calling methods that emit the same signal)
- Async operations that assume ordering
- Time-of-check to time-of-use (TOCTOU) gaps

### Pass 2 — STRUCTURAL (quality and resilience)

**Error Handling:**
- Swallowed errors (catch block with only a log, no re-raise or recovery)
- Generic catches (catch-all that masks specific failures)
- Missing error paths — what happens when the API/file/service/database is unavailable?
- For each new error path: what fails, what does the user see, is it tested?

**Test Gaps:**
- New codepaths without corresponding test coverage
- Tests that only cover happy path
- Tests that mock the thing they should be testing (mock hides the real behavior)
- Tests that pass trivially (always true assertions, testing constants)

**Security:**
- New attack surface (endpoints, params, file paths, exposed APIs)
- Input validation gaps (missing length limits, type checks, sanitisation)
- Auth scoping (can user A access user B's data by changing an ID?)
- Secrets handling (hardcoded values, credentials in source, non-rotatable tokens)
- New dependencies with unknown security posture

**Performance:**
- Repeated lookups in loops (N+1 patterns or equivalent)
- Unbounded collections (loading all records/files without pagination or limits)
- Expensive operations in hot paths (computation, I/O, network calls in loops)
- Missing caching for repeated expensive computations

**Observability:**
- Can you debug this in production from logs alone?
- New codepaths without any logging or error reporting
- Error states that are invisible to the operator
- Missing metrics or health indicators for new features

**Reversibility:**
- If this breaks post-ship, what's the rollback plan?
- Is it a git revert? Feature flag? Data migration rollback?
- How long does rollback take? Minutes or hours?

## Step 4: Output

**Format:** Terse. One line problem, one line fix. Include file path and line number where possible.

**CRITICAL findings:** One AskUserQuestion per issue:
- Describe the problem with file:line reference
- Recommend a specific fix
- Options:
  - A) Fix it now (describe the fix)
  - B) Acknowledge and proceed anyway
  - C) False positive — skip

**Non-critical findings:** Listed as informational. No questions needed.

**If no issues found:** Output `Structural Review: No issues found.`

**Summary header:** `Structural Review: N issues (X critical, Y informational)`

## Rules

- **Read the FULL diff before commenting.** Do not flag issues already addressed elsewhere in the diff.
- **Read-only by default.** Only modify files if the user explicitly chooses "Fix it now" on a critical issue.
- **Be terse.** One line problem, one line fix. No preamble, no filler.
- **Only flag real problems.** Skip anything that's fine. Do not manufacture findings.
- **Stack-agnostic.** These categories apply to any language or framework. Do not assume Rails, Node, or any specific stack.
```

**Step 2: Verify against design doc section 1.3**

**Step 3: Commit**

```bash
git add .claude/skills/structural-review/SKILL.md
git commit -m "feat: implement structural-review skill (1.3)

Pre-landing paranoid audit for race conditions, trust boundaries,
error handling gaps, and structural issues tests don't catch."
```

---

### Task 4: Implement Enhanced Ship skill (1.2)

**Files:**
- Modify: `.claude/skills/ship/SKILL.md`
- Reference: `docs/plans/2026-03-14-bucket1-factory-expansion-design.md` (section 1.2)

**Step 1: Write the full SKILL.md**

```markdown
---
name: ship
description: Use when ready to ship a feature branch — merge main, run tests, structural review, changelog, version bump, bisectable commits, push, create PR
---

# Ship

> Adapted from [gstack](https://github.com/garrytan/gstack) by Garry Tan (MIT)

## Overview

Fully automated ship workflow. User says `/ship`, next thing they see is the PR URL.

**Non-interactive by default.** Do NOT ask for confirmation except where noted. The user said `/ship` — do it.

**Only stop for:**
- On `main` branch (abort)
- Merge conflicts that can't be auto-resolved (stop, show conflicts)
- Test failures (stop, show failures)
- Structural review finds CRITICAL issues (user decides per issue)
- MAJOR version bump needed (ask)

## Step 1: Pre-flight

1. Run `git branch --show-current`. If on `main`, abort: "Ship from a feature branch."
2. Run `git status` (never `-uall`). Uncommitted changes are always included.
3. Run `git diff main...HEAD --stat` and `git log main..HEAD --oneline` to understand what's being shipped.

## Step 2: Merge origin/main

Fetch and merge so tests run against the merged state:

```bash
git fetch origin main && git merge origin/main --no-edit
```

If merge conflicts: try to auto-resolve trivial cases (VERSION, CHANGELOG ordering). Stop on complex conflicts and show them.

If already up to date: continue silently.

## Step 3: Run Tests

Detect the test runner from project context. Check in order:
1. Project's `CLAUDE.md` — look for test commands
2. Stack profile reference — read the relevant `stacks/*/testing.md`
3. `Makefile` — look for `test` target
4. `package.json` — look for `test` script
5. GUT test infrastructure — look for `tests/` dir with `.gd` test files

Run the detected test command. If multiple test suites exist, run them all.

**If any test fails:** Show the failures and STOP. Do not proceed.
**If all pass:** Note the counts briefly and continue.

## Step 4: Structural Review

Invoke the structural-review skill (read `.claude/skills/structural-review/SKILL.md` and follow its process).

- If CRITICAL issues found: follow the structural-review flow (AskUserQuestion per issue). If user chose "Fix it now" on any issue, apply fixes, commit them, then STOP and tell user to run `/ship` again to re-test.
- If only non-critical issues: note them and continue. They go into the PR body.
- If no issues: continue.

Save the review output for the PR body (Step 8).

## Step 5: Version Bump

1. Auto-detect version file:
   - `VERSION` file (plain text)
   - `package.json` (`version` field)
   - `project.godot` (`config/version`)
   - If none found: skip this step and Step 6.

2. Auto-decide bump level from diff size:
   - `git diff origin/main...HEAD --stat | tail -1` — count lines changed
   - **PATCH** (3rd digit): default for most changes
   - **MINOR** (2nd digit): 500+ lines or significant new feature — AskUserQuestion
   - **MAJOR** (1st digit): AskUserQuestion — only for milestones or breaking changes

3. Compute new version (bumping resets digits to the right).
4. Write the new version to the detected file.

## Step 6: Changelog

1. Read `CHANGELOG.md` header to match format (create file if none exists).
2. Auto-generate from `git log main..HEAD --oneline` + diff analysis.
3. Categorise into applicable sections:
   - `### Added` — new features
   - `### Changed` — changes to existing functionality
   - `### Fixed` — bug fixes
   - `### Removed` — removed features
4. Format: `## [X.Y.Z] - YYYY-MM-DD`
5. Insert after file header.

Do NOT ask the user to describe changes. Infer from the diff and commit history.

## Step 7: Commit (bisectable chunks)

Analyse the diff and group changes into logical, bisectable commits.

**Ordering** (earlier commits first):
1. Infrastructure: config, build changes, new dependencies
2. Core: models, services, autoloads, libraries (with their tests)
3. UI: views, scenes, components (with their tests)
4. Version + Changelog: always the final commit

**Rules:**
- A source file and its test file go in the same commit.
- Each commit must be independently valid — no broken imports.
- If total diff < 50 lines across < 4 files: single commit is fine.
- Format: `<type>: <summary>` (feat/fix/chore/refactor/docs)
- Only the final commit (version + changelog) gets the co-author trailer.

## Step 8: Push + PR

```bash
git push -u origin <branch-name>
```

Create PR:
```bash
gh pr create --title "<type>: <summary>" --body "$(cat <<'EOF'
## Summary
<bullet points from changelog>

## Structural Review
<findings from Step 4, or "No issues found.">

## Tests
- [x] All tests pass (N tests, 0 failures)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Output the PR URL** — this is the final output.

## Rules

- Never skip tests. If tests fail, stop.
- Never skip structural review.
- Never force push. Regular `git push` only.
- Never ask for confirmation except for MAJOR version bumps and CRITICAL review findings.
- Split commits for bisectability — each commit = one logical change.
- The goal: user says `/ship`, next thing they see is review + PR URL.
```

**Step 2: Verify against design doc section 1.2**

**Step 3: Commit**

```bash
git add .claude/skills/ship/SKILL.md
git commit -m "feat: implement ship skill (1.2)

Automated shipping: merge, test, structural review, changelog,
version bump, bisectable commits, push, and PR creation."
```

---

### Task 5: Implement Factory Retrospective skill (1.4)

**Files:**
- Modify: `.claude/skills/factory-retrospective/SKILL.md`
- Reference: `docs/plans/2026-03-14-bucket1-factory-expansion-design.md` (section 1.4)

**Step 1: Write the full SKILL.md**

```markdown
---
name: factory-retrospective
description: Use when curious about factory performance — analyses git history across all projects for velocity, quality, and session patterns with persistent trend tracking
---

# Factory Retrospective

> Adapted from [gstack](https://github.com/garrytan/gstack) by Garry Tan (MIT)

## Overview

Cross-project engineering retrospective for the AI Factory. Analyses commit history, work patterns, and quality metrics across all projects in `projects/`. Saves snapshots for trend tracking.

## User-invocable

When the user types `/factory-retro`, run this skill.

## Arguments

- `/factory-retro` — last 7 days (default)
- `/factory-retro 14d` — last 14 days
- `/factory-retro 30d` — last 30 days
- `/factory-retro compare` — compare current window vs prior same-length window

Parse the argument. Default to 7 days. If argument doesn't match `Nd` or `compare` (with optional `Nd`), show usage and stop.

## Step 1: Gather Data

Scan `projects/` for git repos:

```bash
for dir in projects/*/; do
  if [ -d "$dir/.git" ]; then
    echo "REPO:$dir"
    git -C "$dir" log origin/main --since="<window>" --format="%H|%aN|%ai|%s" --shortstat 2>/dev/null
  fi
done
```

For each repo with commits in the window, also gather:

```bash
# Per-commit test vs production LOC
git -C "$dir" log origin/main --since="<window>" --format="COMMIT:%H" --numstat

# Commit timestamps for session detection
git -C "$dir" log origin/main --since="<window>" --format="%at|%s" | sort -n

# Hotspot files
git -C "$dir" log origin/main --since="<window>" --format="" --name-only | grep -v '^$' | sort | uniq -c | sort -rn | head -10

# Commit type counts
git -C "$dir" log origin/main --since="<window>" --format="%s" | grep -oE '^(feat|fix|chore|refactor|test|docs):' | sort | uniq -c

# AI-assisted commit ratio
git -C "$dir" log origin/main --since="<window>" --format="%b" | grep -c "Co-Authored-By.*anthropic\|Co-Authored-By.*claude" || echo 0
```

Also gather the shipping streak (consecutive days with commits across any project):
```bash
for dir in projects/*/; do
  [ -d "$dir/.git" ] && git -C "$dir" log origin/main --format="%ad" --date=format:"%Y-%m-%d" 2>/dev/null
done | sort -u
```
Count backward from today — how many consecutive days have at least one commit?

## Step 2: Factory-Wide Metrics

Aggregate across all projects and present:

| Metric | Value |
|--------|-------|
| Projects touched | N |
| Total commits | N |
| Total LOC (net) | +N / -N |
| Test LOC ratio | N% |
| Feat/fix ratio | N% / N% |
| Active days | N |
| Sessions detected | N |
| AI-assisted commits | N% |
| Shipping streak | N days |

## Step 3: Per-Project Breakdown

For each active project (sorted by commits descending):

```
Project              Commits    +/-           Test%   Focus
beerbrew-tycoon          30    +1800/-200     45%     ████████████
warhammer-oracle         12    +400/-50       38%     █████
swarm-protocol            5    +120/-30       60%     ██
```

For each: note the biggest ship (highest-LOC commit message).

## Step 4: Session Analysis

Use 45-minute gap threshold between consecutive commits (across ALL projects, sorted by timestamp).

Classify:
- **Deep sessions** (50+ min)
- **Medium sessions** (20–50 min)
- **Micro sessions** (<20 min)

Calculate: total active coding time, average session length, LOC/hour.

Show peak hours histogram (local time):
```
Hour  Commits
 09:    5      █████
 10:    8      ████████
 ...
```

## Step 5: Focus Score

Percentage of commits in the most-active project. Interpret:
- 80%+: Deep focus on one project
- 50-80%: Primary project with side work
- <50%: Scattered across projects — may indicate context-switching cost

## Step 6: Quality Signals

- **Test ratio:** Overall and per-project. Flag if any project < 20%.
- **Fix ratio:** If >50% of commits are fixes, flag "ship fast, fix fast" pattern.
- **Hotspot files:** Top 5 most-changed files across all projects. Files changed 5+ times are churn hotspots.

## Step 7: Trends

Load prior retro from `.context/retros/`:
```bash
ls -t .context/retros/*.json 2>/dev/null | head -1
```

If prior retro exists, read it and show deltas:
```
                    Last        Now         Delta
Commits:            32     →    47          ↑47%
Test ratio:         22%    →    41%         ↑19pp
Sessions:           10     →    14          ↑4
Fix ratio:          54%    →    30%         ↓24pp ✓
Streak:             5d     →    12d         ↑7d
```

If no prior retros: "First retro recorded — run again later to see trends."

## Step 8: Save Snapshot

```bash
mkdir -p .context/retros
```

Determine filename:
```bash
today=$(date +%Y-%m-%d)
existing=$(ls .context/retros/${today}-*.json 2>/dev/null | wc -l | tr -d ' ')
next=$((existing + 1))
```

Use Write tool to save `.context/retros/${today}-${next}.json` with the metrics schema from the design doc.

## Step 9: Narrative Output

Structure:

**Tweetable summary** (first line):
```
Week of Mar 8: 47 commits across 3 projects, 2.4k LOC, 41% tests, streak: 12d
```

Then sections:
1. Factory-wide metrics table (Step 2)
2. Trends vs last retro (Step 7, if available)
3. Per-project breakdown (Step 3)
4. Time & session patterns (Step 4)
5. Focus score (Step 5)
6. Quality signals (Step 6)
7. 3 wins this period
8. 3 things to improve (specific, anchored in data)
9. 3 habits for next week (small, practical, <5 min to adopt)

## Compare Mode

When user runs `/factory-retro compare`:
1. Compute metrics for current window
2. Compute metrics for prior same-length window (using `--since` and `--until`)
3. Show side-by-side table with deltas
4. Brief narrative on biggest improvements and regressions
5. Save only current-window snapshot

## Tone

- Encouraging but candid
- Specific — always anchor in actual commits and data
- Skip generic praise — say exactly what was productive and why
- Keep total output ~1500–2500 words
- Output directly to conversation — do NOT write narrative to filesystem
- Only the JSON snapshot is saved to disk

## Rules

- Use `origin/main` for all git queries (not local main)
- If a project has no remote or fetch fails, skip it silently
- If the window has zero commits across all projects, say so and suggest a different window
- Round LOC/hour to nearest 50
```

**Step 2: Verify against design doc section 1.4**

**Step 3: Commit**

```bash
git add .claude/skills/factory-retrospective/SKILL.md
git commit -m "feat: implement factory-retrospective skill (1.4)

Cross-project retro analysing velocity, quality, sessions,
and trends across all factory projects."
```

---

### Task 6: Add AI Image Guardrails (1.5)

**Files:**
- Modify: `stacks/godot/ai_assets.md` — add guardrails section
- Modify: `CLAUDE.md` — add factory-level image generation rules

**Step 1: Add guardrails section to ai_assets.md**

Read the full file first. Then append a new `## Guardrails` section at the end of the file:

```markdown
## Guardrails

These rules apply on top of the tier-specific gates above.

### Per-Session Limits

- Maximum 10 image generations per session without explicit user approval.
- After 10: pause, report the count and estimated cost, and ask before continuing.

### Budget Gates

- Before any batch generation (>3 images in one go): report estimated cost and ask for approval.
- Track cumulative generation count per session.

### Prompt Validation

- Reject prompts that are too vague (e.g., "make it look good," "something cool"). Require specific art direction: subject, style, palette, composition.
- Reject prompts that duplicate recent generations — check against session history before generating.
- After the first generation, require reference to art direction doc or style guide for consistency.

### Quality Checkpoints

- After generating 3+ assets: pause for human review before continuing.
- Never auto-integrate generated assets into the project without human approval.
- Show generated assets to the user before moving to the next batch.
```

**Step 2: Add factory-level rules to CLAUDE.md**

Add after the WRITING & CONTENT section:

```markdown
AI IMAGE GENERATION
- These rules apply to ALL projects using AI image generation, regardless of stack.
- Read the relevant stack's asset generation guide before generating (e.g., stacks/godot/ai_assets.md).
- Max 10 generations per session without user approval. Pause and report after 10.
- Before batch generation (>3 images): report estimated cost and ask for approval.
- Never auto-integrate generated assets without human approval.
- Require specific art direction in prompts — reject vague requests.
```

**Step 3: Commit**

```bash
git add stacks/godot/ai_assets.md CLAUDE.md
git commit -m "docs: add AI image generation guardrails (1.5)

Per-session limits, budget gates, prompt validation, and quality
checkpoints for AI image generation across all stacks."
```

---

### Task 7: Add Cognitive Postures to CLAUDE.md (1.6)

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Add cognitive postures section**

Insert after the MODE SWITCH RULE paragraph (after line 58) and before the "Iteration loop:" paragraph:

```markdown
COGNITIVE POSTURES (within Execution Mode)
When in Execution Mode, the Engineer adopts different postures depending on the task. These are not modes — they don't need explicit switching. Skills activate the right posture automatically:

- BUILDER: Writing new code. TDD rhythm. Forward momentum.
  Skills: test-driven-development, writing-plans, executing-plans, subagent-driven-development
- REVIEWER: Examining code for correctness and quality. Skeptical posture. Looking for what's wrong, not what's right.
  Skills: code-review, structural-review, requesting-code-review, receiving-code-review
- DEBUGGER: Investigating failures. Hypothesis-driven. No guessing, no shotgun fixes.
  Skills: systematic-debugging
- SHIPPER: Getting code landed. Changelog, version, PR. Momentum without cutting corners.
  Skills: ship, finishing-a-development-branch, verification-before-completion

The key insight: each posture has a DIFFERENT relationship to the code. A builder adds, a reviewer questions, a debugger investigates, a shipper packages. Mixing postures (e.g., reviewing while building) leads to weak reviews and slow builds.
```

**Step 2: Add retro nudge to CLAUDE.md**

Add after the AI IMAGE GENERATION section (added in Task 6):

```markdown
FACTORY RETRO NUDGE
- At conversation start, if `.context/retros/` exists, check the most recent JSON file's date.
- If 7+ days since last retro: mention once — "It's been N days since your last factory retro. Run /factory-retro when you're curious."
- Do not block. Do not repeat. Just awareness.
```

**Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add cognitive postures and retro nudge to CLAUDE.md (1.6)

Formalises builder/reviewer/debugger/shipper postures within
Execution Mode. Adds gentle 7-day retro reminder."
```

---

### Task 8: Update design doc path reference

**Files:**
- Modify: `docs/plans/2026-03-14-bucket1-factory-expansion-design.md`

**Step 1: Update the plugin structure section**

The design doc references `plugins/ai-factory/` but the actual implementation uses `.claude/skills/`. Update the "Plugin Structure" and "Delivery Overview" sections to reflect the actual paths:

Change `plugins/ai-factory/skills/product-taste/SKILL.md` → `.claude/skills/product-taste/SKILL.md` (and similarly for all four skills).

Change the directory tree from:
```
plugins/ai-factory/
  plugin.json
  skills/
    ...
```
to:
```
.claude/skills/
  product-taste/SKILL.md
  ship/SKILL.md
  structural-review/SKILL.md
  factory-retrospective/SKILL.md
```

Remove references to `plugin.json` and `.claude/settings.json` registration (local skills don't need this).

**Step 2: Commit**

```bash
git add docs/plans/2026-03-14-bucket1-factory-expansion-design.md
git commit -m "docs: fix skill paths in design doc

Skills live in .claude/skills/, not plugins/ai-factory/."
```

---

### Task 9: Verify all skills are discoverable

**Step 1: List all skills**

```bash
ls .claude/skills/*/SKILL.md
```

Expected: 8 skills (4 openspec + 4 new factory skills)

**Step 2: Verify each skill has valid frontmatter**

```bash
for f in .claude/skills/*/SKILL.md; do
  echo "=== $(dirname $f | xargs basename) ==="
  head -5 "$f"
  echo
done
```

Expected: each skill shows `name:` and `description:` in frontmatter.

**Step 3: Verify CLAUDE.md has all new sections**

Read `CLAUDE.md` and confirm it contains:
- COGNITIVE POSTURES section
- AI IMAGE GENERATION section
- FACTORY RETRO NUDGE section

**Step 4: Verify ai_assets.md has guardrails**

Read `stacks/godot/ai_assets.md` and confirm it contains a `## Guardrails` section.

No commit needed — this is verification only.
