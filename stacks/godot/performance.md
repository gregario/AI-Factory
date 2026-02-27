# Performance — Godot 4

## Core Rule

Profile before optimising. Do not optimise code you haven't measured.
Use Godot's built-in profiler (Debugger → Profiler) to identify actual bottlenecks.
Most performance problems in 2D games are not in GDScript — they are in rendering and physics.

---

## What to Avoid

### Creating nodes every frame
Instantiating scenes is expensive. Never call `instantiate()` inside `_process()`.

```gdscript
# Bad: new node every frame
func _process(delta: float) -> void:
    var particle := preload("res://scenes/Spark.tscn").instantiate()
    add_child(particle)

# Good: object pool — reuse nodes
func get_spark() -> Node:
    return _spark_pool.pop_back()  # retrieve from pre-allocated pool
```

### Expensive work in _process()
`_process()` fires every frame (~60x/second). Keep it fast.
Move one-time setup to `_ready()`. Move infrequent updates to timers or signals.

```gdscript
# Bad: recalculating every frame
func _process(delta: float) -> void:
    _current_revenue = _base_price * _quality_mult * _demand_mult

# Good: recalculate only when inputs change
func _on_demand_changed() -> void:
    _current_revenue = _base_price * _quality_mult * _demand_mult
```

### Large numbers of physics bodies
Each `RigidBody2D`, `CharacterBody2D`, and `Area2D` has a physics cost.
For purely visual objects, use `Node2D` or `Sprite2D` — no physics required.

### Large dynamic lights
`PointLight2D` and `DirectionalLight2D` are expensive in 2D.
For pixel art games, prefer baked/static lighting or light textures over real-time dynamic lights.

### String operations in hot paths
String concatenation allocates memory. In frequently-called code, avoid building strings.
Cache formatted strings and only rebuild when the underlying value changes.

```gdscript
# Bad: allocation every frame
func _process(delta: float) -> void:
    score_label.text = "Score: " + str(score)

# Good: rebuild only on change
func _on_score_changed(new_score: int) -> void:
    score_label.text = "Score: %d" % new_score
```

---

## What to Prefer

### Object pooling
Pre-allocate nodes at startup, reuse them rather than creating and freeing.
Useful for bullets, particles, floating text, and any short-lived repeated objects.

### Signals over polling
Every `if` check inside `_process()` is wasted CPU when the condition is rarely true.
Emit a signal at the moment the state changes instead.

### Batching work
If you must process a large collection, spread it across frames using a counter,
or use Godot's `call_deferred()` to push work out of the current frame.

### Profiling early
Run the Godot profiler at the start of performance work, not the end.
**Debugger → Profiler → Start**
Look for functions with high self-time. Fix the biggest hotspot first.

### Visibility-based updates
Pause logic for off-screen or invisible nodes.
Use `VisibleOnScreenNotifier2D` or check `visible` before running updates.

---

## Pixel Art Specific

For pixel art games (320×180 base resolution, stretch mode pixel):

- Set **Stretch Mode: canvas_items** and **Stretch Aspect: keep** in Project Settings.
- Set **Texture Filter** to **Nearest** on imported sprites to prevent blurring.
  (Import tab → Filter: Nearest, or set project default in Rendering → Textures.)
- Keep particle counts low — pixel art games should not have hundreds of particles.
- Test at native resolution AND 4× scale to catch aliasing issues.

---

## Godot Profiler Workflow

1. Open Godot editor, run the game.
2. Open **Debugger → Profiler**, click **Start**.
3. Play through a representative scenario.
4. Click **Stop**, sort by **Self Time**.
5. Fix the top offender. Measure again. Repeat.

Do not guess at performance issues. Measure first.
