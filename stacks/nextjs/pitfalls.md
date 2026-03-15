# Common Pitfalls — Next.js

Read this when debugging unexpected behaviour or reviewing Next.js code. Starts lean and grows from experience.

---

## Pitfall 1: Marking Everything 'use client'

**What it looks like:**
Every component file starts with `'use client'` because "React needs it."

**Why it breaks:**
You've opted out of Server Components entirely. All data fetching moves to the client, the JS bundle grows, and you lose SSR/streaming benefits. You're building a traditional React SPA with extra steps.

**Fix:**
Default to Server Components. Only add `'use client'` when the component needs hooks, event handlers, or browser APIs. Lift Server Component wrappers above client boundaries:

```tsx
// GOOD — Server Component wraps a small client island
export default async function Page() {
  const data = await fetchData(); // server-side
  return <InteractiveChart data={data} />; // only the chart ships JS
}
```

---

## Pitfall 2: Importing Server-Only Code in Client Components

**What it looks like:**
A Client Component imports a function that uses `fs`, database drivers, or environment variables without `NEXT_PUBLIC_`.

**Why it breaks:**
Next.js bundles Client Component imports for the browser. Server-only code either crashes at build time (missing Node APIs) or leaks secrets into the client bundle.

**Fix:**
Use the `server-only` package to mark server-only modules:

```typescript
// lib/db.ts
import 'server-only';

export async function getUser(id: string) {
  return db.query('SELECT * FROM users WHERE id = $1', [id]);
}
```

If a Client Component imports this, the build fails with a clear error instead of silently bundling secrets.

---

## Pitfall 3: Using useEffect for Data Fetching

**What it looks like:**
```tsx
'use client';
const [data, setData] = useState(null);
useEffect(() => {
  fetch('/api/data').then(r => r.json()).then(setData);
}, []);
```

**Why it breaks:**
This fetches data on the client after the page renders, causing a loading flash and an extra network round-trip. The server already had the opportunity to fetch this data before sending HTML.

**Fix:**
Fetch data in a Server Component. If the data depends on client-side state (like a search query), use a Server Action or the `useTransition` + `startTransition` pattern to keep the fetch server-side.

---

## Pitfall 4: Putting NEXT_PUBLIC_ on Secret Variables

**What it looks like:**
```
NEXT_PUBLIC_DATABASE_URL=postgres://user:password@host/db
NEXT_PUBLIC_STRIPE_SECRET_KEY=sk_live_...
```

**Why it breaks:**
`NEXT_PUBLIC_` variables are inlined into the JavaScript bundle at build time. Anyone who loads your site can read them in the browser's devtools.

**Fix:**
Only prefix variables with `NEXT_PUBLIC_` if they are safe for public exposure (like an analytics ID or a public API URL). Keep secrets as plain environment variables — they are only available on the server.

---

## Pitfall 5: Forgetting to Await params in Next.js 15+

**What it looks like:**
```tsx
export default function Page({ params }: { params: { id: string } }) {
  const product = getProduct(params.id); // params.id is undefined
}
```

**Why it breaks:**
In Next.js 15, `params` and `searchParams` are Promises. Accessing properties without `await` returns `undefined`.

**Fix:**
```tsx
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);
  return <ProductView product={product} />;
}
```

---

## Pitfall 6: Not Revalidating After Server Actions

**What it looks like:**
A Server Action writes to the database, but the page still shows stale data after the form submits.

**Why it breaks:**
Next.js caches aggressively. After a mutation, you must tell Next.js which cached data is stale.

**Fix:**
Call `revalidatePath()` or `revalidateTag()` at the end of every Server Action that mutates data:

```tsx
'use server';
import { revalidatePath } from 'next/cache';

export async function updateProfile(formData: FormData) {
  await db.updateUser(/* ... */);
  revalidatePath('/profile');  // Bust the cache
}
```

---

## Pitfall 7: Building API Routes for Your Own UI

**What it looks like:**
A `/api/cart/add` Route Handler that is only called by your own React components via `fetch`.

**Why it breaks:**
You've introduced an unnecessary network hop. Server Actions call your server-side code directly from the component — no API route, no manual `fetch`, no serialisation boilerplate.

**Fix:**
Use a Server Action:

```tsx
// Before (unnecessary API route)
// app/api/cart/add/route.ts + client-side fetch('/api/cart/add', ...)

// After (Server Action — direct call)
async function addToCart(productId: string) {
  'use server';
  await db.cart.add(productId);
  revalidatePath('/cart');
}
```

Reserve Route Handlers for webhooks, third-party API consumers, and OAuth callbacks.

---

## Pitfall 8: Giant Client Component Trees

**What it looks like:**
A `'use client'` component at the top of the tree that wraps everything — making every child a Client Component too.

**Why it breaks:**
The `'use client'` boundary cascades downward. Every child component in the subtree becomes a Client Component, even if it doesn't need interactivity. The entire tree ships as JavaScript.

**Fix:**
Push `'use client'` boundaries as deep as possible. Pass Server Component content as `children`:

```tsx
// layout.tsx (Server Component)
import { ThemeProvider } from '@/components/ThemeProvider'; // 'use client'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {children} {/* children remain Server Components */}
    </ThemeProvider>
  );
}
```

---

## Pitfall 9: Misunderstanding the Cache

**What it looks like:**
Data appears stale, or changes don't show up, or the same page shows different data depending on how you navigate to it.

**Why it breaks:**
Next.js has multiple cache layers: the Router Cache (client-side, 30s for dynamic routes), the Full Route Cache (server-side), and the Data Cache (fetch-level). Understanding which cache is serving stale data is crucial.

**Fix:**
- Use `revalidatePath`/`revalidateTag` after mutations
- Set `export const revalidate = 0` or `dynamic = 'force-dynamic'` on pages that must always be fresh
- Use `cache: 'no-store'` on individual fetches that must not be cached
- Call `router.refresh()` on the client to bust the Router Cache when needed

---

## Pitfall 10: Deploying to Cloudflare Without the OpenNext Adapter

**What it looks like:**
Deploying a Next.js app directly to Cloudflare Pages/Workers without the OpenNext adapter. Server Actions fail, ISR doesn't work, or the build output is wrong.

**Why it breaks:**
Next.js's build output is designed for Node.js (or Vercel's infrastructure). Cloudflare Workers use a V8 isolate runtime, not Node.js. The OpenNext adapter translates Next.js's output to the target platform's format.

**Fix:**
Use `@opennextjs/cloudflare` to build and deploy:

```bash
npm install @opennextjs/cloudflare
npx @opennextjs/cloudflare build
wrangler deploy
```

---

## Checklist Before Deploying

- [ ] No secrets in `NEXT_PUBLIC_` environment variables
- [ ] Server-only modules use `import 'server-only'`
- [ ] `'use client'` boundaries are as narrow as possible
- [ ] Server Actions validate input with Zod
- [ ] Server Actions call `revalidatePath`/`revalidateTag` after mutations
- [ ] `params` and `searchParams` are awaited (Next.js 15+)
- [ ] Images use `next/image` with proper `alt` attributes
- [ ] Fonts use `next/font` (no external stylesheet links)
- [ ] `loading.tsx` exists for routes with slow data fetches
- [ ] `error.tsx` exists for routes that might fail
