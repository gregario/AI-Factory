# Coding Standards — SaaS

Extends `stacks/typescript/coding_standards.md`. This covers SaaS-specific standards only.

---

## Environment Variables

**Never hardcode secrets. Never commit `.env` files.**

All secrets go in environment variables. The project includes a `.env.example` with every required key (values blank or set to test-mode defaults).

```bash
# .env.example
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

**Prefix rules:**
- `NEXT_PUBLIC_` — exposed to the browser. Only use for truly public values (Supabase URL, Stripe publishable key).
- No prefix — server-only. Never expose service role keys or Stripe secret keys to the client.

**Validate at startup.** Don't wait for the first request to discover a missing key:

```typescript
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const stripeSecretKey = requireEnv('STRIPE_SECRET_KEY');
```

---

## Supabase Client Patterns

**Two clients, two purposes.** Never mix them.

```typescript
// Browser client — uses anon key, respects RLS
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// Server client — uses service role key, bypasses RLS
// ONLY use in API routes, webhooks, and server actions
import { createClient as createServiceClient } from '@supabase/supabase-js';

export function createAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
```

**Never use the service role client in browser-accessible code.** It bypasses Row Level Security and has full database access.

---

## API Route Handlers

**Verify auth in every protected route.**

```typescript
// app/api/example/route.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // User is authenticated, proceed
}
```

**Always use `getUser()`, not `getSession()`** for auth checks. `getSession()` reads from the JWT without server verification. `getUser()` validates against Supabase Auth.

---

## Stripe Webhook Security

**Always verify webhook signatures.**

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return new Response('Missing signature', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    return new Response('Invalid signature', { status: 400 });
  }

  // Process event
}
```

**Use `req.text()`, not `req.json()`** for webhook bodies. Signature verification requires the raw string body.

---

## Database Queries

**Use Supabase client queries, not raw SQL, for application code.**

```typescript
// Good — uses RLS, type-safe with generated types
const { data, error } = await supabase
  .from('projects')
  .select('id, name, created_at')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false });

if (error) throw new Error(`Failed to fetch projects: ${error.message}`);
```

**Use raw SQL only for migrations and complex queries** that the Supabase client can't express.

**Generate TypeScript types from your database schema:**

```bash
npx supabase gen types typescript --local > src/lib/database.types.ts
```

Then use them with the client:

```typescript
import type { Database } from '@/lib/database.types';

const supabase = createClient<Database>(url, key);
// Now .from('projects').select() returns typed results
```

---

## Server Actions

**Prefer Server Actions over API routes for form submissions and mutations.**

```typescript
// app/actions.ts
'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function createProject(formData: FormData) {
  const cookieStore = await cookies();
  const supabase = createServerClient(/* ... */);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const name = formData.get('name') as string;
  if (!name?.trim()) throw new Error('Name is required');

  const { error } = await supabase
    .from('projects')
    .insert({ name: name.trim(), user_id: user.id });

  if (error) throw new Error(`Failed to create project: ${error.message}`);

  revalidatePath('/dashboard');
}
```

**Always validate inputs in Server Actions.** They're publicly callable endpoints — treat them like API routes.

---

## Error Handling

**User-facing errors should be helpful. Internal errors should be logged.**

```typescript
// Good — user sees a helpful message, details are logged
try {
  await processPayment(sessionId);
} catch (err) {
  console.error('Payment processing failed:', err);
  return { error: 'Payment could not be processed. Please try again.' };
}
```

**Never expose internal error details to users.** Database errors, stack traces, and Stripe API errors stay server-side.

---

## File Naming

Follow the Next.js App Router conventions:

| File | Purpose |
|------|---------|
| `page.tsx` | Route page component |
| `layout.tsx` | Shared layout wrapper |
| `loading.tsx` | Loading UI (Suspense boundary) |
| `error.tsx` | Error boundary |
| `route.ts` | API route handler |
| `actions.ts` | Server Actions |

Components use PascalCase: `ProjectCard.tsx`, `PricingTable.tsx`.
Utilities use camelCase: `stripe.ts`, `supabase.ts`.
