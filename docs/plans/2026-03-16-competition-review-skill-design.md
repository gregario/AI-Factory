# Competition Review Skill — Design

**Date:** 2026-03-16
**Status:** Approved

## Purpose

A standalone skill that maps the competitive landscape for an idea before it enters product-taste. Answers: "Who else is in this space, and where's the gap?"

## Pipeline Position

```
Backlog → Brainstorm (optional) → Competition Review → Product Taste (mandatory) → Spec
```

Runs after the idea is shaped, before product judgment. Advisory only — always passes findings forward to product-taste. Never kills an idea itself.

## Input / Output

**Input:** An idea statement (backlog one-liner, brainstorm output, or user description). Also reads project type from context.

**Output:** A competition brief containing:

1. **Market density** — Blue ocean / contested / red ocean
2. **Competitors found** — Name, what they do, strengths, weaknesses (table)
3. **Gap analysis** — What no one does well, or at all
4. **Differentiation angle** — Where this idea has an edge
5. **Advisory verdict** — "clear lane", "contested but winnable", or "crowded — product-taste should scrutinize hard"

## Domain-Aware Search Strategy

The skill detects project type and runs targeted searches:

| Project Type | Search Channels |
|---|---|
| MCP server | npm registry, MCP registries (mcp.run, glama.ai), GitHub "mcp server + topic", awesome-mcp-servers |
| SaaS / web app | Product Hunt, G2/Capterra, AlternativeTo, general web search |
| Game | Steam (similar tags), itch.io, genre-specific searches |
| CLI tool / library | npm/PyPI/crates.io (by stack), GitHub trending + topic search |
| Fallback | General web search + GitHub search if type unclear |

Uses `WebSearch` tool. Each domain runs 2-4 targeted queries.

## Process Steps

1. **Identify project type** — Read context (CLAUDE.md, stack, user statement). If ambiguous, ask.
2. **Extract search terms** — Core function, target audience, technology. Generate 3-5 search queries tailored to domain channels.
3. **Run searches** — Execute domain-specific web searches. Capture top results.
4. **Analyze competitors** — For each: what they do, maturity, what's missing.
5. **Synthesize brief** — Market density, competitor table, gap analysis, differentiation angle, advisory verdict.
6. **Present to user** — Show brief. Ask: "Ready to move to product-taste with this context, or want to dig deeper on any competitor?"

## Interaction Model

- Mostly autonomous (search + synthesize), not conversational
- One question at start if project type is ambiguous
- One question at end (approve brief or dig deeper)
- No lettered-choice flow — research skill, not judgment skill

## Skipability

Recommended but skippable. If the backlog already has competitive notes (e.g., "Zero competition"), the user can skip to product-taste. The skill checks the backlog entry first and offers to skip if notes exist.

## What This Skill Does NOT Cover

- Product judgment (product-taste)
- Technical feasibility
- Pricing / business model analysis
- User research

## CLAUDE.md Changes Required

Update the pipeline description to insert Competition Review between Brainstorm and Product Taste. Mark as recommended (not mandatory) — unlike product-taste which is a mandatory gate.

## Skill Location

`.claude/skills/competition-review/SKILL.md` — factory-local skill, same as product-taste, ship, etc.
