# Coding Standards -- .NET / C#

## Naming

```csharp
// Namespaces: PascalCase, matching folder structure
namespace MyApp.Features.Orders;

// Classes, records, structs, interfaces: PascalCase
public class OrderService { }
public record CreateOrderCommand(string ProductId, int Quantity);
public interface IOrderRepository { }

// Interfaces: prefix with I
public interface IEmailSender { }

// Methods and properties: PascalCase
public decimal CalculateTotal() { ... }
public string CustomerName { get; set; }

// Local variables and parameters: camelCase
var currentBalance = 500.0m;
void ProcessOrder(string orderId) { ... }

// Private fields: _camelCase with underscore prefix
private readonly IOrderRepository _orderRepository;

// Constants: PascalCase (not UPPER_SNAKE)
private const int MaxRetries = 3;
private const int DefaultTimeoutMs = 5000;

// Enums: PascalCase, singular name, PascalCase members
public enum OrderStatus { Draft, Submitted, Shipped, Delivered }

// File names: PascalCase, matching the primary type
// OrderService.cs, CreateOrderCommand.cs, IOrderRepository.cs
```

---

## Types and Records

**Use records for immutable data. Use classes for mutable state and services.**

```csharp
// Data transfer -- use record
public record OrderDto(int Id, string Product, decimal Price);

// Command/query -- use record
public record CreateOrderCommand(string ProductId, int Quantity) : IRequest<OrderResult>;

// Service with dependencies and behaviour -- use class
public class OrderService
{
    private readonly IOrderRepository _repository;

    public OrderService(IOrderRepository repository)
    {
        _repository = repository;
    }
}
```

**Use primary constructors for simple DI injection (C# 12+).**

```csharp
// Good -- concise
public class OrderService(IOrderRepository repository, ILogger<OrderService> logger)
{
    public async Task<Order> GetAsync(int id)
    {
        logger.LogInformation("Fetching order {OrderId}", id);
        return await repository.GetByIdAsync(id);
    }
}

// Also fine for complex classes where you need private readonly fields explicitly
```

**Prefer collection expressions (C# 12+).**

```csharp
// Good
int[] numbers = [1, 2, 3];
List<string> names = ["Alice", "Bob"];
Dictionary<string, int> scores = new() { ["Alice"] = 10 };

// Avoid
var numbers = new int[] { 1, 2, 3 };
var names = new List<string> { "Alice", "Bob" };
```

**Use pattern matching for type checks and complex conditionals.**

```csharp
// Good
return order.Status switch
{
    OrderStatus.Draft => "Not yet submitted",
    OrderStatus.Submitted => "Processing",
    OrderStatus.Shipped => $"Shipped on {order.ShippedDate}",
    OrderStatus.Delivered => "Complete",
    _ => throw new InvalidOperationException($"Unknown status: {order.Status}")
};

// Good -- pattern matching with guards
if (result is { IsSuccess: true, Value: var value })
{
    return Ok(value);
}
```

---

## Nullable Reference Types

**Enabled in every project. No exceptions.**

```csharp
// Good -- explicit about nullability
public async Task<Order?> FindByIdAsync(int id);
public async Task<Order> GetByIdAsync(int id); // throws if not found

// Bad -- suppression operator hides bugs
var order = await FindByIdAsync(id);
var name = order!.CustomerName; // crashes if null

// Good -- null check
var order = await FindByIdAsync(id);
if (order is null)
{
    return NotFound();
}
```

---

## Error Handling

**No empty catch blocks.**

```csharp
// Bad
try { await SendEmail(); } catch { }

// Good
try
{
    await SendEmail();
}
catch (SmtpException ex)
{
    logger.LogError(ex, "Failed to send email to {Recipient}", recipient);
    throw;
}
```

**Use Result types for expected failures.**

```csharp
// Good -- caller handles the outcome explicitly
public record Result<T>(bool IsSuccess, T? Value, string? Error);

public async Task<Result<Order>> CreateOrderAsync(CreateOrderCommand command)
{
    var product = await _productRepository.FindAsync(command.ProductId);
    if (product is null)
        return new Result<Order>(false, default, $"Product {command.ProductId} not found");

    var order = new Order(product, command.Quantity);
    await _orderRepository.AddAsync(order);
    return new Result<Order>(true, order, null);
}
```

**Catch specific exceptions. Never catch `Exception` unless you're at the top-level boundary.**

---

## Async Patterns

**All I/O is async. No `.Result` or `.Wait()` on tasks.**

```csharp
// Bad -- deadlocks in ASP.NET
var order = _repository.GetByIdAsync(id).Result;

// Good
var order = await _repository.GetByIdAsync(id);
```

**Use `CancellationToken` on all async public methods.**

```csharp
// Good
public async Task<Order> GetOrderAsync(int id, CancellationToken ct = default)
{
    return await _dbContext.Orders.FirstOrDefaultAsync(o => o.Id == id, ct)
        ?? throw new NotFoundException($"Order {id} not found");
}
```

**Use `Task.WhenAll` for independent concurrent operations.**

```csharp
// Good -- parallel
var (orders, customers) = (
    await _orderRepo.GetAllAsync(ct),
    await _customerRepo.GetAllAsync(ct)
);

// Better for truly independent work
var ordersTask = _orderRepo.GetAllAsync(ct);
var customersTask = _customerRepo.GetAllAsync(ct);
await Task.WhenAll(ordersTask, customersTask);
```

---

## Dependency Injection

**Register services in extension methods, not a giant `Program.cs`.**

```csharp
// In ServiceCollectionExtensions.cs
public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddOrderFeature(this IServiceCollection services)
    {
        services.AddScoped<IOrderRepository, OrderRepository>();
        services.AddScoped<OrderService>();
        return services;
    }
}

// In Program.cs
builder.Services.AddOrderFeature();
```

**Use the right lifetime:**
- `Scoped` for database contexts and per-request services (default choice)
- `Singleton` for stateless services, caches, and configuration
- `Transient` for lightweight, stateless utilities (rarely needed)

**Never inject `IServiceProvider` directly.** That's the service locator anti-pattern.

---

## Configuration

**Use the Options pattern. No magic strings.**

```csharp
// appsettings.json
// { "Email": { "SmtpHost": "smtp.example.com", "Port": 587 } }

public class EmailOptions
{
    public const string SectionName = "Email";
    public required string SmtpHost { get; init; }
    public required int Port { get; init; }
}

// Registration
builder.Services.AddOptions<EmailOptions>()
    .BindConfiguration(EmailOptions.SectionName)
    .ValidateDataAnnotations()
    .ValidateOnStart();

// Usage -- inject IOptions<EmailOptions>, not IConfiguration
public class EmailSender(IOptions<EmailOptions> options)
{
    private readonly EmailOptions _options = options.Value;
}
```

---

## Logging

**Use Serilog with structured logging. No string interpolation in log messages.**

```csharp
// Bad -- loses structured data
_logger.LogInformation($"Processing order {orderId} for {customer}");

// Good -- structured, searchable, indexed
_logger.LogInformation("Processing order {OrderId} for {Customer}", orderId, customer);
```

**Log at the right level:**
- `Debug` -- detailed diagnostic info, off in production
- `Information` -- significant application events (startup, request processed)
- `Warning` -- unexpected but recoverable situations
- `Error` -- failures that need attention
- `Fatal` -- application cannot continue

---

## Minimal API Endpoints

**Group endpoints with `MapGroup` and extension methods.**

```csharp
// In OrderEndpoints.cs
public static class OrderEndpoints
{
    public static RouteGroupBuilder MapOrderEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/orders")
            .WithTags("Orders")
            .RequireAuthorization();

        group.MapGet("/", GetAllOrders);
        group.MapGet("/{id:int}", GetOrderById);
        group.MapPost("/", CreateOrder);

        return group;
    }

    private static async Task<IResult> GetOrderById(
        int id,
        ISender mediator,
        CancellationToken ct)
    {
        var order = await mediator.Send(new GetOrderQuery(id), ct);
        return order is not null ? Results.Ok(order) : Results.NotFound();
    }
}

// In Program.cs
app.MapOrderEndpoints();
```

---

## Code Style

**Early returns over nested conditionals.**

```csharp
// Good
public async Task<Order> GetOrderAsync(int id)
{
    var order = await _repository.FindAsync(id);
    if (order is null)
        throw new NotFoundException($"Order {id} not found");
    return order;
}

// Bad
public async Task<Order> GetOrderAsync(int id)
{
    var order = await _repository.FindAsync(id);
    if (order is not null)
    {
        return order;
    }
    else
    {
        throw new NotFoundException($"Order {id} not found");
    }
}
```

**Keep methods short.** If a method exceeds ~40 lines, extract helpers.
If it has more than 4 parameters, use a record or class.

**Use `global using` directives for common namespaces.**

```csharp
// In GlobalUsings.cs
global using Microsoft.EntityFrameworkCore;
global using MediatR;
global using FluentValidation;
global using Serilog;
```

**Use file-scoped namespaces.**

```csharp
// Good
namespace MyApp.Features.Orders;

public class OrderService { }

// Bad -- unnecessary nesting
namespace MyApp.Features.Orders
{
    public class OrderService { }
}
```
