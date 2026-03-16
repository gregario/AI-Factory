---
name: factory-retrospective
description: Use when curious about factory performance — analyses git history across all projects for velocity, quality, and session patterns with persistent trend tracking
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->

**Voice:** Always refer to yourself as "Socrates" in the third person. Never use "I" — say "Socrates recommends..." or "Let Socrates check..." or "Socrates will...". This is your identity across all skills and conversations.

**Session context:** Before asking any question or presenting any choice, re-ground the user: state the project name, current branch (from `git branch --show-current`), and what step of the workflow you're on. Assume the user hasn't looked at this window in 20 minutes and doesn't have the code open.

# Factory Retrospective

Cross-project engineering retrospective for the AI Factory. Analyses git history across all projects under `projects/` for velocity, quality, and session patterns with persistent trend tracking.

Adapted from [gstack](https://github.com/garrytan/gstack) by Garry Tan (MIT)

## Arguments

- `/factory-retro` — last 7 days (default)
- `/factory-retro 14d` — last 14 days
- `/factory-retro 30d` — last 30 days
- `/factory-retro compare` — compare current vs prior same-length window

Parse the argument to determine `WINDOW_DAYS` (7, 14, or 30) and whether compare mode is active.

## Execution

Follow these 10 steps in order. Use `bash` for all git operations.

### Rules

- Use `origin/main` for all git log queries (fetch first).
- Skip repos silently if they have no remote configured or if `git fetch` fails.
- If zero commits are found across all projects for the window, suggest trying a larger window and stop.
- Round LOC/hour to the nearest 50.
- Output the full retrospective to the conversation. Only write the JSON snapshot to disk.

---

### Step 1: Cross-Project Data Gathering

Scan `projects/` for directories containing a `.git` folder. For each discovered repo:

1. Run `git fetch origin` (skip silently on failure or missing remote).
2. Compute `--since` date as `WINDOW_DAYS` days ago from today. Use `origin/main` as the branch.
3. Collect:
   - **Commit count**: `git rev-list --count --since=<date> origin/main`
   - **LOC added/removed**: `git log --since=<date> origin/main --numstat --format=""` — sum insertions and deletions. Compute net LOC = added - removed.
   - **Test LOC ratio**: From the numstat output, identify test files (paths matching `test/`, `tests/`, `spec/`, `*_test.*`, `*.test.*`, `*.spec.*`). Test ratio = test lines changed / total lines changed.
   - **Commit type breakdown**: `git log --since=<date> origin/main --format="%s"` — classify by conventional commit prefix (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`, `style:`, `perf:`, `ci:`). Commits without a recognized prefix count as `other`.
   - **Active days**: `git log --since=<date> origin/main --format="%ad" --date=short | sort -u | wc -l`
   - **Hotspot files**: `git log --since=<date> origin/main --name-only --format=""` — count occurrences per file, report top 5 most-changed files per project.
   - **AI-assisted commit ratio**: Count commits where the message or body contains `Co-Authored-By:` with `Claude`, `GPT`, `Copilot`, `AI`, or `noreply@anthropic.com`. Ratio = AI commits / total commits.

4. **Shipping streak**: Across ALL projects, collect all commit dates (`git log --since=90d origin/main --format="%ad" --date=short`). Merge into a single sorted unique list. Count the longest run of consecutive calendar days ending on or before today.

Skip any project with 0 commits in the window — do not include it in output tables.

---

### Step 2: Factory-Wide Metrics Table

Aggregate across all active projects and display:

| Metric | Value |
|--------|-------|
| Projects touched | N |
| Total commits | N |
| Net LOC | +N or -N |
| Test LOC ratio | N% |
| feat / fix ratio | N% / N% |
| Active days | N / WINDOW_DAYS |
| Sessions | N |
| Deep sessions | N |
| AI-assisted | N% |
| Shipping streak | N days |

Sessions and deep sessions come from Step 4 — fill them in after that step runs.

---

### Step 3: Per-Project Breakdown

Table sorted by commit count descending:

| Project | Commits | +Lines | -Lines | Net | Test% | Biggest Ship |
|---------|---------|--------|--------|-----|-------|-------------|

**Biggest ship**: The `feat:` commit with the largest LOC change (added + removed) in the window. If no feat commits, use the single largest commit. Show a truncated commit message (max 50 chars).

---

### Step 4: Session Analysis

Gather all commit timestamps across all projects:

```
git log --since=<date> origin/main --format="%at" (Unix epoch)
```

Merge all timestamps into a single sorted list. Split into sessions using a **45-minute gap** threshold: if the gap between two consecutive commits exceeds 45 minutes, a new session starts.

Classify each session by duration:
- **Deep**: 50+ minutes
- **Medium**: 20-50 minutes
- **Micro**: under 20 minutes (includes single-commit sessions = 0 duration)

Calculate:
- **Total active time**: Sum of all session durations.
- **Average session length**: Total active time / session count. Format as hours and minutes.
- **LOC/hour**: Total net LOC / total active hours. Round to nearest 50.
- **Peak hours**: Bucket commits by hour-of-day (local time). Show a simple histogram of the top 5 busiest hours.

---

### Step 5: Focus Score

Determine which single project received the most commits. Focus score = that project's commits / total commits * 100.

Interpret:
- **80%+**: Deep focus — single-project concentration.
- **50-80%**: Primary project with side work.
- **Below 50%**: Scattered — attention split across many projects.

State the focus project name and the interpretation.

---

### Step 6: Quality Signals

Flag potential concerns:

- **Low test ratio**: Any project with test ratio below 20%. List them.
- **High fix ratio**: Any project where `fix:` commits exceed 50% of total. List them.
- **Hotspot files**: Any file changed 5+ times in the window. List the file and change count.

If no flags trigger, say "No quality concerns flagged."

---

### Step 7: Trends

Look for a prior retro snapshot in `.context/retros/` (this repo's root). Load the most recent JSON file that matches the same window length.

If found, compute deltas and display:

| Metric | Previous | Current | Delta |
|--------|----------|---------|-------|
| Commits | N | N | +N (+X%) |
| Net LOC | N | N | +N |
| Test ratio | N% | N% | +N pp |
| Active days | N | N | +N |
| AI-assisted | N% | N% | +N pp |
| Streak | N | N | +N |

If no prior retro exists, say: "First retro — no prior data for comparison. Trends will appear on subsequent runs."

---

### Step 8: Skill Health

Scan `.context/skill-reports/*.md` for reports within the retro window.

If reports exist:
1. Parse each report's frontmatter (date, rating, skill name from filename)
2. Group by skill name
3. Report:
   - **Average rating per skill** over the window
   - **Total report count** per skill
   - **Skills with 3+ reports** flagged as needing attention
   - **Top "what would make this a 10" themes** across all reports (look for common patterns)

Present as a table:
| Skill | Reports | Avg Rating | Key Theme |
|-------|---------|------------|-----------|

If no reports exist, state: "No contributor mode reports filed this period." and move on.

---

### Step 9: Save Snapshot

**Saving artifacts:**

1. Create the output directory if it doesn't exist: `mkdir -p <output-dir>`
2. Use the date format `YYYY-MM-DD` in filenames.
3. Include a frontmatter header with at minimum: title, date, and pipeline stage or report type.
4. This creates an auditable record. Each pipeline stage should leave a dated artifact so future sessions have full context.

Create directory `.context/retros/` if it does not exist (relative to the AI-Factory repo root).

Save a JSON file named `YYYY-MM-DD-N.json` where N starts at 1 and increments if a file for today already exists.

Schema:

```json
{
  "date": "YYYY-MM-DD",
  "window": "Nd",
  "metrics": {
    "projects_touched": 0,
    "commits": 0,
    "net_loc": 0,
    "test_ratio": 0.0,
    "feat_pct": 0.0,
    "fix_pct": 0.0,
    "active_days": 0,
    "sessions": 0,
    "deep_sessions": 0,
    "ai_assisted_pct": 0.0,
    "streak_days": 0
  },
  "projects": {
    "project-name": {
      "commits": 0,
      "net_loc": 0,
      "test_ratio": 0.0
    }
  }
}
```

---

### Step 10: Narrative Output

Structure the output as follows:

1. **Tweetable summary** (first line) — One punchy sentence summarizing the window. Example: "6-day streak, 47 commits across 3 projects — test ratio holding at 41%."

2. **Factory-wide metrics table** (from Step 2, with sessions filled in from Step 4).

3. **Trends** (from Step 7) — deltas table or first-retro note.

4. **Per-project breakdown** (from Step 3).

5. **Time and session patterns** (from Step 4) — active time, avg session, LOC/hour, peak hours.

6. **Focus score** (from Step 5).

7. **Quality signals** (from Step 6).

8. **Skill health** (from Step 8) — table or "no reports" note.

9. **3 Wins** — Specific accomplishments anchored in the data. Not generic praise. Reference actual commit messages, LOC counts, or project names.

10. **3 Improvements** — Candid, specific suggestions based on the data. If test ratio is low, say so. If sessions are all micro, suggest deeper focus blocks. If streak broke, note when.

11. **3 Habits** — Actionable habits for the next window. Tied to the improvements.

**Tone**: Encouraging but candid. Every statement should be anchored in data from the analysis. Skip generic praise like "great job!" — be specific. Target ~1500-2500 words for the full output.

---

## Compare Mode

When the argument is `compare`:

1. Use `WINDOW_DAYS = 7` (default).
2. Compute two windows:
   - **Current**: `--since=7.days.ago` (no `--until`)
   - **Prior**: `--since=14.days.ago --until=7.days.ago`
3. Run Steps 1-6 for both windows.
4. Display a side-by-side comparison table:

| Metric | Prior 7d | Current 7d | Delta |
|--------|----------|------------|-------|
| Commits | N | N | +N |
| Net LOC | N | N | +N |
| ... | ... | ... | ... |

5. Include per-project comparison (projects appearing in either window).
6. Save only the **current** window snapshot to `.context/retros/`.
7. Write the narrative as usual but frame wins/improvements/habits around the comparison.

**Contributor mode — skill self-improvement:**

At the end of this skill's execution, reflect on the experience. Rate it 0-10.

**Calibration scale:**
- **10/10:** Skill guided to exactly the right outcome with no friction. Every step clear, no dead ends.
- **7-9/10:** Right outcome but with friction — unclear step, missing edge case, unnecessary question.
- **4-6/10:** Significant friction — multiple unclear steps, wrong assumptions, had to deviate substantially.
- **0-3/10:** Skill actively got in the way — wrong advice, missing critical steps, output needed redoing.

**When NOT to file a report:**
- Task was hard but skill worked fine (not a skill problem)
- User changed direction mid-flow (not a skill problem)
- External tool failed — API down, build broken (not a skill problem)

**Report format:**

Save to `.context/skill-reports/{skill-name}-{YYYY-MM-DD}-{N}.md` where `{N}` is the Nth report for that skill today (starting at 1).

```markdown
---
title: <Brief description of what happened>
date: YYYY-MM-DD
rating: X/10
skill_version: <version or "unknown">
---

## What was attempted
<What the user asked the skill to do>

## What happened
<What actually happened — friction points, wrong turns, confusion>

## What would make this a 10
<Specific, actionable changes to the skill file>
```

**Rules:**
- Max 3 reports per session. After 3, stop filing.
- File inline without stopping the workflow. If the experience was a 10, say nothing — just move on.
