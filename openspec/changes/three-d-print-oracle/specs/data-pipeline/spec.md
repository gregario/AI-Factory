## ADDED Requirements

### Requirement: Fetch SpoolmanDB at build time
The system SHALL provide a build script that fetches SpoolmanDB data from its GitHub repository at a pinned commit hash. The script SHALL parse filament, manufacturer, and material JSON files and validate required fields are present.

#### Scenario: Successful data fetch
- **WHEN** build script runs with valid commit hash
- **THEN** system fetches and parses all SpoolmanDB JSON files, reporting count of filaments, manufacturers, and materials processed

#### Scenario: Pinned commit not found
- **WHEN** build script runs with an invalid or deleted commit hash
- **THEN** build fails with clear error message including instructions to update the pin

#### Scenario: Schema validation failure
- **WHEN** a SpoolmanDB JSON file is missing required fields (name, material, manufacturer)
- **THEN** build script warns about the invalid entry and skips it, continuing with valid entries. Summary reports skipped count.

### Requirement: Compile SQLite database
The system SHALL compile fetched SpoolmanDB data and curated knowledge JSON files into a single SQLite database. Tables SHALL include: filaments, manufacturers, materials, material_profiles, troubleshooting, and an FTS5 virtual table for text search.

#### Scenario: Successful compilation
- **WHEN** build script has valid SpoolmanDB data and knowledge files
- **THEN** system produces a SQLite database at `data/3dprint-oracle.db` with all tables populated and FTS5 index built

#### Scenario: Knowledge file missing
- **WHEN** a required knowledge JSON file is missing
- **THEN** build fails with clear error identifying the missing file

#### Scenario: Database integrity check
- **WHEN** database compilation completes
- **THEN** build script runs integrity checks (row counts match source, FTS5 index populated, foreign keys valid) and reports results

### Requirement: Bundle database in npm package
The system SHALL include the compiled SQLite database in the npm package via the `files` field in package.json. The database SHALL be loaded at server startup from the package's data directory.

#### Scenario: Package includes database
- **WHEN** npm pack runs
- **THEN** the resulting tarball includes `data/3dprint-oracle.db`

#### Scenario: Database loads at startup
- **WHEN** MCP server starts
- **THEN** server opens the bundled SQLite database and is ready to serve tool calls

#### Scenario: Database missing at startup
- **WHEN** MCP server starts but database file is missing
- **THEN** server exits with clear error message including rebuild instructions

### Requirement: Curated knowledge JSON format
The system SHALL define and validate knowledge layer JSON files:
- `data/knowledge/material-profiles.json` — material type → properties mapping
- `data/knowledge/troubleshooting.json` — symptom → causes → fixes mapping

Each file SHALL have a JSON schema that the build script validates.

#### Scenario: Valid knowledge files
- **WHEN** build script validates knowledge files
- **THEN** all files pass schema validation

#### Scenario: Invalid knowledge file
- **WHEN** a knowledge file fails schema validation
- **THEN** build fails with specific validation error (field name, expected type, actual value)
