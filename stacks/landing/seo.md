# SEO — Landing Pages

## Every Page Checklist

Before a page ships, it must have all of the following. No exceptions.

- [ ] Unique `<title>` (50-60 characters, primary keyword near the front)
- [ ] `<meta name="description">` (120-160 characters, includes CTA or value prop)
- [ ] `<link rel="canonical">` (full absolute URL)
- [ ] Open Graph tags (title, description, image, URL, type)
- [ ] Twitter Card tags (or rely on OG fallback)
- [ ] Structured data (JSON-LD, page-type appropriate)
- [ ] Proper heading hierarchy (single `<h1>`, no skipped levels)
- [ ] Descriptive alt text on all content images

---

## Title Tags

```html
<title>Brewing Software for Craft Breweries | BeerBrew</title>
```

**Rules:**
- 50-60 characters (Google truncates at ~60)
- Primary keyword first, brand name last
- Unique per page — no duplicate titles across the site
- No keyword stuffing — write for humans first
- Separate sections with `|` or `—`

**Pattern:** `[Primary Keyword/Page Topic] | [Brand Name]`

Homepage can invert: `[Brand Name] — [Tagline]`

---

## Meta Description

```html
<meta name="description" content="Manage your craft brewery with real-time quality tracking, recipe management, and batch planning. Start free — no credit card required." />
```

**Rules:**
- 120-160 characters (Google truncates at ~160)
- Include a call to action or value proposition
- Unique per page
- Not a ranking factor directly, but affects click-through rate (CTR)

---

## Canonical URLs

```html
<link rel="canonical" href="https://example.com/pricing" />
```

**Rules:**
- Every page must have a canonical URL
- Always use the full absolute URL (including `https://`)
- Pick one format and enforce it: trailing slash or no trailing slash
- Self-referencing canonicals are correct (a page's canonical points to itself)
- For paginated content, each page is its own canonical

---

## Open Graph Tags

```html
<meta property="og:title" content="Brewing Software for Craft Breweries" />
<meta property="og:description" content="Real-time quality tracking, recipe management, and batch planning." />
<meta property="og:image" content="https://example.com/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="https://example.com/" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="BeerBrew" />
```

**Rules:**
- `og:image` must be an absolute URL (not a relative path)
- Image dimensions: 1200x630px (universal safe size)
- `og:type` is `website` for pages, `article` for blog posts
- For articles, also add `article:published_time` and `article:author`

**Twitter Card fallback:**
Twitter reads OG tags as fallback, but add the card type for large image previews:

```html
<meta name="twitter:card" content="summary_large_image" />
```

---

## Structured Data (JSON-LD)

Add structured data as JSON-LD in `<head>`. This helps search engines understand your
content and can produce rich results (breadcrumbs, FAQ accordions, product cards).

### Organization (Homepage)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "BeerBrew",
  "url": "https://example.com",
  "logo": "https://example.com/logo.png",
  "sameAs": [
    "https://twitter.com/beerbrew",
    "https://github.com/beerbrew"
  ]
}
</script>
```

### WebSite with Search (Homepage)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "BeerBrew",
  "url": "https://example.com"
}
</script>
```

### Blog Post

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "How to Optimize Your Mash Temperature",
  "datePublished": "2026-01-15",
  "dateModified": "2026-01-20",
  "author": {
    "@type": "Person",
    "name": "Author Name"
  },
  "image": "https://example.com/blog/mash-temp/og.png",
  "publisher": {
    "@type": "Organization",
    "name": "BeerBrew",
    "logo": {
      "@type": "ImageObject",
      "url": "https://example.com/logo.png"
    }
  }
}
</script>
```

### FAQ Page

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How much does it cost?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Free for individuals. Team plans start at $29/month."
      }
    }
  ]
}
</script>
```

### Breadcrumbs

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://example.com" },
    { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://example.com/blog" },
    { "@type": "ListItem", "position": 3, "name": "Mash Temperature Guide" }
  ]
}
</script>
```

**Validate structured data** with Google's Rich Results Test before deploying:
https://search.google.com/test/rich-results

---

## Sitemap

Auto-generate the sitemap from your SSG. Never maintain it manually.

**Astro:**
```bash
npx astro add sitemap
```

```javascript
// astro.config.mjs
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://example.com',
  integrations: [sitemap()],
});
```

**11ty:**
Use the `@11ty/eleventy-plugin-sitemap` or generate from collections.

**Sitemap rules:**
- Include only canonical, indexable pages
- Exclude redirects, error pages, and noindexed pages
- Set `<lastmod>` to the actual last modification date (not build date)
- Keep it under 50,000 URLs per file (split into sitemap index if needed)

---

## robots.txt

```
User-agent: *
Allow: /

Sitemap: https://example.com/sitemap-index.xml
```

**Rules:**
- Place in the root (`public/robots.txt`)
- Always reference the sitemap URL
- Do not block CSS or JS files (search engines need them for rendering)
- Block only admin pages, staging, or truly private content

For staging environments, block everything:
```
User-agent: *
Disallow: /
```

---

## SEOHead Component Pattern

Centralize all SEO tags in a single component that every layout uses:

```astro
---
// src/components/SEOHead.astro
interface Props {
  title: string;
  description: string;
  image?: string;
  type?: 'website' | 'article';
  publishedDate?: string;
  canonical?: string;
}

const {
  title,
  description,
  image = '/og-image.png',
  type = 'website',
  publishedDate,
  canonical = Astro.url.href,
} = Astro.props;

const siteUrl = Astro.site?.toString().replace(/\/$/, '') ?? '';
const imageUrl = image.startsWith('http') ? image : `${siteUrl}${image}`;
---

<title>{title}</title>
<meta name="description" content={description} />
<link rel="canonical" href={canonical} />

<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:image" content={imageUrl} />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content={canonical} />
<meta property="og:type" content={type} />

<meta name="twitter:card" content="summary_large_image" />

{publishedDate && <meta property="article:published_time" content={publishedDate} />}
```

Use it in every layout:
```astro
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <SEOHead title={title} description={description} />
</head>
```

---

## Performance Impact on SEO

Google uses Core Web Vitals as a ranking signal. The targets that matter:

| Metric | Target | What It Measures |
|--------|--------|------------------|
| LCP | < 2.5s | Largest Contentful Paint — when the main content is visible |
| FID/INP | < 200ms | Interaction to Next Paint — responsiveness |
| CLS | < 0.1 | Cumulative Layout Shift — visual stability |

Static sites with no JS should hit these easily. If you miss them, check:
- Unoptimized images (LCP)
- Third-party scripts (FID/INP)
- Images without dimensions (CLS)
- Web fonts without `font-display: swap` (CLS)
