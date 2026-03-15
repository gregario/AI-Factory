# Testing — SaaS

Extends `stacks/typescript/testing.md`. This covers SaaS-specific testing patterns only.

---

## Test Runner

Use **Vitest** for all backend and integration testing. It has native ESM and TypeScript support with zero config.

```json
// package.json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

> Browser/UI testing is handled by the `stacks/browser-qa/` stack (Playwright). That's a separate test suite that runs independently in CI.

---

## Testing Layers

SaaS projects have four distinct testing layers. Each has its own tools and trade-offs.

### 1. Unit Tests (Vitest)

Pure business logic, validators, transformers, utility functions.

```typescript
import { describe, it, expect } from 'vitest';
import { calculateTrialEnd, isTrialExpired } from '../src/lib/billing.js';

describe('trial calculations', () => {
  it('calculates trial end as 14 days from start', () => {
    const start = new Date('2026-01-01');
    const end = calculateTrialEnd(start);
    expect(end).toEqual(new Date('2026-01-15'));
  });

  it('detects expired trial', () => {
    const expired = new Date('2025-01-01');
    expect(isTrialExpired(expired)).toBe(true);
  });
});
```

### 2. Database Tests (Vitest + Supabase Local)

Test RLS policies, migrations, and database queries against a real local Postgres.

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('RLS policies', () => {
  let adminClient: ReturnType<typeof createClient>;
  let userClient: ReturnType<typeof createClient>;

  beforeAll(async () => {
    // Admin client bypasses RLS
    adminClient = createClient(
      'http://127.0.0.1:54321',
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Seed test data
    await adminClient.from('projects').insert([
      { id: 'p1', user_id: 'user-a', name: 'Project A' },
      { id: 'p2', user_id: 'user-b', name: 'Project B' },
    ]);

    // User client respects RLS — impersonate user-a
    userClient = createClient(
      'http://127.0.0.1:54321',
      process.env.SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${userAToken}` } } },
    );
  });

  it('user can only see their own projects', async () => {
    const { data } = await userClient.from('projects').select('*');
    expect(data).toHaveLength(1);
    expect(data![0].name).toBe('Project A');
  });

  afterAll(async () => {
    await adminClient.from('projects').delete().neq('id', '');
  });
});
```

**Run Supabase locally before database tests:**
```bash
supabase start   # Starts local Postgres, Auth, Storage, etc.
supabase db reset # Apply migrations and seed data
```

### 3. Stripe Tests (Vitest + Stripe Test Mode)

Test webhook handlers and checkout flows using Stripe's test mode.

```typescript
import { describe, it, expect } from 'vitest';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!); // test mode key (sk_test_...)

describe('checkout flow', () => {
  it('creates a checkout session for a price', async () => {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: 'price_test_123', quantity: 1 }],
      success_url: 'http://localhost:3000/success',
      cancel_url: 'http://localhost:3000/cancel',
    });

    expect(session.url).toBeTruthy();
    expect(session.mode).toBe('subscription');
  });
});
```

**Test webhook handling with fixture events:**

```typescript
import { describe, it, expect } from 'vitest';
import { handleWebhookEvent } from '../src/lib/stripe-webhooks.js';

describe('webhook handler', () => {
  it('provisions access on checkout.session.completed', async () => {
    const event: Stripe.Event = {
      id: 'evt_test_123',
      type: 'checkout.session.completed',
      data: {
        object: {
          customer: 'cus_test_123',
          subscription: 'sub_test_123',
          metadata: { user_id: 'user-a' },
        } as Stripe.Checkout.Session,
      },
    } as Stripe.Event;

    await handleWebhookEvent(event);

    // Verify the user's subscription was provisioned in the database
    const { data } = await adminClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', 'user-a')
      .single();

    expect(data?.stripe_subscription_id).toBe('sub_test_123');
    expect(data?.status).toBe('active');
  });
});
```

### 4. Workers Tests (Miniflare)

Test Cloudflare Workers logic locally using Miniflare.

```typescript
import { describe, it, expect } from 'vitest';
import { Miniflare } from 'miniflare';

describe('worker', () => {
  let mf: Miniflare;

  beforeAll(async () => {
    mf = new Miniflare({
      scriptPath: './dist/worker.js',
      modules: true,
      bindings: {
        ENVIRONMENT: 'test',
      },
    });
  });

  it('responds to health check', async () => {
    const res = await mf.dispatchFetch('http://localhost/api/health');
    expect(res.status).toBe(200);
  });

  afterAll(async () => {
    await mf.dispose();
  });
});
```

---

## What to Test

### Always test
- **RLS policies** — verify users can only access their own data
- **Webhook handlers** — every event type your app processes
- **Subscription state transitions** — create, upgrade, downgrade, cancel, expire
- **Auth flows** — sign up, sign in, password reset, token refresh
- **Billing calculations** — trial periods, proration, usage metering
- **Server Actions** — input validation, auth checks, error paths

### Skip testing
- Supabase Auth internals (Supabase tests their own code)
- Stripe API behaviour (Stripe tests their own code)
- Next.js rendering (that's the browser-qa stack's job)
- Cloudflare's edge network behaviour

---

## Mocking Guidelines

**Mock at external service boundaries:**

```typescript
import { vi } from 'vitest';

// Mock Stripe for unit tests that don't need real API calls
vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({ id: 'cs_test_123', url: 'https://checkout.stripe.com/test' }),
      },
    },
  })),
}));
```

**Don't mock Supabase when you can use `supabase start`.** The local instance is fast and tests real SQL + RLS. Mock only when testing code that doesn't need a database.

**Don't mock Stripe when testing webhook handlers.** Use fixture events (construct the event object directly) instead of mocking the Stripe SDK.

---

## CI Pipeline

```yaml
# .github/workflows/test.yml
name: Test
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npx supabase start
      - run: npm run build
      - run: npm test
    env:
      NEXT_PUBLIC_SUPABASE_URL: http://127.0.0.1:54321
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
      STRIPE_SECRET_KEY: ${{ secrets.STRIPE_TEST_SECRET_KEY }}
      STRIPE_WEBHOOK_SECRET: ${{ secrets.STRIPE_TEST_WEBHOOK_SECRET }}

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npx tsc --noEmit
```

**Two separate jobs:** `test` (runs tests, needs Supabase) and `typecheck` (fast, no infrastructure). Both must pass before merging.

---

## Local Dev Testing Workflow

```bash
# Terminal 1: Start Supabase locally
supabase start

# Terminal 2: Forward Stripe webhooks
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Terminal 3: Run the dev server
npm run dev

# Terminal 4: Run tests in watch mode
npm run test:watch
```

The Stripe CLI prints a webhook signing secret when it starts. Use that as `STRIPE_WEBHOOK_SECRET` in your `.env.local`.
