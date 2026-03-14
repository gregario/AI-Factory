# Design Layer — AI-Factory

This folder contains the Design System and instructions used during DESIGN MODE. When implementing any UI or screen, Supervisor Claude must instruct Design Claude to produce deliverables described here before handing tasks to Superpowers.

## Deliverables from DESIGN MODE

1. Low-fidelity wireframes for each screen/scene.
2. Style tokens (colours, typography, spacing) in a theme config file.
3. Annotated mockups showing layout and behaviour for each screen.
4. Interaction specification for animations, transitions, accessibility.

## How to use

Design deliverables are technology-agnostic at the factory level. Each project adapts them to its stack:

- **Web projects** — tokens become CSS custom properties or a Tailwind config
- **Game projects** — tokens become engine theme resources (e.g., Godot `.tres`, Unity ScriptableObjects)
- **Mobile projects** — tokens become platform design system values

The `templates/` folder contains starter theme configs. Copy and adapt for your project.

Best practice: follow layered design passes — layout, then style, then micro-interactions.
