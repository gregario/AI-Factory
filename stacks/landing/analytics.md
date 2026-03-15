# Analytics — Landing Pages

## Principles

**No cookie banners.** Use privacy-friendly analytics that do not track individuals,
do not use cookies, and do not require consent banners. This is simpler, faster, and
respects visitors.

**Measure what matters.** Page views, referrers, and conversion events. You do not need
scroll depth, mouse heatmaps, or session recordings for a landing page. Add complexity
only when you have a specific question those tools would answer.

**One analytics tool per site.** Do not stack Google Analytics, Plausible, AND Hotjar.
Pick one primary tool. Add a second only for a specific, time-boxed purpose.

---

## Recommended Tools

### Plausible Analytics (Default Choice)

Privacy-friendly, open source, lightweight (< 1KB script), no cookies, GDPR/CCPA compliant
without consent banners.

**Setup:**
```html
<script defer data-domain="example.com" src="https://plausible.io/js/script.js"></script>
```

**Cost:** $9/month (cloud) or self-host for free.

**What you get:**
- Page views, unique visitors, bounce rate
- Referral sources, UTM campaign tracking
- Country-level location (no city-level)
- Device type, browser, OS
- Custom event tracking (goals)

**Custom events for conversions:**
```html
<button id="signup" onclick="plausible('Signup')">Sign Up</button>
```

Or via JavaScript:
```javascript
// Track form submission
form.addEventListener('submit', () => {
  plausible('Signup', { props: { plan: 'pro' } });
});
```

### Fathom Analytics (Alternative)

Similar to Plausible. Privacy-friendly, no cookies, GDPR compliant.

**Setup:**
```html
<script src="https://cdn.usefathom.com/script.js" data-site="ABCDEF" defer></script>
```

**Cost:** $14/month.

**When to use Fathom over Plausible:** Personal preference. Both are excellent.
Fathom has slightly better EU isolation features. Plausible is open source.

### Umami (Self-Hosted, Free)

Open source, self-hosted alternative. Zero cost, full data ownership.

**When to use:** When you want analytics without any recurring cost and are willing
to self-host (e.g., on a VPS or Vercel/Netlify serverless function).

---

## What NOT to Use

**Google Analytics (GA4):** Requires cookie consent banners in the EU. Adds 45KB+ of
JavaScript. Sends data to Google. Overkill for a landing page and actively hostile to
page performance.

Only use GA4 if you have a specific business requirement (e.g., Google Ads integration)
and are willing to implement a proper cookie consent flow.

---

## Conversion Tracking

Define your conversion events before building the site. A landing page typically has
1-3 key conversions:

| Event | Description | Example |
|-------|-------------|---------|
| `Signup` | Primary CTA conversion | Email submitted, account created |
| `CTA_Click` | Secondary CTA clicks | "View Pricing" button click |
| `Download` | Content download | PDF whitepaper, free resource |

### Plausible Goals Setup

1. Define goals in the Plausible dashboard (Settings > Goals)
2. Trigger events from your site:

```javascript
// Button click
document.getElementById('cta').addEventListener('click', () => {
  plausible('CTA_Click', { props: { location: 'hero' } });
});

// Form submission
document.getElementById('signup-form').addEventListener('submit', () => {
  plausible('Signup', { props: { source: 'homepage' } });
});

// Track outbound link clicks automatically
// Use the enhanced script:
// src="https://plausible.io/js/script.outbound-links.js"
```

### UTM Parameters

Track marketing campaigns with UTM parameters. Plausible and Fathom both parse these
automatically.

```
https://example.com/?utm_source=twitter&utm_medium=social&utm_campaign=launch
```

**Standard parameters:**
- `utm_source` — Where the traffic comes from (twitter, newsletter, google)
- `utm_medium` — Marketing medium (social, email, cpc)
- `utm_campaign` — Campaign name (launch, black-friday, product-hunt)

Always use lowercase, hyphen-separated values. Be consistent across campaigns.

---

## Integration with Cloudflare Pages

Cloudflare Pages provides built-in Web Analytics (free, privacy-friendly, no JS required).
It uses edge-side analytics, so there is zero client-side impact.

**Enable:** Cloudflare Dashboard > your Pages project > Web Analytics > Enable.

This can be used alongside Plausible/Fathom. Cloudflare analytics are server-side
(measures all requests including bots), while Plausible/Fathom are client-side
(measures real user visits). The difference is useful for spotting bot traffic.

---

## Script Placement

Always place analytics scripts at the end of `<head>` with `defer`:

```html
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Page Title</title>
  <!-- SEO tags... -->

  <!-- Analytics — always last in head, always deferred -->
  <script defer data-domain="example.com" src="https://plausible.io/js/script.js"></script>
</head>
```

**Rules:**
- Always use `defer` (never `async` for analytics — ordering matters for SPA tracking)
- Never use `document.write()` in analytics scripts
- Never add analytics to `<body>` — it delays parsing
- Exclude analytics from local development (Plausible ignores localhost by default)

---

## Environment-Based Loading

Only load analytics in production. Do not track localhost or staging:

```astro
---
const isProd = import.meta.env.PROD;
---

{isProd && (
  <script defer data-domain="example.com" src="https://plausible.io/js/script.js"></script>
)}
```

For 11ty, use an environment variable:
```html
{% if env.ELEVENTY_ENV == "production" %}
<script defer data-domain="example.com" src="https://plausible.io/js/script.js"></script>
{% endif %}
```

---

## Dashboard Review Cadence

For a landing page, check analytics weekly. You are looking for:

1. **Traffic sources** — Where are visitors coming from? Double down on what works.
2. **Top pages** — Which pages get the most traffic? Optimize those first.
3. **Conversion rate** — What percentage of visitors complete the primary CTA?
4. **Bounce rate** — High bounce on the homepage means the value prop is not landing.
5. **Device split** — If 70%+ is mobile, prioritize mobile experience in design reviews.

Do not obsess over daily numbers. Landing pages need weeks of data to show meaningful trends.
