## 1. Project Scaffolding

- [ ] 1.1 Create project directory from ai-product-template (projects/3dprint-oracle/)
- [ ] 1.2 Initialize npm package (name: 3dprint-oracle, bin, MCP SDK deps, better-sqlite3, zod, vitest)
- [ ] 1.3 Set up project CLAUDE.md with MCP stack references
- [ ] 1.4 Create .gitignore, LICENSE (MIT), .github/FUNDING.yml, initial README with badge pills
- [ ] 1.5 Initialize git repo and push scaffold to GitHub

## 2. Data Pipeline — SpoolmanDB Ingestion

- [ ] 2.1 Create build script that fetches SpoolmanDB from GitHub at pinned commit hash
- [ ] 2.2 Parse SpoolmanDB JSON files (filaments, manufacturers, materials) with schema validation
- [ ] 2.3 Create SQLite schema (filaments, manufacturers, materials tables + foreign keys)
- [ ] 2.4 Populate SQLite tables from parsed SpoolmanDB data with skip-and-warn for invalid entries
- [ ] 2.5 Build FTS5 virtual table on filament names and manufacturer names
- [ ] 2.6 Add integrity checks (row counts, FTS5 populated, foreign keys valid)
- [ ] 2.7 Write tests for data pipeline (fetch, parse, validate, compile, integrity)

## 3. Data Pipeline — Knowledge Layer

- [ ] 3.1 Define JSON schemas for material-profiles.json and troubleshooting.json
- [ ] 3.2 Curate material-profiles.json for core materials (PLA, PETG, ABS, TPU, Nylon, ASA, PC, PVA)
- [ ] 3.3 Curate troubleshooting.json for common symptoms (stringing, warping, layer adhesion, elephant's foot, clogging, under-extrusion, over-extrusion)
- [ ] 3.4 Add knowledge tables to SQLite schema (material_profiles, troubleshooting)
- [ ] 3.5 Compile knowledge JSON into SQLite alongside SpoolmanDB data
- [ ] 3.6 Add build-time schema validation for knowledge files
- [ ] 3.7 Write tests for knowledge layer compilation and validation

## 4. MCP Server Setup

- [ ] 4.1 Create MCP server entry point with McpServer + StdioServerTransport
- [ ] 4.2 Load bundled SQLite database at startup with error handling for missing DB
- [ ] 4.3 Create database access layer (query helpers, connection management)
- [ ] 4.4 Write server startup tests (loads DB, handles missing DB)

## 5. Database Tools

- [ ] 5.1 Implement search-filaments tool (FTS5 query + material/manufacturer/diameter filters + pagination)
- [ ] 5.2 Write tests for search-filaments (text search, filters, pagination, empty results)
- [ ] 5.3 Implement get-filament tool (by ID or exact name match)
- [ ] 5.4 Write tests for get-filament (found, not found, error message)
- [ ] 5.5 Implement list-manufacturers tool (all manufacturers + optional material filter)
- [ ] 5.6 Write tests for list-manufacturers (all, filtered, counts)
- [ ] 5.7 Implement list-materials tool (all material types with counts)
- [ ] 5.8 Write tests for list-materials (list, counts, sorting)

## 6. Knowledge Tools

- [ ] 6.1 Implement get-material-profile tool (lookup from material_profiles table)
- [ ] 6.2 Write tests for get-material-profile (found, not found, property completeness)
- [ ] 6.3 Implement compare-materials tool (2-3 materials side-by-side)
- [ ] 6.4 Write tests for compare-materials (two materials, three materials, invalid material, fewer than two)
- [ ] 6.5 Implement recommend-material tool (requirements → ranked recommendations)
- [ ] 6.6 Write tests for recommend-material (simple requirement, conflicting requirements, no requirements)
- [ ] 6.7 Implement diagnose-print-issue tool (symptoms → causes → fixes)
- [ ] 6.8 Write tests for diagnose-print-issue (with material, without material, unknown symptom)

## 7. Integration & Polish

- [ ] 7.1 End-to-end integration tests (server startup → tool call → response validation)
- [ ] 7.2 Tool description review — ensure all descriptions are clear for LLM consumption
- [ ] 7.3 Update README with tool documentation, install instructions, and usage examples
- [ ] 7.4 Add status.json for publishing state tracking
- [ ] 7.5 MCP QA gate (/mcp-qa)

## 8. Publishing

- [ ] 8.1 Publish to npm
- [ ] 8.2 List on Glama registry
- [ ] 8.3 Register on MCP Registry
- [ ] 8.4 Create GitHub release
