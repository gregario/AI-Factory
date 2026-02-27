# Project Structure — Godot 4

## Standard Folder Layout

```
res://
  scenes/         # All .tscn scene files
  scripts/        # Standalone resource scripts (Resource subclasses, data classes)
  assets/         # Art, audio, fonts, and other raw assets
  ui/             # UI-only scenes (HUD, menus, overlays, dialogs)
  autoloads/      # Autoload singleton scripts
  data/           # Game data as .tres resource files (configs, items, levels)
  tests/          # GUT test scripts
  addons/         # Third-party plugins (GUT, etc.)
```

### Purpose of Each Folder

**scenes/**
Game scenes — enemies, players, levels, pickups, world objects.
Each major concept in the game gets its own .tscn file here.
Sub-folders are allowed for grouping (e.g. `scenes/enemies/`, `scenes/ui/`).

**scripts/**
Pure GDScript files that define Resource subclasses or data structures.
These have no visual representation. Examples: `BeerStyle.gd`, `Ingredient.gd`, `SaveData.gd`.

**assets/**
Raw assets organised by type:
```
assets/
  sprites/
  audio/
    music/
    sfx/
  fonts/
```
Never reference assets by hardcoded path in scripts — use exported variables or constants.

**ui/**
Scenes that are purely UI: menus, HUD elements, overlays, dialogs, result screens.
UI scenes belong here, not in `scenes/`.
UI scenes must not contain gameplay logic.

**autoloads/**
One script per autoload singleton. Keep this folder small.
Registered in Project Settings → Autoload.
Examples: `GameState.gd`, `AudioManager.gd`, `SaveSystem.gd`.

**data/**
`.tres` resource files. Game data that designers tune without touching code.
Examples: item definitions, level configs, enemy stats.
Organised by type: `data/styles/`, `data/ingredients/`, `data/levels/`.

**tests/**
All GUT test scripts. File names must start with `test_`.
Mirrors the structure of what is being tested where logical.

---

## Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Scene files | PascalCase.tscn | `BreweryScene.tscn`, `StylePicker.tscn` |
| Script files | snake_case.gd | `game_state.gd`, `quality_calculator.gd` |
| Node names in scene | PascalCase | `PlayerSprite`, `HitboxArea`, `AudioPlayer` |
| Variables | snake_case | `current_balance`, `is_brewing` |
| Constants | ALL_CAPS | `MAX_TURNS`, `STARTING_BALANCE` |
| Signals | snake_case (past tense for events) | `style_selected`, `balance_changed`, `game_won` |
| Exported vars | snake_case | `@export var base_price: float` |
| Classes (class_name) | PascalCase | `class_name BeerStyle` |
| Autoload singletons | PascalCase | `GameState`, `MarketSystem` |
| Test files | test_*.gd | `test_economy.gd`, `test_quality_calculator.gd` |

---

## Scene Architecture Rules

**Each major game concept gets its own scene.**
A player, an enemy, a UI panel, a pickup — each is its own `.tscn`.
Do not build everything in one giant scene.

**Scenes must not assume their parent.**
A scene should function correctly regardless of where it is instanced.
Never use `get_parent().do_something()` or hardcode a path to a parent node.

**Scenes communicate via signals, not node paths.**
The correct pattern is: child emits a signal → parent (or root) connects and responds.
Never do `$../../SomeOtherNode.method()` to reach across the tree.

**Avoid deep node path dependencies.**
`$Panel/VBox/Container/Label` is a red flag. If you have deep paths, restructure the scene
or expose the node as an `@onready` variable and cache it.

**One script per scene when possible.**
A scene should have one script on its root node. Keep that script focused.
If the root script exceeds 300 lines, extract logic into a helper script or sub-scene.

---

## Recommended Scene Pattern

Structure scenes using this layout as a starting point:

```
RootNode (script attached here)
  Visual      ← Sprite2D, MeshInstance3D, or AnimatedSprite2D
  Collision   ← CollisionShape2D / Area2D / CharacterBody2D
  Audio       ← AudioStreamPlayer
```

The script lives on the root node and coordinates the child components.
Child nodes are dumb — they hold data and state, not logic.
Logic lives in the root script.

---

## Resource Files (.tres)

Custom Resource subclasses define game data schemas (`scripts/BeerStyle.gd`).
Instances are `.tres` files stored in `data/`.

**Critical rule:** `.tres` files must use `type="Resource"` in the `[gd_resource]` header,
NOT `type="BeerStyle"` or any custom class name. Godot's resource loader cannot resolve
custom class names at parse time.

Correct:
```
[gd_resource type="Resource" load_steps=2 format=3]
[ext_resource type="Script" path="res://scripts/BeerStyle.gd" id="1"]
[resource]
script = ExtResource("1")
style_id = "lager"
```

Wrong:
```
[gd_resource type="BeerStyle" ...]   ← causes "Cannot get class" error at runtime
```
