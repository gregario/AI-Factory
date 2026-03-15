# Landing Page Stack Profile

This stack profile covers static marketing sites, landing pages, product pages, and blogs.
It prioritizes ship speed, page load speed, and SEO. Every page must be indexable, accessible,
and load without JavaScript. This is NOT for web applications — use the SaaS stack for that.

Before writing any landing page code, Claude must read this stack profile in full.

---

## Files in This Profile

| File | Read When |
|------|-----------|
| `coding_standards.md` | Writing any landing page code or templates |
| `testing.md` | Writing tests or validating pages |
| `project_structure.md` | Creating a new site or adding pages |
| `pitfalls.md` | Debugging unexpected behaviour or reviewing code |
| `seo.md` | Adding pages, writing content, or configuring meta tags |
| `analytics.md` | Setting up tracking, conversion events, or dashboards |

---

## Core Principles

**Static by default.**
Every content page must be pre-rendered at build time. No client-side rendering for content.
JavaScript is for progressive enhancement only — the page must be fully readable with JS disabled.

**SEO is not optional.**
Every page needs a unique title, meta description, canonical URL, Open Graph tags, and
structured data where applicable. If a page ships without these, it ships broken.

**Fast to ship, fast to load.**
Target under 1 second LCP on 4G. Use system fonts or a single web font. Inline critical CSS.
No layout shift. No blocking JavaScript. Ship the smallest possible HTML.

**Accessible first.**
WCAG AA minimum. Semantic HTML, proper heading hierarchy, alt text on all images,
sufficient color contrast, keyboard navigable. Accessibility is not a polish pass — it is the baseline.

**Progressive enhancement over client-side frameworks.**
Start with HTML and CSS. Add JavaScript only when interactivity is genuinely needed
(form validation, scroll animations, interactive demos). A blog post does not need React.

---

## Key Technologies

| Technology | Purpose |
|-----------|---------|
| **Astro** | Primary SSG framework — zero JS by default, component islands |
| **11ty** | Alternative SSG for simpler sites (Markdown + Nunjucks) |
| **Tailwind CSS** | Utility-first styling with purged unused classes |
| **Cloudflare Pages** | Hosting — free tier, global CDN, unlimited bandwidth |
| **Plausible / Fathom** | Privacy-friendly analytics (no cookie banners) |
| **Sharp** | Image optimization at build time |
| **TypeScript** | Type-safe components and build scripts (follows TypeScript stack) |

---

## When to Use This Stack

Use this stack for:
- Product landing pages and marketing sites
- Company or personal blogs
- Documentation sites
- Launch / waitlist / coming-soon pages
- Portfolio sites
- Any content-first site where SEO and performance matter

Do NOT use this stack for:
- Web applications with auth, dashboards, or real-time features (use SaaS stack)
- E-commerce with cart/checkout (needs a dedicated stack)
- Internal tools or admin panels

---

## SSG Framework Choice

**Astro** is the default for new projects. It ships zero JavaScript by default, supports
component islands for interactive sections, and handles Markdown/MDX content natively.

**11ty** is appropriate for simpler sites that are pure Markdown/HTML with no interactive
components. It has fewer concepts to learn and faster builds for small sites.

**Next.js static export** (`output: 'export'`) is acceptable only when the project already
uses React components or needs to share code with a React app. The full Next.js runtime
is overkill for a marketing page.

Choose one per project and document it in the project-level CLAUDE.md.
