# UI Toolkit Stack Profile

This stack profile defines the standard UI component system for all factory web projects.

**This stack layers on top of the TypeScript stack.** Read `stacks/typescript/` first — all TypeScript conventions apply. This file covers UI-specific patterns only.

Before implementing any UI component or layout work, Claude must read this stack profile in full.

---

## Files in This Profile

| File | Read When |
|------|-----------|
| `components.md` | Using shadcn/ui components, building layouts, or choosing component patterns |
| `charts.md` | Adding data visualisation or dashboard charts |
| `icons.md` | Adding icons to buttons, menus, or status indicators |
| `tokens-to-tailwind.md` | Translating Design Mode tokens into Tailwind config and CSS variables |

Also read: `stacks/typescript/STACK.md` (parent stack).

---

## Default Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Component library | **shadcn/ui** | Source code lives in your repo — AI has full context, no black-box imports |
| Styling | **Tailwind CSS** | Utility-first, no runtime CSS-in-JS, co-locates style with markup |
| Primitives | **Radix UI** | Accessible by default (ARIA, keyboard, focus management). shadcn/ui wraps Radix |
| Charts | **Recharts** | React-native, declarative, SSR-compatible |
| Icons | **Lucide React** | 1500+ icons, tree-shakeable, shadcn/ui ecosystem default |

---

## Why shadcn/ui

shadcn/ui is not a traditional component library. It copies component source code into your project. This has specific advantages for AI-assisted development:

**AI has full context.** The component code is in `src/components/ui/`. Claude, v0, and Cursor can read, modify, and reason about every line. No guessing what a library does internally.

**Radix accessibility.** Every interactive component (Dialog, DropdownMenu, Tabs, etc.) inherits Radix's ARIA patterns, keyboard navigation, and focus trapping. You get accessibility without implementing it.

**Tailwind-native.** Styling uses Tailwind utility classes and CSS variables. No styled-components, no emotion, no runtime CSS-in-JS overhead.

**AI generation fluency.** v0, Claude, and Cursor all generate shadcn/ui code fluently. It is the de facto standard for AI-generated React UI. Fighting this wastes time.

**No version lock-in.** Since you own the source, there are no breaking upgrades. Update individual components when you choose to.

---

## Core Principles

**Components are source code, not dependencies.**
shadcn/ui components live in your repo. Treat them as owned code — read them, modify them, extend them. They are not a black box.

**Tailwind for layout and spacing, CSS variables for theming.**
Use Tailwind utilities (`flex`, `gap-4`, `p-6`) for layout. Use CSS variables (`--primary`, `--radius`) for theme values that change between light/dark mode or per-project branding.

**Accessibility is non-negotiable.**
Radix handles the hard parts (focus trapping, ARIA roles, keyboard navigation). Do not override these behaviours. If a component feels inaccessible, the issue is in your usage, not Radix.

**Progressive disclosure.**
Show primary actions visibly. Put secondary actions in DropdownMenu or Sheet. Do not overwhelm the user with every possible action at once.

**Every data view has five states.**
Empty, loading, populated, error, overflow (pagination/scroll). Design and implement all five. Skipping states produces a fragile UI.

---

## Project Setup

```bash
# In a Next.js or Vite project with Tailwind already configured
npx shadcn@latest init

# Add components as needed
npx shadcn@latest add button card dialog
```

Components are placed in `src/components/ui/` by default. Project-level composite components (that combine multiple shadcn primitives) go in `src/components/` without the `ui/` prefix.

Convention:
- `src/components/ui/button.tsx` — shadcn/ui primitive (generated, lightly modified)
- `src/components/data-table.tsx` — project composite (uses Table, Button, Input, etc.)
- `src/components/dashboard/stats-card.tsx` — feature-specific composite

---

## When to Override

The shadcn/ui + Tailwind + Radix stack is the default. Projects CAN use a different UI library if there is a justified reason. The justification must be documented in the project's CLAUDE.md.

Valid reasons to override:
- The project is a Godot game (no web UI)
- The project uses a framework with its own component system (e.g. Flutter, SwiftUI)
- A specific dependency requires a different styling approach
- Performance constraints require a lighter solution

Invalid reasons:
- "I prefer Material UI" — preference is not justification
- "shadcn doesn't have component X" — add it or build it
- "Tailwind is too verbose" — that is how it works

---

## References

- [shadcn/ui docs](https://ui.shadcn.com/)
- [Radix UI primitives](https://www.radix-ui.com/primitives)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Recharts](https://recharts.org/)
- [Lucide icons](https://lucide.dev/)
