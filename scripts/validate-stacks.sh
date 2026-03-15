#!/usr/bin/env bash
set -euo pipefail

# Validate all stack profiles for completeness and consistency.
# Usage: ./scripts/validate-stacks.sh
#
# Exit codes:
#   0 — All checks pass
#   1 — Warnings found
#   2 — Errors found

FACTORY_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STACKS_DIR="$FACTORY_ROOT/stacks"

ERRORS=0
WARNINGS=0

error() {
  echo "  ERROR: $1"
  ERRORS=$((ERRORS + 1))
}

warn() {
  echo "  WARN:  $1"
  WARNINGS=$((WARNINGS + 1))
}

ok() {
  echo "  OK:    $1"
}

REQUIRED_FILES="STACK.md coding_standards.md testing.md project_structure.md pitfalls.md"

# Skip the template-system meta-stack (it documents the template system itself)
SKIP_STACKS="template-system"

for stack_dir in "$STACKS_DIR"/*/; do
  stack_name="$(basename "$stack_dir")"

  # Skip meta-stacks
  if echo "$SKIP_STACKS" | grep -qw "$stack_name"; then
    continue
  fi

  echo ""
  echo "=== $stack_name ==="

  # Check 1: Required files exist
  for req in $REQUIRED_FILES; do
    if [ -f "$stack_dir/$req" ]; then
      ok "$req exists"
    else
      # browser-qa doesn't need coding_standards (it's a QA stack, not a coding stack)
      if [ "$stack_name" = "browser-qa" ] && [ "$req" != "STACK.md" ]; then
        warn "$req missing (acceptable for $stack_name)"
      else
        error "$req missing"
      fi
    fi
  done

  # Check 2: STACK.md has file index
  if [ -f "$stack_dir/STACK.md" ]; then
    if grep -q "Read When\|Read when\|read when" "$stack_dir/STACK.md"; then
      ok "STACK.md has file index"
    else
      warn "STACK.md may be missing file index table"
    fi
  fi

  # Check 3: No orphan files (files not referenced in STACK.md)
  if [ -f "$stack_dir/STACK.md" ]; then
    for md_file in "$stack_dir"/*.md; do
      fname="$(basename "$md_file")"
      if [ "$fname" = "STACK.md" ]; then
        continue
      fi
      if grep -q "$fname" "$stack_dir/STACK.md"; then
        ok "$fname referenced in STACK.md"
      else
        warn "$fname not referenced in STACK.md file index"
      fi
    done
  fi

  # Check 4: No empty files
  for md_file in "$stack_dir"/*.md; do
    fname="$(basename "$md_file")"
    line_count=$(wc -l < "$md_file" | tr -d ' ')
    if [ "$line_count" -lt 5 ]; then
      error "$fname appears empty ($line_count lines)"
    fi
  done

  # Check 5: Key sections exist
  if [ -f "$stack_dir/coding_standards.md" ]; then
    if grep -qi "## Naming\|## naming\|## File\|## Conventions" "$stack_dir/coding_standards.md"; then
      ok "coding_standards.md has structure"
    else
      warn "coding_standards.md may be missing key sections (Naming, Conventions)"
    fi
  fi

  if [ -f "$stack_dir/testing.md" ]; then
    if grep -qi "## Test\|## test\|## Running\|## Framework" "$stack_dir/testing.md"; then
      ok "testing.md has structure"
    else
      warn "testing.md may be missing key sections (Test, Running, Framework)"
    fi
  fi
done

echo ""
echo "================================"
echo "Errors:   $ERRORS"
echo "Warnings: $WARNINGS"

if [ "$ERRORS" -gt 0 ]; then
  echo "RESULT: FAIL"
  exit 2
elif [ "$WARNINGS" -gt 0 ]; then
  echo "RESULT: PASS with warnings"
  exit 1
else
  echo "RESULT: PASS"
  exit 0
fi
