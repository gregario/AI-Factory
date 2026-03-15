# Project Structure — Next.js

Extends `stacks/typescript/project_structure.md`. This covers Next.js-specific structure only.

---

## Standard Next.js App Router Layout

```
my-app/
  src/
    app/                    # App Router — routes, layouts, pages
      layout.tsx            # Root layout (html, body, fonts, providers)
      page.tsx              # Home page (/)
      not-found.tsx         # Global 404 page
      globals.css           # Global styles
      (auth)/               # Route group — no URL segment, shared auth layout
        login/
          page.tsx
        signup/
          page.tsx
        layout.tsx          # Auth-specific layout (centered card)
      dashboard/
        page.tsx            # /dashboard
        loading.tsx         # Suspense fallback while page streams
        error.tsx           # Error boundary ('use client')
        settings/
          page.tsx          # /dashboard/settings
      api/
        webhook/
          route.ts          # POST /api/webhook
    components/
      ui/                   # Generic UI primitives (Button, Card, Modal, Input)
      features/             # Feature-specific components (UserProfile, OrderTable)
    lib/                    # Utilities, database clients, shared logic
      db.ts                 # Database connection and queries
      env.ts                # Environment variable validation (Zod)
      utils.ts              # Shared utility functions
    actions/                # Server Actions (grouped by domain)
      cart.ts
      auth.ts
    types.ts                # Shared type definitions
  public/                   # Static assets (images, favicons, robots.txt)
  tests/
    setup.ts                # Vitest test helpers
    *.test.ts               # Unit/integration tests
  e2e/
    *.spec.ts               # Playwright end-to-end tests
  middleware.ts             # Edge middleware (auth guards, redirects)
  next.config.ts            # Next.js configuration
  tailwind.config.ts        # Tailwind CSS configuration (if using Tailwind)
  vitest.config.ts          # Vitest configuration
  playwright.config.ts      # Playwright configuration
  package.json
  tsconfig.json
```

---

## Key Conventions

### `app/` is for routing only

The `app/` directory defines routes and their associated files (page, layout, loading, error, not-found). Do NOT put reusable components, utilities, or business logic in `app/`. Those go in `components/`, `lib/`, or `actions/`.

Each route folder should contain at most:
- `page.tsx` — the page component
- `layout.tsx` — layout wrapper (optional)
- `loading.tsx` — streaming fallback (optional)
- `error.tsx` — error boundary (optional)
- `not-found.tsx` — 404 handler (optional)

### Route groups with `(parentheses)`

Use route groups to share layouts without adding URL segments:

```
app/
  (marketing)/          # No /marketing in the URL
    page.tsx            # Still serves /
    about/page.tsx      # /about
    layout.tsx          # Marketing layout (navbar, footer)
  (dashboard)/          # No /dashboard in the URL
    dashboard/page.tsx  # /dashboard
    settings/page.tsx   # /settings
    layout.tsx          # Dashboard layout (sidebar, topbar)
```

### Dynamic routes

```
app/
  products/
    [id]/               # /products/:id (dynamic segment)
      page.tsx
    [[...slug]]/        # /products/* (optional catch-all)
      page.tsx
```

Access params via the `params` prop (a Promise in Next.js 15+):

```tsx
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);
  return <ProductView product={product} />;
}
```

### Parallel routes with `@named`

Use parallel routes for modals, side panels, or independently loading sections:

```
app/
  dashboard/
    layout.tsx            # Renders {children} and {analytics}
    page.tsx              # Main content
    @analytics/
      page.tsx            # Loads independently, streams in
      loading.tsx         # Its own loading state
```

### Intercepting routes with `(.)`

Use intercepting routes for modal patterns (e.g., photo gallery where clicking opens a modal, but direct URL shows full page):

```
app/
  photos/
    [id]/
      page.tsx            # Full photo page (/photos/123)
    (.)photos/[id]/
      page.tsx            # Modal overlay when navigating from gallery
```

---

## `components/` Structure

Follow the TypeScript stack convention. Simple components are single files, complex ones are folders:

```
components/
  ui/
    Button.tsx              # Simple — single file
    Input.tsx
    Modal/                  # Complex — folder
      Modal.tsx
      Modal.test.tsx
      useModal.ts
  features/
    ProductCard.tsx
    OrderTable/
      OrderTable.tsx
      OrderTable.test.tsx
      useOrderFilters.ts
```

**Naming:** PascalCase for component files. camelCase for hooks and utilities.

---

## `lib/` Structure

Shared logic that is not a React component. One concept per file.

```
lib/
  db.ts           # Database client and query functions
  env.ts          # Zod-validated environment variables
  utils.ts        # Pure utility functions (formatCurrency, slugify, etc.)
  auth.ts         # Auth helpers (verifySession, getUser)
```

Do NOT create a `lib/` dumping ground. If a file grows past 200 lines, split it by domain.

---

## `actions/` Structure

Server Actions grouped by domain. Each file uses `'use server'` at the top.

```
actions/
  cart.ts         # addItem, removeItem, updateQuantity
  auth.ts         # signIn, signUp, signOut
  posts.ts        # createPost, updatePost, deletePost
```

Keep actions thin. They should validate input, call domain logic in `lib/`, and revalidate caches. If an action file exceeds 100 lines, the business logic probably belongs in `lib/`.

---

## Configuration Files

### next.config.ts

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'example.com' },
    ],
  },
};

export default nextConfig;
```

### tsconfig.json

Next.js generates this. The key addition over the base TypeScript stack config:

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "jsx": "preserve",
    "module": "esnext",
    "moduleResolution": "bundler",
    "paths": {
      "@/*": ["./src/*"]
    },
    "plugins": [{ "name": "next" }]
  }
}
```

**Note:** Next.js uses `bundler` module resolution (not `NodeNext`), and `"jsx": "preserve"` (the framework handles JSX transformation). These override the base TypeScript stack tsconfig — this is expected.

### package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
```

---

## Deployment

### Vercel (zero-config)

Push to a git repo connected to Vercel. No additional configuration needed.

### Cloudflare (OpenNext adapter)

For Cloudflare Workers/Pages deployment:

```bash
npm install @opennextjs/cloudflare
```

```typescript
// open-next.config.ts
import type { OpenNextConfig } from '@opennextjs/cloudflare';

const config: OpenNextConfig = {
  // Cloudflare-specific settings
};

export default config;
```

Build with `npx @opennextjs/cloudflare build` and deploy with `wrangler deploy`.

### Docker (self-hosted)

```dockerfile
FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

Enable standalone output in `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  output: 'standalone',
};
```

---

## Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Route files | lowercase | `page.tsx`, `layout.tsx`, `route.ts` |
| Component files | PascalCase | `Button.tsx`, `UserProfile.tsx` |
| Hook files | camelCase with `use` prefix | `useAuth.ts`, `useModal.ts` |
| Action files | camelCase | `cart.ts`, `auth.ts` |
| Lib files | camelCase | `db.ts`, `utils.ts`, `env.ts` |
| Test files | `*.test.tsx` or `*.spec.ts` | `Button.test.tsx`, `checkout.spec.ts` |
| CSS modules | `*.module.css` | `Button.module.css` |
| Directories | kebab-case | `components/`, `order-history/` |
