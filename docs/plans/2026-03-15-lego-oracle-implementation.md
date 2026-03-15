# LEGO Oracle Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship an MCP server that grounds LLMs in accurate LEGO data from Rebrickable (sets, parts, colours, inventories, minifigs, themes, MOCs, part relationships).

**Architecture:** Embedded SQLite database built from Rebrickable CSVs at publish time. Daily GitHub Actions sync checks for updates and auto-publishes. 10 tools, stdio transport.

**Tech Stack:** TypeScript, @modelcontextprotocol/sdk, better-sqlite3, zod, vitest, csv-parse

**Reference implementations:** mtg-oracle (SQLite + tools pattern), warhammer-oracle (embedded data + sync workflow)

**Stack profiles to read:** `stacks/mcp/STACK.md`, `stacks/typescript/STACK.md`

---

### Task 1: Project Scaffold

**Files:**
- Create: `projects/lego-oracle/package.json`
- Create: `projects/lego-oracle/tsconfig.json`
- Create: `projects/lego-oracle/.gitignore`
- Create: `projects/lego-oracle/LICENSE`
- Create: `projects/lego-oracle/.github/FUNDING.yml`
- Create: `projects/lego-oracle/CLAUDE.md`

**Step 1: Create project directory and init git**

```bash
mkdir -p projects/lego-oracle && cd projects/lego-oracle
git init
```

**Step 2: Create package.json**

```json
{
  "name": "lego-oracle",
  "version": "0.1.0",
  "description": "LEGO sets, parts, minifigs, and inventories — as an MCP server",
  "type": "module",
  "bin": {
    "lego-oracle": "dist/server.js"
  },
  "files": ["dist", "README.md", "LICENSE"],
  "scripts": {
    "build": "tsc && cp src/data/schema.sql dist/data/schema.sql && chmod 755 dist/server.js",
    "dev": "tsx src/server.ts",
    "lint": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "fetch-data": "tsx scripts/fetch-data.ts",
    "inspect": "npx @modelcontextprotocol/inspector node dist/server.js",
    "prepublishOnly": "npm run build && npm test"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12",
    "better-sqlite3": "^11.0",
    "csv-parse": "^5.6",
    "zod": "^3.25"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6",
    "@types/node": "^22.0",
    "tsx": "^4.0",
    "typescript": "^5.7",
    "vitest": "^3.0"
  },
  "engines": { "node": ">=18" },
  "repository": { "type": "git", "url": "https://github.com/gregario/lego-oracle.git" },
  "license": "MIT",
  "keywords": ["mcp", "model-context-protocol", "lego", "rebrickable", "minifig", "bricks"]
}
```

**Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: Create .gitignore, LICENSE, FUNDING.yml, CLAUDE.md**

- `.gitignore`: node_modules, dist, *.sqlite, .DS_Store, .mcpregistry_*
- `LICENSE`: MIT (copy from mtg-oracle)
- `.github/FUNDING.yml`: `github: [gregario]`
- `CLAUDE.md`: MCP server project instructions referencing stacks/mcp/ and stacks/typescript/

**Step 5: npm install and verify build**

```bash
npm install
npm run lint
```

**Step 6: Commit**

```bash
git add -A
git commit -m "chore: project scaffold"
```

---

### Task 2: SQLite Schema & Database Module

**Files:**
- Create: `src/data/schema.sql`
- Create: `src/data/db.ts`
- Create: `tests/data/db.test.ts`

**Step 1: Write the schema**

```sql
-- Core lookup tables
CREATE TABLE IF NOT EXISTS themes (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id INTEGER,
  FOREIGN KEY (parent_id) REFERENCES themes(id)
);

CREATE TABLE IF NOT EXISTS colors (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  rgb TEXT,
  is_trans INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS part_categories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

-- Main entity tables
CREATE TABLE IF NOT EXISTS parts (
  part_num TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  part_cat_id INTEGER,
  part_material TEXT,
  FOREIGN KEY (part_cat_id) REFERENCES part_categories(id)
);

CREATE TABLE IF NOT EXISTS sets (
  set_num TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  year INTEGER,
  theme_id INTEGER,
  num_parts INTEGER,
  img_url TEXT,
  FOREIGN KEY (theme_id) REFERENCES themes(id)
);

CREATE TABLE IF NOT EXISTS minifigs (
  fig_num TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  num_parts INTEGER,
  img_url TEXT
);

-- Inventory tables (link sets to their contents)
CREATE TABLE IF NOT EXISTS inventories (
  id INTEGER PRIMARY KEY,
  set_num TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (set_num) REFERENCES sets(set_num)
);

CREATE TABLE IF NOT EXISTS inventory_parts (
  inventory_id INTEGER NOT NULL,
  part_num TEXT NOT NULL,
  color_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  is_spare INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (inventory_id) REFERENCES inventories(id),
  FOREIGN KEY (part_num) REFERENCES parts(part_num),
  FOREIGN KEY (color_id) REFERENCES colors(id)
);

CREATE TABLE IF NOT EXISTS inventory_sets (
  inventory_id INTEGER NOT NULL,
  set_num TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (inventory_id) REFERENCES inventories(id),
  FOREIGN KEY (set_num) REFERENCES sets(set_num)
);

CREATE TABLE IF NOT EXISTS inventory_minifigs (
  inventory_id INTEGER NOT NULL,
  fig_num TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (inventory_id) REFERENCES inventories(id),
  FOREIGN KEY (fig_num) REFERENCES minifigs(fig_num)
);

-- Part relationships
CREATE TABLE IF NOT EXISTS part_relationships (
  rel_type TEXT NOT NULL,
  child_part_num TEXT NOT NULL,
  parent_part_num TEXT NOT NULL
);

-- FTS5 search indexes
CREATE VIRTUAL TABLE IF NOT EXISTS sets_fts USING fts5(name, content='sets', content_rowid='rowid');
CREATE VIRTUAL TABLE IF NOT EXISTS parts_fts USING fts5(name, content='parts', content_rowid='rowid');
CREATE VIRTUAL TABLE IF NOT EXISTS minifigs_fts USING fts5(name, content='minifigs', content_rowid='rowid');

-- FTS sync triggers (sets)
CREATE TRIGGER IF NOT EXISTS sets_ai AFTER INSERT ON sets BEGIN
  INSERT INTO sets_fts(rowid, name) VALUES (new.rowid, new.name);
END;
CREATE TRIGGER IF NOT EXISTS sets_ad AFTER DELETE ON sets BEGIN
  INSERT INTO sets_fts(sets_fts, rowid, name) VALUES ('delete', old.rowid, old.name);
END;

-- FTS sync triggers (parts)
CREATE TRIGGER IF NOT EXISTS parts_ai AFTER INSERT ON parts BEGIN
  INSERT INTO parts_fts(rowid, name) VALUES (new.rowid, new.name);
END;
CREATE TRIGGER IF NOT EXISTS parts_ad AFTER DELETE ON parts BEGIN
  INSERT INTO parts_fts(parts_fts, rowid, name) VALUES ('delete', old.rowid, old.name);
END;

-- FTS sync triggers (minifigs)
CREATE TRIGGER IF NOT EXISTS minifigs_ai AFTER INSERT ON minifigs BEGIN
  INSERT INTO minifigs_fts(rowid, name) VALUES (new.rowid, new.name);
END;
CREATE TRIGGER IF NOT EXISTS minifigs_ad AFTER DELETE ON minifigs BEGIN
  INSERT INTO minifigs_fts(minifigs_fts, rowid, name) VALUES ('delete', old.rowid, old.name);
END;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sets_theme ON sets(theme_id);
CREATE INDEX IF NOT EXISTS idx_sets_year ON sets(year);
CREATE INDEX IF NOT EXISTS idx_inventory_parts_part ON inventory_parts(part_num);
CREATE INDEX IF NOT EXISTS idx_inventory_parts_color ON inventory_parts(color_id);
CREATE INDEX IF NOT EXISTS idx_inventory_parts_inv ON inventory_parts(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventories_set ON inventories(set_num);
CREATE INDEX IF NOT EXISTS idx_inventory_minifigs_fig ON inventory_minifigs(fig_num);
CREATE INDEX IF NOT EXISTS idx_inventory_minifigs_inv ON inventory_minifigs(inventory_id);
CREATE INDEX IF NOT EXISTS idx_themes_parent ON themes(parent_id);
CREATE INDEX IF NOT EXISTS idx_part_rel_child ON part_relationships(child_part_num);
CREATE INDEX IF NOT EXISTS idx_part_rel_parent ON part_relationships(parent_part_num);
```

**Step 2: Write db.ts**

TypeScript interfaces for every table row type. `getDatabase(dataDir?)` function (`:memory:` for tests). Schema initialization. Query helpers.

Follow the exact mtg-oracle `src/data/db.ts` pattern: interfaces, constants, schema loading, getDatabase, query helpers.

**Step 3: Write failing tests**

```bash
npx vitest run tests/data/db.test.ts
```

Test: schema creation, in-memory DB, insert/query for each table, FTS5 search works for sets/parts/minifigs.

**Step 4: Make tests pass**

**Step 5: Commit**

```bash
git commit -m "feat: SQLite schema and database module"
```

---

### Task 3: CSV Fetch & Ingestion Pipeline

**Files:**
- Create: `src/data/rebrickable.ts`
- Create: `scripts/fetch-data.ts`
- Create: `tests/data/rebrickable.test.ts`

**Step 1: Write rebrickable.ts**

Functions to parse each Rebrickable CSV into the database. Rebrickable CSVs use standard comma-delimited format with headers. Files to parse:

- `themes.csv` → themes table
- `colors.csv` → colors table
- `part_categories.csv` → part_categories table
- `parts.csv` → parts table
- `sets.csv` → sets table
- `minifigs.csv` → minifigs table
- `inventories.csv` → inventories table
- `inventory_parts.csv` → inventory_parts table
- `inventory_sets.csv` → inventory_sets table
- `inventory_minifigs.csv` → inventory_minifigs table
- `part_relationships.csv` → part_relationships table

Use `csv-parse/sync` for parsing. Batch inserts in transactions (BATCH_SIZE = 1000).

**Step 2: Write fetch-data.ts script**

Downloads CSVs from `https://cdn.rebrickable.com/media/downloads/{filename}.csv.gz`. Gunzips. Ingests into a SQLite DB at `src/data/lego.sqlite`. This DB gets copied into `dist/data/` at build time.

The script should:
1. Download all CSV.gz files
2. Gunzip to temp directory
3. Open/create SQLite DB
4. Clear existing data
5. Ingest all CSVs in dependency order (themes before sets, etc.)
6. Log counts for each table

**Step 3: Write tests for CSV parsing**

Test with small inline CSV strings (not real downloads). Test each ingester function: correct row counts, foreign keys, FTS5 population.

**Step 4: Run fetch-data manually to verify**

```bash
npm run fetch-data
```

Verify the SQLite file is created and populated.

**Step 5: Update build script**

Ensure `npm run build` copies `src/data/lego.sqlite` to `dist/data/lego.sqlite` alongside schema.sql.

**Step 6: Commit**

```bash
git commit -m "feat: Rebrickable CSV fetch and ingestion pipeline"
```

---

### Task 4: Tools — search_sets & get_set

**Files:**
- Create: `src/tools/search-sets.ts`
- Create: `src/tools/get-set.ts`
- Create: `src/format.ts`
- Create: `tests/tools/search-sets.test.ts`
- Create: `tests/tools/get-set.test.ts`

**Step 1: Write test fixtures**

Create a `tests/fixtures.ts` with helper functions that seed an in-memory DB with a handful of known LEGO sets, parts, themes, colours, inventories, minifigs. Reuse across all tool tests. Include:
- 2-3 themes (one with parent hierarchy)
- 3-4 sets across those themes
- 5-6 parts with different categories and colours
- 2-3 minifigs linked to sets via inventories
- Inventory entries linking everything together

**Step 2: Write failing tests for search_sets**

Test: FTS5 name search, theme filter (including recursive sub-themes), year range, piece count range, combined filters, empty results, result limit.

**Step 3: Implement search_sets**

Zod input schema. Handler builds SQL dynamically from filters. FTS5 for name queries. Theme filter uses recursive CTE to include sub-themes. Returns set_num, name, year, theme name, num_parts.

**Step 4: Write failing tests for get_set**

Test: exact set number match, fuzzy name match, not found with suggestions, full inventory grouped by category, minifig list included.

**Step 5: Implement get_set**

Lookup by set_num (exact) or name (FTS5 fallback). Returns full details: set info, theme path (walk parent_id chain), inventory (parts grouped by category with colour names and quantities), minifig list, sub-sets.

**Step 6: Write formatters**

`formatSearchSets(result)` and `formatGetSet(result)` in `format.ts`. Readable markdown text, not JSON. Follow mtg-oracle format.ts pattern.

**Step 7: Run all tests**

```bash
npm test
```

**Step 8: Commit**

```bash
git commit -m "feat: search_sets and get_set tools"
```

---

### Task 5: Tools — search_parts, get_part, find_part_in_sets

**Files:**
- Create: `src/tools/search-parts.ts`
- Create: `src/tools/get-part.ts`
- Create: `src/tools/find-part-in-sets.ts`
- Create: `tests/tools/search-parts.test.ts`
- Create: `tests/tools/get-part.test.ts`
- Create: `tests/tools/find-part-in-sets.test.ts`

**Step 1: Write failing tests for all three tools**

search_parts: FTS5 name, category filter, colour filter (by name or ID), material filter, combined, empty.
get_part: exact part_num, not found, includes alternates/molds/prints from part_relationships.
find_part_in_sets: part_num + optional colour, returns sets sorted by quantity descending, includes set name and year.

**Step 2: Implement all three tools + formatters**

search_parts: FTS5 on parts_fts, join part_categories for category filter, join inventory_parts + colors for colour filter.
get_part: Lookup by part_num. Query part_relationships for related parts.
find_part_in_sets: Join inventory_parts → inventories → sets. Group by set, sum quantities.

**Step 3: Add formatters to format.ts**

**Step 4: Run tests, commit**

```bash
git commit -m "feat: search_parts, get_part, find_part_in_sets tools"
```

---

### Task 6: Tools — search_minifigs, get_minifig

**Files:**
- Create: `src/tools/search-minifigs.ts`
- Create: `src/tools/get-minifig.ts`
- Create: `tests/tools/search-minifigs.test.ts`
- Create: `tests/tools/get-minifig.test.ts`

**Step 1: Write failing tests**

search_minifigs: FTS5 name search, result limit, empty results.
get_minifig: exact fig_num, fuzzy name match, not found, includes all sets the minifig appears in (via inventory_minifigs → inventories → sets) with year and theme.

**Step 2: Implement + formatters**

**Step 3: Run tests, commit**

```bash
git commit -m "feat: search_minifigs and get_minifig tools"
```

---

### Task 7: Tools — browse_themes, find_mocs, compare_sets

**Files:**
- Create: `src/tools/browse-themes.ts`
- Create: `src/tools/find-mocs.ts`
- Create: `src/tools/compare-sets.ts`
- Create: `tests/tools/browse-themes.test.ts`
- Create: `tests/tools/find-mocs.test.ts`
- Create: `tests/tools/compare-sets.test.ts`

**Step 1: Write failing tests**

browse_themes: no input (top-level themes with set counts), with theme name (sub-themes + sets), unknown theme.
find_mocs: set_num → list of MOC builds using that set's parts. Empty if no MOCs. Note: MOC data may not be in the standard Rebrickable CSV downloads. If not available, this tool returns a helpful message explaining MOCs are community-contributed and linking to Rebrickable.
compare_sets: 2-4 set numbers side by side: piece count, year, theme, minifig count, shared parts count.

**Step 2: Implement + formatters**

browse_themes: Recursive CTE for theme tree. Count sets per theme.
find_mocs: Query from moc/moc_parts tables if available.
compare_sets: Multiple get_set lookups + intersection query on inventory_parts for shared parts.

**Step 3: Run tests, commit**

```bash
git commit -m "feat: browse_themes, find_mocs, compare_sets tools"
```

---

### Task 8: MCP Server Integration

**Files:**
- Create: `src/server.ts`
- Modify: `tests/` (add integration test)

**Step 1: Write server.ts**

Entry point with shebang. Load embedded SQLite DB from `dist/data/lego.sqlite`. Register all 10 tools with LLM-facing descriptions. stdio transport. Follow mtg-oracle server.ts pattern exactly.

Tool descriptions must explain WHEN to call each tool and how it differs from similar tools (e.g., search_sets vs get_set).

**Step 2: Write integration test**

Test: server starts, all 10 tools registered, a simple tool call returns expected format.

**Step 3: Build and verify**

```bash
npm run build
npm test
node dist/server.js  # verify it starts without error (ctrl-c to exit)
```

**Step 4: Commit**

```bash
git commit -m "feat: MCP server entry point with all 10 tools"
```

---

### Task 9: README & Publishing Artifacts

**Files:**
- Create: `README.md` (centered badges, IDE configs, tool table, attribution)
- Create: `status.json`
- Create: `glama.json`
- Create: `server.json` (MCP registry)
- Create: `Dockerfile` (for Glama inspection)

**Step 1: Write README**

Follow godot-forge/brewers-almanack pattern:
- `<!-- mcp-name: io.github.gregario/lego-oracle -->`
- Centered `<p align="center">` header with badges (npm version, downloads, MIT, Node 18+, MCP Compatible)
- Glama card badge
- Tool table (all 10)
- IDE config snippets (Claude Code, Claude Desktop, Cursor, VS Code, Windsurf, Zed)
- Data attribution to Rebrickable
- LEGO trademark notice
- No em dashes (use colons, periods, parentheses per tone-of-voice guide)

**Step 2: Write publishing artifacts**

- `glama.json` with maintainers and related servers (godot-forge, brewers-almanack, warhammer-oracle, mtg-oracle)
- `server.json` for MCP registry with mcpName `io.github.gregario/lego-oracle`
- `Dockerfile` for Glama inspection (node:22-slim, copy dist, ENTRYPOINT)
- `status.json` tracking all publishing state

**Step 3: Commit**

```bash
git commit -m "docs: README, Glama, MCP registry, Dockerfile, status.json"
```

---

### Task 10: GitHub Actions Sync Workflow

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/sync-data.yml`

**Step 1: Write CI workflow**

On push/PR to main: install, build, test. Use actions/checkout@v6, actions/setup-node@v6.

**Step 2: Write sync-data workflow**

Daily cron (06:00 UTC) + manual trigger. Steps:
1. Checkout
2. Setup node 22 with registry-url
3. npm ci
4. Run fetch-data script
5. Check for data changes (git diff src/data/)
6. If changed: build, test, commit, pull --rebase, push
7. If changed: npm version patch, build, npm publish --access public --provenance, commit version bump, pull --rebase, push

Permissions: contents: write, id-token: write (OIDC trusted publishing).

**Step 3: Commit**

```bash
git commit -m "ci: add CI and daily Rebrickable sync workflows"
```

---

### Task 11: GitHub Repo & First Publish

**Step 1: Create GitHub repo**

```bash
gh repo create gregario/lego-oracle --public --description "LEGO sets, parts, minifigs, and inventories as an MCP server"
git remote add origin https://github.com/gregario/lego-oracle.git
```

**Step 2: Push all commits**

```bash
git push -u origin main
```

**Step 3: Fetch data and build**

```bash
npm run fetch-data
npm run build
npm test
```

**Step 4: First npm publish**

```bash
npm publish --access public
```

**Step 5: Post-publish checklist**

- Set up OIDC trusted publishing on npmjs.com (publisher: GitHub Actions, org: gregario, repo: lego-oracle, workflow: sync-data.yml)
- Enable Sponsorships in repo settings
- Claim ownership on Glama
- Run `mcp-publisher publish` for MCP registry
- Verify `npx -y lego-oracle` works from clean directory
- Update status.json with all completed steps

**Step 6: Commit status.json update**

```bash
git commit -m "chore: update status.json after first publish"
git push
```

**Step 7: DO NOT submit awesome-mcp-servers PR yet — wait for Glama full green**

---

## Execution Priority

Tasks 1-8 are the core build. Task 9-10 are publishing prep. Task 11 is ship.

Total estimated tools: 10. Total estimated tests: 100+. Follows mtg-oracle + warhammer-oracle patterns exactly.
