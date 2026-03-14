# Project Structure — MCP Server

Extends `stacks/typescript/project_structure.md`. This covers MCP-specific structure only.

---

## Standard MCP Server Layout

```
my-mcp-server/
  src/
    index.ts          # Entry point: create server, register tools/resources, wire transport
    tools/            # Tool implementations (one file per tool or logical group)
    resources/        # Resource implementations (if any)
    prompts/          # Prompt implementations (if any)
    types.ts          # Shared type definitions and Zod schemas
    lib/              # Internal utilities (API clients, helpers)
  tests/
    setup.ts          # Test helpers, in-memory transport setup
    *.test.ts         # Test files
  dist/               # Compiled output (gitignored)
  package.json
  tsconfig.json
  README.md
```

### Small servers (< 5 tools)

For simple servers, tools can live directly in `index.ts`. Only extract to `tools/` when the file exceeds ~100 lines or you have more than 3–4 tools.

```
my-mcp-server/
  src/
    index.ts          # Everything: server creation, tool definitions, transport
    types.ts          # Shared types (if needed)
  tests/
    tools.test.ts
  package.json
  tsconfig.json
```

---

## Naming Convention

**Package name:** `{service}-mcp-server` (lowercase with hyphens).

Examples: `github-mcp-server`, `postgres-mcp-server`, `weather-mcp-server`.

---

## package.json Essentials

```json
{
  "name": "@scope/my-mcp-server",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "my-mcp-server": "dist/index.js"
  },
  "files": ["dist", "README.md", "LICENSE"],
  "scripts": {
    "build": "tsc && chmod 755 dist/index.js",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "inspect": "npx @modelcontextprotocol/inspector node dist/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.x",
    "zod": "^3.25"
  },
  "devDependencies": {
    "@types/node": "^22",
    "tsx": "^4",
    "typescript": "^5.7",
    "vitest": "^3"
  }
}
```

### Key points

- **`bin` field** is required for npx distribution. The key should match the package name (without scope).
- **`chmod 755`** in the build script makes the entry point executable.
- **`files`** restricts what gets published to npm.
- **`inspect` script** launches the MCP Inspector pointed at your built server.

---

## Entry Point (src/index.ts)

The entry point must start with a shebang for npx execution:

```typescript
#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({
  name: "my-mcp-server",
  version: "0.1.0",
});

// Register tools, resources, prompts here
// (or import registrations from tools/, resources/, prompts/)

const transport = new StdioServerTransport();
await server.connect(transport);
```

---

## tsconfig.json

Use the TypeScript stack's standard tsconfig with no changes needed. The key settings:

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

---

## Tool File Structure

Each tool file exports a registration function:

```typescript
// src/tools/search.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerSearchTools(server: McpServer): void {
  server.registerTool("search", {
    title: "Search",
    description: "Search the knowledge base for relevant documents",
    inputSchema: {
      query: z.string().describe("Search query"),
      limit: z.number().optional().default(10).describe("Max results to return"),
    },
  }, async ({ query, limit }) => {
    // Implementation
    return {
      content: [{ type: "text", text: JSON.stringify(results) }],
    };
  });
}
```

Then in `index.ts`:
```typescript
import { registerSearchTools } from "./tools/search.js";

registerSearchTools(server);
```

---

## Configuration

**Prefer CLI arguments for required config, environment variables for secrets.**

```typescript
// Parse CLI args for directories, paths, non-secret config
const allowedDirs = process.argv.slice(2);

// Environment variables for secrets
const apiKey = process.env.MY_API_KEY;
if (!apiKey) {
  console.error("MY_API_KEY environment variable required");
  process.exit(1);
}
```

Never hardcode credentials. Never accept secrets as tool parameters.

---

## Distribution

### npm/npx (preferred for stdio servers)

Publish to npm. Users run via:
```bash
npx -y @scope/my-mcp-server --flag value
```

Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["-y", "@scope/my-mcp-server", "--flag", "value"]
    }
  }
}
```

Claude Code config (`.mcp.json` at project root for team sharing):
```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["-y", "@scope/my-mcp-server"],
      "env": {
        "MY_API_KEY": "..."
      }
    }
  }
}
```

### Docker (for Streamable HTTP servers)

Best for remote deployment. Use a multi-stage Dockerfile:
```dockerfile
FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["node", "dist/index.js", "--transport", "http"]
```
