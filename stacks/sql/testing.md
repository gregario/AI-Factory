# Testing — SQL

## Core Rule: Test Against a Real Database

Do not mock the database. Database tests that mock SQL queries test nothing useful — they verify
that your mock returns what you told it to return.

Use a real PostgreSQL or SQLite instance for tests. The database IS the logic. Query behavior,
constraint enforcement, type coercion, and transaction semantics only show up against a real engine.

---

## Test Database Setup

**Use a dedicated test database.** Never run tests against development or production data.

```bash
# Create a test database
createdb myproject_test

# Set the test database URL in your test environment
DATABASE_URL=postgresql://localhost:5432/myproject_test
```

**Run migrations before tests.** Your test database schema should match production.

```typescript
beforeAll(async () => {
    // Apply all migrations to test database
    await runMigrations(testDatabaseUrl);
});
```

**For SQLite, use an in-memory database when speed matters:**
```typescript
import Database from 'better-sqlite3';

const db = new Database(':memory:');
// Apply schema
db.exec(fs.readFileSync('schema.sql', 'utf-8'));
```

---

## Test Isolation with Transactions

The best pattern for test isolation: wrap each test in a transaction and roll it back afterward.
Every test starts with a clean slate without the cost of truncating tables.

```typescript
let client: PoolClient;

beforeEach(async () => {
    client = await pool.connect();
    await client.query('BEGIN');
});

afterEach(async () => {
    await client.query('ROLLBACK');
    client.release();
});

it('inserts a brew session', async () => {
    await client.query(
        'INSERT INTO brew_sessions (beer_style_id, brewer_id) VALUES ($1, $2)',
        [styleId, brewerId]
    );
    const result = await client.query(
        'SELECT * FROM brew_sessions WHERE brewer_id = $1',
        [brewerId]
    );
    expect(result.rows).toHaveLength(1);
});
```

**When transactions don't work** (e.g. testing DDL, testing transaction logic itself),
fall back to truncation:

```typescript
afterEach(async () => {
    await pool.query('TRUNCATE brew_sessions, brew_ingredients CASCADE');
});
```

---

## What to Test

### Always Test

**Schema constraints.** Verify that your constraints actually prevent bad data:
```typescript
it('rejects negative quality scores', async () => {
    await expect(
        client.query(
            'INSERT INTO brew_sessions (id, quality_score) VALUES ($1, $2)',
            [id, -5]
        )
    ).rejects.toThrow(/check/i);
});

it('rejects duplicate emails', async () => {
    await client.query('INSERT INTO users (email) VALUES ($1)', ['a@b.com']);
    await expect(
        client.query('INSERT INTO users (email) VALUES ($1)', ['a@b.com'])
    ).rejects.toThrow(/unique/i);
});
```

**Foreign key enforcement:**
```typescript
it('prevents deleting a style that has sessions', async () => {
    // Insert style, insert session referencing style
    await expect(
        client.query('DELETE FROM beer_styles WHERE id = $1', [styleId])
    ).rejects.toThrow(/foreign key/i);
});
```

**Query correctness.** Test that queries return the right data with the right filters:
```typescript
it('returns only sessions for the given brewer', async () => {
    // Insert sessions for brewer A and brewer B
    const result = await client.query(
        'SELECT * FROM brew_sessions WHERE brewer_id = $1',
        [brewerAId]
    );
    expect(result.rows.every(r => r.brewer_id === brewerAId)).toBe(true);
});
```

**Migrations.** Test that migrations apply cleanly to an empty database and that
rollbacks work:
```typescript
it('applies all migrations without error', async () => {
    const db = new Database(':memory:');
    for (const migration of migrations) {
        db.exec(migration.up);
    }
    // Verify final schema has expected tables
    const tables = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table'"
    ).all();
    expect(tables.map(t => t.name)).toContain('brew_sessions');
});
```

**RLS policies** (if using Supabase/RLS):
```typescript
it('user cannot see other users sessions', async () => {
    // Set the auth context to user A
    await client.query("SET request.jwt.claims = '{\"sub\": \"user-a\"}'");
    // Query sessions — should only see user A's rows
    const result = await client.query('SELECT * FROM brew_sessions');
    expect(result.rows.every(r => r.brewer_id === 'user-a')).toBe(true);
});
```

### Skip Testing

- Database engine internals (PostgreSQL's planner, SQLite's WAL mode)
- ORM framework behavior (Prisma's query builder, Drizzle's type inference)
- Connection pooling mechanics (PgBouncer's behavior)

---

## Seed Data

**Use factory functions, not fixture files.**

```typescript
function createUser(overrides: Partial<User> = {}): User {
    return {
        id: randomUUID(),
        email: `user-${randomUUID().slice(0, 8)}@test.com`,
        name: 'Test User',
        ...overrides,
    };
}

function createBrewSession(overrides: Partial<BrewSession> = {}): BrewSession {
    return {
        id: randomUUID(),
        beer_style_id: defaultStyleId,
        brewer_id: defaultBrewerId,
        quality_score: 75,
        status: 'planning',
        ...overrides,
    };
}
```

Factory functions are composable, readable, and make it obvious what data matters for each test.
Fixture JSON files are brittle, hard to read, and tend to grow into unmaintainable blobs.

---

## Performance Testing

For queries that will run at scale, test with realistic data volumes:

```typescript
it('returns results within 50ms with 100k sessions', async () => {
    // Seed 100k rows (do this in beforeAll, not per-test)
    const start = performance.now();
    await client.query(
        'SELECT * FROM brew_sessions WHERE brewer_id = $1 ORDER BY created_at DESC LIMIT 20',
        [brewerId]
    );
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
});
```

Use `EXPLAIN ANALYZE` in test output to catch missing indexes early.

---

## Cleanup

**Always close connections after tests.**

```typescript
afterAll(async () => {
    await pool.end();
});
```

Leaving connections open causes test runners to hang. This is the single most common
database testing mistake.
