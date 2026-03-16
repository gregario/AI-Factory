# Components — UI Toolkit

Reference guide for commonly used shadcn/ui components. This is not a tutorial — it documents factory-specific patterns and when to reach for each component.

---

## The Five-State Pattern

Every data-driven component must handle five states. No exceptions.

| State | What to show |
|-------|-------------|
| **Empty** | Illustration or message with a CTA. "No projects yet. Create your first project." |
| **Loading** | Skeleton placeholders that match the populated layout shape |
| **Populated** | The actual data |
| **Error** | Alert with a description and retry action |
| **Overflow** | Pagination, infinite scroll, or "Show more" — never render 10,000 rows |

If you skip a state, you ship a bug.

---

## Progressive Disclosure Pattern

Primary actions are visible. Secondary actions live in a DropdownMenu or Sheet.

```tsx
// Primary: always visible
<Button onClick={handleCreate}>Create Project</Button>

// Secondary: behind a menu
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon">
      <MoreHorizontal className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={handleEdit}>Edit</DropdownMenuItem>
    <DropdownMenuItem onClick={handleDuplicate}>Duplicate</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

Destructive actions go last, after a separator, styled with `text-destructive`.

---

## Component Reference

### Button

**When to use:** Any clickable action — submitting forms, triggering operations, navigation CTAs.

**Variants:**
- `default` — primary actions (one per visible group)
- `secondary` — alternative actions alongside a primary
- `outline` — lower emphasis, often used in toolbars
- `ghost` — icon-only buttons, table row actions, minimal chrome
- `destructive` — delete, remove, cancel operations
- `link` — looks like a hyperlink, behaves like a button

**Factory patterns:**
- One `default` variant per visible action group. Two primary buttons next to each other is a design smell.
- Icon-only buttons use `size="icon"` and must have an accessible label (either `aria-label` or a Tooltip).
- Loading state: replace label with `<Loader2 className="h-4 w-4 animate-spin" />` and disable the button.

---

### Card

**When to use:** Grouping related content with a visual boundary. Dashboard metrics, list items, detail panels.

**Structure:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Supporting text</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Main content */}
  </CardContent>
  <CardFooter>
    {/* Actions */}
  </CardFooter>
</Card>
```

**Factory patterns:**
- CardFooter actions align right: `<CardFooter className="justify-end gap-2">`.
- Clickable cards: wrap the entire Card in a link or add `cursor-pointer hover:border-primary` transition.
- Stat cards: CardTitle is the metric label, CardContent is the big number, CardDescription is the trend.

---

### DataTable

**When to use:** Tabular data with sorting, filtering, or pagination. Built on `@tanstack/react-table` + shadcn's Table.

**Factory patterns:**
- Always implement column sorting for the primary identifier column.
- Add a toolbar row above the table with search Input and filter DropdownMenus.
- Empty state: replace the table body with a centered empty message, not a separate component.
- Pagination: use shadcn Pagination below the table. Show "Showing X–Y of Z" text.
- Row actions: ghost Button with MoreHorizontal icon, opening a DropdownMenu (progressive disclosure).

---

### Dialog

**When to use:** Modal confirmations, create/edit forms, detail views that require focus.

**Factory patterns:**
- Destructive confirmations: describe the consequence, not just "Are you sure?". "This will permanently delete 3 projects and all their data."
- Form dialogs: DialogFooter contains Cancel (outline variant) and Submit (default variant). Cancel is always on the left.
- Close on success: after a successful form submission, close the dialog and show a Toast.
- Never nest dialogs. If you need a sub-flow, use a Sheet or navigate to a page.

---

### DropdownMenu

**When to use:** Secondary actions on a row or card. Contextual menus. Any "more actions" pattern.

**Factory patterns:**
- Trigger is typically a ghost icon-only Button with `MoreHorizontal` or `EllipsisVertical`.
- Group related items. Separate groups with `DropdownMenuSeparator`.
- Destructive items: last position, after a separator, with `className="text-destructive"`.
- Keyboard shortcuts: use `DropdownMenuShortcut` to show them, but only if the shortcuts actually work.

---

### Form

**When to use:** Any user input that gets submitted. Built on `react-hook-form` + `zod` + shadcn Form components.

**Factory patterns:**
- Always use Zod schemas for validation. The schema is the single source of truth for form shape and rules.
- Use `FormField` > `FormItem` > `FormLabel` + `FormControl` + `FormDescription` + `FormMessage` structure consistently.
- Inline validation errors appear via `FormMessage` (automatic from Zod).
- Submit button in a flex container aligned right: `<div className="flex justify-end">`.
- Disable the submit button while `form.formState.isSubmitting`.

---

### Input

**When to use:** Single-line text entry. Search fields, name fields, URL fields.

**Factory patterns:**
- Always pair with a Label (via FormLabel in forms, or standalone Label component).
- Search inputs: add a `Search` icon inside using a relative-positioned wrapper.
- Disabled inputs: use `disabled` prop, not `readOnly`, unless you specifically want the user to copy the value.

---

### Badge

**When to use:** Status indicators, tags, categories, counts.

**Variants:**
- `default` — active/primary status
- `secondary` — neutral/inactive status
- `outline` — low-emphasis tags
- `destructive` — error/critical status

**Factory patterns:**
- Status badges: map to consistent colours across the project (e.g. `published=default`, `draft=secondary`, `error=destructive`).
- Count badges: `<Badge variant="secondary">{count}</Badge>` next to a tab or section title.
- Removable tags: Badge with an X button inside — `<Badge>Tag <X className="h-3 w-3 ml-1 cursor-pointer" /></Badge>`.

---

### Sheet

**When to use:** Side panel for detail views, filters, settings. Alternative to Dialog when content is tall or benefits from staying alongside the main view.

**Factory patterns:**
- Use `side="right"` for detail panels, `side="left"` for navigation/filters.
- Mobile navigation: Sheet with `side="left"` replaces the sidebar.
- SheetFooter for actions, same pattern as DialogFooter.

---

### Tabs

**When to use:** Switching between related views within the same page context.

**Factory patterns:**
- URL-synced tabs: use query params (`?tab=settings`) so tabs are linkable and survive refresh.
- Tab content should be lazy-loaded if it involves data fetching.
- Do not use Tabs for sequential steps — use a stepper pattern instead.

---

### Alert

**When to use:** Inline messages that need attention — warnings, info, errors, success confirmations (non-toast).

**Variants:**
- `default` — informational
- `destructive` — errors, critical warnings

**Factory patterns:**
- Page-level alerts: full-width at the top of the content area.
- Section-level alerts: inside the relevant Card or section.
- Dismissible alerts: add an X button, but only for informational messages. Error alerts should persist until the error is resolved.

---

### Skeleton

**When to use:** Loading placeholders. Replace the populated layout shape with grey boxes.

**Factory patterns:**
- Match the shape of the real content. A card skeleton should have the same height and structure as a populated card.
- Use `<Skeleton className="h-4 w-[250px]" />` for text lines, `<Skeleton className="h-12 w-12 rounded-full" />` for avatars.
- Repeat skeletons to fill the expected list length (typically 3–5 items).

---

### Toast

**When to use:** Brief, non-blocking feedback after an action — "Saved", "Deleted", "Copied to clipboard".

**Factory patterns:**
- Success toasts: auto-dismiss after 3–5 seconds.
- Error toasts: persist until dismissed (add `duration: Infinity`).
- Never use a toast for critical information the user must act on — use Alert or Dialog.
- One toast at a time. If a new action fires while a toast is showing, replace it.
- Use the `sonner` integration (`npx shadcn@latest add sonner`) — it is simpler than the radix-based toast.
