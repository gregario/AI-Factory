# Sitemap Template

> **UX Architecture pass.** Map every screen in the product, its URL, navigation connections, and access rules. This is the skeleton the rest of the design hangs on. Copy this template and fill in the blanks.

---

## Instructions

1. List every screen as a node in a tree, grouped by section.
2. Show the URL path for each screen.
3. Mark auth boundaries (which screens require login).
4. Mark entry points (where users land from external links, emails, ads).
5. Show navigation connections (which screens link to which).
6. Keep it text-only — no Mermaid, no images. Must be readable in a plain markdown file.

---

## Template

```
PROJECT: [project name]
DATE: [date]

ENTRY POINTS
  [source] --> [screen] [url]
  ...

AUTH BOUNDARY
  Public: [list of screens accessible without login]
  Authenticated: [list of screens requiring login]

SCREEN TREE
  [section]
    [screen name] [url]
      --> [linked screen] [relationship]
      --> [linked screen] [relationship]
    [screen name] [url]
      --> ...
  [section]
    ...

NAVIGATION
  [nav element]: [screen] | [screen] | [screen]
  ...
```

---

## Worked Example: TaskFlow (simple SaaS project manager)

```
PROJECT: TaskFlow
DATE: 2026-03-16

ENTRY POINTS
  Marketing site     --> Landing Page       /
  Google search      --> Landing Page       /
  Email invite link  --> Accept Invite      /invite/:token
  Password reset     --> Reset Password     /reset-password/:token
  Direct bookmark    --> Dashboard          /dashboard

AUTH BOUNDARY
  Public:         Landing Page, Login, Sign Up, Accept Invite, Reset Password
  Authenticated:  Dashboard, Projects, Project Detail, Settings, Account

SCREEN TREE
  Public
    Landing Page                /
      --> Login                 CTA "Sign In"
      --> Sign Up               CTA "Get Started"
    Login                       /login
      --> Dashboard             on success
      --> Sign Up               "Create account" link
      --> Reset Password        "Forgot password" link
    Sign Up                     /signup
      --> Dashboard             on success
      --> Login                 "Already have account" link
    Accept Invite               /invite/:token
      --> Sign Up               if no account
      --> Dashboard             if existing user
    Reset Password              /reset-password/:token
      --> Login                 on success

  Main App
    Dashboard                   /dashboard
      --> Project Detail        click project card
      --> Projects              "View all" link
      --> Settings              nav link
    Projects                    /projects
      --> Project Detail        click project row
      --> Dashboard             nav link
    Project Detail              /projects/:id
      --> Projects              breadcrumb "Projects"
      --> Dashboard             nav link
      Task List (tab)           /projects/:id/tasks
      Members (tab)             /projects/:id/members
      Activity (tab)            /projects/:id/activity
    Settings                    /settings
      General (tab)             /settings/general
      Billing (tab)             /settings/billing
      Team (tab)                /settings/team
    Account                     /account
      --> Login                 on sign out

NAVIGATION
  Top nav:      Dashboard | Projects | Settings
  User menu:    Account | Sign Out
  Breadcrumbs:  Dashboard > Projects > [Project Name]
```
