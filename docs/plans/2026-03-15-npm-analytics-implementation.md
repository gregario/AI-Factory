# npm Analytics Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a self-updating dashboard that tracks npm downloads, GitHub stars, and forks for all gregario npm packages, stored as flat JSON in a GitHub repo with a GitHub Pages frontend.

**Architecture:** GitHub Actions cron runs a Node.js script daily that auto-discovers npm packages, fetches metrics, and commits JSON. A static HTML dashboard on GitHub Pages reads the JSON and renders interactive charts.

**Tech Stack:** Plain Node.js (ESM, no TypeScript), Chart.js (CDN), GitHub Actions, GitHub Pages

---

### Task 1: Project Scaffold

**Files:**
- Create: `projects/npm-analytics/package.json`
- Create: `projects/npm-analytics/.gitignore`
- Create: `projects/npm-analytics/LICENSE`
- Create: `projects/npm-analytics/.github/FUNDING.yml`
- Create: `projects/npm-analytics/README.md`

**Step 1: Create project, init git, create GitHub repo**

```bash
mkdir -p projects/npm-analytics && cd projects/npm-analytics
git init
```

**Step 2: Create package.json**

```json
{
  "name": "npm-analytics",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "collect": "node scripts/collect.mjs",
    "backfill": "node scripts/backfill.mjs"
  },
  "license": "MIT"
}
```

No dependencies. Uses Node.js built-in `fetch`.

**Step 3: Create .gitignore, LICENSE, FUNDING.yml, README.md**

- `.gitignore`: `node_modules/`, `.DS_Store`
- `LICENSE`: MIT (copy from other projects)
- `.github/FUNDING.yml`: `github: [gregario]`
- `README.md`: Brief description, link to dashboard

**Step 4: Create directory structure**

```bash
mkdir -p data/daily docs scripts
```

**Step 5: Create GitHub repo and push**

```bash
gh repo create gregario/npm-analytics --public --description "Daily npm download and GitHub stats tracker with interactive dashboard"
git remote add origin https://github.com/gregario/npm-analytics.git
git add -A && git commit -m "chore: project scaffold"
git push -u origin main
```

**Step 6: Enable GitHub Pages**

```bash
gh api repos/gregario/npm-analytics -X PATCH -f "pages[source][branch]=main" -f "pages[source][path]=/docs"
```

---

### Task 2: Data Collection Script

**Files:**
- Create: `scripts/collect.mjs`

**Step 1: Write the collection script**

The script must:

1. **Discover packages**: Check `data/packages.json`. If missing or older than 7 days, query npm registry:
   ```
   https://registry.npmjs.org/-/v1/search?text=maintainer:gregario&size=100
   ```
   Extract package names. Save to `data/packages.json` with `last_discovered` date.

2. **Fetch npm downloads**: For each package, fetch yesterday's downloads:
   ```
   https://api.npmjs.org/downloads/point/last-day/{package}
   ```

3. **Fetch GitHub stats**: For each package, fetch stars and forks. Map package name to repo name (they're the same for gregario's packages):
   ```
   https://api.github.com/repos/gregario/{package}
   ```
   Use `GITHUB_TOKEN` env var for auth if available (higher rate limit), fall back to unauthenticated.

4. **Write daily file**: Save to `data/daily/YYYY-MM-DD.json` with the format from the design doc.

5. **Update manifest**: Read all filenames from `data/daily/`, extract dates, sort, write to `data/index.json`.

**Key details:**
- Use `console.error` for logging (habit from MCP work, doesn't matter here but consistent)
- Handle API failures gracefully (log warning, skip that package, don't crash)
- Yesterday's date in UTC: `new Date(Date.now() - 86400000).toISOString().slice(0, 10)`
- If the daily file for yesterday already exists, skip (idempotent)

**Step 2: Test locally**

```bash
node scripts/collect.mjs
cat data/packages.json
cat data/daily/2026-03-15.json
cat data/index.json
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: data collection script"
```

---

### Task 3: Backfill Script

**Files:**
- Create: `scripts/backfill.mjs`

**Step 1: Write a backfill script**

npm's downloads API supports date ranges:
```
https://api.npmjs.org/downloads/range/2026-01-01:2026-03-15/{package}
```

The backfill script:
1. Read `data/packages.json` (run collect first if missing)
2. For each package, fetch full download history from a start date (default: 90 days ago)
3. For each day, create/update `data/daily/YYYY-MM-DD.json`
4. For GitHub stars/forks: only fetch current values (no historical API), apply to all days as the "as of backfill" value
5. Regenerate `data/index.json`

This gives you historical download data from day one. Stars/forks won't have history until daily collection starts, but downloads will.

**Step 2: Run backfill**

```bash
node scripts/backfill.mjs
ls data/daily/ | head -10
ls data/daily/ | wc -l
```

**Step 3: Commit all data**

```bash
git add -A && git commit -m "feat: backfill script + historical data"
```

---

### Task 4: Dashboard HTML

**Files:**
- Create: `docs/index.html`
- Create: `docs/app.js`
- Create: `docs/style.css`

**Step 1: Write index.html**

Single HTML file:
- Load Chart.js from CDN: `https://cdn.jsdelivr.net/npm/chart.js`
- Load `app.js` and `style.css`
- Layout:
  - Header: "npm Analytics" title
  - Summary cards row: Total Downloads, Total Stars, Total Forks, Package Count
  - Controls row: Date range buttons (7d / 30d / 90d / All), package checkboxes, signal toggles (Downloads / Stars / Forks)
  - Chart 1: Downloads overview (stacked area)
  - Chart 2: Per-package downloads (line)
  - Chart 3: Stars + forks over time (line)

**Step 2: Write app.js**

Dashboard logic:
1. Fetch `../data/index.json` to get list of available dates
2. Fetch all daily JSON files in parallel (use `Promise.all` with batching if >100 files)
3. Build in-memory data structure: `{ date -> { package -> { downloads, stars, forks } } }`
4. Render summary cards (sum all downloads, latest stars/forks)
5. Render three Chart.js charts
6. Wire up controls:
   - Date range buttons filter the data and re-render
   - Package checkboxes toggle datasets on/off
   - Signal toggles show/hide charts
7. Weekly view: group daily data into ISO weeks, sum downloads
8. Monthly view: group by YYYY-MM, sum downloads

**Step 3: Write style.css**

Minimal, clean styling:
- Dark background (matches GitHub dark mode feel) or light, your choice
- Cards in a flexbox row
- Charts full-width with some padding
- Controls row with inline checkboxes
- Responsive basics (stack on mobile)

**Step 4: Test locally**

```bash
cd docs && python3 -m http.server 8000
# Open http://localhost:8000
```

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: interactive dashboard with Chart.js"
```

---

### Task 5: GitHub Actions Workflow

**Files:**
- Create: `.github/workflows/collect.yml`

**Step 1: Write the workflow**

```yaml
name: Collect Stats

on:
  schedule:
    - cron: "0 7 * * *"  # Daily at 07:00 UTC
  workflow_dispatch:

permissions:
  contents: write

jobs:
  collect:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - uses: actions/setup-node@v6
        with:
          node-version: 22

      - name: Collect daily stats
        run: node scripts/collect.mjs
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Check for new data
        id: diff
        run: |
          if git diff --quiet data/; then
            echo "changed=false" >> "$GITHUB_OUTPUT"
          else
            echo "changed=true" >> "$GITHUB_OUTPUT"
          fi

      - name: Commit and push
        if: steps.diff.outputs.changed == 'true'
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add data/
          git commit -m "chore: collect stats ($(date -u +%Y-%m-%d))"
          git pull --rebase
          git push
```

**Step 2: Commit**

```bash
git add -A && git commit -m "ci: daily stats collection workflow"
```

---

### Task 6: Push, Backfill, Enable Pages

**Step 1: Push all commits**

```bash
git push
```

**Step 2: Run backfill to populate historical data**

```bash
node scripts/backfill.mjs
git add -A && git commit -m "chore: backfill historical download data"
git push
```

**Step 3: Enable GitHub Pages on /docs from main branch**

Verify via:
```bash
gh api repos/gregario/npm-analytics/pages --jq '.html_url'
```

Dashboard should be live at `https://gregario.github.io/npm-analytics/`

**Step 4: Trigger a manual workflow run to verify Actions work**

```bash
gh workflow run collect.yml
```

**Step 5: Update README with dashboard link**

---

## Summary

6 tasks. No tests (it's a data script + static HTML). No build step. No framework. The entire project is:
- 1 collection script (~100 lines)
- 1 backfill script (~80 lines)
- 1 HTML file + 1 JS file + 1 CSS file
- 1 GitHub Actions workflow
