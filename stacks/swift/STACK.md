# Swift / iOS Stack Profile

This stack profile defines how ALL Swift/iOS projects in the AI-Factory must be built. SwiftUI-first, MVVM architecture, structured concurrency, and SwiftData persistence. Universal apps (iPhone + iPad) by default, with accessibility baked in from day one.

Before implementing any code in a Swift project, Claude must read this stack profile in full.
This is not optional. Ignoring the stack profile produces inconsistent, unmaintainable code.

---

## Files in This Profile

| File | Read When |
|------|-----------|
| `coding_standards.md` | Writing any Swift code |
| `testing.md` | Writing tests or setting up test infrastructure |
| `project_structure.md` | Creating a new project or adding files |
| `pitfalls.md` | Debugging unexpected behaviour or reviewing code |

---

## Core Principles

These principles apply to every Swift/iOS project in this factory, without exception.

**SwiftUI first.**
All new UI is SwiftUI. UIKit is only acceptable for legacy integration, platform gaps (e.g. camera, document scanner), or when wrapping a UIKit-only SDK. If you reach for UIKit, justify it with a comment.

**MVVM with @Observable.**
Views own no business logic. ViewModels are `@Observable` classes (Swift 5.9+) or `ObservableObject` for older deployment targets. Views read state, send actions. ViewModels orchestrate logic and talk to services.

**Structured concurrency by default.**
Use `async/await`, actors, and `TaskGroup` for all concurrent work. No completion handlers in new code. No `DispatchQueue` unless interfacing with legacy APIs. Mark actor-isolated state explicitly.

**SwiftData for persistence.**
Use SwiftData (`@Model`) for on-device storage. Core Data is acceptable only in brownfield projects. For simple key-value storage, use `UserDefaults` or `@AppStorage`. For secure credentials, use Keychain via a thin wrapper.

**Accessibility is not optional.**
Every interactive element gets an accessibility label. Support Dynamic Type on all text. Test with VoiceOver before shipping. Use semantic colours (`.primary`, `.secondary`) so dark mode and high contrast work automatically.

---

## Key Technologies

| Technology | Purpose |
|-----------|---------|
| SwiftUI | UI framework (declarative, cross-platform Apple) |
| Swift 5.9+ / @Observable | Observation framework for MVVM |
| Swift Package Manager | Dependency management (not CocoaPods) |
| Structured Concurrency | async/await, actors, TaskGroup |
| SwiftData | On-device persistence (Core Data successor) |
| Combine | Reactive streams where async/await doesn't fit (e.g. publisher debounce, merge) |
| XCTest / XCUITest | Unit, integration, and UI testing |
| Xcode | IDE, build system, provisioning |
| xcconfig | Build configuration (per-environment settings) |
| TestFlight | Beta distribution |

---

## When to Use This Stack

Use this stack for any native Apple platform app: iPhone, iPad, or universal iOS apps. Also suitable for macOS apps built with SwiftUI (Mac Catalyst or native macOS target).

This stack is the right choice when:
- You need native iOS/iPadOS performance and platform integration
- The app will be distributed via the App Store or TestFlight
- You want access to Apple frameworks (HealthKit, ARKit, MapKit, etc.)
- You're building a new app from scratch (not maintaining an existing UIKit codebase)

This stack is NOT the right choice when:
- You need cross-platform Android + iOS (consider Flutter or React Native)
- You're building a server-side application (use the TypeScript stack)
- The project is a command-line tool with no UI (use Swift on server or TypeScript)

---

## Project-Level Overlays

Each project should document its specific conventions in its own CLAUDE.md or in a project-specific memory file. Things that belong in the overlay, not here:

- Minimum deployment target (iOS 17, iOS 16, etc.)
- Third-party SDK choices (Firebase, Supabase, Stripe, etc.)
- Network layer approach (URLSession wrapper, Alamofire, etc.)
- Analytics and crash reporting
- CI/CD configuration (Xcode Cloud, GitHub Actions, Fastlane)
- App-specific architecture decisions (coordinator pattern, deep linking strategy)
