# Testing — Next.js

Extends `stacks/typescript/testing.md`. This covers Next.js-specific testing patterns only.

---

## Test Stack

| Tool | Purpose |
|------|---------|
| **Vitest** | Unit and integration tests (components, Server Actions, utilities) |
| **React Testing Library** | Component rendering and interaction assertions |
| **Playwright** | End-to-end tests (full browser, real HTTP) |

Use Vitest for everything that doesn't need a real browser. Use Playwright for critical user flows.

---

## Vitest Setup

```json
// package.json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

```typescript
// tests/setup.ts
import '@testing-library/jest-dom/vitest';
```

---

## Testing Server Components

Server Components are async functions that return JSX. Test them by calling the function directly — no rendering library needed for pure data-to-markup tests.

```tsx
import { describe, it, expect, vi } from 'vitest';
import PostList from '@/app/posts/page';

vi.mock('@/lib/db', () => ({
  getPosts: vi.fn().mockResolvedValue([
    { id: '1', title: 'First Post' },
    { id: '2', title: 'Second Post' },
  ]),
}));

describe('PostList', () => {
  it('renders posts from the database', async () => {
    const result = await PostList();
    // Assert on the returned JSX structure
    expect(result).toBeTruthy();
  });
});
```

For Server Components that need rendering assertions, use React Testing Library with the async component:

```tsx
import { render, screen } from '@testing-library/react';

describe('PostList', () => {
  it('displays post titles', async () => {
    const Component = await PostList();
    render(Component);
    expect(screen.getByText('First Post')).toBeInTheDocument();
  });
});
```

---

## Testing Client Components

Standard React Testing Library patterns. These are interactive components with `'use client'`.

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Counter } from '@/components/Counter';

describe('Counter', () => {
  it('increments on click', () => {
    render(<Counter />);
    const button = screen.getByRole('button');

    expect(button).toHaveTextContent('0');
    fireEvent.click(button);
    expect(button).toHaveTextContent('1');
  });
});
```

---

## Testing Server Actions

Server Actions are async functions. Test them as plain functions — mock the database layer and verify side effects.

```tsx
import { describe, it, expect, vi } from 'vitest';
import { addItem } from '@/app/actions/cart';

vi.mock('@/lib/db', () => ({
  cart: {
    add: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('addItem', () => {
  it('adds a valid item to the cart', async () => {
    const formData = new FormData();
    formData.set('productId', '550e8400-e29b-41d4-a716-446655440000');
    formData.set('quantity', '2');

    const result = await addItem(formData);

    expect(result).toBeUndefined(); // no error returned
    const { cart } = await import('@/lib/db');
    expect(cart.add).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
      2,
    );
  });

  it('returns error for invalid input', async () => {
    const formData = new FormData();
    formData.set('productId', 'not-a-uuid');
    formData.set('quantity', '-1');

    const result = await addItem(formData);

    expect(result).toEqual({ error: 'Invalid input' });
  });
});
```

---

## Testing Route Handlers

Route Handlers are plain request/response functions. Test them by constructing a `NextRequest` and asserting on the response.

```tsx
import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/webhook/route';
import { NextRequest } from 'next/server';

describe('POST /api/webhook', () => {
  it('rejects invalid signatures', async () => {
    const request = new NextRequest('http://localhost/api/webhook', {
      method: 'POST',
      body: JSON.stringify({ event: 'test' }),
      headers: { 'x-webhook-signature': 'invalid' },
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});
```

---

## Testing Middleware

Test middleware by constructing requests and asserting on the response (redirect, rewrite, or passthrough).

```tsx
import { describe, it, expect } from 'vitest';
import { middleware } from '@/middleware';
import { NextRequest } from 'next/server';

describe('middleware', () => {
  it('redirects unauthenticated users from /dashboard', () => {
    const request = new NextRequest('http://localhost/dashboard');
    // No session cookie set

    const response = middleware(request);
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/login');
  });

  it('allows authenticated users through', () => {
    const request = new NextRequest('http://localhost/dashboard');
    request.cookies.set('session', 'valid-token');

    const response = middleware(request);
    expect(response.headers.get('location')).toBeNull();
  });
});
```

---

## End-to-End Tests with Playwright

Use Playwright for critical user journeys. Run against the full Next.js dev or production server.

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://localhost:3000',
  },
});
```

```typescript
// e2e/checkout.spec.ts
import { test, expect } from '@playwright/test';

test('user can add item to cart and checkout', async ({ page }) => {
  await page.goto('/products');
  await page.click('text=Add to Cart');
  await page.goto('/cart');

  await expect(page.locator('[data-testid="cart-count"]')).toHaveText('1');

  await page.click('text=Checkout');
  await expect(page).toHaveURL('/checkout');
});
```

---

## What to Test

### Always test
- Server Actions with valid and invalid inputs
- Client Components with user interactions
- Route Handlers for webhooks and external API endpoints
- Middleware auth guards and redirects
- Critical E2E user flows (signup, checkout, core workflows)

### Skip testing
- Next.js framework internals (routing, caching, bundling)
- Static page rendering (if the content is just markup with no logic)
- `next/image` or `next/font` optimizations (those are Next.js's job)
- Layout files that are pure wrappers with no logic

---

## Mocking Next.js APIs

Common mocks needed in Vitest:

```typescript
// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: vi.fn(),
    set: vi.fn(),
  }),
  headers: () => new Headers(),
}));
```

---

## CI Pipeline

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run build
      - run: npm test

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm run test:e2e
```

Separate unit/integration tests from E2E tests. Unit tests are fast and run on every push. E2E tests are slower and may run only on PRs or specific branches.
