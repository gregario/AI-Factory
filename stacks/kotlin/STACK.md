# Kotlin/Android Stack Profile

This stack profile defines how ALL Kotlin/Android projects in the AI-Factory must be built.
It covers modern Android development with Jetpack Compose, MVVM architecture, Kotlin Coroutines,
and the standard Jetpack library suite. Projects target Google Play distribution.

Before writing any Kotlin/Android code, Claude must read this stack profile in full.
This is not optional. Ignoring the stack profile produces inconsistent, unmaintainable code.

---

## Files in This Profile

| File | Read When |
|------|-----------|
| `coding_standards.md` | Writing any Kotlin/Android code |
| `testing.md` | Writing tests or setting up test infrastructure |
| `project_structure.md` | Creating a new project or adding files |
| `pitfalls.md` | Debugging unexpected behaviour or reviewing code |

---

## Core Principles

These principles apply to every Kotlin/Android project in this factory, without exception.

**Compose-first UI.**
All UI is built with Jetpack Compose. No XML layouts, no View-based widgets, no data binding.
If a third-party library only provides XML views, wrap them in `AndroidView` composable and
document why in a comment.

**MVVM with unidirectional data flow.**
ViewModels expose state via `StateFlow`. UI observes state and sends events back.
State flows down, events flow up. No two-way binding, no mutable state leaking into composables.

**Coroutines everywhere, RxJava nowhere.**
All async work uses Kotlin Coroutines and Flow. No RxJava, no AsyncTask, no raw threads.
Use `viewModelScope` in ViewModels, `lifecycleScope` in Activities/Fragments (rare),
and injected `CoroutineDispatcher` for testability.

**Hilt for dependency injection.**
All projects use Hilt. No manual dependency graphs, no Koin, no Dagger without Hilt.
Every ViewModel, Repository, and data source is constructor-injected.

**Gradle Kotlin DSL only.**
All build scripts use `build.gradle.kts`. No Groovy `.gradle` files.
Version catalogs (`libs.versions.toml`) for dependency management.

---

## Key Technologies

| Technology | Purpose |
|-----------|---------|
| Kotlin 2.x | Primary language |
| Jetpack Compose + Material 3 | UI framework and design system |
| ViewModel + StateFlow/SharedFlow | State management (MVVM) |
| Kotlin Coroutines + Flow | Async operations and reactive streams |
| Hilt | Dependency injection |
| Room | Local SQLite database |
| Retrofit + OkHttp | HTTP networking |
| Coil | Image loading (Compose-native) |
| Navigation Compose | In-app navigation |
| Gradle Kotlin DSL | Build system |
| Android Studio | IDE |
| Google Play | Distribution |

---

## When to Use This Stack

Use this stack for any Android application targeting Google Play. This includes:

- Consumer-facing mobile apps
- Internal tools with an Android client
- Prototypes that need device hardware access (camera, sensors, location)
- Apps requiring offline-first data with Room

Do NOT use this stack for:
- Kotlin Multiplatform (KMP) projects -- those need their own stack profile
- Backend Kotlin services (Ktor, Spring) -- use a server-side Kotlin profile
- Wear OS or Android TV -- they share foundations but have unique constraints
