# Icons — UI Toolkit

Lucide icon conventions for factory web projects.

---

## Why Lucide

**1500+ icons.** Covers virtually every UI concept without reaching for multiple icon sets.

**Tree-shakeable.** Import only the icons you use. No bundle bloat from unused glyphs.

**Consistent style.** 24x24 grid, 2px stroke width, rounded joins. Every icon looks like it belongs with every other icon.

**shadcn/ui ecosystem default.** shadcn/ui uses Lucide throughout its examples and components. Using anything else creates visual inconsistency.

---

## Import Pattern

```tsx
import { Plus, Trash2, Settings } from "lucide-react";
```

Always import named exports. Never import the entire library.

---

## Size Variants

Three standard sizes. Do not invent intermediate sizes.

| Size | Tailwind class | Pixels | When to use |
|------|---------------|--------|-------------|
| sm | `h-4 w-4` | 16px | Inline with text, Badge content, compact UI |
| md | `h-5 w-5` | 20px | Default. Buttons, menu items, nav links |
| lg | `h-6 w-6` | 24px | Page headers, empty states, standalone icons |

```tsx
<Plus className="h-4 w-4" />   {/* sm — inside a compact button */}
<Plus className="h-5 w-5" />   {/* md — standard button icon */}
<Plus className="h-6 w-6" />   {/* lg — page-level CTA */}
```

For empty state illustrations or hero icons, use `h-12 w-12` or larger — but these are decorative, not part of the three-size system.

---

## Accessibility

### Decorative Icons

Icons next to visible text labels. The text already conveys the meaning.

```tsx
<Button>
  <Plus className="h-4 w-4" aria-hidden="true" />
  Create Project
</Button>
```

Add `aria-hidden="true"` so screen readers skip the icon.

### Functional Icons

Icon-only buttons or icons that convey meaning without adjacent text.

```tsx
<Button variant="ghost" size="icon" aria-label="Delete item">
  <Trash2 className="h-4 w-4" />
</Button>
```

The `aria-label` on the Button (or a wrapping Tooltip) provides the accessible name. Without it, the button is invisible to screen readers.

**Rule of thumb:** If removing the icon would remove all meaning, it is functional and needs a label. If removing the icon just makes things less pretty, it is decorative.

---

## Icon-to-Action Mappings

Standard mappings across all factory projects. Do not deviate without reason.

| Action | Icon | Notes |
|--------|------|-------|
| Create / Add | `Plus` | |
| Edit | `Pencil` | Not `Edit` or `Edit2` — those are less recognisable |
| Delete | `Trash2` | Always pair with destructive styling |
| Search | `Search` | |
| Filter | `Filter` | |
| Export / Download | `Download` | |
| Import / Upload | `Upload` | |
| Configure / Settings | `Settings` | |
| Navigate forward | `ChevronRight` | Breadcrumbs, list items, "View details" |
| Close | `X` | Dialogs, sheets, dismissible alerts |
| Confirm / Success | `Check` | |
| Warning | `AlertTriangle` | |
| Info | `Info` | |
| More actions | `MoreHorizontal` | DropdownMenu trigger on rows and cards |
| Refresh / Retry | `RefreshCw` | |
| Copy | `Copy` | "Copy to clipboard" |
| External link | `ExternalLink` | Links that open a new tab |
| Sort ascending | `ArrowUp` | Table column headers |
| Sort descending | `ArrowDown` | Table column headers |
| Loading | `Loader2` | Always add `animate-spin` class |

---

## Patterns

### Button with Icon and Label

```tsx
<Button>
  <Plus className="h-4 w-4" aria-hidden="true" />
  Create
</Button>
```

shadcn/ui Button applies `gap-2` automatically when children include both icon and text.

### Icon-Only Button

```tsx
<Button variant="ghost" size="icon" aria-label="Settings">
  <Settings className="h-4 w-4" />
</Button>
```

Always use `size="icon"` for square icon buttons. Always provide `aria-label`.

### Icon in Input

```tsx
<div className="relative">
  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
  <Input className="pl-9" placeholder="Search..." />
</div>
```

### Status Icon with Colour

```tsx
<Check className="h-4 w-4 text-green-500" />
<AlertTriangle className="h-4 w-4 text-yellow-500" />
<X className="h-4 w-4 text-destructive" />
```

Use semantic colours for status icons. These are functional — the colour carries meaning.
