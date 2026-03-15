# Testing -- Infrastructure

## Testing CI Workflows Locally

**Use `act` to run GitHub Actions locally before pushing.**

```bash
# Install
brew install act

# Run all workflows
act

# Run a specific workflow
act -W .github/workflows/ci.yml

# Run a specific job
act -j test

# Run with secrets
act --secret-file .env.act
```

`act` uses Docker to simulate the GitHub Actions runner. It catches most workflow syntax errors, missing steps, and broken scripts before you burn CI minutes.

**Limitations of `act`:**
- Some GitHub-hosted runner features don't work (service containers can be flaky).
- Caching behaves differently.
- Platform-specific actions (macOS, Windows runners) aren't supported.
- It's good for catching "will this workflow even parse?" errors, not for perfect fidelity.

---

## Testing Docker Builds

**Always build and run locally before pushing.**

```bash
# Build
docker build -t my-app .

# Run and verify
docker run --rm -p 3000:3000 my-app

# Check image size
docker images my-app

# Inspect layers (find what's bloating the image)
docker history my-app
```

**What to verify:**
- The image builds without errors.
- The container starts and responds on the expected port.
- The health check endpoint returns 200.
- Environment variables are read correctly (pass them with `-e`).
- The container shuts down cleanly on SIGTERM (graceful shutdown).
- The image size is reasonable (under 200MB for a Node.js app with multi-stage build).

```bash
# Test graceful shutdown
docker run --name test-app -d my-app
docker stop test-app  # sends SIGTERM, waits 10s, then SIGKILL
docker logs test-app  # should show clean shutdown message
```

---

## Testing Deploy Pipelines

### Preview Deploys as Tests

Preview deployments on PRs are your integration test for the deploy pipeline. Before merging:

- Verify the preview URL loads and works.
- Check that environment variables are set correctly in the preview environment.
- Test any API endpoints against the preview backend.

### Smoke Tests After Deploy

For production deploys, add a post-deploy smoke test step:

```yaml
# In deploy.yml
- name: Smoke test
  run: |
    sleep 10
    curl -f https://my-app.example.com/health || exit 1
```

This catches deploys that "succeed" (container starts) but fail at runtime (missing env var, broken migration, etc.).

---

## Testing Infrastructure Config

### Environment Variable Validation

Validate required environment variables at startup, not when they're first used:

```typescript
// config.ts -- validated at import time
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  databaseUrl: requireEnv('DATABASE_URL'),
  port: parseInt(process.env.PORT ?? '3000', 10),
  sentryDsn: process.env.SENTRY_DSN,  // optional -- no requireEnv
};
```

This fails fast and tells you exactly what's missing, instead of crashing 10 minutes later with `Cannot read properties of undefined`.

### Docker Compose for Local Integration Tests

Use `docker-compose.yml` to spin up dependencies for integration tests:

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - "5432:5432"
```

```bash
# Start deps, run tests, tear down
docker compose up -d
npm test
docker compose down
```

---

## CI Pipeline Testing Checklist

- [ ] `act` runs the CI workflow without errors
- [ ] Docker image builds locally
- [ ] Container starts, responds on the correct port, and shuts down cleanly
- [ ] Health check endpoint returns 200
- [ ] Required environment variables are validated at startup
- [ ] Preview deploy works on a test PR
- [ ] Production deploy smoke test passes
- [ ] Image size is under 200MB (Node.js) or under 50MB (static frontend)
