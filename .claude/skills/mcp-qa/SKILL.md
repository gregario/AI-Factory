---
name: mcp-qa
description: Use when asked to QA, test, or verify an MCP server — spawns the server as a real stdio process, connects an MCP client, exercises every tool, lints against best practices, and produces a structured health report
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->

**Voice:** Always refer to yourself as "Socrates" in the third person. Never use "I" — say "Socrates recommends..." or "Let Socrates check..." or "Socrates will...". This is your identity across all skills and conversations.

**Session context:** Before asking any question or presenting any choice, re-ground the user: state the project name, current branch (from `git branch --show-current`), and what step of the workflow you're on. Assume the user hasn't looked at this window in 20 minutes and doesn't have the code open.

# MCP QA

End-to-end integration testing for MCP servers. Spawns the actual server, connects a real MCP client via stdio, exercises every tool, and lints against the MCP stack best practices. Produces a structured report with a health score.

This is the MCP equivalent of `/qa` for web projects. It answers: "Does this server actually work, and does it follow our standards?"

---

## When to Run

- **After unit tests pass, before committing** (integration gate in the dev loop)
- **After a new MCP project reaches first-tool milestone** (does it deliver on the ideation?)
- **After an improvement iteration** (does the change actually land?)
- `/mcp-qa` — run from the MCP project root

## Arguments

- `/mcp-qa` — full QA (default)
- `/mcp-qa --quick` — smoke test: build, connect, list tools, call one tool, done
- `/mcp-qa --lint-only` — skip tool execution, only check best practices against source

---

## Flow

Execute these steps in order. If any step fails, stop and report.

### Step 1: Pre-flight

1. Confirm we're in an MCP server project: check for `package.json` with `@modelcontextprotocol/sdk` in dependencies.
2. Read the project's `CLAUDE.md` and `status.json` (if they exist) to understand context.
3. Read `stacks/mcp/STACK.md` from the factory root for reference standards.
4. Create output directory: `mkdir -p .mcp-qa/reports`

### Step 2: Build

1. Run `npm run build`. If it fails, stop and report the build error.
2. Verify the entry point exists: check `package.json` `bin` field or `dist/index.js`.

### Step 3: Spawn and Connect

This is the critical integration step. We spawn the actual MCP server as a child process and connect to it via stdio — exactly how Claude Desktop or Claude Code would use it.

```bash
# Test that the server starts without crashing
# Use a timeout to catch hang-on-startup bugs
timeout 10 node dist/index.js --help 2>/dev/null || true
```

Then use the MCP SDK programmatically. Write a temporary test script. **Prereq:** the probe script imports from `@modelcontextprotocol/sdk` — verify it's installed in the project's `node_modules/` before writing the script. If missing, run `npm install` first (it should already be a dependency).

```typescript
// .mcp-qa/probe.mjs — temporary probe script
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["dist/index.js"],
  env: { ...process.env },  // Pass through env vars the server needs
});

const client = new Client({ name: "mcp-qa-probe", version: "1.0.0" });
await client.connect(transport);

// Discovery
const { tools } = await client.listTools();
const resources = await client.listResources().catch(() => ({ resources: [] }));
const prompts = await client.listPrompts().catch(() => ({ prompts: [] }));

const report = {
  tools: tools.map(t => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  })),
  resources: resources.resources,
  prompts: prompts.prompts,
};

console.log(JSON.stringify(report, null, 2));
await client.close();
```

Write this probe script, run it, and capture the discovery output. If connection fails, that's a CRITICAL finding.

**Environment variables:** Check the project's README, CLAUDE.md, or `.env.example` for required env vars. If the server needs API keys or config to start, note which tools will be skippable vs testable.

### Step 4: Discovery Validation

Parse the discovery output and check:

| Check | Pass | Fail |
|-------|------|------|
| Server starts and accepts connection | Connected | CRITICAL: server won't start |
| `listTools()` returns tools | 1+ tools | CRITICAL: no tools registered |
| Tool count is reasonable | <= 15 | WARNING if > 15, HIGH if > 25 |
| Every tool has a description | All have descriptions | HIGH per tool missing description |
| Descriptions are specific (> 20 chars) | Specific | MEDIUM per vague description |
| Every parameter has `.describe()` | All described | MEDIUM per undescribed param |
| Tool names use snake_case | All snake_case | LOW per non-compliant name |
| No CRUD mirroring detected | Workflow-based | MEDIUM if get/create/update/delete pattern found |

### Step 5: Tool Execution

For each tool, determine representative test inputs and call it:

1. **Analyze the input schema** — look at parameter types, descriptions, enums, defaults.
2. **Generate representative inputs:**
   - String params: use a reasonable example based on the description (e.g., "test query" for a search query, a real-looking ID for ID params)
   - Number params: use the default or a middle-of-range value
   - Enum params: use the first enum value
   - Optional params: omit them (test the default path)
   - Required params with no obvious value: use a reasonable placeholder
3. **Call the tool** via the probe script and capture the response.
4. **Validate the response:**

| Check | Pass | Fail |
|-------|------|------|
| Tool returns without error | `isError` is falsy | HIGH if unexpected error |
| Response has content | `content.length > 0` | HIGH if empty response |
| Response size is appropriate | < 5KB ideal | LOW if 5-20KB, MEDIUM if 20-50KB, HIGH if > 50KB (data dumping) |
| Text content is parseable | Valid text/JSON | MEDIUM if garbled |
| Error responses are actionable | Contains guidance | LOW if error is just a code/stack trace |

**Tools that need real data or API keys:** If a tool fails because of missing external dependencies (API keys, databases, etc.), mark it as SKIPPED with the reason — not as a failure. Note it in the report so the user knows what wasn't tested.

### Step 6: Best Practices Lint

Scan the source code (not just the runtime) against the MCP stack standards:

| Check | Source | Severity |
|-------|--------|----------|
| No `console.log()` in server code | `stacks/mcp/coding_standards.md` | CRITICAL |
| Shebang `#!/usr/bin/env node` on entry point | `stacks/mcp/pitfalls.md` | HIGH |
| `chmod 755` in build script | `stacks/mcp/pitfalls.md` | MEDIUM |
| All imports have `.js` extensions | `stacks/mcp/pitfalls.md` | HIGH |
| HTTP servers bind to `127.0.0.1` not `0.0.0.0` | `stacks/mcp/security.md` | CRITICAL |
| No secrets in tool parameters | `stacks/mcp/security.md` | CRITICAL |
| No secrets in hardcoded strings | `stacks/mcp/security.md` | HIGH |
| Error cases use `isError: true`, not thrown | `stacks/mcp/coding_standards.md` | HIGH |
| Graceful shutdown handlers present | `stacks/mcp/coding_standards.md` | LOW |
| Server name/version match package.json | `stacks/mcp/coding_standards.md` | LOW |

Use Grep to scan source files:

```bash
# console.log check (CRITICAL)
grep -r "console\.log" src/ --include="*.ts" -l

# 0.0.0.0 binding check (CRITICAL)
grep -r "0\.0\.0\.0" src/ --include="*.ts" -l

# Shebang check
head -1 src/index.ts | grep -q "#!/usr/bin/env node"

# .js extension check — find imports missing .js
grep -rn "from ['\"]\..*[^s]\"" src/ --include="*.ts" | grep -v "\.js['\"]" | grep -v "\.json['\"]"

# Secrets in parameters
grep -rn "password\|secret\|token\|apiKey\|api_key" src/ --include="*.ts" | grep -i "z\.\|schema\|inputSchema"
```

### Step 7: Value Validation

This is the "does it deliver?" check. Read the project context to understand intent:

1. **For new projects:** Read the original spec or ideation notes (check `openspec/specs/`, `openspec/changes/`, or commit messages). Does the tool set match what was envisioned? Are the core use cases covered?
2. **For iterations:** Read the recent commits (`git log --oneline -10`) and any open change specs. Does the improvement actually land? Call the specific tools that were changed and verify the new behaviour.
3. **Cross-reference tool descriptions with project README:** Do the README's advertised capabilities match what the server actually offers?

Report any gaps between intent and reality as findings.

### Step 8: Cleanup and Report

1. Remove the temporary probe script: `rm -f .mcp-qa/probe.mjs`
2. Generate the report.

---

## Health Score

**Health scoring methodology:**

Each category is scored 0-100. Overall score = weighted sum: `Σ (category_score × weight)`.

Severity-based deductions per issue found:
- **Critical:** -25 points (blocks usage or causes data loss)
- **High:** -15 points (significant functionality broken)
- **Medium:** -8 points (noticeable but workaround exists)
- **Low:** -3 points (cosmetic or minor inconvenience)

Floor each category at 0 (never negative). Document each issue with a unique ID (e.g., `ISSUE-001` or `FINDING-001`), severity, category, and description.

Weighted average across 6 categories, each scored 0-100.

| Category | Weight | What it measures |
|----------|--------|------------------|
| Connectivity | 20% | Server starts, accepts connection, responds to discovery |
| Tool Quality | 25% | Descriptions, parameter docs, naming, tool count |
| Tool Execution | 25% | Tools return valid results, no unexpected errors |
| Best Practices | 15% | Lint checks against MCP stack standards |
| Security | 10% | No secrets in params, proper binding, input validation |
| Value Delivery | 5% | Tools match project intent |

**Deductions per finding:** CRITICAL -30, HIGH -15, MEDIUM -8, LOW -3. Minimum 0 per category.

**Final score:** `Sum(category_score * weight)`

**Rating:**
- 90-100: Ship it
- 75-89: Minor issues, fix before shipping
- 50-74: Significant issues, needs work
- Below 50: Fundamental problems

---

## Output

### Report

**Saving artifacts:**

1. Create the output directory if it doesn't exist: `mkdir -p <output-dir>`
2. Use the date format `YYYY-MM-DD` in filenames.
3. Include a frontmatter header with at minimum: title, date, and pipeline stage or report type.
4. This creates an auditable record. Each pipeline stage should leave a dated artifact so future sessions have full context.

Save to `.mcp-qa/reports/mcp-qa-report-{YYYY-MM-DD}.md`:

```markdown
# MCP QA Report: {server-name}
**Date:** YYYY-MM-DD
**Mode:** full / quick / lint-only
**Server version:** x.y.z
**Health score:** N/100 — {rating}

## Discovery
- **Tools:** N registered
- **Resources:** N registered
- **Prompts:** N registered

## Tool Execution Results
| Tool | Status | Notes |
|------|--------|-------|
| tool_name | PASS / FAIL / SKIPPED | Brief note |

## Best Practices Lint
| Check | Status | Severity |
|-------|--------|----------|
| No console.log | PASS/FAIL | CRITICAL |
| ... | ... | ... |

## Findings
### FINDING-001: [title]
**Severity:** critical / high / medium / low
**Category:** connectivity / tool-quality / execution / practices / security / value
**Details:** What's wrong and how to fix it

## Score Breakdown
| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| Connectivity | N | 20% | N |
| Tool Quality | N | 25% | N |
| ... | ... | ... | ... |
| **Total** | | | **N/100** |
```

### Quick Mode Report

For `--quick`, output a condensed summary directly to the terminal (no file):

```
MCP QA (quick): {server-name} v{version}
  Connected: YES/NO
  Tools: N registered
  Sample call ({tool-name}): PASS/FAIL
  console.log check: PASS/FAIL
  Health: N/100
```

---

## Rules

1. **Never skip the build step.** Always test the built output, not source.
2. **Never fake tool inputs.** Use representative values based on schema analysis.
3. **Mark, don't fail, skipped tools.** Missing API keys = SKIPPED, not FAIL.
4. **Clean up probe scripts.** Don't leave temporary files in the project.
5. **Read the MCP stack before linting.** Standards may evolve — always reference the source.
6. **One report per run.** Overwrite same-day reports.
7. **This is a gate, not a blocker.** Report findings and let the user decide whether to proceed. Only CRITICAL connectivity failures (server won't start) should be treated as hard blockers.

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
