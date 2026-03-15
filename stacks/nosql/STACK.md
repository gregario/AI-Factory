# NoSQL Stack Profile

This stack profile defines how ALL NoSQL database layers in the AI-Factory must be designed and implemented. It covers MongoDB for document storage, Redis for caching and ephemeral data, and DynamoDB for serverless-native workloads. These are cross-cutting patterns that layer on top of application stacks (TypeScript, Python, etc.).

Before writing any database layer code, Claude must read this stack profile in full.

---

## Files in This Profile

| File | Read When |
|------|-----------|
| `coding_standards.md` | Writing queries, schemas, or data access code |
| `testing.md` | Writing tests or setting up test database infrastructure |
| `project_structure.md` | Designing data models, collections, or adding database modules |
| `pitfalls.md` | Debugging unexpected behaviour or reviewing database code |

---

## Core Principles

1. **Embed what you read together, reference what you read independently.** Document design is the most consequential decision. Co-locate data that a single query needs. Reference data that has its own lifecycle or is shared across many parents.

2. **Every query must have an index.** No collection scan should reach production. Design indexes before writing queries, not after performance degrades. Use `explain()` to verify.

3. **Pick the right tool for the access pattern.** MongoDB for flexible documents and aggregation. Redis for sub-millisecond caching, sessions, and pub/sub. DynamoDB for serverless key-value at scale. Never force one engine to do another's job.

4. **Schema validation is not optional.** Even in "schemaless" databases, enforce structure. Use MongoDB JSON Schema validators, Mongoose schemas, or Zod for application-level validation. Unvalidated writes corrupt data silently.

5. **Connection management is critical infrastructure.** Use connection pooling, configure retry logic, and set timeouts. A single misconfigured connection layer can bring down an entire application.

---

## Key Technologies

| Technology | Purpose |
|-----------|---------|
| MongoDB | Primary document database — flexible schema, aggregation pipelines, ACID transactions |
| Redis | Caching, sessions, rate limiting, pub/sub, queues, leaderboards |
| DynamoDB | Serverless key-value/document storage on AWS, single-digit millisecond reads |
| Mongoose | ODM for MongoDB in Node.js/TypeScript — schema definition, validation, middleware |
| ioredis | Redis client for Node.js — cluster support, pipelining, Lua scripting |
| @aws-sdk/client-dynamodb | AWS SDK v3 DynamoDB client |
| MongoDB Memory Server | In-memory MongoDB for testing (JS/TS) |
| mongomock / mongomock-motor | In-memory MongoDB for testing (Python) |
| Testcontainers | Real database containers for integration tests |

---

## When to Use This Stack

Use this stack profile when a project needs:

- Document storage with flexible or evolving schemas (MongoDB)
- High-speed caching, session management, or real-time pub/sub (Redis)
- Serverless-native persistence with predictable performance at scale (DynamoDB)
- Denormalized read-optimized data models instead of normalized relational schemas
- Aggregation pipelines for analytics, reporting, or complex data transformations

Do NOT use this stack when:
- Your data is highly relational with many joins (use PostgreSQL)
- You need strong ACID transactions across many entities (use a relational DB)
- Your data fits in a single JSON file and doesn't need querying
