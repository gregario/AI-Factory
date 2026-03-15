# Browser QA Testing Patterns

Patterns for using the browse binary (`$B`) during QA. All examples assume `$B` is set to the browse binary path (see `setup.md`).

---

## Smoke Test

Quick "does it load?" check. Takes 5 seconds.

```bash
$B goto https://myapp.com
$B text                          # content loads?
$B console --errors              # JS errors?
$B is visible ".main-content"    # key element present?
```

---

## Flow Test

Test a complete user flow end-to-end.

```bash
$B goto https://app.com/login
$B snapshot -i                   # see all interactive elements with @e refs
$B fill @e3 "user@test.com"
$B fill @e4 "password123"
$B click @e5                     # submit
$B snapshot -D                   # diff: what changed after submit?
$B is visible ".dashboard"       # success state present?
```

The `-D` flag shows a unified diff of the page state before and after the action. This is your proof that the action worked.

---

## Form Test

Test forms with valid, empty, and edge-case data.

```bash
# Valid submission
$B goto https://app.com/contact
$B snapshot -i
$B fill @e1 "Test User"
$B fill @e2 "test@example.com"
$B fill @e3 "This is a test message"
$B click @e4                     # submit
$B snapshot -D                   # verify success state

# Empty submission
$B goto https://app.com/contact
$B click @e4                     # submit empty
$B snapshot -D                   # verify validation messages

# Edge cases
$B fill @e1 "A very long name that exceeds reasonable length limits and might break the UI layout"
$B fill @e2 "not-an-email"
$B fill @e3 "<script>alert('xss')</script>"
$B click @e4
$B console --errors              # any JS errors from bad input?
```

---

## Responsive Test

Check layouts at mobile, tablet, and desktop breakpoints.

```bash
$B responsive /tmp/layout        # auto-captures 3 viewports
```

Or manually:

```bash
$B viewport 375x812              # mobile
$B screenshot /tmp/mobile.png
$B viewport 768x1024             # tablet
$B screenshot /tmp/tablet.png
$B viewport 1280x720             # desktop
$B screenshot /tmp/desktop.png
```

Look for: text overflow, overlapping elements, hidden navigation, broken grids.

---

## Console Monitoring

Check for JavaScript errors after every interaction.

```bash
$B console --errors              # errors and warnings only
$B console                       # all console output
$B console --clear               # clear and start fresh
```

Run `console --errors` after every `click`, `fill`, or `goto`. JS errors that don't surface visually are still bugs.

---

## State Verification

Assert DOM state after actions.

```bash
$B is visible ".modal"           # element is visible
$B is hidden ".loading-spinner"  # element is hidden
$B is enabled "#submit-btn"      # button is clickable
$B is disabled "#submit-btn"     # button is greyed out
$B is checked "#agree-checkbox"  # checkbox is checked
$B is focused "#search-input"    # input has focus
$B is editable "#name-field"     # field accepts input
```

---

## Before/After Evidence

Screenshot evidence for bug reports.

**Interactive bugs** (broken flows, dead buttons):
```bash
$B screenshot /tmp/issue-before.png    # before the action
$B click @e5                           # the action
$B screenshot /tmp/issue-after.png     # the broken result
$B snapshot -D                         # diff showing what went wrong
```

**Static bugs** (layout issues, typos):
```bash
$B snapshot -i -a -o /tmp/issue.png    # annotated screenshot with element labels
```

---

## Page Map

Get an overview of the app structure.

```bash
$B goto https://myapp.com
$B links                         # all links as "text → href"
$B snapshot -i                   # interactive elements (for SPAs where links misses client routes)
```

---

## Element Inspection

Dig into specific elements.

```bash
$B attrs @e3                     # all HTML attributes as JSON
$B css @e3 "color"               # computed CSS value
$B html @e3                      # innerHTML
$B js "document.querySelector('.price').textContent"  # arbitrary JS
```

---

## Environment Comparison

Compare staging vs production.

```bash
$B diff https://staging.myapp.com https://myapp.com
```
