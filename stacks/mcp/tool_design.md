# Tool Design — MCP Server

This is the most important file in the MCP stack. Poor tool design is the #1 cause of MCP server failure. Read this before designing any tools, resources, or prompts.

---

## The Golden Rule

**Design for the model, not the human.**

The LLM reads your tool name, description, and parameter descriptions to decide whether and how to call your tool. These are your API documentation, your UX, and your error messages all in one.

---

## Tool Design Patterns

### 1. Workflow-Based Tools (Not CRUD)

Don't mirror REST APIs 1:1. Design tools around what the agent wants to achieve.

```typescript
// BAD — forces the LLM to orchestrate multiple calls
server.registerTool("get_orders", ...);
server.registerTool("filter_by_email", ...);
server.registerTool("get_tracking_info", ...);

// GOOD — one tool that does the workflow
server.registerTool("track_latest_order", {
  description: "Find a customer's most recent order and return its tracking status",
  inputSchema: {
    email: z.string().email().describe("Customer email address"),
  },
}, async ({ email }) => {
  const orders = await getOrders(email);
  const latest = orders[0];
  const tracking = await getTracking(latest.id);
  return { content: [{ type: "text", text: formatTrackingInfo(tracking) }] };
});
```

Do the orchestration in your code, not the LLM's context window.

### 2. Less is More

Every additional tool degrades agent performance and burns tokens. Published benchmarks show reducing 50 tools to 8 improved success from 31% to 89%.

**Guidelines:**
- Start with 3–5 tools maximum for a new server
- Combine related operations into single tools with mode parameters if needed
- Remove tools that are rarely used or that the model consistently misuses
- Use deferred loading (`defer_loading: true`) for large tool sets

### 3. Descriptive Names and Descriptions

```typescript
// BAD
server.registerTool("query", {
  description: "Query data",
  inputSchema: { q: z.string() },
}, handler);

// GOOD
server.registerTool("search_documents", {
  description: "Search the document library by keyword. Returns title, snippet, and URL for each match. Use this when the user asks about finding specific documents or information in the knowledge base.",
  inputSchema: {
    query: z.string().describe("Keywords or natural language search query"),
    limit: z.number().optional().default(10).describe("Maximum number of results (1-50)"),
    category: z.enum(["all", "reports", "policies", "guides"]).optional()
      .describe("Filter by document category. Omit for all categories."),
  },
}, handler);
```

**Tool description checklist:**
- What does this tool do? (first sentence)
- What does it return? (format/shape)
- When should the model use it? (usage context)

**Parameter description checklist:**
- What is this parameter?
- What format/values does it accept?
- What happens if omitted? (for optional params)

### 4. Flexible Input, Strict Output

Accept flexible input formats and normalise internally:

```typescript
server.registerTool("get_events", {
  inputSchema: {
    date: z.string().describe("Date in any common format: '2024-01-15', 'January 15', 'yesterday', 'last week'"),
  },
}, async ({ date }) => {
  const parsed = parseFlexibleDate(date); // You normalise it
  // ...
});
```

### 5. Pagination for Lists

Never return unbounded lists. Use cursor-based pagination:

```typescript
server.registerTool("list_issues", {
  inputSchema: {
    status: z.enum(["open", "closed", "all"]).optional().default("open"),
    cursor: z.string().optional().describe("Pagination cursor from a previous response"),
    limit: z.number().optional().default(20).describe("Results per page (max 100)"),
  },
}, async ({ status, cursor, limit }) => {
  const { items, nextCursor } = await fetchIssues({ status, cursor, limit });
  return {
    content: [{
      type: "text",
      text: JSON.stringify({ issues: items, nextCursor }),
    }],
  };
});
```

### 6. Structured Output (Spec 2025-11-25)

Use `outputSchema` for machine-readable structured responses:

```typescript
server.registerTool("get_user", {
  inputSchema: {
    userId: z.string().describe("User ID"),
  },
  outputSchema: {
    name: z.string(),
    email: z.string(),
    role: z.enum(["admin", "member", "viewer"]),
  },
}, async ({ userId }) => {
  const user = await fetchUser(userId);
  return {
    structuredContent: { name: user.name, email: user.email, role: user.role },
    content: [{ type: "text", text: `${user.name} (${user.role})` }],
  };
});
```

---

## Resource Design

Resources are read-only data endpoints. They provide context the model can reference.

```typescript
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

// Static resource (fixed URI)
server.registerResource("config", "config://app", { title: "App Configuration" },
  async (uri) => ({
    contents: [{ uri: uri.href, text: JSON.stringify(config), mimeType: "application/json" }],
  })
);

// Dynamic resource (URI template)
server.registerResource("user",
  new ResourceTemplate("users://{userId}", { list: true }),
  { title: "User Profile" },
  async (uri, { userId }) => ({
    contents: [{ uri: uri.href, text: JSON.stringify(await getUser(userId)) }],
  })
);
```

**When to use resources vs tools:**
- Resources = read-only data the model might need for context (like GET)
- Tools = actions with side effects or complex queries (like POST/PUT/DELETE)

---

## Prompt Design

Prompts are reusable templates for structuring LLM interactions:

```typescript
server.registerPrompt("code_review", {
  title: "Code Review",
  description: "Review code for bugs, style issues, and security concerns",
  argsSchema: {
    language: z.string().describe("Programming language"),
    code: z.string().describe("Code to review"),
  },
}, async ({ language, code }) => ({
  messages: [{
    role: "user",
    content: {
      type: "text",
      text: `Review this ${language} code for bugs, style issues, and security concerns:\n\n\`\`\`${language}\n${code}\n\`\`\``,
    },
  }],
}));
```

Keep prompts deterministic and stateless.

---

## Error Handling in Tools

Tool errors use `isError: true` in the response content — NOT protocol-level JSON-RPC errors. This lets the model see and reason about what went wrong.

```typescript
server.registerTool("delete_item", {
  inputSchema: { id: z.string() },
}, async ({ id }) => {
  try {
    await deleteItem(id);
    return { content: [{ type: "text", text: `Deleted item ${id}` }] };
  } catch (err) {
    if (err instanceof NotFoundError) {
      return {
        isError: true,
        content: [{ type: "text", text: `Item ${id} not found. Use list_items to see available items.` }],
      };
    }
    if (err instanceof RateLimitError) {
      return {
        isError: true,
        content: [{ type: "text", text: `Rate limited. Retry after ${err.retryAfter} seconds.` }],
      };
    }
    throw err; // Unexpected errors propagate as protocol errors
  }
});
```

**Make errors actionable.** Tell the model what to do next:
- "Item not found. Use list_items to see available items."
- "Rate limited. Retry after 30 seconds or reduce batch size to 50."
- "Permission denied. The current user lacks 'admin' role."

---

## Anti-Patterns

| Anti-Pattern | Why It Fails | Do Instead |
|---|---|---|
| 1:1 REST mirroring | Forces LLM to orchestrate API sequences | Design workflow-based tools |
| Vague descriptions | Model can't decide when/how to use the tool | Write specific, contextual descriptions |
| Data dumping (returning raw large payloads) | Bloats context window, wastes tokens | Paginate, summarise, return only what's needed |
| Too many tools | Degrades model accuracy with every additional tool | Start with 3-5, consolidate, use deferred loading |
| Accepting secrets as parameters | LLM may log or expose them | Use env vars or server-side context |
| Non-idempotent tools | Retries cause duplicates or corruption | Accept client request IDs, use upserts |
