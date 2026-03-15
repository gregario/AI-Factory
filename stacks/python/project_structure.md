# Project Structure — Python

## Standard Layout

```
project-name/
  src/
    project_name/       # Package directory (snake_case, matches project name)
      __init__.py       # Package marker, can export public API
      __main__.py       # Entry point for `python -m project_name`
      cli.py            # CLI entry point (if applicable)
      models.py         # Pydantic models and dataclasses
      config.py         # Settings and configuration (Pydantic BaseSettings)
      db/               # Database layer
        __init__.py
        connection.py
        queries.py
      services/         # Business logic
        __init__.py
        brewing.py
      lib/              # Shared utilities (not a dumping ground)
        __init__.py
        logging.py
  tests/
    __init__.py
    conftest.py         # Shared fixtures
    test_models.py      # Test files mirror src/ structure
    test_brewing.py
  pyproject.toml        # Project config — dependencies, tools, metadata
  uv.lock              # Lockfile (committed)
  .python-version      # Python version pin (e.g., "3.11")
  README.md
```

### Key conventions

**`src/` layout is mandatory.**
All source code lives under `src/project_name/`. This prevents accidental imports of the local package during testing (the "src layout" pattern). The package directory uses snake_case.

**`pyproject.toml` is the single config file.**
Dependencies, tool config (Ruff, pytest, mypy), metadata — everything goes here. No `setup.py`, no `setup.cfg`, no `requirements.txt`.

**Tests live in `tests/`, not inside `src/`.**
Test files are prefixed with `test_` and mirror the source structure. Shared fixtures go in `conftest.py`.

**`uv.lock` is committed.**
The lockfile ensures reproducible builds. Never edit it manually.

---

## pyproject.toml Template

```toml
[project]
name = "project-name"
version = "0.1.0"
description = "One-line description"
requires-python = ">=3.11"
dependencies = [
    "pydantic>=2.0",
    "structlog>=24.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.24",
    "pytest-cov>=6.0",
    "mypy>=1.10",
    "ruff>=0.8",
]

[project.scripts]
project-name = "project_name.cli:main"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.ruff]
target-version = "py311"
line-length = 100
src = ["src"]

[tool.ruff.lint]
select = [
    "E",    # pycodestyle errors
    "W",    # pycodestyle warnings
    "F",    # pyflakes
    "I",    # isort
    "N",    # pep8-naming
    "UP",   # pyupgrade
    "B",    # flake8-bugbear
    "SIM",  # flake8-simplify
    "TCH",  # flake8-type-checking
    "RUF",  # Ruff-specific rules
]

[tool.ruff.lint.isort]
known-first-party = ["project_name"]

[tool.mypy]
python_version = "3.11"
strict = true
warn_return_any = true
warn_unused_configs = true

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["src"]
addopts = "-v --tb=short --strict-markers"
```

---

## CLI Projects

For CLI tools, use `click` or `typer` (Typer is click + type hints):

```
project-name/
  src/
    project_name/
      __init__.py
      __main__.py       # python -m project_name
      cli.py            # CLI commands
      commands/         # Subcommands (if many)
        __init__.py
        brew.py
        serve.py
```

`__main__.py`:
```python
from project_name.cli import app

app()
```

---

## Library Projects

For reusable libraries, the structure shifts slightly:

```
library-name/
  src/
    library_name/
      __init__.py       # Public API — export what users need
      py.typed          # PEP 561 marker for type stub distribution
      core.py
      types.py
  tests/
  docs/
  pyproject.toml
```

**Export a clean public API from `__init__.py`.**
```python
# src/library_name/__init__.py
from library_name.core import process, validate
from library_name.types import Config, Result

__all__ = ["process", "validate", "Config", "Result"]
```

**Include `py.typed`.**
An empty file that tells type checkers your package ships inline types.

---

## Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Files | snake_case | `brew_calculator.py` |
| Directories | snake_case | `src/project_name/` |
| Test files | `test_*.py` | `test_models.py` |
| Config files | Standard names | `pyproject.toml`, `conftest.py` |
| Packages | snake_case | `my_library` |
| Distribution names | kebab-case | `my-library` (in pyproject.toml `name`) |

---

## Common uv Commands

```bash
uv init project-name           # Create new project with pyproject.toml
uv add pydantic structlog      # Add dependencies
uv add --dev pytest ruff mypy  # Add dev dependencies
uv sync                        # Install all dependencies
uv run pytest                  # Run command in the virtual environment
uv run python -m project_name  # Run the project
uv lock                        # Update lockfile
uv python pin 3.11             # Pin Python version
```

uv creates and manages the `.venv/` directory automatically. Never create virtual environments manually.

---

## What Goes Where

| Thing | Location |
|-------|----------|
| Pydantic models | `src/project_name/models.py` |
| Settings/config | `src/project_name/config.py` |
| Database queries | `src/project_name/db/` |
| Business logic | `src/project_name/services/` |
| Shared utilities | `src/project_name/lib/` |
| CLI commands | `src/project_name/cli.py` or `commands/` |
| Type definitions only | `src/project_name/types.py` |
| Test fixtures | `tests/conftest.py` |
| Migrations | `migrations/` (at project root, not inside src) |
