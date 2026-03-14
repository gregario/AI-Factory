# Testing — MCP Server

Extends `stacks/typescript/testing.md`. This covers MCP-specific testing patterns only.

---

## Test Runner

Use **Vitest** for all MCP server testing. It has native ESM and TypeScript support with zero config.

```json
// package.json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

---

## Testing with In-Memory Transport

The SDK provides an in-memory transport for testing without stdio. This is the primary way to test MCP servers.

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/index.js"; // Export your server creation

describe("my-mcp-server", () => {
  let client: Client;

  beforeAll(async () => {
    const server = createServer(); // Factory function that creates and configures the server
    const client = new Client({ name: "test-client", version: "1.0.0" });

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([
      client.connect(clientTransport),
      server.connect(serverTransport),
    ]);
  });

  it("lists available tools", async () => {
    const { tools } = await client.listTools();
    expect(tools).toContainEqual(
      expect.objectContaining({ name: "search_documents" })
    );
  });

  it("calls a tool and returns results", async () => {
    const result = await client.callTool({
      name: "search_documents",
      arguments: { query: "test", limit: 5 },
    });

    expect(result.isError).toBeFalsy();
    expect(result.content).toHaveLength(1);

    const text = (result.content[0] as { type: "text"; text: string }).text;
    const parsed = JSON.parse(text);
    expect(parsed).toHaveProperty("results");
  });
});
```

### Server factory pattern

To make testing easy, export a factory function from your server module:

```typescript
// src/server.ts
export function createServer(config?: ServerConfig): McpServer {
  const server = new McpServer({ name: "my-server", version: "0.1.0" });
  registerTools(server, config);
  registerResources(server, config);
  return server;
}

// src/index.ts
#!/usr/bin/env node
import { createServer } from "./server.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = createServer();
const transport = new StdioServerTransport();
await server.connect(transport);
```

This separates server creation from transport wiring, making tests clean.

---

## What to Test

### Always test

- **Tool discovery:** `listTools()` returns expected tools with correct names and descriptions
- **Tool execution:** `callTool()` with valid input returns expected output
- **Input validation:** invalid/missing parameters are handled gracefully
- **Error cases:** `isError: true` returned for expected failure modes
- **Resource listing:** `listResources()` returns expected resources
- **Resource reading:** `readResource()` returns correct content
- **Prompt listing and retrieval:** if your server defines prompts

### Test error paths explicitly

```typescript
it("returns isError for non-existent item", async () => {
  const result = await client.callTool({
    name: "get_item",
    arguments: { id: "nonexistent" },
  });

  expect(result.isError).toBe(true);
  const text = (result.content[0] as { type: "text"; text: string }).text;
  expect(text).toContain("not found");
});
```

### Skip testing

- SDK internals (JSON-RPC parsing, transport mechanics)
- Zod validation behaviour (Zod works; the SDK validates for you)
- Third-party API behaviour (mock at the boundary)

---

## Mocking External Services

Mock at the service boundary, not at the SDK level:

```typescript
import { vi } from "vitest";
import * as api from "../src/lib/api.js";

// Mock the external API client, not the MCP SDK
vi.spyOn(api, "fetchDocuments").mockResolvedValue([
  { id: "1", title: "Test Doc", content: "Hello" },
]);
```

For servers that wrap databases, consider using a test database (per the TypeScript stack testing guidelines) rather than mocking.

---

## MCP Inspector for Manual Testing

Use the Inspector during development for interactive exploration:

```bash
# Point Inspector at your built server
npx @modelcontextprotocol/inspector node dist/index.js

# Or with arguments
npx @modelcontextprotocol/inspector node dist/index.js -- --allowed-dir /tmp

# Opens UI at http://localhost:6274
```

The Inspector lets you:
- Browse available tools, resources, and prompts
- Call tools interactively with custom arguments
- View raw JSON-RPC messages
- Export config entries for Claude Desktop/Code

**Use Inspector first** to understand normal behaviour, then write automated tests informed by what you learned.

---

## CI Pipeline

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run build
      - run: npm test
```

Keep it simple. MCP servers are typically small enough that a single test job suffices.
