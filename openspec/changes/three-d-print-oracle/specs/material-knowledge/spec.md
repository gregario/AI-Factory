## ADDED Requirements

### Requirement: Get material profile
The system SHALL provide a `get-material-profile` tool that returns authoritative properties for a material type. Properties SHALL include: print temperature range, bed temperature range, strength rating, flexibility rating, UV resistance, food safety status, moisture sensitivity, difficulty rating (beginner/intermediate/advanced), typical use cases, and pros/cons summary.

#### Scenario: Get common material profile
- **WHEN** user requests profile for "PLA"
- **THEN** system returns complete property set including temps, ratings, safety info, difficulty, and use cases

#### Scenario: Get specialty material profile
- **WHEN** user requests profile for "Nylon"
- **THEN** system returns complete property set including moisture sensitivity warnings and enclosure recommendations

#### Scenario: Unknown material type
- **WHEN** user requests profile for a material not in the knowledge base
- **THEN** system returns an error with `isError: true` listing available material types

### Requirement: Compare materials side by side
The system SHALL provide a `compare-materials` tool that accepts 2-3 material type names and returns a structured side-by-side comparison across all properties. The comparison SHALL highlight key differences and include a summary of when to choose each material.

#### Scenario: Compare two common materials
- **WHEN** user compares "PLA" and "PETG"
- **THEN** system returns property-by-property comparison with differences highlighted and a "when to use each" summary

#### Scenario: Compare three materials
- **WHEN** user compares "PLA", "PETG", and "ABS"
- **THEN** system returns three-way comparison table with differences and recommendations

#### Scenario: Invalid material in comparison
- **WHEN** user includes an unknown material type in the comparison
- **THEN** system returns an error identifying the unknown material and listing available types

#### Scenario: Fewer than two materials
- **WHEN** user provides only one material
- **THEN** system returns an error requesting at least two materials for comparison

### Requirement: Recommend material for requirements
The system SHALL provide a `recommend-material` tool that accepts a set of requirements (strength, flexibility, heat resistance, food safe, outdoor use, ease of printing, budget) and returns ranked material recommendations. Each recommendation SHALL include the material name, match score, reasoning for the ranking, and any caveats.

#### Scenario: Simple requirement
- **WHEN** user requests a material that is "food safe and easy to print"
- **THEN** system returns ranked materials with PLA-based food-safe options ranked highest, with reasoning

#### Scenario: Conflicting requirements
- **WHEN** user requests a material that is "flexible AND heat resistant"
- **THEN** system returns best compromises with clear explanation of trade-offs

#### Scenario: No requirements specified
- **WHEN** user calls recommend-material with no requirements
- **THEN** system returns an error requesting at least one requirement

### Requirement: Diagnose print issues
The system SHALL provide a `diagnose-print-issue` tool that accepts symptoms (stringing, warping, poor layer adhesion, elephant's foot, clogging, etc.) and an optional material type. It SHALL return likely causes ranked by probability, specific fixes for each cause, and material-specific notes when a material is provided.

#### Scenario: Diagnose with material context
- **WHEN** user reports "stringing" with material "PETG"
- **THEN** system returns PETG-specific causes (e.g., too high temp, insufficient retraction) and fixes

#### Scenario: Diagnose without material
- **WHEN** user reports "warping" without specifying material
- **THEN** system returns general causes and fixes, noting which are material-dependent

#### Scenario: Unknown symptom
- **WHEN** user reports an unrecognized symptom
- **THEN** system returns an error with `isError: true` listing recognized symptoms
