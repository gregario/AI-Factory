# Project Structure — React Native

## Expo Router Project

```
project-name/
  app/                        # Routes (file-based navigation)
    _layout.tsx               # Root layout (providers, fonts, splash)
    index.tsx                 # Landing / redirect
    (tabs)/                   # Tab navigator group
      _layout.tsx             # Tab bar configuration
      index.tsx               # Home tab
      profile.tsx             # Profile tab
      settings.tsx            # Settings tab
    (auth)/                   # Auth flow group (unauthenticated)
      _layout.tsx             # Auth layout (no tab bar)
      login.tsx
      register.tsx
    brew/
      [id].tsx                # Dynamic route: /brew/123
      new.tsx                 # Static route: /brew/new
    +not-found.tsx            # 404 screen
  components/                 # Reusable UI components
    ui/                       # Generic primitives (Button, Card, Modal, Input)
    features/                 # Feature-specific components (BrewCard, RecipeForm)
  hooks/                      # Custom React hooks
  stores/                     # Zustand or Jotai stores
  lib/                        # Utilities, API clients, formatters
    api.ts                    # API client (fetch wrapper, base URL, auth headers)
    format.ts                 # Formatters (dates, currency, etc.)
    storage.ts                # Secure storage helpers (expo-secure-store wrapper)
  constants/                  # App-wide constants (colors, spacing, config)
    colors.ts
    layout.ts
  types/                      # Shared type definitions
    index.ts                  # Re-export all types
    api.ts                    # API response/request types
  assets/                     # Static assets (images, fonts, animations)
    images/
    fonts/
  tests/                      # Test infrastructure
    helpers.tsx               # Test providers, render utilities
    mocks/
      handlers.ts             # MSW request handlers
      server.ts               # MSW server setup
    setup.ts                  # Jest setup (MSW, mocks)
  e2e/                        # Detox end-to-end tests
    login.test.ts
    .detoxrc.js
  app.config.ts               # Expo config (app name, icons, plugins, env vars)
  tsconfig.json
  package.json
  eas.json                    # EAS Build profiles (dev, preview, production)
  .env                        # Local env vars (gitignored)
  .env.example                # Env var template (committed)
```

---

## Key Conventions

### Routes live in `app/` only

All screens are route files inside `app/`. No screen components outside this directory. If a screen needs to be decomposed, extract the UI into `components/features/` and keep the route file thin:

```tsx
// app/brew/[id].tsx — thin route file
import { useLocalSearchParams } from 'expo-router';
import { BrewDetailScreen } from '@/components/features/BrewDetailScreen';

export default function BrewRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <BrewDetailScreen brewId={id} />;
}
```

### Route groups for layout variants

Use parenthesised groups `(tabs)`, `(auth)`, `(onboarding)` to apply different layouts without affecting the URL. The group name doesn't appear in the URL path.

### Components follow the simple/complex split

```
components/
  ui/
    Button.tsx                 # Simple — single file
    Input.tsx
  features/
    BrewCard.tsx               # Simple feature component
    RecipeForm/                # Complex — folder with colocated tests
      RecipeForm.tsx
      RecipeForm.test.tsx
      useRecipeValidation.ts
```

Simple components are single files. Complex components with tests, hooks, or sub-components become folders.

### Absolute imports via path aliases

Configure `tsconfig.json` for `@/` imports:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

All imports use `@/components/...`, `@/hooks/...`, `@/lib/...`. No deep relative paths.

---

## Configuration Files

### app.config.ts

Use `app.config.ts` (not `app.json`) for dynamic configuration:

```ts
import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'My App',
  slug: 'my-app',
  scheme: 'myapp',
  plugins: [
    'expo-router',
    'expo-secure-store',
  ],
  extra: {
    apiUrl: process.env.API_URL ?? 'https://api.example.com',
    eas: { projectId: process.env.EAS_PROJECT_ID },
  },
});
```

### eas.json

Define build profiles for different environments:

```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": true }
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": { "appleId": "your@apple.id", "ascAppId": "123456789" },
      "android": { "serviceAccountKeyPath": "./google-sa-key.json" }
    }
  }
}
```

### tsconfig.json

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

The non-negotiable is `strict: true`. Expo provides sensible defaults via `expo/tsconfig.base`.

---

## Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Route files | kebab-case or [param] | `settings.tsx`, `[id].tsx` |
| Components | PascalCase | `BrewCard.tsx`, `Button.tsx` |
| Hooks | camelCase with `use` prefix | `useBreweries.ts` |
| Stores | camelCase with `use` prefix | `useBrewingStore.ts` |
| Utilities | camelCase | `format.ts`, `api.ts` |
| Constants | camelCase file, UPPER_SNAKE values | `colors.ts`, `MAX_RETRIES` |
| Types | PascalCase file and types | `api.ts`, `type Brew = { ... }` |
| Test files | `*.test.tsx` / `*.test.ts` | `BrewCard.test.tsx` |
| E2E tests | `e2e/*.test.ts` | `e2e/login.test.ts` |
| Assets | kebab-case | `app-icon.png`, `splash.png` |

---

## What Goes Where

| I need to... | Put it in... |
|--------------|-------------|
| Add a new screen | `app/` (as a route file) |
| Build a reusable button | `components/ui/` |
| Build a brew list card | `components/features/` |
| Fetch data from an API | `hooks/` (custom hook using React Query) |
| Store UI-only state | `stores/` (Zustand or Jotai) |
| Format a date or price | `lib/` |
| Define API response types | `types/` |
| Store auth tokens | `lib/storage.ts` (wraps expo-secure-store) |
| Configure the app | `app.config.ts` |
| Set up CI builds | `eas.json` |
