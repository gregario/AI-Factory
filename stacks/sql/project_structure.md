# Project Structure — SQL

## Database Layer in Application Projects

The database layer lives inside the application project, not as a separate repo.
How you organize it depends on your application stack and migration tool.

### With a Migration Tool (Prisma, Drizzle, Alembic)

```
project-name/
  src/
    db/
      client.ts          # Connection pool / client setup
      queries/            # Query functions grouped by domain
        users.ts
        brew-sessions.ts
      types.ts            # Database-specific types (row types, query params)
  prisma/                 # Prisma-specific (or drizzle/, alembic/)
    schema.prisma         # Schema definition
    migrations/           # Auto-generated migration files
  tests/
    db/
      setup.ts            # Test database setup, seed factories
      users.test.ts
      brew-sessions.test.ts
```

### With Raw SQL Migrations

```
project-name/
  src/
    db/
      client.ts           # Connection pool / client setup
      queries/             # Query functions grouped by domain
        users.ts
        brew-sessions.ts
      types.ts             # Database-specific types
  migrations/
    001_create_users.sql
    002_create_beer_styles.sql
    003_create_brew_sessions.sql
  seeds/
    development.sql        # Dev seed data
  tests/
    db/
      setup.ts
      users.test.ts
```

### SQLite Projects (CLI Tools, Mobile)

```
project-name/
  src/
    db.ts                  # Single-file database module (connection + queries)
    schema.sql             # Schema definition
  migrations/
    001_initial.sql
  tests/
    db.test.ts
```

SQLite projects are simpler. A single `db.ts` file often suffices. Don't over-structure
a database layer for a CLI tool with three tables.

---

## Key Conventions

**`src/db/` is the database boundary.**
All database access goes through this directory. Application code never constructs SQL strings
or calls the database client directly. This makes it possible to swap databases, add caching,
or change query patterns without touching business logic.

```typescript
// Good — application code calls a query function
const sessions = await getSessionsByBrewer(brewerId);

// Bad — application code writes raw SQL
const sessions = await pool.query('SELECT * FROM brew_sessions WHERE brewer_id = $1', [brewerId]);
```

**One query file per domain entity.**
`queries/users.ts` contains all user-related queries. `queries/brew-sessions.ts` contains
all brew session queries. Don't put every query in a single file.

**Type your query results.**
Whether you use an ORM or raw SQL, the return types from your query functions should be
explicit TypeScript types (or Python dataclasses, etc.), not raw row objects.

```typescript
// queries/brew-sessions.ts
type BrewSession = {
    id: string;
    beer_style_id: string;
    brewer_id: string;
    quality_score: number | null;
    status: string;
    created_at: Date;
};

export async function getSessionById(id: string): Promise<BrewSession | null> {
    const result = await pool.query<BrewSession>(
        'SELECT * FROM brew_sessions WHERE id = $1',
        [id]
    );
    return result.rows[0] ?? null;
}
```

---

## Migration File Naming

Migrations must be numbered and descriptive. The number ensures ordering.
The description explains what changed.

```
001_create_users.sql
002_create_beer_styles.sql
003_create_brew_sessions.sql
004_add_quality_score_to_sessions.sql
005_create_ingredients_table.sql
006_add_index_sessions_brewer_id.sql
```

**Bad names:**
```
004_update.sql
005_fix.sql
006_changes.sql
```

---

## Environment Configuration

**Database URLs come from environment variables.** Never hardcode connection strings.

```typescript
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});
```

**Use separate databases for each environment:**
```
DATABASE_URL=postgresql://localhost:5432/myproject_dev        # Development
DATABASE_URL=postgresql://localhost:5432/myproject_test       # Testing
DATABASE_URL=postgresql://user:pass@prod-host:5432/myproject  # Production
```

**Never commit `.env` files.** Provide a `.env.example` with placeholder values.

---

## Schema File

Maintain a `schema.sql` (or equivalent) that represents the full current schema.
This serves as documentation and allows spinning up a fresh database without replaying
every migration.

For Prisma/Drizzle projects, the schema file IS the source of truth (`schema.prisma`,
`schema.ts`). For raw SQL projects, regenerate it periodically:

```bash
pg_dump --schema-only myproject_dev > schema.sql
```
