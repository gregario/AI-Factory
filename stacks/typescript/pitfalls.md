# Common Pitfalls — TypeScript / Node.js

This file documents mistakes that appear repeatedly in TypeScript projects.
Read this when debugging unexpected behaviour or reviewing code.

It starts lean and grows from experience. When you hit a gotcha, add it here.

---

## Pitfall 1: Forgetting .js Extensions in ESM Imports

**What it looks like:**
```typescript
import { query } from './db/connection';
```

**Why it breaks:**
With `"type": "module"` in package.json, Node.js requires file extensions in import paths.
TypeScript compiles `.ts` → `.js`, but doesn't rewrite import paths. You must write `.js`
even though the source file is `.ts`.

**Fix:**
```typescript
import { query } from './db/connection.js';
```

---

## Pitfall 2: Swallowed Promise Rejections

**What it looks like:**
```typescript
async function handleRequest(req: Request) {
  doSomethingAsync(); // no await, no .catch()
}
```

**Why it breaks:**
The promise rejection goes unhandled. In Node.js, this triggers `unhandledRejection`
and may crash the process.

**Fix:**
Always `await` or explicitly handle the promise:
```typescript
await doSomethingAsync();
// or
doSomethingAsync().catch(err => logger.error(err));
```

---

## Pitfall 3: Using `any` to Silence Type Errors

**What it looks like:**
```typescript
const result: any = await fetchData();
result.whatever.you.want; // no type checking
```

**Why it breaks:**
You've opted out of TypeScript's entire value proposition. Bugs that types would catch
at compile time now crash at runtime.

**Fix:**
Use `unknown` and narrow:
```typescript
const result: unknown = await fetchData();
if (isValidResult(result)) {
  result.status; // now typed
}
```

---

## Pitfall 4: Mutating Function Parameters

**What it looks like:**
```typescript
function processItems(items: Item[]) {
  items.sort((a, b) => a.name.localeCompare(b.name)); // mutates the caller's array
  return items;
}
```

**Why it breaks:**
Array methods like `.sort()`, `.reverse()`, `.splice()` mutate in place.
The caller doesn't expect their array to change.

**Fix:**
Copy first:
```typescript
function processItems(items: Item[]) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}
```

---

## Pitfall 5: Assuming Object Spread is Deep Copy

**What it looks like:**
```typescript
const copy = { ...original };
copy.nested.value = 'changed'; // also changes original.nested.value
```

**Why it breaks:**
Spread only copies one level deep. Nested objects are still references.

**Fix:**
Use `structuredClone()` for deep copies, or be explicit about what you're copying:
```typescript
const copy = structuredClone(original);
```

---

## Pitfall 6: Not Handling Database Connection Cleanup

**What it looks like:**
```typescript
const pool = new Pool({ connectionString: DATABASE_URL });
// process exits without pool.end()
```

**Why it breaks:**
Open connections prevent clean process exit. In tests, this causes hanging test runners.

**Fix:**
Always clean up in `afterAll` or process exit handlers:
```typescript
afterAll(async () => {
  await pool.end();
});
```

---

## Checklist Before Committing Code

- [ ] Does `strict: true` pass with no type errors?
- [ ] Are all imports using `.js` extensions (ESM projects)?
- [ ] Are all promises awaited or explicitly handled?
- [ ] Are error messages descriptive with context?
- [ ] Do all tests pass?
- [ ] Are there no `any` types without justifying comments?
- [ ] Are function parameters not being mutated?
