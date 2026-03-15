# Common Pitfalls -- Infrastructure

This file documents mistakes that appear repeatedly in deployment and CI/CD setups.
Read this when debugging deploy failures, CI issues, or container problems.

---

## Pitfall 1: Secrets Leaked in CI Logs

**What it looks like:**
```yaml
- run: echo "Deploying with key $API_KEY"
  env:
    API_KEY: ${{ secrets.API_KEY }}
```

**Why it breaks:**
GitHub masks known secrets in logs, but string manipulation (substring, base64 encoding, JSON embedding) can bypass the masking. Once a secret appears in a public log, it's compromised.

**Fix:**
Never echo, print, or log secrets. If you need to verify a secret exists, check its length:
```yaml
- run: |
    if [ -z "$API_KEY" ]; then
      echo "API_KEY is not set"
      exit 1
    fi
    echo "API_KEY is set (length: ${#API_KEY})"
```

---

## Pitfall 2: Missing Health Check Endpoint

**What it looks like:**
Railway or Docker marks the deploy as "successful" because the container started. But the app crashed 2 seconds later due to a missing env var, and no one notices until a user reports it.

**Why it breaks:**
Without a health check, the platform has no way to verify the app is actually serving traffic. A container that starts is not the same as a container that works.

**Fix:**
Every backend service needs a `/health` endpoint. Configure the platform to check it:
```toml
# railway.toml
[deploy]
healthcheckPath = "/health"
```

```dockerfile
# Dockerfile
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
```

---

## Pitfall 3: No Graceful Shutdown

**What it looks like:**
```typescript
const server = app.listen(3000);
// process exits... connections dropped mid-request
```

**Why it breaks:**
During deploys, the platform sends SIGTERM to the old container. Without a shutdown handler, in-flight requests are dropped, database connections leak, and data can be corrupted.

**Fix:**
Handle SIGTERM and close connections cleanly:
```typescript
const server = app.listen(3000);

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    pool.end().then(() => process.exit(0));
  });
  // Force exit after 10 seconds if graceful shutdown hangs
  setTimeout(() => process.exit(1), 10_000);
});
```

In Docker, use exec form for CMD so Node.js receives signals directly:
```dockerfile
# Good -- exec form, Node receives SIGTERM
CMD ["node", "dist/index.js"]

# Bad -- shell form, signal goes to shell, not Node
CMD node dist/index.js
```

---

## Pitfall 4: Docker Image Too Large

**What it looks like:**
```
REPOSITORY   TAG     SIZE
my-app       latest  1.2GB
```

**Why it breaks:**
Large images mean slow deploys, slow CI, and wasted bandwidth. A 1.2GB Node.js app image usually means devDependencies, source code, and the full `node_modules` tree are all in the final image.

**Fix:**
Multi-stage builds. The builder stage compiles; the runner stage contains only production artifacts:
```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

Target: under 200MB for a Node.js backend, under 50MB for a static frontend served by nginx.

---

## Pitfall 5: CI That Takes Too Long

**What it looks like:**
PR checks take 8-12 minutes. Developers stop waiting and merge without reviewing CI results.

**Why it breaks:**
Slow CI erodes trust in the process. People start merging before CI finishes, which defeats the purpose of having CI at all.

**Fix:**
- Cache dependencies (`actions/setup-node` with `cache: 'npm'`).
- Run lint and type-check before tests (fail fast on cheap checks).
- Parallelize independent jobs.
- Don't install unnecessary tools in CI.
- Target: under 3 minutes for most projects. Under 5 minutes as a hard ceiling.

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: 'npm' }
      - run: npm ci
      - run: npm run lint && npm run typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: 'npm' }
      - run: npm ci
      - run: npm test
```

---

## Pitfall 6: Deploying Without Running Tests

**What it looks like:**
```yaml
# deploy.yml
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run build
      - run: npx wrangler deploy  # no tests!
```

**Why it breaks:**
Code that compiles is not code that works. Skipping tests in the deploy pipeline means broken code reaches production.

**Fix:**
Either run tests in the deploy workflow, or require CI to pass before deploy runs:
```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: 'npm' }
      - run: npm ci
      - run: npm test

  deploy:
    needs: test  # won't run if tests fail
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run build
      - run: npx wrangler deploy
```

---

## Pitfall 7: Forgetting `.dockerignore`

**What it looks like:**
Docker build takes 2 minutes and the build context is 500MB.

**Why it breaks:**
Without `.dockerignore`, `COPY . .` sends everything to the Docker daemon: `node_modules`, `.git`, test fixtures, documentation. This bloats the build context, slows down builds, and can leak sensitive files into the image.

**Fix:**
Create `.dockerignore` alongside every `Dockerfile`:
```
node_modules
dist
.git
.env
*.md
tests
.github
coverage
```

---

## Pitfall 8: Environment Variable Typos

**What it looks like:**
```typescript
const url = process.env.DATABSE_URL;  // typo: missing 'A'
// url is undefined, app crashes later with a cryptic error
```

**Why it breaks:**
`process.env` returns `undefined` for any key that doesn't exist, without warning. Typos in env var names are silent failures.

**Fix:**
Validate all required env vars at startup (see `testing.md`). A centralized `config.ts` that calls `requireEnv()` catches typos immediately with a clear error message.

---

## Checklist Before Deploying

- [ ] CI passes (tests, lint, type-check)
- [ ] Health check endpoint exists and returns 200
- [ ] Graceful shutdown handler is implemented
- [ ] Docker image is under 200MB
- [ ] All secrets are in platform secret management, not in code
- [ ] `.env.example` is up to date with all required variables
- [ ] `.dockerignore` exists (if using Docker)
- [ ] Preview deploy has been manually verified
- [ ] Post-deploy smoke test is in the pipeline
