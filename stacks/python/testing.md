# Testing — Python

## Framework: pytest

Every Python project in this factory uses pytest. No unittest, no nose.

pytest is configured in `pyproject.toml`:
```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["src"]
addopts = "-v --tb=short --strict-markers"
markers = [
    "slow: marks tests as slow (deselect with '-m \"not slow\"')",
    "integration: marks tests requiring external services",
]
```

Run tests with uv:
```bash
uv run pytest                    # all tests
uv run pytest tests/test_brew.py # single file
uv run pytest -k "test_quality"  # by name pattern
uv run pytest -m "not slow"     # skip slow tests
uv run pytest --cov=src         # with coverage
```

---

## When to Use Which Test Type

### Unit Tests

**Use when:**
- Pure functions with no side effects
- Complex business logic or calculations
- Parsers, validators, transformers
- You want fast feedback during development

**Trade-offs:**
- Fast to run, no infrastructure needed
- Lower confidence about integration boundaries
- Can give false confidence if you mock too much

### Integration Tests

**Use when:**
- The logic lives in database queries, API calls, or framework glue
- Mocking the boundary would test nothing useful
- The integration IS the logic
- You need confidence that components work together

**Trade-offs:**
- Slower to run (database, network, etc.)
- Need infrastructure (Docker, test databases)
- Higher confidence that the system actually works

### End-to-End / Scenario Tests

**Use when:**
- Testing user-facing workflows (CLI commands, API sequences)
- Validating that a multi-step process works as a whole
- Documenting how the system is meant to be used

---

## Fixtures

**Use fixtures for setup, not helper functions.**
```python
import pytest
from myapp.db import Database

@pytest.fixture
def db() -> Generator[Database, None, None]:
    database = Database(":memory:")
    database.migrate()
    yield database
    database.close()

@pytest.fixture
def sample_style() -> BeerStyle:
    return BeerStyle(id="ipa", name="IPA", bitterness=60)

def test_create_brew(db: Database, sample_style: BeerStyle) -> None:
    brew = db.create_brew(style=sample_style, name="Test IPA")
    assert brew.style_id == "ipa"
```

**Fixture scope matters.**
- `scope="function"` (default) — fresh per test, safest
- `scope="module"` — shared across a file, good for expensive setup
- `scope="session"` — shared across the entire run, use for database connections

```python
@pytest.fixture(scope="session")
def db_connection() -> Generator[Connection, None, None]:
    conn = create_connection()
    yield conn
    conn.close()

@pytest.fixture(autouse=True)
def clean_db(db_connection: Connection) -> Generator[None, None, None]:
    yield
    db_connection.execute("DELETE FROM brews")
```

**Use `conftest.py` for shared fixtures.**
Place `conftest.py` in the `tests/` directory. pytest discovers it automatically — no imports needed.

---

## Parametrize

**Use `@pytest.mark.parametrize` for testing multiple inputs.**
```python
@pytest.mark.parametrize(
    "temperature,expected_efficiency",
    [
        (62.0, 0.65),
        (66.0, 0.75),
        (70.0, 0.85),
        (72.0, 0.90),
    ],
)
def test_mash_efficiency(temperature: float, expected_efficiency: float) -> None:
    result = calculate_mash_efficiency(temperature)
    assert result == pytest.approx(expected_efficiency, abs=0.01)
```

**Use IDs for readability.**
```python
@pytest.mark.parametrize(
    "input_text,expected",
    [
        pytest.param("", [], id="empty-string"),
        pytest.param("one", ["one"], id="single-word"),
        pytest.param("one two", ["one", "two"], id="two-words"),
    ],
)
def test_tokenize(input_text: str, expected: list[str]) -> None:
    assert tokenize(input_text) == expected
```

---

## Assertions

**Assert behaviour, not implementation.**
```python
# Good — tests the result
assert result.status == "done"
assert len(signals) == 1

# Bad — tests internal implementation details
mock_db.query.assert_called_with("UPDATE...")
```

**Use `pytest.approx` for floating-point comparisons.**
```python
assert calculate_quality(recipe) == pytest.approx(87.5, abs=0.1)
```

**Use `pytest.raises` for expected exceptions.**
```python
def test_reject_invalid_temperature() -> None:
    with pytest.raises(ValueError, match="Temperature must be"):
        set_temperature(-10.0)
```

**One logical assertion per test.**
Multiple `assert` calls are fine if they're checking different aspects of the same behaviour. If a test checks two unrelated things, split it.

---

## What to Test

### Always test
- State transitions and lifecycle
- Error paths and validation (what happens with bad input)
- Edge cases (empty collections, None values, boundary conditions)
- Data round-trips (serialise/deserialise, save/load)
- Pydantic model validation (both valid and invalid inputs)

### Skip testing
- Framework internals (pytest, FastAPI, SQLAlchemy)
- Type checking (that's mypy's job)
- Third-party library behaviour
- Trivial properties

---

## Mocking Guidelines

**Default: don't mock.**
If you can test against the real thing (an in-memory database, a temp directory), do that first. Mocks drift from reality.

**Mock only at system boundaries you don't control:**
- External APIs (payment providers, third-party services)
- Time-dependent behaviour (use `freezegun` or a clock abstraction)
- Non-deterministic outputs (randomness — seed or inject)

**Use `unittest.mock.patch` sparingly.**
```python
from unittest.mock import patch, AsyncMock

async def test_fetch_weather() -> None:
    mock_response = {"temp": 22.0, "condition": "sunny"}
    with patch("myapp.weather.httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value.json.return_value = mock_response
        result = await fetch_weather("London")
    assert result.temperature == 22.0
```

**Never mock the thing you're testing.**
If you're mocking the database to test a database query, you're testing nothing.

**Prefer dependency injection over patching.**
```python
# Good — injectable dependency
class BrewService:
    def __init__(self, db: Database, clock: Callable[[], datetime] = datetime.now):
        self._db = db
        self._clock = clock

# In tests — inject a fake clock
service = BrewService(db=test_db, clock=lambda: datetime(2024, 1, 1))

# Bad — patching a global
with patch("myapp.brew.datetime") as mock_dt:
    mock_dt.now.return_value = datetime(2024, 1, 1)
```

---

## Async Tests

**Use `pytest-asyncio` for async test functions.**
```python
import pytest

@pytest.mark.asyncio
async def test_async_fetch() -> None:
    result = await fetch_data()
    assert result is not None
```

Configure the mode in `pyproject.toml`:
```toml
[tool.pytest-asyncio]
mode = "auto"  # all async tests are automatically treated as asyncio
```

---

## Coverage

**Target 80%+ line coverage. 100% is not a goal.**
Cover the important paths. Don't write tests just to bump the number.

```bash
uv run pytest --cov=src --cov-report=term-missing --cov-fail-under=80
```

Configure in `pyproject.toml`:
```toml
[tool.coverage.run]
source = ["src"]
omit = ["src/__main__.py"]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "if TYPE_CHECKING:",
    "if __name__ == .__main__.",
]
```
