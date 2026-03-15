# Coding Standards — Python

## Naming

```python
# Variables and functions: snake_case
current_balance = 500.0
def calculate_revenue(quality_score: float) -> float: ...

# Classes: PascalCase
class BeerStyle:
    id: str
    name: str

class SignalHandler(Protocol):
    async def handle(self, signal: Signal) -> None: ...

# Constants: UPPER_SNAKE_CASE
MAX_RETRIES = 3
DEFAULT_TIMEOUT_SECONDS = 5.0

# Enum members: UPPER_SNAKE_CASE
class Status(str, Enum):
    DRAFT = "draft"
    OPEN = "open"
    CLAIMED = "claimed"
    DONE = "done"

# File names: snake_case, always
# signal_handler.py, brew_calculator.py
```

**Private by convention.**
Prefix with `_` for internal functions and methods. Use `__` (name mangling) only when you genuinely need to prevent subclass collisions — which is almost never.

---

## Type Hints

**Be specific. Avoid `Any`.**
If you must use `Any`, add a comment explaining why. Prefer `object` or `Unknown` patterns when you don't know the type.

```python
# Bad
def parse(data: Any) -> Any: ...

# Good
def parse(data: bytes) -> ParsedResult: ...
```

**Use union types and `|` syntax (Python 3.10+).**
```python
# Good
def find_user(user_id: str) -> User | None: ...

# Also good for complex unions
type Result = Success | Failure | Pending
```

**Use `TypeAlias` or the `type` statement for complex types.**
```python
# Python 3.12+ type statement
type Callback = Callable[[str, int], Awaitable[None]]

# Python 3.11 TypeAlias
Callback: TypeAlias = Callable[[str, int], Awaitable[None]]
```

**Use generics instead of duplicating.**
```python
# Good
from typing import TypeVar
T = TypeVar("T")

async def query(sql: str, params: Sequence[object], model: type[T]) -> list[T]: ...

# Bad — separate function per type
async def query_intent(sql: str, params: Sequence[object]) -> list[Intent]: ...
async def query_claim(sql: str, params: Sequence[object]) -> list[Claim]: ...
```

**Use `Protocol` for structural typing (duck typing with type safety).**
```python
from typing import Protocol

class Serializable(Protocol):
    def to_dict(self) -> dict[str, object]: ...

# Any class with a to_dict method satisfies this — no inheritance needed
```

---

## Data Modelling

**Pydantic for external data. Dataclasses for internal data.**

```python
# External data (API payloads, config, parsed files) — Pydantic
from pydantic import BaseModel, Field

class CreateBrewRequest(BaseModel):
    style_id: str
    name: str = Field(min_length=1, max_length=100)
    temperature_celsius: float = Field(ge=0, le=100)

# Internal data (no validation needed) — dataclasses
from dataclasses import dataclass

@dataclass(frozen=True, slots=True)
class BrewResult:
    quality: float
    flavour_notes: list[str]
```

**Prefer frozen dataclasses and `model_config = ConfigDict(frozen=True)` for immutability.**
Mutable state is the root of most bugs. Make things immutable by default.

**Use `Enum` for fixed sets of values.**
```python
class Phase(str, Enum):
    MASH = "mash"
    BOIL = "boil"
    FERMENT = "ferment"
    CONDITION = "condition"
```

---

## Error Handling

**No bare `except`.**
```python
# Bad
try:
    do_something()
except:
    pass

# Bad — catches KeyboardInterrupt, SystemExit
try:
    do_something()
except Exception:
    pass

# Good — catch specific exceptions
try:
    do_something()
except ValueError as err:
    raise ProcessingError(f"Invalid input: {err}") from err
```

**Always chain exceptions with `from`.**
```python
# Good — preserves the original traceback
try:
    result = parse_config(raw)
except toml.TOMLDecodeError as err:
    raise ConfigError(f"Failed to parse config: {err}") from err
```

**Use exception groups (Python 3.11+) for concurrent error handling.**
```python
async with asyncio.TaskGroup() as tg:
    tg.create_task(fetch_users())
    tg.create_task(fetch_teams())
# If both fail, you get an ExceptionGroup with both errors
```

**Don't catch exceptions you can't handle.**
Let them propagate to somewhere that can handle them meaningfully.

---

## Async Patterns

**Use `asyncio.TaskGroup` over `gather` for concurrent work.**
```python
# Good — structured concurrency, exceptions propagate properly
async with asyncio.TaskGroup() as tg:
    users_task = tg.create_task(fetch_users())
    teams_task = tg.create_task(fetch_teams())
users = users_task.result()
teams = teams_task.result()

# Avoid — gather swallows exceptions by default
results = await asyncio.gather(fetch_users(), fetch_teams())
```

**Use async context managers for resource lifecycle.**
```python
async with aiohttp.ClientSession() as session:
    response = await session.get(url)
```

**Never mix sync and async I/O.**
If your function does I/O, it should be async. Don't call `requests.get()` inside an async function — use `httpx` or `aiohttp`.

---

## Module Structure

**One concept per file.**
A file should export one primary class or a cohesive group of related functions.
If you're defining five unrelated classes, split the file.

**Explicit imports.**
```python
# Good — clear where things come from
from myapp.models import BrewResult
from myapp.db import get_connection

# Bad — star import pollutes namespace
from myapp.models import *
```

**Use `__all__` in public modules.**
```python
__all__ = ["BrewResult", "calculate_quality"]
```

---

## Code Style

**Use `match`/`case` for complex branching (Python 3.10+).**
```python
match event:
    case BrewStarted(style=style):
        log.info("Starting brew", style=style)
    case BrewCompleted(quality=q) if q > 90:
        log.info("Excellent brew!")
    case _:
        log.warning("Unknown event", event=event)
```

**Early returns over nested conditionals.**
```python
# Good
def get_user(user_id: str) -> User:
    user = users.get(user_id)
    if user is None:
        raise UserNotFoundError(f"User {user_id} not found")
    return user

# Bad
def get_user(user_id: str) -> User:
    user = users.get(user_id)
    if user is not None:
        return user
    else:
        raise UserNotFoundError(f"User {user_id} not found")
```

**Keep functions short.**
If a function exceeds ~50 lines, extract helpers.
If it has more than 4 parameters, use a dataclass or Pydantic model.

**Use `pathlib.Path` over `os.path`.**
```python
# Good
from pathlib import Path
config_path = Path("config") / "settings.toml"

# Bad
import os
config_path = os.path.join("config", "settings.toml")
```

**Use f-strings for interpolation.**
```python
# Good
msg = f"User {user_id} not found"

# Bad
msg = "User " + user_id + " not found"
msg = "User %s not found" % user_id
```

---

## Logging

**Use structured logging. Never `print()` in production code.**
```python
import structlog

log = structlog.get_logger()

# Good — structured key-value pairs
log.info("brew_completed", style=style.name, quality=result.quality)

# Bad — unstructured string
print(f"Brew completed: {style.name} with quality {result.quality}")
```

**Log at appropriate levels.**
- `debug` — development-only detail
- `info` — normal operations worth recording
- `warning` — something unexpected but handled
- `error` — something failed and needs attention
