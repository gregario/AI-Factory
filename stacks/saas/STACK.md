# SaaS Stack Profile

This stack profile defines how SaaS web applications are built in the AI-Factory. It covers the default infrastructure: Cloudflare Pages/Workers for hosting, Supabase for auth and database, and Stripe for payments.

**This stack layers on top of the TypeScript stack.** Read `stacks/typescript/` first — all TypeScript conventions apply unless explicitly overridden here. This file covers SaaS-specific patterns only.

Before writing any SaaS project code, Claude must read this stack profile in full.

---

## Files in This Profile

| File | Read When |
|------|-----------|
| `coding_standards.md` | Writing any SaaS project code |
| `testing.md` | Writing tests or setting up test infrastructure |
| `project_structure.md` | Creating a new project or adding files |
| `deployment.md` | Configuring Cloudflare, wrangler, preview deploys, environment variables |
| `supabase.md` | Setting up auth, database, RLS policies, local dev |
| `stripe.md` | Implementing payments, webhooks, subscriptions |
| `pitfalls.md` | Debugging unexpected behaviour or reviewing code |

Also read: `stacks/typescript/STACK.md` (parent stack).

---

## Core Principles

**$0 at launch, scale to zero.**
Every new product must run on free tiers until it has paying customers. No upfront hosting costs. No idle charges. If you're reaching for a paid tier before you have revenue, you're doing it wrong.

**Auth and payments from day one.**
Supabase Auth and Stripe are wired in from the start, not bolted on later. Every project scaffold includes auth hooks, RLS policies, checkout sessions, and webhook handlers. Removing them is easier than adding them.

**No surprise bills.**
Cloudflare has unlimited bandwidth on all plans. Supabase free tier has known limits (5GB egress, 500MB database, 7-day inactivity pause). Know these limits and plan for them. Never deploy to a platform where a traffic spike can bankrupt you.

**Low lock-in.**
Next.js runs on Cloudflare via OpenNext, but the same codebase can deploy to any Node.js host with a Dockerfile. Supabase is open source and self-hostable. Stripe is the most portable payment API. Every choice has an exit path.

**Edge-first, server when needed.**
Cloudflare Workers run at 300+ edge locations. Use them for API routes, middleware, and background jobs. Only reach for a traditional server (Railway) when you need long-running processes that exceed Workers' CPU limits.

---

## Key Technologies

| Technology | Purpose |
|-----------|---------|
| Next.js | Full-stack React framework (App Router, Server Actions, API routes) |
| OpenNext | Adapter to deploy Next.js on Cloudflare Pages/Workers |
| Cloudflare Pages | Static asset hosting + serverless functions |
| Cloudflare Workers | Edge compute for API routes and middleware |
| Cloudflare Workflows | Durable multi-step background jobs |
| Supabase | Postgres database, Auth (50K MAU free), Storage, Realtime |
| Stripe | Payments (Checkout, Subscriptions, Customer Portal, Webhooks) |
| Vitest | Test runner (unit + integration) |
| Miniflare | Local Cloudflare Workers simulator |
| GitHub Actions | CI (test + type-check on PR) |

---

## When to Use This Stack

Use this stack for any web application that needs:
- User authentication
- A database
- Payments or subscriptions
- Server-side rendering or API routes

This is the default for micro-SaaS products shipped from the factory.

**Do not use this stack for:**
- MCP servers (use `stacks/mcp/`)
- CLI tools (use `stacks/typescript/`)
- Games (use `stacks/godot/`)
- Static sites with no backend (plain Cloudflare Pages is enough)

---

## Two Templates

### Standard (most projects)

Web apps with auth, database, payments, and light background jobs.

```
Frontend + API     -> Cloudflare Pages/Workers (Next.js via OpenNext)
Database + Auth    -> Supabase (Postgres, Auth, Storage, Realtime)
Payments           -> Stripe (Checkout, Webhooks, Subscriptions)
Background jobs    -> Cloudflare Workflows
CI                 -> GitHub Actions (test + type-check on PR)
Deploy             -> Cloudflare auto-deploy on push to main
Cost at launch     -> $0
```

### AI (agent-heavy projects)

Everything in Standard, plus infrastructure for long-running stateful AI agent processes.

```
All of Standard    -> Same
Agent workers      -> Railway ($5/mo account-wide, shared across projects)
Cost at launch     -> $5/mo
```

Use the AI template when your product runs multi-minute agent processes that exceed Cloudflare Workflows' 5-minute CPU limit per step, or needs persistent stateful processes.

---

## Upgrade Path

| Milestone | Action | Monthly Cost |
|-----------|--------|-------------|
| Launch / validation | Free tiers everywhere | $0 |
| First paying customers | Supabase Pro (8GB DB, 250GB bandwidth, backups) | $25 |
| Need more Workers CPU / Workflows | Cloudflare Workers Paid | $30 |
| Heavy AI agent workloads | Add Railway (account-wide) | $35 |
| Multiple products with traction | Per-product Supabase Pro | +$25 each |

---

## References

- [OpenNext for Cloudflare](https://opennext.js.org/cloudflare)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare Workflows](https://developers.cloudflare.com/workflows/)
- [Supabase Docs](https://supabase.com/docs)
- [Supabase + Cloudflare Guide](https://supabase.com/docs/guides/getting-started/quickstarts/cloudflare-workers)
- [Stripe API Reference](https://docs.stripe.com/api)
- [Stripe Webhooks](https://docs.stripe.com/webhooks)
