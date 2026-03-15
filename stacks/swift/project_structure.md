# Project Structure -- Swift / iOS

## Standard App Structure

```
MyApp/
  MyApp.xcodeproj          # Xcode project (or .xcworkspace if using SPM packages)
  MyApp/
    App/
      MyAppApp.swift        # @main entry point, App scene
      AppDelegate.swift     # Only if needed (push notifications, UIKit lifecycle)
    Features/
      Recipes/
        RecipeListView.swift
        RecipeDetailView.swift
        RecipeViewModel.swift
        RecipeService.swift
      Brewery/
        BreweryView.swift
        BreweryViewModel.swift
    Models/
      Recipe.swift           # SwiftData @Model or plain struct
      BeerStyle.swift
      Ingredient.swift
    Services/
      NetworkService.swift   # URL session wrapper
      PersistenceService.swift  # SwiftData container setup
    Shared/
      Components/            # Reusable UI components
        LoadingView.swift
        ErrorBanner.swift
        StyleBadge.swift
      Extensions/            # Small, focused extensions
        Date+Formatting.swift
        Color+Theme.swift
      Theme/
        AppTheme.swift       # Colours, fonts, spacing tokens
  MyAppTests/
    Features/
      RecipeViewModelTests.swift
      BreweryViewModelTests.swift
    Models/
      RecipeTests.swift
    Services/
      NetworkServiceTests.swift
    Helpers/
      Mocks.swift            # Shared mock implementations
      TestData.swift          # Factory methods for test fixtures
  MyAppUITests/
    OnboardingUITests.swift
    RecipeFlowUITests.swift
  Config/
    Debug.xcconfig
    Release.xcconfig
  Package.swift              # Only if the project itself is an SPM package
```

---

## Key Conventions

**Group by feature, not by technical role.**
Prefer `Features/Recipes/RecipeViewModel.swift` over `ViewModels/RecipeViewModel.swift`.
Feature folders keep related view, viewmodel, and service files together. You should be able to delete a feature folder and know exactly what you removed.

**`Models/` is for data types shared across features.**
SwiftData `@Model` classes, DTOs, and domain structs go here. Types used by only one feature can live in that feature's folder.

**`Services/` is for app-wide infrastructure.**
Network clients, persistence setup, analytics wrappers. Not business logic -- that lives in ViewModels or domain-specific services within feature folders.

**`Shared/Components/` is for reusable UI.**
If two or more features use the same view, it goes here. If only one feature uses it, keep it in the feature folder.

**Tests mirror source structure.**
`MyAppTests/Features/RecipeViewModelTests.swift` tests `MyApp/Features/Recipes/RecipeViewModel.swift`.

---

## Xcode Project Setup

**Use Xcode groups that match the file system.**
Xcode 15+ creates folder references by default. Keep the Xcode group hierarchy 1:1 with the actual directory structure. No "virtual" groups that don't exist on disk.

**Use xcconfig files for build settings.**
Don't configure build settings in the Xcode UI. Use `.xcconfig` files so settings are reviewable in version control.

```
// Config/Debug.xcconfig
PRODUCT_BUNDLE_IDENTIFIER = com.example.myapp.debug
SWIFT_ACTIVE_COMPILATION_CONDITIONS = DEBUG
OTHER_SWIFT_FLAGS = -DDEBUG

// Config/Release.xcconfig
PRODUCT_BUNDLE_IDENTIFIER = com.example.myapp
SWIFT_OPTIMIZATION_LEVEL = -O
```

**Set minimum deployment target explicitly.**
Document the deployment target in the project CLAUDE.md. Default to the latest major iOS version minus one (e.g. iOS 17 when iOS 18 is current) unless there's a business reason to go lower.

---

## Swift Package Manager

**SPM is the only dependency manager.**
No CocoaPods. No Carthage. If a library doesn't support SPM, find an alternative or fork it.

**Pin dependencies to exact versions or minor ranges.**
```swift
// Package.swift (if the project is a package)
dependencies: [
    .package(url: "https://github.com/example/lib.git", from: "2.1.0"),
]

// Or in Xcode: File > Add Package Dependencies
// Use "Up to Next Minor Version" for stability
```

**Keep dependencies minimal.**
Every dependency is a liability. If the standard library or Apple frameworks can do it, don't add a package. Justify every dependency in the PR.

---

## App Entry Point

```swift
import SwiftUI
import SwiftData

@main
struct MyAppApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(for: [Recipe.self, Ingredient.self])
    }
}
```

**Use `@main` on the App struct.** No `AppDelegate` unless you need UIKit lifecycle hooks (push notifications, background fetch, Spotlight indexing). When needed, use `@UIApplicationDelegateAdaptor`.

---

## SwiftData Container Setup

```swift
// Services/PersistenceService.swift
import SwiftData

enum PersistenceService {
    static func makeContainer(inMemory: Bool = false) throws -> ModelContainer {
        let schema = Schema([Recipe.self, Ingredient.self])
        let config = ModelConfiguration(
            schema: schema,
            isStoredInMemoryOnly: inMemory
        )
        return try ModelContainer(for: schema, configurations: config)
    }
}
```

In-memory containers are used for tests and SwiftUI previews. Production containers use the default on-disk storage.

---

## Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Files | PascalCase, matching primary type | `RecipeViewModel.swift` |
| Feature folders | PascalCase | `Features/Recipes/` |
| Shared folders | PascalCase | `Shared/Components/` |
| Extension files | `Type+Category.swift` | `Date+Formatting.swift` |
| Test files | `TypeTests.swift` | `RecipeViewModelTests.swift` |
| Config files | PascalCase | `Debug.xcconfig` |
| Assets | kebab-case in asset catalog | `app-icon`, `recipe-placeholder` |

---

## Assets and Resources

**Use Asset Catalogs for images, colours, and app icons.**
Define named colours in the asset catalog so they support dark mode automatically. Reference them with `Color("brandPrimary")` or define type-safe accessors in a theme file.

**Use String Catalogs (.xcstrings) for localisation.**
All user-facing strings go through `String(localized:)` or `LocalizedStringKey`. Even if you ship English-only, this makes future localisation trivial.

```swift
// Good -- localisable from day one
Text("recipe.list.title", tableName: "Recipes")
Button(String(localized: "action.save")) { ... }

// Bad -- hardcoded
Text("My Recipes")
```

---

## .gitignore Essentials

```
# Xcode
*.xcuserdata/
*.xcworkspace/xcuserdata/
DerivedData/
build/

# Swift Package Manager
.build/
.swiftpm/

# macOS
.DS_Store

# CocoaPods (should not exist, but just in case)
Pods/
```
