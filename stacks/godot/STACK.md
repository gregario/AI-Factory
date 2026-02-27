# Godot 4 Stack Profile

This stack profile defines how ALL Godot 4 projects in the AI-Factory must be built.

Before implementing any code in a Godot project, Claude must read this stack profile in full.
This is not optional. Ignoring the stack profile produces inconsistent, unmaintainable code.

---

## Files in This Profile

| File | Read When |
|------|-----------|
| `project_structure.md` | Creating new files, scenes, or folders |
| `coding_standards.md` | Writing any GDScript |
| `testing.md` | Writing tests or adding to an existing test suite |
| `performance.md` | Optimising, profiling, or working on hot paths |
| `pitfalls.md` | Debugging unexpected behaviour or reviewing code |

---

## Core Principles

These principles apply to every Godot project in this factory, without exception.

**Prefer composition over inheritance.**
Build behaviour by combining small scenes and components. Avoid deep class hierarchies.
Godot's scene tree is the composition system — use it.

**Scenes are reusable building blocks.**
Every major game concept gets its own scene. A scene should work in isolation.
It must not assume anything about its parent or the world around it.

**Scripts should be small and single-purpose.**
If a script is doing two things, it should be two scripts.
Keep scripts under 300 lines. When you exceed that, it is a signal to refactor.

**Autoloads should be minimal.**
Autoloads are global state. Every autoload increases coupling.
Only create an autoload for systems that genuinely need to be globally accessible
(e.g. GameState, AudioManager, SaveSystem). Do not create autoloads for convenience.

**Use signals for communication.**
Scenes communicate with each other through signals, not direct node references.
A child signals upward. A parent connects and responds.
Never reach across the scene tree to call methods on distant nodes.

**Avoid tight coupling between scenes.**
A scene should not know the internal structure of another scene.
Pass data through signals and exported variables, not `get_node()` paths.
