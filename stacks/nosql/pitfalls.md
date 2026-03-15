# Common Pitfalls — NoSQL

This file documents mistakes that appear repeatedly in NoSQL database code.
Read this when debugging unexpected behaviour or reviewing database code.

---

## Pitfall 1: Unbounded Document Growth

**What it looks like:**
```typescript
// Embedding comments directly in a blog post document
await db.collection('posts').updateOne(
  { _id: postId },
  { $push: { comments: newComment } }
);
```

**Why it breaks:**
MongoDB documents have a 16MB size limit. A popular post with thousands of comments will eventually hit that limit and writes will fail silently or throw. Even before hitting the limit, large documents degrade read performance because MongoDB loads the full document into memory.

**Fix:**
Use a separate `comments` collection with a reference to the post:
```typescript
await db.collection('comments').insertOne({
  postId: postId,
  author: 'Alice',
  body: 'Great post!',
  createdAt: new Date(),
});
```

**Rule of thumb:** If the array can grow without a known upper bound, it belongs in its own collection.

---

## Pitfall 2: Missing Indexes on Large Collections

**What it looks like:**
```typescript
// This query works fine with 100 documents...
const orders = await db.collection('orders')
  .find({ userId: userId, status: 'pending' })
  .sort({ createdAt: -1 })
  .toArray();
```

**Why it breaks:**
Without an index, MongoDB performs a full collection scan (COLLSCAN). At 100 documents, this takes milliseconds. At 1 million documents, it takes seconds and locks resources.

**Fix:**
Create a compound index matching the query pattern:
```typescript
await db.collection('orders').createIndex({ userId: 1, status: 1, createdAt: -1 });
```

Always verify with `.explain('executionStats')` that the query uses an IXSCAN, not COLLSCAN.

---

## Pitfall 3: Forgetting TTL on Cache Keys

**What it looks like:**
```typescript
await redis.set(`cache:user:${id}`, JSON.stringify(user));
// No expiration set
```

**Why it breaks:**
Redis keeps everything in memory. Keys without TTL accumulate forever. Eventually Redis hits its `maxmemory` limit and either rejects writes (noeviction policy) or starts evicting keys unpredictably.

**Fix:**
Always set expiration on cache keys:
```typescript
await redis.set(`cache:user:${id}`, JSON.stringify(user), 'EX', 3600);
```

If a key is truly permanent (feature flags, config), document why it has no TTL.

---

## Pitfall 4: Storing Large Blobs in Documents

**What it looks like:**
```typescript
await db.collection('files').insertOne({
  name: 'report.pdf',
  content: binaryData, // 5MB Buffer
});
```

**Why it breaks:**
Large binary data inflates document size, wastes memory when MongoDB loads documents, and approaches the 16MB limit fast. It also makes backups and replication significantly slower.

**Fix:**
Use GridFS for files over 1MB, or store files in object storage (S3, GCS) and keep only the reference:
```typescript
await db.collection('files').insertOne({
  name: 'report.pdf',
  s3Key: 'uploads/2025/03/report.pdf',
  size: 5_242_880,
  contentType: 'application/pdf',
});
```

---

## Pitfall 5: N+1 Query Problem with References

**What it looks like:**
```typescript
const orders = await db.collection('orders').find({ status: 'pending' }).toArray();

// For each order, fetch the user — N additional queries
for (const order of orders) {
  order.user = await db.collection('users').findOne({ _id: order.userId });
}
```

**Why it breaks:**
If there are 100 pending orders, this makes 101 database calls. Latency adds up linearly.

**Fix:**
Batch the lookup:
```typescript
const orders = await db.collection('orders').find({ status: 'pending' }).toArray();
const userIds = [...new Set(orders.map(o => o.userId))];
const users = await db.collection('users')
  .find({ _id: { $in: userIds } })
  .toArray();

const userMap = new Map(users.map(u => [u._id.toHexString(), u]));
for (const order of orders) {
  order.user = userMap.get(order.userId.toHexString());
}
```

Or use `$lookup` in an aggregation pipeline if it fits the query pattern.

---

## Pitfall 6: Using Redis as Primary Storage

**What it looks like:**
```typescript
// Storing user data only in Redis, no database backup
await redis.hset(`user:${id}`, userData);
```

**Why it breaks:**
Redis is an in-memory store. Even with RDB snapshots or AOF persistence, data can be lost between snapshots on crash. Redis eviction policies may drop keys under memory pressure. It is not a durable primary database.

**Fix:**
Write to a durable database (MongoDB, PostgreSQL) first, then cache in Redis:
```typescript
await db.collection('users').insertOne(userData);          // durable write
await redis.hset(`user:${id}`, userData);                  // cache for fast reads
```

---

## Pitfall 7: Hot Partitions in DynamoDB

**What it looks like:**
```typescript
// All writes go to the same partition key
await dynamodb.put({
  TableName: 'Events',
  Item: { PK: 'GLOBAL', SK: `EVENT#${timestamp}`, ... },
});
```

**Why it breaks:**
DynamoDB distributes data across partitions by partition key. If all items share the same PK, all reads and writes hit a single partition, causing throttling even with available overall capacity.

**Fix:**
Distribute writes across partitions. Add a suffix to spread load:
```typescript
const shard = eventId.hashCode() % 10; // or random 0-9
await dynamodb.put({
  TableName: 'Events',
  Item: { PK: `EVENTS#${shard}`, SK: `EVENT#${timestamp}`, ... },
});
```

Reading requires scatter-gather across shards, so only use this pattern for write-heavy workloads.

---

## Pitfall 8: Not Handling Duplicate Key Errors

**What it looks like:**
```typescript
await db.collection('users').insertOne({ email: 'alice@example.com', name: 'Alice' });
// If email already exists with a unique index, this throws an unhandled MongoServerError
```

**Why it breaks:**
Unique index violations throw error code 11000. If unhandled, this crashes the request handler. Users see a 500 error instead of a helpful "email already exists" message.

**Fix:**
```typescript
try {
  await db.collection('users').insertOne(doc);
} catch (err) {
  if (err instanceof MongoServerError && err.code === 11000) {
    throw new ConflictError(`User with email ${doc.email} already exists`);
  }
  throw err;
}
```

---

## Pitfall 9: Ignoring MongoDB Write Concern

**What it looks like:**
```typescript
// Default write concern may be w:0 or w:1 without journal
await db.collection('payments').insertOne(paymentRecord);
```

**Why it breaks:**
With `w: 1` (acknowledged by primary only), a failover before replication loses the write. For financial or critical data, this means silent data loss.

**Fix:**
Set appropriate write concern for critical operations:
```typescript
await db.collection('payments').insertOne(paymentRecord, {
  writeConcern: { w: 'majority', j: true },
});
```

Configure the default write concern on the client for the whole application if most writes need durability.

---

## Pitfall 10: Serialization Roundtrip Bugs in Redis

**What it looks like:**
```typescript
const user = { name: 'Alice', createdAt: new Date(), score: 42 };
await redis.set('user:1', JSON.stringify(user));

const cached = JSON.parse(await redis.get('user:1'));
// cached.createdAt is now a string, not a Date
// cached.score is still a number (fine), but ObjectIds, Buffers, etc. are lost
```

**Why it breaks:**
`JSON.stringify` converts Dates to ISO strings, drops `undefined` values, and cannot represent `ObjectId`, `Buffer`, `BigInt`, or circular references.

**Fix:**
Use explicit serialization with type restoration:
```typescript
function serializeUser(user: User): string {
  return JSON.stringify(user);
}

function deserializeUser(raw: string): User {
  const parsed = JSON.parse(raw);
  return { ...parsed, createdAt: new Date(parsed.createdAt) };
}
```

Or use a library like `superjson` that preserves types across serialization boundaries.

---

## Checklist Before Committing Database Code

- [ ] Every query has a supporting index (verified with `.explain()` for critical paths)
- [ ] All embedded arrays have a known upper bound
- [ ] All Redis cache keys have TTL set (or documented reason for permanence)
- [ ] No large binary data stored inline in documents
- [ ] Connection pooling is configured with timeouts and retry logic
- [ ] Duplicate key and constraint errors are handled with user-facing messages
- [ ] Write concern is appropriate for data criticality
- [ ] Graceful shutdown closes all database connections
- [ ] Test data is isolated between tests (drop/flush in beforeEach)
- [ ] No hardcoded connection strings (use environment variables)
