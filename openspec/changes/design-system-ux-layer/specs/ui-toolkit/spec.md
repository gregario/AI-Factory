## ADDED Requirements

### Requirement: UI toolkit stack profile
The factory SHALL maintain a UI toolkit stack profile at `stacks/ui/` documenting the standard component library, supporting libraries, and integration patterns for all web projects.

#### Scenario: New web project reads stack profile
- **WHEN** Engineer Claude begins implementation on a web project
- **THEN** the UI toolkit stack profile SHALL be read alongside the TypeScript and framework-specific stack profiles

#### Scenario: Stack profile contents
- **WHEN** the UI toolkit stack profile is consulted
- **THEN** it SHALL contain: default component library (shadcn/ui), icon library (Lucide), chart library (Recharts), the tokens-to-tailwind pipeline, and decision rationale for each choice

### Requirement: shadcn/ui as default component system
All new web projects SHALL use shadcn/ui as the default component system. shadcn/ui SHALL be initialized during project setup via `npx shadcn@latest init`. Components SHALL be added as needed via `npx shadcn@latest add <component>`.

#### Scenario: New web project initialization
- **WHEN** a new web project is created from the web-product template
- **THEN** shadcn/ui SHALL be initialized with Tailwind CSS and Radix UI primitives configured

#### Scenario: Component addition during implementation
- **WHEN** Engineer Claude needs a component specified in the Component Design mapping (e.g., DataTable, Dialog, Card)
- **THEN** the component SHALL be added via `npx shadcn@latest add <name>` and customised to match the design tokens

#### Scenario: Override for non-standard projects
- **WHEN** a project has a specific reason to use a different component library
- **THEN** the project's CLAUDE.md SHALL document the override and rationale, and the project SHALL still follow the three-pass Design Mode workflow

### Requirement: Recharts as default chart library
All web projects requiring data visualization SHALL use Recharts as the default charting library.

#### Scenario: Chart implementation
- **WHEN** a Component Design mapping specifies a chart
- **THEN** the implementation SHALL use Recharts with responsive containers and design token colors

### Requirement: Lucide as default icon library
All web projects SHALL use Lucide React as the default icon library. Icons SHALL be imported individually for tree-shaking.

#### Scenario: Icon implementation
- **WHEN** a Component Design mapping specifies an icon by Lucide name
- **THEN** the implementation SHALL import the specific icon from `lucide-react` (e.g., `import { Plus } from "lucide-react"`)

### Requirement: Tokens-to-tailwind pipeline
The UI toolkit stack profile SHALL document how Design Mode style tokens map to Tailwind CSS configuration. Color tokens SHALL map to `tailwind.config.ts` theme extensions. Spacing tokens SHALL map to Tailwind's spacing scale. Typography tokens SHALL map to font-family, font-size, and font-weight utilities.

#### Scenario: Design tokens applied to tailwind config
- **WHEN** the Visual Design pass produces style tokens (color palette, typography, spacing)
- **THEN** the tokens SHALL be translated into `tailwind.config.ts` theme extensions so that utility classes reference the design system (e.g., `bg-primary`, `text-heading`, `p-content`)

#### Scenario: shadcn/ui theme integration
- **WHEN** design tokens are applied to the Tailwind config
- **THEN** shadcn/ui's CSS variables SHALL be updated to match the design tokens, ensuring all shadcn/ui components automatically use the project's visual identity

### Requirement: Web-product template includes UI toolkit
The web-product template SHALL include shadcn/ui initialization instructions, the `src/components/ui/` directory convention, and references to the UI toolkit stack profile.

#### Scenario: Template setup instructions
- **WHEN** a developer creates a project from the web-product template
- **THEN** the template CLAUDE.md SHALL include steps to initialize shadcn/ui and reference the UI toolkit stack profile for component and library choices

### Requirement: Three-pass Design Mode in CLAUDE.md
The factory CLAUDE.md SHALL document the three-pass Design Mode workflow: UX Architecture → Component Design → Visual Design. Each pass SHALL list its required deliverables and the handoff criteria to the next pass.

#### Scenario: CLAUDE.md Design Mode section
- **WHEN** Design Mode is described in the factory CLAUDE.md
- **THEN** it SHALL specify three sequential passes with deliverables for each, replacing the current single-pass description

#### Scenario: Handoff between passes
- **WHEN** a design pass completes
- **THEN** the CLAUDE.md instructions SHALL specify what deliverables must exist before the next pass can begin
