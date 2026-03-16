# Astronomy Oracle MCP Server — Design

**Date:** 2026-03-16
**Status:** Approved
**Pipeline stage:** Brainstorm → (competition review next) → product taste → spec

## Product Vision

An MCP server that gives LLMs accurate, ground-truth astronomical data so they stop hallucinating magnitudes, coordinates, and observing conditions. Serves backyard visual observers as the primary persona, armchair astronomers as secondary.

Anti-hallucination pattern: the MCP provides the hard numbers and deterministic computations; the LLM provides explanation and context.

## Data Source

**OpenNGC** (github.com/mattiaverga/OpenNGC) — CC-BY-SA 4.0
- NGC, IC, Messier, and Caldwell catalogs
- ~14k objects with coordinates, magnitudes, sizes, types, constellations
- Embedded CSV at build time, parsed into in-memory store at startup (warhammer-oracle pattern)
- No runtime network dependency — dataset changes rarely

## Data Model

```typescript
interface CelestialObject {
  name: string;              // "NGC 224", "IC 1613"
  type: ObjectType;          // galaxy, nebula, cluster, star, etc.
  ra: number;                // right ascension in degrees
  dec: number;               // declination in degrees
  magnitude: number | null;
  surfaceBrightness: number | null;
  majorAxis: number | null;  // arcminutes
  minorAxis: number | null;
  constellation: string;
  messier: string | null;    // "M31"
  caldwell: string | null;   // "C17"
  commonName: string | null; // "Andromeda Galaxy"
  objectClass: string | null; // morphological subtype
}
```

Secondary indexes (Maps) for Messier, Caldwell, and common names for fast lookup.

## Tools (3)

### `lookup-object`
**Input:** `name` (string, required), `latitude` (number, optional), `longitude` (number, optional), `date` (string ISO, optional)

Fuzzy-match against NGC ID, Messier number, Caldwell number, or common name. Returns full object data. When lat/lon/date provided, also computes rise/transit/set times and current altitude.

### `search-objects`
**Input:** `type` (enum, optional), `constellation` (string, optional), `minMagnitude` / `maxMagnitude` (number, optional), `minSize` (number, optional), `catalog` (enum: messier/caldwell/ngc/ic, optional), `limit` (number, default 20)

Filter the catalog by all provided criteria (AND-combined). Return results sorted by magnitude (brightest first). Output as markdown table.

### `plan-session`
**Input:** `latitude` (number, required), `longitude` (number, required), `date` (string ISO, optional — defaults to tonight), `minAltitude` (number, default 15°), `maxMagnitude` (number, optional), `types` (array of ObjectType, optional)

Compute which objects are above minAltitude at the given location/date. Rank by composite score (peak altitude + brightness + angular size). Return grouped by time windows: early evening / midnight / pre-dawn.

## Astronomy Math

All deterministic TypeScript — zero LLM calls.

- **Julian Date** — calendar date/time → JD
- **Local Sidereal Time** — JD + observer longitude → LST
- **Alt/Az Conversion** — RA/Dec + lat/lon + LST → altitude/azimuth
- **Rise/Transit/Set** — solve for altitude = 0° (rise/set) and HA = 0° (transit), handle circumpolar / never-rises cases

## Architecture

```
astronomy-oracle/
├── src/
│   ├── index.ts              # Entry point, stdio transport
│   ├── server.ts             # createServer() factory
│   ├── tools/
│   │   ├── lookup-object.ts
│   │   ├── search-objects.ts
│   │   └── plan-session.ts
│   ├── data/
│   │   ├── catalog.ts        # CSV parse, in-memory store, indexes
│   │   └── types.ts          # CelestialObject, ObjectType, enums
│   ├── astro/
│   │   ├── coordinates.ts    # Alt/az conversion, hour angle
│   │   ├── time.ts           # Julian date, sidereal time
│   │   └── visibility.ts     # Rise/transit/set, session planning
│   └── format.ts             # Markdown formatters for tool output
├── data/
│   └── openngc.csv           # Bundled OpenNGC dataset
├── tests/
│   ├── tools/                # Tool integration tests
│   ├── data/                 # Catalog parsing tests
│   ├── astro/                # Math tests against reference values
│   └── format/               # Formatter tests
├── package.json
├── tsconfig.json
├── CLAUDE.md
├── README.md
├── LICENSE                   # MIT (code), CC-BY-SA 4.0 attribution for data
└── .gitignore
```

## Testing Strategy

- **Astro math** (~high coverage): Reference value tests against published tools (Stellarium, USNO). Edge cases: circumpolar, never-rises, polar/equatorial observers.
- **Catalog**: CSV parsing, null handling, index lookups by all name variants, filter composition.
- **Tools**: Via in-memory MCP transport. Happy paths, error cases, pagination.
- **Formatters**: Markdown structure, null field handling.

Target: ~150-200 tests.

## License

- Code: MIT
- Data: CC-BY-SA 4.0 (OpenNGC) — attribution in README and tool descriptions

## Approach Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Data strategy | Embedded CSV | 14k rows is trivial in-memory. No native deps. Offline-first. |
| Tool count | 3 | Fewer tools, better tools. Constellation browse = search filter. Single-object visibility = lookup with optional location. Seasonal highlights = plan-session with month. |
| Math approach | Deterministic TypeScript | Zero hallucination surface. Testable against reference values. |
| Knowledge layer | Pure data + computed derivations | No curated subjective content — LLM writes observing notes, MCP provides ground truth numbers. |
| Primary persona | Backyard visual observer | Secondary: armchair astronomer/learner |
