# Testing — NoSQL

## Use Real Databases for Tests

**Default: test against real database instances, not mocks.**

Mocking a database query tests nothing. The query logic, index usage, and data behavior are the things that break in production. Test against the real engine.

### MongoDB

**Use MongoDB Memory Server for JS/TS projects.**
```typescript
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';

let mongod: MongoMemoryServer;
let client: MongoClient;
let db: Db;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  client = new MongoClient(mongod.getUri());
  await client.connect();
  db = client.db('test');
});

afterAll(async () => {
  await client.close();
  await mongod.stop();
});

beforeEach(async () => {
  // Clean slate for each test — drop all collections
  const collections = await db.listCollections().toArray();
  await Promise.all(collections.map(c => db.dropCollection(c.name)));
});
```

**For Python projects, use mongomock or mongomock-motor.**
```python
import mongomock

@mongomock.patch(servers=(('localhost', 27017),))
def test_insert_user():
    client = pymongo.MongoClient('localhost')
    db = client['test']
    db.users.insert_one({'name': 'Alice', 'email': 'alice@example.com'})
    assert db.users.count_documents({}) == 1
```

### Redis

**Use a real Redis instance for integration tests.** Testcontainers or a dedicated test Redis on a non-default port.

```typescript
import Redis from 'ioredis';

let redis: Redis;

beforeAll(async () => {
  redis = new Redis({ port: 6380, db: 15 }); // test-specific port and DB number
});

afterAll(async () => {
  await redis.quit();
});

beforeEach(async () => {
  await redis.flushdb(); // clean the test DB
});
```

For unit tests where Redis is a caching layer (not the thing being tested), use ioredis-mock:
```typescript
import RedisMock from 'ioredis-mock';
const redis = new RedisMock();
```

### DynamoDB

**Use DynamoDB Local or Testcontainers for integration tests.**

```typescript
import { DynamoDBClient, CreateTableCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({
  endpoint: 'http://localhost:8000', // DynamoDB Local
  region: 'local',
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
});

beforeAll(async () => {
  await client.send(new CreateTableCommand({
    TableName: 'TestTable',
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' },
      { AttributeName: 'SK', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  }));
});
```

---

## What to Test

### Always test
- **CRUD operations** — insert, find, update, delete round-trips
- **Query correctness** — filters, sorts, projections return expected results
- **Index usage** — run `.explain()` in at least one test per critical query to verify index hits
- **Schema validation** — invalid documents are rejected
- **Edge cases** — empty results, duplicate keys, concurrent writes
- **TTL behavior** — cache expiration, session cleanup (use short TTLs in tests)
- **Aggregation pipelines** — each stage produces expected intermediate and final results
- **Error handling** — duplicate key errors, connection failures, timeout behavior

### Skip testing
- MongoDB/Redis/DynamoDB internals (they work)
- Basic driver operations (the SDK is tested)
- Network-level concerns (TCP, TLS negotiation)

---

## Test Patterns

### Seed Data Helpers

**Create factory functions for test data. Never hardcode documents inline everywhere.**

```typescript
function createUser(overrides: Partial<User> = {}): User {
  return {
    _id: new ObjectId(),
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    role: 'user',
    createdAt: new Date(),
    ...overrides,
  };
}

it('finds users by role', async () => {
  const admin = createUser({ role: 'admin' });
  const viewer = createUser({ role: 'viewer' });
  await db.collection('users').insertMany([admin, viewer]);

  const admins = await db.collection('users').find({ role: 'admin' }).toArray();
  expect(admins).toHaveLength(1);
  expect(admins[0]._id).toEqual(admin._id);
});
```

### Testing Aggregation Pipelines

**Test pipelines stage by stage for complex aggregations.**

```typescript
it('computes monthly revenue per user', async () => {
  await db.collection('orders').insertMany([
    { userId: 'alice', total: 100, createdAt: new Date('2025-01-15') },
    { userId: 'alice', total: 50, createdAt: new Date('2025-01-20') },
    { userId: 'bob', total: 75, createdAt: new Date('2025-01-10') },
  ]);

  const results = await getMonthlyRevenue(db, new Date('2025-01-01'));

  expect(results).toEqual([
    { _id: 'alice', totalSpent: 150, orderCount: 2 },
    { _id: 'bob', totalSpent: 75, orderCount: 1 },
  ]);
});
```

### Testing Cache Patterns

**Test both cache hit and cache miss paths.**

```typescript
it('returns cached value on hit', async () => {
  await redis.set('user:1', JSON.stringify({ name: 'Alice' }), 'EX', 60);

  const result = await getCachedUser('1');
  expect(result.name).toBe('Alice');
});

it('fetches from database on cache miss and populates cache', async () => {
  await db.collection('users').insertOne({ _id: '1', name: 'Bob' });

  const result = await getCachedUser('1');
  expect(result.name).toBe('Bob');

  // Verify cache was populated
  const cached = await redis.get('user:1');
  expect(JSON.parse(cached!).name).toBe('Bob');
});
```

### Testing Redis Data Structures

```typescript
it('tracks leaderboard scores with sorted set', async () => {
  await redis.zadd('leaderboard', 100, 'alice', 250, 'bob', 75, 'carol');

  const top2 = await redis.zrevrange('leaderboard', 0, 1, 'WITHSCORES');
  expect(top2).toEqual(['bob', '250', 'alice', '100']);
});

it('enforces rate limit', async () => {
  for (let i = 0; i < 100; i++) {
    await checkRateLimit('192.168.1.1');
  }
  await expect(checkRateLimit('192.168.1.1')).rejects.toThrow('Rate limit exceeded');
});
```

---

## Performance Testing

**Verify index usage in tests, not just in production.**

```typescript
it('uses index for user lookup by email', async () => {
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('users').insertOne(createUser({ email: 'test@example.com' }));

  const explain = await db.collection('users')
    .find({ email: 'test@example.com' })
    .explain('executionStats');

  expect(explain.executionStats.totalDocsExamined).toBe(1);
  expect(explain.executionStats.executionStages.stage).not.toBe('COLLSCAN');
});
```

---

## Test Database Isolation

**Every test gets a clean database. No test depends on state from a previous test.**

Strategies:
- `beforeEach`: drop collections or `flushdb` (Redis)
- Unique database names per test suite (MongoDB: `db('test-' + randomSuffix)`)
- Transaction rollback (MongoDB 4.0+ with replica sets)

**Never share a test database across parallel test suites** unless each suite uses its own database name or Redis DB number.
