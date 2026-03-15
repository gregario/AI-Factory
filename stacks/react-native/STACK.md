# React Native Stack Profile

This stack profile defines how React Native mobile apps are built in the AI-Factory. It covers Expo (managed workflow), Expo Router, cross-platform patterns, and mobile-specific conventions for building universal iOS + Android apps from a single TypeScript codebase.

**This stack layers on top of the TypeScript stack.** Read `stacks/typescript/` first — all TypeScript conventions apply unless explicitly overridden here. This file covers React Native-specific patterns only.

Before implementing any React Native code, Claude must read this stack profile in full.

---

## Files in This Profile

| File | Read When |
|------|-----------|
| `coding_standards.md` | Writing any React Native code |
| `testing.md` | Writing tests or setting up test infrastructure |
| `project_structure.md` | Creating a new project or adding files |
| `pitfalls.md` | Debugging unexpected behaviour or reviewing code |

Also read: `stacks/typescript/STACK.md` (parent stack).

---

## Core Principles

These principles apply to every React Native project in this factory, without exception.

**Expo managed workflow by default.**
Use Expo SDK and managed workflow for all new projects. Only eject to bare workflow (or use a config plugin) when you need a native module that Expo doesn't support. Ejecting is a one-way door — justify it in writing before doing it.

**Universal from day one.**
Every screen, component, and feature must work on both iOS and Android. Use platform-specific files (`.ios.tsx` / `.android.tsx`) only when platform APIs genuinely differ. Never build for one platform and "port later."

**File-based routing with Expo Router.**
All navigation is defined by the file system in `app/`. No manual stack/tab navigator wiring. Expo Router gives you deep linking, typed routes, and web support for free.

**Server state and client state are separate concerns.**
Use React Query (TanStack Query) for server/async state (API calls, caching, background refetching). Use Zustand or Jotai for client-only state (UI state, form state, user preferences). Do not put server responses in Zustand.

**Ship with EAS.**
Use EAS Build for native builds and EAS Submit for store submission. No local Xcode/Gradle builds in CI. Development builds use `expo-dev-client` for native module testing.

---

## Key Technologies

| Technology | Purpose |
|-----------|---------|
| Expo SDK (managed) | App framework, native API access, OTA updates |
| Expo Router | File-based navigation, deep linking, typed routes |
| TypeScript | Type safety (strict mode, layers on TS stack) |
| React Query (TanStack) | Server state, caching, background sync |
| Zustand or Jotai | Client-only state management |
| expo-secure-store | Encrypted storage for tokens and secrets |
| EAS Build + Submit | Cloud builds, store submission, OTA updates |
| React Native 0.76+ | New Architecture (Fabric renderer, TurboModules) |
| Nativewind or Tamagui | Cross-platform styling (project chooses one) |
| Jest + RNTL | Unit and component testing |
| Detox | End-to-end testing on simulators/devices |

---

## New Architecture (Fabric + TurboModules)

React Native 0.76+ enables the New Architecture by default. Key implications:

- **Fabric** replaces the old renderer. All custom native views must use Fabric-compatible APIs.
- **TurboModules** replace the bridge for native module communication. They're lazily loaded and type-safe via codegen.
- **Concurrent features** (Suspense, transitions, automatic batching) are available. Use them.
- When choosing third-party native libraries, verify New Architecture compatibility. Check the [reactnative.directory](https://reactnative.directory) compatibility table.
- If a critical library doesn't support New Architecture yet, document the gap and pin the library version.

---

## When to Use This Stack

- Mobile apps targeting iOS and Android from a single codebase.
- Apps that need native device features (camera, push notifications, biometrics, offline storage).
- Projects where Expo's managed workflow covers the required native APIs.
- MVPs and production apps alike — Expo scales from prototype to App Store.

**Do not use this stack for:**
- Web-only apps (use Next.js or plain React).
- Apps that require deep custom native code from day one (consider bare React Native or native development).
- Simple utilities that could be a PWA.
