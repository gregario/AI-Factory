# AI Asset Generation (2D)

This guide covers how to generate, import, and manage AI-created 2D assets in Godot projects. It is tool-agnostic — it defines pipeline rules, prompt structures, and quality gates, not specific tools.

Read this file when a Godot project needs AI-generated sprites, icons, textures, tilesets, or UI elements.

---

## Two Tiers

Every project operates in one of two asset generation tiers.

| | MVP Tier | Release Tier |
|---|---|---|
| **Goal** | Placeholder assets for testing mechanics | Commercial-quality assets for shipping |
| **Speed** | Fast, one-pass generation | Deliberate, batch-reviewed |
| **Style training** | None — base model prompts only | LoRA or equivalent if Design Mode specifies |
| **Backend** | User's choice: local (free) or cheap cloud | User's choice: premium API, trained model, or service |
| **Human gates** | Manifest approval before generation | Manifest approval + batch review + final sign-off |

The project's CLAUDE.md declares the active tier and backends:

```markdown
## Asset Generation
tier: mvp  # or: release
mvp_backend: local  # or: cloud
release_backend: cloud  # or: local
```

---

## Shared Foundations

These apply to both tiers.

### Prompt Template

Use this structure for all 2D asset generation prompts:

```
[object description], game asset, isolated
style: [art style from design tokens]
view: [top-down / side / front / isometric]
lighting: flat studio
background: transparent
color palette: [hex values from theme.json]
detail: [low / medium / high]
resolution: [target size]px
```

Negative prompt baseline:

```
blurry, photorealistic, complex background, watermark, text, 3D render, drop shadow
```

Adapt both to the project's art style. Save working prompts in `design/prompts/`.

### Godot Import Requirements

- **Format:** PNG (RGBA) for all 2D assets.
- **Resolution:** Consistent sizes within a category (e.g. all item icons 64x64, all character sprites 128x256). Power-of-2 not required for 2D.
- **Filter mode:** Pixel art → `Nearest`. Clean/flat art → `Linear`. Set in Godot's import panel; the `.import` file is auto-generated.
- **Atlasing:** Group related sprites into atlas candidates. Godot handles atlas packing on import.

### Naming Conventions

All assets use `snake_case` with a category prefix:

```
src/assets/icons/icon_gold_coin.png
src/assets/sprites/sprite_bartender_idle.png
src/assets/tiles/tile_floor_wood.png
src/assets/ui/ui_panel_dark.png
src/assets/ui/ui_button_primary.png
```

MVP-only assets add a `_placeholder` suffix:

```
src/assets/icons/icon_gold_coin_placeholder.png
```

### Quality Gates

Every generated asset passes through:

1. **Transparency check** — no background artifacts or fringing.
2. **Palette check** — colors match design tokens within tolerance.
3. **Size check** — matches target resolution for its category.
4. **Consistency check** — visually coheres with existing assets in the same category.

At MVP tier, these checks can be quick visual scans. At Release tier, they require deliberate human review.

---

## MVP Pipeline

### Purpose

Get visual placeholders into the game fast so mechanics can be tested with something that looks like the real thing rather than grey boxes.

### Design Mode Deliverables

Design Mode produces these alongside its standard wireframes and tokens:

- **Style seed** — 3-5 reference images or descriptions that anchor the visual direction.
- **Asset manifest** — list of assets needed, categorized, with target sizes and prompt sketches.
- Art direction notes captured for later use in Release tier.

### Workflow

```
Design Mode style seed + wireframes
        ↓
Agent analyses game state and design docs
        ↓
Agent produces asset manifest (categories, counts, sizes, prompt sketches)
        ↓
Human reviews and approves manifest
        ↓
Generate assets per approved manifest
        ↓
Quick quality gate pass (transparency, size)
        ↓
Import to Godot with _placeholder suffix
        ↓
Test in-game
        ↓
Flag keepers vs throwaway in design notes
```

### MVP Rules

- **Asset manifest requires human approval.** The agent determines what's needed, presents the manifest, and waits for sign-off before generating anything.
- **One generation pass per asset.** No iteration loops. If it's 70% right, ship it as a placeholder.
- **No style training.** Base model prompts only. LoRA is a Release tier activity.
- **Batch by category.** Generate a full category at once (e.g. "12 ingredient icons") rather than one-by-one.
- **Tag everything.** All MVP assets use the `_placeholder` suffix. This makes the Release tier transition grep-able.
- **Capture learnings.** Save working prompts to `design/prompts/mvp/`. Note failures and why. This library feeds the Release tier.

---

## Release Pipeline

### Purpose

Replace MVP placeholders with commercial-quality, consistent assets ready for shipping. Informed by everything learned during MVP iteration.

### Design Mode Deliverables

- **Style reference sheet** — curated set of approved assets that define the final look. Built from MVP keepers and new reference material.
- **Release asset manifest** — placeholder audit + any new assets needed. Starting point: `grep -r "_placeholder" src/assets/`.
- LoRA training brief if consistency requires it (training images, captions, style notes).
- Store/platform asset requirements (capsule art, screenshot specs, icon sizes).

### Workflow

```
Design Mode style reference sheet
        ↓
Agent produces release manifest (placeholder audit + new assets)
        ↓
Human reviews and approves manifest
        ↓
Style training if specified by Design Mode
        ↓
Generate assets in small batches
        ↓
Human reviews each batch for consistency and quality
        ↓
Cleanup pass (transparency, palette correction, edge cleanup)
        ↓
Replace _placeholder files (same name, drop suffix)
        ↓
Import to Godot, verify in-game
        ↓
Final human sign-off per category
```

### Release Rules

- **Style lock before generation.** No asset generation until the style reference sheet is approved. Generating before style lock wastes credits.
- **Human review per batch.** The agent presents each batch for approval before moving to the next category.
- **Placeholder audit first.** The replacement list comes from scanning for `_placeholder` assets. This is the starting point, not a guess.
- **Licensing verification.** Design Mode documents the generation tool and model used. For Steam: comply with current AI-generated content disclosure requirements. Note model license terms.
- **Prompt traceability.** Every shipped asset has its generation prompt saved in `design/prompts/release/`. If an asset needs regeneration, the prompt exists.

---

## AI-Factory Workflow Integration

### Where AI Assets Sit in the Mode Sequence

```
SPEC MODE
  └→ OpenSpec defines features requiring visual assets

DESIGN MODE
  └→ Art direction: style seed (MVP) or style reference sheet (Release)
  └→ Asset manifest: what's needed, sizes, prompt templates
  └→ Wireframes reference asset placeholders by name

EXECUTION MODE
  └→ Agent generates assets per approved manifest
  └→ Import to Godot, wire into scenes
  └→ Test in-game
```

### Extended Design Mode Deliverables

The standard Design Mode deliverables (wireframes, style tokens, mockups) gain two new artifacts when AI assets are involved:

- **Asset manifest** — categorized list with sizes and prompt sketches.
- **Style seed** (MVP) or **Style reference sheet** (Release) — the visual anchor for generation.

### File Structure

```
design/
  prompts/
    mvp/              # prompts used during MVP generation
    release/          # prompts for shipped assets (traceability)
  style-seed/         # MVP reference images and style notes
  style-reference/    # Release reference sheet and approved samples
src/
  assets/
    icons/
    sprites/
    tiles/
    ui/
```

### MVP to Release Transition

1. Run placeholder audit: find all `_placeholder` assets in `src/assets/`.
2. Design Mode reviews MVP prompt library (`design/prompts/mvp/`) and produces style reference sheet.
3. Human approves release manifest.
4. Generate replacements — same filenames without `_placeholder` suffix.
5. Delete old placeholder files. No code changes needed — filenames match.
