# Common Pitfalls — Godot 4 / GDScript

This file documents mistakes that appear repeatedly in Godot projects.
Read this when debugging unexpected behaviour or reviewing code.

---

## Pitfall 1: Tight Node Path Coupling

**What it looks like:**
```gdscript
get_node("../../UI/HUD/ScoreLabel").text = str(score)
get_parent().get_parent().call("update_balance")
```

**Why it breaks:**
Any scene restructure silently breaks the path. No compile-time error. Crashes at runtime.

**Fix:**
Use signals to communicate up. Pass references via exported variables.
```gdscript
signal score_changed(new_score: int)
# Parent connects; child just emits.
```

---

## Pitfall 2: Giant Scripts

**What it looks like:**
One `.gd` file that handles input, UI updates, game logic, save/load, and audio.

**Why it breaks:**
Impossible to test in isolation. Hard to read. Changes in one area break unrelated code.

**Fix:**
Split into focused scripts. Each script owns one system.
Under 300 lines is a good target. If a script does two things, it should be two scripts.

---

## Pitfall 3: Too Many Autoloads

**What it looks like:**
`UIHelper`, `StringUtils`, `GameConfig`, `AudioHelper`, `SceneManager`, `InputHelper` — all autoloads.

**Why it breaks:**
Every autoload is global state. They create hidden dependencies between systems.
Code that seems decoupled is actually tightly bound to the global state of these singletons.

**Fix:**
Only autoload systems that genuinely must be globally accessible across the entire game:
`GameState`, `SaveSystem`, `AudioManager`. Static functions or helper Resources cover the rest.

---

## Pitfall 4: Mixing Gameplay and UI Logic

**What it looks like:**
```gdscript
# Inside a Label script:
func _process(delta: float) -> void:
    if GameState.balance >= GameState.WIN_TARGET:
        GameState.run_won = true
        get_tree().change_scene_to_file("res://scenes/WinScreen.tscn")
```

**Why it breaks:**
UI scenes that make gameplay decisions are impossible to test without running the full scene.
They also couple the UI tightly to game rules.

**Fix:**
Gameplay logic lives in autoloads or pure GDScript classes.
UI scenes only react to signals — they never make decisions.

---

## Pitfall 5: Variant Type Inference in Godot 4.6

**What it looks like:**
```gdscript
var name := ingredient.name if ingredient else "—"
var result := my_dict.get("key", null)
```

**Why it breaks:**
In Godot 4.6, warnings about Variant inference are treated as errors by default.
`Dictionary.get()` always returns `Variant`. Ternary expressions with mixed types return `Variant`.
Using `:=` on these causes parse errors that prevent the script from loading.

**Fix:**
Use explicit types instead of `:=` inference when the value could be `Variant`:
```gdscript
var name: String = ingredient.name if ingredient else "—"
var result: Variant = my_dict.get("key", null)
```

---

## Pitfall 6: Custom Class Names in .tres Headers

**What it looks like:**
```
[gd_resource type="BeerStyle" ...]
[gd_resource type="Ingredient" ...]
```

**Why it breaks:**
Godot's resource loader cannot resolve custom `class_name` classes at parse time.
This causes `Cannot get class 'BeerStyle'` errors at runtime, and resources silently fail to load.

**Fix:**
Always use `type="Resource"` in `.tres` headers. The script assignment handles the runtime type:
```
[gd_resource type="Resource" load_steps=2 format=3]
[ext_resource type="Script" path="res://scripts/BeerStyle.gd" id="1"]
[resource]
script = ExtResource("1")
```

---

## Pitfall 7: Connecting Signals Without Disconnecting

**What it looks like:**
```gdscript
func _ready() -> void:
    GameState.balance_changed.connect(_on_balance_changed)
# No disconnect in _exit_tree
```

**Why it breaks:**
If the node is freed but the autoload still holds a reference to the connection,
callbacks fire on a freed object. This causes `Invalid call` errors and crashes.

**Fix:**
Always disconnect in `_exit_tree()` when connecting to autoload or long-lived signals:
```gdscript
func _exit_tree() -> void:
    if GameState.balance_changed.is_connected(_on_balance_changed):
        GameState.balance_changed.disconnect(_on_balance_changed)
```

---

## Pitfall 8: _ready() Load Order (Children Before Parents)

**What it looks like:**
Parent scene's `_ready()` calls `setup_market()`, but child scenes access market data in their own `_ready()`.
Child `_ready()` fires first — market is not yet set up — silent failure.

**Why it breaks:**
In Godot 4, `_ready()` is called bottom-up: leaf nodes first, root last.
If a parent configures a system in `_ready()`, children cannot rely on it during their own `_ready()`.

**Fix:**
Either move setup earlier (e.g. use a dedicated `setup()` method called explicitly),
or have children defer their initialisation until the parent emits a `ready` signal.

---

## Pitfall 9: Premature Optimisation

**What it looks like:**
Replacing readable GDScript with complex caches, bitfields, or C# before measuring any performance.

**Why it breaks:**
Most 2D pixel art games in GDScript never hit a performance ceiling.
Premature optimisation makes code harder to read and maintain for no gain.

**Fix:**
Profile first. Optimise only measured bottlenecks. Keep GDScript readable.

---

## Pitfall 10: Overusing Inheritance

**What it looks like:**
```
Entity → Character → Player
Entity → Character → Enemy → Archer
Entity → Character → Enemy → Melee → HeavyMelee
```

**Why it breaks:**
Deep inheritance chains make behaviour changes cascade unpredictably.
Overriding a method three levels deep is a maintenance trap.

**Fix:**
Use composition. Attach behaviour components as child scenes.
Prefer `@export` variables and signals over virtual methods.

---

## Checklist Before Committing Code

Run through this list before every commit:

- [ ] Does this follow the scene architecture? (each concept = its own scene)
- [ ] Are scripts small and focused? (under 300 lines, one responsibility)
- [ ] Are signals used instead of node paths for cross-scene communication?
- [ ] Are exported variables used for any gameplay-tunable values?
- [ ] Are all `.tres` files using `type="Resource"` in the header?
- [ ] Are `Variant`-returning expressions typed explicitly (no `:=` on `.get()` or mixed ternaries)?
- [ ] Are signal connections cleaned up in `_exit_tree()` where needed?
- [ ] Do all modified systems have passing unit tests?
- [ ] Does `make test` exit 0?
