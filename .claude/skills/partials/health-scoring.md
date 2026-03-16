**Health scoring methodology:**

Each category is scored 0-100. Overall score = weighted sum: `Σ (category_score × weight)`.

Severity-based deductions per issue found:
- **Critical:** -25 points (blocks usage or causes data loss)
- **High:** -15 points (significant functionality broken)
- **Medium:** -8 points (noticeable but workaround exists)
- **Low:** -3 points (cosmetic or minor inconvenience)

Floor each category at 0 (never negative). Document each issue with a unique ID (e.g., `ISSUE-001` or `FINDING-001`), severity, category, and description.
