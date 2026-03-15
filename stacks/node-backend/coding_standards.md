# Coding Standards — Node.js Backend

All TypeScript coding standards from `stacks/typescript/coding_standards.md` apply.
This file covers backend-specific patterns only.

---

## HTTP Framework Patterns

### Fastify

```typescript
import Fastify from 'fastify';

const app = Fastify({ logger: true });

// Register plugins for encapsulation
await app.register(authPlugin);
await app.register(routes, { prefix: '/api/v1' });

await app.listen({ port: 3000, host: '0.0.0.0' });
```

Fastify uses a plugin system. Each plugin gets its own encapsulated context.
Register routes, hooks, and decorators inside plugins — not on the root instance.

### Express

```typescript
import express from 'express';

const app = express();

app.use(express.json());
app.use(requestId);
app.use(authMiddleware);
app.use('/api/v1', routes);
app.use(globalErrorHandler);

app.listen(3000);
```

Express uses linear middleware chains. Order matters.
Always register the global error handler last.

---

## Request Validation

**Validate with Zod at the route level.**

```typescript
import { z } from 'zod';

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(['admin', 'member']).default('member'),
});

type CreateUserInput = z.infer<typeof CreateUserSchema>;
```

**Fastify — use schema hooks or preValidation:**
```typescript
app.post('/users', async (request, reply) => {
  const body = CreateUserSchema.parse(request.body);
  const user = await userService.create(body);
  return reply.status(201).send(user);
});
```

**Express — validate in the handler or a validation middleware:**
```typescript
app.post('/users', async (req, res, next) => {
  try {
    const body = CreateUserSchema.parse(req.body);
    const user = await userService.create(body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});
```

For Express, prefer wrapping route handlers to avoid repetitive try/catch:
```typescript
function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

app.post('/users', asyncHandler(async (req, res) => {
  const body = CreateUserSchema.parse(req.body);
  const user = await userService.create(body);
  res.status(201).json(user);
}));
```

---

## Layered Architecture

Route handlers are thin. Business logic lives in service modules. Database access lives in repository modules or the ORM layer.

```
Request → Middleware → Route Handler → Service → Repository/ORM → Database
```

```typescript
// routes/users.ts — thin handler, no business logic
app.post('/users', asyncHandler(async (req, res) => {
  const body = CreateUserSchema.parse(req.body);
  const user = await userService.create(body);
  res.status(201).json(user);
}));

// services/user-service.ts — business logic
export async function create(input: CreateUserInput): Promise<User> {
  const existing = await db.user.findUnique({ where: { email: input.email } });
  if (existing) throw new ConflictError(`User with email ${input.email} already exists`);
  return db.user.create({ data: input });
}
```

Keep handlers under 15 lines. If a handler is growing, extract logic into a service function.

---

## Error Handling

### Custom Error Classes

```typescript
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} ${id} not found`, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}
```

### Global Error Handler

```typescript
// Express
function globalErrorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
    return;
  }

  if (err instanceof z.ZodError) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', issues: err.issues } });
    return;
  }

  // Unknown error — log full details, return generic message
  req.log?.error(err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
}
```

**Never expose stack traces or internal details in production error responses.**
Log them server-side; return a generic message to the client.

---

## Middleware

### Standard Middleware Stack

Apply these in order:

1. **Request ID** — attach a unique ID to every request for tracing
2. **Logger** — log method, path, status, duration
3. **Auth** — verify JWT, attach user to request
4. **Rate limiter** — per-IP or per-user limits
5. **Routes** — the actual handlers
6. **Error handler** — global catch-all (Express: must be last)

```typescript
// Request ID middleware (Express)
function requestId(req: Request, _res: Response, next: NextFunction) {
  req.id = req.headers['x-request-id'] as string ?? crypto.randomUUID();
  next();
}
```

### Auth Middleware

```typescript
function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new UnauthorizedError();

  const token = header.slice(7);
  const payload = verifyAccessToken(token);
  req.user = payload;
  next();
}
```

For routes that don't need auth (login, register, health check), skip the middleware:
```typescript
app.post('/auth/login', loginHandler);        // no auth
app.use(authMiddleware);                       // everything below requires auth
app.get('/users/me', getMeHandler);
```

---

## Authentication

### JWT + Refresh Token Pattern

```typescript
import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export function generateTokens(userId: string): { accessToken: string; refreshToken: string } {
  const accessToken = jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
  const refreshToken = jwt.sign({ sub: userId, type: 'refresh' }, env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
  return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string): { sub: string } {
  return jwt.verify(token, env.JWT_SECRET) as { sub: string };
}
```

**Store refresh tokens in the database** so they can be revoked.
**Never store JWTs in localStorage** — use httpOnly cookies for browser clients.
**Rotate refresh tokens on use** — issue a new pair on every refresh request.

---

## Environment Config

```typescript
import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export const env = EnvSchema.parse(process.env);
```

This runs at import time. If any variable is missing or invalid, the process crashes immediately with a Zod error message listing exactly what's wrong.

---

## Database Patterns

### Prisma

```typescript
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
});

export default db;
```

**Migrations are code-reviewed.** Run `prisma migrate dev` locally, commit the migration file, and review it in the PR.

**Use transactions for multi-step writes:**
```typescript
await db.$transaction(async (tx) => {
  const order = await tx.order.create({ data: orderData });
  await tx.inventory.update({ where: { id: itemId }, data: { quantity: { decrement: 1 } } });
  return order;
});
```

### Drizzle

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';

const db = drizzle(env.DATABASE_URL, { schema });
export default db;
```

Drizzle is a good choice when you want more control over SQL and prefer a thinner abstraction.

---

## Graceful Shutdown

```typescript
function setupGracefulShutdown(server: Server, db: PrismaClient) {
  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);

    server.close(() => {
      console.log('HTTP server closed.');
    });

    await db.$disconnect();
    console.log('Database connections closed.');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
```

**Always call this after starting the server.** Without it, deployments on Docker/Kubernetes will kill the process mid-request.

---

## Health Check

Every service exposes a `GET /health` endpoint. No auth required.

```typescript
app.get('/health', async (_req, res) => {
  try {
    await db.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'unhealthy', timestamp: new Date().toISOString() });
  }
});
```

This endpoint checks actual dependencies (database, cache, etc.), not just "the process is alive". Load balancers and orchestrators rely on it.

---

## API Response Format

**Consistent JSON envelope:**
```typescript
// Success
{ "data": { ... } }

// Error
{ "error": { "code": "NOT_FOUND", "message": "User abc123 not found" } }

// List with pagination
{ "data": [...], "pagination": { "page": 1, "pageSize": 20, "total": 142 } }
```

**Use plural nouns for resource endpoints:**
`GET /api/v1/users`, not `GET /api/v1/user`.

**Version your API** from day one: `/api/v1/...`. It's trivial to add, painful to retrofit.
