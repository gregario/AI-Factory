# .NET Stack Profile

This stack profile defines how ALL .NET projects in the AI-Factory must be built.
It targets .NET 8+ with C# 12+, using ASP.NET Core Minimal APIs, Entity Framework Core,
and the MediatR/CQRS pattern. Before implementing any code in a .NET project, Claude must
read this stack profile in full. This is not optional.

---

## Files in This Profile

| File | Read When |
|------|-----------|
| `coding_standards.md` | Writing any C# code |
| `testing.md` | Writing tests or setting up test infrastructure |
| `project_structure.md` | Creating a new project or adding files |
| `pitfalls.md` | Debugging unexpected behaviour or reviewing code |

---

## Core Principles

These principles apply to every .NET project in this factory, without exception.

**Nullable reference types always enabled.**
`<Nullable>enable</Nullable>` in every `.csproj`. No suppression operators (`!`) unless
justified with a comment. If you're reaching for `!`, you probably need a null check or
a better design.

**Minimal APIs by default.**
Use `app.MapGet`, `app.MapPost`, etc. Controllers are only acceptable when the endpoint
group is genuinely complex (versioning, heavy filters, deep attribute routing). If you're
debating which to use, it's Minimal APIs.

**Dependency injection everywhere.**
Use the built-in DI container. No service locator pattern, no `new`-ing up services.
Register dependencies in `Program.cs` or extension methods. If a class needs something,
it takes it through the constructor.

**Errors are explicit, not exceptional.**
Use Result types or typed responses for expected failures (validation, not found, conflict).
Reserve exceptions for truly unexpected situations (network failures, corrupted state).
No empty catch blocks. No swallowed exceptions.

**Configuration through the Options pattern.**
Bind configuration sections to strongly-typed classes with `IOptions<T>`. No magic strings
for config keys scattered through the codebase. Validate options at startup with
`ValidateDataAnnotations()` or `ValidateOnStart()`.

---

## Key Technologies

| Technology | Purpose |
|-----------|---------|
| .NET 8+ (LTS) | Runtime and SDK, cross-platform |
| C# 12+ | Primary language (primary constructors, collection expressions, pattern matching) |
| ASP.NET Core Minimal APIs | HTTP endpoints and middleware |
| Entity Framework Core | ORM, code-first migrations, LINQ queries |
| MediatR | CQRS pattern (commands, queries, handlers, pipeline behaviours) |
| FluentValidation | Request and model validation |
| Serilog | Structured logging (console + seq/file sinks) |
| Docker | Containerised deployment |
| Azure / AWS | Cloud hosting (project-level choice) |

---

## When to Use This Stack

Use this stack for:

- Web APIs and backend services that benefit from strong typing and high performance
- Projects that need a mature ORM with migrations (Entity Framework Core)
- CQRS-oriented architectures where commands and queries are clearly separated
- Services that will be deployed as Docker containers to Azure or AWS
- Teams or projects already invested in the .NET ecosystem

Do not use this stack for:
- Quick scripts or CLI tools where a lighter runtime (Node.js, Python) would be faster to ship
- Frontend-only projects
- Projects where the team has no .NET experience and delivery timeline is tight
