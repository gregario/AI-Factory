# LEGO Oracle MCP Server — Design

## What

An MCP server for LEGO collectors and builders. Embeds Rebrickable's full catalog (sets, parts, colours, inventories, minifigures, themes, MOCs, part relationships) in SQLite for instant, offline, grounded answers.

## Why

LLMs hallucinate LEGO data constantly: invented set numbers, wrong piece counts, confused part IDs, mixed-up colour names. Rebrickable has the canonical data but no MCP server exists. Zero competition.

## Data Source

Rebrickable CSV downloads (rebrickable.com/downloads). "You can use these files for any purpose." Updated daily. MIT-friendly.

## Architecture

Warhammer-oracle pattern: embed data at build time, daily GitHub Actions sync.

```
lego-oracle/
  src/
    data/
      schema.sql          # SQLite schema
      rebrickable.ts      # CSV parser + ingester
      db.ts               # Types, connection, query helpers
    tools/
      search-sets.ts
      get-set.ts
      search-parts.ts
      get-part.ts
      find-part-in-sets.ts
      search-minifigs.ts
      get-minifig.ts
      browse-themes.ts
      find-mocs.ts
      compare-sets.ts
    format.ts             # Response formatters
    server.ts             # MCP entry point
  scripts/
    fetch-data.ts         # Download + ingest Rebrickable CSVs
  .github/
    workflows/
      sync-data.yml       # Daily cron, OIDC trusted publishing
```

## Schema

```sql
themes              (id, name, parent_id)
colors              (id, name, rgb, is_trans)
part_categories     (id, name)
parts               (part_num PK, name, category_id, material)
sets                (set_num PK, name, year, theme_id, num_parts, img_url)
minifigs            (fig_num PK, name, num_parts, img_url)
inventories         (id PK, set_num, version)
inventory_parts     (inventory_id, part_num, color_id, quantity, is_spare)
inventory_sets      (inventory_id, set_num, quantity)
inventory_minifigs  (inventory_id, fig_num, quantity)
part_relationships  (rel_type, child_part_num, parent_part_num)
mocs                (set_num PK, name, year, theme_id, num_parts)
moc_parts           (moc_set_num, part_num, color_id, quantity)

-- FTS5 search
sets_fts            (name)
parts_fts           (name)
minifigs_fts        (name)
```

## Tools (10)

| Tool | Purpose | Key filters |
|------|---------|-------------|
| `search_sets` | Find sets | name (FTS5), theme (recursive), year/range, piece count range |
| `get_set` | Full set details + inventory + minifigs | set number or name (fuzzy) |
| `search_parts` | Find parts | name (FTS5), category, colour, material |
| `get_part` | Part details + alternates/molds/prints | part number |
| `find_part_in_sets` | Which sets contain a part+colour | part number, colour (optional) |
| `search_minifigs` | Find minifigures | name (FTS5) |
| `get_minifig` | Minifig details + all sets it appears in | fig number or name (fuzzy) |
| `browse_themes` | Theme hierarchy + set counts | theme name/ID (optional, top-level if empty) |
| `find_mocs` | Alternate builds from a set's parts | set number |
| `compare_sets` | Side-by-side 2-4 sets | set numbers |

## Problems Solved

Collector problems:
- "What sets are in the Harry Potter theme?" (LLMs invent set numbers)
- "What minifigs come with set X?" (LLMs hallucinate names and counts)
- "What sets came out in 2024 in Technic?" (LLMs list sets that don't exist)

Builder problems:
- "What colour is dark bluish gray vs dark gray?" (LEGO colours are confusing)
- "Which sets contain dark red 1x4 plates?" (needs inventory cross-reference)
- "What can I build with parts from set 42115?" (needs MOC data)
- "What's the difference between part 3001 and 3004?" (part variants)

## Publishing

- npm package: `lego-oracle`
- Transport: stdio
- Daily sync: GitHub Actions cron, OIDC trusted publishing
- Registries: Glama + Official MCP Registry
- awesome-mcp-servers: PR after Glama full green (manual gate)
- status.json from day one

## Attribution

"Data from Rebrickable (rebrickable.com). LEGO is a trademark of the LEGO Group. This project is not produced by or endorsed by the LEGO Group."

## Testing

- In-memory SQLite with known test data
- Each tool handler tested (found, not found, fuzzy match, filters)
- CSV ingestion tests
- Formatter tests
- Target: 100+ tests before first publish
