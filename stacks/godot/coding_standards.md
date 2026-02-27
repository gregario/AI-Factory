# Coding Standards — GDScript 4

## Style

### Naming
```gdscript
# Variables and functions: snake_case
var current_balance: float = 500.0
func calculate_revenue(quality_score: float) -> float:

# Classes: PascalCase
class_name BeerStyle
extends Resource

# Constants: ALL_CAPS
const MAX_TURNS: int = 50
const STARTING_BALANCE: float = 500.0

# Signals: snake_case, past tense for events
signal balance_changed(new_balance: float)
signal style_selected(style: BeerStyle)
signal game_won()
```

### Typing
Always use explicit types. Never rely on implicit Variant where the type is known.

```gdscript
# Good
var balance: float = 500.0
var style_ids: Array[String] = []
func get_demand(style_id: String) -> float:

# Bad — forces Variant inference, causes errors in Godot 4.6+
var balance = 500.0
var result := some_dict.get("key", null)   # .get() returns Variant
```

**Variant inference from ternaries and Dictionary.get() is a known Godot 4.6 issue.**
Ternary expressions whose branches have different types, and `Dictionary.get()` calls,
return `Variant`. Using `:=` on these causes parse errors. Always use explicit types:

```gdscript
# Bad — causes parse error in Godot 4.6
var name := ingredient.name if ingredient else "—"
var value := my_dict.get("key", null)

# Good
var name: String = ingredient.name if ingredient else "—"
var value: Variant = my_dict.get("key", null)
# Or use a specific type if you know it:
var value: int = my_dict.get("key", 0)
```

---

## Architecture

### Composition over inheritance
Build game objects by combining scenes, not extending classes.
Use `class_name` and `extends` sparingly — mainly for Resource subclasses and autoloads.

```gdscript
# Good: compose behaviour from smaller scenes
# EnemyScene
#   PatrolComponent (scene)
#   AttackComponent (scene)

# Bad: deep inheritance
# class Enemy extends Character extends Entity extends Node2D
```

### Use signals for decoupling
Scenes communicate up the tree via signals. Parents connect and respond.
Never reach sideways or upward through the tree with node paths.

```gdscript
# Good: signal upward
signal recipe_confirmed(recipe: Dictionary)

func _on_brew_pressed() -> void:
    recipe_confirmed.emit({"malt": _malt, "hop": _hop, "yeast": _yeast})

# Bad: reach sideways
func _on_brew_pressed() -> void:
    get_node("/root/Game/GameState").set_recipe(...)  # tight coupling
```

### Avoid global state except controlled autoloads
Do not add autoloads for convenience. Each autoload is global state and increases coupling.
If a system is only used in one area of the game, it does not belong in an autoload.

Acceptable autoloads: `GameState`, `AudioManager`, `SaveSystem`, `MarketSystem`
Not acceptable: `UIHelper`, `StringUtils`, `MathHelper` — make these static functions or helpers.

### Keep scripts under 300 lines
A script over 300 lines is doing too much. Split it.
Options: extract a sub-scene, create a helper Resource subclass, or use composition.

### One responsibility per script
Each script owns one thing. `GameState.gd` owns run state. `MarketSystem.gd` owns demand.
If you find yourself writing "and also..." when describing a script's job, split it.

---

## Godot Patterns

### Use exported variables for tuning
Every numeric constant that affects gameplay feel should be exported.
This allows tuning without touching code.

```gdscript
@export var move_speed: float = 150.0
@export var jump_height: float = 300.0
@export var damage: int = 10
```

### Cache nodes in _ready()
Never call `get_node()` or `$Path` inside `_process()` or other per-frame functions.
Cache all node references in `_ready()`.

```gdscript
@onready var health_label: Label = $HUD/HealthLabel
@onready var animation_player: AnimationPlayer = $AnimationPlayer

# Now use health_label and animation_player freely — no repeated lookups
```

### Avoid hard-coded node paths
Strings like `$"../../UI/Panel/Label"` are fragile. Any scene restructure breaks them.
Use `@onready` with short, direct paths. If paths are long, restructure the scene.

```gdscript
# Bad
func update_ui() -> void:
    get_node("../../../UI/HUD/Container/HealthLabel").text = "..."

# Good
@onready var health_label: Label = $HUD/HealthLabel
func update_ui() -> void:
    health_label.text = "..."
```

### Avoid expensive work in _process()
`_process()` runs every frame. Keep it lean.

```gdscript
# Bad: string allocation every frame
func _process(delta: float) -> void:
    label.text = "Score: " + str(score)  # allocation every frame

# Good: update only when the value changes
func _on_score_changed(new_score: int) -> void:
    label.text = "Score: %d" % new_score
```

### Prefer timers and signals over polling
Do not check a condition every frame to detect a state change.
Use a `Timer` node or emit a signal when the state changes.

```gdscript
# Bad: polling every frame
func _process(delta: float) -> void:
    if GameState.balance >= WIN_TARGET:
        _show_win_screen()

# Good: signal-driven
func _ready() -> void:
    GameState.game_won.connect(_show_win_screen)
```

### Disconnect signals in _exit_tree when needed
If a node connects to a signal in `_ready()`, disconnect in `_exit_tree()` to prevent
memory leaks and errors after the node is freed.

```gdscript
func _ready() -> void:
    GameState.balance_changed.connect(_on_balance_changed)

func _exit_tree() -> void:
    if GameState.balance_changed.is_connected(_on_balance_changed):
        GameState.balance_changed.disconnect(_on_balance_changed)
```
