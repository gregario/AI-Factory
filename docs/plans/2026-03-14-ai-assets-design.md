# AI Asset Generation for Godot — Design Document

> Design for `stacks/godot/ai_assets.md`, a new addition to the Godot stack profile.

## Problem

The AI-Factory has no guidance for AI-generated visual assets in Godot projects. The Godot stack profile covers code, testing, performance, and project structure — but nothing about how to generate, import, and manage AI-created sprites, icons, textures, and UI elements within the factory workflow.

## Decisions

### 2D only (for now)
This guide covers 2D asset generation. 3D pipelines (Blender retopo, mesh generation) are out of scope and can be added later as a separate file.

### Tool-agnostic
The guide defines pipeline patterns, prompt structures, and quality gates — not specific tools. Tools churn fast. The durable value is in the workflow, not the brand names.

### Two-tier pipeline

- **MVP tier** — optimized for speed and low cost. Placeholder-quality assets for testing mechanics. User chooses backend: local (free, slower) or cheap cloud (fast, low cost). No style training. One-pass generation.
- **Release tier** — optimized for quality and consistency. Commercial-grade assets for shipping. User chooses backend: premium API, trained model, or service. Human review gates throughout.

### Backend-agnostic per tier
The project's CLAUDE.md declares which backend to use for each tier. The stack guide defines the pipeline rules, not the backend setup. Different users with different hardware and budgets use the same workflow.

### Design Mode owns art direction, Execution Mode owns generation
Design Mode produces art direction deliverables (style seed, asset manifest, prompt templates). Execution Mode runs the generation, cleanup, and import. This maintains the AI-Factory's mode separation.

### Human-in-the-loop at key gates
- Asset manifest requires human approval before any generation
- Release tier: human reviews each batch before proceeding
- No hard generation limits — the gate is human approval, not arbitrary caps

### Placeholder tagging for clean transition
MVP assets use a `_placeholder` suffix. Release tier replaces them with the same filename minus the suffix. No code changes needed during the transition.

### Prompt traceability
All generation prompts are saved in `design/prompts/`. MVP prompts inform the Release tier. Shipped assets have their exact prompts recorded for reproducibility.

## File Structure

New file: `stacks/godot/ai_assets.md`

Sections:
1. Purpose & when to read
2. Shared foundations (prompt templates, import specs, naming conventions, quality gates)
3. MVP pipeline (workflow, rules, Design Mode integration)
4. Release pipeline (workflow, rules, style lock, licensing)
5. AI-Factory workflow integration (mode sequence, CLAUDE.md config, file structure, MVP→Release transition)

## Integration Points

- `stacks/godot/STACK.md` — add `ai_assets.md` to the file index table
- `docs/plans/2026-03-14-roadmap.md` — item 1.5 covers the guardrails implementation (rate limiting, budget gates) that wraps around this pipeline
- Project CLAUDE.md files — declare `tier`, `mvp_backend`, `release_backend`
