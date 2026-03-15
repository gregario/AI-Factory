# Common Pitfalls -- Swift / iOS

This file documents mistakes that appear repeatedly in Swift/iOS projects.
Read this when debugging unexpected behaviour or reviewing code.

It starts lean and grows from experience. When you hit a gotcha, add it here.

---

## Pitfall 1: Updating UI Off the Main Actor

**What it looks like:**
```swift
func fetchData() async throws {
    let data = try await service.fetch()
    self.items = data // may crash or warn -- not on MainActor
}
```

**Why it breaks:**
SwiftUI views must be updated on the main thread. If a ViewModel property drives a view and is set from a background context, you get runtime warnings or undefined behaviour.

**Fix:**
Mark the ViewModel `@MainActor`, or isolate the mutation:
```swift
@MainActor
@Observable
class ItemViewModel {
    var items: [Item] = []

    func fetchData() async throws {
        let data = try await service.fetch() // runs off main
        self.items = data // back on MainActor because class is @MainActor
    }
}
```

---

## Pitfall 2: Retain Cycles in Closures

**What it looks like:**
```swift
class ViewModel {
    var onUpdate: (() -> Void)?

    func start() {
        onUpdate = {
            self.refresh() // strong reference to self
        }
    }
}
```

**Why it breaks:**
The closure captures `self` strongly. If something else holds the closure, you have a retain cycle and a memory leak.

**Fix:**
Use `[weak self]`:
```swift
onUpdate = { [weak self] in
    self?.refresh()
}
```

Note: This is less common with structured concurrency (`Task`, async/await) since tasks don't create retain cycles in the same way. But it still applies to Combine subscribers, NotificationCenter observers, and callback-based APIs.

---

## Pitfall 3: ForEach Without Stable IDs

**What it looks like:**
```swift
ForEach(items, id: \.name) { item in
    ItemRow(item: item)
}
```

**Why it breaks:**
If two items share the same `name`, SwiftUI can't distinguish them. You get duplicated views, incorrect animations, or silent data corruption.

**Fix:**
Use a truly unique identifier. Conform to `Identifiable` with a `UUID`:
```swift
struct Item: Identifiable {
    let id = UUID()
    var name: String
}

ForEach(items) { item in // uses id automatically
    ItemRow(item: item)
}
```

---

## Pitfall 4: Heavy Work in View Body

**What it looks like:**
```swift
var body: some View {
    let sorted = items.sorted { $0.score > $1.score } // computed every render
    let filtered = sorted.filter { $0.isActive }
    List(filtered) { item in
        ItemRow(item: item)
    }
}
```

**Why it breaks:**
`body` is called frequently -- on every state change. Expensive computations here cause UI jank and dropped frames.

**Fix:**
Move computation to the ViewModel or use a computed property that's cached:
```swift
@Observable
class ItemViewModel {
    var items: [Item] = []

    var activeItems: [Item] {
        items.filter(\.isActive).sorted { $0.score > $1.score }
    }
}
```

---

## Pitfall 5: Using @State for Reference Types

**What it looks like:**
```swift
struct MyView: View {
    @State private var viewModel = SomeClass() // class, not struct
}
```

**Why it breaks (pre-@Observable):**
`@State` is designed for value types. With `ObservableObject` classes, use `@StateObject` (creation) or `@ObservedObject` (injection). Using `@State` with an `ObservableObject` class won't trigger view updates.

**With @Observable (Swift 5.9+):**
`@State` works correctly with `@Observable` classes. This is the intended pattern:
```swift
@Observable class MyViewModel { ... }

struct MyView: View {
    @State private var viewModel = MyViewModel() // correct with @Observable
}
```

**Rule of thumb:** If using `@Observable`, `@State` is fine. If using `ObservableObject`, use `@StateObject`.

---

## Pitfall 6: Force Unwrapping Optionals

**What it looks like:**
```swift
let name = user.profile!.displayName!
```

**Why it breaks:**
If either value is `nil`, the app crashes. Force unwraps hide the failure mode.

**Fix:**
Use `guard let`, `if let`, or nil coalescing:
```swift
guard let profile = user.profile else { return }
let name = profile.displayName ?? "Unknown"
```

Force unwrap is acceptable only in tests and `fatalError` paths where `nil` genuinely indicates a programmer error.

---

## Pitfall 7: SwiftData @Model with Default Enum Values

**What it looks like:**
```swift
@Model
class Recipe {
    var status: Status = .draft // may fail to persist if Status isn't Codable
}
```

**Why it breaks:**
SwiftData persists model properties via Codable under the hood. Enums must conform to `Codable` (and ideally `String`-backed for readable storage). Missing conformance causes silent data loss or crashes on fetch.

**Fix:**
```swift
enum Status: String, Codable {
    case draft, active, archived
}

@Model
class Recipe {
    var status: Status = .draft // now persists correctly
}
```

---

## Pitfall 8: Blocking the Main Thread with Synchronous I/O

**What it looks like:**
```swift
// In a ViewModel or view
let data = try Data(contentsOf: largeFileURL) // blocks main thread
```

**Why it breaks:**
Reading large files synchronously on the main thread freezes the UI. The app may be killed by the watchdog if it takes too long.

**Fix:**
Use async file I/O or move to a background task:
```swift
func loadFile() async throws -> Data {
    try await Task.detached {
        try Data(contentsOf: largeFileURL)
    }.value
}
```

---

## Pitfall 9: Ignoring Task Cancellation

**What it looks like:**
```swift
func processItems() async {
    for item in items {
        await heavyOperation(item) // never checks cancellation
    }
}
```

**Why it breaks:**
When a SwiftUI `.task` modifier's view disappears, the task is cancelled. If you never check `Task.isCancelled` or call `try Task.checkCancellation()`, the work continues needlessly, wasting CPU and potentially updating stale state.

**Fix:**
```swift
func processItems() async throws {
    for item in items {
        try Task.checkCancellation()
        await heavyOperation(item)
    }
}
```

---

## Pitfall 10: NavigationStack Path Type Mismatches

**What it looks like:**
```swift
@State private var path = NavigationPath()

NavigationStack(path: $path) {
    List(items) { item in
        NavigationLink(value: item) { // item is Recipe
            Text(item.name)
        }
    }
    .navigationDestination(for: String.self) { id in // wrong type
        DetailView(id: id)
    }
}
```

**Why it breaks:**
The `NavigationLink` pushes a `Recipe` value, but the destination is registered for `String`. The tap does nothing -- no error, no crash, just silent failure.

**Fix:**
Match the `navigationDestination(for:)` type to the `NavigationLink(value:)` type:
```swift
.navigationDestination(for: Recipe.self) { recipe in
    RecipeDetailView(recipe: recipe)
}
```

---

## Checklist Before Committing Code

- [ ] Is all UI code on `@MainActor`?
- [ ] Are closures capturing `[weak self]` where needed?
- [ ] Do all `ForEach` loops use stable, unique IDs?
- [ ] Is `body` free of expensive computation?
- [ ] Are optionals handled safely (no force unwraps in production code)?
- [ ] Do SwiftData `@Model` enums conform to `Codable`?
- [ ] Is async work checking for cancellation?
- [ ] Do `NavigationLink` value types match `navigationDestination(for:)` types?
- [ ] Do all tests pass?
- [ ] Does the app build with zero warnings?
