## ADDED Requirements

### Requirement: Search filaments by text and filters
The system SHALL provide a `search-filaments` tool that accepts a text query and optional filters (material type, manufacturer, diameter). Results SHALL be paginated (default 20, max 100). Text search SHALL use FTS5 for fuzzy matching against filament name and manufacturer name. Each result SHALL include filament name, manufacturer, material type, and print temperature range.

#### Scenario: Search by text query
- **WHEN** user searches for "prusament petg"
- **THEN** system returns filaments matching the query, ranked by relevance, with name, manufacturer, material, and temp range

#### Scenario: Search with material filter
- **WHEN** user searches with material filter "PETG"
- **THEN** system returns only PETG filaments matching the query

#### Scenario: Search with manufacturer filter
- **WHEN** user searches with manufacturer filter "Prusament"
- **THEN** system returns only filaments from that manufacturer

#### Scenario: Search with diameter filter
- **WHEN** user searches with diameter filter 2.85
- **THEN** system returns only filaments with 2.85mm diameter

#### Scenario: Paginated results
- **WHEN** user searches with offset 20 and limit 10
- **THEN** system returns results 21-30 with total count

#### Scenario: No results
- **WHEN** user searches for a non-existent filament
- **THEN** system returns empty results with total count 0 and a helpful message

### Requirement: Get filament details
The system SHALL provide a `get-filament` tool that returns full specifications for a single filament by ID or exact name match. Response SHALL include: name, manufacturer, material type, print temperature range, bed temperature range, density, diameter, available colors, and any vendor-specific notes.

#### Scenario: Get by filament ID
- **WHEN** user requests filament by ID
- **THEN** system returns complete filament specifications

#### Scenario: Get by exact name
- **WHEN** user requests filament by exact name "Prusament PLA"
- **THEN** system returns the matching filament's complete specifications

#### Scenario: Filament not found
- **WHEN** user requests a non-existent filament
- **THEN** system returns an error with `isError: true` and a helpful message suggesting search

### Requirement: List manufacturers
The system SHALL provide a `list-manufacturers` tool that returns all manufacturers with their filament counts. An optional material type filter SHALL narrow results to manufacturers that produce filaments of that material.

#### Scenario: List all manufacturers
- **WHEN** user requests all manufacturers
- **THEN** system returns manufacturer names, websites, countries, and filament counts sorted alphabetically

#### Scenario: Filter by material type
- **WHEN** user requests manufacturers filtered by "TPU"
- **THEN** system returns only manufacturers that produce TPU filaments with their TPU filament counts

### Requirement: List material types
The system SHALL provide a `list-materials` tool that returns all material types with filament counts. Each material SHALL include its category and the number of filaments available.

#### Scenario: List all materials
- **WHEN** user requests all material types
- **THEN** system returns material names, categories, and filament counts sorted by filament count descending
