# Deployment — SaaS

Cloudflare Pages/Workers setup, OpenNext configuration, preview deploys, and environment variables.

---

## OpenNext Configuration

Next.js runs on Cloudflare via the OpenNext adapter. This translates Next.js's server-side features (SSR, ISR, Server Actions, middleware) into Cloudflare Workers.

### Initial Setup

```bash
npm install -D @opennextjs/cloudflare
```

```typescript
// open-next.config.ts
import type { OpenNextConfig } from '@opennextjs/cloudflare';

const config: OpenNextConfig = {
  default: {
    override: {
      wrapper: 'cloudflare-node',
      converter: 'edge',
    },
  },
};

export default config;
```

### Build Command

```bash
npx opennext build
```

This produces a `.worker` directory that Cloudflare Pages deploys as a Worker.

---

## wrangler.toml

The `wrangler.toml` configures Cloudflare Workers bindings, compatibility settings, and environment variables.

```toml
# wrangler.toml
name = "my-saas-app"
compatibility_date = "2025-12-01"
compatibility_flags = ["nodejs_compat"]

# Pages project — deployed via Cloudflare Pages
pages_build_output_dir = ".worker"

# Environment variables (non-secret, committed)
[vars]
ENVIRONMENT = "production"

# KV namespace for caching (optional)
# [[kv_namespaces]]
# binding = "CACHE"
# id = "abc123"

# Workflows (optional)
# [[workflows]]
# name = "process-payment"
# binding = "PAYMENT_WORKFLOW"
# class_name = "PaymentWorkflow"
# script_name = "my-saas-app"
```

**Secrets are NOT stored in wrangler.toml.** Use the Cloudflare dashboard or CLI:

```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
```

---

## Cloudflare Pages Setup

### Connect to GitHub

1. Go to Cloudflare Dashboard > Workers & Pages > Create.
2. Connect your GitHub repository.
3. Set build command: `npx opennext build`
4. Set build output directory: `.worker`
5. Add environment variables (see below).

### Auto-Deploy on Push

Cloudflare Pages auto-deploys on push to `main`. No GitHub Action needed for deployment. This is the default and should not be overridden.

### Preview Deployments

Every push to a non-main branch gets a preview deployment at `<hash>.<project>.pages.dev`. Every PR gets a preview at `<branch>.<project>.pages.dev`.

**Preview deploys are free and automatic.** Use them for QA before merging. Share preview URLs in PR descriptions.

**Preview environment variables:** Set these in the Cloudflare dashboard under Settings > Environment Variables > Preview. Use Stripe test mode keys and a separate Supabase project (or the same project with test data).

---

## Environment Variables

### Where to set them

| Environment | Where |
|------------|-------|
| Local dev | `.env.local` (gitignored) |
| Preview deploys | Cloudflare dashboard: Settings > Environment Variables > Preview |
| Production | Cloudflare dashboard: Settings > Environment Variables > Production |
| Secrets (any env) | `wrangler secret put <KEY>` or Cloudflare dashboard (encrypted) |

### Required Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # SECRET — never in client code

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...              # SECRET
STRIPE_WEBHOOK_SECRET=whsec_...            # SECRET

# App
NEXT_PUBLIC_APP_URL=https://my-app.com     # Used for redirects, CORS
```

### Test vs Live Keys

| Variable | Test Mode | Live Mode |
|----------|-----------|-----------|
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_live_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | `pk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | From `stripe listen` CLI | From Stripe dashboard |

**Always use test mode keys in preview/development.** Live mode keys go only in the production environment.

---

## Cloudflare Workflows

For background jobs that need durability (retry on failure, survive restarts).

```typescript
// src/workflows/process-payment.ts
import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';

type PaymentParams = {
  userId: string;
  amount: number;
};

export class PaymentWorkflow extends WorkflowEntrypoint<Env, PaymentParams> {
  async run(event: WorkflowEvent<PaymentParams>, step: WorkflowStep) {
    const { userId, amount } = event.payload;

    const charge = await step.do('create-charge', async () => {
      // Each step is independently retried on failure
      // External API calls are I/O — don't count against CPU time
      return await createStripeCharge(userId, amount);
    });

    await step.do('update-database', async () => {
      await updateSubscriptionStatus(userId, charge.id);
    });

    await step.do('send-confirmation', async () => {
      await sendEmail(userId, 'Payment confirmed');
    });
  }
}
```

**When to use Workflows vs direct execution:**
- Direct: Request completes in < 30 seconds, failure is acceptable
- Workflows: Multi-step process, needs retry logic, involves external APIs that may timeout

---

## Custom Domains

1. Add the domain in Cloudflare Dashboard > Workers & Pages > your project > Custom Domains.
2. If the domain is already on Cloudflare DNS, it auto-configures. Otherwise, update your DNS records.
3. SSL is automatic and free.

---

## Deployment Checklist

- [ ] `wrangler.toml` has correct `compatibility_date` and `pages_build_output_dir`
- [ ] All secrets set via `wrangler secret put` (not in wrangler.toml)
- [ ] Production environment variables set in Cloudflare dashboard
- [ ] Preview environment variables set with test-mode keys
- [ ] Stripe webhook endpoint registered in Stripe dashboard pointing to production URL
- [ ] Supabase project URL matches the environment
- [ ] Custom domain configured (if applicable)
- [ ] `npx opennext build` succeeds locally before pushing
- [ ] Preview deploy tested before merging to main
