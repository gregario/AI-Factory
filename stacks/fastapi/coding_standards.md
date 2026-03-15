# Coding Standards -- FastAPI

## Naming

```python
# Variables and functions: snake_case
current_balance = 500.0
def calculate_revenue(quality_score: float) -> float: ...

# Classes and Pydantic models: PascalCase
class UserProfile(BaseModel): ...
class BrewingService: ...

# Constants: UPPER_SNAKE_CASE
MAX_RETRIES = 3
DEFAULT_TIMEOUT_SECONDS = 30

# File names: snake_case
# user_routes.py, brewing_service.py, test_users.py

# Router prefixes and URL paths: kebab-case
router = APIRouter(prefix="/beer-styles")

# Environment variables: UPPER_SNAKE_CASE with project prefix
# APP_DATABASE_URL, APP_SECRET_KEY
```

---

## Pydantic Models

**Separate request and response models. Never reuse the same model for both.**

```python
# Good -- explicit input/output contracts
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    display_name: str = Field(max_length=100)

class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    display_name: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Bad -- one model for everything, leaking internal fields
class User(BaseModel):
    id: uuid.UUID | None = None
    email: str
    password: str  # exposed in responses!
    created_at: datetime | None = None
```

**Use Field() for validation, documentation, and examples.**

```python
class BrewCreate(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=200,
        description="Name of the brew",
        examples=["Summer Pale Ale"],
    )
    style_id: uuid.UUID = Field(description="Reference to a beer style")
    target_abv: float = Field(ge=0.0, le=20.0, description="Target ABV percentage")
```

**Use enums for known variants, not raw strings.**

```python
class BrewStatus(str, Enum):
    DRAFT = "draft"
    FERMENTING = "fermenting"
    CONDITIONING = "conditioning"
    COMPLETE = "complete"
```

**Use `model_config = ConfigDict(from_attributes=True)` for ORM integration.**
This lets Pydantic read from SQLAlchemy model attributes directly.

---

## Route Handlers

**Keep handlers thin. Business logic lives in service functions.**

```python
# Good -- handler delegates to service
@router.post("/", response_model=BrewResponse, status_code=201)
async def create_brew(
    brew_in: BrewCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BrewResponse:
    return await brewing_service.create(db, brew_in, current_user.id)


# Bad -- business logic in the handler
@router.post("/")
async def create_brew(brew_in: BrewCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Brew).where(Brew.name == brew_in.name))
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Brew name taken")
    brew = Brew(**brew_in.model_dump())
    brew.created_by = current_user.id
    brew.status = BrewStatus.DRAFT
    db.add(brew)
    await db.commit()
    await db.refresh(brew)
    return brew
```

**Always declare `response_model` and `status_code`.**
This drives accurate OpenAPI documentation. FastAPI uses `response_model` to filter the response, so internal fields never leak.

**Use proper HTTP methods and status codes.**

| Action | Method | Success Code |
|--------|--------|-------------|
| Create | POST | 201 |
| Read | GET | 200 |
| Full update | PUT | 200 |
| Partial update | PATCH | 200 |
| Delete | DELETE | 204 |

---

## Dependency Injection

**Use `Depends()` for cross-cutting concerns.**

```python
# Database session
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session

# Current authenticated user
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_token(token)
    user = await user_service.get_by_id(db, payload.sub)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# Role-based access
def require_role(role: str):
    async def check_role(user: User = Depends(get_current_user)) -> User:
        if role not in user.roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return check_role
```

**Dependencies compose. Build small ones and stack them.**
The dependency tree is resolved automatically. If `get_current_user` depends on `get_db`, FastAPI calls `get_db` once and passes the same session to both.

---

## Error Handling

**Use `HTTPException` with descriptive details.**

```python
# Good
raise HTTPException(
    status_code=404,
    detail=f"Brew {brew_id} not found",
)

# Bad
raise HTTPException(status_code=400, detail="Error")
```

**Use custom exception handlers for domain errors.**

```python
class EntityNotFoundError(Exception):
    def __init__(self, entity: str, entity_id: str):
        self.entity = entity
        self.entity_id = entity_id

@app.exception_handler(EntityNotFoundError)
async def entity_not_found_handler(
    request: Request, exc: EntityNotFoundError
) -> JSONResponse:
    return JSONResponse(
        status_code=404,
        content={"detail": f"{exc.entity} {exc.entity_id} not found"},
    )
```

**Never catch broad exceptions in handlers.**
Let FastAPI's default 500 handler catch unexpected errors. Log them, but don't swallow them.

---

## Async Patterns

**Always use async database drivers.**
SQLAlchemy with `asyncpg` for PostgreSQL, `aiosqlite` for SQLite, Motor for MongoDB. Never use synchronous drivers -- they block the event loop.

**Use `asyncio.gather()` for concurrent independent I/O.**

```python
# Good -- parallel
users, teams = await asyncio.gather(
    user_service.list(db),
    team_service.list(db),
)

# Bad -- sequential when they don't depend on each other
users = await user_service.list(db)
teams = await team_service.list(db)
```

**Never call blocking code from async handlers.**
If you must call a blocking library, use `run_in_executor`:

```python
result = await asyncio.get_event_loop().run_in_executor(
    None, blocking_function, arg1, arg2
)
```

Or use FastAPI's `def` handler (not `async def`) -- FastAPI runs sync handlers in a thread pool automatically.

---

## Configuration

**Use Pydantic Settings for all configuration.**

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    secret_key: str = Field(min_length=32)
    debug: bool = False
    allowed_origins: list[str] = ["http://localhost:3000"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="APP_",
    )

settings = Settings()
```

**Never hardcode secrets, URLs, or environment-specific values.**
Everything configurable goes through Settings. Use `.env` for local development, environment variables for production.

---

## Code Style

**Use `from __future__ import annotations` at the top of every file.**
This enables PEP 604 union syntax (`str | None`) and deferred annotation evaluation everywhere.

**Type-annotate everything. No untyped public functions.**

```python
# Good
async def get_brew(db: AsyncSession, brew_id: uuid.UUID) -> Brew | None: ...

# Bad
async def get_brew(db, brew_id): ...
```

**Early returns over nested conditionals.**

```python
# Good
async def get_brew_or_404(db: AsyncSession, brew_id: uuid.UUID) -> Brew:
    brew = await brew_service.get(db, brew_id)
    if not brew:
        raise HTTPException(status_code=404, detail=f"Brew {brew_id} not found")
    return brew

# Bad
async def get_brew_or_404(db: AsyncSession, brew_id: uuid.UUID) -> Brew:
    brew = await brew_service.get(db, brew_id)
    if brew:
        return brew
    else:
        raise HTTPException(status_code=404, detail=f"Brew {brew_id} not found")
```

**Keep functions short.** If a function exceeds ~40 lines, extract helpers. If it has more than 4 parameters (excluding `self`), consider a dataclass or Pydantic model.

**Use f-strings for interpolation. Never use `%` or `.format()`.**

**Imports: standard library, then third-party, then local. Ruff handles sorting.**
