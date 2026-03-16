## ADDED Requirements

### Requirement: Design Mode Pass 1 — UX Architecture
The factory's Design Mode SHALL include a UX Architecture pass as the first of three sequential design passes. This pass SHALL execute before Component Design and Visual Design. It produces structural UX deliverables that inform all subsequent design work.

#### Scenario: UX Architecture pass runs first
- **WHEN** Design Mode is entered for a web project
- **THEN** the UX Architecture pass SHALL execute before any component mapping or visual design work begins

#### Scenario: Pass produces required deliverables
- **WHEN** the UX Architecture pass completes
- **THEN** the following deliverables SHALL exist: sitemap, user journey maps, and information hierarchy specification

### Requirement: Sitemap generation
The UX Architecture pass SHALL produce a sitemap showing every screen in the application and the navigation paths between them. The sitemap SHALL use a tree or graph structure showing parent-child and lateral navigation relationships.

#### Scenario: New product sitemap
- **WHEN** designing a new product with 3+ screens
- **THEN** the sitemap SHALL list every screen, its URL path, its parent screen, and all navigation paths to/from it

#### Scenario: Feature addition sitemap update
- **WHEN** designing a feature that adds new screens to an existing product
- **THEN** the sitemap SHALL show where the new screens connect to the existing navigation structure

### Requirement: User journey mapping
The UX Architecture pass SHALL produce user journey maps for each core user task. Each journey map SHALL include: the starting state, each step the user takes, the screen visited at each step, and the total click count.

#### Scenario: Core task journey
- **WHEN** mapping a core user task (e.g., "create a new book", "complete checkout")
- **THEN** the journey map SHALL show each step from entry to completion with click counts

#### Scenario: 3-click rule enforcement
- **WHEN** a core user task requires more than 3 clicks to complete
- **THEN** the journey map SHALL flag this as a UX concern and propose a reduced-click alternative

### Requirement: Information hierarchy specification
The UX Architecture pass SHALL produce an information hierarchy for each screen, classifying every content element as primary, secondary, or tertiary. Primary content is the main purpose of the screen. Secondary content supports the primary task. Tertiary content is supplementary (navigation chrome, metadata, help text).

#### Scenario: Dashboard screen hierarchy
- **WHEN** designing a screen with multiple content sections (e.g., a dashboard)
- **THEN** each section SHALL be classified as primary, secondary, or tertiary with rationale for the classification

#### Scenario: Hierarchy informs layout
- **WHEN** the information hierarchy is complete
- **THEN** primary content SHALL occupy the dominant visual position, secondary content SHALL be accessible but subordinate, and tertiary content SHALL not compete for attention with primary content

### Requirement: Task flow analysis
The UX Architecture pass SHALL produce task flows for multi-step user tasks (forms, wizards, checkout flows). Each task flow SHALL show decision points, error recovery paths, and success/failure outcomes.

#### Scenario: Multi-step form flow
- **WHEN** a user task involves 3+ sequential steps (e.g., checkout, onboarding)
- **THEN** the task flow SHALL show each step, what inputs are required, what validation occurs, and how errors are handled at each step

#### Scenario: Error recovery path
- **WHEN** a task flow includes a step that can fail (e.g., payment, API call)
- **THEN** the task flow SHALL show the error state and how the user recovers (retry, go back, contact support)

### Requirement: Light-pass option for small changes
The UX Architecture pass SHALL support a light-pass mode for small changes affecting 1-2 screens. The light-pass SHALL produce a single combined document covering hierarchy and journey for the affected screens only, without a full sitemap.

#### Scenario: Small feature addition
- **WHEN** a change affects only 1-2 existing screens and adds no new screens
- **THEN** the UX Architecture pass MAY use light-pass mode, producing hierarchy and journey analysis for the affected screens only
