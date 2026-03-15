# Common Pitfalls — Python

This file documents mistakes that appear repeatedly in Python projects.
Read this when debugging unexpected behaviour or reviewing code.

It starts lean and grows from experience. When you hit a gotcha, add it here.

---

## Pitfall 1: Mutable Default Arguments

**What it looks like:**
```python
def add_item(item: str, items: list[str] = []) -> list[str]:
    items.append(item)
    return items
```

**Why it breaks:**
Default mutable arguments are shared across all calls. The list is created once at function definition time, not per call. Every invocation mutates the same list.

**Fix:**
```python
def add_item(item: str, items: list[str] | None = None) -> list[str]:
    if items is None:
        items = []
    items.append(item)
    return items
```

---

## Pitfall 2: Catching Too Broadly

**What it looks like:**
```python
try:
    result = process(data)
except Exception:
    pass
```

**Why it breaks:**
This catches `KeyboardInterrupt` (in some contexts), `SystemExit`, and every other exception. Bugs are silently swallowed. You'll spend hours debugging why something "doesn't work" when the answer is hiding in a caught exception.

**Fix:**
Catch specific exceptions. Log or re-raise everything else.
```python
try:
    result = process(data)
except ValueError as err:
    log.warning("Invalid data", error=str(err))
    result = default_value
```

---

## Pitfall 3: Not Using `from` When Re-raising Exceptions

**What it looks like:**
```python
try:
    config = load_config(path)
except FileNotFoundError:
    raise ConfigError(f"Config file missing: {path}")
```

**Why it breaks:**
The original traceback is lost. When debugging, you see where `ConfigError` was raised but not the original `FileNotFoundError` that caused it.

**Fix:**
```python
try:
    config = load_config(path)
except FileNotFoundError as err:
    raise ConfigError(f"Config file missing: {path}") from err
```

---

## Pitfall 4: Using `os.path` Instead of `pathlib`

**What it looks like:**
```python
import os
config_dir = os.path.join(os.path.dirname(__file__), "..", "config")
config_file = os.path.join(config_dir, "settings.toml")
if os.path.exists(config_file):
    with open(config_file) as f:
        ...
```

**Why it breaks:**
It doesn't break per se, but `os.path` is stringly-typed and error-prone. Paths are strings, so you get no help from the type system and it's easy to build invalid paths.

**Fix:**
```python
from pathlib import Path
config_dir = Path(__file__).parent.parent / "config"
config_file = config_dir / "settings.toml"
if config_file.exists():
    content = config_file.read_text()
```

---

## Pitfall 5: Forgetting `await` in Async Code

**What it looks like:**
```python
async def get_user(user_id: str) -> User:
    result = fetch_user(user_id)  # missing await
    return result
```

**Why it breaks:**
`result` is a coroutine object, not the actual result. The function returns the coroutine, and the actual work never executes. In the best case you get a type error; in the worst case, the coroutine is silently garbage collected and Python prints `RuntimeWarning: coroutine 'fetch_user' was never awaited`.

**Fix:**
```python
async def get_user(user_id: str) -> User:
    result = await fetch_user(user_id)
    return result
```

Enable the `-W error::RuntimeWarning` flag during development to catch these immediately.

---

## Pitfall 6: Mixing Sync and Async I/O

**What it looks like:**
```python
import requests

async def fetch_data(url: str) -> dict:
    response = requests.get(url)  # blocks the event loop
    return response.json()
```

**Why it breaks:**
`requests.get()` is synchronous. Inside an async function, it blocks the entire event loop — no other coroutines can run until the HTTP request completes. This defeats the purpose of async.

**Fix:**
Use an async HTTP client:
```python
import httpx

async def fetch_data(url: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        return response.json()
```

Or, if you must use a sync library, run it in a thread:
```python
import asyncio

async def fetch_data(url: str) -> dict:
    response = await asyncio.to_thread(requests.get, url)
    return response.json()
```

---

## Pitfall 7: Import-Time Side Effects

**What it looks like:**
```python
# config.py
import os
DATABASE_URL = os.environ["DATABASE_URL"]  # crashes if env var missing at import time
```

**Why it breaks:**
Code runs at import time, before your application has a chance to set up the environment. Tests fail because the env var isn't set during test collection. Module import order becomes load-bearing.

**Fix:**
Defer side effects. Use Pydantic `BaseSettings` or a function:
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str

    model_config = ConfigDict(env_file=".env")

# Call when needed, not at import time
def get_settings() -> Settings:
    return Settings()
```

---

## Pitfall 8: Using `isinstance` With Pydantic Models Incorrectly

**What it looks like:**
```python
data = {"name": "IPA", "bitterness": 60}
model = BeerStyle(**data)
assert isinstance(model, dict)  # False — Pydantic models are not dicts
```

**Why it breaks:**
Pydantic v2 models are not dict subclasses. Code that passes dicts around and then checks `isinstance(x, dict)` will fail when it encounters a Pydantic model.

**Fix:**
Use `.model_dump()` when you need a dict:
```python
data = model.model_dump()
assert isinstance(data, dict)  # True
```

---

## Pitfall 9: Circular Imports

**What it looks like:**
```python
# models.py
from myapp.services import validate_brew

# services.py
from myapp.models import Brew  # circular!
```

**Why it breaks:**
Python imports are executed top-to-bottom. When `models.py` tries to import from `services.py`, which tries to import from `models.py` (which isn't finished loading), you get `ImportError` or `AttributeError`.

**Fix:**
- Move shared types to a separate `types.py` module
- Use `TYPE_CHECKING` for type-hint-only imports:
```python
from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from myapp.services import BrewService
```

---

## Pitfall 10: Not Closing Async Resources

**What it looks like:**
```python
client = httpx.AsyncClient()
response = await client.get(url)
# client is never closed
```

**Why it breaks:**
Unclosed HTTP clients, database connections, and file handles leak resources. In tests, this causes warnings and eventually resource exhaustion.

**Fix:**
Always use async context managers:
```python
async with httpx.AsyncClient() as client:
    response = await client.get(url)
```

---

## Checklist Before Committing Code

- [ ] Does `uv run mypy --strict .` pass with no errors?
- [ ] Does `uv run ruff check .` pass?
- [ ] Does `uv run ruff format --check .` pass?
- [ ] Are all async functions properly awaited?
- [ ] Are there no mutable default arguments?
- [ ] Are exceptions caught specifically, not broadly?
- [ ] Are all resources properly closed (context managers)?
- [ ] Do all tests pass with `uv run pytest`?
