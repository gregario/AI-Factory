# First Deploy — Step-by-Step

A mechanical checklist to go from "code complete" to "live on the internet." Follow in order. Each step depends on the ones before it.

For background on any step, see the companion reference docs:
- [deployment.md](deployment.md) — Cloudflare Pages config, env vars, wrangler, workflows
- [supabase.md](supabase.md) — Client setup, RLS, migrations, local dev

---

## Prerequisites

Before starting, confirm:
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npx opennext build` succeeds locally
- [ ] All migrations exist in `supabase/migrations/`
- [ ] `wrangler.toml` exists with correct `name` and `pages_build_output_dir = ".worker"`

---

## 1. Create Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project.
2. Pick a region close to your users (or close to Cloudflare's edge — usually doesn't matter much).
3. Save the database password somewhere secure.
4. Once created, go to **Settings > API** and copy:
   - `Project URL` → this is your `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret` key → this is your `SUPABASE_SERVICE_ROLE_KEY`

## 2. Push Migrations to Supabase

```bash
# Link your local project to the remote Supabase project
supabase link --project-ref <project-id>

# Push all migrations
supabase db push

# Verify migrations applied
supabase migration list
```

Check the Supabase dashboard **Table Editor** to confirm tables exist and RLS is enabled on every table.

## 3. Configure Supabase Auth (if applicable)

1. **Dashboard > Authentication > URL Configuration:**
   - Set **Site URL** to your production URL (e.g., `https://my-app.com`).
   - Add redirect URLs: `https://my-app.com/callback`, `https://my-app.com/**`.
2. **Dashboard > Authentication > Providers:**
   - Enable any OAuth providers (GitHub, Google, etc.).
   - Add client ID and secret from each provider's developer console.

## 4. Connect Cloudflare Pages to GitHub

1. Go to **Cloudflare Dashboard > Workers & Pages > Create**.
2. Select **Connect to Git** and pick your GitHub repo.
3. Configure build settings:
   - **Build command:** `npx opennext build`
   - **Build output directory:** `.worker`
   - **Root directory:** `/` (unless monorepo)
4. Do NOT deploy yet — add env vars first (step 5).

## 5. Set Cloudflare Environment Variables

In **Cloudflare Dashboard > your project > Settings > Environment Variables**, add for **Production**:

| Variable | Value | Type |
|----------|-------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-id>.supabase.co` | Plain text |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Plain text |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | **Encrypted** |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | Plain text |
| `STRIPE_SECRET_KEY` | `sk_live_...` | **Encrypted** |
| `STRIPE_WEBHOOK_SECRET` | *(set after step 7)* | **Encrypted** |
| `NEXT_PUBLIC_APP_URL` | `https://my-app.com` | Plain text |

For **Preview** environment, use Stripe test keys (`pk_test_...`, `sk_test_...`) and optionally a separate Supabase project.

## 6. Trigger First Deploy

Push to `main` (or click "Retry deployment" in Cloudflare dashboard). Wait for the build to complete.

Verify the deployment at the default `<project>.pages.dev` URL:
- [ ] Page loads without errors
- [ ] No console errors in browser devtools
- [ ] Auth flow works (sign up, sign in, sign out)
- [ ] Supabase data loads correctly

## 7. Configure Stripe Webhook

1. Go to **Stripe Dashboard > Developers > Webhooks**.
2. Click **Add endpoint**.
3. Set URL to `https://my-app.com/api/webhooks/stripe` (or your webhook route).
4. Select events to listen to (at minimum: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`).
5. Copy the **Signing secret** (`whsec_...`).
6. Add it as `STRIPE_WEBHOOK_SECRET` in Cloudflare env vars (step 5).
7. Redeploy or wait for the next push — Cloudflare picks up new env vars on next build.

## 8. Add Custom Domain (Optional)

1. In **Cloudflare Dashboard > your project > Custom Domains**, add your domain.
2. If the domain is already on Cloudflare DNS, it auto-configures. Otherwise, update DNS records as instructed.
3. SSL is automatic — no action needed.
4. Update `NEXT_PUBLIC_APP_URL` in Cloudflare env vars to match the custom domain.
5. Update Supabase **Site URL** and **Redirect URLs** (step 3) to use the custom domain.
6. Update the Stripe webhook endpoint URL if you set it to the `.pages.dev` URL.

## 9. Set Up CI (Optional but Recommended)

Copy the CI workflow from the web-product template:

```bash
mkdir -p .github/workflows
cp <factory-root>/templates/web-product/.github/workflows/ci.yml .github/workflows/ci.yml
```

This runs lint, tests, and build verification on PRs before merge. Cloudflare still handles the actual deployment.

In GitHub repo **Settings > Branches**, add a branch protection rule for `main`:
- Require status checks to pass: select the `CI / Lint, Test & Build` check.
- Require branches to be up to date before merging.

## 10. Create Local .env.local

For local development, create `.env.local` (gitignored) with:

```bash
# Supabase — use local values from `supabase start` or remote project values
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase start output>
SUPABASE_SERVICE_ROLE_KEY=<from supabase start output>

# Stripe — always use test keys locally
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...  # from `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 11. Post-Deploy Verification

Run a quick smoke test against the production URL:

```
/qa --quick https://my-app.com
```

Check:
- [ ] Landing page loads
- [ ] Auth flows work (sign up, sign in, sign out)
- [ ] Protected pages redirect unauthenticated users
- [ ] Stripe checkout initiates correctly
- [ ] Webhook endpoint returns 200 (test with Stripe CLI: `stripe trigger checkout.session.completed`)
- [ ] No mixed content warnings (HTTP resources on HTTPS page)

---

## Troubleshooting

**Build fails on Cloudflare:**
- Check build logs in Cloudflare dashboard. Common cause: missing env vars that Next.js needs at build time (any `NEXT_PUBLIC_*` var).

**Auth callback fails:**
- Verify Supabase Site URL and Redirect URLs match your production URL exactly (including `https://`).

**Stripe webhook returns 400:**
- Verify `STRIPE_WEBHOOK_SECRET` matches the signing secret from the Stripe dashboard endpoint (not the CLI secret).
- Verify the webhook URL path matches your API route exactly.

**Supabase queries return empty:**
- Check RLS policies. A missing policy means zero rows returned, not an error.
- Use the Supabase dashboard SQL editor to query as `service_role` to confirm data exists.
