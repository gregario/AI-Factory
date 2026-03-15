# Browser QA Authentication

Patterns for testing authenticated pages and handling login flows.

---

## Login Flow

Standard username/password login:

```bash
$B goto https://app.com/login
$B snapshot -i                    # find the login form elements
$B fill @e3 "user@example.com"
$B fill @e4 "password123"
$B click @e5                     # submit
$B snapshot -D                   # verify login succeeded
$B is visible ".dashboard"       # confirm authenticated state
```

Session persists after login — subsequent `goto` commands stay authenticated.

---

## Cookie Import

For pre-authenticated sessions without going through the login flow:

```bash
$B cookie-import cookies.json
$B goto https://app.com/dashboard    # should load authenticated
```

Export cookies from a real browser session into `cookies.json` first. Format is an array of cookie objects.

---

## Browser Cookie Import

Import cookies directly from an installed browser:

```bash
$B cookie-import-browser chrome --domain myapp.com
$B cookie-import-browser arc --domain myapp.com
$B cookie-import-browser brave --domain myapp.com
$B cookie-import-browser edge --domain myapp.com
```

Without `--domain`, opens an interactive picker.

---

## 2FA / OTP

Cannot be automated. When the flow hits a 2FA prompt:

1. The QA skill pauses.
2. Asks the user for the code via AskUserQuestion.
3. User provides the code.
4. Skill enters the code and continues.

---

## CAPTCHA

Cannot be automated. When a CAPTCHA blocks progress:

1. Tell the user: "CAPTCHA encountered. Please complete it in the browser, then tell me to continue."
2. Wait for user confirmation.
3. Continue testing.

---

## Custom Headers

For API token or bearer auth:

```bash
$B header "Authorization:Bearer eyJhbGci..."
$B goto https://api.app.com/protected
```

---

## Credential Safety

**NEVER include real passwords in QA reports.** Use `[REDACTED]` in repro steps:

```
1. Navigate to /login
2. Fill email: user@example.com
3. Fill password: [REDACTED]
4. Click Submit
```

Credentials should come from the user at runtime, not be stored in skill files or reports.
