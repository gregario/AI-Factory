## Why

The factory's Design Mode produces functional but unpolished UIs. It jumps from wireframes to style tokens without structural UX work (information architecture, user journeys, click-depth analysis, content hierarchy) and never specifies which components to use. End users of factory-shipped products experience this as friction, cognitive load, and "this feels like a developer tool, not a product." Every web project rediscovers UI choices (icons, charts, component primitives) ad hoc, producing inconsistent results. The gap between "tests pass" and "this looks designed" is where user trust and willingness to pay live.

## What Changes

- **Upgrade Design Mode from 1 pass to 3 passes**: UX Architecture → Component Design → Visual Design. Each pass produces distinct deliverables and informs the next.
- **Add UX Architecture pass**: Sitemap, user journey maps with click counts, task flows, information hierarchy per page, content priority (primary/secondary/tertiary). This is the "why things go where" layer that's currently missing.
- **Add Component Design pass**: Map each screen region to specific components from the standard library (shadcn/ui). Design all 5 states per screen (empty, loading, populated, error, overflow). Specify data visualization and icon usage.
- **Standardise the UI toolkit**: shadcn/ui + Tailwind CSS + Radix primitives as the default component system. Recharts for data visualization. Lucide for icons. Document in stack profiles.
- **Add a "3-click rule"**: Every core user task must complete in 3 clicks or fewer, enforced during UX Architecture pass.
- **Update the web-product template**: Include shadcn/ui initialization, standard component scaffold, and the three-pass Design Mode instructions.
- **Create UI toolkit stack profile**: New `stacks/ui/` documenting component library choices, decision rationale, and the tokens-to-tailwind pipeline.

## Capabilities

### New Capabilities
- `ux-architecture`: UX Architecture pass — sitemap generation, user journey mapping, task flow analysis, click-depth budgets, information hierarchy specification, content priority per page
- `component-design`: Component Design pass — screen-to-component mapping using shadcn/ui, 5-state design (empty/loading/populated/error/overflow), progressive disclosure patterns
- `ui-toolkit`: Standard UI toolkit stack profile — shadcn/ui + Tailwind + Radix as default component system, Recharts for charts, Lucide for icons, tokens-to-tailwind pipeline

### Modified Capabilities
<!-- No existing specs to modify — factory-level OpenSpec is new -->

## Impact

- **CLAUDE.md**: Design Mode section (lines 55-64) rewritten with three-pass workflow
- **Stack profiles**: New `stacks/ui/STACK.md` and supporting files. Updates to `stacks/typescript/STACK.md` (UI framework section)
- **Templates**: `templates/web-product/CLAUDE.md` updated with three-pass instructions and framework defaults. Template scaffold gains shadcn/ui initialization
- **Downstream projects**: All future web projects follow the new Design Mode. Existing projects (colourbookpub-saas, colourbookpub-kdp) can retroactively adopt
- **Dependencies**: shadcn/ui (via npx shadcn@latest), @radix-ui/*, recharts, lucide-react added to web project defaults
- **No breaking changes**: Existing Design Mode deliverables (tokens, wireframes, interaction specs) are preserved as Visual Design pass. New passes are additive.
