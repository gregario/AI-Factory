# Coding Standards — MCP Server

Extends `stacks/typescript/coding_standards.md`. This covers MCP-specific standards only.

---

## The stdout Rule

**Never use `console.log()` in stdio MCP servers.**

The MCP protocol uses stdout for JSON-RPC communication. Any stray output corrupts the message stream and crashes the connection.

```typescript
// BAD — breaks the protocol
console.log("Processing request...");
console.log(JSON.stringify(debugInfo));

// GOOD — stderr is safe
console.error("Processing request...");
console.error(JSON.stringify(debugInfo));
```

This is the single most common mistake in MCP server development.

---

## Server Creation

Always provide name and version. Version should match package.json.

```typescript
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf-8"));

const server = new McpServer({
  name: pkg.name,
  version: pkg.version,
});
```

Or hardcode if the package.json read adds unwanted complexity:

```typescript
const server = new McpServer({
  name: "my-mcp-server",
  version: "0.1.0",
});
```

---

## Tool Registration

### Use Zod schemas for input validation

The SDK uses Zod natively. Define schemas inline for simple tools, extract to `types.ts` for shared schemas.

```typescript
import { z } from "zod";

// Inline — fine for simple tools
server.registerTool("greet", {
  title: "Greet User",
  description: "Return a personalised greeting",
  inputSchema: {
    name: z.string().describe("Person's name"),
  },
}, async ({ name }) => ({
  content: [{ type: "text", text: `Hello, ${name}!` }],
}));
```

```typescript
// Extracted — for shared or complex schemas
// types.ts
export const SearchParams = {
  query: z.string().describe("Search query"),
  limit: z.number().min(1).max(100).optional().default(10).describe("Max results"),
};

// tools/search.ts
import { SearchParams } from "../types.js";
server.registerTool("search", {
  inputSchema: SearchParams,
  // ...
}, handler);
```

### Always describe parameters

Every Zod field should have `.describe()`. This is what the model reads to understand parameters.

### Return content arrays

Tool handlers return `{ content: ContentBlock[] }`. Always use the array format:

```typescript
// Text response
return {
  content: [{ type: "text", text: "Result here" }],
};

// Multiple content blocks
return {
  content: [
    { type: "text", text: "Found 3 results:" },
    { type: "text", text: JSON.stringify(results, null, 2) },
  ],
};

// Image response
return {
  content: [{ type: "image", data: base64Data, mimeType: "image/png" }],
};
```

---

## Transport Wiring

### stdio (default)

```typescript
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Streamable HTTP

```typescript
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "node:http";

const httpServer = createServer(async (req, res) => {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => crypto.randomUUID() });
  await server.connect(transport);
  await transport.handleRequest(req, res);
});

httpServer.listen(3000, "127.0.0.1"); // NEVER 0.0.0.0
```

### Dual transport support

For servers that support both, use a CLI flag:

```typescript
const transportType = process.argv.includes("--http") ? "http" : "stdio";

if (transportType === "stdio") {
  const transport = new StdioServerTransport();
  await server.connect(transport);
} else {
  // Set up HTTP server
}
```

---

## Error Handling

MCP has a three-tier error model:

### 1. Transport errors (network, broken pipe)
Handled by the SDK. You rarely need to touch these.

### 2. Protocol errors (JSON-RPC violations)
Use standard JSON-RPC error codes:
- `-32700` Parse Error
- `-32600` Invalid Request
- `-32601` Method Not Found
- `-32602` Invalid Params
- `-32603` Internal Error

### 3. Tool errors (application-level)
Return `isError: true` in the content — NOT a protocol error:

```typescript
return {
  isError: true,
  content: [{ type: "text", text: "Item not found. Use list_items to see available items." }],
};
```

**The distinction matters:** protocol errors crash the conversation. Tool errors let the model recover and try something else.

---

## Graceful Shutdown

Handle process signals for clean shutdown:

```typescript
process.on("SIGINT", async () => {
  await server.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await server.close();
  process.exit(0);
});
```

---

## Logging

Use stderr for all logging. Structure logs as JSON for production servers:

```typescript
function log(level: "info" | "warn" | "error", message: string, data?: Record<string, unknown>): void {
  console.error(JSON.stringify({ level, message, ...data, timestamp: new Date().toISOString() }));
}

log("info", "Tool called", { tool: "search", query: "test" });
```

For development, plain text is fine:
```typescript
console.error(`[search] Query: ${query}`);
```

Never log secrets, tokens, or full request/response bodies in production.
