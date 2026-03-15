# Coding Standards -- Infrastructure

## GitHub Actions Workflows

### Naming and Location

```
.github/
  workflows/
    ci.yml          # PR checks: test, lint, type-check
    deploy.yml      # Production deploy (triggered on push to main)
    release.yml     # npm publish or tagged releases (if applicable)
```

Use descriptive workflow names that show up clearly in the GitHub UI:

```yaml
name: CI          # not "Build and Test and Lint"
name: Deploy      # not "Production Deployment Pipeline v2"
```

### Workflow Structure

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
```

**Key rules:**
- Pin action versions to major (`@v4`), not `@latest` or full SHA unless you have a security reason.
- Use `npm ci` not `npm install` -- it's faster, deterministic, and respects lockfile.
- Cache dependencies. `actions/setup-node` has built-in caching.
- Run lint and type-check before tests. Fail fast on cheap checks.

### Secrets

```yaml
# Good -- reference GitHub Secrets
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  API_KEY: ${{ secrets.API_KEY }}

# Bad -- hardcoded
env:
  API_KEY: "sk-1234567890"
```

- Store secrets in GitHub repo settings > Secrets and variables > Actions.
- Use environment-level secrets for production vs staging separation.
- Never echo secrets in workflow logs. GitHub masks them, but don't test that.

---

## Dockerfiles

### Structure

```dockerfile
# Good -- multi-stage build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

**Key rules:**
- Always use multi-stage builds. The final image should not contain devDependencies, source code, or build tools.
- Use Alpine images (`-alpine`) unless a dependency requires glibc.
- Copy `package*.json` first, then `npm ci`, then source. This maximizes layer caching.
- Set `WORKDIR` explicitly. Never work in `/`.
- Use `EXPOSE` to document the port. It doesn't publish it, but it communicates intent.
- Use `CMD` with exec form (`["node", "dist/index.js"]`), not shell form. Exec form receives signals properly for graceful shutdown.

### .dockerignore

Every project with a Dockerfile must have a `.dockerignore`:

```
node_modules
dist
.git
.env
*.md
tests
.github
```

Without this, `COPY . .` sends gigabytes of unnecessary context to the Docker daemon.

---

## Environment Variables

**Naming: UPPER_SNAKE_CASE.**

```bash
DATABASE_URL=postgres://...
PORT=3000
NODE_ENV=production
SENTRY_DSN=https://...
```

**Loading pattern:**
- In production: set via platform (Railway, Cloudflare, GitHub Secrets).
- In local dev: use a `.env` file loaded by `dotenv` or the runtime's built-in support.
- `.env` is always gitignored. Provide a `.env.example` with placeholder values.

```bash
# .env.example (committed to repo)
DATABASE_URL=postgres://localhost:5432/myapp_dev
PORT=3000
SENTRY_DSN=
```

---

## Deploy Configs

### Cloudflare Pages

Configure via the Cloudflare dashboard or `wrangler.toml`:

```toml
# wrangler.toml (if using Wrangler)
name = "my-app"
compatibility_date = "2024-01-01"

[site]
bucket = "./dist"
```

Most frontend projects deploy via Cloudflare's GitHub integration -- no workflow file needed. Cloudflare auto-builds on push and creates preview deploys on PRs.

### Railway

Railway connects to the GitHub repo directly. Configure via `railway.toml` or the dashboard:

```toml
# railway.toml
[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile"

[deploy]
healthcheckPath = "/health"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
```

Always set a health check endpoint. Railway uses it to know if the deploy succeeded.

---

## Monitoring

**Every backend service needs:**
- A `/health` endpoint that returns 200 when the service is running.
- Error tracking via Sentry (or equivalent). Initialize early in the entry point.
- Uptime monitoring (UptimeRobot free tier, or Cloudflare health checks).

```typescript
// Health check -- keep it simple
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Sentry init -- top of entry point
import * as Sentry from '@sentry/node';
Sentry.init({ dsn: process.env.SENTRY_DSN });
```

**Don't over-monitor.** For micro-SaaS: health check + error tracking + uptime ping is enough. Add metrics and dashboards when you have users who would notice an outage.
