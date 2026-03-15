# Testing — Node.js Backend

All TypeScript testing conventions from `stacks/typescript/testing.md` apply.
This file covers backend-specific testing patterns only.

---

## Test Stack

| Tool | Purpose |
|------|---------|
| Vitest | Test runner and assertion library |
| supertest | HTTP-level API testing (works with Express and Fastify) |
| testcontainers | Spin up real databases in Docker for integration tests |
| @faker-js/faker | Generate realistic test data |

---

## API Tests with Supertest

**Test the HTTP surface, not internal functions.**
API tests send real HTTP requests to your app and assert on status codes, headers, and response bodies.

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { buildApp } from '../src/app.js';

describe('POST /api/v1/users', () => {
  let app: Express;

  beforeAll(async () => {
    app = await buildApp(); // returns the Express/Fastify app instance
  });

  afterAll(async () => {
    await cleanup(); // close DB connections, etc.
  });

  it('creates a user and returns 201', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .send({ email: 'alice@example.com', name: 'Alice' })
      .expect(201);

    expect(res.body.data).toMatchObject({
      email: 'alice@example.com',
      name: 'Alice',
    });
    expect(res.body.data.id).toBeDefined();
  });

  it('returns 400 for invalid email', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .send({ email: 'not-an-email', name: 'Bob' })
      .expect(400);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 409 for duplicate email', async () => {
    await request(app)
      .post('/api/v1/users')
      .send({ email: 'dupe@example.com', name: 'First' });

    await request(app)
      .post('/api/v1/users')
      .send({ email: 'dupe@example.com', name: 'Second' })
      .expect(409);
  });
});
```

### App Factory Pattern

Export a `buildApp()` function that creates and configures the app instance without starting the server. This lets tests create isolated app instances.

```typescript
// src/app.ts
export async function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1', routes);
  app.use(globalErrorHandler);
  return app;
}

// src/index.ts (entry point)
const app = await buildApp();
app.listen(env.PORT, () => console.log(`Listening on ${env.PORT}`));
```

Tests import `buildApp`, not the running server.

---

## Database Integration Tests with Testcontainers

**Use real databases in tests.** Testcontainers spins up a Docker container with the actual database engine. No SQLite-pretending-to-be-Postgres. No mocking the ORM.

```typescript
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

let container: StartedPostgreSqlContainer;
let db: PrismaClient;

beforeAll(async () => {
  container = await new PostgreSqlContainer().start();

  process.env.DATABASE_URL = container.getConnectionUri();
  execSync('npx prisma migrate deploy', { env: process.env });

  db = new PrismaClient({ datasourceUrl: container.getConnectionUri() });
  await db.$connect();
}, 60_000); // container startup can take a while

afterAll(async () => {
  await db.$disconnect();
  await container.stop();
});

beforeEach(async () => {
  // Truncate all tables between tests for isolation
  await db.$executeRawUnsafe(`
    DO $$ DECLARE r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
    END $$;
  `);
});
```

**Timeout:** Set `beforeAll` timeout to 60 seconds. Docker image pulls on first run can be slow.

**Tip:** Reuse a single container across test files with Vitest's `globalSetup`:
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globalSetup: './tests/global-setup.ts',
  },
});
```

---

## Testing Auth-Protected Routes

Create a helper that generates a valid JWT for test requests.

```typescript
// tests/helpers.ts
import jwt from 'jsonwebtoken';

export function authHeader(userId = 'test-user-id'): { Authorization: string } {
  const token = jwt.sign({ sub: userId }, process.env.JWT_SECRET!, { expiresIn: '1h' });
  return { Authorization: `Bearer ${token}` };
}
```

```typescript
it('returns user profile for authenticated request', async () => {
  await request(app)
    .get('/api/v1/users/me')
    .set(authHeader('user-123'))
    .expect(200);
});

it('returns 401 without auth header', async () => {
  await request(app)
    .get('/api/v1/users/me')
    .expect(401);
});
```

---

## Testing Middleware

Test middleware in isolation by creating a minimal Express/Fastify app that uses only that middleware.

```typescript
describe('rateLimiter middleware', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(rateLimiter({ maxRequests: 3, windowMs: 1000 }));
    app.get('/test', (_req, res) => res.json({ ok: true }));
  });

  it('allows requests under the limit', async () => {
    await request(app).get('/test').expect(200);
    await request(app).get('/test').expect(200);
    await request(app).get('/test').expect(200);
  });

  it('blocks requests over the limit', async () => {
    await request(app).get('/test').expect(200);
    await request(app).get('/test').expect(200);
    await request(app).get('/test').expect(200);
    await request(app).get('/test').expect(429);
  });
});
```

---

## Test Organisation

```
tests/
  global-setup.ts          # Testcontainers lifecycle (start/stop)
  helpers.ts               # Auth helpers, test data factories
  api/
    users.test.ts           # API tests for /api/v1/users
    auth.test.ts            # API tests for /api/v1/auth
  services/
    user-service.test.ts    # Unit tests for business logic
  middleware/
    rate-limiter.test.ts    # Middleware isolation tests
```

Group tests by layer: `api/` for HTTP-level, `services/` for business logic, `middleware/` for middleware. This makes it clear what level of abstraction each test operates at.

---

## What to Test in a Backend

### Always test
- **Happy paths** — the main success scenario for each endpoint
- **Validation errors** — malformed input, missing fields, invalid types
- **Auth flows** — login, token refresh, protected routes, expired tokens
- **Error responses** — 404s, 409s, permission denied
- **Database constraints** — unique violations, foreign key failures
- **Edge cases** — empty lists, pagination boundaries, concurrent writes

### Skip testing
- ORM internals (Prisma/Drizzle handle their own correctness)
- Framework middleware behaviour (Express's `json()` parser works)
- Third-party library internals

---

## Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: './tests/global-setup.ts',
    testTimeout: 10_000,
    hookTimeout: 60_000,       // allow time for container startup
    pool: 'forks',             // isolate test files in separate processes
    fileParallelism: false,    // run test files sequentially (shared DB)
  },
});
```

**Use `pool: 'forks'`** for database tests to avoid connection pool conflicts between test files.

**Set `fileParallelism: false`** when tests share a single database container. Tests within a file still run sequentially (Vitest default), and `beforeEach` truncation handles isolation.
