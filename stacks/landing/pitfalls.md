# Common Pitfalls — Landing Pages

This file documents mistakes that appear repeatedly in landing page projects.
Read this when debugging unexpected behaviour or reviewing code.

It starts lean and grows from experience. When you hit a gotcha, add it here.

---

## Pitfall 1: Missing Open Graph Image Dimensions

**What it looks like:**
Social media previews show a tiny image or no image at all.

**Why it breaks:**
Social platforms need `og:image:width` and `og:image:height` to render the preview card
correctly. Without dimensions, some platforms skip the image entirely.

**Fix:**
```html
<meta property="og:image" content="https://example.com/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
```

Always use 1200x630px for OG images. This is the universal safe size.

---

## Pitfall 2: Render-Blocking Google Fonts

**What it looks like:**
Lighthouse flags "Eliminate render-blocking resources" and the page shows invisible text
for 1-2 seconds on slow connections (FOIT).

**Why it breaks:**
The Google Fonts `<link>` in `<head>` blocks rendering. The browser must:
1. DNS lookup for `fonts.googleapis.com`
2. Fetch the CSS file
3. DNS lookup for `fonts.gstatic.com`
4. Fetch the font files

That is 4 network requests before the page can render text.

**Fix:**
Self-host fonts. Download the `.woff2` files and serve them from your domain.
Use `font-display: swap` so text is visible immediately with a fallback font.

---

## Pitfall 3: Layout Shift from Images Without Dimensions

**What it looks like:**
Content jumps around as images load. Lighthouse reports high CLS (Cumulative Layout Shift).

**Why it breaks:**
Without `width` and `height` attributes, the browser does not know how much space to
reserve for the image. When the image loads, the layout reflows.

**Fix:**
Always set explicit `width` and `height` on `<img>` tags. Use CSS `aspect-ratio` or
`object-fit` if you need responsive sizing.

```html
<img src="/hero.webp" alt="Hero" width="1200" height="630" class="w-full h-auto" />
```

---

## Pitfall 4: Canonical URL Mismatch

**What it looks like:**
Google indexes the wrong URL, or the same page appears multiple times in search results
with different URLs (trailing slash, www vs non-www, http vs https).

**Why it breaks:**
Without a canonical URL, search engines must guess which version is authoritative. They
often guess wrong, splitting your page authority across duplicates.

**Fix:**
Set a canonical URL on every page. Pick one format and stick to it.

```html
<!-- Always use the full, absolute URL -->
<link rel="canonical" href="https://example.com/pricing" />
```

Configure your hosting to redirect all variants to the canonical form:
- `http://` -> `https://`
- `www.` -> non-www (or vice versa, pick one)
- Trailing slash: pick one convention

Cloudflare Pages handles HTTPS redirect automatically. Set up redirect rules for www.

---

## Pitfall 5: Forgetting `loading="eager"` on Hero Images

**What it looks like:**
The hero image at the top of the page loads slowly. LCP (Largest Contentful Paint) is poor.

**Why it breaks:**
If you globally set `loading="lazy"` or the SSG framework defaults to lazy loading,
the hero image (which IS the LCP element) gets deferred. The browser delays loading
the most important image on the page.

**Fix:**
Explicitly mark above-the-fold images as eager:

```html
<img src="/hero.webp" alt="Hero" width="1200" height="630" loading="eager" fetchpriority="high" />
```

Use `loading="lazy"` only for images below the fold.

---

## Pitfall 6: Deploying Unminified Tailwind CSS

**What it looks like:**
The CSS file is 3+ MB in production. Page load is slow on mobile.

**Why it breaks:**
Tailwind's development CSS includes every utility class. In production, you need to purge
unused classes. If the `content` paths in `tailwind.config.mjs` are wrong, purging fails
silently and ships the full 3MB+ file.

**Fix:**
Verify `content` paths match your actual template locations:

```javascript
// tailwind.config.mjs
export default {
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}',
  ],
  // ...
};
```

Check the output CSS size after build. It should be under 20KB for a typical landing page.

---

## Pitfall 7: Broken Sitemap After Adding New Pages

**What it looks like:**
New pages are not appearing in Google search results for weeks.

**Why it breaks:**
The sitemap was generated once and never updated. Or the sitemap exists but is not
referenced in `robots.txt`. Google does not know the page exists.

**Fix:**
Use your SSG's sitemap integration to auto-generate it from your pages:

```bash
# Astro
npx astro add sitemap
```

Verify `robots.txt` points to it:
```
Sitemap: https://example.com/sitemap-index.xml
```

After deploying new pages, submit the sitemap in Google Search Console.

---

## Pitfall 8: Analytics Script Blocking Render

**What it looks like:**
Lighthouse flags the analytics script as render-blocking. Page load is slower than expected.

**Why it breaks:**
The analytics `<script>` tag is in `<head>` without `async` or `defer`.

**Fix:**
Privacy-friendly analytics scripts (Plausible, Fathom) should always use `async` or `defer`:

```html
<script defer data-domain="example.com" src="https://plausible.io/js/script.js"></script>
```

Never use synchronous `<script>` tags in `<head>` for analytics.
