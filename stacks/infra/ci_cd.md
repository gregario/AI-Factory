# CI/CD -- GitHub Actions Patterns

## PR Checks (ci.yml)

Every project needs a CI workflow that runs on pull requests. This is the quality gate.

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run typecheck

      - name: Test
        run: npm test
```

**Order matters:** lint and type-check run before tests. They're faster and catch different problems. Fail fast on the cheap checks.

---

## Auto-Deploy (deploy.yml)

### Frontend to Cloudflare Pages

Most frontend projects use Cloudflare's built-in GitHub integration. No workflow file needed -- Cloudflare watches the repo, builds on push, and creates preview deploys on PRs.

If you need custom build steps, use a workflow:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - run: npm ci
      - run: npm run build

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist --project-name=my-app
```

### Backend to Railway

Railway's GitHub integration auto-deploys on push to main. Configure via the Railway dashboard or `railway.toml`. No workflow file needed for basic deploys.

For controlled deploys with a test gate:

```yaml
name: Deploy

on:
  push:
    branches: [main]

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
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Railway
        uses: berviantoleo/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: my-service
```

### npm Publish

```yaml
name: Release

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
          registry-url: 'https://registry.npmjs.org'

      - run: npm ci
      - run: npm test
      - run: npm run build
      - run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Trigger on GitHub Releases. Tag with semver (`v1.2.3`). The `--provenance` flag adds supply chain attestation.

---

## Secrets Management

### Where Secrets Live

| Context | Storage |
|---------|---------|
| CI workflows | GitHub Secrets (repo or org level) |
| Production deploy | Platform variables (Railway, Cloudflare) |
| Local development | `.env` file (gitignored) |

### Required Secrets by Platform

**Cloudflare Pages:**
- `CLOUDFLARE_API_TOKEN` -- API token with Pages edit permission
- `CLOUDFLARE_ACCOUNT_ID` -- Account ID from the dashboard

**Railway:**
- `RAILWAY_TOKEN` -- Project-level deploy token

**npm:**
- `NPM_TOKEN` -- Automation token from npmjs.com (Settings > Access Tokens)

### Secret Rotation

Rotate secrets when:
- A team member loses access to the repo.
- A secret is accidentally exposed in logs or code.
- As a regular hygiene practice (every 6 months for production tokens).

---

## Branch Protection

Configure on GitHub: Settings > Branches > Branch protection rules for `main`.

**Required settings:**
- Require status checks to pass before merging (select the CI workflow).
- Require branches to be up to date before merging.
- Require pull request reviews (at least 1, optional for solo projects).
- Do not allow bypassing the above settings.

**Optional but recommended:**
- Require signed commits.
- Require linear history (no merge commits -- use squash or rebase).

---

## Dependency Updates

### Dependabot

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    reviewers:
      - "your-username"

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

Dependabot opens PRs for outdated dependencies. CI runs on those PRs automatically. Review the changelog, verify CI passes, merge.

**Keep GitHub Actions dependencies updated too.** The `github-actions` ecosystem entry updates action versions in workflow files.

### Renovate (Alternative)

Renovate is more configurable than Dependabot. Use it if you need grouped PRs, custom auto-merge rules, or monorepo support. For most factory projects, Dependabot is sufficient.

---

## Workflow Patterns

### Matrix Builds (Multi-Version Testing)

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm test
```

Use when your package supports multiple Node.js versions. Don't use for application code that only runs on one version.

### Conditional Deploys

```yaml
jobs:
  deploy:
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    needs: test
    # ...
```

### Reusable Workflows

For projects that share CI patterns, extract common steps into a reusable workflow:

```yaml
# .github/workflows/node-ci.yml (in a shared repo)
on:
  workflow_call:
    inputs:
      node-version:
        type: number
        default: 22

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
```

Don't reach for reusable workflows until you have 3+ projects with identical CI. Premature abstraction is worse than a little duplication.

---

## Testing Workflows Locally

```bash
# Install act
brew install act

# Run the CI workflow
act -W .github/workflows/ci.yml

# Run with a specific event
act pull_request

# Pass secrets
act --secret-file .env.act

# Use a specific runner image (smaller, faster)
act -P ubuntu-latest=catthehacker/ubuntu:act-latest
```

Always test new workflows with `act` before pushing. A broken workflow file blocks all PRs until it's fixed.
