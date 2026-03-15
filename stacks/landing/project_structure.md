# Project Structure — Landing Pages

## Astro Project (Default)

```
project-name/
  src/
    pages/              # File-based routing — each .astro file = a page
      index.astro       # Homepage
      pricing.astro     # Pricing page
      blog/
        index.astro     # Blog listing
        [slug].astro    # Dynamic blog post route
    layouts/
      Base.astro        # HTML shell: <head>, meta, fonts, analytics snippet
      Page.astro        # Standard page layout (header + main + footer)
      Post.astro        # Blog post layout (narrower, article semantics)
    components/
      Header.astro      # Site header with navigation
      Footer.astro      # Site footer with links
      Hero.astro        # Hero section (reusable across pages)
      CTA.astro         # Call-to-action block
      SEOHead.astro     # Meta tags, OG tags, structured data
    content/
      blog/             # Markdown/MDX blog posts (Astro content collections)
        first-post.md
    styles/
      global.css        # Base styles, font imports, Tailwind directives
    assets/
      images/           # Source images (optimized at build)
      fonts/            # Self-hosted web fonts (.woff2)
  public/
    favicon.ico         # Favicon (also add .svg version)
    robots.txt          # Crawl directives
    og-image.png        # Default Open Graph image (1200x630)
  astro.config.mjs      # Astro configuration
  tailwind.config.mjs   # Tailwind theme and plugins
  tsconfig.json
  package.json
```

## 11ty Project (Simpler Sites)

```
project-name/
  src/
    _includes/
      base.njk          # HTML shell layout
      page.njk          # Standard page layout
      post.njk          # Blog post layout
    _data/
      site.json         # Site-wide metadata (title, URL, description)
    pages/
      index.md          # Homepage
      about.md          # About page
    blog/
      first-post.md     # Blog posts (Markdown with front matter)
    css/
      style.css         # Styles (Tailwind or plain CSS)
    assets/
      images/
      fonts/
  public/               # Passthrough files (favicon, robots.txt, og-image)
  .eleventy.js          # 11ty configuration
  tailwind.config.mjs
  package.json
```

---

## Key Conventions

**`src/` contains all source files.** No source code in the root directory.

**`public/` is for static passthrough files.** Favicon, robots.txt, default OG image.
Do NOT put optimizable images here — those go in `src/assets/images/` so the build
pipeline can process them.

**One layout per page type.** Base layout handles the HTML shell (`<head>`, analytics,
global styles). Page layouts extend Base and add structure (header, footer, content area).

**Components are reusable sections.** Hero, CTA, feature grid, testimonial card, pricing
table. Each component is a single file. Keep them flat — avoid nesting components inside
component subdirectories unless the site grows beyond 15+ components.

**Content lives in `content/` or Markdown files.** Blog posts, case studies, and other
long-form content should be Markdown or MDX. Never hardcode long-form copy in templates.

**SEO metadata is centralized.** Use a single `SEOHead` component (or equivalent) that
every layout includes. Pass title, description, image, and type as props. Do not scatter
`<meta>` tags across individual pages.

---

## Configuration Files

Every landing project needs these in the root:

| File | Purpose |
|------|---------|
| `package.json` | Dependencies, scripts (`dev`, `build`, `preview`) |
| `tsconfig.json` | TypeScript config (strict mode) |
| `tailwind.config.mjs` | Design tokens (colors, fonts, spacing) |
| `astro.config.mjs` or `.eleventy.js` | SSG configuration |
| `lighthouserc.json` | Lighthouse CI score thresholds |
| `.gitignore` | Ignore `node_modules/`, `dist/`, `.astro/` |

---

## Scripts

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check && npx tsc --noEmit",
    "lint": "eslint src/",
    "test": "npx lhci autorun"
  }
}
```
