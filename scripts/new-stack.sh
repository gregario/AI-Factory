#!/usr/bin/env bash
set -euo pipefail

# Scaffold a new stack profile from templates.
# Usage: ./scripts/new-stack.sh <stack-name>

STACK_NAME="${1:-}"

if [ -z "$STACK_NAME" ]; then
  echo "Usage: ./scripts/new-stack.sh <stack-name>"
  echo "Example: ./scripts/new-stack.sh python"
  exit 1
fi

FACTORY_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STACK_DIR="$FACTORY_ROOT/stacks/$STACK_NAME"
TEMPLATE_DIR="$FACTORY_ROOT/templates/stack-profile"

if [ -d "$STACK_DIR" ]; then
  echo "Error: stacks/$STACK_NAME/ already exists."
  exit 1
fi

if [ ! -d "$TEMPLATE_DIR" ]; then
  echo "Error: templates/stack-profile/ not found."
  exit 1
fi

echo "Creating stacks/$STACK_NAME/..."
mkdir -p "$STACK_DIR"

for tmpl in "$TEMPLATE_DIR"/*.tmpl; do
  filename="$(basename "$tmpl" .tmpl)"
  sed "s/{{STACK_NAME}}/$STACK_NAME/g" "$tmpl" > "$STACK_DIR/$filename"
  echo "  Created $filename"
done

echo ""
echo "Stack profile scaffolded at stacks/$STACK_NAME/"
echo ""
echo "Next steps:"
echo "  1. Fill in each file — replace TODO comments with real content"
echo "  2. Add optional files as needed (security.md, performance.md, etc.)"
echo "  3. Run ./scripts/validate-stacks.sh to check completeness"
echo "  4. Commit the new stack profile"
