# 3dprint-oracle Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an MCP server that gives LLMs authoritative access to 7k+ 3D printing filaments (SpoolmanDB) and curated material science knowledge.

**Architecture:** Build-time SQLite (SpoolmanDB JSON + curated knowledge JSON → SQLite via fetch script, bundled in npm). MCP server loads DB at startup, exposes 8 tools via stdio. Follows lego-oracle pattern exactly.

**Tech Stack:** TypeScript, @modelcontextprotocol/sdk, better-sqlite3, zod, vitest

**Reference project:** `projects/lego-oracle/` — same architecture (fetch script → SQLite → MCP tools).

---

### Task 1: Project Scaffolding

**Files:**
- Create: `projects/3dprint-oracle/package.json`
- Create: `projects/3dprint-oracle/tsconfig.json`
- Create: `projects/3dprint-oracle/CLAUDE.md`
- Create: `projects/3dprint-oracle/README.md`
- Create: `projects/3dprint-oracle/LICENSE`
- Create: `projects/3dprint-oracle/.gitignore`
- Create: `projects/3dprint-oracle/.github/FUNDING.yml`

**Step 1: Create project directory and initialize**

```bash
mkdir -p projects/3dprint-oracle/src/{tools,data}
mkdir -p projects/3dprint-oracle/tests
mkdir -p projects/3dprint-oracle/scripts
mkdir -p projects/3dprint-oracle/data/knowledge
mkdir -p projects/3dprint-oracle/.github
```

**Step 2: Create package.json**

```json
{
  "name": "3dprint-oracle",
  "version": "0.1.0",
  "description": "3D printing filament and materials knowledge MCP server",
  "type": "module",
  "main": "dist/server.js",
  "bin": {
    "3dprint-oracle": "dist/server.js"
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "build": "tsc && mkdir -p dist/data && cp src/data/schema.sql dist/data/schema.sql && (test -f src/data/3dprint.sqlite && cp src/data/3dprint.sqlite dist/data/3dprint.sqlite || true) && chmod +x dist/server.js",
    "dev": "tsx src/server.ts",
    "lint": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "fetch-data": "tsx scripts/fetch-data.ts",
    "inspect": "npx @modelcontextprotocol/inspector node dist/server.js"
  },
  "engines": { "node": ">=18.0.0" },
  "keywords": ["mcp", "3d-printing", "filament", "materials", "fdm"],
  "mcpName": "io.github.gregario/3dprint-oracle",
  "author": "gregario",
  "license": "MIT",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12",
    "better-sqlite3": "^12.8",
    "zod": "^3.25"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6",
    "@types/node": "^22.0",
    "tsx": "^4.0",
    "typescript": "^5.7",
    "vitest": "^3.0"
  }
}
```

**Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests", "scripts"]
}
```

**Step 4: Create CLAUDE.md**

Reference `../../stacks/mcp/` and `../../stacks/typescript/`. Note: embedded data pattern, SpoolmanDB source, 8 tools, build-time SQLite.

**Step 5: Create README.md with badges, LICENSE (MIT), .gitignore, .github/FUNDING.yml**

Follow the factory README badge pill pattern. `.gitignore` should exclude: node_modules, dist, *.sqlite (data is fetched, not committed), .env.

**Step 6: Initialize git repo**

```bash
cd projects/3dprint-oracle && git init && npm install
```

**Step 7: Commit scaffold**

```bash
git add -A && git commit -m "chore: scaffold 3dprint-oracle MCP server"
```

---

### Task 2: SQLite Schema and Database Layer

**Files:**
- Create: `projects/3dprint-oracle/src/data/schema.sql`
- Create: `projects/3dprint-oracle/src/data/db.ts`
- Create: `projects/3dprint-oracle/tests/db.test.ts`

**Step 1: Write failing test for database initialization**

```typescript
// tests/db.test.ts
import { describe, it, expect } from 'vitest';
import { getDatabase, getTableNames } from '../src/data/db.js';

describe('database', () => {
  it('creates all tables in memory', () => {
    const db = getDatabase(':memory:');
    const tables = getTableNames(db);
    expect(tables).toContain('filaments');
    expect(tables).toContain('manufacturers');
    expect(tables).toContain('materials');
    expect(tables).toContain('material_profiles');
    expect(tables).toContain('troubleshooting');
    expect(tables).toContain('filaments_fts');
    db.close();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd projects/3dprint-oracle && npx vitest run tests/db.test.ts`
Expected: FAIL — modules don't exist yet

**Step 3: Create schema.sql**

```sql
-- Manufacturers
CREATE TABLE IF NOT EXISTS manufacturers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  website TEXT,
  country TEXT
);

-- Materials (from SpoolmanDB materials.json)
CREATE TABLE IF NOT EXISTS materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  density REAL,
  extruder_temp INTEGER,
  bed_temp INTEGER
);

-- Filaments (expanded: one row per filament×color×diameter×weight combo)
CREATE TABLE IF NOT EXISTS filaments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  manufacturer_id INTEGER NOT NULL REFERENCES manufacturers(id),
  material_id INTEGER NOT NULL REFERENCES materials(id),
  material_name TEXT NOT NULL,
  density REAL,
  diameter REAL NOT NULL,
  weight REAL,
  spool_weight REAL,
  extruder_temp INTEGER,
  extruder_temp_min INTEGER,
  extruder_temp_max INTEGER,
  bed_temp INTEGER,
  bed_temp_min INTEGER,
  bed_temp_max INTEGER,
  color_name TEXT,
  color_hex TEXT,
  finish TEXT,
  translucent INTEGER DEFAULT 0,
  glow INTEGER DEFAULT 0
);

-- FTS5 for filament search
CREATE VIRTUAL TABLE IF NOT EXISTS filaments_fts USING fts5(
  name,
  color_name,
  content='filaments',
  content_rowid='id',
  tokenize='porter unicode61'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS filaments_ai AFTER INSERT ON filaments BEGIN
  INSERT INTO filaments_fts(rowid, name, color_name)
  VALUES (new.id, new.name, new.color_name);
END;

-- Material profiles (curated knowledge layer)
CREATE TABLE IF NOT EXISTS material_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  material_name TEXT NOT NULL UNIQUE,
  print_temp_min INTEGER,
  print_temp_max INTEGER,
  bed_temp_min INTEGER,
  bed_temp_max INTEGER,
  strength TEXT NOT NULL,
  flexibility TEXT NOT NULL,
  uv_resistance TEXT NOT NULL,
  food_safe TEXT NOT NULL,
  moisture_sensitivity TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  typical_uses TEXT NOT NULL,
  pros TEXT NOT NULL,
  cons TEXT NOT NULL,
  nozzle_notes TEXT,
  enclosure_needed INTEGER DEFAULT 0
);

-- Troubleshooting (curated knowledge layer)
CREATE TABLE IF NOT EXISTS troubleshooting (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symptom TEXT NOT NULL,
  material_name TEXT,
  cause TEXT NOT NULL,
  fix TEXT NOT NULL,
  probability TEXT NOT NULL DEFAULT 'medium'
);
```

**Step 4: Create db.ts**

Follow lego-oracle's `src/data/db.ts` pattern exactly:
- `getDatabase(dataDir?)` — opens SQLite, applies schema, returns `Database.Database`
- `:memory:` support for tests
- WAL mode + foreign keys pragmas
- `getTableNames(db)` helper
- Read helpers: `searchFilaments(db, query, filters, limit, offset)`, `getFilamentById(db, id)`, `listManufacturers(db, materialFilter?)`, `listMaterials(db)`, `getMaterialProfile(db, name)`, `getCompareMaterials(db, names)`, `getTroubleshooting(db, symptom, material?)`

**Step 5: Run test to verify it passes**

Run: `cd projects/3dprint-oracle && npx vitest run tests/db.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add -A && git commit -m "feat: add SQLite schema and database layer"
```

---

### Task 3: Data Fetch Script (SpoolmanDB Ingestion)

**Files:**
- Create: `projects/3dprint-oracle/scripts/fetch-data.ts`
- Create: `projects/3dprint-oracle/tests/fetch-data.test.ts`

**Step 1: Write failing test for SpoolmanDB parsing**

Test that the fetch script can parse a sample SpoolmanDB manufacturer JSON into the expected flat filament rows. Use a fixture JSON, not a live fetch.

```typescript
// tests/fetch-data.test.ts
import { describe, it, expect } from 'vitest';
import { parseManufacturerFile, type RawManufacturerFile } from '../scripts/fetch-data.js';

const SAMPLE: RawManufacturerFile = {
  manufacturer: 'TestCo',
  filaments: [{
    name: '{color_name}',
    material: 'PLA',
    density: 1.24,
    weights: [{ weight: 1000, spool_weight: 250 }],
    diameters: [1.75],
    extruder_temp: 210,
    colors: [
      { name: 'Red', hex: 'FF0000' },
      { name: 'Blue', hex: '0000FF' },
    ],
  }],
};

describe('parseManufacturerFile', () => {
  it('expands filaments into one row per color×diameter×weight', () => {
    const rows = parseManufacturerFile(SAMPLE);
    // 1 filament × 2 colors × 1 diameter × 1 weight = 2 rows
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe('Red');
    expect(rows[0].manufacturer).toBe('TestCo');
    expect(rows[0].material).toBe('PLA');
    expect(rows[0].color_hex).toBe('FF0000');
    expect(rows[1].name).toBe('Blue');
  });

  it('expands multiple diameters', () => {
    const multi = { ...SAMPLE, filaments: [{
      ...SAMPLE.filaments[0],
      diameters: [1.75, 2.85],
    }] };
    const rows = parseManufacturerFile(multi);
    expect(rows).toHaveLength(4); // 2 colors × 2 diameters
  });
});
```

**Step 2: Run test to verify it fails**

**Step 3: Implement fetch-data.ts**

Follow lego-oracle's `scripts/fetch-data.ts` pattern:
1. Fetch all files from `https://raw.githubusercontent.com/Donkie/SpoolmanDB/{COMMIT_HASH}/filaments/*.json` using GitHub API to list files, then fetch each
2. Fetch `materials.json` for the materials list
3. Parse each manufacturer JSON with `parseManufacturerFile()` — expand the combinatorial: for each filament entry, for each color × diameter × weight, produce one flat row
4. Insert into SQLite: manufacturers, materials, then filaments
5. Build FTS5 index (automatic via triggers)
6. Report counts

Key: SpoolmanDB filament `name` uses `{color_name}` placeholder — replace with actual color name.

Key: `extruder_temp` can be a single int OR `extruder_temp_range` can be `[min, max]`. Same for `bed_temp` / `bed_temp_range`. Handle both.

Pin to a specific commit hash (get current HEAD at implementation time).

**Step 4: Run tests to verify they pass**

**Step 5: Run the actual fetch script to verify end-to-end**

```bash
cd projects/3dprint-oracle && npm run fetch-data
```

Expected: Downloads data, creates `src/data/3dprint.sqlite`, reports filament/manufacturer/material counts.

**Step 6: Commit**

```bash
git add -A && git commit -m "feat: add SpoolmanDB fetch and ingestion script"
```

---

### Task 4: Curated Knowledge Layer

**Files:**
- Create: `projects/3dprint-oracle/data/knowledge/material-profiles.json`
- Create: `projects/3dprint-oracle/data/knowledge/troubleshooting.json`
- Create: `projects/3dprint-oracle/tests/knowledge.test.ts`

**Step 1: Write failing test for knowledge data validity**

```typescript
// tests/knowledge.test.ts
import { describe, it, expect } from 'vitest';
import materialProfiles from '../data/knowledge/material-profiles.json';
import troubleshooting from '../data/knowledge/troubleshooting.json';

describe('material-profiles.json', () => {
  it('has profiles for core materials', () => {
    const names = materialProfiles.map((p: any) => p.material_name);
    expect(names).toContain('PLA');
    expect(names).toContain('PETG');
    expect(names).toContain('ABS');
    expect(names).toContain('TPU');
    expect(names).toContain('Nylon');
    expect(names).toContain('ASA');
    expect(names).toContain('PC');
    expect(names).toContain('PVA');
  });

  it('each profile has required fields', () => {
    for (const p of materialProfiles) {
      expect(p).toHaveProperty('material_name');
      expect(p).toHaveProperty('strength');
      expect(p).toHaveProperty('flexibility');
      expect(p).toHaveProperty('difficulty');
      expect(p).toHaveProperty('typical_uses');
    }
  });
});

describe('troubleshooting.json', () => {
  it('has entries for common symptoms', () => {
    const symptoms = [...new Set(troubleshooting.map((t: any) => t.symptom))];
    expect(symptoms).toContain('stringing');
    expect(symptoms).toContain('warping');
    expect(symptoms).toContain('poor layer adhesion');
  });
});
```

**Step 2: Run test to verify it fails**

**Step 3: Create material-profiles.json**

Curate authoritative data for 8 core materials: PLA, PETG, ABS, TPU (Flexible), Nylon, ASA, PC (Polycarbonate), PVA. Each entry:

```json
{
  "material_name": "PLA",
  "print_temp_min": 190,
  "print_temp_max": 220,
  "bed_temp_min": 20,
  "bed_temp_max": 60,
  "strength": "moderate",
  "flexibility": "low",
  "uv_resistance": "poor",
  "food_safe": "conditionally (FDA-approved base, but printing creates porous surface)",
  "moisture_sensitivity": "low",
  "difficulty": "beginner",
  "typical_uses": "Prototyping, decorative items, low-stress functional parts, figurines",
  "pros": "Easy to print, low warping, no heated bed required, biodegradable, odourless",
  "cons": "Low heat resistance (softens ~60°C), brittle, poor UV resistance, poor outdoor durability",
  "nozzle_notes": "Any standard brass nozzle works",
  "enclosure_needed": false
}
```

Use authoritative 3D printing references. Be precise on temperatures and properties.

**Step 4: Create troubleshooting.json**

Curate entries for 7 common symptoms: stringing, warping, poor layer adhesion, elephant's foot, clogging, under-extrusion, over-extrusion. Each entry:

```json
{
  "symptom": "stringing",
  "material_name": "PETG",
  "cause": "Print temperature too high",
  "fix": "Lower nozzle temperature by 5°C increments. PETG is especially prone to stringing — start at the low end of its temp range (220°C).",
  "probability": "high"
}
```

Include both material-specific entries (where material_name is set) and general entries (where material_name is null).

**Step 5: Update fetch-data.ts to also ingest knowledge files**

Add a step after SpoolmanDB ingestion that reads `data/knowledge/*.json` and inserts into `material_profiles` and `troubleshooting` tables.

**Step 6: Run tests to verify they pass**

**Step 7: Run fetch-data again and verify knowledge data is in the SQLite DB**

**Step 8: Commit**

```bash
git add -A && git commit -m "feat: add curated material knowledge layer"
```

---

### Task 5: MCP Server Entry Point

**Files:**
- Create: `projects/3dprint-oracle/src/server.ts`
- Create: `projects/3dprint-oracle/tests/server.test.ts`

**Step 1: Write failing test for server startup and tool listing**

```typescript
// tests/server.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.js';

describe('3dprint-oracle server', () => {
  let client: Client;

  beforeAll(async () => {
    const server = createServer({ dbPath: ':memory:' });
    client = new Client({ name: 'test-client', version: '1.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([
      client.connect(clientTransport),
      server.connect(serverTransport),
    ]);
  });

  it('lists 8 tools', async () => {
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(8);
    const names = tools.map(t => t.name);
    expect(names).toContain('search_filaments');
    expect(names).toContain('get_filament');
    expect(names).toContain('list_manufacturers');
    expect(names).toContain('list_materials');
    expect(names).toContain('get_material_profile');
    expect(names).toContain('compare_materials');
    expect(names).toContain('recommend_material');
    expect(names).toContain('diagnose_print_issue');
  });
});
```

**Step 2: Run test to verify it fails**

**Step 3: Implement server.ts**

```typescript
#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getDatabase } from './data/db.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Import tool registration functions
import { registerSearchFilaments } from './tools/search-filaments.js';
import { registerGetFilament } from './tools/get-filament.js';
import { registerListManufacturers } from './tools/list-manufacturers.js';
import { registerListMaterials } from './tools/list-materials.js';
import { registerGetMaterialProfile } from './tools/get-material-profile.js';
import { registerCompareMaterials } from './tools/compare-materials.js';
import { registerRecommendMaterial } from './tools/recommend-material.js';
import { registerDiagnosePrintIssue } from './tools/diagnose-print-issue.js';

export interface ServerOptions {
  dbPath?: string;
}

export function createServer(options?: ServerOptions): McpServer {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'));

  const server = new McpServer({
    name: '3dprint-oracle',
    version: pkg.version,
  });

  const db = getDatabase(options?.dbPath);

  // Register all tools
  registerSearchFilaments(server, db);
  registerGetFilament(server, db);
  registerListManufacturers(server, db);
  registerListMaterials(server, db);
  registerGetMaterialProfile(server, db);
  registerCompareMaterials(server, db);
  registerRecommendMaterial(server, db);
  registerDiagnosePrintIssue(server, db);

  return server;
}

// Only start stdio transport when run directly (not imported for tests)
const isMain = process.argv[1] && fileURLToPath(import.meta.url).includes(process.argv[1]);
if (isMain) {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.on('SIGINT', async () => { await server.close(); process.exit(0); });
  process.on('SIGTERM', async () => { await server.close(); process.exit(0); });
}
```

Note: For the test to pass with `:memory:`, the in-memory DB needs schema + some seed data. Either seed in the test `beforeAll`, or have `createServer` handle empty DB gracefully (tools return empty results, not crashes).

**Step 4: Create stub tool files** (one per tool, just registration with placeholder handlers returning empty content)

Each tool file: `src/tools/<name>.ts` exports `register<Name>(server, db)`. Stub returns `{ content: [{ type: 'text', text: 'Not implemented' }] }`.

**Step 5: Run test to verify it passes**

**Step 6: Commit**

```bash
git add -A && git commit -m "feat: add MCP server with 8 tool stubs"
```

---

### Task 6: Database Tools (search-filaments, get-filament, list-manufacturers, list-materials)

**Files:**
- Modify: `projects/3dprint-oracle/src/tools/search-filaments.ts`
- Modify: `projects/3dprint-oracle/src/tools/get-filament.ts`
- Modify: `projects/3dprint-oracle/src/tools/list-manufacturers.ts`
- Modify: `projects/3dprint-oracle/src/tools/list-materials.ts`
- Create: `projects/3dprint-oracle/tests/tools/search-filaments.test.ts`
- Create: `projects/3dprint-oracle/tests/tools/get-filament.test.ts`
- Create: `projects/3dprint-oracle/tests/tools/list-manufacturers.test.ts`
- Create: `projects/3dprint-oracle/tests/tools/list-materials.test.ts`

**Important:** Tests need a seeded in-memory database. Create a test helper:

```typescript
// tests/helpers/test-db.ts
import { getDatabase } from '../../src/data/db.js';
import Database from 'better-sqlite3';

export function createTestDb(): Database.Database {
  const db = getDatabase(':memory:');
  // Seed with test data
  db.prepare('INSERT INTO manufacturers (name) VALUES (?)').run('TestCo');
  db.prepare('INSERT INTO manufacturers (name) VALUES (?)').run('OtherCo');
  db.prepare('INSERT INTO materials (name, density) VALUES (?, ?)').run('PLA', 1.24);
  db.prepare('INSERT INTO materials (name, density) VALUES (?, ?)').run('PETG', 1.27);
  const mfr1 = 1, mfr2 = 2, mat1 = 1, mat2 = 2;
  db.prepare(`INSERT INTO filaments (name, manufacturer_id, material_id, material_name, density, diameter, weight, extruder_temp, color_name, color_hex)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run('TestCo PLA Red', mfr1, mat1, 'PLA', 1.24, 1.75, 1000, 210, 'Red', 'FF0000');
  db.prepare(`INSERT INTO filaments (name, manufacturer_id, material_id, material_name, density, diameter, weight, extruder_temp, color_name, color_hex)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run('TestCo PETG Blue', mfr1, mat2, 'PETG', 1.27, 1.75, 1000, 230, 'Blue', '0000FF');
  db.prepare(`INSERT INTO filaments (name, manufacturer_id, material_id, material_name, density, diameter, weight, extruder_temp, color_name, color_hex)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run('OtherCo PLA White', mfr2, mat1, 'PLA', 1.24, 2.85, 750, 205, 'White', 'FFFFFF');
  return db;
}
```

For each tool, follow strict TDD:
1. Write failing test (tool call via Client + InMemoryTransport returns expected data)
2. Run test, verify fail
3. Implement tool (Zod input schema, SQL query, format output)
4. Run test, verify pass
5. Commit

**Tool input schemas (Zod):**

- `search_filaments`: `{ query: z.string(), material?: z.string(), manufacturer?: z.string(), diameter?: z.number(), limit?: z.number().default(20), offset?: z.number().default(0) }`
- `get_filament`: `{ id?: z.number(), name?: z.string() }` (one required)
- `list_manufacturers`: `{ material?: z.string() }`
- `list_materials`: `{}`

**FTS5 search note:** Use `filaments_fts MATCH ?` with the query. Sanitize FTS5 input by escaping special chars. Join back to filaments table for full data.

**Commit after all 4 database tools pass:**

```bash
git add -A && git commit -m "feat: implement database tools (search, get, list)"
```

---

### Task 7: Knowledge Tools (get-material-profile, compare-materials, recommend-material, diagnose-print-issue)

**Files:**
- Modify: `projects/3dprint-oracle/src/tools/get-material-profile.ts`
- Modify: `projects/3dprint-oracle/src/tools/compare-materials.ts`
- Modify: `projects/3dprint-oracle/src/tools/recommend-material.ts`
- Modify: `projects/3dprint-oracle/src/tools/diagnose-print-issue.ts`
- Create: `projects/3dprint-oracle/tests/tools/get-material-profile.test.ts`
- Create: `projects/3dprint-oracle/tests/tools/compare-materials.test.ts`
- Create: `projects/3dprint-oracle/tests/tools/recommend-material.test.ts`
- Create: `projects/3dprint-oracle/tests/tools/diagnose-print-issue.test.ts`

**Important:** Tests need knowledge data seeded. Extend the test helper or create a `seedKnowledge(db)` function that inserts a few material profiles and troubleshooting entries.

For each tool, strict TDD as in Task 6.

**Tool specifics:**

- `get_material_profile`: `{ material: z.string() }` — query `material_profiles` table, return formatted profile. Error with `isError: true` if not found, list available materials.

- `compare_materials`: `{ materials: z.array(z.string()).min(2).max(3) }` — query profiles for each material, format as side-by-side comparison table. Error if < 2 or any not found.

- `recommend_material`: `{ requirements: z.object({ strength?: z.string(), flexibility?: z.string(), heat_resistance?: z.string(), food_safe?: z.boolean(), outdoor_use?: z.boolean(), ease_of_printing?: z.string(), budget?: z.string() }).refine(obj => Object.values(obj).some(v => v !== undefined)) }` — score each material profile against requirements, return ranked list with reasoning. This is the most complex tool — scoring logic should be straightforward (match property → +1, mismatch → -1, use difficulty for ease_of_printing).

- `diagnose_print_issue`: `{ symptom: z.string(), material?: z.string() }` — query troubleshooting table by symptom, optionally filter by material. Return causes and fixes ranked by probability. Error if symptom not recognized, list known symptoms.

**Commit after all 4 knowledge tools pass:**

```bash
git add -A && git commit -m "feat: implement knowledge tools (profile, compare, recommend, diagnose)"
```

---

### Task 8: Integration Tests and Polish

**Files:**
- Create: `projects/3dprint-oracle/tests/integration.test.ts`
- Modify: `projects/3dprint-oracle/README.md`
- Create: `projects/3dprint-oracle/status.json`

**Step 1: Write integration tests**

Full end-to-end: `createServer({ dbPath })` with real SQLite (from `npm run fetch-data`), call each tool with realistic inputs, verify responses contain expected content.

```typescript
// tests/integration.test.ts
describe('integration: full database', () => {
  // Only runs if src/data/3dprint.sqlite exists
  // Uses actual SpoolmanDB data
  it('search_filaments finds Bambu Lab PLA', async () => { ... });
  it('get_filament returns specs', async () => { ... });
  it('list_manufacturers includes 50+ manufacturers', async () => { ... });
  it('get_material_profile returns PLA profile', async () => { ... });
  it('diagnose_print_issue returns fixes for stringing', async () => { ... });
});
```

**Step 2: Review all tool descriptions for LLM clarity**

Read each tool's `description` and parameter `.describe()` strings. Ensure they tell an LLM exactly when and how to use the tool.

**Step 3: Update README with full documentation**

- Tool table (name, description, example input/output)
- Installation instructions (`npx 3dprint-oracle` or Claude Desktop config)
- Data source attribution (SpoolmanDB, MIT)

**Step 4: Create status.json**

```json
{
  "version": "0.1.0",
  "tools_count": 8,
  "tests_count": 0,
  "npm": { "published": false },
  "glama": { "listed": false },
  "mcp_registry": { "registered": false },
  "awesome_mcp_servers": { "pr_submitted": false },
  "github": { "release_tag": null, "sponsor_enabled": false },
  "ci": { "oidc_publishing": false }
}
```

Update `tests_count` after final test run.

**Step 5: Run all tests**

```bash
cd projects/3dprint-oracle && npm test
```

Expected: All pass.

**Step 6: Run MCP QA**

Use `/mcp-qa` skill to verify server works end-to-end.

**Step 7: Commit**

```bash
git add -A && git commit -m "feat: add integration tests, README docs, status.json"
```

---

### Task 9: GitHub Repo and Publishing Prep

**Step 1: Create GitHub repo**

```bash
cd projects/3dprint-oracle && gh repo create gregario/3dprint-oracle --public --source=. --push
```

**Step 2: Publish to npm**

```bash
npm run build && npm publish
```

**Step 3: List on registries (Glama, MCP Registry)**

Follow `stacks/mcp/publishing.md` for registry listing steps.

**Step 4: Create GitHub release**

```bash
gh release create v0.1.0 --title "v0.1.0" --notes "Initial release: 8 tools, SpoolmanDB + curated knowledge layer"
```

**Step 5: Update status.json with publishing state**

**Step 6: Final commit**

```bash
git add -A && git commit -m "chore: update status.json after publishing"
```
