# User Journey Map Template

> **UX Architecture pass.** Trace the exact steps a user takes to complete a core task. Every click, every screen transition. Exposes friction, dead ends, and 3-click rule violations before any code is written. Copy this template and fill in the blanks.

---

## Instructions

1. Pick a core task (the thing users came to do).
2. Define the starting state: where the user is, what they want.
3. Walk through every step: what they click, what screen they land on, cumulative click count.
4. Flag if the task exceeds 3 clicks to complete (the 3-click rule). Not every violation is a problem, but each one needs a justification.
5. Map decision points (where the user chooses between paths).
6. Map error recovery (what happens when something goes wrong).
7. One journey per task. Do not combine tasks.

---

## Template

```
JOURNEY: [task name]
ACTOR: [user type]
GOAL: [what the user wants to accomplish]
STARTING STATE: [where they are, what they see]

HAPPY PATH
  Step  Click#  Action                      Screen              Notes
  ----  ------  --------------------------  ------------------  -----
  1     0       [starting position]         [screen]
  2     1       [action]                    [screen]
  3     2       [action]                    [screen]
  ...

  TOTAL CLICKS: [N]
  3-CLICK RULE: [PASS / EXCEEDED — justification if exceeded]

DECISION POINTS
  At step [N]: [choice A] --> [path A outcome]
              [choice B] --> [path B outcome]

ERROR RECOVERY
  At step [N], if [error condition]:
    --> [what the user sees]
    --> [how they recover]
    --> [clicks to recover and resume]
```

---

## Worked Example 1: Sign up and create first project

```
JOURNEY: Sign up and create first project
ACTOR: New user
GOAL: Get from landing page to having a project they can add tasks to
STARTING STATE: On landing page, no account

HAPPY PATH
  Step  Click#  Action                      Screen              Notes
  ----  ------  --------------------------  ------------------  -----
  1     0       Lands on page               Landing Page
  2     1       Clicks "Get Started"        Sign Up
  3     2       Fills form, clicks Submit   Dashboard           Auto-redirected after signup
  4     3       Clicks "New Project"        New Project Modal
  5     4       Types name, clicks Create   Project Detail      Project created, empty task list

  TOTAL CLICKS: 4
  3-CLICK RULE: EXCEEDED — Acceptable. User has a functional project at click 4.
    The alternative (auto-creating a project on signup) was considered but
    rejected: users need to name their project, and skipping this creates
    a "Project 1" they'll rename later anyway.

DECISION POINTS
  At step 2: "Sign up with Google" --> skips form, redirects to Google OAuth, returns to Dashboard (click 2)
             "Sign up with email"  --> shows email/password form (stays on same screen)

ERROR RECOVERY
  At step 3, if email already taken:
    --> Inline error: "Email already registered. Sign in instead?"
    --> Click "Sign in" link --> Login screen (1 click)
    --> Login + redirect to Dashboard (2 clicks to recover)

  At step 3, if validation fails (weak password):
    --> Inline error below password field
    --> Fix and resubmit (0 extra clicks, same button)
```

## Worked Example 2: Complete a purchase

```
JOURNEY: Purchase a Pro plan
ACTOR: Existing free-tier user
GOAL: Upgrade to Pro plan and get access to premium features
STARTING STATE: Logged in, on Dashboard, using free plan

HAPPY PATH
  Step  Click#  Action                      Screen              Notes
  ----  ------  --------------------------  ------------------  -----
  1     0       On Dashboard                Dashboard           Sees "Upgrade" badge in nav
  2     1       Clicks "Upgrade"            Settings > Billing
  3     2       Clicks "Pro — $12/mo"       Checkout Modal      Stripe Elements embedded
  4     3       Enters card, clicks Pay     Settings > Billing  Confirmation toast, plan updated

  TOTAL CLICKS: 3
  3-CLICK RULE: PASS

DECISION POINTS
  At step 3: "Monthly" --> $12/mo
             "Annual"  --> $96/yr (save 33%) — toggle, no extra click

ERROR RECOVERY
  At step 4, if payment fails:
    --> Inline error in modal: "Card declined. Try another card."
    --> User re-enters card details and clicks Pay again (0 extra navigation clicks)
    --> Modal stays open, no progress lost

  At step 4, if user closes modal accidentally:
    --> Returns to Billing tab (still on same screen)
    --> Clicks "Pro" again to reopen modal (1 click to recover)
    --> Card details cleared (Stripe security), must re-enter
```
