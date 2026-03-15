# SQL Database Stack Profile

This stack profile defines how ALL projects in the AI-Factory interact with SQL databases.
It is not an application stack — it layers underneath application stacks (TypeScript, Python, etc.)
to provide consistent patterns for schema design, migrations, queries, security, and testing.

Before writing any database schema, migration, or query code, Claude must read this stack profile in full.
This is not optional. Ignoring the stack profile produces inconsistent, insecure data layers.

---

## Files in This Profile

| File | Read When |
|------|-----------|
| `coding_standards.md` | Writing schemas, migrations, or queries |
| `testing.md` | Writing database tests or setting up test infrastructure |
| `project_structure.md` | Adding a database layer to a project |
| `pitfalls.md` | Debugging query performance, data bugs, or connection issues |

---

## Core Principles

These principles apply to every project that touches a SQL database, without exception.

**1. Schema-first design.**
Design the database schema before writing application code. Tables, columns, constraints, and
indexes should be planned and reviewed. The schema is the source of truth for your data model,
not your ORM classes or TypeScript types.

**2. Migrations always.**
Every schema change goes through a migration file. No manual DDL in production. No "just run this
ALTER TABLE". Migrations are version-controlled, reviewable, and reversible. Use Alembic (Python),
Prisma/Drizzle (TypeScript), EF Core (.NET), or raw numbered SQL files.

**3. PostgreSQL as primary, SQLite for embedded.**
Use PostgreSQL for any server-side, multi-user, or cloud-deployed database. It's what Supabase runs,
it handles JSONB, full-text search, and RLS natively. Use SQLite for local-only tools, CLI apps,
mobile apps, and development/test databases where simplicity matters more than features.

**4. Security is not optional.**
Never store plaintext passwords, API keys, or tokens. Use Row Level Security (RLS) for multi-tenant
data isolation. Parameterize every query — no string concatenation of user input into SQL.
Grant least-privilege access to database roles.

**5. Index what you query.**
Every foreign key column gets an index. Every column in a WHERE or ORDER BY clause that operates
on more than a few hundred rows gets an index. Missing indexes are the #1 cause of slow queries
in production.

---

## Key Technologies

| Technology | Purpose |
|-----------|---------|
| PostgreSQL | Primary SQL database for all server-side projects |
| SQLite | Embedded/local database for CLI tools, mobile, dev |
| Supabase | Hosted PostgreSQL with auth, RLS, realtime, edge functions |
| PgBouncer / Supabase Pooler | Connection pooling for PostgreSQL |
| Prisma | TypeScript ORM with migrations and type-safe queries |
| Drizzle | TypeScript ORM — lighter alternative to Prisma |
| Alembic | Python migration tool (pairs with SQLAlchemy) |
| pgTAP | PostgreSQL-native unit testing framework |

---

## When to Use This Stack

Use this stack profile when a project needs:

- A relational database (PostgreSQL or SQLite)
- Database migrations and schema management
- Multi-tenant data isolation (RLS)
- Query performance tuning (indexes, EXPLAIN ANALYZE)
- Database testing patterns

This profile is complementary to application stacks. Read the application stack (e.g. TypeScript)
for language-specific conventions, then read this profile for database-specific conventions.
