# npm Analytics Dashboard — Design

## What

A self-updating developer analytics dashboard for all gregario npm packages and GitHub repos. Auto-discovers packages, tracks daily npm downloads, GitHub stars, and forks. Stores historical data as flat JSON in a GitHub repo. Renders interactive charts on GitHub Pages.

## Why

No combined view of download trends across all packages. npm shows per-package graphs but no portfolio view, no history you own, no cross-package comparison.

## Architecture

Zero infrastructure. GitHub Actions collects data daily, commits JSON files, GitHub Pages serves a static dashboard.

```
npm-analytics/
  .github/
    workflows/
      collect.yml          # Daily cron: fetch data, commit JSON
  data/
    daily/
      YYYY-MM-DD.json      # One file per day, all packages
    packages.json           # Auto-discovered package list (re-discovered weekly)
    index.json              # Manifest of all available dates
  docs/
    index.html              # Dashboard (GitHub Pages root)
    app.js                  # Chart rendering, filtering, aggregation
    style.css               # Minimal styling
  scripts/
    collect.mjs             # Data collection script (plain Node.js, no build)
```

## Data Format

### Daily file (`data/daily/YYYY-MM-DD.json`)

```json
{
  "date": "2026-03-15",
  "packages": {
    "godot-forge": { "downloads": 42, "stars": 3, "forks": 1 },
    "brewers-almanack": { "downloads": 15, "stars": 1, "forks": 0 }
  }
}
```

Downloads are per-day counts. Stars and forks are cumulative totals.

### Package cache (`data/packages.json`)

```json
{
  "last_discovered": "2026-03-15",
  "packages": ["godot-forge", "brewers-almanack", "warhammer-oracle", "mtg-oracle", "lego-oracle"]
}
```

Re-discovered weekly via npm registry search API.

### Manifest (`data/index.json`)

```json
["2026-03-15", "2026-03-16", "2026-03-17"]
```

Regenerated on each collection run.

## Data Collection

Script: `scripts/collect.mjs` (plain Node.js, no TypeScript, no build step)

1. Check `packages.json` age. If >7 days, re-discover via `https://registry.npmjs.org/-/v1/search?text=maintainer:gregario`
2. For each package: fetch yesterday's downloads from `https://api.npmjs.org/downloads/point/last-day/{package}`
3. For each package: fetch stars and forks from `https://api.github.com/repos/gregario/{repo}` (uses default GITHUB_TOKEN)
4. Write `data/daily/YYYY-MM-DD.json`
5. Regenerate `data/index.json`

## GitHub Action

- Cron: daily at 07:00 UTC
- Manual trigger via workflow_dispatch
- Uses default `secrets.GITHUB_TOKEN` (sufficient for public repo stars/forks)
- Commits and pushes if data changed
- No secrets beyond the default token

## Dashboard

Single `index.html` with Chart.js (CDN). No framework, no build.

### Charts
- **Overview**: Stacked area chart of total npm downloads across all packages. Daily/weekly/monthly toggle.
- **Per-package downloads**: Line chart, one line per package, toggleable via checkboxes.
- **Stars/forks**: Line chart of cumulative totals over time.

### Controls
- Summary cards: total downloads (all time), total stars, total forks, package count
- Date range: 7 days, 30 days, 90 days, all time
- Package filter: checkboxes to show/hide individual packages
- Signal toggle: downloads vs stars vs forks

### Data loading
Dashboard fetches `data/index.json`, then fetches each daily JSON in parallel, aggregates client-side. Weekly/monthly views computed by summing daily buckets.

## Security

- No secrets in the repo
- Default GITHUB_TOKEN only (read access to public repos)
- No clones data (would need elevated permissions)
- Public repo, public dashboard
