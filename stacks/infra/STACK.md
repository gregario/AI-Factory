# Infrastructure Stack Profile

This stack profile defines how ALL deployment, CI/CD, and infrastructure is configured across AI-Factory projects.

Before setting up infrastructure for any project, Claude must read this stack profile in full.
This is not optional. Ignoring the stack profile produces inconsistent, fragile deployments.

---

## Files in This Profile

| File | Read When |
|------|-----------|
| `coding_standards.md` | Writing any infrastructure config (Dockerfiles, workflows, deploy scripts) |
| `testing.md` | Testing CI pipelines, Docker builds, or deploy processes |
| `project_structure.md` | Adding infra files to a project or setting up a new deployment |
| `pitfalls.md` | Debugging deploy failures, CI issues, or container problems |
| `ci_cd.md` | Setting up GitHub Actions workflows, PR checks, or auto-deploy |
| `docker.md` | Writing Dockerfiles, compose configs, or optimizing images |

---

## Core Principles

**Free tiers first, scale up only when needed.**
Cloudflare Pages is free for most frontend projects. Railway gives $5/mo for backends. Don't provision infrastructure you don't need. Micro-SaaS doesn't need Kubernetes.

**Environment variables for all config. Never hardcode secrets.**
Database URLs, API keys, tokens -- all go in environment variables. Never commit `.env` files. Use platform-level secret management (GitHub Secrets, Railway variables, Cloudflare env vars).

**Automated testing in CI before merge. No exceptions.**
Every PR runs tests, lint, and type-check. If CI doesn't pass, the PR doesn't merge. Branch protection enforces this. Manual deploys without CI are a bug in the process.

**Preview deployments on every PR.**
Cloudflare Pages and Railway both support preview deployments. Use them. Reviewers should see the change running, not just read the diff.

**Infrastructure as code, but don't over-engineer.**
GitHub Actions workflows, Dockerfiles, and deploy configs are checked into the repo. But don't build a Terraform empire for a single-service app. Match the infra complexity to the project complexity.

---

## Key Technologies

| Technology | Purpose |
|-----------|---------|
| GitHub Actions | CI/CD pipelines, PR checks, automated deploys |
| Cloudflare Pages | Frontend hosting (free, global CDN, preview deploys) |
| Railway | Backend hosting for persistent processes ($5/mo) |
| Docker | Containerized deployments, local dev parity |
| `act` | Test GitHub Actions workflows locally |
| Dependabot / Renovate | Automated dependency updates |
| Sentry | Error tracking and alerting |

---

## When to Use This Stack

Every project in the factory uses this stack for deployment and CI/CD. The question is which subset:

- **Frontend-only (static site, SPA):** GitHub Actions CI + Cloudflare Pages deploy. No Docker needed.
- **Backend service (API, MCP server, worker):** GitHub Actions CI + Docker + Railway deploy.
- **Full-stack app:** Both. Frontend to Cloudflare Pages, backend to Railway.
- **npm package (library, CLI tool):** GitHub Actions CI + npm publish workflow. No hosting needed.
- **Godot game:** GitHub Actions CI for GDScript tests. No cloud deploy (distribute via Steam/itch.io).

Start with the simplest option. Add complexity only when the project demands it.
