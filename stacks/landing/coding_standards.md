# Coding Standards — Landing Pages

## HTML

**Semantic elements everywhere.**
Use `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<footer>`.
Never use `<div>` when a semantic element exists.

```html
<!-- Bad -->
<div class="header">
  <div class="nav">...</div>
</div>

<!-- Good -->
<header>
  <nav aria-label="Main navigation">...</nav>
</header>
```

**One `<h1>` per page.** Headings must follow a strict hierarchy: h1 > h2 > h3. Never skip levels.

**All images need alt text.**
Decorative images get `alt=""`. Content images get descriptive alt text.
Never use `alt="image"` or `alt="photo"`.

```html
<!-- Decorative -->
<img src="/hero-bg.webp" alt="" role="presentation" />

<!-- Content -->
<img src="/product-dashboard.webp" alt="Dashboard showing real-time brewing metrics" />
```

**Links must be descriptive.** No "click here" or "read more" without context.

```html
<!-- Bad -->
<a href="/pricing">Click here</a>

<!-- Good -->
<a href="/pricing">View pricing plans</a>
```

---

## CSS

**Tailwind CSS is the default.** Use utility classes. Extract components with `@apply` only
when a pattern repeats 3+ times across files.

```html
<!-- Inline utilities for one-off styles -->
<section class="py-16 px-4 max-w-4xl mx-auto">
  <h2 class="text-3xl font-bold text-gray-900">Features</h2>
</section>
```

**Design tokens in tailwind.config.**
All colors, fonts, and spacing scales live in the Tailwind config, not in inline styles.

```javascript
// tailwind.config.mjs
export default {
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          500: '#3b82f6',
          900: '#1e3a5f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
};
```

**Mobile-first responsive design.**
Start with the mobile layout, add breakpoints upward. Tailwind's `sm:`, `md:`, `lg:` prefixes
are min-width by default — this is correct.

```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
```

**No CSS-in-JS.** Static sites do not need runtime CSS. Use Tailwind or plain CSS.

---

## Images

**WebP or AVIF format.** Never ship unoptimized PNG/JPG to production.

**Use `<picture>` for art direction.** Use `srcset` for resolution switching.

```html
<picture>
  <source srcset="/hero.avif" type="image/avif" />
  <source srcset="/hero.webp" type="image/webp" />
  <img src="/hero.jpg" alt="Product hero image" width="1200" height="630" loading="eager" />
</picture>
```

**Always set width and height** to prevent layout shift (CLS). Use `loading="lazy"` for
below-the-fold images. Use `loading="eager"` for above-the-fold (hero, logo).

**Optimize at build time.** Use Sharp or the SSG's built-in image component (Astro `<Image />`).
Target sizes: hero 1200px wide, thumbnails 400px, icons as SVG.

---

## JavaScript

**Zero JS is the goal for content pages.** A blog post, pricing page, or about page should
ship no JavaScript.

**Progressive enhancement for interactive elements:**

```html
<!-- Form works without JS -->
<form action="/api/signup" method="POST">
  <input type="email" name="email" required />
  <button type="submit">Sign Up</button>
</form>

<!-- JS enhances with client-side validation -->
<script>
  const form = document.querySelector('form');
  form.addEventListener('submit', (e) => {
    // Enhanced validation, loading state, etc.
  });
</script>
```

**Astro islands for interactive components.** Use `client:visible` or `client:idle` directives
to hydrate only what needs interactivity.

```astro
---
import PricingCalculator from '../components/PricingCalculator';
---
<!-- Static content, no JS -->
<h2>Pricing</h2>
<p>Choose the plan that fits your needs.</p>

<!-- Interactive island, hydrated on scroll -->
<PricingCalculator client:visible />
```

---

## Fonts

**System font stack preferred.** If a custom font is required, use a single family with
at most 2 weights.

```css
/* System stack — zero load time */
font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;

/* If custom font is required */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-var.woff2') format('woff2');
  font-display: swap;
  font-weight: 100 900;
}
```

**Always use `font-display: swap`** to prevent invisible text during load.

**Self-host fonts.** Do not use Google Fonts CDN — it adds a DNS lookup, a connection,
and a render-blocking request. Download the files and serve them from your domain.

---

## Copy and Content

**Write for scanning.** Short paragraphs, clear headings, bullet points for features.
Nobody reads a wall of text on a landing page.

**One CTA per section.** Each section should have a single clear call to action.
Do not present 3 different buttons competing for attention.

**Above the fold:** headline, subheadline, primary CTA, and social proof (if available).
The visitor should understand what the product does within 5 seconds.
