# Framework-Specific QA Guidance

Detect the framework from page source and adjust QA accordingly.

---

## Next.js

**Detection:** `__next` in HTML, `_next/data` in network requests.

**Watch for:**
- Hydration errors in console (`Hydration failed`, `Text content did not match`). These indicate server/client rendering mismatch.
- `_next/data` 404s — broken data fetching for dynamic routes.
- Client-side navigation issues: test by clicking links (not just `goto`). `goto` bypasses the client router.
- CLS (Cumulative Layout Shift) on pages with dynamic content — run `$B perf` to check.
- Image optimization: `next/image` should be serving optimized formats. Check network for large unoptimized images.

---

## Rails

**Detection:** `csrf-token` meta tag, `_method` hidden fields, Turbo attributes.

**Watch for:**
- N+1 query warnings in development console output.
- CSRF token presence in all forms (`$B html "meta[name=csrf-token]"`).
- Turbo/Stimulus integration: page transitions should be smooth, not full reloads. Watch for flash-of-unstyled-content.
- Flash messages: verify they appear after actions and dismiss correctly.
- Asset pipeline: check for 404s on CSS/JS assets after deploy.

---

## SPA (React, Vue, Angular)

**Detection:** Client-side routing (no page reloads on navigation), `#/` or history API URLs.

**Watch for:**
- `links` command returns few results because navigation is client-side. Use `snapshot -i` to find nav elements instead.
- Stale state: navigate away from a page and back — does data refresh or show stale cached data?
- Browser back/forward: does the app handle history correctly? Many SPAs break the back button.
- Memory leaks: after extended interaction, check console for growing memory warnings.
- Loading states: verify spinners/skeletons appear during data fetching, not blank screens.
- Deep linking: `goto` directly to a deep route — does it load correctly or show a blank page?

---

## WordPress

**Detection:** `wp-content` in URLs, `wp-json` API endpoint.

**Watch for:**
- Plugin conflicts: JS errors from different plugins interfering with each other.
- Admin bar visibility for logged-in users (should appear, should not break layout).
- REST API (`/wp-json/`) availability and response format.
- Mixed content warnings (HTTP resources on HTTPS pages) — very common with WP.
- Page builder output: test responsive layouts carefully, builders often generate fragile CSS.

---

## Static Sites / SSG

**Detection:** No server-side rendering indicators, all pages are HTML files.

**Watch for:**
- Broken internal links: use `$B links` and test each one.
- Meta tags and Open Graph: `$B html "head"` to verify SEO/social tags.
- Search functionality (if present): test with real queries.
- 404 page: navigate to a nonexistent path — does a proper 404 show?
- Asset loading: check that CSS/JS/images load from correct paths (common issue with relative paths after deploy).
