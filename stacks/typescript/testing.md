# Testing — TypeScript

## When to Use Which Test Type

There's no single right answer. The project overlay should state which approach it uses.
This guide helps you decide.

### Integration Tests

**Use when:**
- The logic lives in SQL queries, API calls, or framework glue
- Mocking the boundary would test nothing useful
- The integration IS the logic (e.g. database queries, MCP tool handlers)
- You need confidence that components work together

**Trade-offs:**
- Slower to run (database, network, etc.)
- Need infrastructure (Docker, test databases)
- Higher confidence that the system actually works

### Unit Tests

**Use when:**
- Pure functions with no side effects
- Complex business logic or calculations
- Parsers, validators, transformers
- You want fast feedback during development

**Trade-offs:**
- Fast to run, no infrastructure needed
- Lower confidence about integration boundaries
- Can give false confidence if you mock too much

### End-to-End / Scenario Tests

**Use when:**
- Testing user-facing workflows (CLI commands, API sequences, UI flows)
- Validating that a multi-step process works as a whole
- Documenting how the system is meant to be used

---

## Test File Structure

**Consistent setup/teardown pattern:**
```typescript
describe('Feature', () => {
  beforeAll(async () => {
    // One-time setup (connect to DB, start server)
  });

  beforeEach(async () => {
    // Reset state before each test
  });

  afterAll(async () => {
    // Cleanup (close connections, stop server)
  });

  it('does the thing', async () => {
    // Arrange
    const input = createInput();

    // Act
    const result = await doTheThing(input);

    // Assert
    expect(result.status).toBe('done');
  });
});
```

**Test isolation matters.**
Each test should be independent. Never rely on state from a previous test.
If tests share a database, truncate between tests.

**Name tests descriptively.**
The test name should read as a sentence describing the behaviour.
```typescript
// Good
it('rejects claiming a non-open intent')
it('filters signals by team')
it('completes a claim and marks intent done')

// Bad
it('test1')
it('should work')
it('handles error')
```

---

## Assertions

**Assert behaviour, not implementation.**
```typescript
// Good — tests the result
expect(result.status).toBe('done');
expect(signals).toHaveLength(1);

// Bad — tests internal implementation details
expect(mockDb.query).toHaveBeenCalledWith('UPDATE...');
```

**One logical assertion per test.**
Multiple `expect` calls are fine if they're checking different aspects of the same behaviour.
But if a test is checking two unrelated things, split it.

**Test error paths explicitly.**
```typescript
it('rejects claiming a non-existent intent', async () => {
  await expect(db.claimWork({ intent_id: 'nonexistent', claimed_by: 'alice' }))
    .rejects.toThrow('not found');
});
```

---

## What to Test

### Always test
- State transitions and lifecycle (draft → open → claimed → done)
- Error paths and validation (what happens with bad input)
- Edge cases (empty arrays, null values, boundary conditions)
- Data round-trips (save/load, serialise/deserialise)

### Skip testing
- Framework internals (the test runner, the HTTP framework, the ORM)
- Type checking (that's TypeScript's job)
- Third-party library behaviour
- Trivial getters/setters

---

## Mocking Guidelines

**Default: don't mock.**
If you can test against the real thing (a real database, a real file system), do that first.
Mocks drift from reality. Integration tests catch the drift.

**Mock only at system boundaries you don't control:**
- External APIs (payment providers, third-party services)
- Time-dependent behaviour (use a clock abstraction)
- Non-deterministic outputs (randomness)

**Never mock the thing you're testing.**
If you're mocking the database to test a database query, you're testing nothing.
