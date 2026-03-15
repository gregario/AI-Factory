# Coding Standards — Next.js

Extends `stacks/typescript/coding_standards.md`. This covers Next.js-specific standards only.

---

## The Server/Client Boundary

**Server Components are the default.** You do not need any directive for Server Components — they just work. Only add `'use client'` when the component needs:

- Event handlers (`onClick`, `onChange`, etc.)
- React hooks (`useState`, `useEffect`, `useRef`, etc.)
- Browser-only APIs (`window`, `localStorage`, `IntersectionObserver`)
- Third-party client-only libraries

```tsx
// Server Component (default — no directive needed)
export default async function UserProfile({ userId }: { userId: string }) {
  const user = await db.getUser(userId);
  return <h1>{user.name}</h1>;
}
```

```tsx
// Client Component — needs interactivity
'use client';

import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

### Keep the client boundary narrow

Wrap Client Components with Server Components to keep the interactive island small:

```tsx
// app/dashboard/page.tsx (Server Component)
import { Counter } from '@/components/Counter';

export default async function Dashboard() {
  const stats = await fetchStats(); // runs on the server

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Total users: {stats.userCount}</p> {/* static, no JS shipped */}
      <Counter /> {/* only this ships JS */}
    </div>
  );
}
```

---

## Data Fetching

**Fetch data in Server Components.** No `useEffect` + `useState` data fetching patterns. Server Components can be `async` and `await` directly.

```tsx
// GOOD — Server Component fetches data
export default async function PostList() {
  const posts = await db.getPosts();
  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

```tsx
// BAD — Client-side fetching when server fetch would work
'use client';
import { useEffect, useState } from 'react';

export function PostList() {
  const [posts, setPosts] = useState([]);
  useEffect(() => {
    fetch('/api/posts').then(r => r.json()).then(setPosts);
  }, []);
  return <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>;
}
```

**Use `fetch` with Next.js caching when calling external APIs:**

```tsx
// Cached by default (equivalent to SSG)
const data = await fetch('https://api.example.com/data');

// Revalidate every 60 seconds (ISR)
const data = await fetch('https://api.example.com/data', {
  next: { revalidate: 60 },
});

// No cache (SSR — fresh on every request)
const data = await fetch('https://api.example.com/data', {
  cache: 'no-store',
});
```

**Parallel data fetching with `Promise.all`:**

```tsx
export default async function Dashboard() {
  const [user, orders, notifications] = await Promise.all([
    getUser(),
    getOrders(),
    getNotifications(),
  ]);

  return <DashboardView user={user} orders={orders} notifications={notifications} />;
}
```

---

## Server Actions

Use Server Actions for all mutations. Define them with `'use server'` at the top of the function body (inline) or at the top of a dedicated file.

### Inline actions (simple cases)

```tsx
export default function AddToCart({ productId }: { productId: string }) {
  async function addItem() {
    'use server';
    await db.cart.add(productId);
    revalidatePath('/cart');
  }

  return (
    <form action={addItem}>
      <button type="submit">Add to Cart</button>
    </form>
  );
}
```

### Dedicated action files (preferred for complex logic)

```tsx
// app/actions/cart.ts
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const AddItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
});

export async function addItem(formData: FormData) {
  const parsed = AddItemSchema.safeParse({
    productId: formData.get('productId'),
    quantity: Number(formData.get('quantity')),
  });

  if (!parsed.success) {
    return { error: 'Invalid input' };
  }

  await db.cart.add(parsed.data.productId, parsed.data.quantity);
  revalidatePath('/cart');
}
```

**Always validate Server Action inputs with Zod.** Server Actions are public HTTP endpoints — treat them like any other API.

---

## Route Handlers

Use Route Handlers (`app/api/.../route.ts`) for:
- Webhooks from external services
- Public API endpoints consumed by third-party clients
- Auth callbacks (OAuth, etc.)

Do NOT use Route Handlers for mutations consumed by your own UI — use Server Actions instead.

```tsx
// app/api/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const signature = request.headers.get('x-webhook-signature');

  if (!verifySignature(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  await processWebhook(body);
  return NextResponse.json({ ok: true });
}
```

---

## Middleware

Middleware runs at the edge before every matched request. Use it for:
- Auth guards (redirect unauthenticated users)
- Redirects and rewrites
- Geo-routing or A/B testing
- Request/response header manipulation

```tsx
// middleware.ts (project root)
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('session');

  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/settings/:path*'],
};
```

**Keep middleware lightweight.** It runs on every matched request. No database queries, no heavy computation. Validate JWTs, check cookies, set headers — that's it.

---

## Image and Font Optimization

### Images

Always use `next/image` instead of `<img>`. It handles lazy loading, responsive sizing, and modern format conversion automatically.

```tsx
import Image from 'next/image';

// Local image (auto-sized from import)
import heroImage from '@/public/hero.jpg';
<Image src={heroImage} alt="Hero banner" priority />

// Remote image (must specify dimensions)
<Image src="https://example.com/photo.jpg" alt="Photo" width={800} height={600} />
```

Configure allowed remote domains in `next.config.ts`:

```typescript
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'example.com' },
    ],
  },
};
```

### Fonts

Use `next/font` to self-host fonts with zero layout shift:

```tsx
// app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
```

---

## Metadata and SEO

Use the Metadata API for SEO. Define `metadata` exports or `generateMetadata` functions in layout and page files.

```tsx
// Static metadata
export const metadata = {
  title: 'My App',
  description: 'A description for search engines',
};

// Dynamic metadata
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);
  return {
    title: product.name,
    description: product.description,
    openGraph: {
      images: [product.imageUrl],
    },
  };
}
```

---

## Rendering Strategies

Choose the right rendering strategy per route:

| Strategy | When | How |
|----------|------|-----|
| **Static (SSG)** | Content changes rarely (blog posts, docs, marketing pages) | Default behaviour — Next.js statically renders at build time |
| **ISR** | Content changes periodically (product listings, feeds) | `fetch(..., { next: { revalidate: 60 } })` or `export const revalidate = 60` |
| **SSR** | Content is user-specific or real-time (dashboards, search results) | `export const dynamic = 'force-dynamic'` or `cache: 'no-store'` on fetches |
| **Streaming** | Page has slow data sources alongside fast ones | Use `<Suspense>` boundaries with `loading.tsx` |

Prefer static and ISR. Use SSR only when the data truly must be fresh on every request.

---

## Error and Loading States

Use the file convention for loading and error states:

```
app/
  dashboard/
    page.tsx       # The page content
    loading.tsx    # Shown while the page streams (Suspense boundary)
    error.tsx      # Shown when the page throws ('use client' required)
    not-found.tsx  # Shown when notFound() is called
```

```tsx
// app/dashboard/error.tsx
'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <h2>Something went wrong</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
```

---

## Environment Variables

```
# .env.local (gitignored — local dev secrets)
DATABASE_URL=postgres://localhost/mydb
STRIPE_SECRET_KEY=sk_test_...

# .env (committed — non-secret defaults)
NEXT_PUBLIC_APP_URL=https://myapp.com
```

- Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Everything else is server-only.
- **Never put secrets in `NEXT_PUBLIC_` variables.** They are inlined into the client bundle.
- Validate required environment variables at startup:

```typescript
// lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);
```
