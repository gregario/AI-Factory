# Project Structure — SaaS

Extends `stacks/typescript/project_structure.md`. This covers SaaS-specific structure only.

---

## Standard SaaS Project Layout

```
my-saas-app/
  src/
    app/                    # Next.js App Router
      (auth)/               # Auth route group (sign-in, sign-up, callback)
        sign-in/page.tsx
        sign-up/page.tsx
        callback/route.ts   # Supabase auth callback handler
      (dashboard)/          # Protected route group
        dashboard/page.tsx
        settings/page.tsx
        billing/page.tsx
      api/
        webhooks/
          stripe/route.ts   # Stripe webhook handler
        health/route.ts     # Health check endpoint
      layout.tsx            # Root layout (auth provider, theme)
      page.tsx              # Landing page
      actions.ts            # Server Actions
    components/
      ui/                   # Generic UI primitives (Button, Card, Input)
      features/             # Feature-specific components
    lib/
      supabase/
        client.ts           # Browser Supabase client
        server.ts           # Server Supabase client (cookies-based)
        admin.ts            # Service role client (webhooks, cron)
        middleware.ts        # Auth middleware helper
      stripe/
        client.ts           # Stripe SDK initialization
        webhooks.ts          # Webhook event handler logic
        checkout.ts          # Checkout session creation
        portal.ts            # Customer portal session creation
      types.ts              # Shared application types
      database.types.ts     # Generated from Supabase schema (gitignored, regenerated)
      constants.ts          # App-wide constants
  supabase/
    migrations/             # SQL migration files (sequential, timestamped)
      20260315000000_create_users_table.sql
      20260315000001_create_subscriptions_table.sql
    seed.sql                # Development seed data
    config.toml             # Supabase local dev configuration
  tests/
    setup.ts                # Test helpers, database seeding
    lib/                    # Unit tests for lib/
    webhooks/               # Webhook handler tests
    rls/                    # RLS policy tests
  public/                   # Static assets
  wrangler.toml             # Cloudflare Workers/Pages configuration
  open-next.config.ts       # OpenNext adapter configuration
  .env.example              # All required env vars (no values)
  .env.local                # Local dev values (gitignored)
  package.json
  tsconfig.json
  vitest.config.ts
  next.config.ts
```

---

## Key Conventions

**Route groups for auth boundaries.**
Use Next.js route groups `(auth)` and `(dashboard)` to separate public and protected pages. The parentheses keep them out of the URL path.

**`lib/` is organized by service, not by technical role.**
`lib/supabase/` contains all Supabase client code. `lib/stripe/` contains all Stripe code. Don't scatter these across `utils/`, `helpers/`, `services/` — one folder per external service.

**`supabase/` at the project root for database concerns.**
Migrations, seed data, and Supabase CLI config live here. This directory is managed by `supabase` CLI commands, not manually.

**Tests mirror the `lib/` structure.**
Tests for `lib/stripe/webhooks.ts` live in `tests/webhooks/`. RLS policy tests get their own directory because they're a distinct testing concern.

---

## Database Migrations

Migrations are SQL files in `supabase/migrations/`. Create them with the Supabase CLI:

```bash
# Create a new migration
supabase migration new create_projects_table

# This creates supabase/migrations/<timestamp>_create_projects_table.sql
```

**Migration rules:**
- One concern per migration (one table, one policy change, one index)
- Migrations are append-only in production — never edit a deployed migration
- Include `IF NOT EXISTS` and `IF EXISTS` guards for safety
- Always include the reverse operation as a comment for reference

```sql
-- supabase/migrations/20260315000000_create_projects_table.sql

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Users can only see their own projects
CREATE POLICY "users_own_projects" ON projects
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Reverse: DROP TABLE IF EXISTS projects;
```

---

## Subscriptions Table Pattern

Every SaaS project needs a subscriptions table that syncs with Stripe:

```sql
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  status TEXT NOT NULL DEFAULT 'inactive',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
CREATE POLICY "users_read_own_subscription" ON subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can write (via webhooks)
-- No INSERT/UPDATE/DELETE policy for anon/authenticated roles
```

**Stripe is the source of truth for subscription state.** The database is a cache. Webhook handlers update it. Never modify subscription state directly in the database.

---

## Environment Files

```
.env.example       # Committed — documents all required variables
.env.local         # Gitignored — local development values
.env.production    # Never exists locally — set in Cloudflare dashboard
```

**`.env.example` is documentation.** It lists every variable the app needs with comments explaining each one. No real values.

```bash
# .env.example

# Supabase (get from supabase.com/dashboard or `supabase status` for local)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe (get from dashboard.stripe.com/apikeys)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## package.json Essentials

```json
{
  "name": "my-saas-app",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "db:reset": "supabase db reset",
    "db:types": "supabase gen types typescript --local > src/lib/database.types.ts",
    "stripe:listen": "stripe listen --forward-to localhost:3000/api/webhooks/stripe"
  },
  "dependencies": {
    "next": "^15",
    "react": "^19",
    "react-dom": "^19",
    "@supabase/ssr": "^0.5",
    "@supabase/supabase-js": "^2",
    "stripe": "^17"
  },
  "devDependencies": {
    "@types/node": "^22",
    "@types/react": "^19",
    "typescript": "^5.7",
    "vitest": "^3",
    "@opennextjs/cloudflare": "^1"
  }
}
```

---

## tsconfig.json

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] },
    "outDir": "dist",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules", "dist", ".next"]
}
```

Note: Next.js uses bundler module resolution, not NodeNext. This is the one override from the TypeScript stack's default tsconfig.
