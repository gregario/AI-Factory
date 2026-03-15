# Testing -- Swift / iOS

## Test Frameworks

| Framework | Purpose |
|-----------|---------|
| XCTest | Unit and integration tests |
| XCUITest | UI automation tests |
| Swift Testing (`@Test`) | Modern test framework (Swift 5.9+, Xcode 16+) -- prefer for new projects |

For new projects targeting Xcode 16+, prefer Swift Testing (`import Testing`, `@Test`, `#expect`).
For projects that need Xcode 15 compatibility, use XCTest.

---

## When to Use Which Test Type

### Unit Tests

**Use when:**
- Pure functions and value type transformations
- ViewModel logic (state transitions, data formatting)
- Business rules and calculations
- Codable encoding/decoding
- Custom algorithms

**Trade-offs:**
- Fast (milliseconds), no simulator needed
- High confidence in isolated logic
- Can give false confidence if you mock too much

### Integration Tests

**Use when:**
- SwiftData model relationships and queries
- Network layer with URLProtocol stubs
- Multi-component workflows (ViewModel + Service + Persistence)
- Navigation and coordinator logic

**Trade-offs:**
- Slower (may need in-memory SwiftData containers)
- Higher confidence that components work together
- Worth the cost for data layer and service integration

### UI Tests (XCUITest)

**Use when:**
- Critical user flows (onboarding, purchase, login)
- Accessibility verification (VoiceOver labels, tap targets)
- Layout validation on different device sizes

**Trade-offs:**
- Slowest (runs on simulator, launches app)
- Brittle if tied to specific UI hierarchy
- Essential for user-facing flows that must not break

---

## Test File Structure

### XCTest Pattern

```swift
import XCTest
@testable import MyApp

final class RecipeViewModelTests: XCTestCase {

    private var sut: RecipeViewModel!
    private var mockService: MockBreweryService!

    override func setUp() {
        super.setUp()
        mockService = MockBreweryService()
        sut = RecipeViewModel(service: mockService)
    }

    override func tearDown() {
        sut = nil
        mockService = nil
        super.tearDown()
    }

    func test_load_populatesRecipes() async {
        mockService.recipesToReturn = [.mock()]

        await sut.load()

        XCTAssertEqual(sut.recipes.count, 1)
        XCTAssertNil(sut.error)
    }

    func test_load_setsErrorOnFailure() async {
        mockService.errorToThrow = RecipeError.networkUnavailable

        await sut.load()

        XCTAssertTrue(sut.recipes.isEmpty)
        XCTAssertNotNil(sut.error)
    }
}
```

### Swift Testing Pattern (Xcode 16+)

```swift
import Testing
@testable import MyApp

@Suite("RecipeViewModel")
struct RecipeViewModelTests {

    @Test("loads recipes from service")
    func loadPopulatesRecipes() async {
        let service = MockBreweryService(recipes: [.mock()])
        let vm = RecipeViewModel(service: service)

        await vm.load()

        #expect(vm.recipes.count == 1)
        #expect(vm.error == nil)
    }

    @Test("sets error on network failure")
    func loadSetsErrorOnFailure() async {
        let service = MockBreweryService(error: .networkUnavailable)
        let vm = RecipeViewModel(service: service)

        await vm.load()

        #expect(vm.recipes.isEmpty)
        #expect(vm.error != nil)
    }
}
```

---

## Test Naming

**XCTest: `test_action_expectedResult` or `test_condition_expectedResult`.**
```swift
// Good
func test_save_persistsRecipeToStore()
func test_emptyName_throwsValidationError()
func test_delete_removesFromListAndStore()

// Bad
func testSave()
func testError()
func test1()
```

**Swift Testing: descriptive string in `@Test("...")`.**
```swift
@Test("rejects recipe with empty name")
@Test("deletes recipe and removes from list")
```

---

## Assertions

**Assert behaviour, not implementation.**
```swift
// Good -- tests the result
XCTAssertEqual(vm.recipes.count, 3)
XCTAssertTrue(vm.recipes.allSatisfy { $0.isValid })

// Bad -- tests internal implementation
XCTAssertTrue(mockService.fetchCalled) // who cares how, test what
```

**One logical assertion per test.**
Multiple asserts are fine if they check different facets of the same behaviour.
If a test checks two unrelated things, split it.

**Test error paths explicitly.**
```swift
func test_invalidIngredient_throwsError() {
    XCTAssertThrowsError(try Recipe.validate(ingredient: "")) { error in
        XCTAssertEqual(error as? RecipeError, .invalidIngredient(name: "", reason: "empty"))
    }
}
```

---

## Testing Async Code

**Use `async` test methods directly.**
```swift
// Good -- XCTest
func test_fetch_returnsData() async throws {
    let result = try await service.fetch()
    XCTAssertFalse(result.isEmpty)
}

// Good -- Swift Testing
@Test func fetchReturnsData() async throws {
    let result = try await service.fetch()
    #expect(!result.isEmpty)
}
```

**For testing @MainActor code, mark the test @MainActor.**
```swift
@MainActor
func test_viewModel_updatesOnMainActor() async {
    await vm.load()
    XCTAssertEqual(vm.recipes.count, 1)
}
```

**Use `XCTestExpectation` only for callback-based APIs that can't be awaited.**
```swift
func test_legacyCallback_completesSuccessfully() {
    let expectation = expectation(description: "callback fires")

    legacyAPI.fetch { result in
        XCTAssertNotNil(result)
        expectation.fulfill()
    }

    wait(for: [expectation], timeout: 5.0)
}
```

---

## Testing SwiftData

**Use in-memory containers for test isolation.**
```swift
func makeTestContainer() throws -> ModelContainer {
    let config = ModelConfiguration(isStoredInMemoryOnly: true)
    return try ModelContainer(for: Recipe.self, configurations: config)
}

func test_save_persistsRecipe() throws {
    let container = try makeTestContainer()
    let context = container.mainContext

    let recipe = Recipe(name: "IPA", style: .ipa)
    context.insert(recipe)
    try context.save()

    let fetched = try context.fetch(FetchDescriptor<Recipe>())
    XCTAssertEqual(fetched.count, 1)
    XCTAssertEqual(fetched.first?.name, "IPA")
}
```

---

## Mocking Guidelines

**Default: don't mock.**
If you can test against the real thing (in-memory SwiftData, real value types), do that.

**Mock at boundaries you don't control:**
- Network requests (use `URLProtocol` stubs or protocol-based service injection)
- System services (location, camera, notifications)
- Time-dependent behaviour (inject a `Clock` or `DateProvider`)
- Third-party SDKs

**Use protocols for dependency injection, not mocking frameworks.**
```swift
// Production
protocol BreweryService {
    func fetchRecipes() async throws -> [Recipe]
}

class LiveBreweryService: BreweryService {
    func fetchRecipes() async throws -> [Recipe] { ... }
}

// Test
class MockBreweryService: BreweryService {
    var recipesToReturn: [Recipe] = []
    var errorToThrow: Error?

    func fetchRecipes() async throws -> [Recipe] {
        if let error = errorToThrow { throw error }
        return recipesToReturn
    }
}
```

**Never mock the thing you're testing.**

---

## What to Test

### Always test
- ViewModel state transitions (loading, loaded, error)
- Business logic and calculations
- Codable round-trips (encode then decode, verify equality)
- Error paths and validation rules
- SwiftData model relationships and queries
- Navigation logic (which screen shows when)

### Skip testing
- SwiftUI view body layout (that's Apple's job)
- System framework behaviour (URLSession, Core Location internals)
- Trivial computed properties with no logic
- Auto-synthesised Codable conformance (test custom implementations only)

---

## UI Testing (XCUITest)

```swift
final class OnboardingUITests: XCTestCase {
    let app = XCUIApplication()

    override func setUp() {
        super.setUp()
        continueAfterFailure = false
        app.launchArguments = ["--ui-testing"]
        app.launch()
    }

    func test_onboarding_completesSuccessfully() {
        app.buttons["Get Started"].tap()
        app.textFields["Name"].tap()
        app.textFields["Name"].typeText("Test Brewery")
        app.buttons["Continue"].tap()

        XCTAssertTrue(app.staticTexts["Welcome, Test Brewery!"].exists)
    }
}
```

**Tips:**
- Use `accessibilityIdentifier` for stable element queries (not display text when it changes)
- Keep UI tests focused on critical paths -- they're slow and brittle
- Use launch arguments (`--ui-testing`) to configure test state (skip onboarding, seed data)
