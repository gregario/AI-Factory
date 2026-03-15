# Supabase — SaaS

Client initialization, auth hooks, RLS policies, and local development with `supabase start`.

---

## Client Initialization

Three client types for three contexts. Never mix them.

### Browser Client

Used in Client Components. Respects RLS. Uses the anon key.

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/database.types';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

### Server Client

Used in Server Components, Server Actions, and Route Handlers. Respects RLS. Uses cookies for auth context.

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/database.types';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    },
  );
}
```

### Admin Client

Used in webhooks and background jobs. Bypasses RLS. Uses the service role key.

```typescript
// src/lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
```

**When to use which:**

| Context | Client | RLS | Auth |
|---------|--------|-----|------|
| Client Component | `createBrowserClient` | Yes | Cookie-based |
| Server Component / Action | `createServerClient` | Yes | Cookie-based |
| Webhook / Background job | `createClient` (admin) | Bypassed | Service role key |

---

## Auth Hooks

### Middleware for Session Refresh

Supabase Auth uses JWTs stored in cookies. The middleware refreshes expired tokens on every request.

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value, options } of cookiesToSet) {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Refresh the session — this is the main purpose of this middleware
  await supabase.auth.getUser();

  return res;
}

export const config = {
  matcher: [
    // Match all routes except static files and _next
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

### Auth Callback Route

Handles the redirect after OAuth or magic link sign-in:

```typescript
// src/app/(auth)/callback/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth failed — redirect to error page
  return NextResponse.redirect(`${origin}/sign-in?error=auth_failed`);
}
```

### Sign In / Sign Up

```typescript
// Server Action for email/password sign-in
'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  });

  if (error) {
    return { error: error.message };
  }

  redirect('/dashboard');
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: 'Check your email for a confirmation link.' };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
```

### OAuth Providers

```typescript
export async function signInWithGitHub() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/callback`,
    },
  });

  if (error) return { error: error.message };
  redirect(data.url);
}
```

Enable providers in Supabase Dashboard > Authentication > Providers.

---

## Row Level Security (RLS)

RLS is the primary access control mechanism. Every table must have RLS enabled and policies defined.

### Policy Patterns

**User owns rows:**
```sql
-- Users can CRUD their own data
CREATE POLICY "users_own_data" ON projects
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**Read-only for authenticated users:**
```sql
-- Any authenticated user can read, no one can write via API
CREATE POLICY "authenticated_read" ON plans
  FOR SELECT
  TO authenticated
  USING (true);
```

**Public read, owner write:**
```sql
-- Anyone can read, only owner can modify
CREATE POLICY "public_read" ON profiles
  FOR SELECT
  USING (true);

CREATE POLICY "owner_write" ON profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**Service role only (webhooks):**
```sql
-- No policy for anon/authenticated = no access via client
-- Service role key bypasses RLS entirely
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Only allow users to read their own subscription
CREATE POLICY "users_read_own" ON subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT/UPDATE/DELETE handled by service role in webhook handlers
```

### Policy Rules

1. **Enable RLS on every table.** No exceptions.
2. **Separate SELECT from INSERT/UPDATE/DELETE.** Read and write access often have different rules.
3. **Use `auth.uid()`** to reference the authenticated user's ID.
4. **`USING` controls which rows are visible.** `WITH CHECK` controls which rows can be inserted/updated.
5. **Test every policy.** A missing policy means silent data loss or leakage.

### Testing RLS Policies

```typescript
// tests/rls/projects.test.ts
describe('projects RLS', () => {
  it('user cannot read another user\'s projects', async () => {
    // Insert as admin (bypasses RLS)
    await adminClient.from('projects').insert({
      user_id: 'other-user',
      name: 'Secret Project',
    });

    // Query as user-a (respects RLS)
    const { data } = await userAClient.from('projects').select('*');

    // user-a should not see other-user's project
    const names = data?.map(p => p.name) ?? [];
    expect(names).not.toContain('Secret Project');
  });

  it('user cannot delete another user\'s project', async () => {
    const { error } = await userAClient
      .from('projects')
      .delete()
      .eq('user_id', 'other-user');

    // Delete "succeeds" but affects 0 rows (RLS filters it out)
    // Verify the row still exists
    const { data } = await adminClient
      .from('projects')
      .select('*')
      .eq('user_id', 'other-user');

    expect(data).toHaveLength(1);
  });
});
```

---

## Local Development

### Starting Supabase Locally

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Initialize (one time, creates supabase/ directory)
supabase init

# Start all services (Postgres, Auth, Storage, Realtime, etc.)
supabase start
```

`supabase start` prints connection details:

```
API URL: http://127.0.0.1:54321
GraphQL URL: http://127.0.0.1:54321/graphql/v1
S3 Storage URL: http://127.0.0.1:54321/storage/v1/s3
DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio URL: http://127.0.0.1:54323
Inbucket URL: http://127.0.0.1:54324
anon key: eyJ...
service_role key: eyJ...
```

Copy the `anon key` and `service_role key` into `.env.local`.

### Local Studio

Supabase Studio runs at `http://127.0.0.1:54323`. Use it to:
- Browse and edit data
- Run SQL queries
- Inspect RLS policies
- Manage auth users

### Migrations Workflow

```bash
# Create a new migration
supabase migration new add_projects_table

# Edit the SQL file in supabase/migrations/

# Apply migrations to local database
supabase db reset

# Generate TypeScript types from local schema
supabase gen types typescript --local > src/lib/database.types.ts
```

**Always generate types after changing the schema.** The generated types keep your Supabase client calls type-safe.

### Seed Data

```sql
-- supabase/seed.sql
-- Runs automatically on `supabase db reset`

INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-000000000001', 'test@example.com');

INSERT INTO projects (user_id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test Project');
```

### Stopping and Resetting

```bash
# Stop all services (preserves data)
supabase stop

# Reset database (re-runs migrations + seed)
supabase db reset

# Stop and remove all data
supabase stop --no-backup
```

---

## Deploying to Supabase Cloud

### Project Setup

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Copy the project URL and keys into your production environment variables.
3. Push local migrations to the remote project:

```bash
supabase link --project-ref <project-id>
supabase db push
```

### Migration Deployment

```bash
# Push pending migrations to production
supabase db push

# Check migration status
supabase migration list
```

**Never run `db reset` on production.** It drops and recreates the entire database.

### Free Tier Limits

| Resource | Free Limit |
|----------|-----------|
| Database size | 500 MB |
| Bandwidth | 5 GB / month |
| Auth MAUs | 50,000 |
| Storage | 1 GB |
| Edge Functions | 500K invocations / month |
| Realtime | 200 concurrent connections |
| Inactivity pause | After 7 days |

Plan for Supabase Pro ($25/mo) before going live with paying customers.
