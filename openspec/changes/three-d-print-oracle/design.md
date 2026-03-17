## Context

The AI-Factory has shipped 4 MCP oracle servers (mtg-oracle, lego-oracle, warhammer-oracle, brewers-almanack) following a proven pattern: open dataset → build-time SQLite → MCP tools. 3dprint-oracle follows this pattern exactly, using SpoolmanDB (MIT, 7k filament entries) as the primary data source and adding a hand-curated material science knowledge layer.

Primary persona: hobbyist maker (new-to-intermediate 3D printer owner) who asks LLMs for printing advice and gets hallucinated material properties.

Competition: PrusaMCP (~30 filaments, Prusa-centric) is the only partial overlap. No other MCP server covers 3D printing materials.

## Goals / Non-Goals

**Goals:**
- Provide authoritative filament data for 7k+ filaments searchable by material, manufacturer, color, and properties
- Curate material science knowledge (properties, troubleshooting, recommendations) that LLMs currently hallucinate
- Follow the proven oracle pattern: build-time SQLite, embedded in npm, stdio transport
- Ship ~8 tools covering database lookup and material knowledge
- Publish to npm, list on Glama and MCP Registry

**Non-Goals:**
- Printer/nozzle/bed surface compatibility (v2)
- Real-time data updates or runtime fetching (embedded data only)
- Slicer integration or G-code generation
- Multi-material print compatibility
- Cost/pricing data
- Resin or SLA materials (FDM filaments only for v1)

## Decisions

### 1. Data Architecture: Build-time SQLite (embedded)

SpoolmanDB is ~7k entries — small enough to bundle in the npm package. Build script fetches SpoolmanDB JSON from GitHub, combines with curated knowledge JSON files, and compiles into a single SQLite database.

**Alternatives considered:**
- Runtime download (like mtg-oracle): Unnecessary — SpoolmanDB is small and updates infrequently. Adds complexity for no benefit.
- In-memory JSON: Slower for filtered queries across 7k entries. SQLite's indexed queries are better for search/filter tools.

**Decision:** Build-time SQLite, same pattern as brewers-almanack and lego-oracle.

### 2. SpoolmanDB Schema Mapping

SpoolmanDB organizes data as:
- `filaments/` — individual filament JSON files with manufacturer, material, colors, print settings
- `materials/` — material type definitions
- `manufacturers/` — manufacturer info

Build script flattens these into SQLite tables:
- `filaments` — one row per filament (name, manufacturer_id, material_id, print_temp_min, print_temp_max, bed_temp_min, bed_temp_max, density, diameter, colors JSON)
- `manufacturers` — one row per manufacturer (name, website, country)
- `materials` — one row per material type (name, category)

FTS5 virtual table on filament names and manufacturer names for fuzzy search.

**Alternatives considered:**
- Normalized color tables: Overkill — colors are a display concern, not a query dimension. Store as JSON array.
- Separate databases per concern: Single DB is simpler and faster.

### 3. Knowledge Layer: Structured JSON Files in Repo

Curated material science data stored as JSON files in `data/knowledge/`:
- `material-profiles.json` — per-material-type properties (strength, flexibility, UV resistance, food safety, moisture sensitivity, difficulty, typical use cases)
- `troubleshooting.json` — symptom → material → causes → fixes mapping
- `compatibility.json` — material compatibility notes (basic nozzle/bed requirements, serves as foundation for v2 expansion)

These compile into SQLite tables alongside SpoolmanDB data.

**Alternatives considered:**
- Markdown knowledge files: Harder to query programmatically. JSON maps cleanly to SQLite.
- LLM-generated knowledge: No — the whole point is authoritative, curated data. Hand-authored.

### 4. Tool Design: 4 + 4 Split

Database tools (SpoolmanDB-powered):
1. `search-filaments` — text search + filters (material, manufacturer, diameter). Paginated. Uses FTS5.
2. `get-filament` — full details for one filament by ID or exact name match.
3. `list-manufacturers` — all manufacturers with filament counts. Optional material filter.
4. `list-materials` — all material types with filament counts and summary properties.

Knowledge tools (curated data):
5. `get-material-profile` — authoritative properties for a material type.
6. `compare-materials` — side-by-side comparison of 2-3 materials across all properties.
7. `recommend-material` — given requirements, rank materials with reasoning.
8. `diagnose-print-issue` — given symptoms + material, return causes and fixes.

**Alternatives considered:**
- Fewer tools (merge search + filter): Keeping search and browse separate follows the "design around workflows" principle from the MCP stack. Users search when they know what they want, browse when they don't.
- More tools (separate tools for each property filter): Over-fragmentation hurts agent performance per MCP stack guidance.

### 5. Project Scaffolding

Use `templates/ai-product-template/` as the base. Standard MCP project structure per `stacks/mcp/project_structure.md`.

## Risks / Trade-offs

- **SpoolmanDB format changes** → Pin to a specific commit hash in the build script. Add a validation step that fails loudly if the schema drifts.
- **Knowledge layer accuracy** → Material science data must be carefully curated. Start with the most common materials (PLA, PETG, ABS, TPU, Nylon, ASA, PC, PVA) and expand. Include source citations in the knowledge JSON where possible.
- **SpoolmanDB data quality** → Community-contributed data may have inconsistencies (missing temps, wrong values). Build script should validate and warn, not silently ingest bad data.
- **Scope creep to printer compatibility** → Firmly deferred to v2. The knowledge layer's `compatibility.json` covers basic nozzle requirements only (e.g., "abrasive — use hardened steel nozzle") without full printer database.
