# Coding Standards — TypeScript

## Naming

```typescript
// Variables and functions: camelCase
const currentBalance = 500.0;
function calculateRevenue(qualityScore: number): number { ... }

// Types and interfaces: PascalCase
type BeerStyle = { id: string; name: string; };
interface SignalHandler { handle(signal: Signal): Promise<void>; }

// Constants: UPPER_SNAKE_CASE
const MAX_RETRIES = 3;
const DEFAULT_TIMEOUT_MS = 5000;

// Enums: PascalCase members
enum Status { Draft, Open, Claimed, Done }

// File names: kebab-case or camelCase — match the project convention, don't mix
// signal-handler.ts OR signalHandler.ts — pick one per project
```

---

## Types

**Be specific. Avoid `any`.**
If you must use `any`, add a comment explaining why. Prefer `unknown` when you don't know the type — it forces you to narrow before using.

```typescript
// Bad
function parse(data: any): any { ... }

// Good
function parse(data: unknown): ParsedResult { ... }
```

**Use union types for known variants.**
```typescript
// Good
type Status = 'draft' | 'open' | 'claimed' | 'done';

// Bad — stringly-typed without constraint
function setStatus(status: string): void { ... }
```

**Prefer type aliases for data shapes, interfaces for contracts.**
```typescript
// Data shape — use type
type Intent = {
  id: string;
  title: string;
  status: Status;
};

// Contract to implement — use interface
interface Repository {
  findById(id: string): Promise<Intent | null>;
  save(intent: Intent): Promise<void>;
}
```

**Use generics instead of duplicating types.**
```typescript
// Good
function query<T>(sql: string, params: unknown[]): Promise<QueryResult<T>> { ... }

// Bad — separate function per type
function queryIntent(sql: string, params: unknown[]): Promise<QueryResult<Intent>> { ... }
function queryClaim(sql: string, params: unknown[]): Promise<QueryResult<Claim>> { ... }
```

---

## Error Handling

**No empty catch blocks.**
```typescript
// Bad
try { await doSomething(); } catch (e) { }

// Good
try {
  await doSomething();
} catch (err) {
  throw new Error(`Failed to do something: ${err instanceof Error ? err.message : err}`);
}
```

**Throw descriptive errors with context.**
```typescript
// Bad
throw new Error('Not found');

// Good
throw new Error(`Intent ${intentId} not found`);
```

**Don't catch errors you can't handle.**
Let them propagate to somewhere that can handle them meaningfully.

---

## Async Patterns

**Always await promises or return them. Never fire and forget.**
```typescript
// Bad — promise floats, errors are silently swallowed
doAsyncThing();

// Good
await doAsyncThing();
```

**Use async/await over .then() chains.**
```typescript
// Good
const result = await fetchData();
const processed = await processResult(result);

// Avoid unless composing with Promise.all
fetchData().then(processResult).then(handleProcessed);
```

**Use Promise.all for independent concurrent operations.**
```typescript
// Good — parallel
const [users, teams] = await Promise.all([getUsers(), getTeams()]);

// Bad — sequential when they don't depend on each other
const users = await getUsers();
const teams = await getTeams();
```

---

## Module Structure

**One concept per file.**
A file should export one primary thing. Helper functions that support it can live in the same file.
If you're exporting five unrelated functions, split the file.

**Explicit exports.**
Export what's public. Keep internal helpers unexported.
```typescript
// Good — clear API surface
export function createIntent(params: CreateParams): Promise<Intent> { ... }

// Internal — not exported
function validateParams(params: CreateParams): void { ... }
```

**Avoid barrel files (index.ts re-exports) unless the project is a library.**
In application code, import directly from the source file. Barrel files obscure where things live and slow down IDE navigation.

---

## Code Style

**Prefer const over let. Never use var.**

**Use template literals for string interpolation.**
```typescript
// Good
const msg = `Intent ${id} not found`;

// Bad
const msg = 'Intent ' + id + ' not found';
```

**Early returns over nested conditionals.**
```typescript
// Good
function getUser(id: string): User {
  const user = users.get(id);
  if (!user) throw new Error(`User ${id} not found`);
  return user;
}

// Bad
function getUser(id: string): User {
  const user = users.get(id);
  if (user) {
    return user;
  } else {
    throw new Error(`User ${id} not found`);
  }
}
```

**Keep functions short.**
If a function exceeds ~50 lines, consider extracting helpers.
If it has more than 4 parameters, consider an options object.

```typescript
// Good — options object
function createIntent(params: {
  title: string;
  teamId: string;
  priority?: Priority;
  description?: string;
}): Promise<Intent> { ... }

// Awkward — too many positional args
function createIntent(
  title: string, teamId: string, priority: Priority,
  description: string, parentId: string
): Promise<Intent> { ... }
```
