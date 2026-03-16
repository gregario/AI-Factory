## ADDED Requirements

### Requirement: Design Mode Pass 2 — Component Design
The factory's Design Mode SHALL include a Component Design pass as the second of three sequential design passes. This pass SHALL execute after UX Architecture and before Visual Design. It maps each screen region to specific components from the standard library.

#### Scenario: Component Design follows UX Architecture
- **WHEN** the UX Architecture pass deliverables are complete
- **THEN** the Component Design pass SHALL begin, using the sitemap, journey maps, and hierarchy spec as inputs

#### Scenario: Pass produces component mapping
- **WHEN** the Component Design pass completes
- **THEN** every screen SHALL have a component mapping document specifying which components are used in each region

### Requirement: Screen-to-component mapping
The Component Design pass SHALL produce a component mapping for each screen. The mapping SHALL specify: the screen region (header, main content, sidebar, etc.), the shadcn/ui component used (Card, DataTable, Dialog, etc.), the data it displays, and the interactions it supports.

#### Scenario: Dashboard screen mapping
- **WHEN** mapping components for a dashboard screen
- **THEN** each content section identified in the information hierarchy SHALL be mapped to a specific shadcn/ui component with its variant and configuration noted

#### Scenario: Component reuse across screens
- **WHEN** the same content pattern appears on multiple screens (e.g., a user card, a status badge)
- **THEN** the component mapping SHALL identify it as a shared component and reference it consistently

### Requirement: 5-state design for every screen
The Component Design pass SHALL design each screen in 5 states: empty (no data yet), loading (data is being fetched), populated (normal state with data), error (something went wrong), and overflow (more data than expected). Each state SHALL specify what the user sees and what actions are available.

#### Scenario: Empty state design
- **WHEN** a screen has no data (new user, empty list, no results)
- **THEN** the component mapping SHALL specify an empty state with: a message explaining why it's empty, a primary action to populate it (e.g., "Create your first book"), and appropriate visual treatment (illustration, icon, or text)

#### Scenario: Error state design
- **WHEN** a screen fails to load or an action fails
- **THEN** the component mapping SHALL specify an error state with: what went wrong (user-friendly language), how to recover (retry button, go back, contact support), and whether partial data is shown

#### Scenario: Overflow state design
- **WHEN** a screen has more data than fits in the default layout (long lists, many items)
- **THEN** the component mapping SHALL specify: pagination or virtual scrolling strategy, how the layout adapts, and whether filtering/search is needed

### Requirement: Progressive disclosure patterns
The Component Design pass SHALL apply progressive disclosure for complex features. Advanced controls, secondary actions, and configuration options SHALL be accessible but not visible by default. The mapping SHALL specify what is visible at first glance vs. what is revealed on interaction.

#### Scenario: Complex form with advanced options
- **WHEN** a form has both essential and advanced fields
- **THEN** the component mapping SHALL show essential fields visible by default and advanced fields behind an expandable section or "Advanced" toggle

#### Scenario: Action menus
- **WHEN** a list item or card has more than 3 actions
- **THEN** the component mapping SHALL show the 2-3 most common actions as visible buttons and remaining actions in a dropdown menu (shadcn/ui DropdownMenu)

### Requirement: Data visualization specification
The Component Design pass SHALL specify data visualization components using Recharts. Each chart SHALL specify: chart type (line, bar, area, pie), data dimensions, axis labels, color mapping from design tokens, and responsive behavior.

#### Scenario: Dashboard chart specification
- **WHEN** a screen includes data visualization
- **THEN** the component mapping SHALL specify the Recharts component type, data shape, and which design tokens map to chart colors

#### Scenario: Responsive chart behavior
- **WHEN** a chart is specified for a screen
- **THEN** the specification SHALL include how the chart adapts on mobile (simplified axes, horizontal scroll, or alternative representation)

### Requirement: Icon usage specification
The Component Design pass SHALL specify icon usage from the Lucide icon set. Each icon SHALL be specified by its Lucide name, size variant, and purpose (decorative, functional, or status indicator).

#### Scenario: Action button icons
- **WHEN** a button or action uses an icon
- **THEN** the component mapping SHALL specify the Lucide icon name, whether it accompanies text or stands alone, and the size variant (sm/md/lg)

### Requirement: Light-pass option for small changes
The Component Design pass SHALL support a light-pass mode for small changes. The light-pass SHALL map components for the affected screens only, without revisiting the full application's component architecture.

#### Scenario: Small feature component mapping
- **WHEN** a change affects only 1-2 screens and uses already-established component patterns
- **THEN** the Component Design pass MAY use light-pass mode, mapping only the new or changed regions
