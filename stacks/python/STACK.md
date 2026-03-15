# Python Stack Profile

This stack profile defines how ALL Python projects in the AI-Factory must be built. It covers Python 3.11+, uv for package management, Ruff for linting/formatting, Pydantic for data validation, and pytest for testing.

Before implementing any code in a Python project, Claude must read this stack profile in full.
This is not optional. Ignoring the stack profile produces inconsistent, unmaintainable code.

---

## Files in This Profile

| File | Read When |
|------|-----------|
| `coding_standards.md` | Writing any Python code |
| `testing.md` | Writing tests or setting up test infrastructure |
| `project_structure.md` | Creating a new project or adding files |
| `pitfalls.md` | Debugging unexpected behaviour or reviewing code |
| `ai_ml.md` | Building LLM integrations, RAG pipelines, embeddings, or model serving |

---

## Core Principles

These principles apply to every Python project in this factory, without exception.

**Type hints everywhere.**
Every function signature gets type hints — parameters and return types. Use `mypy --strict` or `pyright` to enforce them. `Any` is a last resort with a justifying comment. Python's type system is opt-in; we opt all the way in.

**uv for everything.**
`uv` replaces pip, pip-tools, poetry, and virtualenv. It creates and manages virtual environments automatically, resolves dependencies faster, and uses `pyproject.toml` as the single source of truth. No `requirements.txt`, no `setup.py`, no `Pipfile`.

**Ruff is the only linter and formatter.**
Ruff replaces black, isort, flake8, pylint, and pyflakes. One tool, one config section in `pyproject.toml`. No other formatting or linting tools.

**Pydantic for data boundaries.**
Use Pydantic `BaseModel` for API payloads, config/settings, external data parsing, and anywhere data crosses a trust boundary. Dataclasses are fine for internal-only data structures that don't need validation.

**Explicit over implicit.**
No star imports. No mutable default arguments. No reliance on import side effects. If something happens, it should be obvious from reading the code.

---

## Key Technologies

| Technology | Purpose |
|-----------|---------|
| Python 3.11+ | Runtime — match/case, exception groups, tomllib, TaskGroups |
| uv | Package management, virtual environments, script running |
| pyproject.toml | Project config — dependencies, tool settings, metadata |
| Ruff | Linting and formatting (replaces black, isort, flake8) |
| mypy or pyright | Static type checking |
| Pydantic | Data validation, settings management, serialisation |
| pytest | Testing — fixtures, parametrize, coverage |
| structlog or loguru | Structured logging |
| asyncio | Async I/O — TaskGroups, async generators, async context managers |

---

## When to Use This Stack

Use this stack for any Python project: CLI tools, backend services, data pipelines, automation scripts, AI/ML applications, MCP servers. This is the base Python stack — framework-specific stacks (FastAPI, Django) layer on top of it.

---

## Project-Level Overlays

Each project should document its specific conventions in its own CLAUDE.md or in a project-specific memory file. Things that belong in the overlay, not here:

- Framework choices (FastAPI, Django, Flask, etc.)
- Database approach (SQLAlchemy, raw SQL, etc.)
- Infrastructure (Docker, cloud provider, CI/CD)
- ML framework choices (PyTorch, transformers, etc.)
- Build/deploy tooling
