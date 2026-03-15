# SaaS Stack Design: Cloudflare + Supabase + Stripe

> Default deployment and infrastructure stack for AI Factory micro-SaaS products.

---

## Context

The factory needs a standardized stack for shipping micro-SaaS web apps daily. Requirements:

- **$0 at launch** — free tiers that allow commercial use
- **No surprise bills** — predictable costs, hard spending limits
- **Scale to zero** — don't pay for idle products
- **AI-capable** — support long-running agent workloads when needed
- **Low lock-in** — portable to other platforms if needed
- **Stripe by default** — payments from day one
- **Auth + database included** — not bolted on as an afterthought

## Decision

**Cloudflare Pages/Workers + Supabase + Stripe**, with Railway as an optional add-on for heavy AI agent workloads.

### Why not Vercel?

Vercel was the initial candidate but has three dealbreakers for the daily-shipping model:

1. **Hobby plan prohibits commercial use.** Every revenue-generating product requires Pro ($20/mo). At 5+ live products, that's $100+/mo in hosting alone.
2. **Surprise bill risk.** Documented cases of $700-$96K bills from traffic spikes or bot attacks. Cloudflare has unlimited bandwidth on all plans.
3. **No built-in background jobs.** Requires adding Railway ($5/mo) for any async work. Cloudflare Workflows handles this natively.

### Why Cloudflare?

- **Unlimited bandwidth, all plans, including free.** No egress charges ever.
- **Commercial use allowed on free tier.** Ship and charge from day one.
- **Workers Paid ($5/mo)** unlocks 30s-5min CPU time, Workflows, Queues, Durable Objects.
- **Cloudflare Workflows** — durable multi-step execution for AI agent orchestration. Each external API call (LLM, etc.) is I/O that doesn't count against CPU time.
- **Preview deployments** on PRs, built-in.
- **Global edge network** (300+ locations).
- **Low lock-in** — Next.js via OpenNext adapter; add a Dockerfile and you can deploy anywhere.

### Why Supabase?

- **50K MAUs free** for auth (Clerk gives 10K, Auth0 charges $0.07/MAU).
- **Full Postgres** with Row Level Security, realtime subscriptions, storage.
- **Well-documented Cloudflare integration** (supabase-js via PostgREST, or Hyperdrive for direct Postgres).
- **$5B valuation, $70M ARR, open source.** Not going anywhere. Self-hostable escape hatch.
- **Pro ($25/mo)** when you need it: 8GB database, 250GB bandwidth, daily backups.

### Why Stripe?

- **Industry standard.** Maximum reliability, best documentation, largest ecosystem.
- **2.9% + $0.30 per transaction.** No monthly fee.
- **Test mode** for development. Webhook testing via Stripe CLI.
- **Alternative considered:** Polar (4% + $0.40, handles tax as Merchant of Record). Worth revisiting if tax compliance becomes painful, but Stripe is the safer default.

---

## Two Templates

### Template 1: Standard (most projects)

For web apps with auth, database, payments, and light background jobs.

```
Frontend + API     → Cloudflare Pages/Workers (Next.js via OpenNext)
Database + Auth    → Supabase (Postgres, Auth, Storage, Realtime)
Payments           → Stripe (Checkout, Webhooks, Subscriptions)
Background jobs    → Cloudflare Workflows
CI                 → GitHub Actions (test + type-check on PR)
Deploy             → Cloudflare auto-deploy on push to main
Cost at launch     → $0
```

### Template 2: AI (agent-heavy projects)

Everything in Standard, plus infrastructure for long-running stateful AI agent processes.

```
All of Standard    → Same
Agent workers      → Railway ($5/mo account-wide, shared across projects)
Job orchestration  → Trigger.dev (alternative if Railway isn't needed)
Cost at launch     → $5/mo
```

**When to use AI template:** When your product runs multi-minute agent processes that exceed Cloudflare Workflows' 5-minute CPU limit per step, or needs persistent stateful processes (e.g., a long-lived agent coordinator).

---

## Default Project Scaffold

Every new SaaS project includes:

### Application
- Next.js app with OpenNext/Cloudflare adapter pre-configured
- `wrangler.toml` with Workers + D1 + R2 bindings scaffold
- Supabase client initialization + auth hooks
- RLS policy templates (user-scoped data access)
- Stripe checkout session creation + webhook handler
- Subscription management (create/update/cancel)
- Cloudflare Workflow scaffold for background jobs
- Environment template (`.env.example` with all required keys)

### CI/CD
- **GitHub Actions** workflow:
  - On PR: test, lint, type-check
  - On merge to main: Cloudflare Pages auto-deploys (no Action needed)
- **Preview deployments** on PRs (Cloudflare built-in)
- **Stripe webhook forwarding** in dev via `stripe listen --forward-to`

### Testing (backend + integration layer)
- **Unit tests** — Vitest for business logic, API route handlers, utilities
- **Supabase local dev** — `supabase start` for local Postgres + Auth + RLS testing
- **Stripe test mode** — webhook handling, subscription lifecycle, checkout flows
- **Miniflare** — local Cloudflare Workers simulator for edge logic and Workflows

> Note: This is separate from the browser-qa stack (`stacks/browser-qa/`), which handles end-to-end UI testing via headless Chromium. Both run in GitHub Actions CI but are independent test suites.

---

## Upgrade Path

| Milestone | Action | Monthly Cost |
|-----------|--------|-------------|
| Launch / validation | Free tiers everywhere | $0 |
| First paying customers | Supabase Pro (8GB DB, 250GB bandwidth, backups) | $25 |
| Need more Workers CPU / Workflows | Cloudflare Workers Paid | $30 |
| Heavy AI agent workloads | Add Railway (account-wide) | $35 |
| Multiple products with traction | Per-product Supabase Pro | +$25 each |

### Cost comparison vs Vercel stack

| Products live | Cloudflare + Supabase | Vercel + Supabase |
|---------------|----------------------|-------------------|
| 1 (free tier) | $0 | $20 (Vercel Pro required) |
| 1 (with paying users) | $30 | $45 |
| 3 (with paying users) | $80 | $135 |
| 5 (with paying users) | $130 | $225 |

---

## Known Trade-offs

### Cloudflare DX vs Vercel
- OpenNext adapter requires more config than `vercel deploy`. This becomes boilerplate in the project template.
- Image optimization needs manual Cloudflare Images setup (not zero-config).
- Some Node.js built-in APIs don't exist in the Workers V8 runtime. Dependencies that use native Node APIs may need alternatives.
- The gap is closing fast — OpenNext 1.0 supports SSR, ISR, Server Actions, middleware.

### Supabase free tier pausing
- Projects pause after 7 days of inactivity. Fine during validation (you're actively developing). Upgrade to Pro ($25/mo) before going live with paying customers.
- Community workaround exists (GitHub Actions cron ping) but is a hack. Don't rely on it for production.

### Supabase bandwidth
- Free tier: 5GB egress/month. With 500 DAU making 20 API calls each, you burn through it in ~4 days. Budget for Pro from the moment you have real traffic.

---

## What This Replaces

The existing ProductBuilder Docker Compose + Nginx + Prometheus stack becomes legacy. New SaaS projects use this managed stack instead. Existing projects are unaffected:
- **MCP servers** — npm publish pipeline (unchanged)
- **Godot games** — Steam/native distribution (unchanged)
- **Browser QA** — independent test layer that works with any web stack

---

## New Stack Profile

Create `stacks/saas/` covering:
- Cloudflare Pages/Workers setup + OpenNext configuration
- Supabase integration patterns (client init, auth hooks, RLS policies, local dev)
- Stripe integration patterns (checkout, webhooks, subscriptions, customer portal)
- Cloudflare Workflows patterns (background jobs, AI agent orchestration)
- Testing strategy (Vitest + Supabase local + Stripe test mode + Miniflare)
- Deployment guide (wrangler, environment variables, preview deploys)
- Upgrade checklist (when and how to move from free to paid tiers)

---

## Roadmap Items Spawned

1. **SaaS stack profile** (`stacks/saas/`) — the documentation and patterns
2. **SaaS project template** — scaffold with all integrations pre-wired
3. **Stripe default integration** — checkout + webhooks + subscriptions as factory standard
4. **Automated marketing/publishing pipeline** — separate design needed (per factory vision)
