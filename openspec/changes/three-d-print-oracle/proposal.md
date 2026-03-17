## Why

LLMs are already being used for 3D printing advice and actively hallucinate material properties, print temperatures, and compatibility data — leading to wasted filament, damaged hotends, and failed prints. No MCP server provides authoritative filament data. PrusaMCP is the closest competitor with ~30 filaments; SpoolmanDB (MIT, 7k entries) is an untapped open dataset. This fills a dangerous knowledge gap for the hobbyist maker community.

## What Changes

- New MCP server project: `3dprint-oracle`
- Ingests SpoolmanDB (MIT, 7k filament entries, 53 manufacturers, 51 material types) at build time into SQLite
- Adds a curated material science knowledge layer (properties, troubleshooting, recommendations) as structured JSON
- Exposes ~8 MCP tools: 4 database tools (search, lookup, browse) and 4 knowledge tools (profiles, comparison, recommendation, troubleshooting)
- Published to npm as `3dprint-oracle`

## Capabilities

### New Capabilities

- `filament-database`: Search, lookup, and browse 7k+ filaments from SpoolmanDB. Includes search-filaments, get-filament, list-manufacturers, list-materials tools.
- `material-knowledge`: Curated material science knowledge layer. Includes get-material-profile, compare-materials, recommend-material, diagnose-print-issue tools.
- `data-pipeline`: Build-time pipeline that fetches SpoolmanDB and curated knowledge JSON, compiles into SQLite database bundled in the npm package.

### Modified Capabilities

(None — new project)

## Impact

- New project directory: `projects/3dprint-oracle/`
- New npm package: `3dprint-oracle`
- Dependencies: `@modelcontextprotocol/sdk`, `better-sqlite3`, `zod`, `vitest`
- Data source: SpoolmanDB GitHub repository (fetched at build time)
- No impact on existing projects or factory infrastructure
