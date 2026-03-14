---
name: product-taste
description: Use when about to propose a new feature or create a spec — challenges the idea with product thinking before committing to a direction
---

Pressure-test an idea before it becomes a spec. Pure product thinking — no architecture, no code analysis, no security review.

Adapted from [gstack](https://github.com/garrytan/gstack) by Garry Tan (MIT).

---

**Input**: A feature idea, enhancement proposal, or "I want to build X" statement. May be vague or detailed.

**Steps**

Ask one question at a time using **AskUserQuestion**. Present options as lettered choices (A/B/C) with a recommended default. Keep momentum — if the idea is genuinely good as stated, say so and move quickly.

### 1. Quick Triage

Determine the scope of the idea:
- **Small enhancement / bugfix** → Give a lighter pass. Skip to Step 2 (premise challenge only), then jump to Step 7 (output). No need for the full treatment.
- **New feature / significant change** → Full 7-step treatment.

State which path you're taking and why.

### 2. Premise Challenge

Before solving anything, challenge the premise. Ask the user (one at a time, skip any that are obvious from context):

- **Is this the right problem?** What's the actual user outcome we're chasing? Restate the problem in terms of what the user gets, not what we build.
- **What happens if we do nothing?** What's the cost of inaction? If the answer is "not much," that's a signal.
- **What already exists that partially solves this?** In the product, in the ecosystem, in the user's current workflow. Partial solutions reveal whether this is a gap or a rebuild.

If the premise is fundamentally wrong, say so directly: "Scrap this and do X instead." Propose the alternative and ask if the user wants to pivot.

### 3. Who Is This For?

Name the user persona concretely. "Users" is not acceptable.

Ask the user to describe:
- Who specifically hits this problem?
- What do they feel *before* this feature exists?
- What do they feel *after*?

If the user can't name a concrete persona, that's a red flag — surface it.

### 4. Mode Selection

Present three modes with a context-dependent recommendation:

- **A) EXPANSION** — Dream big. 10x the idea. What's the platonic ideal? Best for: greenfield features, new products, exploring potential.
- **B) HOLD** — Validate scope. What's the minimum viable version? Best for: enhancements to existing features, mid-roadmap work.
- **C) REDUCTION** — Strip to essentials. What can we cut? What's a follow-up? Best for: overbuilt proposals, scope creep, "kitchen sink" features.

Default recommendations:
- Greenfield / new product → recommend EXPANSION
- Enhancement to existing feature → recommend HOLD
- Proposal that feels overbuilt or bloated → recommend REDUCTION

Once a mode is selected, commit fully. Do not blend modes.

### 5. Mode-Specific Analysis

Run the analysis for the selected mode:

**EXPANSION mode:**
- What's the 10x version of this? Not incremental — transformative.
- What's the platonic ideal? If there were no constraints, what would this look like?
- Name 3+ delight opportunities — moments that would make the user smile, tell a friend, or feel clever.

**HOLD mode:**
- Complexity check — what's the implementation cost vs. user value? Is the ratio healthy?
- What's the minimum scope that delivers the core outcome from Step 2?
- What can be deferred to a follow-up without losing the value?

**REDUCTION mode:**
- Ruthless cut — what can be removed entirely and the feature still works?
- What's a follow-up vs. what's core? Draw the line explicitly.
- Is there a simpler framing that eliminates half the work?

Present your analysis, then ask the user if it resonates or if they want to adjust.

### 6. Dream State Mapping

Map three states in one concise view:

1. **Current state** — Where the product/feature is today.
2. **After this feature** — Where it'll be once shipped.
3. **12-month ideal** — Where the product should be in a year.

Then answer: Does this feature move toward or away from the 12-month vision?

If it moves away, flag it clearly. If it moves toward, confirm alignment.

### 7. Output

Produce a **sharpened brief** — one tight paragraph that captures:
- The problem (from Step 2)
- The persona (from Step 3)
- The scope and mode (from Steps 4-5)
- The vision alignment (from Step 6)

This paragraph is ready to be handed to `/opsx:propose` as the input description.

Present it to the user and ask: "Ready to propose this, or want to adjust?"

---

**What this skill does NOT cover:**
- Architecture or technical feasibility review
- Error maps or failure mode analysis
- Code analysis or refactoring assessment
- Security review

This is pure product thinking. Technical review happens downstream.

**Rules:**
- One question at a time via AskUserQuestion
- Present options as lettered choices (A/B/C) with a recommendation
- If the idea is genuinely good as stated, say so and move quickly — don't manufacture doubt
- If fundamentally wrong, say "scrap it and do this instead" — don't soften bad news
- Keep the whole process to 5-10 minutes for a full pass, 2 minutes for a light pass
