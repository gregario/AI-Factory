# MCP Server Stack Profile

This stack profile defines how MCP (Model Context Protocol) servers are built in the AI-Factory.

**This stack layers on top of the TypeScript stack.** Read `stacks/typescript/` first — all TypeScript conventions apply unless explicitly overridden here. This file covers MCP-specific patterns only.

Before implementing any MCP server code, Claude must read this stack profile in full.

---

## Files in This Profile

| File | Read When |
|------|-----------|
| `tool_design.md` | Designing tools, resources, or prompts |
| `coding_standards.md` | Writing any MCP server code |
| `testing.md` | Writing tests or setting up test infrastructure |
| `project_structure.md` | Creating a new MCP server project or adding files |
| `security.md` | Handling auth, credentials, network binding, or user data |
| `publishing.md` | Publishing to npm, listing on registries, definition of done |
| `launch.md` | Community promotion, sentiment assessment, avoiding backlash |
| `pitfalls.md` | Debugging unexpected behaviour or reviewing code |

Also read: `stacks/typescript/STACK.md` (parent stack).

---

## What is MCP

The Model Context Protocol is an open standard for connecting AI assistants to external data and tools. It defines a JSON-RPC 2.0 based protocol with three primitives:

- **Tools** — actions the model can invoke (analogous to POST/PUT/DELETE)
- **Resources** — read-only data endpoints (analogous to GET)
- **Prompts** — reusable templates that structure LLM interactions

MCP is governed by the **Agentic AI Foundation (AAIF)**, a Linux Foundation directed fund co-founded by Anthropic, Block, and OpenAI. The specification lives at [modelcontextprotocol.io](https://modelcontextprotocol.io/).

Current spec version: **2025-11-25**.

---

## Core Principles

**Design for the model, not the human.**
Tool descriptions, parameter names, and error messages are what the LLM reads to decide what to call. Poor descriptions are the #1 cause of MCP server failure. Write descriptions as if you're explaining the tool to a colleague who can't see the code.

**Fewer tools, better tools.**
Every additional tool degrades agent performance and burns tokens. Reducing from 50 tools to 8 focused tools improved success rates from 31% to 89% in published benchmarks. Consolidate related operations. Design around workflows, not CRUD.

**stdio for local, Streamable HTTP for remote.**
Use stdio transport for local integrations (Claude Desktop, Claude Code, CLI tools). Use Streamable HTTP for production cloud deployments. SSE transport is deprecated — never use it for new servers.

**Errors should teach, not just fail.**
Return actionable error messages the model can reason about. "Rate limited, retry after 30 seconds" is useful. A raw 429 code is not. Tool errors use `isError: true` in the content, not protocol-level JSON-RPC errors.

**Security is not optional.**
Never bind to 0.0.0.0. Never log secrets. Never trust client-supplied credentials without validation. Even "local" servers need real security controls.

---

## SDK

The official TypeScript SDK is `@modelcontextprotocol/sdk` (npm). Peer dependency: `zod` (v3.25+).

Key imports:
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
```

Key classes:
- `McpServer` — high-level server. Constructor takes `{ name, version }`.
- `server.registerTool(name, config, handler)` — register a tool with Zod input schema.
- `server.registerResource(name, template, metadata, handler)` — register a resource.
- `server.registerPrompt(name, config, handler)` — register a prompt.

---

## References

- [MCP Specification](https://modelcontextprotocol.io/specification/2025-11-25)
- [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [SDK API Docs](https://ts.sdk.modelcontextprotocol.io/)
- [Official Reference Servers](https://github.com/modelcontextprotocol/servers)
- [MCP Inspector](https://github.com/modelcontextprotocol/inspector)
- [Agentic AI Foundation](https://aaif.io/)
