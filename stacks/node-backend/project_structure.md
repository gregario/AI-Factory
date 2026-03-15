# Project Structure — Node.js Backend

The TypeScript stack's `project_structure.md` covers general conventions (flat directories, colocated tests, tsconfig essentials). This file defines the specific directory layout for backend services.

---

## Standard Layout

```
project-name/
  src/
    index.ts              # Entry point — starts server, sets up graceful shutdown
    app.ts                # App factory — creates and configures the framework instance
    env.ts                # Environment config (dotenv + Zod validation)
    types.ts              # Shared type definitions
    errors.ts             # Custom error classes (AppError, NotFoundError, etc.)
    routes/
      users.ts            # Route handlers for /api/v1/users
      auth.ts             # Route handlers for /api/v1/auth
    services/
      user-service.ts     # Business logic for users
      auth-service.ts     # Business logic for auth (token generation, password hashing)
    middleware/
      auth.ts             # JWT verification middleware
      error-handler.ts    # Global error handler
      request-id.ts       # Attach unique request ID
      rate-limiter.ts     # Rate limiting
    db/
      client.ts           # Database client instance (Prisma/Drizzle)
      schema.ts           # Drizzle schema definitions (if using Drizzle)
  prisma/
    schema.prisma         # Prisma schema (if using Prisma)
    migrations/           # Migration files (committed to git)
  tests/
    global-setup.ts       # Testcontainers lifecycle
    helpers.ts            # Auth helpers, test data factories
    api/
      users.test.ts       # API-level tests
      auth.test.ts
    services/
      user-service.test.ts
    middleware/
      rate-limiter.test.ts
  dist/                   # Compiled output (gitignored)
  .env                    # Local environment variables (gitignored)
  .env.example            # Documented env vars (committed)
  package.json
  tsconfig.json
  vitest.config.ts
  Dockerfile
```

---

## Key Conventions

### Separation by Layer

```
routes/     → HTTP layer (thin handlers, validation, response formatting)
services/   → Business logic (domain rules, orchestration)
middleware/ → Cross-cutting concerns (auth, logging, error handling)
db/         → Data access (ORM client, raw queries)
```

Keep each layer focused. A route handler should not contain business logic. A service should not know about HTTP status codes. The `db/` layer handles connection management and query helpers.

### Entry Point Split

Separate the app creation from the server startup:

```typescript
// src/app.ts — framework configuration, no server.listen()
export async function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(requestId);
  app.get('/health', healthCheck);
  app.use('/api/v1', routes);
  app.use(globalErrorHandler);
  return app;
}

// src/index.ts — starts the server
import { buildApp } from './app.js';
import { env } from './env.js';
import db from './db/client.js';

const app = await buildApp();
const server = app.listen(env.PORT, () => {
  console.log(`Server listening on port ${env.PORT}`);
});

setupGracefulShutdown(server, db);
```

This lets tests import `buildApp()` without starting a real server.

### Environment Files

- `.env` — local development values. **Always gitignored.**
- `.env.example` — documents every variable the app needs, with placeholder values. **Committed.**
- `src/env.ts` — Zod schema that validates `process.env` at startup.

```
# .env.example
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/mydb
JWT_SECRET=change-me-to-a-real-secret-at-least-32-chars
JWT_REFRESH_SECRET=change-me-also-at-least-32-characters
LOG_LEVEL=debug
```

### Database Directory

**Prisma:** The `prisma/` directory lives at the project root (Prisma convention). `src/db/client.ts` exports the `PrismaClient` instance.

**Drizzle:** Schema definitions live in `src/db/schema.ts`. Migration files go in `drizzle/` at the project root.

Either way, `src/db/client.ts` is the single import point for database access.

### Dockerfile

```dockerfile
FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ src/
COPY prisma/ prisma/
RUN npx prisma generate
RUN npm run build

FROM base AS runtime
COPY --from=deps /app/node_modules node_modules
COPY --from=build /app/dist dist
COPY --from=build /app/node_modules/.prisma node_modules/.prisma
COPY prisma/ prisma/

USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

Multi-stage build. Dev dependencies stay in the build stage. The runtime image contains only production dependencies and compiled output.

---

## Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Route files | kebab-case, plural noun | `routes/users.ts`, `routes/auth.ts` |
| Service files | kebab-case with `-service` suffix | `services/user-service.ts` |
| Middleware files | kebab-case, descriptive name | `middleware/rate-limiter.ts` |
| Test files | mirror source path + `.test.ts` | `tests/api/users.test.ts` |
| Env variables | UPPER_SNAKE_CASE | `DATABASE_URL`, `JWT_SECRET` |
| API endpoints | lowercase, plural nouns, kebab-case | `/api/v1/user-profiles` |

---

## What Goes Where

| I need to... | Put it in... |
|-------------|-------------|
| Parse and validate a request | `routes/<resource>.ts` |
| Implement business rules | `services/<resource>-service.ts` |
| Query the database | `services/` (via ORM) or `db/` (for raw queries) |
| Check authentication | `middleware/auth.ts` |
| Handle errors globally | `middleware/error-handler.ts` |
| Define shared types | `src/types.ts` |
| Define custom errors | `src/errors.ts` |
| Configure environment | `src/env.ts` |
| Set up the framework | `src/app.ts` |
| Start the server | `src/index.ts` |
