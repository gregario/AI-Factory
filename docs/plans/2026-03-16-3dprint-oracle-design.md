# 3dprint-oracle — Design Document

**Date:** 2026-03-16
**Status:** Approved
**Type:** New MCP server project

## Problem

LLMs hallucinate 3D printing material properties, print settings, and compatibility information. There is no MCP server providing authoritative filament data. The maker community is active and underserved by AI tooling.

## Solution

An MCP server that gives LLMs authoritative access to 3D printing filament data and curated material science knowledge. Follows the proven oracle pattern (brewers-almanack, lego-oracle, mtg-oracle).

## Data Sources

- **SpoolmanDB** (GitHub, MIT license) — 7k filament entries, 53 manufacturers, 51 material types. Product catalog with print temps, bed temps, densities, colors.
- **Curated knowledge layer** — Material property matrices, troubleshooting guides, compatibility data. Hand-authored structured JSON embedded at build time.

## Architecture

- TypeScript + `@modelcontextprotocol/sdk` + `better-sqlite3` + Zod + vitest
- Build script: SpoolmanDB JSON + curated knowledge JSON → SQLite database, bundled in npm package
- Embedded data pattern (same as brewers-almanack/lego-oracle)

## Data Flow

```
SpoolmanDB (GitHub, MIT)
    ↓ fetch at build time
curated-knowledge/*.json (in repo)
    ↓ build script
data/3dprint-oracle.db (SQLite, bundled in npm)
    ↓ loaded at runtime
MCP server serves tool calls
```

## Tools (MVP — 8-9 tools)

### Database tools (SpoolmanDB-powered)

1. **search-filaments** — Search by material type, manufacturer, color, properties. Fuzzy name matching. Paginated results.
2. **get-filament** — Full specs for a specific filament (temps, density, diameter, colors, vendor info).
3. **list-manufacturers** — Browse manufacturers with filament counts.
4. **list-materials** — Browse material types (PLA, PETG, ABS, TPU, etc.) with counts and summary properties.

### Knowledge layer tools (curated data)

5. **get-material-profile** — Authoritative material properties for a material type: print temp range, bed temp, strength, flexibility, UV resistance, food safety, moisture sensitivity, difficulty rating.
6. **compare-materials** — Side-by-side comparison of 2-3 material types across all properties. Returns structured diff.
7. **recommend-material** — Given requirements (strength, flexibility, heat resistance, food safe, outdoor use, etc.), returns ranked material recommendations with reasoning.
8. **diagnose-print-issue** — Given symptoms (stringing, warping, layer adhesion, etc.) and material, returns likely causes and fixes.

### Stretch

9. **material-compatibility** — Nozzle type requirements, bed surface compatibility, enclosure needs for a given material.

## v2 Backlog

- Printer/nozzle/bed surface compatibility database
- Multi-material print compatibility (what materials can be combined)
- Filament drying guides per material
- Cost-per-gram calculations

## Decisions

- **Name:** `3dprint-oracle`
- **Data approach:** Build-time SQLite (embedded in npm package)
- **MVP scope:** SpoolmanDB + curated material science knowledge layer (option B)
- **Deferred:** Printer compatibility data (option C) → v2 backlog
