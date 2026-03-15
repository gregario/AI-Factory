# Browser QA Setup

## Dependency: gstack browse

Browser QA uses gstack's `browse` binary — a persistent headless Chromium CLI. First call starts the browser (~3s), then each command runs in ~100ms. State (cookies, tabs, sessions) persists between commands.

## Installation

### 1. Install bun (if not already installed)

```bash
curl -fsSL https://bun.sh/install | bash
```

### 2. Clone gstack

```bash
git clone https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
```

Or if you prefer a project-local install:

```bash
git clone https://github.com/garrytan/gstack.git .claude/skills/gstack
```

### 3. Build the browse binary

```bash
cd ~/.claude/skills/gstack/browse && ./setup
```

This compiles the TypeScript source and downloads Chromium. Takes ~10 seconds.

### 4. Verify

```bash
~/.claude/skills/gstack/browse/dist/browse status
```

Should output health check information.

## Binary Location

The QA skill checks for the browse binary in two locations (in order):

1. `<project-root>/.claude/skills/gstack/browse/dist/browse` (project-local)
2. `~/.claude/skills/gstack/browse/dist/browse` (user-global)

## Finding the Binary at Runtime

Use this pattern at the start of any QA session:

```bash
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
B=""
[ -n "$_ROOT" ] && [ -x "$_ROOT/.claude/skills/gstack/browse/dist/browse" ] && B="$_ROOT/.claude/skills/gstack/browse/dist/browse"
[ -z "$B" ] && B=~/.claude/skills/gstack/browse/dist/browse
if [ -x "$B" ]; then
  echo "READY: $B"
else
  echo "NEEDS_SETUP"
fi
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Browse hangs | `$B restart` |
| Chromium crashes | `$B stop` then retry the command |
| "NEEDS_SETUP" after install | Check that `./setup` completed without errors. Re-run it. |
| bun not found | Restart your shell after installing bun, or source `~/.bashrc` / `~/.zshrc` |
| Permission denied | `chmod +x ~/.claude/skills/gstack/browse/dist/browse` |

## Updating gstack

```bash
cd ~/.claude/skills/gstack && git pull && cd browse && ./setup
```
