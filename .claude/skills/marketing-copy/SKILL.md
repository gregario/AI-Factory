---
name: marketing-copy
description: Use when writing launch posts, product descriptions, landing page copy, App Store listings, social media threads, or any marketing content for a product
---

# Marketing Copy

Write marketing content for products shipped by the factory. Stack-agnostic — works for any product type.

**Before writing:** Read `docs/drafts/tone-of-voice.md` if it exists. The tone guide is the source of truth for voice and personality.

---

## Inputs

Before writing, gather:

1. **What is the product?** One sentence. What does it do?
2. **Who is it for?** Specific persona, not "everyone" or "developers."
3. **What's the hook?** The single thing that makes someone stop scrolling.
4. **What platform?** Each platform has different conventions (see Platform Guide below).
5. **What's the CTA?** What should the reader do after reading? (Try it, sign up, download, star the repo)

If any of these are unclear, ask the user before writing.

---

## Platform Guide

### Product Hunt Launch

- **Title:** Under 60 characters. Action-oriented.
- **Tagline:** One sentence, under 80 characters. The hook.
- **Description:** 3-5 short paragraphs. Problem → Solution → How it works → Social proof → CTA.
- **First comment:** From the maker. Personal, authentic. Why you built it. Not a feature list.
- **Tone:** Enthusiastic but not hype. Show, don't tell. Avoid superlatives.
- **Visuals:** Reference what screenshots/GIFs to include (don't generate them).

### App Store / Google Play

- **Title:** Product name + 2-3 keyword phrase (30 char limit iOS, 50 Android).
- **Subtitle/Short description:** One line explaining the core value.
- **Description:** Lead with benefits, not features. Bullet points for scannability. Include keywords naturally.
- **What's New:** Brief, specific. "Fixed crash on login" not "Bug fixes and improvements."
- **Screenshots:** Describe what each screenshot should show (don't generate them).

### Landing Page

- **Hero:** Headline (hook) + subheadline (one sentence expansion) + CTA button.
- **Problem section:** 2-3 sentences about the pain point. The reader should nod.
- **Solution section:** How the product solves it. Features as benefits, not specs.
- **Social proof:** Testimonials, stats, logos. If none exist yet, skip — don't fabricate.
- **Pricing:** Clear, simple. Don't hide the price.
- **FAQ:** 3-5 questions that address objections.
- **Final CTA:** Repeat the hero CTA.

### GitHub README / npm Package

- **First line:** What it does in one sentence. No preamble.
- **Install:** Copy-pasteable command.
- **Quick start:** Minimal working example (under 10 lines).
- **Features:** Bullet list, each one sentence.
- **Tone:** Technical, direct. No marketing fluff. Developers smell it immediately.

### Social Media (Twitter/X, Threads, Bluesky)

- **Thread format:** Hook tweet → 3-5 detail tweets → CTA tweet.
- **Hook tweet:** The single most compelling thing. Question, bold claim, or surprising stat.
- **Detail tweets:** One idea per tweet. Short sentences. Use line breaks.
- **CTA tweet:** Link + clear action. "Try it: [link]" not "Check it out maybe?"
- **Tone:** Conversational, first person. Write like you're telling a friend.

### Blog Post / Article

- **Title:** Specific and searchable. Not clever — clear.
- **Opening:** Start with the problem or a story. Not "In this post I will..."
- **Structure:** Problem → What I built → How it works → Results → What's next.
- **Length:** 800-1500 words for launch posts. Shorter is better.
- **SEO:** Include the primary keyword in title, first paragraph, and one subheading.

### Reddit / Community Posts

- **READ `stacks/mcp/launch.md` FIRST** if it exists. Contains hard-won lessons about community sentiment.
- **Never post AI-written promotional content to AI-hostile communities.**
- **Tone:** Genuine, humble, asking for feedback. Not announcing.
- **Format:** "I built X because Y. Here's what I learned. Would love feedback."
- **Disclose AI involvement** if the community expects it.
- **Engage with comments.** Don't post and vanish.

### Email (Launch / Newsletter)

- **Subject line:** Under 50 characters. Specific. Not clickbait.
- **Preview text:** Complements the subject, doesn't repeat it.
- **Body:** One core message. Problem → solution → CTA. Under 200 words.
- **CTA:** Single, clear button. Not 5 different links.

---

## Writing Rules

1. **Lead with the user's problem, not your product.** "Tired of X?" before "Introducing Y."
2. **Benefits over features.** "Save 2 hours/week" not "Automated pipeline with 12 integrations."
3. **Specific over vague.** "85 beer styles" not "comprehensive database." Numbers are hooks.
4. **One CTA per piece.** Don't split attention.
5. **No superlatives without evidence.** Don't say "best" or "revolutionary." Show results.
6. **Match platform conventions.** A Product Hunt post reads differently from a README.
7. **Never fabricate social proof.** No fake testimonials, inflated numbers, or implied endorsements.
8. **Disclose AI where appropriate.** Some platforms and communities require or expect it.

---

## Process

1. Gather inputs (product, persona, hook, platform, CTA).
2. Read tone-of-voice guide if it exists.
3. Read platform-specific guidance above.
4. Write a first draft.
5. Present to user for review. Marketing copy is personal — expect edits.
6. Revise based on feedback.
7. Output the final copy in a format ready to paste into the platform.

Do NOT publish, post, or send anything. Present copy to the user — they decide when and where to publish.
