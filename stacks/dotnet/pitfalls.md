# Common Pitfalls -- .NET / C#

This file documents mistakes that appear repeatedly in .NET projects.
Read this when debugging unexpected behaviour or reviewing code.

It starts lean and grows from experience. When you hit a gotcha, add it here.

---

## Pitfall 1: Blocking on Async Code

**What it looks like:**
```csharp
var result = GetOrderAsync(id).Result;
// or
var result = GetOrderAsync(id).GetAwaiter().GetResult();
```

**Why it breaks:**
Calling `.Result` or `.Wait()` on a `Task` blocks the current thread.
In ASP.NET Core, this can cause thread pool starvation under load.
In older ASP.NET (not Core), it caused deadlocks due to the synchronisation context.
Even in Core, it's a performance anti-pattern.

**Fix:**
Use `await` all the way up:
```csharp
var result = await GetOrderAsync(id);
```

---

## Pitfall 2: Captive Dependency (Scoped Inside Singleton)

**What it looks like:**
```csharp
builder.Services.AddSingleton<CacheService>();    // singleton
builder.Services.AddScoped<AppDbContext>();        // scoped

public class CacheService(AppDbContext db) { }    // db is captured as singleton
```

**Why it breaks:**
The `AppDbContext` is created once and never disposed. It holds stale data,
leaks connections, and eventually throws `ObjectDisposedException`.

**Fix:**
Either make `CacheService` scoped, or inject `IServiceScopeFactory` and create
scopes manually:
```csharp
public class CacheService(IServiceScopeFactory scopeFactory)
{
    public async Task RefreshAsync()
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        // use db within this scope
    }
}
```

---

## Pitfall 3: Not Disposing DbContext (in Tests)

**What it looks like:**
```csharp
[Fact]
public async Task GetOrder_ReturnsOrder()
{
    var db = new AppDbContext(options);
    db.Orders.Add(new Order { ... });
    await db.SaveChangesAsync();
    // test never disposes db
}
```

**Why it breaks:**
Each `DbContext` holds a database connection. In tests that run hundreds of times,
this exhausts the connection pool and causes test hangs or timeouts.

**Fix:**
Use `IAsyncLifetime` or `using`:
```csharp
await using var db = new AppDbContext(options);
```

---

## Pitfall 4: Logging with String Interpolation

**What it looks like:**
```csharp
_logger.LogInformation($"Processing order {orderId}");
```

**Why it breaks:**
The string is allocated on every call, even if the log level is disabled.
Structured logging properties are lost -- log aggregators can't index `orderId`.

**Fix:**
Use message templates:
```csharp
_logger.LogInformation("Processing order {OrderId}", orderId);
```

---

## Pitfall 5: Missing CancellationToken Propagation

**What it looks like:**
```csharp
public async Task<Order> Handle(GetOrderQuery query, CancellationToken ct)
{
    return await _db.Orders.FirstOrDefaultAsync(o => o.Id == query.Id);
    // CancellationToken not passed to EF Core
}
```

**Why it breaks:**
When a client disconnects, the request should be cancelled. Without passing
`CancellationToken`, the database query runs to completion, wasting resources.

**Fix:**
Pass `ct` to every async call in the chain:
```csharp
return await _db.Orders.FirstOrDefaultAsync(o => o.Id == query.Id, ct);
```

---

## Pitfall 6: EF Core Tracking Queries When You Only Read

**What it looks like:**
```csharp
var orders = await _db.Orders.Where(o => o.CustomerId == id).ToListAsync(ct);
// Returns tracked entities even though you only display them
```

**Why it breaks:**
Tracked entities consume memory and slow down `SaveChangesAsync()` change detection.
For read-only queries (especially list/search endpoints), tracking is pure overhead.

**Fix:**
Use `.AsNoTracking()` for read-only queries:
```csharp
var orders = await _db.Orders
    .AsNoTracking()
    .Where(o => o.CustomerId == id)
    .ToListAsync(ct);
```

---

## Pitfall 7: Forgetting to Validate MediatR Requests

**What it looks like:**
```csharp
// Handler trusts the input blindly
public async Task<OrderDto> Handle(CreateOrderCommand cmd, CancellationToken ct)
{
    var order = new Order(cmd.ProductId, cmd.Quantity); // Quantity could be -1
    // ...
}
```

**Why it breaks:**
Without validation, invalid data reaches the domain layer or database.
You get cryptic database errors instead of clear validation messages.

**Fix:**
Register a MediatR pipeline behaviour that runs FluentValidation automatically:

```csharp
public class ValidationBehaviour<TRequest, TResponse>(
    IEnumerable<IValidator<TRequest>> validators)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken ct)
    {
        if (!validators.Any()) return await next();

        var context = new ValidationContext<TRequest>(request);
        var failures = (await Task.WhenAll(
                validators.Select(v => v.ValidateAsync(context, ct))))
            .SelectMany(r => r.Errors)
            .Where(f => f is not null)
            .ToList();

        if (failures.Count > 0)
            throw new ValidationException(failures);

        return await next();
    }
}
```

---

## Pitfall 8: N+1 Queries in EF Core

**What it looks like:**
```csharp
var orders = await _db.Orders.ToListAsync(ct);
foreach (var order in orders)
{
    Console.WriteLine(order.Customer.Name); // lazy load per iteration
}
```

**Why it breaks:**
Each `order.Customer` access triggers a separate SQL query. For 100 orders,
that's 101 queries instead of 1.

**Fix:**
Eager-load with `.Include()`:
```csharp
var orders = await _db.Orders
    .Include(o => o.Customer)
    .ToListAsync(ct);
```

Or project to a DTO with `.Select()`:
```csharp
var orders = await _db.Orders
    .Select(o => new OrderDto(o.Id, o.Customer.Name, o.Total))
    .ToListAsync(ct);
```

---

## Pitfall 9: Using `DateTime.Now` Instead of `DateTime.UtcNow`

**What it looks like:**
```csharp
order.CreatedAt = DateTime.Now;
```

**Why it breaks:**
`DateTime.Now` uses the server's local timezone. When deployed across regions
or in Docker containers with different timezone configs, timestamps become inconsistent
and comparisons break.

**Fix:**
Always use UTC. Better yet, inject `TimeProvider` for testability:
```csharp
public class OrderService(TimeProvider timeProvider)
{
    public Order Create()
    {
        return new Order { CreatedAt = timeProvider.GetUtcNow() };
    }
}
```

---

## Pitfall 10: Returning Entity Objects from API Endpoints

**What it looks like:**
```csharp
app.MapGet("/api/orders/{id}", async (int id, AppDbContext db) =>
    await db.Orders.FindAsync(id));
```

**Why it breaks:**
Serialising EF Core entities can expose navigation properties, cause circular references,
and leak internal database structure. It also couples your API contract to your data model.

**Fix:**
Map to a DTO:
```csharp
app.MapGet("/api/orders/{id}", async (int id, AppDbContext db) =>
{
    var order = await db.Orders.FindAsync(id);
    return order is not null
        ? Results.Ok(new OrderDto(order.Id, order.ProductId, order.Total))
        : Results.NotFound();
});
```

---

## Checklist Before Committing Code

- [ ] Does `dotnet build` succeed with zero warnings (TreatWarningsAsErrors)?
- [ ] Are all async calls properly awaited with `CancellationToken` passed through?
- [ ] Are nullable reference types handled (no `!` without justification)?
- [ ] Are read-only queries using `.AsNoTracking()`?
- [ ] Do all MediatR commands/queries have FluentValidation validators?
- [ ] Are DTOs used for API responses (not EF entities)?
- [ ] Are all dependencies registered with the correct lifetime (scoped/singleton)?
- [ ] Are log messages using structured templates (not string interpolation)?
- [ ] Do all tests pass (`dotnet test`)?
- [ ] Are `DateTime.UtcNow` or `TimeProvider` used instead of `DateTime.Now`?
