## Context

The factory's Design Mode (CLAUDE.md lines 55-64) currently defines a single design pass producing: wireframes, style tokens, UI theme/config, mockups, and interaction specs. This is technology-agnostic by design — it doesn't specify component libraries, UX methodology, or information architecture practices.

In practice, this means:
- Wireframes are drawn without first mapping user journeys or information hierarchy
- No component library is specified, so Engineer Claude hand-rolls Tailwind components each time
- The same UI decisions (icon library, chart library, spacing system) are rediscovered per project
- Projects like colourbookpub-kdp and colourbookpub-saas both use Tailwind + custom CSS properties but with no shared foundation
- The "design" phase produces visual specs but not structural UX reasoning

The factory ships ~6 web products. All use Next.js + Tailwind. The current ecosystem leader for AI-friendly component libraries is shadcn/ui (copy-to-repo model, Radix primitives, Tailwind-native).

## Goals / Non-Goals

**Goals:**
- Upgrade Design Mode from 1 pass to 3 sequential passes, each producing distinct deliverables
- Add UX Architecture as a first-class design discipline (IA, journeys, click budgets, hierarchy)
- Standardise the UI component toolkit for all Next.js/React web projects
- Document the tokens-to-tailwind pipeline so design tokens flow into implementation
- Make the three-pass workflow enforceable via CLAUDE.md instructions (no new tooling required)

**Non-Goals:**
- Building a shared component library package across projects (over-engineering for solo factory)
- Figma or Storybook MCP integration (future Bucket 3 work)
- Retroactively redesigning existing shipped projects (they can adopt incrementally)
- Supporting non-React frameworks (Godot projects use their own design patterns)
- Creating a visual design tool or preview system

## Decisions

### Decision 1: Three sequential passes, not parallel

**Choice:** UX Architecture → Component Design → Visual Design, strictly sequential.

**Rationale:** Each pass needs the output of the previous one. You can't map components to screen regions without knowing the information hierarchy. You can't design visual tokens without knowing which components you're styling. Parallel passes would produce disconnected deliverables.

**Alternative considered:** Two passes (merge UX + Component into one). Rejected because the UX Architecture pass requires a different cognitive posture (user-centric thinking about flows and hierarchy) than Component Design (implementation-aware mapping to a specific library). Mixing them weakens both.

### Decision 2: shadcn/ui as the default component system

**Choice:** shadcn/ui + Tailwind CSS + Radix UI primitives.

**Rationale:**
- Source code lives in the repo (`src/components/ui/`), giving AI full context — the #1 factor in AI-generated UI quality
- Built on Radix primitives (accessibility, keyboard nav, ARIA handled)
- Tailwind-native — tokens map directly to utility classes
- v0.dev, Claude, and Cursor all generate shadcn/ui fluently
- No runtime CSS-in-JS overhead
- Community consensus: dominant choice for new React projects in 2025-2026

**Alternatives considered:**
- Chakra UI: prop-based API is good DX but runtime CSS-in-JS, heavier bundle, losing mindshare
- Material UI: massive breadth but opinionated visual style, heavy runtime, harder to customise
- Headless UI only (Radix without shadcn): too much boilerplate per component, no pre-styled starting point
- No library (raw Tailwind): current approach — produces inconsistent, unpolished results

### Decision 3: Recharts for data visualization, Lucide for icons

**Choice:** Standardise on Recharts + Lucide React as supporting libraries.

**Rationale:**
- Recharts: React-native, declarative API, good AI generation support, already used in KDP and SaaS projects
- Lucide: 1500+ icons, tree-shakeable, consistent style, already used in factory projects
- Both are de facto standards in the shadcn/ui ecosystem
- Codifying what's already working avoids churn

**Alternatives considered:**
- D3 directly: too low-level for dashboard-style charts, AI generates poor D3 code
- Chart.js/react-chartjs-2: canvas-based (not SSR-friendly), less React-idiomatic
- Heroicons: fewer icons, Tailwind Labs maintained but smaller set
- Phosphor Icons: good quality but smaller community

### Decision 4: UX deliverables as markdown, not visual tools

**Choice:** All UX Architecture deliverables (sitemaps, journey maps, hierarchy specs) are markdown documents with ASCII/text diagrams.

**Rationale:** The factory's Design Claude operates in a text-based environment. Markdown deliverables are version-controllable, diffable, and directly consumable by Engineer Claude. Visual tools (Figma, Whimsical) require context-switching and can't be read by the implementation agent.

**Alternative considered:** Mermaid diagrams for sitemaps/flows. Acceptable as an enhancement within markdown files but not required — ASCII diagrams are faster to produce and equally readable.

### Decision 5: Stack profile, not a skill

**Choice:** Document the UI toolkit as a stack profile (`stacks/ui/`) rather than a skill.

**Rationale:** Stack profiles are read-once reference material consulted during implementation. The UI toolkit is a set of decisions and patterns, not a workflow to execute. Skills are for workflows (QA, ship, review). The three-pass Design Mode workflow is documented in CLAUDE.md (the authoritative workflow document), with the stack profile providing reference material about the specific tools.

### Decision 6: 5-state design requirement

**Choice:** Every screen MUST be designed in 5 states: empty, loading, populated, error, overflow.

**Rationale:** The most common visual bug in factory products is undesigned states — a page that looks fine with data but shows a blank void when empty, or breaks when the list has 500 items. Requiring all 5 states during Component Design catches this before implementation.

## Risks / Trade-offs

**[Risk] Three passes add ceremony to small features** → Mitigation: Small enhancements that touch 1-2 screens can compress passes 1+2 into a single document. The three-pass structure is the full treatment; CLAUDE.md should note that trivial changes can use a lighter version (same as product-taste has quick triage for small items).

**[Risk] shadcn/ui lock-in** → Mitigation: shadcn/ui components are source code in the repo, not a dependency. If a better system emerges, components can be migrated individually. The Radix primitives underneath are stable and framework-agnostic.

**[Risk] Design Mode takes longer** → Mitigation: The time investment shifts from "debugging poorly-designed UIs in implementation" to "getting it right in design." Net time should be neutral or positive. The key metric is total time from spec to shipped feature, not time in Design Mode alone.

**[Risk] UX Architecture deliverables are unfamiliar territory for AI** → Mitigation: Information architecture and journey mapping are well-documented UX disciplines with clear frameworks. The spec will provide templates and examples for each deliverable type. AI excels at structured document generation when given clear templates.

**[Trade-off] Standardisation vs flexibility** → We're choosing consistency over per-project optimisation. A project that would benefit from a different chart library can override, but the default is Recharts. This trade-off favours the factory's throughput over individual project perfection.
