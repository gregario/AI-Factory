# Project Structure — NoSQL

## Database Layer Layout

The database layer lives in a dedicated directory. It is the only place that imports database drivers or ODM libraries.

```
project-name/
  src/
    db/
      client.ts           # Connection setup, pooling, graceful shutdown
      collections.ts      # Collection references and index definitions
      schemas/            # Mongoose schemas or Zod validators per entity
        user.ts
        order.ts
      queries/            # Query functions grouped by domain
        users.ts          # findUserById, findUsersByRole, etc.
        orders.ts
      migrations/         # Schema migration scripts (if needed)
      seed.ts             # Seed data for development
    cache/
      redis.ts            # Redis client setup and connection
      keys.ts             # Key naming conventions and TTL constants
      strategies.ts       # Cache-aside, write-through, invalidation helpers
    services/             # Business logic that uses db/ and cache/
    types.ts              # Shared types including document shapes
  tests/
    setup.ts              # MongoMemoryServer / Redis test setup
    db/
      users.test.ts
      orders.test.ts
    cache/
      strategies.test.ts
```

### Key conventions

**`db/client.ts` owns the connection lifecycle.**
Other modules import the `db` object, never the raw `MongoClient`. This gives you one place to configure pooling, retries, and shutdown.

```typescript
// db/client.ts
import { MongoClient, Db } from 'mongodb';

let client: MongoClient;
let db: Db;

export async function connectDb(uri: string, dbName: string): Promise<Db> {
  client = new MongoClient(uri, {
    maxPoolSize: 10,
    retryWrites: true,
    retryReads: true,
  });
  await client.connect();
  db = client.db(dbName);
  return db;
}

export function getDb(): Db {
  if (!db) throw new Error('Database not connected. Call connectDb() first.');
  return db;
}

export async function closeDb(): Promise<void> {
  if (client) await client.close();
}
```

**`db/collections.ts` defines collection names and indexes in one place.**
```typescript
// db/collections.ts
export const COLLECTIONS = {
  USERS: 'users',
  ORDERS: 'orders',
  SESSIONS: 'sessions',
} as const;

export async function ensureIndexes(db: Db): Promise<void> {
  await db.collection(COLLECTIONS.USERS).createIndex({ email: 1 }, { unique: true });
  await db.collection(COLLECTIONS.ORDERS).createIndex({ userId: 1, createdAt: -1 });
  await db.collection(COLLECTIONS.SESSIONS).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
}
```

**Query functions are the public API. No raw queries outside `db/queries/`.**
Application code calls `findUserById(id)`, never `db.collection('users').findOne(...)` directly. This keeps query logic in one place and testable.

---

## Redis Layer Layout

```typescript
// cache/keys.ts — centralize key patterns and TTLs
export const CACHE_KEYS = {
  userSession: (userId: string) => `session:${userId}`,
  userProfile: (userId: string) => `user:${userId}:profile`,
  rateLimitMinute: (ip: string, minute: number) => `rate:${ip}:${minute}`,
} as const;

export const TTL = {
  SESSION: 86_400,       // 24 hours
  USER_PROFILE: 3_600,   // 1 hour
  RATE_LIMIT: 60,        // 1 minute
} as const;
```

**Never hardcode Redis keys as string literals in application code.** Use the key builder functions. This prevents typos and makes key patterns auditable.

---

## DynamoDB Layout

```
project-name/
  src/
    db/
      client.ts           # DynamoDB client setup
      tables.ts           # Table definitions, key schemas, GSI definitions
      entities/           # Entity-specific access patterns
        user.ts           # putUser, getUser, queryUserOrders
        order.ts
```

**Single-table design goes in `tables.ts`.**
```typescript
// db/tables.ts
export const TABLE_NAME = 'AppTable';

export const KEY_PREFIXES = {
  USER: 'USER#',
  ORDER: 'ORDER#',
  SESSION: 'SESSION#',
} as const;

export function userPK(userId: string) { return `${KEY_PREFIXES.USER}${userId}`; }
export function orderSK(orderId: string) { return `${KEY_PREFIXES.ORDER}${orderId}`; }
```

---

## Mongoose Projects

When using Mongoose, schemas replace raw collection definitions:

```
src/
  db/
    client.ts             # mongoose.connect() with options
    models/               # Mongoose models (schema + model export)
      User.ts
      Order.ts
    queries/              # Optional — complex queries that don't fit in model statics
```

```typescript
// db/models/User.ts
import { Schema, model } from 'mongoose';

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['admin', 'user', 'viewer'], default: 'user' },
}, { timestamps: true });

export const User = model('User', userSchema);
```

---

## Multi-Database Projects

Projects using both MongoDB and Redis (common for caching):

```
src/
  db/
    mongo/
      client.ts
      collections.ts
      queries/
    redis/
      client.ts
      keys.ts
      strategies.ts
  services/              # Business logic uses both db/mongo and db/redis
```

**Services orchestrate across databases.** A service function might check Redis cache first, fall back to MongoDB, and populate the cache on miss. The `db/` submodules know nothing about each other.

---

## Environment Configuration

**Connection strings come from environment variables. Never hardcode them.**

```typescript
// config.ts
export const config = {
  mongo: {
    uri: process.env.MONGO_URI ?? 'mongodb://localhost:27017',
    dbName: process.env.MONGO_DB ?? 'myapp',
  },
  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  },
  dynamodb: {
    region: process.env.AWS_REGION ?? 'us-east-1',
    endpoint: process.env.DYNAMODB_ENDPOINT, // undefined in prod, set for local dev
  },
};
```

---

## File Naming

| Thing | Convention | Example |
|-------|-----------|---------|
| Schema/model files | PascalCase (Mongoose) or kebab-case | `User.ts` or `user-schema.ts` |
| Query files | kebab-case, plural | `users.ts`, `order-items.ts` |
| Migration files | timestamp prefix | `20250315-add-email-index.ts` |
| Test files | mirror source path | `tests/db/users.test.ts` |
| Config files | kebab-case | `db-config.ts`, `redis-client.ts` |
