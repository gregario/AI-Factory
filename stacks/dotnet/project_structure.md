# Project Structure -- .NET

## Web API Projects (Minimal APIs + MediatR)

```
MyApp/
  src/
    MyApp.Api/
      Program.cs              # Entry point, DI registration, middleware pipeline
      GlobalUsings.cs         # global using directives
      appsettings.json        # Configuration (non-secret defaults)
      appsettings.Development.json
      Endpoints/              # Minimal API endpoint groups
        OrderEndpoints.cs
        CustomerEndpoints.cs
      Features/               # Vertical slices grouped by domain feature
        Orders/
          CreateOrder.cs      # Command + Handler + Validator in one file
          GetOrderById.cs     # Query + Handler
          OrderDto.cs         # Response DTO
        Customers/
          CreateCustomer.cs
      Domain/                 # Domain entities and value objects
        Order.cs
        Customer.cs
        Money.cs
      Infrastructure/         # Database, external services, cross-cutting
        Persistence/
          AppDbContext.cs
          Configurations/     # EF Core entity configurations (IEntityTypeConfiguration)
            OrderConfiguration.cs
          Migrations/         # EF Core migrations (auto-generated)
        Services/
          EmailSender.cs
      Middleware/             # Custom middleware (error handling, logging, auth)
        ExceptionHandlingMiddleware.cs
      MyApp.Api.csproj
    MyApp.Shared/             # Shared kernel (only if multi-project solution)
      MyApp.Shared.csproj
  tests/
    MyApp.UnitTests/
      Features/               # Mirror the src Features/ structure
        Orders/
          CreateOrderHandlerTests.cs
          CreateOrderValidatorTests.cs
      MyApp.UnitTests.csproj
    MyApp.IntegrationTests/
      Endpoints/
        OrderApiTests.cs
      Fixtures/
        TestDbContextFactory.cs
        CustomWebApplicationFactory.cs
      MyApp.IntegrationTests.csproj
  docker/
    Dockerfile
    docker-compose.yml
  MyApp.sln
  .editorconfig
  Directory.Build.props       # Shared MSBuild properties (nullable, implicit usings)
```

---

## Key Conventions

**Vertical slice architecture.**
Group by feature, not by technical layer. `Features/Orders/CreateOrder.cs` contains the
command, handler, and validator for creating an order -- all in one file. This keeps related
code together and eliminates the need to jump between `Controllers/`, `Services/`,
`Repositories/`, and `Validators/` folders.

```csharp
// Features/Orders/CreateOrder.cs -- everything for this use case in one place
namespace MyApp.Features.Orders;

public record CreateOrderCommand(string ProductId, int Quantity) : IRequest<OrderDto>;

public class CreateOrderValidator : AbstractValidator<CreateOrderCommand>
{
    public CreateOrderValidator()
    {
        RuleFor(x => x.ProductId).NotEmpty();
        RuleFor(x => x.Quantity).GreaterThan(0);
    }
}

public class CreateOrderHandler(AppDbContext db) : IRequestHandler<CreateOrderCommand, OrderDto>
{
    public async Task<OrderDto> Handle(CreateOrderCommand request, CancellationToken ct)
    {
        var order = new Order(request.ProductId, request.Quantity);
        db.Orders.Add(order);
        await db.SaveChangesAsync(ct);
        return new OrderDto(order.Id, order.ProductId, order.Total);
    }
}
```

**Endpoints are thin wiring.**
Endpoint files map HTTP routes to MediatR commands/queries. No business logic in endpoints.

**Domain entities own their behaviour.**
Put business rules on the entity, not in the handler. The handler orchestrates; the entity
decides.

```csharp
// Good -- entity owns the rule
public class Order
{
    public void Ship()
    {
        if (Status != OrderStatus.Submitted)
            throw new InvalidOperationException($"Cannot ship order in {Status} status");
        Status = OrderStatus.Shipped;
        ShippedDate = DateTime.UtcNow;
    }
}

// Bad -- handler contains domain logic
public class ShipOrderHandler
{
    public async Task Handle(ShipOrderCommand cmd, CancellationToken ct)
    {
        var order = await _db.Orders.FindAsync(cmd.Id, ct);
        if (order.Status != OrderStatus.Submitted)  // domain logic leaked into handler
            throw new InvalidOperationException(...);
        order.Status = OrderStatus.Shipped;
    }
}
```

**Tests mirror source structure.**
`src/MyApp.Api/Features/Orders/CreateOrder.cs` maps to
`tests/MyApp.UnitTests/Features/Orders/CreateOrderHandlerTests.cs`.

---

## Solution-Level Files

**`Directory.Build.props`** -- shared MSBuild properties applied to all projects:

```xml
<Project>
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
  </PropertyGroup>
</Project>
```

**`.editorconfig`** -- code style enforcement. Use the default .NET analysers.
At minimum, enforce file-scoped namespaces and `var` preferences.

**`docker-compose.yml`** -- local development with database and dependencies.

---

## Program.cs Layout

Keep `Program.cs` organised in clear sections:

```csharp
var builder = WebApplication.CreateBuilder(args);

// --- Logging ---
builder.Host.UseSerilog((context, config) =>
    config.ReadFrom.Configuration(context.Configuration));

// --- Services ---
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));
builder.Services.AddMediatR(cfg =>
    cfg.RegisterServicesFromAssembly(typeof(Program).Assembly));
builder.Services.AddValidatorsFromAssembly(typeof(Program).Assembly);

// Feature-specific registrations
builder.Services.AddOrderFeature();
builder.Services.AddCustomerFeature();

var app = builder.Build();

// --- Middleware ---
app.UseSerilogRequestLogging();
app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// --- Endpoints ---
app.MapOrderEndpoints();
app.MapCustomerEndpoints();

app.Run();

// For WebApplicationFactory access
public partial class Program { }
```

---

## Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Solution file | PascalCase | `MyApp.sln` |
| Project files | PascalCase with dots | `MyApp.Api.csproj` |
| Source files | PascalCase, matching primary type | `OrderService.cs` |
| Directories | PascalCase | `Features/`, `Domain/`, `Infrastructure/` |
| Test files | `*Tests.cs` | `CreateOrderHandlerTests.cs` |
| Test projects | `*.UnitTests`, `*.IntegrationTests` | `MyApp.UnitTests.csproj` |
| Migrations | Auto-generated timestamp prefix | `20240115_AddOrderTable.cs` |
| Config files | Standard names | `appsettings.json`, `.editorconfig` |

---

## EF Core Migrations

**Code-first only. No database-first scaffolding.**

```bash
# Create a migration
dotnet ef migrations add AddOrderTable -p src/MyApp.Api

# Apply migrations
dotnet ef database update -p src/MyApp.Api

# Generate a SQL script for production
dotnet ef migrations script -p src/MyApp.Api -o migrations.sql
```

**Entity configurations live in `Infrastructure/Persistence/Configurations/`.**
Use `IEntityTypeConfiguration<T>`, not data annotations on entities. Keeps the domain
clean of persistence concerns.

```csharp
public class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.HasKey(o => o.Id);
        builder.Property(o => o.Total).HasPrecision(18, 2);
        builder.HasIndex(o => o.CustomerId);
    }
}
```

---

## Docker

**Multi-stage build for small images.**

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN dotnet publish src/MyApp.Api/MyApp.Api.csproj -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .
EXPOSE 8080
ENTRYPOINT ["dotnet", "MyApp.Api.dll"]
```

Keep the runtime image as small as possible. Use `aspnet` (not `sdk`) for the final stage.
