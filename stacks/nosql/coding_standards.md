# Coding Standards — NoSQL

## Document Design

**Embed for read performance. Reference for write independence.**

```typescript
// Good — user profile with embedded addresses (read together, bounded)
type UserProfile = {
  _id: ObjectId;
  name: string;
  email: string;
  addresses: Address[];  // max 5, always fetched with user
};

// Good — orders reference user (independent lifecycle, unbounded)
type Order = {
  _id: ObjectId;
  userId: ObjectId;  // reference, not embedded
  items: OrderItem[];  // embedded — always read with order
  total: number;
};

// Bad — embedding unbounded data
type User = {
  _id: ObjectId;
  name: string;
  orders: Order[];  // grows forever, hits 16MB limit
};
```

**Ask three questions before embedding:**
1. Is the embedded data bounded (max cardinality known)?
2. Is it always read with the parent?
3. Does it change independently of the parent?

If 1 and 2 are yes and 3 is no, embed. Otherwise, reference.

---

## Schema Validation

**Validate at the database level AND the application level.**

```typescript
// MongoDB JSON Schema validator on collection creation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'email', 'createdAt'],
      properties: {
        name: { bsonType: 'string', minLength: 1 },
        email: { bsonType: 'string', pattern: '^.+@.+\\..+$' },
        createdAt: { bsonType: 'date' },
        role: { enum: ['admin', 'user', 'viewer'] },
      },
    },
  },
});
```

```typescript
// Application-level validation with Zod (TypeScript)
const UserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'viewer']).default('user'),
});

type User = z.infer<typeof UserSchema>;
```

**Use Mongoose schemas when the project uses Mongoose.** They give you validation, middleware hooks, and type inference in one layer.

---

## Indexing

**Design indexes for your queries, not your schema.**

```typescript
// Compound index — field order matters. Equality fields first, sort fields last.
db.collection('orders').createIndex({ userId: 1, createdAt: -1 });

// TTL index for automatic expiration
db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Unique index
db.collection('users').createIndex({ email: 1 }, { unique: true });

// Partial index — only index documents matching a filter
db.collection('orders').createIndex(
  { status: 1 },
  { partialFilterExpression: { status: 'pending' } }
);

// Text index for full-text search
db.collection('products').createIndex({ name: 'text', description: 'text' });
```

**Rules:**
- Every query that runs in production must use an index. Verify with `.explain('executionStats')`.
- Compound indexes follow the ESR rule: **E**quality, **S**ort, **R**ange.
- Don't create indexes you don't query against. Each index costs write performance and storage.
- Use `background: true` for index builds on live collections (MongoDB 4.2+ builds in background by default).

---

## MongoDB Aggregation Pipelines

**Put `$match` and `$project` early to reduce the working set.**

```typescript
const results = await db.collection('orders').aggregate([
  // Filter first — uses index, reduces documents flowing through pipeline
  { $match: { status: 'completed', createdAt: { $gte: startOfMonth } } },

  // Project only needed fields early
  { $project: { userId: 1, total: 1, items: 1 } },

  // Group and compute
  { $group: { _id: '$userId', totalSpent: { $sum: '$total' }, orderCount: { $sum: 1 } } },

  // Sort by result
  { $sort: { totalSpent: -1 } },

  // Limit output
  { $limit: 10 },
]).toArray();
```

**Use `$lookup` sparingly.** It's a left outer join and can be expensive. If you find yourself using `$lookup` everywhere, your document design may need rethinking.

---

## Redis Data Structures

**Pick the right structure for the job.**

| Structure | Use For | Example |
|-----------|---------|---------|
| String | Simple cache, counters, flags | Session tokens, rate limit counters |
| Hash | Object-like data with field access | User profiles, config objects |
| Sorted Set | Ranked data, time-series | Leaderboards, scheduled jobs |
| List | Queues, recent items | Task queues, activity feeds |
| Set | Unique membership, tags | Online users, feature flags |
| Stream | Event logs, message queues | Audit trails, pub/sub with persistence |

```typescript
// Cache with TTL — always set expiration
await redis.set(`user:${id}`, JSON.stringify(user), 'EX', 3600);

// Hash — access individual fields without deserializing
await redis.hset(`user:${id}`, { name: 'Alice', role: 'admin' });
const name = await redis.hget(`user:${id}`, 'name');

// Sorted set — leaderboard
await redis.zadd('leaderboard', score, `user:${id}`);
const top10 = await redis.zrevrange('leaderboard', 0, 9, 'WITHSCORES');

// Rate limiting with INCR + EXPIRE
const key = `rate:${ip}:${minute}`;
const count = await redis.incr(key);
if (count === 1) await redis.expire(key, 60);
if (count > 100) throw new Error('Rate limit exceeded');
```

---

## DynamoDB Patterns

**Design for access patterns, not entity relationships.**

```typescript
// Single-table design — use composite keys
const params = {
  TableName: 'AppTable',
  Item: {
    PK: `USER#${userId}`,       // Partition key
    SK: `ORDER#${orderId}`,     // Sort key
    type: 'order',
    total: 42.99,
    createdAt: new Date().toISOString(),
  },
};

// Query all orders for a user — single partition, sorted
const result = await dynamodb.query({
  TableName: 'AppTable',
  KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
  ExpressionAttributeValues: {
    ':pk': `USER#${userId}`,
    ':sk': 'ORDER#',
  },
});
```

**Use GSIs (Global Secondary Indexes) for alternate access patterns.** Design your table and GSIs together, not separately.

**On-demand capacity for unpredictable workloads.** Provisioned capacity for steady-state. Don't guess — start with on-demand and switch to provisioned once you understand traffic patterns.

---

## Connection Management

**Always use connection pooling. Never create a connection per request.**

```typescript
// MongoDB — create client once, reuse everywhere
const client = new MongoClient(uri, {
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 30_000,
  connectTimeoutMS: 5_000,
  serverSelectionTimeoutMS: 5_000,
  retryWrites: true,
  retryReads: true,
});

// Connect once at startup
await client.connect();
const db = client.db('myapp');

// Graceful shutdown
process.on('SIGTERM', async () => {
  await client.close();
  process.exit(0);
});
```

```typescript
// Redis — ioredis handles reconnection automatically
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    return Math.min(times * 200, 2000); // exponential backoff, max 2s
  },
  lazyConnect: true,
});

await redis.connect();
```

---

## Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Collections (MongoDB) | plural, snake_case | `user_profiles`, `order_items` |
| Redis keys | colon-delimited, hierarchical | `user:123:session`, `rate:ip:minute` |
| DynamoDB tables | PascalCase | `AppTable`, `UserEvents` |
| DynamoDB keys | UPPER prefix with `#` separator | `USER#123`, `ORDER#456` |
| Index names | descriptive, snake_case | `user_email_unique`, `orders_by_date` |
| Mongoose models | PascalCase singular | `User`, `OrderItem` |

---

## Error Handling

**Handle database errors with context. Distinguish retryable from fatal.**

```typescript
try {
  await collection.insertOne(doc);
} catch (err) {
  if (err instanceof MongoServerError) {
    if (err.code === 11000) {
      throw new Error(`Duplicate key: ${JSON.stringify(err.keyValue)}`);
    }
  }
  throw new Error(`Failed to insert into ${collectionName}: ${err instanceof Error ? err.message : err}`);
}
```

**Wrap Redis operations with timeout fallbacks for caching.**
```typescript
async function getCached<T>(key: string, fallback: () => Promise<T>, ttl = 3600): Promise<T> {
  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached) as T;
  } catch {
    // Cache miss or Redis down — fall through to fallback
  }

  const value = await fallback();
  // Fire-and-forget cache set — don't let cache failures block the response
  redis.set(key, JSON.stringify(value), 'EX', ttl).catch(() => {});
  return value;
}
```
