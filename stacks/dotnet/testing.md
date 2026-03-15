# Testing -- .NET / C#

## Framework Choice

Every .NET project in this factory uses the same test stack:

| Tool | Purpose |
|------|---------|
| xUnit | Test framework and runner |
| FluentAssertions | Readable assertion syntax |
| NSubstitute | Mocking (only at system boundaries) |
| WebApplicationFactory | Integration testing for ASP.NET Core APIs |
| Testcontainers | Database integration tests with real databases in Docker |
| Bogus | Test data generation (optional, for complex domains) |

Do not mix test frameworks. If the project uses xUnit, everything uses xUnit.

---

## When to Use Which Test Type

### Unit Tests

**Use when:**
- Pure business logic, calculations, domain rules
- MediatR handlers with injected dependencies
- Validators (FluentValidation rules)
- Mapping and transformation logic
- Pattern matching and branching logic

**Trade-offs:**
- Fast, no infrastructure needed
- Lower confidence about integration boundaries
- Can give false confidence if you mock too much

### Integration Tests

**Use when:**
- Testing EF Core queries and migrations
- Verifying Minimal API endpoint wiring (routing, serialisation, status codes)
- Testing the MediatR pipeline (validator + handler + persistence)
- Database round-trips (save, load, query)

**Trade-offs:**
- Slower (database, HTTP server spin-up)
- Higher confidence that the system actually works
- Use `WebApplicationFactory` to test the full HTTP pipeline

### End-to-End Tests

**Use when:**
- Multi-step API workflows (create, update, verify)
- Cross-service integration (if applicable)
- Validating that Docker compose setups work

---

## Test File Structure

**Arrange-Act-Assert pattern, always.**

```csharp
public class OrderServiceTests
{
    private readonly IOrderRepository _repository;
    private readonly OrderService _sut;

    public OrderServiceTests()
    {
        _repository = Substitute.For<IOrderRepository>();
        _sut = new OrderService(_repository);
    }

    [Fact]
    public async Task CreateOrder_WithValidProduct_ReturnsOrder()
    {
        // Arrange
        var product = new Product("P1", "Widget", 9.99m);
        _repository.FindProductAsync("P1").Returns(product);

        // Act
        var result = await _sut.CreateOrderAsync(new CreateOrderCommand("P1", 5));

        // Assert
        result.Should().NotBeNull();
        result.Total.Should().Be(49.95m);
        result.Quantity.Should().Be(5);
    }

    [Fact]
    public async Task CreateOrder_WithUnknownProduct_ReturnsNotFound()
    {
        // Arrange
        _repository.FindProductAsync("NOPE").Returns((Product?)null);

        // Act
        var result = await _sut.CreateOrderAsync(new CreateOrderCommand("NOPE", 1));

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error.Should().Contain("NOPE");
    }
}
```

**Test isolation matters.** Each test is independent. xUnit creates a new class instance
per test, so constructor setup runs fresh every time. Use `IAsyncLifetime` for async
setup/teardown.

```csharp
public class DatabaseTests : IAsyncLifetime
{
    private AppDbContext _dbContext = null!;

    public async Task InitializeAsync()
    {
        _dbContext = await TestDbContextFactory.CreateAsync();
    }

    public async Task DisposeAsync()
    {
        await _dbContext.DisposeAsync();
    }
}
```

**Name tests descriptively.** The test name should read as a sentence.

```csharp
// Good
[Fact] public async Task CreateOrder_WithZeroQuantity_ThrowsValidationException() { }
[Fact] public async Task GetOrder_WhenNotFound_ReturnsNull() { }
[Fact] public async Task CalculateDiscount_ForPremiumCustomer_Applies20Percent() { }

// Bad
[Fact] public async Task Test1() { }
[Fact] public async Task ShouldWork() { }
[Fact] public async Task HandlesError() { }
```

---

## Integration Tests with WebApplicationFactory

**Test Minimal API endpoints end-to-end.**

```csharp
public class OrderApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public OrderApiTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                // Replace the real database with an in-memory one
                services.RemoveAll<DbContextOptions<AppDbContext>>();
                services.AddDbContext<AppDbContext>(options =>
                    options.UseInMemoryDatabase("TestDb"));
            });
        }).CreateClient();
    }

    [Fact]
    public async Task GetOrder_ReturnsOk_WhenOrderExists()
    {
        // Arrange -- seed data through the API or directly
        var createResponse = await _client.PostAsJsonAsync("/api/orders",
            new { ProductId = "P1", Quantity = 2 });
        var created = await createResponse.Content.ReadFromJsonAsync<OrderDto>();

        // Act
        var response = await _client.GetAsync($"/api/orders/{created!.Id}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var order = await response.Content.ReadFromJsonAsync<OrderDto>();
        order!.Quantity.Should().Be(2);
    }
}
```

**Expose `Program` for `WebApplicationFactory`.**
Add this to the bottom of `Program.cs` or in a separate file:

```csharp
// Make Program accessible to WebApplicationFactory
public partial class Program { }
```

---

## FluentValidation Testing

**Test validators directly. They're pure logic.**

```csharp
public class CreateOrderCommandValidatorTests
{
    private readonly CreateOrderCommandValidator _validator = new();

    [Fact]
    public void Rejects_ZeroQuantity()
    {
        var command = new CreateOrderCommand("P1", 0);
        var result = _validator.Validate(command);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle()
            .Which.PropertyName.Should().Be("Quantity");
    }

    [Theory]
    [InlineData(1)]
    [InlineData(100)]
    [InlineData(999)]
    public void Accepts_ValidQuantity(int quantity)
    {
        var command = new CreateOrderCommand("P1", quantity);
        _validator.Validate(command).IsValid.Should().BeTrue();
    }
}
```

---

## Assertions

**Assert behaviour, not implementation.**

```csharp
// Good -- tests the result
result.Status.Should().Be(OrderStatus.Shipped);
orders.Should().HaveCount(3);
order.Total.Should().BeApproximately(49.95m, 0.01m);

// Bad -- tests internal implementation
await _repository.Received(1).SaveAsync(Arg.Any<Order>());
```

**One logical assertion per test.** Multiple `.Should()` calls are fine when checking
different aspects of the same outcome. Split the test if you're checking unrelated things.

**Test error paths explicitly.**

```csharp
[Fact]
public async Task CreateOrder_WithNegativeQuantity_ThrowsArgumentException()
{
    var act = () => _sut.CreateOrderAsync(new CreateOrderCommand("P1", -1));
    await act.Should().ThrowAsync<ArgumentException>()
        .WithMessage("*Quantity*");
}
```

---

## What to Test

### Always test
- MediatR command/query handlers (the core business logic)
- FluentValidation validators (all rules, edge cases)
- Domain entity behaviour (state transitions, calculations)
- API endpoint wiring (correct status codes, serialisation)
- EF Core queries (especially complex LINQ)
- Error paths (not found, conflict, validation failure)

### Skip testing
- Framework internals (ASP.NET routing, EF Core SaveChanges)
- Auto-generated migration files
- Simple DTOs and records with no logic
- Third-party library behaviour
- The DI container itself

---

## Mocking Guidelines

**Default: don't mock.**
If you can test against a real database (via Testcontainers or in-memory), do that.
Mocks drift from reality.

**Use NSubstitute only at boundaries you don't control:**
- External HTTP APIs (payment providers, third-party services)
- Email/SMS senders
- Clock/time (inject `TimeProvider` and substitute it)
- File system operations

**Never mock the thing you're testing.** If you're mocking EF Core to test a query,
you're testing nothing.

```csharp
// Good -- substitute an external dependency
var emailSender = Substitute.For<IEmailSender>();
var sut = new OrderService(realRepository, emailSender);

// Bad -- substituting what you're testing
var repository = Substitute.For<IOrderRepository>();
repository.GetByIdAsync(1).Returns(new Order { ... });
// Now you're testing NSubstitute, not your code
```

**Exception:** Substituting a repository is acceptable in handler unit tests where you
want to isolate the handler logic from the database. But complement those with integration
tests that use a real database.

---

## Project Structure for Tests

```
tests/
  MyApp.UnitTests/
    Features/
      Orders/
        CreateOrderHandlerTests.cs
        CreateOrderValidatorTests.cs
    MyApp.UnitTests.csproj
  MyApp.IntegrationTests/
    Endpoints/
      OrderApiTests.cs
    Fixtures/
      TestDbContextFactory.cs
    MyApp.IntegrationTests.csproj
```

Keep unit and integration tests in separate projects with separate `.csproj` files.
This allows running them independently (`dotnet test --filter` or CI pipeline stages).
