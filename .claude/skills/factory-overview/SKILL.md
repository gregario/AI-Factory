---
name: factory-overview
description: Use when wanting a dashboard view of all factory projects, backlog ideas, and pipeline status — or when starting a session and needing context on what exists and what stage everything is at
---

Pure runtime scan of the entire AI Factory. No cached state, no central status file. Derives everything from the filesystem.

**Input**: None. Just invoke.

**Steps**

### 1. Scan all projects

For each directory in `projects/*/`, gather:

```bash
# Per project — run these in parallel for speed
name=$(basename "$dir")
last_commit=$(git -C "$dir" log -1 --format="%ar|%s" 2>/dev/null)
branch=$(git -C "$dir" branch --show-current 2>/dev/null)
has_openspec=$(test -d "$dir/openspec/changes" && echo "Y" || echo "N")
has_design=$(test -d "$dir/design" && ls "$dir/design/"*.md 2>/dev/null | head -1)
has_status_json=$(test -f "$dir/status.json" && echo "Y" || echo "N")
has_package_json=$(test -f "$dir/package.json" && echo "Y" || echo "N")
```

If `has_openspec == Y`, run `cd "$dir" && openspec status --json 2>/dev/null` to get change names and task completion.

If `has_status_json == Y`, parse `npm.published` and `version`.

If `has_package_json == Y`, parse `version` from package.json.

### 2. Classify each project

Apply these rules **in order** (first match wins):

| Condition | Stage | Icon |
|-----------|-------|------|
| `status.json` exists AND `npm.published == true` | **Shipped** | ✓ |
| OpenSpec changes exist with incomplete tasks | **Spec** | S |
| `design/` has deliverable files | **Design** | D |
| Active feature branch (not main/master) with commits in last 7 days | **In Progress** | → |
| Last commit within 7 days on main | **Active** | ● |
| Last commit within 30 days | **Idle** | ○ |
| Last commit older than 30 days | **Parked** | — |

For **Spec** stage projects, calculate task completion: count `- [x]` vs total `- [ ]` in tasks.md.

### 3. Parse backlog

Read `docs/drafts/ideas-backlog.md`. Extract:
- Each idea name and its status (Ready for brainstorm, Ready for competition review, Parked, Spec'd, Shipped, etc.)
- Group by section (MCP Servers, Other Ideas, Board Game Roguelite Series)

### 4. Parse graveyard

Read `docs/drafts/ideas-graveyard.md`. Extract each entry: name, date, one-line "Killed because" reason.

### 5. Detect drift

Compare backlog status against actual project state. Flag mismatches:
- Backlog says "Ready for brainstorm" but project exists and is shipped → STALE
- Backlog says "Parked" but project has recent commits → STALE
- Project exists in `projects/` but not mentioned in backlog → MISSING
- Backlog mentions a project that doesn't exist in `projects/` → OK (ideas don't need projects)

### 6. Display dashboard

Output in this exact order:

```markdown
# Factory Overview (scanned YYYY-MM-DD HH:MM)

## In Progress
| Project | Stage | Detail | Last Activity |
|---------|-------|--------|---------------|
(Projects with Stage = Spec, Design, In Progress, or Active)

## Backlog
| Idea | Section | Status | Next Step |
|------|---------|--------|-----------|
(Items from backlog.md that are not yet Spec'd or Shipped)

## Shipped
| Project | Version | npm | Last Activity |
|---------|---------|-----|---------------|
(Projects with Stage = Shipped)

## Parked / Idle
| Project | Last Activity | Notes |
|---------|---------------|-------|
(Projects with Stage = Idle or Parked)

## Ideas Graveyard
| Idea | Date | Killed Because |
|------|------|---------------|
(Entries from graveyard.md)
```

### 7. Propose drift fixes

If any drift was detected in Step 5, use **AskUserQuestion** to present proposed fixes:

"Socrates detected N status mismatches. Approve fixes?"

List each fix. On approval, edit `docs/drafts/ideas-backlog.md` to correct the stale statuses.

---

**Rules:**
- Pure runtime — never write to a cache or status file
- Parallel bash calls for speed — scan all projects concurrently
- Keep output under 80 lines — scannable at a glance
- If a project has no git repo, skip it silently
- Use the memory files for context on projects outside `projects/` (e.g., swarm-protocol)
