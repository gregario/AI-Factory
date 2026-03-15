# Node.js Backend Stack Profile

This stack profile defines how Node.js backend services (REST APIs, GraphQL servers, background workers) are built in the AI-Factory.

**This stack layers on top of the TypeScript stack.** Read `stacks/typescript/` first — all TypeScript conventions apply unless explicitly overridden here. This file covers backend-specific patterns only.

Before implementing any Node.js backend code, Claude must read this stack profile in full.

---

## Files in This Profile

| File | Read When |
|------|-----------|
| `coding_standards.md` | Writing any backend code (routes, middleware, services) |
| `testing.md` | Writing tests or setting up test infrastructure |
| `project_structure.md` | Creating a new backend project or adding files |
| `pitfalls.md` | Debugging unexpected behaviour or reviewing code |

Also read: `stacks/typescript/STACK.md` (parent stack).

---

## Core Principles

**Validate at the boundary, trust internally.**
All external input (request bodies, query params, headers, environment variables) is validated with Zod schemas at the point of entry. Once validated, the typed data flows through the system without re-checking. Never trust raw `req.body`.

**Middleware for cross-cutting concerns.**
Auth, logging, rate limiting, error handling, request IDs — these belong in middleware, not in route handlers. Route handlers do one thing: call the service layer and return the result.

**Fail fast, fail loud.**
Services should throw typed errors. The global error handler catches them, logs them, and returns structured error responses. No silent failures. No `res.status(500).send("error")` scattered across handlers.

**Graceful shutdown is mandatory.**
Every backend service must handle `SIGTERM` and `SIGINT`. Close the HTTP server, drain database connections, finish in-flight requests. Kubernetes, Docker, and process managers all send these signals — ignoring them causes data corruption and dropped requests.

**Environment config is validated, not assumed.**
Load environment variables via `dotenv`, then validate them against a Zod schema at startup. If a required variable is missing, the process exits immediately with a clear error — not five minutes later when the first database query fails.

---

## Key Technologies

| Technology | Purpose |
|-----------|---------|
| Fastify (preferred) / Express | HTTP framework |
| Zod | Runtime validation for requests, env config, and API contracts |
| Prisma (preferred) / Drizzle | Database ORM |
| JWT + refresh tokens | Authentication |
| bcrypt / argon2 | Password hashing |
| pino (Fastify) / winston (Express) | Structured logging |
| dotenv | Environment variable loading |
| Vitest + supertest | API testing |
| testcontainers | Database integration testing |

Fastify is preferred for new projects — it's faster, has built-in schema validation, and its plugin system encourages encapsulation. Express is acceptable for existing codebases or when the team is more familiar with it.

---

## When to Use This Stack

Use this stack for any project that:

- Serves an HTTP API (REST or GraphQL)
- Needs persistent database storage
- Requires user authentication
- Runs as a long-lived backend process (not a serverless function or CLI tool)
- Needs background job processing alongside an API

Do not use this stack for:
- MCP servers (use `stacks/mcp/` instead)
- CLI tools (use `stacks/typescript/` directly)
- Static sites or pure frontend projects
