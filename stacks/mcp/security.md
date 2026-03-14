# Security — MCP Server

MCP servers often have access to sensitive systems (databases, APIs, file systems). Security mistakes in MCP servers are amplified because the LLM is the client — it can be manipulated through prompt injection to misuse tools.

---

## Network Binding

**Never bind to `0.0.0.0`.**

Hundreds of MCP servers have been found binding to all network interfaces by default, exposing them to the local network or internet.

```typescript
// BAD — exposed to the network
httpServer.listen(3000, "0.0.0.0");
httpServer.listen(3000); // Some frameworks default to 0.0.0.0

// GOOD — localhost only
httpServer.listen(3000, "127.0.0.1");
```

For production Streamable HTTP servers behind a reverse proxy, bind to `127.0.0.1` and let the proxy handle external traffic.

---

## DNS Rebinding Protection

Streamable HTTP servers must validate the `Origin` header on all requests to prevent DNS rebinding attacks:

```typescript
const ALLOWED_ORIGINS = new Set(["http://localhost:3000", "https://your-app.example.com"]);

function validateOrigin(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (!origin) return true; // No origin = not a browser request
  return ALLOWED_ORIGINS.has(origin);
}
```

---

## Credential Management

### Never accept secrets as tool parameters

```typescript
// BAD — LLM may log, expose, or hallucinate credentials
server.registerTool("query_db", {
  inputSchema: {
    query: z.string(),
    password: z.string(), // NEVER DO THIS
  },
}, handler);

// GOOD — credentials from environment
const dbPassword = process.env.DB_PASSWORD;
```

### Never log secrets

```typescript
// BAD
console.error(`Connecting with key: ${apiKey}`);
console.error(`Request: ${JSON.stringify(req)}`); // May contain auth headers

// GOOD
console.error("Connecting to API...");
console.error(`Request to ${req.url} (${req.method})`);
```

### Use environment variables or CLI arguments for configuration

```typescript
const config = {
  apiKey: process.env.API_KEY ?? (() => { throw new Error("API_KEY required"); })(),
  baseUrl: process.env.BASE_URL ?? "https://api.example.com",
  allowedDirs: process.argv.slice(2), // CLI args for paths
};
```

---

## Authentication for Remote Servers

### OAuth 2.1 (recommended for production)

MCP servers acting as remote services should implement OAuth 2.1. As of the 2025-11-25 spec, MCP servers are officially OAuth Resource Servers.

Key requirements:
- Use PKCE for all authorization code flows
- Generate cryptographically secure state values
- Scope tokens to minimum necessary permissions
- Store state server-side only after consent is approved
- Regularly rotate credentials

### Bearer token (simpler alternative)

For internal/trusted environments where OAuth is overkill:

```typescript
function authenticateRequest(req: IncomingMessage): boolean {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return false;
  const token = auth.slice(7);
  return token === process.env.AUTH_TOKEN;
}
```

---

## Input Validation

The SDK validates tool inputs against Zod schemas automatically. But validate at the application level too:

### Path traversal

```typescript
import { resolve, relative } from "node:path";

function validatePath(requestedPath: string, allowedDir: string): string {
  const resolved = resolve(allowedDir, requestedPath);
  const rel = relative(allowedDir, resolved);
  if (rel.startsWith("..") || resolve(resolved) !== resolved) {
    throw new Error(`Path ${requestedPath} is outside allowed directory`);
  }
  return resolved;
}
```

### SQL injection

Use parameterised queries, never string interpolation:

```typescript
// BAD
const result = await db.query(`SELECT * FROM users WHERE id = '${id}'`);

// GOOD
const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
```

### Command injection

Never pass user input to shell commands:

```typescript
// BAD
const result = execSync(`ls ${userPath}`);

// GOOD
const result = readdirSync(userPath);
```

---

## Principle of Least Privilege

- Request only the permissions your server needs
- Scope file system access to specific directories
- Use read-only database connections where possible
- Limit API token scopes to required operations

```typescript
// Good — scoped to specific directories
const ALLOWED_DIRS = process.argv.slice(2).map(dir => resolve(dir));

server.registerTool("read_file", {
  inputSchema: { path: z.string() },
}, async ({ path }) => {
  const resolved = resolve(path);
  if (!ALLOWED_DIRS.some(dir => resolved.startsWith(dir))) {
    return {
      isError: true,
      content: [{ type: "text", text: `Access denied. Allowed directories: ${ALLOWED_DIRS.join(", ")}` }],
    };
  }
  // ...
});
```

---

## Security Checklist

Before deploying an MCP server:

- [ ] Server binds to `127.0.0.1`, not `0.0.0.0`
- [ ] Origin header validated (for HTTP transport)
- [ ] No secrets in tool parameters
- [ ] No secrets in logs
- [ ] All database queries parameterised
- [ ] File paths validated against allowed directories
- [ ] No shell command execution with user input
- [ ] OAuth 2.1 or bearer token auth for remote servers
- [ ] Tokens scoped to minimum permissions
- [ ] Credentials sourced from env vars, not hardcoded
