## 1. UI Toolkit Stack Profile

- [x] 1.1 Create `stacks/ui/STACK.md` — document shadcn/ui as default component system with decision rationale, Radix primitives, and when to override
- [x] 1.2 Create `stacks/ui/components.md` — reference guide for commonly used shadcn/ui components (Card, DataTable, Dialog, Form, Badge, DropdownMenu, Sheet, Tabs, etc.) with factory-specific usage patterns
- [x] 1.3 Create `stacks/ui/charts.md` — Recharts patterns: responsive containers, design token color mapping, common chart types (line, bar, area, pie), mobile adaptation strategies
- [x] 1.4 Create `stacks/ui/icons.md` — Lucide icon conventions: import patterns, size variants (sm/md/lg), when to use decorative vs functional icons, common icon-to-action mappings
- [x] 1.5 Create `stacks/ui/tokens-to-tailwind.md` — pipeline doc: how Design Mode style tokens map to `tailwind.config.ts` extensions, shadcn/ui CSS variable integration, worked example from KDP project

## 2. Update Factory CLAUDE.md — Three-Pass Design Mode

- [x] 2.1 Rewrite Design Mode section (MODE 2) with three sequential passes: UX Architecture → Component Design → Visual Design
- [x] 2.2 Document UX Architecture pass deliverables: sitemap, user journey maps (with click counts), task flows, information hierarchy per page
- [x] 2.3 Document Component Design pass deliverables: screen-to-component mapping (shadcn/ui), 5-state design (empty/loading/populated/error/overflow), progressive disclosure patterns, chart and icon specifications
- [x] 2.4 Document Visual Design pass deliverables: style tokens, theme config, interaction spec (preserved from current Design Mode, now informed by passes 1-2)
- [x] 2.5 Document handoff criteria between passes — what must exist before the next pass begins
- [x] 2.6 Document light-pass option for small changes (1-2 screens) — compressed single-document format
- [x] 2.7 Add 3-click rule to Design Mode instructions — core tasks must complete in 3 clicks or fewer, flagged during UX Architecture pass

## 3. Update TypeScript Stack Profile

- [x] 3.1 Add UI Framework section to `stacks/typescript/STACK.md` — reference `stacks/ui/` for component library choices
- [x] 3.2 Document default project dependencies: shadcn/ui, @radix-ui/*, recharts, lucide-react

## 4. Update Web-Product Template

- [x] 4.1 Update `templates/web-product/CLAUDE.md` — replace single-pass Design Mode instructions with three-pass workflow, add framework default to `next`
- [x] 4.2 Add shadcn/ui initialization to template setup instructions (`npx shadcn@latest init`)
- [x] 4.3 Add `src/components/ui/` directory convention to template structure
- [x] 4.4 Update iteration loop to reference three-pass Design Mode
- [x] 4.5 Add references to UI toolkit stack profile (`stacks/ui/`)

## 5. Create UX Architecture Deliverable Templates

- [x] 5.1 Create `stacks/ui/templates/sitemap.md` — template for sitemap deliverable with example (tree structure, URL paths, navigation connections)
- [x] 5.2 Create `stacks/ui/templates/journey-map.md` — template for user journey maps with example (steps, screens, click counts, 3-click rule flags)
- [x] 5.3 Create `stacks/ui/templates/hierarchy-spec.md` — template for information hierarchy specification with example (primary/secondary/tertiary classification per screen)
- [x] 5.4 Create `stacks/ui/templates/component-mapping.md` — template for screen-to-component mapping with example (regions, shadcn/ui components, 5-state designs, chart/icon specs)

## 6. Validation

- [ ] 6.1 Dry-run the three-pass Design Mode against a single screen from colourbookpub-saas (e.g., landing page or dashboard) to validate the workflow produces useful deliverables
- [x] 6.2 Review all new stack profile docs for accuracy and completeness
- [x] 6.3 Verify web-product template instructions are self-contained (new project can follow them without ambiguity)
