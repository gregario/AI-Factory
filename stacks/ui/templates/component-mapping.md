# Component Mapping Template

> **Component Design pass.** Map each screen region to concrete UI components, data, interactions, and states. This bridges the gap between wireframes and implementation — the engineer reads this and knows exactly what to build. Copy this template and fill in the blanks.

---

## Instructions

1. Divide the screen into regions (header, main content, sidebar, footer, modals).
2. For each region, list the shadcn/ui components (or equivalent library) used.
3. Specify what data each component displays and what interactions it supports.
4. Define the 5-state design for the screen: empty, loading, populated, error, overflow.
5. Specify charts (library, component, data shape, responsive behavior).
6. Specify icons (Lucide name, size, purpose).
7. Note progressive disclosure (what is hidden by default and how it is revealed).

---

## Template

```
SCREEN: [screen name]
URL: [url path]

REGIONS

  [Region Name]
  ┌──────────────────────────────────────────────────────────────┐
  │ Component        Data                    Interactions        │
  │ ───────────────  ──────────────────────  ──────────────────  │
  │ [component]      [what it shows]         [what user can do]  │
  │ [component]      [what it shows]         [what user can do]  │
  └──────────────────────────────────────────────────────────────┘

  ... repeat for each region ...

5-STATE DESIGN
  Empty:      [what the user sees when there is no data yet]
  Loading:    [skeleton / spinner / progressive load]
  Populated:  [normal state with data — this is the wireframe]
  Error:      [what happens when data fetch fails]
  Overflow:   [what happens when there is too much data — pagination, virtualization, truncation]

CHARTS
  [Chart name]
    Component:   [Recharts component, e.g., AreaChart, BarChart]
    Data shape:  [{ field: type, ... }]
    Axes:        [x-axis: field, y-axis: field, units]
    Responsive:  [behavior at narrow widths]
    Empty state: [what to show with no data points]

ICONS
  [icon-name] ([size]) — [purpose]
  ...

PROGRESSIVE DISCLOSURE
  [element]: hidden by default, revealed by [trigger]
  ...
```

---

## Worked Example: Dashboard screen (TaskFlow)

```
SCREEN: Dashboard
URL: /dashboard

REGIONS

  Page Header
  ┌──────────────────────────────────────────────────────────────┐
  │ Component        Data                    Interactions        │
  │ ───────────────  ──────────────────────  ──────────────────  │
  │ Heading (h1)     "Dashboard"             None                │
  │ Badge            Task count: "3 today"   None                │
  │ Badge (red)      Overdue: "1 overdue"    Click filters tasks │
  └──────────────────────────────────────────────────────────────┘

  Task List (main content, left)
  ┌──────────────────────────────────────────────────────────────┐
  │ Component        Data                    Interactions        │
  │ ───────────────  ──────────────────────  ──────────────────  │
  │ Card             Container for task list None                │
  │ Checkbox         Task completion state   Toggle done/undone  │
  │ Text (body)      Task title              Click opens task    │
  │ Badge            Priority (high/med/low) None                │
  │ Text (caption)   Due date                None                │
  │ Avatar           Assignee photo          Hover shows name    │
  │ Separator        Between task items      None                │
  └──────────────────────────────────────────────────────────────┘

  Project Cards (main content, below tasks)
  ┌──────────────────────────────────────────────────────────────┐
  │ Component        Data                    Interactions        │
  │ ───────────────  ──────────────────────  ──────────────────  │
  │ Card             Project name, task      Click navigates to  │
  │                  count, progress bar     /projects/:id       │
  │ Progress         % tasks complete        None                │
  │ Text (caption)   "12 of 18 tasks"        None                │
  │ Button (ghost)   "+ New Project" card     Opens create modal  │
  └──────────────────────────────────────────────────────────────┘

  Activity Feed (right column)
  ┌──────────────────────────────────────────────────────────────┐
  │ Component        Data                    Interactions        │
  │ ───────────────  ──────────────────────  ──────────────────  │
  │ Card             Container               None                │
  │ CardHeader       "Recent Activity"       None                │
  │ Avatar           Actor photo             None                │
  │ Text (body)      "[Name] [action] [obj]" Click navigates to  │
  │                                          the referenced item │
  │ Text (caption)   Relative timestamp      Hover shows exact   │
  │ ScrollArea       Scrollable list         Scroll              │
  └──────────────────────────────────────────────────────────────┘

5-STATE DESIGN
  Empty:      No tasks, no projects. Show illustration with "Create your first project"
              button. Activity feed hidden entirely (not an empty card).
  Loading:    Skeleton loaders matching the card and list shapes. 3 skeleton task rows,
              3 skeleton project cards, 5 skeleton activity items. No spinner.
  Populated:  Normal layout as wireframed. Tasks sorted: overdue first (red), then
              today, then upcoming.
  Error:      Inline Alert (destructive variant) replacing the failed section:
              "Couldn't load tasks. [Retry]". Other sections load independently.
  Overflow:   Tasks: show first 10, "View all N tasks" link at bottom.
              Projects: show 3 cards + "View all" link (never more than 3 on dashboard).
              Activity: ScrollArea with max-height, infinite scroll within the card.

CHARTS
  Task Completion Trend (visible when user has 7+ days of data)
    Component:   AreaChart (Recharts)
    Data shape:  { date: string, completed: number, created: number }
    Axes:        x: date (last 14 days), y: task count (auto-scaled)
    Colors:      completed: accent-green, created: accent-blue, fill at 10% opacity
    Responsive:  Below 600px width, hide axis labels, show tooltip only
    Empty state: "Complete a few tasks to see your trend" — muted text, no chart rendered

ICONS
  check-circle (16px) — Task completed state
  circle (16px) — Task incomplete state
  alert-triangle (16px) — Overdue indicator, paired with red badge
  plus (16px) — New project button
  clock (14px) — Timestamp in activity feed
  folder (16px) — Project card icon
  arrow-right (14px) — "View all" links

PROGRESSIVE DISCLOSURE
  Task details: hidden by default, revealed by clicking task title (navigates to task page)
  Activity full message: long messages truncated to 1 line, revealed on hover (tooltip)
  Completion chart: hidden until 7 days of data exist, then shown between tasks and projects
  Keyboard shortcut hint: shown on first 3 visits, hidden after, available via "?" key
```
