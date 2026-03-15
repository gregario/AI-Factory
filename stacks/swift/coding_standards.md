# Coding Standards -- Swift / iOS

## Naming

```swift
// Variables, functions, parameters: camelCase
let currentBalance = 500.0
func calculateRevenue(qualityScore: Double) -> Double { ... }

// Types, protocols, enums: PascalCase
struct BeerStyle { let id: String; let name: String }
protocol DataService { func fetch() async throws -> [Item] }
enum BrewingPhase { case mash, boil, ferment, conditioning }

// Constants: camelCase (Swift convention, not UPPER_SNAKE)
let maxRetries = 3
let defaultTimeoutSeconds = 5.0

// Boolean properties: use is/has/should prefix
var isLoading = false
var hasUnsavedChanges = true

// File names: PascalCase matching the primary type
// BreweryViewModel.swift, BeerStyle.swift, NetworkService.swift
```

---

## Types and Protocols

**Use structs by default. Classes only when you need identity or inheritance.**
Structs are value types -- they're copied, not shared. This eliminates a class of bugs.
Use classes for ViewModels (`@Observable`), reference-counted resources, or subclassing.

```swift
// Good -- value type for data
struct Recipe {
    let id: UUID
    var name: String
    var ingredients: [Ingredient]
}

// Good -- reference type for observable state
@Observable
class RecipeViewModel {
    var recipes: [Recipe] = []
    var isLoading = false
}
```

**Use enums for known variants. No stringly-typed switches.**
```swift
// Good
enum Status: String, Codable {
    case draft, active, archived
}

// Bad -- stringly-typed
func setStatus(_ status: String) { ... }
```

**Protocols define contracts. Use them sparingly.**
Don't create a protocol for every class. Protocols earn their place when you need testability (inject a mock), polymorphism (multiple conformers), or API boundaries.

```swift
// Good -- protocol for testability
protocol BreweryService {
    func fetchRecipes() async throws -> [Recipe]
}

// Unnecessary -- only one conformer, never mocked
protocol BreweryViewModelProtocol { ... }
```

**Use generics to avoid duplication.**
```swift
// Good
func decode<T: Decodable>(_ type: T.Type, from data: Data) throws -> T {
    try JSONDecoder().decode(type, from: data)
}

// Bad -- separate function per type
func decodeRecipe(from data: Data) throws -> Recipe { ... }
func decodeStyle(from data: Data) throws -> BeerStyle { ... }
```

---

## Error Handling

**Use typed errors with context.**
```swift
// Good -- descriptive, catchable
enum RecipeError: LocalizedError {
    case notFound(id: UUID)
    case invalidIngredient(name: String, reason: String)

    var errorDescription: String? {
        switch self {
        case .notFound(let id): "Recipe \(id) not found"
        case .invalidIngredient(let name, let reason): "Invalid ingredient '\(name)': \(reason)"
        }
    }
}

// Bad -- generic
throw NSError(domain: "", code: 0, userInfo: nil)
```

**Don't catch errors you can't handle.**
Let them propagate. The caller decides how to handle them.

```swift
// Bad -- swallows the error
do {
    try await save()
} catch {
    // empty
}

// Good -- handle or propagate
do {
    try await save()
} catch {
    logger.error("Save failed: \(error)")
    throw error
}
```

**Use Result for completion-handler APIs only.**
In async/await code, just throw. `Result` is for bridging callback-based APIs.

---

## Concurrency

**Use async/await for all asynchronous work.**
```swift
// Good
func fetchRecipes() async throws -> [Recipe] {
    let (data, _) = try await URLSession.shared.data(from: url)
    return try decode([Recipe].self, from: data)
}

// Bad -- completion handler in new code
func fetchRecipes(completion: @escaping (Result<[Recipe], Error>) -> Void) { ... }
```

**Use actors for shared mutable state.**
```swift
// Good -- thread-safe by design
actor BreweryStore {
    private var recipes: [UUID: Recipe] = [:]

    func add(_ recipe: Recipe) {
        recipes[recipe.id] = recipe
    }

    func get(_ id: UUID) -> Recipe? {
        recipes[id]
    }
}
```

**Use TaskGroup for concurrent independent work.**
```swift
// Good -- parallel fetches
async let recipes = fetchRecipes()
async let styles = fetchStyles()
let (r, s) = try await (recipes, styles)
```

**Mark MainActor explicitly for UI updates.**
```swift
@MainActor
@Observable
class RecipeViewModel {
    var recipes: [Recipe] = []

    func load() async {
        recipes = try await service.fetchRecipes()
    }
}
```

---

## SwiftUI Views

**Views are dumb renderers.**
A view reads state and sends actions. It does not contain business logic, networking, or persistence.

```swift
// Good -- thin view
struct RecipeListView: View {
    @State private var viewModel = RecipeViewModel()

    var body: some View {
        List(viewModel.recipes) { recipe in
            RecipeRow(recipe: recipe)
        }
        .task { await viewModel.load() }
    }
}

// Bad -- logic in the view
struct RecipeListView: View {
    @State private var recipes: [Recipe] = []

    var body: some View {
        List(recipes) { recipe in
            RecipeRow(recipe: recipe)
        }
        .task {
            let (data, _) = try! await URLSession.shared.data(from: url) // NO
            recipes = try! JSONDecoder().decode([Recipe].self, from: data)
        }
    }
}
```

**Extract subviews when body exceeds ~30 lines.**
If a `body` getter is getting long, pull sections into computed properties or child views.

**Use `@ViewBuilder` for conditional content, not AnyView.**
```swift
// Good
@ViewBuilder
var content: some View {
    if isLoading {
        ProgressView()
    } else {
        RecipeList(recipes: recipes)
    }
}

// Bad -- type erasure hides problems
var content: some View {
    AnyView(isLoading ? AnyView(ProgressView()) : AnyView(RecipeList(recipes: recipes)))
}
```

**Prefer `.task {}` over `.onAppear {}` for async work.**
`.task` handles cancellation automatically when the view disappears.

---

## Code Style

**Prefer `let` over `var`. Immutability by default.**

**Use guard for early exits.**
```swift
// Good
func process(_ item: Item?) throws -> Result {
    guard let item else { throw ItemError.missing }
    guard item.isValid else { throw ItemError.invalid(item.id) }
    return transform(item)
}

// Bad -- nested
func process(_ item: Item?) throws -> Result {
    if let item {
        if item.isValid {
            return transform(item)
        } else {
            throw ItemError.invalid(item.id)
        }
    } else {
        throw ItemError.missing
    }
}
```

**Keep functions short.**
If a function exceeds ~40 lines, extract helpers. If it has more than 4 parameters, use a configuration struct.

**Use trailing closure syntax for the last closure parameter only.**
```swift
// Good
Button("Save") {
    viewModel.save()
}

// Good -- multiple closures: use labeled syntax
Section {
    content
} header: {
    Text("Header")
}
```

**Use extensions to organize conformances.**
```swift
// Group protocol conformance in extensions
struct Recipe {
    let id: UUID
    var name: String
}

extension Recipe: Identifiable {}

extension Recipe: Codable {
    // Custom coding keys if needed
}
```

---

## Access Control

**Default to the narrowest access level.**
- `private` for implementation details within a type
- `fileprivate` when siblings in the same file need access (rare)
- `internal` (the default) for module-internal APIs
- `public` only for framework/package APIs

**Mark ViewModel properties as `private(set)` when views should read but not write.**
```swift
@Observable
class RecipeViewModel {
    private(set) var recipes: [Recipe] = []
    private(set) var error: Error?

    func load() async { ... }
}
```
