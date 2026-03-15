# Common Pitfalls — SaaS

Read this when debugging unexpected behaviour or reviewing SaaS project code. Starts lean and grows from experience.

---

## Pitfall 1: Using getSession() for Auth Checks

**What it looks like:**
```typescript
const { data: { session } } = await supabase.auth.getSession();
if (session) {
  // User is "authenticated"
}
```

**Why it breaks:**
`getSession()` reads from the local JWT without verifying it against Supabase Auth. A tampered or expired token still returns a session object. This is a security vulnerability in any server-side code.

**Fix:**
Use `getUser()` for all auth checks — it validates against the server:
```typescript
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  return new Response('Unauthorized', { status: 401 });
}
```

---

## Pitfall 2: Parsing Webhook Body as JSON Before Signature Verification

**What it looks like:**
```typescript
export async function POST(req: Request) {
  const body = await req.json(); // BAD
  const event = stripe.webhooks.constructEvent(body, signature, secret);
}
```

**Why it breaks:**
`constructEvent()` needs the raw request body as a string to verify the HMAC signature. Parsing it as JSON first changes the string representation, and the signature check fails with "No signatures found matching the expected signature for payload."

**Fix:**
Use `req.text()` to get the raw body:
```typescript
const body = await req.text();
const event = stripe.webhooks.constructEvent(body, signature, secret);
```

---

## Pitfall 3: Missing RLS Policies on New Tables

**What it looks like:**
You create a new table, insert data via the service role client, and everything works. Then the browser client returns empty results.

**Why it breaks:**
RLS is enabled by default on Supabase tables, but new tables have no policies. No policies means no access — `SELECT` returns nothing, `INSERT`/`UPDATE`/`DELETE` silently fail.

**Fix:**
Always create RLS policies alongside new tables:
```sql
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_data" ON my_table
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

Test RLS policies explicitly in your test suite.

---

## Pitfall 4: Supabase Free Tier Pausing

**What it looks like:**
Your app works fine during development. You leave it alone for a week. Then it stops responding with connection errors.

**Why it breaks:**
Supabase free tier projects pause after 7 days of inactivity. There's no warning. The project must be manually unpaused from the dashboard.

**Fix:**
- During validation: accept it. You're actively developing, so it won't pause.
- Before going live with paying customers: upgrade to Supabase Pro ($25/mo).
- Don't use the GitHub Actions cron ping hack for production apps. It's unreliable and masks the real issue.

---

## Pitfall 5: Exposing Service Role Key to the Browser

**What it looks like:**
```typescript
// In a client component
const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!);
```

**Why it breaks:**
The service role key bypasses all Row Level Security. Anyone with browser dev tools can extract it and have full read/write access to your entire database.

**Fix:**
- Client code uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` only.
- Service role key is used only in server-side code (API routes, webhooks, Server Actions).
- The `NEXT_PUBLIC_` prefix is your signal: if a key doesn't have it, it must never appear in client code.

---

## Pitfall 6: Workers Runtime Missing Node.js APIs

**What it looks like:**
```
Error: crypto.randomBytes is not a function
Error: Buffer is not defined
Error: Cannot find module 'fs'
```

**Why it breaks:**
Cloudflare Workers use the V8 JavaScript runtime, not Node.js. Many Node.js built-in modules (`fs`, `path`, `crypto`, `net`) don't exist or have limited compatibility. Dependencies that rely on these APIs fail at runtime.

**Fix:**
- Use Web APIs instead of Node.js APIs: `crypto.getRandomValues()` instead of `crypto.randomBytes()`, `fetch()` instead of `http.request()`.
- Check the [Cloudflare Workers Node.js compatibility list](https://developers.cloudflare.com/workers/runtime-apis/nodejs/).
- Set `node_compat = true` in `wrangler.toml` for polyfilled Node.js APIs (limited coverage).
- If a dependency truly needs Node.js, it must run on a traditional server (Railway), not Workers.

---

## Pitfall 7: Not Handling Stripe Webhook Idempotency

**What it looks like:**
A customer gets double-charged, or their subscription is provisioned twice.

**Why it breaks:**
Stripe retries failed webhooks. If your handler isn't idempotent, the same event is processed multiple times. Network issues, timeouts, and 5xx responses all trigger retries.

**Fix:**
- Store the `event.id` in the database and check for duplicates before processing.
- Use upsert operations instead of insert where possible.
- Design handlers so that processing the same event twice produces the same result.

```typescript
// Check for duplicate
const { data: existing } = await supabase
  .from('webhook_events')
  .select('id')
  .eq('stripe_event_id', event.id)
  .single();

if (existing) return new Response('Already processed', { status: 200 });

// Process and record
await supabase.from('webhook_events').insert({ stripe_event_id: event.id });
```

---

## Pitfall 8: Forgetting to Set CORS Headers on API Routes

**What it looks like:**
API calls from the browser fail with "CORS policy: No 'Access-Control-Allow-Origin' header."

**Why it breaks:**
Next.js API routes on Cloudflare Workers don't automatically set CORS headers. If your frontend and API are on different origins (or during local dev), the browser blocks the request.

**Fix:**
Most of the time, use Server Actions or same-origin API routes and you won't need CORS at all. If you do need cross-origin access:

```typescript
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL!,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
```

Never use `Access-Control-Allow-Origin: *` in production.

---

## Pitfall 9: Hardcoding Stripe Price IDs

**What it looks like:**
```typescript
const session = await stripe.checkout.sessions.create({
  line_items: [{ price: 'price_1234567890', quantity: 1 }],
});
```

**Why it breaks:**
Price IDs differ between Stripe test mode and live mode. Hardcoding them means your code only works in one environment. When you switch to live mode, checkout breaks silently.

**Fix:**
Store price IDs in environment variables:
```typescript
const priceId = requireEnv('STRIPE_PRICE_ID');
const session = await stripe.checkout.sessions.create({
  line_items: [{ price: priceId, quantity: 1 }],
});
```

Or use a config mapping:
```typescript
const PLANS = {
  pro: { priceId: requireEnv('STRIPE_PRO_PRICE_ID'), name: 'Pro' },
  team: { priceId: requireEnv('STRIPE_TEAM_PRICE_ID'), name: 'Team' },
} as const;
```

---

## Pitfall 10: Supabase Bandwidth Exhaustion

**What it looks like:**
API calls start returning errors mid-month. The Supabase dashboard shows bandwidth at 100%.

**Why it breaks:**
Supabase free tier allows 5GB egress/month. With 500 DAU making 20 API calls each with ~1KB responses, that's ~300MB/day. You burn through 5GB in about 17 days. Images or file storage make this worse.

**Fix:**
- Monitor bandwidth in the Supabase dashboard weekly.
- Budget for Supabase Pro ($25/mo, 250GB bandwidth) from the moment you have real traffic.
- Cache aggressively on the Cloudflare side (Workers KV, Cache API).
- Serve static assets from Cloudflare Pages (unlimited bandwidth), not Supabase Storage.

---

## Checklist Before Deploying

- [ ] All auth checks use `getUser()`, not `getSession()`
- [ ] No `SUPABASE_SERVICE_ROLE_KEY` in client-accessible code
- [ ] RLS policies exist for every table
- [ ] RLS policies are tested
- [ ] Stripe webhook signature verification is in place
- [ ] Webhook handler is idempotent
- [ ] Price IDs come from environment variables
- [ ] `.env.example` lists all required variables
- [ ] `wrangler.toml` has correct bindings
- [ ] All Node.js APIs used are Workers-compatible
