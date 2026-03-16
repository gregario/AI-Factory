# Competition Review Skill — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a `/competition-review` skill that maps the competitive landscape for an idea before it enters product-taste.

**Architecture:** Single SKILL.md file in `.claude/skills/competition-review/`. Domain-aware web search, structured competition brief output. CLAUDE.md pipeline updated to include the new step.

**Tech Stack:** Markdown skill file, WebSearch tool, AskUserQuestion tool.

---

### Task 1: Create the SKILL.md file

**Files:**
- Create: `.claude/skills/competition-review/SKILL.md`

**Step 1: Write the skill file**

Create `.claude/skills/competition-review/SKILL.md` with:

```markdown
---
name: competition-review
description: Use when evaluating a new product idea before product-taste — searches for competitors, maps the landscape, and produces a competition brief with gap analysis and differentiation angle
---

# Competition Review

Map the competitive landscape for an idea before it enters product-taste. Answers: "Who else is in this space, and where's the gap?"

**Pipeline position:** Brainstorm → **Competition Review** → Product Taste → Spec

This is a research skill, not a judgment skill. It always passes findings forward to product-taste. It never kills an idea itself.

---

**Input:** An idea statement — backlog one-liner, brainstorm output, or user description.

**Output:** A competition brief (see Step 5).

---

## Process

### Step 1: Check for Existing Competitive Notes

Read `docs/drafts/ideas-backlog.md` and look for competitive notes on this idea (e.g., "Zero competition", "5+ existing MCP servers").

If notes exist, present them and ask:

> "Your backlog already has competitive notes for this idea: [notes]. Want to run a full competition review anyway, or skip to product-taste?"

If the user skips, stop here.

### Step 2: Identify Project Type

Determine the project type from context (CLAUDE.md, stack profile, user statement). If ambiguous, ask using AskUserQuestion with these options:

- MCP server
- SaaS / web app
- Game
- CLI tool / library
- Other (user specifies)

### Step 3: Generate Search Queries

Based on the idea and project type, generate 3-5 targeted search queries for the domain-specific channels:

| Project Type | Search Channels | Example Queries |
|---|---|---|
| **MCP server** | npm registry, MCP registries (mcp.run, glama.ai), GitHub, awesome-mcp-servers | `"mcp server" + [topic] site:npmjs.com`, `[topic] site:glama.ai`, `[topic] mcp server github` |
| **SaaS / web app** | Product Hunt, G2, AlternativeTo, general web | `[idea] site:producthunt.com`, `[idea] alternatives`, `[idea] site:g2.com` |
| **Game** | Steam, itch.io, genre searches | `[genre] [mechanic] steam`, `[genre] game itch.io`, `[genre] tycoon sim` |
| **CLI tool / library** | npm/PyPI/crates.io, GitHub trending | `[function] npm package`, `[function] github`, `[function] cli tool` |
| **Fallback** | General web + GitHub | `[idea] alternatives`, `[idea] open source`, `[idea] github` |

### Step 4: Execute Searches

Run each query using **WebSearch**. For each result:
- Note the competitor name and URL
- What they do (one line)
- How mature they are (downloads, stars, last updated)
- Obvious strengths and weaknesses

Aim for 3-8 competitors. If you find 0, broaden search terms once. If still 0, that's a finding (blue ocean).

### Step 5: Synthesize Competition Brief

Produce the brief in this format:

```
## Competition Brief: [Idea Name]

**Market density:** [Blue ocean / Contested / Red ocean]

### Competitors

| Name | What They Do | Maturity | Strengths | Weaknesses |
|------|-------------|----------|-----------|------------|
| ... | ... | ... | ... | ... |

### Gap Analysis

[What no competitor does well, or at all. 2-3 sentences.]

### Differentiation Angle

[Where this idea has an edge. 1-2 sentences.]

### Advisory Verdict

[One of: "Clear lane", "Contested but winnable — [reason]", "Crowded — product-taste should scrutinize hard"]
```

### Step 6: Present and Hand Off

Present the brief to the user. Ask:

> "Ready to move to product-taste with this context, or want to dig deeper on any competitor?"

If the user approves, state: "Run `/product-taste` next — this brief will inform the premise challenge."

---

## Rules

- Use **WebSearch** for all competitive research. No guessing.
- Domain-specific channels first, general web as fallback.
- Advisory only — never recommend parking or killing an idea. That's product-taste's job.
- If the backlog already has competitive notes, offer to skip.
- Keep the whole process under 5 minutes.
- Do not analyze pricing, business models, or technical architecture. Just: who, what, and where's the gap.
```

**Step 2: Commit the skill file**

```bash
git add .claude/skills/competition-review/SKILL.md
git commit -m "feat: add competition-review skill"
```

---

### Task 2: Update CLAUDE.md pipeline

**Files:**
- Modify: `CLAUDE.md:37-42` (pipeline steps)
- Modify: `CLAUDE.md:44-48` (explanatory paragraph)

**Step 1: Update the pipeline steps**

In `CLAUDE.md`, replace the current pipeline (lines 37-42) with:

```markdown
The full pipeline from idea to implementation:
1. BACKLOG: One-liner captured in ideas-backlog.md. No commitment, just a note.
2. BRAINSTORM (optional): Use /brainstorming skill for big or unclear ideas. Expansive thinking: "What's the real product? What's the 10-star version?" Updates the backlog entry with findings. No formal artifacts.
3. COMPETITION REVIEW (recommended): Use /competition-review to map the competitive landscape. Web-searches domain-specific channels, produces a competition brief with gap analysis. Skippable if backlog already has competitive notes.
4. PRODUCT TASTE (mandatory gate): Use /product-taste before /opsx:propose. Challenges the idea: premise, persona, scope. Decides expansion/hold/reduction. Uses competition brief as input context when available.
   - **Off-ramp → Graveyard**: If product-taste kills or shelves the idea, write an entry to `docs/drafts/ideas-graveyard.md` (gitignored). Format: idea name, date, one-liner, "Killed because", "Salvageable kernel". Check the graveyard before evaluating new ideas — avoid re-investigating dead concepts.
5. SPEC: /opsx:propose creates formal specs, design, and tasks.
```

**Step 2: Update the explanatory paragraph**

Replace the "Brainstorming expands..." paragraph (lines 44-48) with:

```markdown
Brainstorming expands the possibility space. Competition review maps it. Product taste narrows it. All three are needed:
- Without brainstorming, you challenge an idea that was never properly explored.
- Without competition review, you evaluate an idea blind to what already exists.
- Without taste-gating, you spec an overexcited vision at full scope.

Not every idea needs all steps. Small features skip brainstorming and competition review, going straight to product taste. But new products and big pivots benefit from the full pipeline.
```

**Step 3: Commit CLAUDE.md changes**

```bash
git add CLAUDE.md
git commit -m "docs: add competition-review to idea pipeline in CLAUDE.md"
```

---

### Task 3: Update MEMORY.md

**Files:**
- Modify: `memory/MEMORY.md` (add skill to Factory Skills list)

**Step 1: Add to Factory Skills section**

In the `## Factory Skills` section, add:

```markdown
- `competition-review` — Pre-taste competitive landscape research. Domain-aware web search (MCP registries, Product Hunt, Steam, etc.), produces competition brief with gap analysis. Advisory only — never kills ideas.
```

**Step 2: Update pipeline description in Workflow section**

In the `## Workflow: OpenSpec → Design Mode → Superpowers` section, update the pipeline reference to mention competition review between brainstorm and product-taste.

**Step 3: Commit memory changes**

```bash
git add memory/MEMORY.md
git commit -m "docs: add competition-review skill to memory index"
```

---

### Task 4: Test the skill with a subagent

**Step 1: Run a pressure test**

Spawn a subagent with the competition-review skill loaded, and give it an idea from the backlog (e.g., "3D Printing Materials Oracle — MCP server for filament data"). Verify:

- It identifies project type as MCP server
- It searches the right channels (npm, glama, GitHub)
- It produces a properly structured competition brief
- It does NOT recommend parking or killing the idea (advisory only)
- It offers to hand off to product-taste

**Step 2: Run a blue-ocean test**

Give it an idea with no competition (e.g., "Speedcubing Oracle"). Verify it correctly identifies blue ocean.

**Step 3: Run a red-ocean test**

Give it "Pokemon Oracle". Verify it finds 5+ competitors and marks red ocean.

**Step 4: Test skipability**

Give it an idea that already has backlog notes. Verify it offers to skip.
