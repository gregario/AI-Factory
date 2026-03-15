# Project Structure -- Infrastructure

## Where Infrastructure Files Live

Infrastructure config lives in the project root, alongside source code. There is no separate infra repo for micro-SaaS projects.

```
project-name/
  .github/
    workflows/
      ci.yml              # PR checks: test, lint, type-check
      deploy.yml           # Production deploy on push to main
      release.yml          # npm publish (if applicable)
    dependabot.yml         # Automated dependency updates
  src/                     # Application source
  tests/                   # Application tests
  Dockerfile               # Container build (if deploying to Railway/Docker)
  .dockerignore            # Exclude files from Docker build context
  docker-compose.yml       # Local dev dependencies (Postgres, Redis, etc.)
  railway.toml             # Railway deploy config (if using Railway)
  wrangler.toml            # Cloudflare config (if using Wrangler)
  .env.example             # Placeholder env vars (committed)
  .env                     # Actual env vars (gitignored)
  package.json
  tsconfig.json
```

---

## File-by-File Guide

### `.github/workflows/ci.yml`

Required for every project. Runs on PRs and pushes to main. Contains: lint, type-check, test. This is the gate that branch protection enforces.

### `.github/workflows/deploy.yml`

Required for deployed projects. Triggers on push to main (after CI passes). Deploys to Cloudflare Pages, Railway, or npm depending on the project type.

### `.github/dependabot.yml`

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

Keep GitHub Actions and npm dependencies up to date automatically. Review and merge the PRs -- don't ignore them.

### `Dockerfile`

Only needed if the project deploys as a container (Railway, any Docker host). Not needed for Cloudflare Pages (static hosting) or npm packages.

### `.dockerignore`

Required whenever a `Dockerfile` exists. Mirrors `.gitignore` patterns plus additional exclusions (`.git`, `tests/`, `*.md`).

### `docker-compose.yml`

Use for local development when the project depends on external services (databases, caches, message queues). Not needed for stateless apps or frontends.

### `.env.example`

Always committed. Documents every environment variable the project needs, with placeholder values. New developers copy this to `.env` and fill in real values.

### `railway.toml` / `wrangler.toml`

Platform-specific deploy config. Only include the one you're using.

---

## Project Type Templates

### Frontend (Cloudflare Pages)

```
my-frontend/
  .github/
    workflows/
      ci.yml
    dependabot.yml
  src/
  public/
  .env.example
  package.json
  tsconfig.json
```

No Dockerfile, no deploy workflow (Cloudflare's GitHub integration handles deploys).

### Backend (Railway + Docker)

```
my-backend/
  .github/
    workflows/
      ci.yml
      deploy.yml
    dependabot.yml
  src/
    index.ts
    health.ts            # /health endpoint
  tests/
  Dockerfile
  .dockerignore
  docker-compose.yml     # Local Postgres, etc.
  railway.toml
  .env.example
  package.json
  tsconfig.json
```

### npm Package

```
my-package/
  .github/
    workflows/
      ci.yml
      release.yml         # Publish to npm on tag/release
    dependabot.yml
  src/
  tests/
  .env.example
  package.json
  tsconfig.json
```

No Dockerfile. No deploy workflow. The `release.yml` workflow handles npm publish.

---

## Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Workflow files | kebab-case | `ci.yml`, `deploy.yml` |
| Environment variables | UPPER_SNAKE_CASE | `DATABASE_URL`, `NODE_ENV` |
| Docker image tags | semver or `latest` | `my-app:1.2.3`, `my-app:latest` |
| Compose service names | kebab-case | `postgres`, `redis`, `my-app` |
| Config files | Standard platform names | `Dockerfile`, `railway.toml`, `wrangler.toml` |

---

## What Gets Gitignored

```gitignore
# Infrastructure
.env
*.pem
*.key
```

Never commit: `.env`, private keys, certificates, credentials files, `docker-compose.override.yml` with local secrets.

Always commit: `.env.example`, `Dockerfile`, `docker-compose.yml`, workflow files, platform config files.
