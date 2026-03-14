# Common Pitfalls — MCP Server

Read this when debugging unexpected behaviour or reviewing MCP server code. Starts lean and grows from experience.

---

## Pitfall 1: console.log Corrupts stdio Transport

**What it looks like:**
Server connects but immediately crashes or returns garbled responses.

**Why it breaks:**
MCP uses stdout for JSON-RPC messages over stdio transport. `console.log()` writes to stdout, corrupting the message stream. This is the single most common MCP server bug.

**Fix:**
Use `console.error()` for all logging (writes to stderr):
```typescript
// BAD
console.log("Starting server...");

// GOOD
console.error("Starting server...");
```

---

## Pitfall 2: Too Many Tools

**What it looks like:**
The model calls the wrong tool, ignores tools, or produces confused output. Token usage is high.

**Why it breaks:**
Each tool's schema and description consume tokens in the model's context window. Studies show accuracy drops from 89% to 31% as tool count grows from 8 to 50. The model struggles to select the right tool from a large set.

**Fix:**
- Start with 3–5 tools. Add more only when proven necessary.
- Combine related operations into workflow tools.
- Use `defer_loading: true` for large tool sets so tools are loaded on demand.
- Remove tools the model consistently misuses.

---

## Pitfall 3: Vague Tool Descriptions

**What it looks like:**
The model doesn't call your tool when it should, or calls it with wrong arguments.

**Why it breaks:**
The model's only information about a tool is its name, description, and parameter descriptions. Vague descriptions like "Query data" give the model nothing to work with.

**Fix:**
Write descriptions that answer: what does it do, what does it return, when should the model use it.

```typescript
// BAD
description: "Get data"

// GOOD
description: "Search the document library by keyword. Returns title, snippet, and URL for each match. Use when the user asks about finding documents or information in the knowledge base."
```

---

## Pitfall 4: Binding to 0.0.0.0

**What it looks like:**
Your HTTP server is accessible from other machines on the network, or from the internet.

**Why it breaks:**
Hundreds of MCP servers have been found binding to all interfaces by default. Combined with DNS rebinding attacks, this exposes local servers to remote exploitation.

**Fix:**
Always bind to `127.0.0.1`:
```typescript
httpServer.listen(3000, "127.0.0.1");
```

---

## Pitfall 5: Using SSE Transport

**What it looks like:**
You copy an example that uses `SSEServerTransport`.

**Why it breaks:**
SSE transport was deprecated in the June 2025 spec revision. It will be removed in a future version. New clients may not support it.

**Fix:**
Use `StreamableHTTPServerTransport` for HTTP-based servers:
```typescript
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
```

---

## Pitfall 6: Throwing Errors from Tool Handlers

**What it looks like:**
Tool encounters an expected error (item not found, rate limit) and throws an exception.

**Why it breaks:**
Thrown errors become protocol-level JSON-RPC errors. The model can't see or reason about them — the conversation just breaks. Only unexpected/unrecoverable errors should throw.

**Fix:**
Return `isError: true` for expected failures:
```typescript
// BAD — throws protocol error
if (!item) throw new Error("Item not found");

// GOOD — returns tool error the model can handle
if (!item) {
  return {
    isError: true,
    content: [{ type: "text", text: `Item ${id} not found. Use list_items to see available items.` }],
  };
}
```

---

## Pitfall 7: Returning Raw Data Dumps

**What it looks like:**
Tool returns the entire database table or full API response as a JSON blob.

**Why it breaks:**
Large responses bloat the model's context window, waste tokens, and degrade performance. A 50KB JSON response uses tokens that could go to better reasoning.

**Fix:**
- Paginate list results (20-50 items per page with cursor)
- Return only the fields the model needs
- Summarise where appropriate
- Use resources for bulk data access, not tools

---

## Pitfall 8: Mirroring REST APIs 1:1

**What it looks like:**
```typescript
server.registerTool("get_users", ...);
server.registerTool("get_user_by_id", ...);
server.registerTool("create_user", ...);
server.registerTool("update_user", ...);
server.registerTool("delete_user", ...);
server.registerTool("get_user_orders", ...);
server.registerTool("get_order_by_id", ...);
// ... 30 more tools
```

**Why it breaks:**
You're forcing the LLM to orchestrate API sequences that should happen in your code. Each extra tool degrades accuracy (see Pitfall 2).

**Fix:**
Design workflow-based tools around what the agent wants to achieve:
```typescript
server.registerTool("lookup_customer", ...);     // Gets user + recent orders + status
server.registerTool("process_return", ...);       // Handles the full return workflow
server.registerTool("update_subscription", ...);  // Handles plan changes + billing
```

---

## Pitfall 9: Missing Shebang in Entry Point

**What it looks like:**
`npx my-mcp-server` fails with a permission error or "cannot execute binary file".

**Why it breaks:**
The `bin` entry in package.json needs the built file to be executable and have a shebang.

**Fix:**
Add shebang to `src/index.ts`:
```typescript
#!/usr/bin/env node
```

And `chmod` in the build script:
```json
"build": "tsc && chmod 755 dist/index.js"
```

---

## Pitfall 10: Forgetting .js Extensions in Imports

**What it looks like:**
Build succeeds but runtime crashes with `ERR_MODULE_NOT_FOUND`.

**Why it breaks:**
Same as the TypeScript stack pitfall — ESM requires `.js` extensions. Especially common with MCP SDK imports.

**Fix:**
```typescript
// BAD
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";

// GOOD
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
```

---

## Checklist Before Publishing

- [ ] No `console.log()` calls in server code (use `console.error()`)
- [ ] Shebang `#!/usr/bin/env node` at top of entry point
- [ ] `chmod 755` in build script
- [ ] All imports have `.js` extensions
- [ ] Tool descriptions are specific and actionable
- [ ] Tool count is minimal (< 10 for most servers)
- [ ] Error cases return `isError: true`, not thrown exceptions
- [ ] No secrets in tool parameters, logs, or hardcoded
- [ ] HTTP servers bind to `127.0.0.1`
- [ ] `npx @modelcontextprotocol/inspector node dist/index.js` works
