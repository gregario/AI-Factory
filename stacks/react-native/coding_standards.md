# Coding Standards — React Native

All TypeScript coding standards from `stacks/typescript/coding_standards.md` apply. This file covers React Native-specific additions.

---

## Component Patterns

**Functional components only.**
No class components. Use hooks for all state and lifecycle logic.

```tsx
// Good
export function ProfileScreen() {
  const { data: user } = useUser();
  return <ProfileCard user={user} />;
}

// Bad — class components
export class ProfileScreen extends React.Component { ... }
```

**Props type at the top of the file.**
Define props as a `type` (not interface) right before the component. Export the props type if other components need it.

```tsx
type ProfileCardProps = {
  user: User;
  onEdit?: () => void;
};

export function ProfileCard({ user, onEdit }: ProfileCardProps) {
  return ( ... );
}
```

**Destructure props in the function signature.**
```tsx
// Good
function Avatar({ uri, size = 40 }: AvatarProps) { ... }

// Bad — props.uri, props.size throughout
function Avatar(props: AvatarProps) { ... }
```

**One component per file.**
A file exports one primary component. Small helper components used only by that component can live in the same file, but keep them unexported.

---

## Hooks

**Custom hooks for reusable logic.**
Extract logic into `use*` hooks when it's shared across components or when a component's logic gets complex.

```tsx
// Good — reusable data fetching hook
export function useBreweries(region: string) {
  return useQuery({
    queryKey: ['breweries', region],
    queryFn: () => fetchBreweries(region),
  });
}
```

**Never call hooks conditionally.**
Hooks must be called in the same order every render. No hooks inside `if`, `for`, or early returns.

```tsx
// Bad — conditional hook call
if (isLoggedIn) {
  const user = useUser(); // breaks rules of hooks
}

// Good — always call, conditionally use
const user = useUser();
if (!isLoggedIn) return <LoginScreen />;
```

**Prefer `useMemo` and `useCallback` only when needed.**
Don't wrap every function and value. Use them when:
- Passing callbacks to memoized child components
- Expensive computations that shouldn't re-run on every render
- Values used as dependencies in other hooks

```tsx
// Justified — stable reference for FlatList renderItem
const renderItem = useCallback(
  ({ item }: { item: Brew }) => <BrewCard brew={item} onPress={handlePress} />,
  [handlePress]
);
```

---

## State Management

**Zustand for client state.**
Simple, minimal API. One store per domain. No boilerplate.

```tsx
import { create } from 'zustand';

type BrewingStore = {
  currentStep: number;
  setStep: (step: number) => void;
  reset: () => void;
};

export const useBrewingStore = create<BrewingStore>((set) => ({
  currentStep: 0,
  setStep: (step) => set({ currentStep: step }),
  reset: () => set({ currentStep: 0 }),
}));
```

**Jotai as an alternative for atomic state.**
Use when state is highly granular and you want bottom-up composition rather than top-down stores. Pick one per project — don't mix Zustand and Jotai.

**React Query for server state.**
All API data flows through React Query. Never store fetched data in Zustand.

```tsx
// Good — server state in React Query
const { data, isLoading } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => api.getUser(userId),
});

// Bad — fetching in useEffect and storing in Zustand
useEffect(() => {
  api.getUser(userId).then(user => useStore.setState({ user }));
}, [userId]);
```

---

## Navigation (Expo Router)

**File-based routes only.**
Routes are defined by the file structure in `app/`. No `createStackNavigator` calls.

```
app/
  _layout.tsx         # Root layout (providers, auth gate)
  (tabs)/
    _layout.tsx       # Tab navigator layout
    index.tsx         # Home tab
    settings.tsx      # Settings tab
  brew/
    [id].tsx          # Dynamic route: /brew/123
    new.tsx           # Static route: /brew/new
```

**Use typed routes.**
Expo Router supports typed `href` props. Use `Link` and `router.push()` with typed paths.

```tsx
import { Link } from 'expo-router';

// Good — typed, catches broken links at build time
<Link href="/brew/123">View Brew</Link>
<Link href={{ pathname: '/brew/[id]', params: { id: brew.id } }}>View</Link>

// Bad — string concatenation, no type checking
router.push('/brew/' + id);
```

**Layouts handle shared UI.**
Tab bars, headers, drawers, and auth gates live in `_layout.tsx` files. Don't duplicate navigation chrome in individual screens.

---

## Styling

**Pick one approach per project and stick with it.**

Recommended options (in order of preference):
1. **Nativewind** — Tailwind CSS for React Native. Familiar utility classes, good DX.
2. **Tamagui** — Universal design system with compile-time optimisation.
3. **StyleSheet.create** — Built-in, zero dependencies. Fine for simple apps.

```tsx
// Nativewind
<View className="flex-1 items-center justify-center bg-white p-4">
  <Text className="text-lg font-bold text-gray-900">Hello</Text>
</View>

// StyleSheet.create
const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  title: { fontSize: 18, fontWeight: 'bold' },
});
```

**No inline style objects in render.**
They create new objects every render. Use `StyleSheet.create`, Nativewind classes, or memoized styles.

```tsx
// Bad — new object every render
<View style={{ flex: 1, padding: 16 }} />

// Good
<View style={styles.container} />
```

---

## Platform-Specific Code

**Use Platform.select for small differences.**
```tsx
import { Platform } from 'react-native';

const shadowStyle = Platform.select({
  ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1 },
  android: { elevation: 4 },
});
```

**Use `.ios.tsx` / `.android.tsx` for large differences.**
When the implementation diverges significantly, split into platform files. The bundler resolves the right one automatically.

```
components/
  DatePicker.ios.tsx      # iOS-specific implementation
  DatePicker.android.tsx  # Android-specific implementation
  DatePicker.tsx          # Shared type exports (optional)
```

**Never use Platform.OS in business logic.**
Platform checks belong in the UI layer only. Business logic, state, and API calls must be platform-agnostic.

---

## Sensitive Data

**Use `expo-secure-store` for tokens and secrets.**
Never store auth tokens, API keys, or sensitive user data in AsyncStorage. AsyncStorage is unencrypted.

```tsx
import * as SecureStore from 'expo-secure-store';

await SecureStore.setItemAsync('authToken', token);
const token = await SecureStore.getItemAsync('authToken');
```

**Environment variables via `app.config.ts`.**
Use Expo's `extra` field or `expo-constants` for build-time config. Never hardcode API URLs or keys.

```ts
// app.config.ts
export default {
  expo: {
    extra: {
      apiUrl: process.env.API_URL ?? 'https://api.example.com',
    },
  },
};
```

---

## Performance

**Use `FlatList` for long lists. Never `ScrollView` with `.map()`.**
`FlatList` virtualizes rows. `ScrollView` + `.map()` renders everything at once.

```tsx
// Good
<FlatList data={items} renderItem={renderItem} keyExtractor={(item) => item.id} />

// Bad — renders all items into memory
<ScrollView>
  {items.map(item => <ItemCard key={item.id} item={item} />)}
</ScrollView>
```

**Minimise re-renders.**
- Use `React.memo` for expensive list items.
- Use `useCallback` for stable references passed to children.
- Keep state as close to where it's used as possible — don't lift state unnecessarily.

**Avoid heavy work on the JS thread.**
Move image processing, crypto, and complex transforms to native modules or web workers (via `expo-crypto`, `expo-file-system`, etc.).

**Use `expo-image` instead of `Image`.**
`expo-image` handles caching, blurhash placeholders, and transitions. The built-in `Image` component does not.

---

## Code Style Additions

**Import order (enforced by ESLint):**
1. React / React Native
2. Expo packages
3. Third-party libraries
4. Local imports (absolute paths first, then relative)

**Use absolute imports.**
Configure `tsconfig.json` path aliases to avoid deep relative imports.

```tsx
// Good
import { ProfileCard } from '@/components/ProfileCard';

// Bad
import { ProfileCard } from '../../../components/ProfileCard';
```
