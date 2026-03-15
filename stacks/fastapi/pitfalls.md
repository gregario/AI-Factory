# Common Pitfalls -- FastAPI

This file documents mistakes that appear repeatedly in FastAPI projects.
Read this when debugging unexpected behaviour or reviewing code.

It starts lean and grows from experience. When you hit a gotcha, add it here.

---

## Pitfall 1: Mixing `async def` and Blocking Code

**What it looks like:**
```python
@router.get("/users")
async def get_users():
    users = db.query(User).all()  # Synchronous SQLAlchemy call!
    return users
```

**Why it breaks:**
When you declare a handler as `async def`, FastAPI runs it on the asyncio event loop. A synchronous database call blocks the entire loop -- no other requests can be processed until it returns. Under load, this kills throughput.

**Fix:**
Use async database drivers (asyncpg + SQLAlchemy async), or declare the handler as plain `def` (FastAPI runs sync handlers in a thread pool automatically):

```python
# Option 1: Use async driver (preferred)
@router.get("/users")
async def get_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User))
    return result.scalars().all()

# Option 2: Sync handler (FastAPI runs in threadpool)
@router.get("/users")
def get_users(db: Session = Depends(get_db)):
    return db.query(User).all()
```

---

## Pitfall 2: Forgetting `from_attributes=True` on Response Models

**What it looks like:**
```python
class UserResponse(BaseModel):
    id: int
    email: str

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    return user  # Pydantic can't read SQLAlchemy attributes!
```

**Why it breaks:**
Pydantic v2 doesn't read ORM object attributes by default. The response serialization fails or returns empty objects.

**Fix:**
Add `model_config = ConfigDict(from_attributes=True)` to any response model that receives ORM objects:

```python
class UserResponse(BaseModel):
    id: int
    email: str

    model_config = ConfigDict(from_attributes=True)
```

---

## Pitfall 3: Using `response_model` with the Wrong Type

**What it looks like:**
```python
@router.get("/users", response_model=UserResponse)
async def get_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User))
    return result.scalars().all()  # Returns a list, but response_model is singular!
```

**Why it breaks:**
FastAPI tries to validate a list against a single model schema. The response fails with a validation error.

**Fix:**
```python
@router.get("/users", response_model=list[UserResponse])
```

---

## Pitfall 4: Dependency Overrides Not Being Cleared

**What it looks like:**
```python
def test_create_user(client):
    app.dependency_overrides[get_current_user] = lambda: mock_admin
    response = client.post("/api/users/", json={...})
    assert response.status_code == 201
    # No cleanup!

def test_list_users_requires_auth(client):
    # This test passes because the override from the previous test is still active
    response = client.get("/api/users/")
    assert response.status_code == 200  # Should be 401!
```

**Why it breaks:**
`dependency_overrides` is a mutable dict on the app instance. If you don't clear it, overrides leak between tests.

**Fix:**
Always clear overrides in a fixture or teardown:

```python
@pytest.fixture(autouse=True)
def clear_overrides():
    yield
    app.dependency_overrides.clear()
```

---

## Pitfall 5: Not Awaiting Session Commits

**What it looks like:**
```python
async def create_user(db: AsyncSession, user_in: UserCreate) -> User:
    user = User(**user_in.model_dump())
    db.add(user)
    db.commit()     # Missing await!
    db.refresh(user)  # Missing await!
    return user
```

**Why it breaks:**
Without `await`, the coroutine is created but never executed. The data is never committed. No error is raised -- it silently does nothing.

**Fix:**
```python
await db.commit()
await db.refresh(user)
```

Enable the `ASYNC` ruff rule set (`ruff --select ASYNC`) to catch these automatically.

---

## Pitfall 6: Pydantic v2 Breaking Changes from v1

**What it looks like:**
```python
# v1 patterns that break in v2
class UserResponse(BaseModel):
    class Config:
        orm_mode = True       # Renamed to from_attributes
        schema_extra = {...}  # Renamed to json_schema_extra

user.dict()      # Now .model_dump()
user.json()      # Now .model_dump_json()
user.parse_obj() # Now .model_validate()
```

**Why it breaks:**
Pydantic v2 renamed many APIs. The v1 names raise deprecation warnings or errors.

**Fix:**
Use v2 API exclusively:

```python
class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, json_schema_extra={...})

user.model_dump()
user.model_dump_json()
UserResponse.model_validate(data)
```

---

## Pitfall 7: Circular Imports Between Models, Schemas, and Routes

**What it looks like:**
```python
# app/models/user.py
from app.schemas.user import UserResponse  # Circular!

# app/schemas/user.py
from app.models.user import User  # Circular!
```

**Why it breaks:**
Python's import system chokes on circular dependencies. You get `ImportError` or `AttributeError` at runtime.

**Fix:**
- Models should never import schemas. Schemas import nothing from models (they use `from_attributes` to read ORM objects).
- Routes import both models and schemas. Services import models.
- Use `from __future__ import annotations` to defer type evaluation when needed for forward references.
- If you need a relationship between schemas, use `model_rebuild()` after both are defined.

---

## Pitfall 8: Returning 200 for Everything

**What it looks like:**
```python
@router.post("/users")
async def create_user(user_in: UserCreate):
    try:
        user = await user_service.create(user_in)
        return {"status": "success", "data": user}
    except DuplicateError:
        return {"status": "error", "message": "Email taken"}  # Still 200!
```

**Why it breaks:**
Clients (including your React frontend) rely on HTTP status codes to distinguish success from failure. Returning 200 with an error message forces every client to parse the body to detect errors. It also breaks OpenAPI documentation.

**Fix:**
```python
@router.post("/users", response_model=UserResponse, status_code=201)
async def create_user(user_in: UserCreate):
    user = await user_service.create(user_in)
    if not user:
        raise HTTPException(status_code=409, detail="Email already registered")
    return user
```

---

## Pitfall 9: CORS Misconfiguration

**What it looks like:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Wide open in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Why it breaks:**
`allow_origins=["*"]` with `allow_credentials=True` is rejected by browsers (the spec forbids it). Even without credentials, wildcard origins in production is a security risk.

**Fix:**
Use explicit origins from settings:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,  # ["https://myapp.com"]
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Authorization", "Content-Type"],
)
```

---

## Pitfall 10: SQLAlchemy Session Leak in Error Paths

**What it looks like:**
```python
async def get_db():
    session = async_session_maker()
    return session  # Never closed if the request errors out!
```

**Why it breaks:**
If the handler raises an exception, the session is never closed. Under load, this exhausts the connection pool.

**Fix:**
Always use `yield` in a generator dependency so cleanup runs regardless of errors:

```python
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session
        # session.__aexit__ handles close/rollback
```

---

## Checklist Before Committing Code

- [ ] All handlers use the correct HTTP method and status code?
- [ ] Response models have `from_attributes=True` where needed?
- [ ] All database calls are properly awaited?
- [ ] No blocking code inside `async def` handlers?
- [ ] CORS origins are explicit, not wildcard?
- [ ] Dependency overrides are cleared in test teardown?
- [ ] No secrets or database URLs hardcoded (all via Settings)?
- [ ] `ruff check` and `mypy` pass clean?
- [ ] All error paths return proper HTTP status codes?
