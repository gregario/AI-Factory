# Coding Standards — SQL

## Naming

```sql
-- Tables: snake_case, plural
CREATE TABLE beer_styles (...);
CREATE TABLE brew_sessions (...);
CREATE TABLE user_profiles (...);

-- Columns: snake_case, singular
id, name, created_at, updated_at, beer_style_id

-- Primary keys: always "id"
-- Foreign keys: referenced_table_singular_id
beer_style_id   -- references beer_styles(id)
created_by_id   -- references users(id)

-- Indexes: idx_tablename_columnname
CREATE INDEX idx_brew_sessions_beer_style_id ON brew_sessions(beer_style_id);

-- Constraints: chk_, uq_, fk_ prefixes
CONSTRAINT chk_quality_range CHECK (quality_score BETWEEN 0 AND 100)
CONSTRAINT uq_users_email UNIQUE (email)
CONSTRAINT fk_sessions_style FOREIGN KEY (beer_style_id) REFERENCES beer_styles(id)

-- Enums / custom types: snake_case, singular
CREATE TYPE brew_status AS ENUM ('planning', 'brewing', 'fermenting', 'complete');
```

**SQL keywords in UPPERCASE.** Table and column names in lowercase. This isn't about style — it makes
queries scannable at a glance.

```sql
-- Good
SELECT bs.name, COUNT(*) AS brew_count
FROM brew_sessions bs
JOIN beer_styles bst ON bs.beer_style_id = bst.id
WHERE bs.created_at > NOW() - INTERVAL '30 days'
GROUP BY bs.name;

-- Bad
select bs.name, count(*) as brew_count from brew_sessions bs join beer_styles bst on bs.beer_style_id = bst.id;
```

---

## Schema Design

**Every table gets these columns:**

```sql
CREATE TABLE example (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- ... domain columns ...
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Use UUID primary keys for any table that might be exposed via an API or synced across systems.
Use `BIGSERIAL` (auto-incrementing integer) for internal-only tables where performance matters
and you'll never expose the IDs.

For SQLite, use `INTEGER PRIMARY KEY` (auto-increment) or store UUIDs as TEXT.

**Use appropriate column types.**

| Data | PostgreSQL | SQLite | Notes |
|------|-----------|--------|-------|
| Identifiers | `UUID` | `TEXT` | |
| Short text | `VARCHAR(255)` | `TEXT` | Use a length limit when the domain has one |
| Long text | `TEXT` | `TEXT` | |
| Integers | `INTEGER` / `BIGINT` | `INTEGER` | |
| Money/prices | `NUMERIC(12,2)` | `REAL` | Never use FLOAT for money |
| Booleans | `BOOLEAN` | `INTEGER` | SQLite has no native boolean |
| Timestamps | `TIMESTAMPTZ` | `TEXT` (ISO 8601) | Always use timezone-aware timestamps in Postgres |
| JSON data | `JSONB` | `TEXT` (JSON string) | Prefer JSONB over JSON in Postgres (indexable, no duplicates) |
| Enums | `CREATE TYPE ... AS ENUM` | `TEXT` + CHECK | |

**NOT NULL by default.** Every column should be NOT NULL unless there's a specific reason
a value can be absent. Nullable columns spread defensive null checks throughout your application.

---

## Constraints and Referential Integrity

**Always define foreign keys.** They enforce data integrity at the database level, not just in
your application code. Applications have bugs. Databases don't skip constraint checks.

```sql
CREATE TABLE brew_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    beer_style_id UUID NOT NULL REFERENCES beer_styles(id) ON DELETE RESTRICT,
    brewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quality_score INTEGER CHECK (quality_score BETWEEN 0 AND 100),
    status brew_status NOT NULL DEFAULT 'planning',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Choose ON DELETE carefully:**
- `RESTRICT` — prevent deletion of referenced row (safe default)
- `CASCADE` — delete child rows when parent is deleted (use for ownership)
- `SET NULL` — set FK to NULL when parent is deleted (use for optional references)

**Use CHECK constraints for domain rules.** If a value must be in a range or match a pattern,
enforce it in the schema. Don't rely on application-level validation alone.

---

## Indexes

**Index every foreign key column.** PostgreSQL does NOT auto-index foreign keys
(unlike some other databases). Missing FK indexes cause slow joins.

```sql
-- After creating the table
CREATE INDEX idx_brew_sessions_beer_style_id ON brew_sessions(beer_style_id);
CREATE INDEX idx_brew_sessions_brewer_id ON brew_sessions(brewer_id);
```

**Index columns used in WHERE and ORDER BY.**
```sql
-- If you frequently query by status
CREATE INDEX idx_brew_sessions_status ON brew_sessions(status);

-- If you frequently query by date range
CREATE INDEX idx_brew_sessions_created_at ON brew_sessions(created_at);

-- Composite index for queries that filter on both
CREATE INDEX idx_brew_sessions_status_created ON brew_sessions(status, created_at);
```

**Partial indexes for common filters:**
```sql
-- Only index active sessions (saves space, faster scans)
CREATE INDEX idx_brew_sessions_active ON brew_sessions(created_at)
    WHERE status != 'complete';
```

**Don't over-index.** Every index slows down writes. Add indexes based on actual query patterns,
not speculation. Use `EXPLAIN ANALYZE` to verify an index is being used.

---

## JSONB Columns

JSONB is powerful for flexible, semi-structured data. Use it for:
- User preferences or settings
- Metadata that varies per record
- Audit trails and event payloads
- Data you query occasionally but don't join on

**Do NOT use JSONB as a replacement for proper schema.**
If you're always accessing the same keys, those should be columns. Columns give you type safety,
indexing, constraints, and `NOT NULL` enforcement. JSONB gives you none of those by default.

```sql
-- Good use of JSONB — varies per record, rarely queried
ALTER TABLE brew_sessions ADD COLUMN metadata JSONB DEFAULT '{}';

-- Bad use of JSONB — this should be columns
ALTER TABLE brew_sessions ADD COLUMN data JSONB;
-- data: {"quality_score": 85, "beer_style_id": "..."}  -- NO
```

**Index JSONB fields you query on:**
```sql
CREATE INDEX idx_sessions_metadata_gin ON brew_sessions USING GIN (metadata);

-- Or index a specific key
CREATE INDEX idx_sessions_metadata_source ON brew_sessions((metadata->>'source'));
```

---

## Transactions

**Wrap multi-step operations in transactions.** If any step fails, all changes roll back.

```sql
BEGIN;
    INSERT INTO brew_sessions (beer_style_id, brewer_id) VALUES ($1, $2) RETURNING id;
    INSERT INTO brew_ingredients (session_id, ingredient_id, amount)
        VALUES (currval('brew_sessions_id_seq'), $3, $4);
COMMIT;
```

In application code, use your client library's transaction support:

```typescript
// node-postgres
await pool.query('BEGIN');
try {
    await pool.query('INSERT INTO ...', [...]);
    await pool.query('INSERT INTO ...', [...]);
    await pool.query('COMMIT');
} catch (err) {
    await pool.query('ROLLBACK');
    throw err;
}

// Prisma
await prisma.$transaction([
    prisma.brewSession.create({ data: session }),
    prisma.brewIngredient.createMany({ data: ingredients }),
]);
```

**Never do network calls or external API requests inside a transaction.**
Transactions hold locks. A slow HTTP call inside a transaction blocks other queries.

---

## Row Level Security (RLS)

RLS is essential for multi-tenant applications, especially with Supabase.

```sql
-- Enable RLS on the table
ALTER TABLE brew_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY "users_see_own_sessions" ON brew_sessions
    FOR SELECT USING (brewer_id = auth.uid());

-- Users can only insert their own sessions
CREATE POLICY "users_insert_own_sessions" ON brew_sessions
    FOR INSERT WITH CHECK (brewer_id = auth.uid());

-- Users can only update their own sessions
CREATE POLICY "users_update_own_sessions" ON brew_sessions
    FOR UPDATE USING (brewer_id = auth.uid());

-- Users can only delete their own sessions
CREATE POLICY "users_delete_own_sessions" ON brew_sessions
    FOR DELETE USING (brewer_id = auth.uid());
```

**RLS rules:**
- Enable RLS on every table that stores user data.
- Service role bypasses RLS — use it only in server-side code, never expose it to the client.
- Test RLS policies explicitly (see testing.md).
- Default-deny: if no policy matches, the row is invisible. This is safer than default-allow.

---

## Connection Pooling

**Always use connection pooling in production.** Direct connections to PostgreSQL are expensive.
Each connection consumes ~10MB of server memory. A spike of 100 concurrent requests without
pooling can exhaust your database.

- **Supabase**: use the connection pooler URL (port 6543), not the direct connection (port 5432)
- **Self-hosted**: run PgBouncer in front of PostgreSQL
- **Application-level**: use your client library's built-in pool (e.g. `node-postgres` Pool)

```typescript
// node-postgres — configure pool size
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,             // max connections in pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});
```

---

## Migrations

**Every schema change is a migration.** Period.

```
migrations/
  001_create_users.sql
  002_create_beer_styles.sql
  003_create_brew_sessions.sql
  004_add_quality_score_to_sessions.sql
```

**Rules:**
- Migrations are append-only. Never edit a migration that has been applied.
- Each migration should be idempotent where possible (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`).
- Name migrations descriptively: `004_add_quality_score_to_sessions.sql`, not `004_update.sql`.
- Include both `up` and `down` directions when your migration tool supports it.
- Test migrations against a copy of production data before deploying.

**Dangerous migrations need special care:**
- Dropping columns: deploy code that stops reading the column first, then drop it.
- Renaming columns: add new column, backfill, update code, drop old column.
- Adding NOT NULL: add as nullable, backfill, then add the constraint.
- Large table alterations: use `CREATE INDEX CONCURRENTLY` to avoid locking.

---

## Query Writing

**Parameterize everything.** No exceptions.

```typescript
// Good
await pool.query('SELECT * FROM users WHERE email = $1', [email]);

// NEVER — SQL injection
await pool.query(`SELECT * FROM users WHERE email = '${email}'`);
```

**Use CTEs for complex queries.** They're readable and optimizable.

```sql
WITH recent_brews AS (
    SELECT brewer_id, COUNT(*) AS brew_count, AVG(quality_score) AS avg_quality
    FROM brew_sessions
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY brewer_id
)
SELECT u.name, rb.brew_count, rb.avg_quality
FROM users u
JOIN recent_brews rb ON u.id = rb.brewer_id
WHERE rb.brew_count >= 5
ORDER BY rb.avg_quality DESC;
```

**EXPLAIN ANALYZE before shipping complex queries.** Don't guess at performance — measure it.

```sql
EXPLAIN ANALYZE
SELECT ...
```

Look for sequential scans on large tables, nested loops on unindexed joins, and sort operations
on un-indexed ORDER BY columns.
