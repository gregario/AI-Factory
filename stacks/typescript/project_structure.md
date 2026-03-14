# Project Structure — TypeScript

## Backend Projects (Node.js)

```
project-name/
  src/
    index.ts          # Entry point
    types.ts          # Shared type definitions
    db/               # Database layer (connection, queries, schema)
    tools/            # Tool/handler groups (MCP tools, CLI commands, route handlers)
    lib/              # Shared utility modules (not a dumping ground — each file has a purpose)
  tests/
    setup.ts          # Test helpers, DB setup/teardown, seed functions
    *.test.ts         # Test files — mirror src/ structure where logical
  dist/               # Compiled output (gitignored)
  package.json
  tsconfig.json
```

### Key conventions

**`src/` is the only source directory.**
All TypeScript source lives here. No code in the root directory.

**`types.ts` for shared types.**
Types used across multiple modules go in a single `types.ts` at the src root.
Types used by only one module can live in that module's file.

**Group by domain, not by technical role.**
Prefer `src/tools/intents.ts` over `src/controllers/intentController.ts`.
The domain grouping makes it obvious what each file does without needing a mental map.

**Tests mirror source structure.**
If `src/tools/intents.ts` exists, its tests live in `tests/intents.test.ts`.
For projects that prefer colocated tests: `src/tools/intents.test.ts` is also fine — pick one convention per project.

---

## Frontend Projects (React/Next.js)

```
project-name/
  src/
    app/              # Pages/routes (Next.js app router) or entry point
    components/       # Reusable UI components
      ui/             # Generic UI primitives (Button, Card, Modal)
      features/       # Feature-specific components (UserProfile, TaskBoard)
    hooks/            # Custom React hooks
    lib/              # Utilities, API clients, helpers
    types.ts          # Shared type definitions
  public/             # Static assets
  tests/              # E2E or integration tests
  package.json
  tsconfig.json
```

### Key conventions

**Components are folders when they have multiple files.**
```
components/
  Button.tsx            # Simple — single file
  UserProfile/          # Complex — folder
    UserProfile.tsx
    UserProfile.test.tsx
    useUserData.ts
```

**Colocate tests with components in frontend projects.**
Frontend components are easier to maintain when tests live next to them.

---

## Full-Stack Projects

Use the backend structure as the outer shell. Frontend lives in its own directory:

```
project-name/
  src/                # Backend source
  client/             # Frontend source (its own tsconfig, package.json if needed)
  tests/              # Backend tests
  package.json
  tsconfig.json
```

Or use a monorepo with workspaces if the frontend and backend are truly independent.

---

## tsconfig Essentials

Every project must include these in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

Adjust `target`, `module`, and `moduleResolution` for frontend projects (bundlers have different needs). The non-negotiable is `strict: true`.

---

## Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Files (backend) | kebab-case or camelCase | `signal-handler.ts` or `signalHandler.ts` |
| Files (frontend) | PascalCase for components, camelCase for utilities | `UserProfile.tsx`, `useAuth.ts` |
| Directories | kebab-case | `src/tools/`, `src/db/` |
| Test files | `*.test.ts` or `*.spec.ts` | `intents.test.ts` |
| Config files | Standard names | `tsconfig.json`, `vitest.config.ts` |

Pick one file naming convention per project and stick to it. Don't mix.
