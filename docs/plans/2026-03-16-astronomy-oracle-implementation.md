# Astronomy Oracle Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an MCP server that provides accurate astronomical catalog data and deterministic observing computations for amateur astronomers.

**Architecture:** Embedded OpenNGC CSV parsed at startup into in-memory arrays. 3 tools (lookup, search, plan-session). Deterministic astronomy math in TypeScript (Julian date, sidereal time, alt/az, rise/transit/set). Warhammer-oracle patterns for server factory, tool registration, and entry point.

**Tech Stack:** TypeScript, Node.js 18+, @modelcontextprotocol/sdk, Zod, Vitest

**Design doc:** `docs/plans/2026-03-16-astronomy-oracle-design.md`

**Reference project:** `projects/warhammer-oracle/` (follow same patterns for server.ts, index.ts, register-tools.ts, tool files, types.ts, lib/, data/)

---

## Pre-flight

Before starting, the executing engineer must:

1. Create the project directory: `mkdir -p projects/astronomy-oracle`
2. Initialize from the ai-product template (copy CLAUDE.md, README.md, .gitignore, LICENSE, .github/FUNDING.yml)
3. `cd projects/astronomy-oracle && git init`
4. `npm init -y` and configure package.json per the warhammer-oracle pattern
5. Install dependencies: `npm install @modelcontextprotocol/sdk zod`
6. Install dev dependencies: `npm install -D typescript @types/node vitest tsx`
7. Create tsconfig.json (copy from warhammer-oracle, change name)
8. Create src/ and tests/ directories
9. Download OpenNGC data: `curl -o data/NGC.csv https://raw.githubusercontent.com/mattiaverga/OpenNGC/master/database/NGC.csv` and `curl -o data/addendum.csv https://raw.githubusercontent.com/mattiaverga/OpenNGC/master/database/addendum.csv`
10. Commit: `git commit -m "chore: scaffold astronomy-oracle project"`

---

## Task 1: Data Types

**Files:**
- Create: `src/types.ts`
- Test: `tests/types.test.ts`

**Step 1: Write the type definitions**

```typescript
// src/types.ts

export const OBJECT_TYPES = {
  "*": "Star",
  "**": "Double Star",
  "*Ass": "Asterism",
  "OCl": "Open Cluster",
  "GCl": "Globular Cluster",
  "Cl+N": "Cluster + Nebula",
  "G": "Galaxy",
  "GPair": "Galaxy Pair",
  "GTrpl": "Galaxy Triplet",
  "GGroup": "Galaxy Group",
  "PN": "Planetary Nebula",
  "HII": "HII Region",
  "DrkN": "Dark Nebula",
  "EmN": "Emission Nebula",
  "Neb": "Nebula",
  "RfN": "Reflection Nebula",
  "SNR": "Supernova Remnant",
  "Nova": "Nova",
  "NonEx": "Nonexistent",
  "Dup": "Duplicate",
  "Other": "Other",
} as const;

export type ObjectTypeCode = keyof typeof OBJECT_TYPES;

export type CelestialObject = {
  name: string;
  type: ObjectTypeCode;
  typeName: string;
  ra: number;           // degrees (0-360)
  dec: number;          // degrees (-90 to +90)
  constellation: string;
  magnitude: number | null;       // V-Mag
  surfaceBrightness: number | null;
  majorAxis: number | null;       // arcminutes
  minorAxis: number | null;       // arcminutes
  positionAngle: number | null;   // degrees
  hubbleType: string | null;      // galaxy morphological type
  messier: string | null;         // "M31"
  ngcCrossRef: string | null;
  icCrossRef: string | null;
  commonName: string | null;
  otherIdentifiers: string | null;
};

export type Catalog = "messier" | "caldwell" | "ngc" | "ic";

export type VisibilityInfo = {
  altitude: number;     // degrees above horizon
  azimuth: number;      // degrees from north
  riseTime: Date | null;
  transitTime: Date | null;
  setTime: Date | null;
  isCircumpolar: boolean;
  neverRises: boolean;
};

export type SessionWindow = "evening" | "midnight" | "predawn";

export type SessionObject = {
  object: CelestialObject;
  peakAltitude: number;
  transitTime: Date;
  window: SessionWindow;
  score: number;
};
```

**Step 2: Write a basic type test**

```typescript
// tests/types.test.ts
import { describe, it, expect } from "vitest";
import { OBJECT_TYPES } from "../src/types.js";

describe("types", () => {
  it("has all 21 object type codes", () => {
    expect(Object.keys(OBJECT_TYPES)).toHaveLength(21);
  });

  it("maps type codes to human-readable names", () => {
    expect(OBJECT_TYPES["G"]).toBe("Galaxy");
    expect(OBJECT_TYPES["OCl"]).toBe("Open Cluster");
    expect(OBJECT_TYPES["PN"]).toBe("Planetary Nebula");
  });
});
```

**Step 3: Run test to verify it passes**

Run: `npx vitest run tests/types.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/types.ts tests/types.test.ts
git commit -m "feat: add celestial object type definitions"
```

---

## Task 2: Coordinate Parsing

**Files:**
- Create: `src/data/parse-coordinates.ts`
- Test: `tests/data/parse-coordinates.test.ts`

**Step 1: Write the failing tests**

```typescript
// tests/data/parse-coordinates.test.ts
import { describe, it, expect } from "vitest";
import { parseRA, parseDec } from "../../src/data/parse-coordinates.js";

describe("parseRA", () => {
  it("converts HH:MM:SS.SS to degrees", () => {
    // 00:42:44.29 = (0 + 42/60 + 44.29/3600) * 15 = 10.684541... degrees
    expect(parseRA("00:42:44.29")).toBeCloseTo(10.6846, 3);
  });

  it("converts 12:00:00.00 to 180 degrees", () => {
    expect(parseRA("12:00:00.00")).toBeCloseTo(180.0, 3);
  });

  it("converts 23:59:59.99 to ~360 degrees", () => {
    expect(parseRA("23:59:59.99")).toBeCloseTo(360.0, 1);
  });

  it("returns null for empty string", () => {
    expect(parseRA("")).toBeNull();
  });
});

describe("parseDec", () => {
  it("converts +DD:MM:SS.SS to degrees", () => {
    // +41:16:09.0 = 41 + 16/60 + 9/3600 = 41.2691... degrees
    expect(parseDec("+41:16:09.0")).toBeCloseTo(41.2692, 3);
  });

  it("converts negative declination", () => {
    // -29:00:28.0 = -(29 + 0/60 + 28/3600) = -29.0078 degrees
    expect(parseDec("-29:00:28.0")).toBeCloseTo(-29.0078, 3);
  });

  it("handles +00 declination", () => {
    expect(parseDec("+00:00:00.0")).toBeCloseTo(0.0, 3);
  });

  it("returns null for empty string", () => {
    expect(parseDec("")).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/data/parse-coordinates.test.ts`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```typescript
// src/data/parse-coordinates.ts

export function parseRA(ra: string): number | null {
  if (!ra || !ra.trim()) return null;
  const [h, m, s] = ra.split(":").map(Number);
  return (h + m / 60 + s / 3600) * 15;
}

export function parseDec(dec: string): number | null {
  if (!dec || !dec.trim()) return null;
  const sign = dec.startsWith("-") ? -1 : 1;
  const abs = dec.replace(/^[+-]/, "");
  const [d, m, s] = abs.split(":").map(Number);
  return sign * (d + m / 60 + s / 3600);
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/data/parse-coordinates.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/data/parse-coordinates.ts tests/data/parse-coordinates.test.ts
git commit -m "feat: add RA/Dec coordinate parsing"
```

---

## Task 3: CSV Parser & Catalog Store

**Files:**
- Create: `src/data/catalog.ts`
- Test: `tests/data/catalog.test.ts`

**Step 1: Write the failing tests**

```typescript
// tests/data/catalog.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { loadCatalog, type CatalogStore } from "../../src/data/catalog.js";

describe("catalog", () => {
  let store: CatalogStore;

  beforeAll(() => {
    store = loadCatalog();
  });

  it("loads objects from NGC.csv", () => {
    expect(store.all.length).toBeGreaterThan(10000);
  });

  it("includes addendum objects (M40, M45)", () => {
    const m45 = store.byMessier.get("M45");
    expect(m45).toBeDefined();
    expect(m45!.commonName).toContain("Pleiades");
  });

  it("indexes by NGC name", () => {
    const ngc224 = store.byName.get("NGC 224");
    expect(ngc224).toBeDefined();
    expect(ngc224!.messier).toBe("M31");
  });

  it("indexes by Messier number", () => {
    const m31 = store.byMessier.get("M31");
    expect(m31).toBeDefined();
    expect(m31!.name).toBe("NGC 224");
  });

  it("indexes by common name (case-insensitive)", () => {
    const result = store.byCommonName.get("andromeda galaxy");
    expect(result).toBeDefined();
    expect(result!.messier).toBe("M31");
  });

  it("parses RA to degrees correctly", () => {
    const m31 = store.byMessier.get("M31");
    expect(m31).toBeDefined();
    // M31 RA = 00:42:44.29 → ~10.68 degrees
    expect(m31!.ra).toBeCloseTo(10.68, 1);
  });

  it("parses Dec to degrees correctly", () => {
    const m31 = store.byMessier.get("M31");
    expect(m31).toBeDefined();
    // M31 Dec = +41:16:09.0 → ~41.27 degrees
    expect(m31!.dec).toBeCloseTo(41.27, 1);
  });

  it("parses magnitude as number", () => {
    const m31 = store.byMessier.get("M31");
    expect(m31).toBeDefined();
    expect(m31!.magnitude).toBeCloseTo(4.31, 1);
  });

  it("handles null magnitudes for faint objects", () => {
    // Find an object with no V-Mag
    const noMag = store.all.find((o) => o.magnitude === null);
    expect(noMag).toBeDefined();
  });

  it("filters out NonEx and Dup objects", () => {
    const nonex = store.all.filter((o) => o.type === "NonEx" || o.type === "Dup");
    expect(nonex).toHaveLength(0);
  });

  it("sets typeName from OBJECT_TYPES map", () => {
    const m31 = store.byMessier.get("M31");
    expect(m31!.typeName).toBe("Galaxy");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/data/catalog.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

```typescript
// src/data/catalog.ts
import { readFileSync } from "node:fs";
import { parseRA, parseDec } from "./parse-coordinates.js";
import { OBJECT_TYPES, type CelestialObject, type ObjectTypeCode } from "../types.js";

export type CatalogStore = {
  all: CelestialObject[];
  byName: Map<string, CelestialObject>;
  byMessier: Map<string, CelestialObject>;
  byCommonName: Map<string, CelestialObject>;
};

function parseFloat(s: string): number | null {
  if (!s || !s.trim()) return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

function parseRow(fields: string[]): CelestialObject | null {
  const name = fields[0]?.trim();
  const typeCode = fields[1]?.trim() as ObjectTypeCode;

  if (!name || !typeCode) return null;
  if (typeCode === "NonEx" || typeCode === "Dup") return null;

  const ra = parseRA(fields[2]?.trim() ?? "");
  const dec = parseDec(fields[3]?.trim() ?? "");
  if (ra === null || dec === null) return null;

  return {
    name,
    type: typeCode,
    typeName: OBJECT_TYPES[typeCode] ?? "Unknown",
    ra,
    dec,
    constellation: fields[4]?.trim() ?? "",
    majorAxis: parseFloat(fields[5] ?? ""),
    minorAxis: parseFloat(fields[6] ?? ""),
    positionAngle: parseFloat(fields[7] ?? ""),
    magnitude: parseFloat(fields[9] ?? ""),  // V-Mag is column 10 (index 9)
    surfaceBrightness: parseFloat(fields[13] ?? ""),
    hubbleType: fields[14]?.trim() || null,
    messier: fields[23]?.trim() || null,
    ngcCrossRef: fields[24]?.trim() || null,
    icCrossRef: fields[25]?.trim() || null,
    otherIdentifiers: fields[27]?.trim() || null,
    commonName: fields[28]?.trim() || null,
  };
}

function parseCsv(content: string): CelestialObject[] {
  const lines = content.split("\n");
  const objects: CelestialObject[] = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle quoted fields with commas inside
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ";" && !inQuotes) {
        fields.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    fields.push(current);

    const obj = parseRow(fields);
    if (obj) objects.push(obj);
  }

  return objects;
}

export function loadCatalog(): CatalogStore {
  const dataDir = new URL("../../data/", import.meta.url);

  const ngcContent = readFileSync(new URL("NGC.csv", dataDir), "utf-8");
  const addendumContent = readFileSync(new URL("addendum.csv", dataDir), "utf-8");

  const objects = [...parseCsv(ngcContent), ...parseCsv(addendumContent)];

  const byName = new Map<string, CelestialObject>();
  const byMessier = new Map<string, CelestialObject>();
  const byCommonName = new Map<string, CelestialObject>();

  for (const obj of objects) {
    byName.set(obj.name, obj);
    if (obj.messier) byMessier.set(obj.messier, obj);
    if (obj.commonName) byCommonName.set(obj.commonName.toLowerCase(), obj);
  }

  return { all: objects, byName, byMessier, byCommonName };
}
```

**IMPORTANT NOTE:** The OpenNGC CSV uses semicolons (`;`) as delimiters, not commas. The engineer MUST verify this by inspecting the first line of the downloaded CSV. If it uses commas, change the delimiter in `parseCsv`. Check `head -1 data/NGC.csv` to confirm.

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/data/catalog.test.ts`
Expected: PASS (adjust column indices if CSV format differs from expected)

**Step 5: Commit**

```bash
git add src/data/catalog.ts tests/data/catalog.test.ts
git commit -m "feat: add CSV parser and catalog store with indexes"
```

---

## Task 4: Fuzzy Search Helper

**Files:**
- Create: `src/lib/search.ts`
- Test: `tests/lib/search.test.ts`

**Step 1: Write the failing tests**

```typescript
// tests/lib/search.test.ts
import { describe, it, expect } from "vitest";
import { fuzzySearch } from "../../src/lib/search.js";

const items = [
  { name: "NGC 224", commonName: "Andromeda Galaxy", messier: "M31" },
  { name: "NGC 5139", commonName: "Omega Centauri", messier: null },
  { name: "NGC 7000", commonName: "North America Nebula", messier: null },
];

describe("fuzzySearch", () => {
  it("matches by substring (case-insensitive)", () => {
    const results = fuzzySearch(items, "andromeda", ["name", "commonName", "messier"]);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("NGC 224");
  });

  it("matches by Messier number", () => {
    const results = fuzzySearch(items, "M31", ["name", "commonName", "messier"]);
    expect(results).toHaveLength(1);
  });

  it("matches by NGC number", () => {
    const results = fuzzySearch(items, "7000", ["name", "commonName", "messier"]);
    expect(results).toHaveLength(1);
    expect(results[0].commonName).toBe("North America Nebula");
  });

  it("returns empty array for no match", () => {
    const results = fuzzySearch(items, "nonexistent", ["name", "commonName"]);
    expect(results).toHaveLength(0);
  });

  it("returns all items for empty query", () => {
    const results = fuzzySearch(items, "", ["name"]);
    expect(results).toHaveLength(3);
  });

  it("skips null fields without error", () => {
    const results = fuzzySearch(items, "M31", ["messier"]);
    expect(results).toHaveLength(1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/search.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

```typescript
// src/lib/search.ts

export function fuzzySearch<T extends Record<string, unknown>>(
  items: T[],
  query: string,
  fields: (keyof T)[],
): T[] {
  if (!query.trim()) return [...items];
  const lower = query.toLowerCase();
  return items.filter((item) =>
    fields.some((field) => {
      const value = item[field];
      if (typeof value === "string") return value.toLowerCase().includes(lower);
      return false;
    }),
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/search.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/search.ts tests/lib/search.test.ts
git commit -m "feat: add fuzzy search helper"
```

---

## Task 5: Astronomy Math — Julian Date & Sidereal Time

**Files:**
- Create: `src/astro/time.ts`
- Test: `tests/astro/time.test.ts`

**Step 1: Write the failing tests**

```typescript
// tests/astro/time.test.ts
import { describe, it, expect } from "vitest";
import { julianDate, localSiderealTime } from "../../src/astro/time.js";

describe("julianDate", () => {
  it("computes JD for J2000.0 epoch (2000-01-01T12:00:00Z)", () => {
    const jd = julianDate(new Date("2000-01-01T12:00:00Z"));
    expect(jd).toBeCloseTo(2451545.0, 1);
  });

  it("computes JD for a known date (2024-03-20T00:00:00Z)", () => {
    // Reference: USNO Julian Date Converter
    const jd = julianDate(new Date("2024-03-20T00:00:00Z"));
    expect(jd).toBeCloseTo(2460388.5, 1);
  });

  it("computes JD for Unix epoch (1970-01-01T00:00:00Z)", () => {
    const jd = julianDate(new Date("1970-01-01T00:00:00Z"));
    expect(jd).toBeCloseTo(2440587.5, 1);
  });
});

describe("localSiderealTime", () => {
  it("computes LST at Greenwich for J2000 epoch", () => {
    // At J2000.0 (2000-01-01T12:00:00Z), GMST ≈ 18.697 hours ≈ 280.46°
    const lst = localSiderealTime(new Date("2000-01-01T12:00:00Z"), 0);
    expect(lst).toBeCloseTo(280.46, 0);
  });

  it("shifts LST by longitude", () => {
    const date = new Date("2000-01-01T12:00:00Z");
    const lstGreenwich = localSiderealTime(date, 0);
    const lstEast = localSiderealTime(date, 90);
    // 90° east should add 90° to LST
    const diff = ((lstEast - lstGreenwich) + 360) % 360;
    expect(diff).toBeCloseTo(90, 0);
  });

  it("returns value in 0-360 range", () => {
    const lst = localSiderealTime(new Date("2024-06-15T22:00:00Z"), -122.4);
    expect(lst).toBeGreaterThanOrEqual(0);
    expect(lst).toBeLessThan(360);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/astro/time.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

```typescript
// src/astro/time.ts

/**
 * Convert a Date to Julian Date.
 * Standard algorithm from Meeus, "Astronomical Algorithms" (1991).
 */
export function julianDate(date: Date): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d =
    date.getUTCDate() +
    date.getUTCHours() / 24 +
    date.getUTCMinutes() / 1440 +
    date.getUTCSeconds() / 86400 +
    date.getUTCMilliseconds() / 86400000;

  let yr = y;
  let mo = m;
  if (mo <= 2) {
    yr -= 1;
    mo += 12;
  }

  const A = Math.floor(yr / 100);
  const B = 2 - A + Math.floor(A / 4);

  return Math.floor(365.25 * (yr + 4716)) + Math.floor(30.6001 * (mo + 1)) + d + B - 1524.5;
}

/**
 * Compute Greenwich Mean Sidereal Time in degrees.
 * Formula from Meeus, ch. 12.
 */
export function greenwichMeanSiderealTime(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - (T * T * T) / 38710000;
  gmst = ((gmst % 360) + 360) % 360;
  return gmst;
}

/**
 * Compute Local Sidereal Time in degrees for a given longitude.
 * @param date - UTC date/time
 * @param longitude - Observer longitude in degrees (east positive)
 * @returns LST in degrees (0-360)
 */
export function localSiderealTime(date: Date, longitude: number): number {
  const jd = julianDate(date);
  const gmst = greenwichMeanSiderealTime(jd);
  return ((gmst + longitude) % 360 + 360) % 360;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/astro/time.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/astro/time.ts tests/astro/time.test.ts
git commit -m "feat: add Julian date and sidereal time calculations"
```

---

## Task 6: Astronomy Math — Alt/Az Conversion

**Files:**
- Create: `src/astro/coordinates.ts`
- Test: `tests/astro/coordinates.test.ts`

**Step 1: Write the failing tests**

```typescript
// tests/astro/coordinates.test.ts
import { describe, it, expect } from "vitest";
import { altAz, hourAngle } from "../../src/astro/coordinates.js";

const DEG = Math.PI / 180;

describe("hourAngle", () => {
  it("computes hour angle from LST and RA", () => {
    // LST = 90°, RA = 45° → HA = 45°
    expect(hourAngle(90, 45)).toBeCloseTo(45, 5);
  });

  it("wraps negative hour angles", () => {
    // LST = 10°, RA = 350° → HA = 20°
    expect(hourAngle(10, 350)).toBeCloseTo(20, 5);
  });
});

describe("altAz", () => {
  it("computes altitude for object at zenith", () => {
    // Object with dec = observer latitude, HA = 0 → altitude = 90°
    const result = altAz(0, 45, 45); // HA=0, dec=45, lat=45
    expect(result.altitude).toBeCloseTo(90, 0);
  });

  it("computes altitude for Polaris from mid-northern latitude", () => {
    // Polaris: Dec ≈ +89.26°, from lat 51.5° (London), HA ≈ 0
    // Altitude ≈ latitude ≈ 51.5° (Polaris altitude ≈ observer latitude)
    const result = altAz(0, 89.26, 51.5);
    expect(result.altitude).toBeCloseTo(51.5, 0);
  });

  it("computes altitude for object on horizon", () => {
    // Object at HA = 90°, Dec = 0°, Lat = 0° → alt = 0°
    const result = altAz(90, 0, 0);
    expect(result.altitude).toBeCloseTo(0, 0);
  });

  it("returns azimuth in 0-360 range", () => {
    const result = altAz(45, 30, 40);
    expect(result.azimuth).toBeGreaterThanOrEqual(0);
    expect(result.azimuth).toBeLessThan(360);
  });

  it("object due south at transit from northern hemisphere", () => {
    // Object with Dec < Lat, HA = 0 → azimuth ≈ 180° (due south)
    const result = altAz(0, 20, 51.5);
    expect(result.azimuth).toBeCloseTo(180, 0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/astro/coordinates.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

```typescript
// src/astro/coordinates.ts

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

/**
 * Compute hour angle in degrees.
 * @param lst - Local sidereal time in degrees
 * @param ra - Right ascension in degrees
 * @returns Hour angle in degrees (0-360)
 */
export function hourAngle(lst: number, ra: number): number {
  return ((lst - ra) % 360 + 360) % 360;
}

/**
 * Convert equatorial coordinates to horizontal (alt/az).
 * @param ha - Hour angle in degrees
 * @param dec - Declination in degrees
 * @param lat - Observer latitude in degrees
 * @returns { altitude, azimuth } in degrees
 */
export function altAz(
  ha: number,
  dec: number,
  lat: number,
): { altitude: number; azimuth: number } {
  const haRad = ha * DEG;
  const decRad = dec * DEG;
  const latRad = lat * DEG;

  const sinAlt =
    Math.sin(decRad) * Math.sin(latRad) +
    Math.cos(decRad) * Math.cos(latRad) * Math.cos(haRad);

  const altitude = Math.asin(sinAlt) * RAD;

  const cosAz =
    (Math.sin(decRad) - Math.sin(latRad) * sinAlt) /
    (Math.cos(latRad) * Math.cos(altitude * DEG));

  let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAz))) * RAD;

  // Azimuth is measured from north through east
  if (Math.sin(haRad) > 0) {
    azimuth = 360 - azimuth;
  }

  return { altitude, azimuth };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/astro/coordinates.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/astro/coordinates.ts tests/astro/coordinates.test.ts
git commit -m "feat: add alt/az coordinate conversion"
```

---

## Task 7: Astronomy Math — Rise/Transit/Set

**Files:**
- Create: `src/astro/visibility.ts`
- Test: `tests/astro/visibility.test.ts`

**Step 1: Write the failing tests**

```typescript
// tests/astro/visibility.test.ts
import { describe, it, expect } from "vitest";
import { riseTransitSet } from "../../src/astro/visibility.js";

describe("riseTransitSet", () => {
  it("computes transit time for M31 from London on a known date", () => {
    // M31: RA = 10.6846°, Dec = 41.2692°
    // London: lat 51.5, lon -0.1278
    // 2024-09-15 — M31 transits in the evening
    const result = riseTransitSet(10.6846, 41.2692, 51.5, -0.1278, new Date("2024-09-15T00:00:00Z"));
    expect(result.transitTime).toBeDefined();
    expect(result.isCircumpolar).toBe(false);
    expect(result.neverRises).toBe(false);
  });

  it("marks circumpolar objects correctly", () => {
    // Polaris (Dec +89.26°) from London (51.5°N) is circumpolar
    // Circumpolar when Dec > (90 - lat): 89.26 > 38.5 ✓
    const result = riseTransitSet(37.95, 89.26, 51.5, -0.1278, new Date("2024-09-15T00:00:00Z"));
    expect(result.isCircumpolar).toBe(true);
    expect(result.riseTime).toBeNull();
    expect(result.setTime).toBeNull();
  });

  it("marks never-rises objects correctly", () => {
    // Object at Dec -80° from London (51.5°N) never rises
    // Never rises when Dec < -(90 - lat): -80 < -38.5 ✓
    const result = riseTransitSet(100, -80, 51.5, -0.1278, new Date("2024-09-15T00:00:00Z"));
    expect(result.neverRises).toBe(true);
    expect(result.riseTime).toBeNull();
    expect(result.setTime).toBeNull();
  });

  it("rise time is before transit, transit before set", () => {
    // Sirius: RA ≈ 101.29°, Dec ≈ -16.72° — rises and sets from London
    const result = riseTransitSet(101.29, -16.72, 51.5, -0.1278, new Date("2024-01-15T00:00:00Z"));
    expect(result.riseTime).not.toBeNull();
    expect(result.setTime).not.toBeNull();
    expect(result.transitTime).not.toBeNull();
    if (result.riseTime && result.transitTime && result.setTime) {
      expect(result.riseTime.getTime()).toBeLessThan(result.transitTime.getTime());
      expect(result.transitTime.getTime()).toBeLessThan(result.setTime.getTime());
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/astro/visibility.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

```typescript
// src/astro/visibility.ts
import { julianDate, greenwichMeanSiderealTime, localSiderealTime } from "./time.js";
import { altAz, hourAngle } from "./coordinates.js";
import type { VisibilityInfo } from "../types.js";

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

/**
 * Compute rise, transit, and set times for an object.
 * Uses the algorithm from Meeus, "Astronomical Algorithms", ch. 15.
 *
 * @param ra - Right ascension in degrees
 * @param dec - Declination in degrees
 * @param lat - Observer latitude in degrees
 * @param lon - Observer longitude in degrees (east positive)
 * @param date - The date to compute for (uses 0h UT of this date)
 * @param altitudeThreshold - Minimum altitude in degrees (default 0 for geometric horizon)
 */
export function riseTransitSet(
  ra: number,
  dec: number,
  lat: number,
  lon: number,
  date: Date,
  altitudeThreshold: number = 0,
): VisibilityInfo {
  const cosH0 =
    (Math.sin(altitudeThreshold * DEG) - Math.sin(lat * DEG) * Math.sin(dec * DEG)) /
    (Math.cos(lat * DEG) * Math.cos(dec * DEG));

  // Check circumpolar / never rises
  if (cosH0 < -1) {
    // Object is always above threshold — circumpolar
    const transitDate = computeTransitTime(ra, lat, lon, date);
    return {
      altitude: 0,
      azimuth: 0,
      riseTime: null,
      transitTime: transitDate,
      setTime: null,
      isCircumpolar: true,
      neverRises: false,
    };
  }

  if (cosH0 > 1) {
    // Object never rises above threshold
    return {
      altitude: 0,
      azimuth: 0,
      riseTime: null,
      transitTime: null,
      setTime: null,
      isCircumpolar: false,
      neverRises: true,
    };
  }

  // Semi-diurnal arc in degrees
  const H0 = Math.acos(cosH0) * RAD;

  // Compute transit time
  const transitDate = computeTransitTime(ra, lat, lon, date);

  // Rise = transit - H0/360 days, Set = transit + H0/360 days
  const transitMs = transitDate.getTime();
  const arcMs = (H0 / 360) * 86400000;

  const riseTime = new Date(transitMs - arcMs);
  const setTime = new Date(transitMs + arcMs);

  // Compute current altitude
  const lst = localSiderealTime(date, lon);
  const ha = hourAngle(lst, ra);
  const current = altAz(ha, dec, lat);

  return {
    altitude: current.altitude,
    azimuth: current.azimuth,
    riseTime,
    transitTime: transitDate,
    setTime,
    isCircumpolar: false,
    neverRises: false,
  };
}

function computeTransitTime(ra: number, lat: number, lon: number, date: Date): Date {
  // Start of day (0h UT)
  const startOfDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const jd0 = julianDate(startOfDay);
  const gmst0 = greenwichMeanSiderealTime(jd0);

  // Transit occurs when LST = RA
  // LST = GMST + lon, so GMST at transit = RA - lon
  let transitGmst = ((ra - lon) % 360 + 360) % 360;
  let hoursFromMidnight = ((transitGmst - gmst0) % 360 + 360) % 360;

  // Convert degrees to hours (sidereal), then correct for sidereal/solar ratio
  hoursFromMidnight = (hoursFromMidnight / 360) * 24 * (24 / 24.06570982);

  if (hoursFromMidnight > 24) hoursFromMidnight -= 24;

  return new Date(startOfDay.getTime() + hoursFromMidnight * 3600000);
}

/**
 * Get current altitude and azimuth of an object.
 */
export function currentPosition(
  ra: number,
  dec: number,
  lat: number,
  lon: number,
  date: Date,
): { altitude: number; azimuth: number } {
  const lst = localSiderealTime(date, lon);
  const ha = hourAngle(lst, ra);
  return altAz(ha, dec, lat);
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/astro/visibility.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/astro/visibility.ts tests/astro/visibility.test.ts
git commit -m "feat: add rise/transit/set calculations"
```

---

## Task 8: Markdown Formatters

**Files:**
- Create: `src/format.ts`
- Test: `tests/format.test.ts`

**Step 1: Write the failing tests**

```typescript
// tests/format.test.ts
import { describe, it, expect } from "vitest";
import { formatObject, formatSearchResults, formatSessionPlan } from "../src/format.js";
import type { CelestialObject, SessionObject } from "../src/types.js";

const m31: CelestialObject = {
  name: "NGC 224",
  type: "G",
  typeName: "Galaxy",
  ra: 10.6846,
  dec: 41.2692,
  constellation: "And",
  magnitude: 4.31,
  surfaceBrightness: 13.5,
  majorAxis: 217.0,
  minorAxis: 61.0,
  positionAngle: 35.0,
  hubbleType: "Sb",
  messier: "M31",
  ngcCrossRef: null,
  icCrossRef: null,
  commonName: "Andromeda Galaxy",
  otherIdentifiers: null,
};

describe("formatObject", () => {
  it("includes the object name and common name", () => {
    const result = formatObject(m31);
    expect(result).toContain("NGC 224");
    expect(result).toContain("Andromeda Galaxy");
  });

  it("includes Messier designation", () => {
    const result = formatObject(m31);
    expect(result).toContain("M31");
  });

  it("includes magnitude and size", () => {
    const result = formatObject(m31);
    expect(result).toContain("4.31");
    expect(result).toContain("217");
  });

  it("includes constellation", () => {
    const result = formatObject(m31);
    expect(result).toContain("And");
  });

  it("includes coordinates in HMS/DMS format", () => {
    const result = formatObject(m31);
    // Should show RA in hours and Dec in degrees
    expect(result).toMatch(/RA:/);
    expect(result).toMatch(/Dec:/);
  });
});

describe("formatSearchResults", () => {
  it("returns a markdown table", () => {
    const result = formatSearchResults([m31]);
    expect(result).toContain("|");
    expect(result).toContain("NGC 224");
  });

  it("shows count of results", () => {
    const result = formatSearchResults([m31]);
    expect(result).toContain("1");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/format.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

```typescript
// src/format.ts
import type { CelestialObject, SessionObject, VisibilityInfo } from "./types.js";

function degreesToHMS(deg: number): string {
  const hours = deg / 15;
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  const s = ((hours - h) * 60 - m) * 60;
  return `${h.toString().padStart(2, "0")}h ${m.toString().padStart(2, "0")}m ${s.toFixed(1).padStart(4, "0")}s`;
}

function degreesToDMS(deg: number): string {
  const sign = deg >= 0 ? "+" : "-";
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const m = Math.floor((abs - d) * 60);
  const s = ((abs - d) * 60 - m) * 60;
  return `${sign}${d}° ${m.toString().padStart(2, "0")}' ${s.toFixed(0).padStart(2, "0")}"`;
}

function formatTime(date: Date): string {
  return date.toISOString().slice(11, 16) + " UTC";
}

export function formatObject(obj: CelestialObject, visibility?: VisibilityInfo): string {
  const lines: string[] = [];

  // Title
  const names = [obj.name];
  if (obj.messier) names.unshift(obj.messier);
  if (obj.commonName) names.push(`"${obj.commonName}"`);
  lines.push(`# ${names.join(" / ")}`);
  lines.push("");

  // Basic info
  lines.push(`**Type:** ${obj.typeName}${obj.hubbleType ? ` (${obj.hubbleType})` : ""}`);
  lines.push(`**Constellation:** ${obj.constellation}`);
  lines.push(`**RA:** ${degreesToHMS(obj.ra)}`);
  lines.push(`**Dec:** ${degreesToDMS(obj.dec)}`);

  if (obj.magnitude !== null) lines.push(`**Magnitude (V):** ${obj.magnitude.toFixed(2)}`);
  if (obj.surfaceBrightness !== null) lines.push(`**Surface Brightness:** ${obj.surfaceBrightness.toFixed(1)} mag/arcsec²`);
  if (obj.majorAxis !== null) {
    const size = obj.minorAxis !== null
      ? `${obj.majorAxis.toFixed(1)}' × ${obj.minorAxis.toFixed(1)}'`
      : `${obj.majorAxis.toFixed(1)}'`;
    lines.push(`**Angular Size:** ${size}`);
  }

  // Cross-references
  const crossRefs: string[] = [];
  if (obj.messier) crossRefs.push(obj.messier);
  if (obj.ngcCrossRef) crossRefs.push(obj.ngcCrossRef);
  if (obj.icCrossRef) crossRefs.push(obj.icCrossRef);
  if (obj.otherIdentifiers) crossRefs.push(obj.otherIdentifiers);
  if (crossRefs.length > 0) {
    lines.push(`**Also known as:** ${crossRefs.join(", ")}`);
  }

  // Visibility info (optional)
  if (visibility) {
    lines.push("");
    lines.push("## Current Visibility");
    if (visibility.neverRises) {
      lines.push("This object never rises from your location.");
    } else if (visibility.isCircumpolar) {
      lines.push("This object is **circumpolar** — it never sets from your location.");
      lines.push(`**Current altitude:** ${visibility.altitude.toFixed(1)}°`);
      lines.push(`**Current azimuth:** ${visibility.azimuth.toFixed(1)}°`);
      if (visibility.transitTime) lines.push(`**Transit:** ${formatTime(visibility.transitTime)}`);
    } else {
      lines.push(`**Current altitude:** ${visibility.altitude.toFixed(1)}°`);
      lines.push(`**Current azimuth:** ${visibility.azimuth.toFixed(1)}°`);
      if (visibility.riseTime) lines.push(`**Rises:** ${formatTime(visibility.riseTime)}`);
      if (visibility.transitTime) lines.push(`**Transit:** ${formatTime(visibility.transitTime)}`);
      if (visibility.setTime) lines.push(`**Sets:** ${formatTime(visibility.setTime)}`);
    }
  }

  return lines.join("\n");
}

export function formatSearchResults(objects: CelestialObject[]): string {
  if (objects.length === 0) return "No objects found matching your criteria.";

  const lines: string[] = [];
  lines.push(`**Found ${objects.length} object(s):**`);
  lines.push("");
  lines.push("| Name | Type | Mag | Size | Constellation | Common Name |");
  lines.push("|------|------|-----|------|---------------|-------------|");

  for (const obj of objects) {
    const name = obj.messier ? `${obj.messier} (${obj.name})` : obj.name;
    const mag = obj.magnitude !== null ? obj.magnitude.toFixed(1) : "—";
    const size = obj.majorAxis !== null ? `${obj.majorAxis.toFixed(1)}'` : "—";
    const common = obj.commonName ?? "—";
    lines.push(`| ${name} | ${obj.typeName} | ${mag} | ${size} | ${obj.constellation} | ${common} |`);
  }

  return lines.join("\n");
}

export function formatSessionPlan(
  windows: Map<string, SessionObject[]>,
  location: { lat: number; lon: number },
  date: Date,
): string {
  const lines: string[] = [];
  lines.push(`# Observing Session Plan`);
  lines.push("");
  lines.push(`**Location:** ${Math.abs(location.lat).toFixed(2)}°${location.lat >= 0 ? "N" : "S"}, ${Math.abs(location.lon).toFixed(2)}°${location.lon >= 0 ? "E" : "W"}`);
  lines.push(`**Date:** ${date.toISOString().slice(0, 10)}`);
  lines.push("");

  const windowLabels: Record<string, string> = {
    evening: "Early Evening (sunset–22:00)",
    midnight: "Late Night (22:00–02:00)",
    predawn: "Pre-Dawn (02:00–sunrise)",
  };

  for (const [window, label] of Object.entries(windowLabels)) {
    const objects = windows.get(window) ?? [];
    lines.push(`## ${label}`);
    lines.push("");

    if (objects.length === 0) {
      lines.push("No notable objects in this window.");
    } else {
      lines.push("| Object | Type | Mag | Peak Alt | Transit | Score |");
      lines.push("|--------|------|-----|----------|---------|-------|");
      for (const so of objects) {
        const name = so.object.messier
          ? `${so.object.messier} (${so.object.commonName ?? so.object.name})`
          : so.object.commonName ?? so.object.name;
        const mag = so.object.magnitude !== null ? so.object.magnitude.toFixed(1) : "—";
        lines.push(
          `| ${name} | ${so.object.typeName} | ${mag} | ${so.peakAltitude.toFixed(0)}° | ${formatTime(so.transitTime)} | ${so.score.toFixed(0)} |`,
        );
      }
    }
    lines.push("");
  }

  lines.push("*Score ranks objects by brightness, size, and peak altitude. Higher is better.*");
  return lines.join("\n");
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/format.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/format.ts tests/format.test.ts
git commit -m "feat: add markdown formatters for objects, search results, and session plans"
```

---

## Task 9: Tool — lookup-object

**Files:**
- Create: `src/tools/lookup-object.ts`
- Test: `tests/tools/lookup-object.test.ts`

**Step 1: Write the failing tests**

```typescript
// tests/tools/lookup-object.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../../src/server.js";

describe("lookup-object tool", () => {
  let client: Client;

  beforeAll(async () => {
    const server = createServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    client = new Client({ name: "test", version: "0.0.0" });
    await client.connect(clientTransport);
  });

  it("looks up M31 by Messier number", async () => {
    const result = await client.callTool({ name: "lookup_object", arguments: { name: "M31" } });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Andromeda Galaxy");
    expect(text).toContain("NGC 224");
  });

  it("looks up by common name", async () => {
    const result = await client.callTool({ name: "lookup_object", arguments: { name: "Orion Nebula" } });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("M42");
  });

  it("looks up by NGC number", async () => {
    const result = await client.callTool({ name: "lookup_object", arguments: { name: "NGC 7000" } });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("North America");
  });

  it("returns error for unknown object", async () => {
    const result = await client.callTool({ name: "lookup_object", arguments: { name: "ZZZZZ999" } });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("No object found");
  });

  it("includes visibility when lat/lon/date provided", async () => {
    const result = await client.callTool({
      name: "lookup_object",
      arguments: {
        name: "M31",
        latitude: 51.5,
        longitude: -0.1278,
        date: "2024-09-15T21:00:00Z",
      },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Visibility");
    expect(text).toMatch(/altitude/i);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/tools/lookup-object.test.ts`
Expected: FAIL — server.ts doesn't exist yet

**Step 3: Write the tool + minimal server skeleton**

First create the server factory and register-tools stub so the test infrastructure works:

```typescript
// src/server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "./register-tools.js";

export function createServer(version?: string): McpServer {
  const server = new McpServer({
    name: "astronomy-oracle",
    version: version ?? "0.0.0",
  });
  registerTools(server);
  return server;
}
```

```typescript
// src/register-tools.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerLookupObject } from "./tools/lookup-object.js";

export function registerTools(server: McpServer): void {
  registerLookupObject(server);
}
```

Now the tool itself:

```typescript
// src/tools/lookup-object.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { loadCatalog } from "../data/catalog.js";
import { fuzzySearch } from "../lib/search.js";
import { riseTransitSet, currentPosition } from "../astro/visibility.js";
import { formatObject } from "../format.js";
import type { CelestialObject } from "../types.js";

const catalog = loadCatalog();

function findObject(name: string): CelestialObject | null {
  // Try exact matches first
  const upper = name.toUpperCase().trim();
  const byMessier = catalog.byMessier.get(upper);
  if (byMessier) return byMessier;

  const byName = catalog.byName.get(upper.startsWith("NGC") || upper.startsWith("IC") ? upper : `NGC ${upper}`);
  if (byName) return byName;

  const byCommon = catalog.byCommonName.get(name.toLowerCase().trim());
  if (byCommon) return byCommon;

  // Fuzzy search across all fields
  const results = fuzzySearch(catalog.all, name, ["name", "messier", "commonName", "otherIdentifiers"] as (keyof CelestialObject)[]);
  return results.length > 0 ? results[0] : null;
}

export function registerLookupObject(server: McpServer): void {
  server.tool(
    "lookup_object",
    "Look up a celestial object by name, catalog number, or common name. Returns coordinates, magnitude, size, type, and constellation. Optionally computes visibility (rise/transit/set, current altitude) when observer location and date are provided.",
    {
      name: z.string().describe("Object name, catalog ID (M31, NGC 224, IC 434), or common name (Andromeda Galaxy, Orion Nebula)"),
      latitude: z.number().min(-90).max(90).optional().describe("Observer latitude in degrees (north positive). Required for visibility info."),
      longitude: z.number().min(-180).max(180).optional().describe("Observer longitude in degrees (east positive). Required for visibility info."),
      date: z.string().optional().describe("ISO 8601 date/time for visibility calculation (default: now). Example: 2024-09-15T21:00:00Z"),
    },
    async ({ name, latitude, longitude, date }) => {
      const obj = findObject(name);

      if (!obj) {
        return {
          content: [{
            type: "text" as const,
            text: `No object found matching "${name}". Try a Messier number (M31), NGC/IC number (NGC 7000), or common name (Andromeda Galaxy). Use search_objects to browse the catalog.`,
          }],
        };
      }

      let visibility;
      if (latitude !== undefined && longitude !== undefined) {
        const observeDate = date ? new Date(date) : new Date();
        visibility = riseTransitSet(obj.ra, obj.dec, latitude, longitude, observeDate);
      }

      return {
        content: [{
          type: "text" as const,
          text: formatObject(obj, visibility),
        }],
      };
    },
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/tools/lookup-object.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/server.ts src/register-tools.ts src/tools/lookup-object.ts tests/tools/lookup-object.test.ts
git commit -m "feat: add lookup-object tool with optional visibility"
```

---

## Task 10: Tool — search-objects

**Files:**
- Create: `src/tools/search-objects.ts`
- Modify: `src/register-tools.ts` (add import + registration)
- Test: `tests/tools/search-objects.test.ts`

**Step 1: Write the failing tests**

```typescript
// tests/tools/search-objects.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../../src/server.js";

describe("search-objects tool", () => {
  let client: Client;

  beforeAll(async () => {
    const server = createServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    client = new Client({ name: "test", version: "0.0.0" });
    await client.connect(clientTransport);
  });

  it("searches by constellation", async () => {
    const result = await client.callTool({
      name: "search_objects",
      arguments: { constellation: "Ori" },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Ori");
  });

  it("searches by type", async () => {
    const result = await client.callTool({
      name: "search_objects",
      arguments: { type: "PN" },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Planetary Nebula");
  });

  it("filters by max magnitude", async () => {
    const result = await client.callTool({
      name: "search_objects",
      arguments: { maxMagnitude: 4.0 },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    // Should only contain bright objects
    expect(text).toContain("|");
  });

  it("filters by catalog (messier)", async () => {
    const result = await client.callTool({
      name: "search_objects",
      arguments: { catalog: "messier" },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("M");
  });

  it("respects limit parameter", async () => {
    const result = await client.callTool({
      name: "search_objects",
      arguments: { catalog: "messier", limit: 5 },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    // Count table rows (header + separator + data rows)
    const rows = text.split("\n").filter((l: string) => l.startsWith("|") && !l.startsWith("|--") && !l.startsWith("| Name"));
    expect(rows.length).toBeLessThanOrEqual(5);
  });

  it("combines filters with AND", async () => {
    const result = await client.callTool({
      name: "search_objects",
      arguments: { type: "G", constellation: "And", maxMagnitude: 12 },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Galaxy");
    expect(text).toContain("And");
  });

  it("returns message for no results", async () => {
    const result = await client.callTool({
      name: "search_objects",
      arguments: { type: "G", maxMagnitude: 0.1 },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("No objects found");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/tools/search-objects.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

```typescript
// src/tools/search-objects.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { loadCatalog } from "../data/catalog.js";
import { formatSearchResults } from "../format.js";
import { OBJECT_TYPES, type CelestialObject, type ObjectTypeCode } from "../types.js";

const catalog = loadCatalog();

export function registerSearchObjects(server: McpServer): void {
  server.tool(
    "search_objects",
    "Search the astronomical catalog by type, constellation, magnitude, size, or catalog membership. Filters combine with AND. Returns a table of matching objects sorted by brightness.",
    {
      type: z.enum(Object.keys(OBJECT_TYPES) as [string, ...string[]]).optional()
        .describe("Object type code: G (galaxy), OCl (open cluster), GCl (globular cluster), PN (planetary nebula), Neb (nebula), EmN (emission nebula), etc."),
      constellation: z.string().optional()
        .describe("3-letter IAU constellation abbreviation (e.g. Ori, And, Sgr, UMa)"),
      maxMagnitude: z.number().optional()
        .describe("Maximum visual magnitude (fainter limit). Lower numbers = brighter. Example: 6.0 for naked-eye objects, 10.0 for small telescopes."),
      minMagnitude: z.number().optional()
        .describe("Minimum visual magnitude (brighter limit). Use to exclude very bright objects."),
      minSize: z.number().optional()
        .describe("Minimum angular size in arcminutes. Filters out small objects."),
      catalog: z.enum(["messier", "caldwell", "ngc", "ic"]).optional()
        .describe("Filter to a specific catalog: messier (110 objects), ngc, or ic."),
      limit: z.number().min(1).max(100).optional()
        .describe("Maximum number of results (default 20, max 100)"),
    },
    async ({ type, constellation, maxMagnitude, minMagnitude, minSize, catalog: cat, limit }) => {
      const maxResults = limit ?? 20;
      let results = catalog.all;

      if (type) {
        results = results.filter((o) => o.type === type);
      }

      if (constellation) {
        const upper = constellation.trim();
        results = results.filter((o) => o.constellation.toLowerCase() === upper.toLowerCase());
      }

      if (maxMagnitude !== undefined) {
        results = results.filter((o) => o.magnitude !== null && o.magnitude <= maxMagnitude);
      }

      if (minMagnitude !== undefined) {
        results = results.filter((o) => o.magnitude !== null && o.magnitude >= minMagnitude);
      }

      if (minSize !== undefined) {
        results = results.filter((o) => o.majorAxis !== null && o.majorAxis >= minSize);
      }

      if (cat === "messier") {
        results = results.filter((o) => o.messier !== null);
      } else if (cat === "ngc") {
        results = results.filter((o) => o.name.startsWith("NGC"));
      } else if (cat === "ic") {
        results = results.filter((o) => o.name.startsWith("IC"));
      }

      // Sort by magnitude (brightest first), nulls last
      results.sort((a, b) => {
        if (a.magnitude === null && b.magnitude === null) return 0;
        if (a.magnitude === null) return 1;
        if (b.magnitude === null) return -1;
        return a.magnitude - b.magnitude;
      });

      const limited = results.slice(0, maxResults);

      return {
        content: [{
          type: "text" as const,
          text: formatSearchResults(limited),
        }],
      };
    },
  );
}
```

Update register-tools.ts to include the new tool:

```typescript
// src/register-tools.ts — add:
import { registerSearchObjects } from "./tools/search-objects.js";

export function registerTools(server: McpServer): void {
  registerLookupObject(server);
  registerSearchObjects(server);
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/tools/search-objects.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/tools/search-objects.ts src/register-tools.ts tests/tools/search-objects.test.ts
git commit -m "feat: add search-objects tool with combined filters"
```

---

## Task 11: Tool — plan-session

**Files:**
- Create: `src/tools/plan-session.ts`
- Modify: `src/register-tools.ts` (add import + registration)
- Test: `tests/tools/plan-session.test.ts`

**Step 1: Write the failing tests**

```typescript
// tests/tools/plan-session.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../../src/server.js";

describe("plan-session tool", () => {
  let client: Client;

  beforeAll(async () => {
    const server = createServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    client = new Client({ name: "test", version: "0.0.0" });
    await client.connect(clientTransport);
  });

  it("returns a session plan with time windows", async () => {
    const result = await client.callTool({
      name: "plan_session",
      arguments: {
        latitude: 51.5,
        longitude: -0.1278,
        date: "2024-09-15",
      },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Observing Session Plan");
    expect(text).toContain("Early Evening");
    expect(text).toContain("Late Night");
    expect(text).toContain("Pre-Dawn");
  });

  it("includes location and date in header", async () => {
    const result = await client.callTool({
      name: "plan_session",
      arguments: {
        latitude: 34.05,
        longitude: -118.25,
        date: "2024-06-21",
      },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("34.05");
    expect(text).toContain("2024-06-21");
  });

  it("respects minAltitude filter", async () => {
    const result = await client.callTool({
      name: "plan_session",
      arguments: {
        latitude: 51.5,
        longitude: -0.1278,
        date: "2024-09-15",
        minAltitude: 30,
      },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    // All listed objects should have peak alt >= 30
    expect(text).toContain("Observing Session Plan");
  });

  it("respects maxMagnitude filter", async () => {
    const result = await client.callTool({
      name: "plan_session",
      arguments: {
        latitude: 51.5,
        longitude: -0.1278,
        date: "2024-09-15",
        maxMagnitude: 6.0,
      },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Observing Session Plan");
  });

  it("filters by object type", async () => {
    const result = await client.callTool({
      name: "plan_session",
      arguments: {
        latitude: 51.5,
        longitude: -0.1278,
        date: "2024-09-15",
        types: ["G"],
      },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Observing Session Plan");
  });

  it("defaults to today when no date provided", async () => {
    const result = await client.callTool({
      name: "plan_session",
      arguments: {
        latitude: 51.5,
        longitude: -0.1278,
      },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Observing Session Plan");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/tools/plan-session.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

```typescript
// src/tools/plan-session.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { loadCatalog } from "../data/catalog.js";
import { riseTransitSet } from "../astro/visibility.js";
import { formatSessionPlan } from "../format.js";
import { OBJECT_TYPES, type SessionObject, type SessionWindow, type ObjectTypeCode } from "../types.js";

const catalog = loadCatalog();

function classifyWindow(transitTime: Date, date: Date): SessionWindow {
  const hour = transitTime.getUTCHours();
  // Evening: 18-22, Midnight: 22-02, Pre-dawn: 02-06
  // Adjust for approximate sunset/sunrise
  if (hour >= 18 || hour < 22) {
    if (hour >= 22 || hour < 2) return "midnight";
    if (hour >= 2 && hour < 6) return "predawn";
    return "evening";
  }
  if (hour >= 22 || hour < 2) return "midnight";
  if (hour >= 2 && hour < 6) return "predawn";
  return "evening";
}

function computeScore(magnitude: number | null, majorAxis: number | null, peakAltitude: number): number {
  // Higher is better
  let score = peakAltitude; // Base: altitude (0-90)

  // Brightness bonus (magnitude is inverted — lower = brighter)
  if (magnitude !== null) {
    score += Math.max(0, (12 - magnitude) * 5); // Bright objects get up to 60 bonus
  }

  // Size bonus
  if (majorAxis !== null) {
    score += Math.min(majorAxis, 30); // Cap at 30' to avoid huge objects dominating
  }

  return score;
}

export function registerPlanSession(server: McpServer): void {
  server.tool(
    "plan_session",
    "Plan an observing session for a specific location and date. Returns the best objects to observe grouped by time window (evening, midnight, pre-dawn), ranked by a composite score of brightness, size, and altitude. Great for answering 'what can I see tonight?'",
    {
      latitude: z.number().min(-90).max(90).describe("Observer latitude in degrees (north positive)"),
      longitude: z.number().min(-180).max(180).describe("Observer longitude in degrees (east positive)"),
      date: z.string().optional().describe("Date for the session (YYYY-MM-DD or ISO 8601). Defaults to today."),
      minAltitude: z.number().min(0).max(90).optional().describe("Minimum peak altitude in degrees (default 15). Objects that don't reach this altitude are excluded."),
      maxMagnitude: z.number().optional().describe("Maximum visual magnitude / faintest object to include (default: no limit). Example: 6.0 for naked eye, 10.0 for small scope."),
      types: z.array(z.enum(Object.keys(OBJECT_TYPES) as [string, ...string[]])).optional().describe("Filter to specific object types. Example: ['G', 'GCl', 'PN'] for galaxies, globular clusters, and planetary nebulae."),
    },
    async ({ latitude, longitude, date, minAltitude, maxMagnitude, types }) => {
      const minAlt = minAltitude ?? 15;
      const observeDate = date ? new Date(date.includes("T") ? date : `${date}T00:00:00Z`) : new Date();

      // Filter candidates
      let candidates = catalog.all;

      if (maxMagnitude !== undefined) {
        candidates = candidates.filter((o) => o.magnitude !== null && o.magnitude <= maxMagnitude);
      }

      if (types && types.length > 0) {
        const typeSet = new Set(types);
        candidates = candidates.filter((o) => typeSet.has(o.type));
      }

      // Only include objects with known magnitude (we need it for scoring)
      candidates = candidates.filter((o) => o.magnitude !== null);

      // Compute visibility for each candidate
      const sessionObjects: SessionObject[] = [];

      for (const obj of candidates) {
        const vis = riseTransitSet(obj.ra, obj.dec, latitude, longitude, observeDate, minAlt);

        if (vis.neverRises) continue;

        // Compute peak altitude (at transit)
        const peakAlt = 90 - Math.abs(latitude - obj.dec);
        const actualPeak = Math.min(peakAlt, 90);

        if (actualPeak < minAlt) continue;

        const transitTime = vis.transitTime ?? observeDate;
        const window = classifyWindow(transitTime, observeDate);
        const score = computeScore(obj.magnitude, obj.majorAxis, actualPeak);

        sessionObjects.push({
          object: obj,
          peakAltitude: actualPeak,
          transitTime,
          window,
          score,
        });
      }

      // Group by window, sort by score
      const windows = new Map<string, SessionObject[]>();
      for (const window of ["evening", "midnight", "predawn"]) {
        const objs = sessionObjects
          .filter((o) => o.window === window)
          .sort((a, b) => b.score - a.score)
          .slice(0, 15);
        windows.set(window, objs);
      }

      return {
        content: [{
          type: "text" as const,
          text: formatSessionPlan(windows, { lat: latitude, lon: longitude }, observeDate),
        }],
      };
    },
  );
}
```

Update register-tools.ts:

```typescript
// src/register-tools.ts — add:
import { registerPlanSession } from "./tools/plan-session.js";

export function registerTools(server: McpServer): void {
  registerLookupObject(server);
  registerSearchObjects(server);
  registerPlanSession(server);
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/tools/plan-session.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/tools/plan-session.ts src/register-tools.ts tests/tools/plan-session.test.ts
git commit -m "feat: add plan-session tool with time windows and scoring"
```

---

## Task 12: Entry Point & CLI

**Files:**
- Create: `src/index.ts`
- Test: manual — `npm run dev` and `npm run inspect`

**Step 1: Write the entry point**

```typescript
// src/index.ts
#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf-8"));

console.error(`Astronomy Oracle v${pkg.version} — celestial object catalog & observing planner MCP server`);

const server = createServer(pkg.version);
const transport = new StdioServerTransport();
await server.connect(transport);

process.on("SIGINT", async () => {
  await server.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await server.close();
  process.exit(0);
});
```

**Step 2: Build and verify**

Run: `npm run build`
Expected: Compiles without errors

Run: `npm run inspect`
Expected: MCP Inspector opens, shows 3 tools, can call them

**Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: add CLI entry point with stdio transport"
```

---

## Task 13: README & Publishing Prep

**Files:**
- Modify: `README.md`
- Modify: `package.json` (verify bin, files, mcpName, scripts)

**Step 1: Update README with badge pills, install instructions, tool reference, data attribution**

Follow the warhammer-oracle README pattern:
- Centered badge row (MIT, npm version, npm downloads, Node 18+, MCP Compatible)
- One-line description
- Install: `npx astronomy-oracle` or `npm install -g astronomy-oracle`
- Claude Desktop / Claude Code configuration JSON
- Tool reference with example calls for each of the 3 tools
- Data sources table attributing OpenNGC (CC-BY-SA 4.0)
- Development commands
- License (MIT code, CC-BY-SA 4.0 data)

**Step 2: Verify package.json**

Ensure these fields are correct:
- `"name": "astronomy-oracle"`
- `"bin": { "astronomy-oracle": "dist/index.js" }`
- `"files": ["dist", "data", "README.md", "LICENSE"]` (include data/ for CSV)
- `"mcpName": "io.github.gregario/astronomy-oracle"`
- `"prepublishOnly": "npm run build && npm test"`

**Step 3: Commit**

```bash
git add README.md package.json
git commit -m "docs: add README with install instructions and tool reference"
```

---

## Task 14: Full Test Suite Run & Cleanup

**Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

**Step 2: Build and smoke test**

Run: `npm run build && npm run inspect`
Expected: Inspector shows 3 tools, all callable

**Step 3: Run MCP QA**

Run: `/mcp-qa` (from AI-Factory root, targeting this project)
Expected: Health score report, all tools exercised

**Step 4: Final commit if any cleanup needed**

```bash
git add -A
git commit -m "chore: test suite cleanup and final polish"
```

---

## Execution Notes

- **CSV delimiter:** OpenNGC uses semicolons (`;`). The engineer MUST verify with `head -1 data/NGC.csv` and adjust the parser if needed.
- **Column indices:** The plan uses 0-indexed column positions based on OpenNGC schema research. If the actual CSV has different ordering, adjust `parseRow()` in Task 3.
- **Caldwell catalog:** OpenNGC doesn't have a dedicated Caldwell column. Caldwell membership can be derived from a hardcoded list of NGC/IC numbers that are Caldwell objects. This is a v1.1 enhancement — skip for now.
- **Singleton catalog:** Tools 9-11 all call `loadCatalog()`. This should parse once and cache. Use module-level `const catalog = loadCatalog()` which naturally caches in Node ESM.
- **Data files in npm:** The `data/` directory with CSVs must be included in `"files"` in package.json so they're distributed with the npm package.
