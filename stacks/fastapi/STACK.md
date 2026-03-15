# FastAPI Stack Profile

This stack profile defines how all FastAPI projects in the AI-Factory must be built. It layers on the Python stack (`stacks/python/`) for general Python conventions. FastAPI is the framework of choice for building async HTTP APIs with automatic OpenAPI documentation, Pydantic v2 validation, and dependency injection.

Before writing any FastAPI code, Claude must read this stack profile in full.
This is not optional. Ignoring the stack profile produces inconsistent, unmaintainable code.

---

## Files in This Profile

| File | Read When |
|------|-----------|
| `coding_standards.md` | Writing any FastAPI code |
| `testing.md` | Writing tests or setting up test infrastructure |
| `project_structure.md` | Creating a new project or adding files |
| `pitfalls.md` | Debugging unexpected behaviour or reviewing code |

---

## Core Principles

These principles apply to every FastAPI project in this factory, without exception.

**Async by default.**
Use `async def` for all route handlers and service functions that touch I/O (database, HTTP calls, file system). Synchronous `def` is acceptable only for pure computation with no I/O. Mixing sync and async carelessly blocks the event loop and kills throughput.

**Pydantic models are the contract.**
Every request body, response body, and configuration object is a Pydantic v2 `BaseModel`. No raw dicts crossing API boundaries. Pydantic handles validation, serialization, and documentation in one place. Use `model_config = ConfigDict(strict=True)` when you need strict type coercion.

**Dependency injection for everything shared.**
Database sessions, auth context, configuration, and service objects flow through FastAPI's `Depends()`. No global mutable state. No importing a singleton database connection at module level. Dependencies make testing trivial -- swap the dependency, swap the behaviour.

**Explicit error handling with proper HTTP semantics.**
Use `HTTPException` with correct status codes. 400 for bad input, 401 for unauthenticated, 403 for unauthorized, 404 for missing resources, 409 for conflicts, 422 for validation errors (FastAPI default). Never return 200 with an error message in the body.

**Schema-first, not code-first.**
Think about the API contract before writing implementation. Define your Pydantic request/response models first, then implement the handler. The auto-generated OpenAPI docs should be a usable reference -- add descriptions, examples, and proper status codes.

---

## Key Technologies

| Technology | Purpose |
|-----------|---------|
| FastAPI | Async HTTP API framework with automatic OpenAPI docs |
| Pydantic v2 | Request/response validation, serialization, settings |
| Uvicorn | ASGI development server |
| Gunicorn + Uvicorn workers | Production ASGI server |
| SQLAlchemy 2.0 | Async SQL ORM and query builder |
| Alembic | Database schema migrations |
| Motor | Async MongoDB driver (FARM stack variant) |
| httpx | Async HTTP client (also used in tests) |
| pytest + pytest-asyncio | Test framework with async support |
| Ruff | Linting and formatting (replaces black + isort + flake8) |
| mypy / pyright | Static type checking |
| Docker | Containerized deployment |
| python-jose / PyJWT | JWT token handling for auth |
| Passlib + bcrypt | Password hashing |

---

## When to Use This Stack

Use this stack when building:

- **REST APIs** -- CRUD services, backend-for-frontend APIs, microservices.
- **FARM stack apps** -- FastAPI + React + MongoDB full-stack applications.
- **Webhook receivers** -- services that ingest and process webhooks from third parties.
- **Internal tools** -- admin APIs, data pipelines with HTTP triggers, automation backends.
- **Real-time APIs** -- WebSocket endpoints alongside REST (FastAPI supports both).

Do NOT use this stack for:
- Static sites or server-rendered HTML (use a frontend framework instead).
- CLI tools (use Typer or Click directly).
- Pure data science / ML pipelines with no API layer (use plain Python stack).
- Projects where the team has no Python experience and a TypeScript stack would be more productive.
