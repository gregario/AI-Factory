# Testing — Landing Pages

## What to Test

Landing pages are mostly static content. You are not testing business logic — you are
testing that the site builds correctly, pages render, links work, and performance/SEO
requirements are met.

---

## Build Verification

**The build must pass before deploy.** This is your primary gate. If the SSG build fails,
nothing ships.

```bash
# Must exit 0
npm run build
```

**Check for broken links.** Use a link checker in CI to catch dead internal and external links.

```bash
# After build, check all links in the output directory
npx broken-link-checker-local ./dist --recursive
```

---

## Lighthouse CI

Run Lighthouse in CI on every PR. Set minimum score thresholds:

| Category | Minimum Score |
|----------|---------------|
| Performance | 95 |
| Accessibility | 95 |
| Best Practices | 95 |
| SEO | 100 |

```bash
# Install
npm install -D @lhci/cli

# Run against built output
npx lhci autorun --collect.staticDistDir=./dist
```

Configure thresholds in `lighthouserc.json`:

```json
{
  "ci": {
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.95 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:best-practices": ["error", { "minScore": 0.95 }],
        "categories:seo": ["error", { "minScore": 1.0 }]
      }
    }
  }
}
```

---

## Visual Regression (Optional)

For sites with complex layouts, use Playwright for screenshot comparison:

```typescript
import { test, expect } from '@playwright/test';

test('homepage renders correctly', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('homepage.png', {
    fullPage: true,
    maxDiffPixelRatio: 0.01,
  });
});

test('pricing page renders correctly', async ({ page }) => {
  await page.goto('/pricing');
  await expect(page).toHaveScreenshot('pricing.png', { fullPage: true });
});
```

Only add visual regression tests when the site has enough visual complexity to warrant it.
A simple blog does not need screenshot tests.

---

## SEO Validation

Validate meta tags and structured data programmatically:

```typescript
import { test, expect } from '@playwright/test';

test('homepage has required SEO tags', async ({ page }) => {
  await page.goto('/');

  // Title
  const title = await page.title();
  expect(title).toBeTruthy();
  expect(title.length).toBeLessThanOrEqual(60);

  // Meta description
  const description = await page.$eval(
    'meta[name="description"]',
    (el) => el.getAttribute('content')
  );
  expect(description).toBeTruthy();
  expect(description!.length).toBeLessThanOrEqual(160);

  // Open Graph
  const ogTitle = await page.$eval('meta[property="og:title"]', (el) => el.getAttribute('content'));
  expect(ogTitle).toBeTruthy();

  // Canonical URL
  const canonical = await page.$eval('link[rel="canonical"]', (el) => el.getAttribute('href'));
  expect(canonical).toBeTruthy();
});
```

---

## Accessibility Testing

Use `axe-core` via Playwright for automated a11y checks:

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('homepage passes accessibility audit', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

Automated tools catch about 30-40% of accessibility issues. For the rest:
- Manual keyboard navigation test (Tab through the entire page)
- Screen reader test (VoiceOver on macOS) for key flows
- Color contrast check on all text/background combinations

---

## When NOT to Test

Do not write unit tests for:
- Static content (the words on the page)
- Tailwind class names
- Individual HTML elements

These change frequently and testing them creates brittle, low-value tests.
Focus on build, links, performance, SEO, and accessibility.
