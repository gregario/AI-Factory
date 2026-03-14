# Game UI Patterns

Patterns specific to game projects. Skip this doc for web/mobile products.

- Menus: Start, Settings, Pause, Inventory. Each menu is its own scene, designed as modular reusable components.
- HUD: Small, minimal, single-purpose controls. Provide toggles for detailed overlays.
- Screen flow: map each player state to a canonical screen; annotate transitions.
- Wireframe guidelines: use 3 passes — (1) skeleton layout (boxes), (2) spacing and token assignment, (3) styling and polish.
- Overlay architecture: overlays should be managed centrally with mutual exclusion (only one overlay visible at a time).
