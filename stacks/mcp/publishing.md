# Publishing & Distribution — MCP Server

This is the definition of done for shipping an MCP server. An MCP server is not "done" when the code works — it's done when it's published, listed, discoverable, and installable with one command.

---

## Publishing Pipeline

Complete these in order. Each step gates the next.

### Step 1: npm Publish

**Gate:** All tests pass, build succeeds, `npx -y your-package` works locally.

**Checklist:**

- [ ] `package.json` has correct `name`, `version`, `description`, `license`, `repository`
- [ ] `"type": "module"` set
- [ ] `bin` field maps package name to `dist/index.js`
- [ ] `files` field restricts published contents (`["dist", "README.md", "LICENSE"]`)
- [ ] `keywords` includes `"mcp"`, `"model-context-protocol"`, and domain terms
- [ ] `engines` specifies minimum Node version (`>=18.0.0`)
- [ ] `prepublishOnly` script runs build + tests
- [ ] Entry point has shebang `#!/usr/bin/env node`
- [ ] Build script includes `chmod +x dist/index.js`
- [ ] `LICENSE` file exists in repo root
- [ ] README includes: what it does, installation, tool descriptions, IDE config examples
- [ ] `npm pack --dry-run` shows only intended files
- [ ] `npx -y your-package` works from a clean directory (test this!)

**Naming convention:** `{service}-mcp-server` or `{name}-mcp` or a distinctive brand name (like `godot-forge`). Scoped packages (`@scope/name`) also work.

```bash
npm publish            # First publish
npm publish --access public  # If scoped package
```

### Step 2: Glama AI Listing

**Gate:** npm package is published and installable.

Glama auto-discovers servers from GitHub, but you should claim ownership.

1. Add `glama.json` to repo root:
   ```json
   {
     "$schema": "https://glama.ai/mcp/schemas/server.json",
     "maintainers": ["your-github-username"]
   }
   ```

2. Authenticate on [glama.ai](https://glama.ai) with GitHub.

3. Find your server listing and click "Claim ownership".

4. **Glama scorecard requirements** — all must pass before submitting awesome-mcp-servers PR:
   - [ ] LICENSE file detected (must exist in repo root)
   - [ ] README quality passes
   - [ ] GitHub Release exists (not just a git tag: `gh release create vX.Y.Z`)
   - [ ] Dockerfile exists in repo root (required for server inspection + tool detection)
   - [ ] Tools/resources/prompts detected (server must be inspectable via Dockerfile)
   - [ ] No security flags
   - [ ] Author verified (claim ownership via GitHub auth)

5. **Dockerfile template** (required for Glama inspection).
   Use multi-stage build if you have native dependencies (better-sqlite3, etc.):
   ```dockerfile
   FROM node:22-slim AS builder
   RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
   WORKDIR /app
   COPY package.json package-lock.json ./
   RUN npm ci --omit=dev
   COPY dist/ dist/

   FROM node:22-slim
   WORKDIR /app
   COPY --from=builder /app/node_modules ./node_modules
   COPY --from=builder /app/dist ./dist
   COPY --from=builder /app/package.json ./
   ENTRYPOINT ["node", "dist/server.js"]
   ```
   For pure JS servers (no native deps), a single-stage build is fine:
   ```dockerfile
   FROM node:22-slim
   WORKDIR /app
   COPY package.json package-lock.json ./
   RUN npm ci --omit=dev
   COPY dist/ dist/
   ENTRYPOINT ["node", "dist/index.js"]
   ```
   Adjust the entry point to match your `bin` field in package.json.

6. **Related servers** — if you have other MCP servers, link them in `glama.json`:
   ```json
   {
     "$schema": "https://glama.ai/mcp/schemas/server.json",
     "maintainers": ["your-github-username"],
     "relatedServers": [
       {
         "name": "other-server",
         "url": "https://glama.ai/mcp/servers/owner/other-server",
         "description": "Brief description"
       }
     ]
   }
   ```

7. Use "Sync Server" button after any updates.

### Step 3: Official MCP Registry

**Gate:** npm package published, Glama listed.

The canonical registry at `registry.modelcontextprotocol.io`, backed by Anthropic/GitHub/Microsoft.

1. Add `mcpName` to `package.json` using reverse DNS format:
   ```json
   "mcpName": "io.github.username/server-name"
   ```

2. Add the mcp-name to README (can be an HTML comment):
   ```html
   <!-- mcp-name: io.github.username/server-name -->
   ```

3. Follow the [quickstart](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/quickstart.mdx) to authenticate namespace ownership via GitHub OAuth.

4. Package versions in registry must match published npm versions.

### Step 4: awesome-mcp-servers PR

**Gate:** npm published, Glama listed with clean score, LICENSE file present.

Submit a PR to [punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers).

**Requirements (enforced by their bot):**
1. Server must be listed on Glama with passing checks first
2. The PR line must include a Glama **score** badge at the end (not the card badge):
   ```
   - [owner/repo](https://github.com/owner/repo) 📇 🏠 - Description. [![owner/repo MCP server](https://glama.ai/mcp/servers/OWNER/REPO/badges/score.svg)](https://glama.ai/mcp/servers/OWNER/REPO)
   ```
3. Entry goes in alphabetical order within the appropriate category
4. Language icons: 📇 = TypeScript, 🐍 = Python
5. Hosting icons: 🏠 = local/self-hosted, ☁️ = cloud

**Learned the hard way:** the bot will comment asking for the Glama score badge. If you forget it, the PR stalls. Add it in the first commit.

### Step 5: Smithery (Optional)

For hosted/remote MCP servers, [smithery.ai](https://smithery.ai) offers hosting + registry.

Publish via CLI or web UI at `smithery.ai/new`.

---

## IDE Configuration Snippets

Your README should include config for at minimum these clients:

**Claude Code:**
```bash
claude mcp add my-server -- npx -y my-mcp-server
```

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["-y", "my-mcp-server"]
    }
  }
}
```

**Cursor** (`.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["-y", "my-mcp-server"]
    }
  }
}
```

Include snippets for as many IDEs as relevant. See the [godot-forge README](https://github.com/gregario/godot-forge) for a comprehensive example covering 15+ IDEs.

---

## Version Bumping

Use semantic versioning:
- **Patch** (0.1.x): bug fixes, no tool changes
- **Minor** (0.x.0): new tools, new features, backward-compatible
- **Major** (x.0.0): removed tools, breaking parameter changes, transport changes

After bumping:
```bash
npm version patch  # or minor, major
npm publish
```

Then sync Glama and update MCP Registry if needed.

---

## Definition of Done — Full Checklist

An MCP server project is **done** when:

- [ ] All tests pass
- [ ] `npx -y package-name` installs and runs from a clean environment
- [ ] Published to npm
- [ ] LICENSE file in repo root
- [ ] Dockerfile in repo root (for Glama server inspection)
- [ ] GitHub Release created (tag matching npm version)
- [ ] `glama.json` in repo with maintainer + related servers
- [ ] Glama ownership claimed, scorecard all green (A A A)
- [ ] `mcpName` in package.json, `<!-- mcp-name: ... -->` in README
- [ ] Registered on Official MCP Registry via `mcp-publisher publish`
- [ ] Glama **score** badge in README (not just card badge)
- [ ] PR submitted to punkpeye/awesome-mcp-servers (with Glama score badge in the entry)
- [ ] README has IDE config snippets (minimum: Claude Code, Claude Desktop, Cursor)
- [ ] Community launch plan reviewed (see `launch.md`)
