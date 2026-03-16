# Information Hierarchy Spec Template

> **UX Architecture pass.** Classify every element on a screen by importance. This determines what gets visual dominance, what supports it, and what stays out of the way. Without this, screens become flat walls of equally-weighted content. Copy this template and fill in the blanks.

---

## Instructions

1. Inventory every visible element on the screen (text, controls, data, media).
2. Classify each as primary, secondary, or tertiary:
   - **Primary**: The reason the user is on this screen. Gets dominant size, position, contrast.
   - **Secondary**: Supports the primary content. Visible but does not compete for attention.
   - **Tertiary**: Supplementary. Available but de-emphasized. Often revealed on hover or tucked into menus.
3. Write a one-line rationale for each classification.
4. Note the layout implication (where it goes, how big, how prominent).

---

## Template

```
SCREEN: [screen name]
URL: [url path]
PURPOSE: [one sentence — why does this screen exist?]

CONTENT INVENTORY

  Element                   Class       Rationale                           Layout Implication
  ------------------------  ----------  ----------------------------------  ---------------------------
  [element name]            Primary     [why this is the main thing]        [position, size, emphasis]
  [element name]            Secondary   [why this supports the primary]     [position, size, emphasis]
  [element name]            Tertiary    [why this is supplementary]         [position, size, emphasis]
  ...

HIERARCHY SUMMARY
  Primary focus:   [what the eye hits first]
  Secondary band:  [what the eye moves to next]
  Tertiary zone:   [available but not competing]
```

---

## Worked Example: Dashboard screen (TaskFlow)

```
SCREEN: Dashboard
URL: /dashboard
PURPOSE: Give the user an at-a-glance picture of what needs attention today.

CONTENT INVENTORY

  Element                   Class       Rationale                                    Layout Implication
  ------------------------  ----------  -------------------------------------------  ------------------------------------
  "My Tasks" list           Primary     This is why they open the app — what's       Top-left, largest content block.
                                        due today and overdue.                       Full-width on narrow screens.

  Task count + overdue      Primary     Headline metric reinforcing urgency.         Bold number above the task list.
  count                                 "3 tasks today, 1 overdue."                 Overdue count in red accent.

  Recent activity feed      Secondary   Context on what teammates did. Helps         Right column, below the fold on
                                        the user decide priorities.                  narrow screens. Scrollable.

  Project cards (top 3)     Secondary   Quick access to active projects without      Horizontal row below the task
                                        going to Projects screen.                    list. Card format, 3 max.

  "New Project" button      Secondary   Common action but not the primary reason     Inside project cards row, as a
                                        for visiting the dashboard.                  ghost/dashed card at the end.

  Greeting / user name      Tertiary    Personalization. Nice but not functional.    Top of page, small text. Does not
                                                                                     take vertical space from tasks.

  Upgrade banner            Tertiary    Business goal but not user goal. Must not    Slim banner at very top or bottom.
  (free tier only)                      block the user's work.                       Dismissible. Muted color.

  Keyboard shortcut hint    Tertiary    Power user convenience. Most users ignore.   Bottom-right corner, faded text.
                                                                                     Hidden after first dismissal.

HIERARCHY SUMMARY
  Primary focus:   Task list and count — the eye lands on "3 tasks today" and scans the list.
  Secondary band:  Activity feed and project cards provide context and navigation without competing.
  Tertiary zone:   Greeting, upgrade banner, and shortcut hints stay out of the way.
```
