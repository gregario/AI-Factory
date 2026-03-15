# Common Pitfalls — SQL

This file documents mistakes that appear repeatedly when working with SQL databases.
Read this when debugging query performance, data integrity issues, or connection problems.

---

## Pitfall 1: N+1 Queries

**What it looks like:**
```typescript
const users = await pool.query('SELECT * FROM users');
for (const user of users.rows) {
    const sessions = await pool.query(
        'SELECT * FROM brew_sessions WHERE brewer_id = $1',
        [user.id]
    );
    // process sessions
}
```

**Why it breaks:**
100 users = 101 database queries (1 for users + 100 for sessions). This is catastrophically
slow at scale and the #1 performance mistake in database-backed applications.

**Fix:**
Use a JOIN or a single query with `WHERE IN`:
```typescript
const result = await pool.query(`
    SELECT u.*, bs.id AS session_id, bs.quality_score
    FROM users u
    LEFT JOIN brew_sessions bs ON u.id = bs.brewer_id
    WHERE u.id = ANY($1)
`, [userIds]);
```

Or if using an ORM, use eager loading (`include` in Prisma, `joinedload` in SQLAlchemy).

---

## Pitfall 2: Missing Indexes on Foreign Keys

**What it looks like:**
```sql
CREATE TABLE brew_sessions (
    id UUID PRIMARY KEY,
    brewer_id UUID NOT NULL REFERENCES users(id)
    -- no index on brewer_id
);
```

**Why it breaks:**
PostgreSQL does NOT auto-create indexes on foreign key columns. Every JOIN or WHERE clause
on `brewer_id` does a full sequential scan. This is invisible on small tables and devastating
on large ones.

**Fix:**
Always create an index on every foreign key column:
```sql
CREATE INDEX idx_brew_sessions_brewer_id ON brew_sessions(brewer_id);
```

---

## Pitfall 3: Unsafe Migration Rollbacks

**What it looks like:**
```sql
-- Migration 005: up
ALTER TABLE users DROP COLUMN legacy_email;

-- Migration 005: down
ALTER TABLE users ADD COLUMN legacy_email VARCHAR(255);
-- The data is gone. Rollback adds the column but not the values.
```

**Why it breaks:**
Dropping a column destroys data permanently. The rollback can recreate the column but not
the data that was in it. If you need to roll back, you've lost everything.

**Fix:**
For destructive changes, use a multi-step approach:
1. Deploy code that stops reading the column.
2. Wait until you're confident the change is safe (days, not minutes).
3. Drop the column in a later migration.

For adding NOT NULL constraints, backfill first:
```sql
-- Step 1: Add nullable column
ALTER TABLE users ADD COLUMN display_name TEXT;
-- Step 2: Backfill
UPDATE users SET display_name = name WHERE display_name IS NULL;
-- Step 3: Add constraint (separate migration, after verifying backfill)
ALTER TABLE users ALTER COLUMN display_name SET NOT NULL;
```

---

## Pitfall 4: Connection Exhaustion

**What it looks like:**
- Application works fine locally, crashes in production under load
- Error: "too many connections" or "remaining connection slots are reserved"
- Serverless functions each open their own connection

**Why it breaks:**
PostgreSQL has a hard connection limit (default 100). Each connection uses ~10MB of memory.
Without pooling, every request opens a new connection, and under load you hit the limit.

**Fix:**
- Use a connection pooler (PgBouncer, Supabase pooler)
- Configure pool size appropriately (`max: 20` is a reasonable default)
- Use Supabase's pooler URL (port 6543) in serverless environments
- Close idle connections with `idleTimeoutMillis`

```typescript
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});
```

---

## Pitfall 5: SQL Injection via String Concatenation

**What it looks like:**
```typescript
const query = `SELECT * FROM users WHERE email = '${userInput}'`;
await pool.query(query);
```

**Why it breaks:**
If `userInput` is `' OR '1'='1`, the query returns all users. If it's `'; DROP TABLE users; --`,
you lose the table. This is the oldest and most dangerous vulnerability in web applications.

**Fix:**
Use parameterized queries. Always.
```typescript
await pool.query('SELECT * FROM users WHERE email = $1', [userInput]);
```

ORMs handle this automatically. If you're writing raw SQL, use placeholders (`$1` in
PostgreSQL, `?` in SQLite/MySQL).

---

## Pitfall 6: Implicit Type Coercion

**What it looks like:**
```sql
-- PostgreSQL
SELECT * FROM users WHERE id = '123';  -- id is INTEGER
```

**Why it breaks:**
PostgreSQL may silently cast the string to an integer, but this can prevent index usage and
cause unexpected behavior. In some cases it throws an error (e.g. comparing UUID column to
a plain string that isn't a valid UUID).

**Fix:**
Always use the correct types in your parameters:
```typescript
// Bad — passing string for integer column
await pool.query('SELECT * FROM users WHERE id = $1', ['123']);

// Good — passing the correct type
await pool.query('SELECT * FROM users WHERE id = $1', [123]);
```

---

## Pitfall 7: SELECT * in Production Code

**What it looks like:**
```sql
SELECT * FROM brew_sessions WHERE brewer_id = $1;
```

**Why it breaks:**
- Returns columns you don't need, wasting bandwidth and memory
- Breaks when columns are added or renamed
- Prevents covering indexes from being effective
- JSONB or TEXT columns with large values get fetched unnecessarily

**Fix:**
Select only the columns you need:
```sql
SELECT id, beer_style_id, quality_score, status, created_at
FROM brew_sessions
WHERE brewer_id = $1;
```

---

## Pitfall 8: Running Migrations Without a Lock

**What it looks like:**
Two application instances start simultaneously, both try to run migrations,
one fails with a "relation already exists" error or worse — both partially apply.

**Why it breaks:**
Migrations are not idempotent by default. Two concurrent runs cause race conditions.

**Fix:**
Use advisory locks in your migration runner:
```sql
SELECT pg_advisory_lock(12345);  -- Acquire lock
-- Run migrations
SELECT pg_advisory_unlock(12345);  -- Release lock
```

Most migration tools (Prisma, Alembic, Flyway) handle this automatically.
If you're writing a custom runner, add locking.

---

## Pitfall 9: Storing Passwords or Secrets in Plain Text

**What it looks like:**
```sql
INSERT INTO users (email, password) VALUES ($1, $2);
-- $2 is 'hunter2'
```

**Why it breaks:**
Database breaches happen. When they do, every user's password is exposed. This is not
a theoretical risk — it's the most common data breach pattern.

**Fix:**
Hash passwords with bcrypt/argon2 before storing:
```typescript
import { hash } from 'bcrypt';
const hashed = await hash(password, 12);
await pool.query('INSERT INTO users (email, password_hash) VALUES ($1, $2)', [email, hashed]);
```

For API keys and tokens, use one-way hashes. For secrets that need to be retrieved
(e.g. OAuth tokens), use encryption at rest.

---

## Pitfall 10: Forgetting to ANALYZE After Bulk Operations

**What it looks like:**
You bulk-insert 100k rows, then queries on that table are suddenly slow.

**Why it breaks:**
PostgreSQL's query planner uses table statistics to choose execution plans. After large
data changes, the statistics are stale and the planner makes bad decisions
(e.g. choosing a sequential scan over an index scan).

**Fix:**
Run ANALYZE after bulk operations:
```sql
ANALYZE brew_sessions;
```

PostgreSQL's autovacuum does this periodically, but it may not run fast enough after
a large bulk insert.

---

## Checklist Before Shipping Database Changes

- [ ] Are all foreign key columns indexed?
- [ ] Are all queries parameterized (no string concatenation)?
- [ ] Do migrations have safe rollback paths?
- [ ] Are destructive column changes done in multiple steps?
- [ ] Is connection pooling configured?
- [ ] Have you run EXPLAIN ANALYZE on new queries against realistic data?
- [ ] Are RLS policies in place for user-facing tables?
- [ ] Are passwords/secrets hashed, never stored in plain text?
- [ ] Do tests run against a real database, not mocks?
