# Common Pitfalls — Node.js Backend

All TypeScript pitfalls from `stacks/typescript/pitfalls.md` apply.
This file covers backend-specific gotchas.

---

## Pitfall 1: No Global Error Handler

**What it looks like:**
```typescript
app.post('/users', async (req, res) => {
  const user = await userService.create(req.body); // throws on validation error
  res.json(user);
});
// No error handler registered. Unhandled rejection crashes the process.
```

**Why it breaks:**
In Express, async errors don't propagate to the default error handler. The request hangs until the client times out, or the process crashes from an unhandled rejection.

**Fix:**
Wrap async handlers and register a global error handler:
```typescript
app.post('/users', asyncHandler(async (req, res) => {
  const user = await userService.create(req.body);
  res.json(user);
}));

// Last middleware
app.use(globalErrorHandler);
```

Fastify handles async errors automatically — but still register an `onError` hook for custom formatting.

---

## Pitfall 2: Trusting req.body Without Validation

**What it looks like:**
```typescript
app.post('/users', async (req, res) => {
  await db.user.create({ data: req.body }); // whatever the client sends goes straight to the DB
  res.status(201).send();
});
```

**Why it breaks:**
The client can send extra fields, wrong types, or malicious data. At best you get a database error. At worst you get a mass assignment vulnerability (setting `role: "admin"` on a registration endpoint).

**Fix:**
Always parse through a Zod schema:
```typescript
const body = CreateUserSchema.parse(req.body);
await db.user.create({ data: body }); // only validated fields
```

---

## Pitfall 3: Leaking Internal Errors to Clients

**What it looks like:**
```typescript
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message, stack: err.stack });
});
```

**Why it breaks:**
Stack traces reveal file paths, dependency versions, database structure, and internal logic. This is an information disclosure vulnerability.

**Fix:**
Log the full error server-side. Return a generic message to the client:
```typescript
app.use((err, req, res, next) => {
  logger.error({ err, requestId: req.id }, 'Unhandled error');
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
});
```

---

## Pitfall 4: Missing Graceful Shutdown

**What it looks like:**
```typescript
app.listen(3000, () => console.log('Running'));
// Process receives SIGTERM during a database write — instant kill, corrupted data.
```

**Why it breaks:**
Docker/Kubernetes send `SIGTERM` on deployments. Without a handler, Node.js terminates immediately. In-flight requests get dropped. Database transactions may be left in an inconsistent state.

**Fix:**
Handle shutdown signals:
```typescript
process.on('SIGTERM', async () => {
  server.close();
  await db.$disconnect();
  process.exit(0);
});
```

---

## Pitfall 5: Not Validating Environment Variables at Startup

**What it looks like:**
```typescript
const dbUrl = process.env.DATABASE_URL; // undefined if not set
// App starts fine... then crashes 5 minutes later on first DB query
```

**Why it breaks:**
Missing env vars cause confusing runtime errors far from the source of the problem. You waste time debugging a database connection error when the real problem is a missing config value.

**Fix:**
Validate all env vars at startup with a Zod schema:
```typescript
const env = EnvSchema.parse(process.env);
// If DATABASE_URL is missing, the process exits NOW with a clear error
```

---

## Pitfall 6: Hardcoded CORS Origins

**What it looks like:**
```typescript
app.use(cors({ origin: '*' }));
```

**Why it breaks:**
Wildcard CORS in production allows any website to make authenticated requests to your API. This is a security vulnerability, especially with cookie-based auth.

**Fix:**
Whitelist specific origins:
```typescript
app.use(cors({
  origin: env.ALLOWED_ORIGINS.split(','),
  credentials: true,
}));
```

---

## Pitfall 7: N+1 Queries

**What it looks like:**
```typescript
const users = await db.user.findMany();
for (const user of users) {
  const posts = await db.post.findMany({ where: { authorId: user.id } });
  // 1 query for users + N queries for posts = N+1
}
```

**Why it breaks:**
For 100 users, this runs 101 database queries instead of 2. Performance degrades linearly with data size.

**Fix:**
Use includes/joins:
```typescript
// Prisma
const users = await db.user.findMany({ include: { posts: true } });

// Drizzle
const users = await db.query.users.findMany({ with: { posts: true } });
```

---

## Pitfall 8: Storing Passwords in Plain Text

**What it looks like:**
```typescript
await db.user.create({ data: { email, password: input.password } });
```

**Why it breaks:**
If the database is ever compromised, every user's password is exposed. This is negligent.

**Fix:**
Hash passwords before storing:
```typescript
import bcrypt from 'bcrypt';

const hash = await bcrypt.hash(input.password, 12);
await db.user.create({ data: { email, passwordHash: hash } });
```

Never log passwords, even in debug mode.

---

## Pitfall 9: Using Synchronous Operations on the Event Loop

**What it looks like:**
```typescript
import { readFileSync } from 'fs';

app.get('/config', (req, res) => {
  const config = readFileSync('/etc/app/config.json', 'utf-8'); // blocks the event loop
  res.json(JSON.parse(config));
});
```

**Why it breaks:**
Node.js is single-threaded. A synchronous file read (or crypto operation, or JSON parse of a large payload) blocks every other request until it finishes.

**Fix:**
Use async versions:
```typescript
import { readFile } from 'fs/promises';

app.get('/config', async (req, res) => {
  const config = await readFile('/etc/app/config.json', 'utf-8');
  res.json(JSON.parse(config));
});
```

Synchronous operations are acceptable at startup (loading config, reading certs) but never in request handlers.

---

## Pitfall 10: JWT Secret in Code or .env Committed to Git

**What it looks like:**
```typescript
const SECRET = 'my-super-secret-key';
// or
// .env committed to the repo with real secrets
```

**Why it breaks:**
Secrets in source control are permanently exposed. Even if you delete them later, they're in git history.

**Fix:**
- `.env` is always gitignored
- `.env.example` has placeholder values only
- Production secrets come from the deployment environment (Kubernetes secrets, cloud provider secret managers, CI/CD variables)

---

## Checklist Before Deploying

- [ ] Global error handler is registered and returns safe error messages
- [ ] All request bodies validated with Zod
- [ ] Environment variables validated at startup
- [ ] Graceful shutdown handles SIGTERM and SIGINT
- [ ] Health check endpoint exists and checks real dependencies
- [ ] CORS configured with specific origins (no wildcards)
- [ ] Passwords hashed with bcrypt or argon2
- [ ] JWT secrets loaded from environment, not hardcoded
- [ ] No synchronous I/O in request handlers
- [ ] Database queries avoid N+1 patterns
- [ ] .env is gitignored
