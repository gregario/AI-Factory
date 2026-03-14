# Testing — Godot 4

## Approach

Godot projects in this factory must include automated tests.
Tests run headlessly via `make test` and must exit 0 before any commit.

Two test types are required:

**Unit tests** — test game logic in isolation, without scenes.
**Smoke tests** — verify that critical scenes instantiate and initialise without errors.

---

## Tool: GUT (Godot Unit Test)

All tests use [GUT](https://github.com/bitwes/Gut) (Godot Unit Test).

Install location: `res://addons/gut/`
Config file: `res://.gutconfig.json`

Standard `.gutconfig.json`:
```json
{
  "dirs": ["res://tests/"],
  "prefix": "test_",
  "suffix": ".gd",
  "include_subdirs": true,
  "inner_class_prefix": "test_",
  "double_strategy": "script_only",
  "log_level": 1,
  "should_exit": false,
  "should_exit_on_failure": false
}
```

Run all tests headlessly:
```bash
make test
# Or directly:
cd src && "$GODOT" --headless --path . -s res://addons/gut/gut_cmdln.gd -gconfig=res://.gutconfig.json -gexit
```

### Using godot-forge MCP (Preferred)

If the project has godot-forge configured (check `.mcp.json`), prefer the `test-runner` MCP tool over `make test`. It provides structured pass/fail results per test, making failures easier to diagnose. The MCP server also offers `script-analysis`, `scene-analysis`, `docs-search`, and `lsp-diagnostics` tools for development.

`make test` remains the fallback for CI and human use.

---

## Test File Conventions

- Files must be named `test_<subject>.gd` and placed in `res://tests/`
- Each file extends `GutTest`
- Each test function must be named `test_<description>()`
- Use `before_each()` to reset state before every test
- Use `after_each()` to clean up signal connections

```gdscript
extends GutTest

func before_each() -> void:
    GameState.reset()

func after_each() -> void:
    if GameState.some_signal.is_connected(_on_signal):
        GameState.some_signal.disconnect(_on_signal)

func test_starting_balance_is_correct() -> void:
    assert_eq(GameState.balance, GameState.STARTING_BALANCE)
```

---

## What to Test

### Always test
- Economy logic (balance, revenue, win/loss conditions)
- Progression systems (level up, turn advancement, scoring)
- Save/load round-trips
- State machines (transitions, guards)
- Pure calculation functions

### Test logic, not visuals
Do not test that a Label shows the correct text. Test that the underlying value is correct.
Do not test that a button is visible. Test that the state that controls visibility is correct.

### Keep gameplay logic separate from rendering
If logic lives in a script with no scene dependency, it is easy to test.
If logic is buried inside `_draw()` or `_process()` of a visual node, extract it.

```gdscript
# Hard to test: logic inside rendering
func _process(delta: float) -> void:
    if balance >= WIN_TARGET:
        $WinLabel.visible = true

# Easy to test: logic in a pure method, scene only reacts
func check_win_condition() -> bool:
    return balance >= WIN_TARGET
# Scene connects to game_won signal — no logic in the scene itself
```

### Autoloads are the primary test target
Autoloads (`GameState`, `MarketSystem`, `QualityCalculator`) are available in headless tests
without needing to instantiate scenes. Concentrate test coverage here.

---

## Critical Systems That Must Have Tests

Every project must have tests for these systems before shipping:

| System | What to Test |
|--------|-------------|
| Economy | Revenue formula, balance changes, win/loss triggers |
| Save/Load | Data round-trips correctly, no data loss |
| Progression | Turn counter, level advancement, condition checks |
| Market / RNG systems | Distribution, edge cases, rotation logic |
| Quality / Scoring | Score calculation, component weighting, floor/cap |

---

## GUT Assertions Reference

```gdscript
assert_eq(a, b, "message")           # a == b
assert_ne(a, b)                       # a != b
assert_gt(a, b)                       # a > b
assert_lt(a, b)                       # a < b
assert_gte(a, b)                      # a >= b
assert_lte(a, b)                      # a <= b
assert_true(expr)                     # expr is true
assert_false(expr)                    # expr is false
assert_almost_eq(a, b, tolerance)    # float comparison with tolerance
assert_has(dict_or_array, key)        # dict/array contains key
assert_null(value)
assert_not_null(value)

# Signal watching
watch_signals(object)
assert_signal_emitted(object, "signal_name")
assert_signal_not_emitted(object, "signal_name")
```
