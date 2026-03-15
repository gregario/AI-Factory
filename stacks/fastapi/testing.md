# Testing -- FastAPI

## Stack

| Tool | Purpose |
|------|---------|
| pytest | Test runner and framework |
| pytest-asyncio | Async test support |
| httpx `AsyncClient` | Async HTTP test client for FastAPI |
| factory_boy | Test data factories (optional, for complex models) |
| pytest-cov | Coverage reporting |

---

## Test Client Setup

**Use httpx `AsyncClient` with FastAPI's `ASGITransport`. Never use the deprecated `TestClient` for async apps.**

```python
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app

@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
```

**Override dependencies for testing.**
Swap database sessions, auth, and external services via `app.dependency_overrides`:

```python
from app.dependencies import get_db, get_current_user

@pytest.fixture(autouse=True)
def override_deps(test_db_session, test_user):
    app.dependency_overrides[get_db] = lambda: test_db_session
    app.dependency_overrides[get_current_user] = lambda: test_user
    yield
    app.dependency_overrides.clear()
```

---

## When to Use Which Test Type

### API / Integration Tests

**Use when:**
- Testing route handlers end-to-end (request in, response out)
- Verifying status codes, response shapes, and error messages
- Testing auth flows (login, token refresh, permission checks)
- Testing database queries through the API layer

This is the primary test type for FastAPI projects. Most business value comes from these tests.

```python
@pytest.mark.asyncio
async def test_create_brew_returns_201(client: AsyncClient):
    response = await client.post("/api/brews/", json={
        "name": "Summer Pale Ale",
        "style_id": "550e8400-e29b-41d4-a716-446655440000",
        "target_abv": 5.2,
    })
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Summer Pale Ale"
    assert "id" in data
```

### Unit Tests

**Use when:**
- Testing pure business logic (scoring, calculations, transformations)
- Testing Pydantic model validation rules
- Testing utility functions with no I/O

```python
def test_brew_create_rejects_negative_abv():
    with pytest.raises(ValidationError):
        BrewCreate(name="Bad Brew", style_id=uuid4(), target_abv=-1.0)

def test_calculate_ibu():
    result = calculate_ibu(alpha_acid=5.0, weight_oz=1.0, boil_minutes=60)
    assert 30.0 < result < 40.0
```

### Database Tests

**Use when:**
- Testing complex queries, joins, or aggregations
- Verifying migration behaviour
- Testing repository/service layer directly

```python
@pytest.fixture
async def db_session():
    """Create a fresh database for each test."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSession(engine) as session:
        yield session
    await engine.dispose()
```

---

## Test File Structure

```python
"""Tests for the brew API endpoints."""
import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio  # Apply to all tests in module


class TestCreateBrew:
    async def test_returns_201_with_valid_input(self, client: AsyncClient):
        response = await client.post("/api/brews/", json={...})
        assert response.status_code == 201

    async def test_returns_422_with_missing_required_field(self, client: AsyncClient):
        response = await client.post("/api/brews/", json={"name": "Incomplete"})
        assert response.status_code == 422

    async def test_returns_409_when_name_exists(self, client: AsyncClient):
        await client.post("/api/brews/", json={...})  # Create first
        response = await client.post("/api/brews/", json={...})  # Duplicate
        assert response.status_code == 409


class TestGetBrew:
    async def test_returns_brew_by_id(self, client: AsyncClient):
        ...

    async def test_returns_404_for_nonexistent_brew(self, client: AsyncClient):
        response = await client.get("/api/brews/nonexistent-id")
        assert response.status_code == 404
```

**Group tests by endpoint or feature using classes.** Each class tests one route or one logical feature. This keeps test files navigable.

**Use `pytestmark = pytest.mark.asyncio` at module level** instead of decorating every test function.

---

## Fixtures

**conftest.py is king.** Shared fixtures (client, db session, test user, auth headers) live in `tests/conftest.py`.

```python
# tests/conftest.py
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from app.main import app
from app.db.base import Base
from app.dependencies import get_db

@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"

@pytest.fixture
async def db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSession(engine) as session:
        yield session
    await engine.dispose()

@pytest.fixture
async def client(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()

@pytest.fixture
def auth_headers():
    token = create_test_token(user_id="test-user-id")
    return {"Authorization": f"Bearer {token}"}
```

**Keep fixtures focused.** Each fixture does one thing. Compose them:

```python
@pytest.fixture
async def brew_with_ingredients(client, auth_headers):
    """Create a brew with ingredients already attached."""
    brew = await client.post("/api/brews/", json={...}, headers=auth_headers)
    brew_id = brew.json()["id"]
    await client.post(f"/api/brews/{brew_id}/ingredients", json=[...], headers=auth_headers)
    return brew.json()
```

---

## Assertions

**Assert behaviour, not implementation.**

```python
# Good -- tests the API contract
assert response.status_code == 201
assert response.json()["name"] == "Summer Pale Ale"
assert "id" in response.json()

# Bad -- tests internal database calls
assert mock_db.execute.called_with("INSERT INTO brews ...")
```

**Test error responses explicitly.**

```python
async def test_create_brew_with_invalid_abv(client):
    response = await client.post("/api/brews/", json={
        "name": "Bad",
        "style_id": str(uuid4()),
        "target_abv": 99.0,  # exceeds max
    })
    assert response.status_code == 422
    errors = response.json()["detail"]
    assert any("target_abv" in str(e) for e in errors)
```

**Test auth at every endpoint.**

```python
async def test_create_brew_requires_auth(client):
    response = await client.post("/api/brews/", json={...})  # No auth header
    assert response.status_code == 401

async def test_delete_brew_requires_admin(client, user_headers):
    response = await client.delete("/api/brews/some-id", headers=user_headers)
    assert response.status_code == 403
```

---

## What to Test

### Always test
- Every endpoint: happy path + at least one error path
- Request validation (Pydantic rejects bad input with 422)
- Authentication and authorization on protected routes
- Response shape matches the declared `response_model`
- Pagination, filtering, and sorting when present
- State transitions (create -> update -> delete lifecycle)

### Skip testing
- FastAPI framework internals (OpenAPI generation, dependency resolution)
- Pydantic's own validation logic (trust the library)
- Third-party middleware behaviour
- Database driver internals

---

## Mocking Guidelines

**Default: don't mock the database. Use a real test database (SQLite in-memory or PostgreSQL via Docker).**
Mocking the database tests nothing useful. The query IS the logic.

**Mock external HTTP calls.**

```python
@pytest.fixture
def mock_payment_api(respx_mock):
    respx_mock.post("https://api.stripe.com/v1/charges").mock(
        return_value=httpx.Response(200, json={"id": "ch_test", "status": "succeeded"})
    )
```

**Mock time for expiry/scheduling tests.**

```python
from freezegun import freeze_time

@freeze_time("2025-06-15 12:00:00")
async def test_token_expiry(client):
    ...
```

**Never mock FastAPI's `Depends()` system in unit tests.** Use `app.dependency_overrides` instead -- it's the framework's own testing mechanism.

---

## pytest Configuration

```toml
# pyproject.toml
[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
filterwarnings = [
    "error",
    "ignore::DeprecationWarning:passlib",
]

[tool.coverage.run]
source = ["app"]
omit = ["app/db/migrations/*"]

[tool.coverage.report]
fail_under = 80
show_missing = true
```

**`asyncio_mode = "auto"` eliminates the need for `@pytest.mark.asyncio` on every test.** All async test functions are automatically treated as async.

---

## Running Tests

```bash
# All tests
pytest

# With coverage
pytest --cov

# Specific file or test
pytest tests/test_brews.py
pytest tests/test_brews.py::TestCreateBrew::test_returns_201

# Verbose output
pytest -v

# Stop on first failure
pytest -x

# Run only tests matching a pattern
pytest -k "create_brew"
```
