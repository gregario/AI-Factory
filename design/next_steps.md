# Design Layer — Next Steps

Action items to complete the Design Mode setup across the factory.

## Factory-Level

- [ ] Review and expand `design/templates/ui_theme.json` with project-specific tokens
- [ ] Document color contrast ratios for accessibility compliance in `design/ux_patterns.md`
- [ ] Add animation timing reference table to `design/animation_and_juice.md`

## beerbrew-tycoon

- [x] Install Kenney UI pack into `projects/beerbrew-tycoon/assets/ui/kenney/` — installed 2026-02-27
- [ ] Create Godot ThemeGen script to convert `design/theme.json` into a `.tres` Godot theme resource
- [ ] Write wireframe for Brew Screen: `design/wireframes/brew-screen.md`
- [ ] Write wireframe for Style Picker: `design/wireframes/style-picker.md`
- [ ] Write wireframe for Results Overlay: `design/wireframes/results-overlay.md`
- [ ] Write wireframe for Main Menu: `design/wireframes/main-menu.md`
- [ ] Create annotated mockup for Brew Screen once wireframe is approved
- [x] Install fonts — Inter-Regular.ttf + Display-Bold.ttf (InterDisplay) in `assets/ui/fonts/` — installed 2026-02-27
- [ ] Set up 9-slice button textures for primary, secondary, and danger button variants

## Stack Profile

- [ ] Add "Design Mode Checklist" to `stacks/godot/pitfalls.md` as a pre-implementation gate
- [ ] Add example wireframe template to `design/templates/wireframe_template.md`

## Process

- [ ] First project to go through full Spec → Design → Execution loop: `godot-stack-refactor` tasks 1–3 (no UI changes, so skip Design Mode for those; tasks 4+ may need it)
- [ ] After first full loop completes, retrospect and update this doc
