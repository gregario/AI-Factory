# Next.js Stack Profile

This stack profile defines how Next.js projects are built in the AI-Factory. It covers the App Router architecture, Server Components, Server Actions, and deployment patterns.

**This stack layers on top of the TypeScript stack.** Read `stacks/typescript/` first — all TypeScript conventions apply unless explicitly overridden here. This file covers Next.js-specific patterns only.

Before writing any Next.js code, Claude must read this stack profile in full.

---

## Files in This Profile

| File | Read When |
|------|-----------|
| `coding_standards.md` | Writing any Next.js code |
| `testing.md` | Writing tests or setting up test infrastructure |
| `project_structure.md` | Creating a new project or adding files |
| `pitfalls.md` | Debugging unexpected behaviour or reviewing code |

Also read: `stacks/typescript/STACK.md` (parent stack).

---

## Core Principles

1. **Server Components by default.** Every component is a React Server Component (RSC) unless it needs interactivity, browser APIs, or React state. Add `'use client'` only when required — never as a default.

2. **App Router only.** Use the `app/` directory with file-based routing (layout.tsx, page.tsx, loading.tsx, error.tsx). The Pages Router (`pages/`) is legacy and must not be used in new projects.

3. **Server Actions for mutations.** Use `'use server'` functions for form submissions, data writes, and any operation that modifies state. Do not build separate API routes for mutations that originate from your own UI.

4. **Push work to the server.** Data fetching, database queries, and heavy computation belong in Server Components or Server Actions. The client should receive only what it needs to render and interact.

5. **Minimise client-side JavaScript.** Every `'use client'` boundary adds to the JS bundle. Keep interactive islands small. Lift Server Component wrappers above Client Components to keep the client boundary as narrow as possible.

---

## Key Technologies

| Technology | Purpose |
|-----------|---------|
| Next.js 15+ | React framework with App Router, RSC, Server Actions |
| React 19+ | UI library (Server Components, `use`, Actions) |
| TypeScript | Type safety (strict mode, always) |
| next/image | Automatic image optimization (WebP/AVIF, lazy loading, sizing) |
| next/font | Font optimization (zero layout shift, self-hosted) |
| Vitest | Unit and integration testing |
| Playwright | End-to-end testing |
| Zod | Runtime validation for Server Actions and API inputs |
| Tailwind CSS | Utility-first styling (preferred, not required) |

---

## When to Use This Stack

Use this stack for any project that needs:
- A full-stack web application with server-rendered pages
- SEO-critical content sites with dynamic capabilities
- Applications mixing static (ISR/SSG) and dynamic (SSR) rendering
- React-based UIs that benefit from server-side data fetching

Do not use this stack for:
- Pure API servers with no UI (use the TypeScript stack directly)
- Static sites with no server logic (consider Astro or plain HTML)
- MCP servers (use the MCP stack)
