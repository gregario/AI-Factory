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

4. **Create a Glama release** (this is NOT the same as a GitHub Release).
   A "Glama release" is a containerised build inside Glama's own system:
   a. Go to `https://glama.ai/mcp/servers/{owner}/{repo}/admin/dockerfile`
   b. Configure the build spec (build steps, CMD arguments, env vars, placeholder params)
   c. Click **Deploy** to trigger a build test
   d. Once the build test succeeds, click **Make Release**
   e. Enter a version number and optional changelog, click **Create & Publish Release**

   Without this step, Glama shows "No release" and "Server not inspectable" regardless of what's in your GitHub repo. This is a manual step done through Glama's admin UI.

5. **Add Glama score badge to README** — use the inline score badge in the pill row (NOT the card badge):
   ```html
   <a href="https://glama.ai/mcp/servers/gregario/{repo}"><img src="https://glama.ai/mcp/servers/gregario/{repo}/badges/score.svg" alt="{repo} MCP server"></a>
   ```

6. **Glama scorecard requirements** — all must pass before submitting awesome-mcp-servers PR:
   - [ ] LICENSE file detected
   - [ ] README quality passes
   - [ ] Glama release created (via admin/dockerfile page, not GitHub releases)
   - [ ] Server inspectable (Glama can start the container and detect tools)
   - [ ] Tools detected
   - [ ] No security flags
   - [ ] Author verified (claim ownership via GitHub auth)

7. **Dockerfile template** (committed to repo for reference, but the actual build is configured in Glama's admin UI).

   Use multi-stage build if you have native dependencies (better-sqlite3, etc.):
   ```dockerfile
   FROM node:22-slim AS builder
   RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
   WORKDIR /app
   COPY package.json package-lock.json tsconfig.json ./
   COPY src/ src/
   RUN npm ci
   RUN npm run build

   FROM node:22-slim
   WORKDIR /app
   COPY --from=builder /app/node_modules ./node_modules
   COPY --from=builder /app/dist ./dist
   COPY --from=builder /app/package.json ./
   ENTRYPOINT ["node", "dist/server.js"]
   ```
   For pure JS servers (no native deps):
   ```dockerfile
   FROM node:22-slim AS builder
   WORKDIR /app
   COPY package.json package-lock.json tsconfig.json ./
   COPY src/ src/
   RUN npm ci
   RUN npm run build

   FROM node:22-slim
   WORKDIR /app
   COPY --from=builder /app/node_modules ./node_modules
   COPY --from=builder /app/dist ./dist
   COPY --from=builder /app/package.json ./
   ENTRYPOINT ["node", "dist/index.js"]
   ```
   Adjust the entry point to match your `bin` field in package.json.

8. **Related servers** — if you have other MCP servers, link them in `glama.json`:
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

9. Use "Sync Server" button after any updates.

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
- [ ] Dockerfile in repo root
- [ ] Glama release created via admin/dockerfile page (Deploy + Make Release)
- [ ] `glama.json` in repo with maintainer + related servers
- [ ] Glama ownership claimed, scorecard all green (A A A)
- [ ] `mcpName` in package.json, `<!-- mcp-name: ... -->` in README
- [ ] Registered on Official MCP Registry via `mcp-publisher publish`
- [ ] Glama **score** badge in README (not just card badge)
- [ ] PR submitted to punkpeye/awesome-mcp-servers (with Glama score badge in the entry)
- [ ] README has IDE config snippets (minimum: Claude Code, Claude Desktop, Cursor)
- [ ] Community launch plan reviewed (see `launch.md`)
