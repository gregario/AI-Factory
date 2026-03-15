# Project Structure -- FastAPI

## Standard API Project

```
project-name/
  app/
    __init__.py
    main.py               # FastAPI app creation, middleware, router includes
    config.py              # Pydantic Settings
    dependencies.py        # Shared Depends() callables (get_db, get_current_user)
    models/                # SQLAlchemy ORM models
      __init__.py
      user.py
      brew.py
    schemas/               # Pydantic request/response models
      __init__.py
      user.py
      brew.py
    routes/                # Route handlers grouped by domain
      __init__.py
      users.py
      brews.py
      auth.py
    services/              # Business logic (called by routes, tested independently)
      __init__.py
      user_service.py
      brewing_service.py
    db/
      __init__.py
      base.py              # SQLAlchemy Base, engine, session factory
      migrations/           # Alembic migrations directory
        env.py
        versions/
    middleware/             # Custom middleware (logging, rate limiting, CORS config)
      __init__.py
    utils/                 # Pure utility functions (hashing, token generation)
      __init__.py
  tests/
    __init__.py
    conftest.py            # Shared fixtures (client, db, auth)
    test_users.py
    test_brews.py
    test_auth.py
  alembic.ini
  pyproject.toml
  Dockerfile
  docker-compose.yml
  .env.example
  .gitignore
```

### Key conventions

**`app/` is the source package.** All application code lives here. No code in the project root.

**`models/` for database models, `schemas/` for Pydantic models.** This is the standard FastAPI convention. Models map to database tables. Schemas define API contracts. They are related but distinct -- never merge them into one file.

**`routes/` for thin handlers, `services/` for business logic.** A route handler validates input (via Pydantic), calls a service function, and returns a response. The service function contains the actual logic and database operations. This separation makes services testable without HTTP.

**`dependencies.py` at the app root.** Shared dependencies (database session, current user, settings) live in one place. Domain-specific dependencies can live in their route module.

**Group by domain, not by technical role.** If you have users, brews, and orders, each gets its own file in `models/`, `schemas/`, `routes/`, and `services/`. Don't create `controllers/`, `repositories/`, `dto/` directories.

---

## FARM Stack (FastAPI + React + MongoDB)

```
project-name/
  backend/
    app/
      main.py
      config.py
      dependencies.py
      models/              # Pydantic models (MongoDB uses Pydantic directly)
        __init__.py
        user.py
        brew.py
      routes/
        __init__.py
        users.py
        brews.py
      services/
        __init__.py
        user_service.py
      db/
        __init__.py
        mongodb.py         # Motor client setup, database getter
    tests/
      conftest.py
      test_users.py
    pyproject.toml
    Dockerfile
  frontend/
    src/
      components/
      hooks/
      pages/
      lib/                 # API client, utilities
      types.ts
    package.json
    tsconfig.json
    Dockerfile
  docker-compose.yml
  .env.example
```

### FARM-specific conventions

**MongoDB models ARE Pydantic models.** No separate ORM layer. Motor returns dicts, Pydantic validates them. Use `PyObjectId` or `BeforeValidator` for MongoDB `_id` handling:

```python
from typing import Annotated
from bson import ObjectId
from pydantic import BeforeValidator

PyObjectId = Annotated[str, BeforeValidator(str)]

class UserInDB(BaseModel):
    id: PyObjectId = Field(alias="_id")
    email: str
    hashed_password: str

    model_config = ConfigDict(populate_by_name=True)
```

**`db/mongodb.py` manages the Motor client.**

```python
from motor.motor_asyncio import AsyncIOMotorClient

class MongoDB:
    client: AsyncIOMotorClient | None = None
    db = None

    async def connect(self, uri: str, db_name: str):
        self.client = AsyncIOMotorClient(uri)
        self.db = self.client[db_name]

    async def close(self):
        if self.client:
            self.client.close()

mongodb = MongoDB()
```

**Frontend follows the TypeScript stack conventions.** See `stacks/typescript/project_structure.md` for React project layout.

---

## Microservice Project

For small, focused services (one domain, few endpoints):

```
project-name/
  app/
    __init__.py
    main.py
    config.py
    models.py              # All models in one file (small enough)
    schemas.py             # All schemas in one file
    routes.py              # All routes in one file
    service.py             # All business logic in one file
    db.py                  # Database setup
  tests/
    conftest.py
    test_service.py
  pyproject.toml
  Dockerfile
```

Flat is better when the service is small. Graduate to the full directory structure when any single file exceeds ~300 lines.

---

## App Factory Pattern

**Use `create_app()` for testability and configuration flexibility.**

```python
# app/main.py
from fastapi import FastAPI
from app.routes import users, brews, auth
from app.middleware.cors import setup_cors
from app.db.base import init_db, close_db

def create_app() -> FastAPI:
    app = FastAPI(
        title="Brewery API",
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    setup_cors(app)

    app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
    app.include_router(users.router, prefix="/api/users", tags=["users"])
    app.include_router(brews.router, prefix="/api/brews", tags=["brews"])

    @app.on_event("startup")
    async def startup():
        await init_db()

    @app.on_event("shutdown")
    async def shutdown():
        await close_db()

    return app

app = create_app()
```

Note: For FastAPI 0.100+, prefer the lifespan context manager over `on_event`:

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await close_db()

def create_app() -> FastAPI:
    app = FastAPI(lifespan=lifespan, ...)
    ...
    return app
```

---

## Alembic Setup

```bash
# Initialize Alembic (run once)
alembic init app/db/migrations

# Generate a migration from model changes
alembic revision --autogenerate -m "add brews table"

# Apply migrations
alembic upgrade head

# Rollback one step
alembic downgrade -1
```

Configure `alembic.ini` to read the database URL from environment/settings, not hardcoded.

In `env.py`, import your `Base.metadata` so autogenerate detects model changes:

```python
from app.db.base import Base
target_metadata = Base.metadata
```

---

## File Naming

| Thing | Convention | Example |
|-------|-----------|---------|
| Python files | snake_case | `user_service.py`, `brew_routes.py` |
| Test files | `test_*.py` | `test_users.py`, `test_auth.py` |
| Directories | snake_case | `app/services/`, `app/models/` |
| Pydantic models | PascalCase | `UserCreate`, `BrewResponse` |
| SQLAlchemy models | PascalCase | `User`, `Brew` |
| Route functions | snake_case verbs | `create_brew`, `get_brews`, `delete_brew` |
| Config files | Standard names | `pyproject.toml`, `alembic.ini`, `Dockerfile` |

---

## pyproject.toml Essentials

```toml
[project]
name = "project-name"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.110",
    "uvicorn[standard]>=0.27",
    "pydantic>=2.0",
    "pydantic-settings>=2.0",
    "sqlalchemy[asyncio]>=2.0",
    "asyncpg>=0.29",
    "alembic>=1.13",
    "python-jose[cryptography]>=3.3",
    "passlib[bcrypt]>=1.7",
    "httpx>=0.27",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.23",
    "pytest-cov>=4.0",
    "ruff>=0.3",
    "mypy>=1.8",
    "aiosqlite>=0.20",
]

[tool.ruff]
target-version = "py311"
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B", "SIM", "ASYNC"]

[tool.mypy]
strict = true
plugins = ["pydantic.mypy"]
```

---

## Docker

```dockerfile
# Dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY pyproject.toml ./
RUN pip install --no-cache-dir .

COPY app/ app/

EXPOSE 8000

CMD ["gunicorn", "app.main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
```

```yaml
# docker-compose.yml (development)
services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - APP_DATABASE_URL=postgresql+asyncpg://user:pass@db:5432/appdb
      - APP_SECRET_KEY=dev-secret-key-change-in-production
    depends_on:
      - db
    volumes:
      - ./app:/app/app  # Hot reload in development
    command: uvicorn app.main:app --host 0.0.0.0 --reload

  db:
    image: postgres:16
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: appdb
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```
