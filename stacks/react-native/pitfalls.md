# Common Pitfalls — React Native / Expo

All TypeScript pitfalls from `stacks/typescript/pitfalls.md` apply. This file covers React Native-specific gotchas.

It starts lean and grows from experience. When you hit a new gotcha, add it here.

---

## Pitfall 1: Using ScrollView + .map() for Long Lists

**What it looks like:**
```tsx
<ScrollView>
  {items.map(item => <ItemCard key={item.id} item={item} />)}
</ScrollView>
```

**Why it breaks:**
Every item is rendered into memory at once. With 100+ items, the app stutters or crashes on low-end Android devices.

**Fix:**
Use `FlatList` (or `FlashList` from Shopify for even better performance):
```tsx
<FlatList
  data={items}
  renderItem={({ item }) => <ItemCard item={item} />}
  keyExtractor={(item) => item.id}
/>
```

---

## Pitfall 2: Storing Tokens in AsyncStorage

**What it looks like:**
```tsx
await AsyncStorage.setItem('authToken', token);
```

**Why it breaks:**
AsyncStorage is unencrypted. On a rooted/jailbroken device, anyone can read the stored values. Auth tokens, API keys, and PII must be encrypted at rest.

**Fix:**
Use `expo-secure-store`:
```tsx
import * as SecureStore from 'expo-secure-store';
await SecureStore.setItemAsync('authToken', token);
```

Note: `expo-secure-store` has a 2048-byte value limit. For larger data, encrypt it yourself and store the encryption key in SecureStore.

---

## Pitfall 3: Inline Style Objects Causing Re-renders

**What it looks like:**
```tsx
<View style={{ flex: 1, padding: 16 }}>
  <Text style={{ fontSize: 18, color: isActive ? 'blue' : 'gray' }}>Hello</Text>
</View>
```

**Why it breaks:**
Every render creates new style objects. React Native's diffing sees them as changed, triggering unnecessary layout recalculations. In lists, this compounds.

**Fix:**
Use `StyleSheet.create` for static styles. For dynamic styles, use `useMemo` or array composition:
```tsx
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  text: { fontSize: 18 },
  active: { color: 'blue' },
  inactive: { color: 'gray' },
});

<Text style={[styles.text, isActive ? styles.active : styles.inactive]}>Hello</Text>
```

---

## Pitfall 4: Forgetting transformIgnorePatterns in Jest

**What it looks like:**
```
SyntaxError: Unexpected token 'export'
  at node_modules/expo-router/src/index.ts:1
```

**Why it breaks:**
Jest uses CommonJS by default. React Native and Expo packages ship as ESM or untranspiled code. Without proper `transformIgnorePatterns`, Jest can't parse them.

**Fix:**
Add a wide exception list in your Jest config:
```json
{
  "transformIgnorePatterns": [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*)"
  ]
}
```

When adding a new native-ish package and tests suddenly break, this is the first thing to check.

---

## Pitfall 5: Using Platform.OS in Business Logic

**What it looks like:**
```tsx
function calculateDiscount(price: number) {
  if (Platform.OS === 'ios') {
    return price * 0.7; // Apple tax
  }
  return price * 0.8;
}
```

**Why it breaks:**
Business logic becomes untestable without mocking the platform. It hides platform differences in the wrong layer. It makes the code harder to reason about.

**Fix:**
Keep platform checks in the UI layer. Pass platform-dependent values as parameters:
```tsx
// UI layer — platform-aware
const discountRate = Platform.OS === 'ios' ? 0.7 : 0.8;
<PriceDisplay price={calculateDiscount(price, discountRate)} />

// Business logic — platform-agnostic
function calculateDiscount(price: number, rate: number) {
  return price * rate;
}
```

---

## Pitfall 6: Not Handling Keyboard on Android

**What it looks like:**
An input field gets hidden behind the keyboard on Android. Works fine on iOS because `KeyboardAvoidingView` uses different behaviour per platform.

**Why it breaks:**
Android and iOS handle keyboard avoidance differently. The default `behavior` prop that works on iOS often fails on Android.

**Fix:**
Set `behavior` per platform and use `keyboardVerticalOffset` for headers:
```tsx
<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
  style={{ flex: 1 }}
>
  {children}
</KeyboardAvoidingView>
```

Or use `react-native-keyboard-aware-scroll-view` for forms inside scroll views.

---

## Pitfall 7: Expo Config Plugins Not Taking Effect

**What it looks like:**
You add a config plugin to `app.config.ts`, but the native behaviour doesn't change in your development build.

**Why it breaks:**
Config plugins modify native code at prebuild time. They don't apply to Expo Go — only to development builds or production builds. If you're testing in Expo Go, you won't see the effect.

**Fix:**
1. Make sure you're using a development build (`npx expo run:ios` or EAS Build with `developmentClient: true`).
2. After adding/changing a config plugin, rebuild the dev client:
   ```bash
   npx expo prebuild --clean
   npx expo run:ios
   ```
3. Some plugins require a full EAS Build (e.g., push notification entitlements).

---

## Pitfall 8: React Query Data in Zustand

**What it looks like:**
```tsx
const { data } = useQuery({ queryKey: ['user'], queryFn: fetchUser });

useEffect(() => {
  if (data) useUserStore.setState({ user: data });
}, [data]);
```

**Why it breaks:**
You now have two sources of truth. React Query has its cache, and Zustand has a copy. They can drift. You lose React Query's automatic refetching, cache invalidation, and stale-while-revalidate benefits.

**Fix:**
Use React Query as the single source of truth for server data. Access it via hooks, not Zustand:
```tsx
// Hook — the single source of truth
export function useUser() {
  return useQuery({ queryKey: ['user'], queryFn: fetchUser });
}

// Component — consumes directly
function Profile() {
  const { data: user, isLoading } = useUser();
  if (isLoading) return <Spinner />;
  return <ProfileCard user={user} />;
}
```

---

## Pitfall 9: Ignoring Safe Areas

**What it looks like:**
Content renders under the status bar, notch, or home indicator.

**Why it breaks:**
Modern phones have non-rectangular displays. Without safe area insets, UI elements get hidden behind system chrome.

**Fix:**
Use `react-native-safe-area-context` (included with Expo):
```tsx
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Screen() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      {/* content */}
    </SafeAreaView>
  );
}
```

In Expo Router, the root `_layout.tsx` should wrap the app in `SafeAreaProvider`.

---

## Pitfall 10: New Architecture Compatibility

**What it looks like:**
A third-party native library crashes or fails to load on React Native 0.76+.

**Why it breaks:**
The New Architecture (Fabric + TurboModules) changed how native modules communicate with JS. Libraries that haven't been updated still use the old bridge API, which may not be available.

**Fix:**
1. Check [reactnative.directory](https://reactnative.directory) for New Architecture compatibility before adding a library.
2. If a critical library isn't compatible, you can disable the New Architecture in `app.config.ts`:
   ```ts
   export default {
     expo: {
       experiments: {
         reactNativeNewArchEnabled: false,
       },
     },
   };
   ```
3. File an issue on the library's repo. Many are actively migrating.

---

## Checklist Before Committing Code

- [ ] Does the app run on both iOS and Android?
- [ ] Are all lists using `FlatList` or `FlashList` (not `ScrollView` + `.map()`)?
- [ ] Are sensitive values stored in `expo-secure-store` (not AsyncStorage)?
- [ ] Do all screens respect safe areas?
- [ ] Are there no `Platform.OS` checks in business logic?
- [ ] Do tests pass with the current `transformIgnorePatterns`?
- [ ] Are styles using `StyleSheet.create` or a styling library (no inline objects in render)?
- [ ] Is server data managed by React Query (not duplicated in Zustand)?
